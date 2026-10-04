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
- ホームは 3×3 のページ式。タイル定義は `TD`（アイコン・名前・色・読み上げ）、ページ割りは `HPAGES`（あそぶ／まなぶ／うごかす）。ページを増やすときはマークアップの `#hm-p*` とドット、`hmEls` も増やす。
- 共通ヘルパー: `say()`（日本語の読み上げ）、`sayEn()`（英語。カタカナにフォールバックする）、`bigWord()`（話した言葉を大きく表示）、`tone()`（効果音）、`holdButton()`（長押しボタン）。
- 大人用の設定はホームの ⚙️（1.5 秒長押し）の `openSettings()` に集約。ゲーム画面には大人用ボタンを置かない。
- localStorage: `ponpon.settings.v1` / `ponpon.family.v1` / `ponpon.stickers.v1` / `ponpon.stats.v1`。必ず try/catch で囲む。音なし・声なしは保存しない。
- イラストは `assets/ico/`（ホームのアイコン、`ICO`）と `assets/ani/`（どうぶつの顔、`ANI_IMG`）に透過 WebP（約192px）、`assets/stk/`（シールちょうのシール、`STK_IMG`。白フチ込み 256px）で置く。トーンはそろえる（やわらかい手描き風・太めで丸い焦げ茶の輪郭・パステル）。
- カメラ検出（おみせやさん）は `/* camdet:begin */`〜`/* camdet:end */` の純粋関数。単体テストはこの範囲を抜き出して実行する。

## 守ること
- 対象は 2 歳児。
  - 失敗や罰の演出はしない。例外は ABC の ☝️ と「No!」。
  - 読み上げはひらがなで渡し、同じ言葉を画面にも大きく出す。
  - タップ領域は 80px 以上。
- 外部スクリプト・外部画像は使わない（Google Fonts のみ可）。リポジトリ内の `assets/` の画像は可（相対パスで参照）。`alert`/`confirm`/`prompt` は使わない。表示切替は `el.hidden`。
- 360px 幅で横スクロールを出さない。ホームは縦スクロールなし。
- 絵はオリジナルにする。既存キャラクターや本物の紙幣のデザインはまねしない。

## PWA（ホーム画面に追加・オフライン）
- `manifest.webmanifest` / `sw.js` / `icons/`（相対パスのみ。GitHub Pages のサブパス配下）。SW は https か localhost でだけ登録される（file:// では何もしない）。
- `index.html` は network-first、他は cache-first。`index.html` 以外のプリキャッシュ対象（manifest・アイコンなど）を変えたら `sw.js` の `CACHE` を上げる。
- `assets/` に画像を足す・差し替えるときは `sw.js` の `PRECACHE` に足し、`CACHE` を上げる（cache-first なので同名差し替えは上げないと更新されない）。
- アイコンは `icons/icon.svg` が元。`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tools/make-icons.js` で PNG を再生成。
- テスト: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tests/pwa.js`（localhost で配信し、manifest・アイコン・SW・オフライン再読込を確認）。
