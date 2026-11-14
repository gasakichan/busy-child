# ぽんぽんあそび（busy-child）

2歳児向けのタップあそび集。ビルドなしの単一ファイル `index.html` がすべて（HTML/CSS/JS 一体）。`main` に push すると GitHub Pages（https://gasakichan.github.io/busy-child/ ）に反映される。

## 進め方
- 新しい遊びのアイデア出し・仕様はメインのモデル、実装は Sonnet のサブエージェントに任せる（ユーザーの希望）。
- 成果物は push で届ける。claude.ai のアーティファクトは公開しない。
- 変更後は必ずテストを通してから push する。

## テスト
```
node tests/camdet.js                                          # カメラ検出器の単体テスト
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tests/e2e.js   # E2E（6 並列で約 2 分半、最後に ALL OK）
node tests/e2e.js drive            # 部分実行（名前の部分一致。複数可: clock koro）
node tests/e2e.js --list           # ブロック名の一覧（名前を足すと絞り込める）
node tests/e2e.js --bail           # 最初の FAIL で止める
node tests/e2e.js -j 4             # 並列数（既定 6。環境変数 E2E_JOBS でも）
```
E2E はブロックごとに別プロセス・別 browser で独立に走る（`T()` / `TV()` で登録。ブロック間で状態を共有しない）。作業中は対象だけ部分実行し、push 前に全体を 1 回通す。ゲームを足したら e2e にもブロックを足し、重いなら `WEIGHT` に秒数を書く（重いものから先に始まる）。並列を上げすぎると時間ぎりぎりのテストが不安定になる（8 で確認）。
`tests/out/` にスクショが出る（git 管理外）。

## コードの地図（index.html の中）
- ゲームは `games.<id> = { el, enter(), leave() }`。`leave()` でタイマー・rAF・リスナー・カメラを必ず片付ける。
- ホームは 4 つの形から選べる（設定「ホームの かたち」、`S.home` = `page`/`scroll`/`bubble`/`box`、既定 `page`）。タイル定義は `TD`（アイコン・名前・色・読み上げ）、並びは `HORDER`（id の一列）。ジャンル分けはしない。新しいゲームは並びの最後に足す。
  - 共通: `hmVisible()`（見えている あそび）・`hmRank()`（よくあそぶ = 直近 14 日の `n` 合計、同点は秒→HORDER 順、n>=1 のみ）・`hmTile()`（タイル）。`homeShow()` が形・向き・見える一覧・ランキングの変化があるときだけ作り直す（`go(null)` と resize と設定を閉じたときに呼ぶ）。各形の builder は片付け関数を返し、切り替え時に呼ばれる。
  - ページ: 3×3 を 9 個ずつ自動でページに（ページ div とドットは JS が作る。1 ページなら矢印・ドットなし）。
  - スクロール（`.hl-scroll`）: 縦向きは縦スクロール、横向きは横スクロール。先頭に ⭐ の帯（よくあそぶ上位 3 / 横向きは 4。足りなければ帯なし）。ゲームから戻ると位置を復元。ドラッグではゲームを開かない。
  - あわあわ（`.hb`）: 六角らせんに丸いタイルを並べ、中心からの距離で大きさが変わる魚眼（transform + rAF）。どこへでもドラッグ（慣性あり。動きを減らす設定では慣性なし）。よくあそぶが中心。リサイズ・回転で中心に戻る。
  - おもちゃばこ（`.tb`）: 見えている あそびからランダム 6 個 + 🎁 で入れ替え（起動ごとに新しく、ゲームから戻っても同じ 6 個）。6 個以下なら全部出して 🎁 なし。
  - 設定「ホームに だす あそび」: 隠した あそびはどの形にも出ない（最後の 1 個は隠せない）。`ponpon.home.v1` = `{v:1, hide:[id]}`。
- 共通ヘルパー: `say()`（日本語の読み上げ）、`sayEn()`（英語。カタカナにフォールバックする）、`bigWord()`（話した言葉を大きく表示）、`tone()`（効果音）、`holdButton()`（長押しボタン）。
- 大人用の設定はホームの ⚙️（1.5 秒長押し）の `openSettings()` に集約。ゲーム画面には大人用ボタンを置かない。
- localStorage: `ponpon.settings.v1` / `ponpon.family.v1` / `ponpon.stickers.v1` / `ponpon.stats.v1` / `ponpon.mix.v1`（まぜまぜの はっけんずみ）/ `ponpon.home.v1`（ホームで隠した あそび）。必ず try/catch で囲む。音なし・声なしは保存しない。
- イラストは `assets/ico/`（ホームのアイコン、`ICO`）と `assets/ani/`（どうぶつの顔、`ANI_IMG`）に透過 WebP（約192px）、`assets/mix/`（まぜまぜの もと6つ＋できもの21、192px。マゼンタ背景のシートから `python3 tools/make-mix.py 出力dir シート1 シート2 シート3` で切り出し）、`assets/kiru/`（とんとん の 食べもの・断面・道具。マゼンタ背景のシートから `python3 tools/make-kiru.py シート1 シート2` で切り出し。ホームの追加アイコン `assets/ico/{drive,piano,pinball,voice,nami,mix,suna,kiru}` も同じシート1 から出る）、`assets/kaeru/`（かえる: すわり・とびの 2 ポーズと はっぱ 2・はす。マゼンタ背景の 3x2 シートから `python3 tools/make-kaeru.py シート` で切り出し。ホームアイコン `assets/ico/kaeru` も同じシートから出る。絵は `KAERU_IMG` で差し替え）、`assets/dokoka/`（どこかな: もの 14 こと 色ちがいの シャッター shutter0〜5。マゼンタ背景の 4x4 シートから `python3 tools/make-dokoka.py シート` で切り出し。ホームアイコン `assets/ico/dokoka` も同じシートから出る。絵は `DOKO_IMG`）、`assets/aiueo/`（あいうえおの 絵文字の かわりに だす え。`KANA` の 4 つめに パス）、`assets/stk/`（シールちょうのシール、`STK_IMG`。白フチ込み 256px）で置く。トーンはそろえる（やわらかい手描き風・太めで丸い焦げ茶の輪郭・パステル）。
- へんしん（`henshin`）: 前面カメラの鏡。`assets/face/` に MediaPipe Face Landmarker（tasks-vision 0.10.14）を同梱（作り直しは `sh tools/make-face.sh`）。初めて入ったときだけ遅延ロードし、失敗しても無言で「顔なし（画面中央）」モードで遊べる。描画は WebGL の 1 枚シェーダ（歪み・おばけ色）＋2D オーバーレイ（ぼうし・おばけの布・きらきら）、WebGL なしは Canvas2D。検出は間引き（66ms、重いと 150ms）。テスト用に `games.henshin._t()` / `_fake(landmarks)`。
- `assets/face/`（約 13MB）は PRECACHE に入れない。SW が `/assets/face/` を別キャッシュ `ponpon-face-*`（cache-first）に溜める。メッセージ `face`（そろい具合）/ `face-fetch`（ダウンロード）、設定の「オフライン」にボタンあり。名前を上げるときは `FACECACHE` を `ponpon-face-v2` のようにする。
- カメラ検出（おみせやさん）は `/* camdet:begin */`〜`/* camdet:end */` の純粋関数。単体テストはこの範囲を抜き出して実行する。

## 守ること
- 対象は 2 歳児。
  - 失敗や罰の演出はしない。例外は ABC の ☝️ と「No!」。
  - 読み上げはひらがなで渡し、同じ言葉を画面にも大きく出す。
  - タップ領域は 80px 以上。例外: あいうえおの 50音表のセルは小さくてよい（ユーザー了承。できるだけ大きく取る）。
- 外部スクリプト・外部画像は使わない（Google Fonts のみ可）。リポジトリ内の `assets/` の画像は可（相対パスで参照）。`alert`/`confirm`/`prompt` は使わない。表示切替は `el.hidden`。
- 360px 幅で横スクロールを出さない。ホームは縦スクロールなし（ただしスクロールの形だけは一覧を長辺方向にスクロールする。ページ／おもちゃばこはスクロールなし）。
- 絵はオリジナルにする。既存キャラクターや本物の紙幣のデザインはまねしない。

## PWA（ホーム画面に追加・オフライン）
- `manifest.webmanifest` / `sw.js` / `icons/`（相対パスのみ。GitHub Pages のサブパス配下）。SW は https か localhost でだけ登録される（file:// では何もしない）。
- SW の install は PRECACHE を 1 つずつ読み込み、1 つでも失敗したら install を失敗させる（古い SW と古いキャッシュを残す。オフライン端末で空のキャッシュに切り替わって絵が消えるのを防ぐ）。activate で古いキャッシュを消すのは新しいのが揃っているときだけ。ページは起動時に `navigator.storage.persist()` を頼み、SW に `heal`（足りない絵を読み直す）を送る。設定の「オフライン」に揃い具合を出す。
- `index.html` は network-first、他は cache-first。`index.html` 以外のプリキャッシュ対象（manifest・アイコンなど）を変えたら `sw.js` の `CACHE` を上げる。
- `assets/` に画像を足す・差し替えるときは `sw.js` の `PRECACHE` に足し、`CACHE` を上げる（cache-first なので同名差し替えは上げないと更新されない）。
- アイコンは `icons/icon.svg` が元。`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tools/make-icons.js` で PNG を再生成。
- テスト: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tests/pwa.js`（localhost で配信し、manifest・アイコン・SW・オフライン再読込を確認）。
