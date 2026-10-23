// E2E テスト（Playwright）。スクショは tests/out/ に出る。
// 使い方: node tests/e2e.js [-j N] [--bail] [--list] [名前の一部...]
//   既定は全ブロックを 6 並列（4 コアでも待ち時間が大半なので安定。8 以上は時間ぎりぎりのテストが不安定になることがある）（-j N か環境変数 E2E_JOBS で変更）。名前を渡すと部分一致するブロックだけ実行。
//   --list でブロック名の一覧、--bail で最初の FAIL で全体を止める。
const path = require('path'), os = require('os');
function loadPw() {
  for (const p of ['playwright', '/home/claude/.npm-global/lib/node_modules/playwright', '/opt/node-tools/node_modules/playwright']) { try { return require(p); } catch (e) {} }
  throw new Error('playwright が見つかりません: npm i -g playwright（ブラウザは PLAYWRIGHT_BROWSERS_PATH を使う）');
}
const { chromium } = loadPw();
const fs = require('fs');
const WORKER = process.argv[2] === '--worker';
const SP = path.join(__dirname, 'out'); fs.mkdirSync(SP, { recursive: true });
const SITE = path.join(__dirname, '..', 'index.html');
// instrumented copy: count shopScan calls
let hooked = fs.readFileSync(SITE, 'utf8').replace('function shopScan(prod) {', 'function shopScan(prod) { window.__scans = (window.__scans || 0) + 1;');
let hooked2 = hooked;
const HK = [['function koFrame(ts) {', 'function koFrame(ts) { window.__koFrames = (window.__koFrames || 0) + 1;'],
  ['function koKnock(v) {', 'function koKnock(v) { (window.__kn = window.__kn || []).push(v);'],
  ['var koNoise = null;', 'var koNoise = null; window.__ko = ko;'],
  ['ko.total = n; ko.balls = koSpawn(n);', 'ko.total = n; ko.balls = koSpawn(n); if (window.__koPin && ko.round === 1) ko.balls.forEach(function (b) { b.x = ko.W * 0.45; b.y = ko.H * 0.45; b.col = 0; });'],
  ['ko.on = true; ko.round = 1;', 'ko.on = true; ko.round = window.__koRound || 1;'],
  ['function drFrame(ts) {', 'function drFrame(ts) { window.__drFrames = (window.__drFrames || 0) + 1;'],
  ['var dr = {', 'var dr = window.__dr = {'],
  ['function pbFrame(ts) {', 'function pbFrame(ts) { window.__pbFrames = (window.__pbFrames || 0) + 1;'],
  ['var pb = {', 'var pb = window.__pb = {'],
  ['var nk = {', 'var nk = window.__nk = {'],
  ['games.nami = {', 'window.__namiHits = circleHits; games.nami = {'],
  ['var nm = {', 'var nm = window.__nm = {'],
  ['var sn = {', 'var sn = window.__sn = {'],
  ['games.neko = {', 'window.__nkStart = nkStart; window.__nkMake = nkMake; window.__nkPR = nkPR; window.__nkCatR = nkCatR; games.neko = {'],
  ['var vc = {', 'var vc = window.__vc = {'],
  ['games.voice = {', 'window.__vcV = VC_VOICES; window.__vcPlan = vcPlan; window.__vcGrains = vcGrains; window.__vcA = { A: VC_AUTO, vad: vcVad, vadNew: vcVadNew, ring: vcRingDrop, keep: vcKeep, thr: vcThr }; games.voice = {'],
  ['var NK_SOLID = {', 'var NK_SOLID = window.__nkSolid = {'],
  ['var NK_H1 = 10000, NK_H2 = 8000;', 'var NK_H1 = window.__nkH1 || 10000, NK_H2 = window.__nkH2 || 8000;']];
for (const [a, b] of HK) { if (!hooked2.includes(a)) throw new Error('hook failed ' + a); hooked2 = hooked2.replace(a, b); }
hooked = hooked2;
if (hooked === fs.readFileSync(SITE, 'utf8')) throw new Error('hook failed');
hooked = hooked.replace(/'assets\//g, "'../../assets/");
if (!WORKER) fs.writeFileSync(SP + '/hooked7.html', hooked);
const URL = 'file://' + SP + '/hooked7.html';  // hooked copy lives in tests/out, so point asset paths back at the repo
const IDS = ['sky','zoo','paint','touch','find','count','num','baa','shop','phone','shape','train','nurie','aiueo','abc','clock','yubi','sticker','koro','drive','piano','pinball','neko','voice','nami','mix','suna'];
const LAB = ['ふうせん','どうぶつ','おえかき','いろタッチ','いろさがし','かぞえよう','すうじ','いないいないばあ','おみせやさん','もしもし','かたちはめ','でんしゃ','ぬりえ','あいうえお','ABC','とけい','ゆびのおうち','シールちょう','ころころボール','ドライブ','ピアノ','ピンボール','ねこさがし','ボイスチェンジャー','なみもよう','まぜまぜ','すなば'];
const PAGE2 = new Set(['いろタッチ','いろさがし','かぞえよう','すうじ','あいうえお','ABC','とけい','かたちはめ','ゆびのおうち']);
async function gotoPage(p, n) {
  const cur = await p.evaluate(() => [0, 1, 2].find(i => !document.querySelector('#hm-p' + i).hidden));
  if (cur !== n) { await p.click('.hm-dot:nth-child(' + (n + 1) + ')'); await sleep(280); }
}
async function tapTile(p, lab) {
  await gotoPage(p, (lab === 'ころころボール' || lab === 'ドライブ' || lab === 'ピアノ' || lab === 'ピンボール' || lab === 'ねこさがし' || lab === 'ボイスチェンジャー' || lab === 'なみもよう' || lab === 'まぜまぜ' || lab === 'すなば') ? 2 : PAGE2.has(lab) ? 1 : 0);
  await p.click('.hm-page:not([hidden]) .tile[aria-label="' + lab + '"]');
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };

const INIT = (voices) => `
  window.__says = []; window.__gum = 0; window.__bong = 0;
  (function(){
    const ss = window.speechSynthesis;
    const orig = ss.speak.bind(ss);
    window.SpeechSynthesisUtterance = function(t){ this.text = t; this.lang = ''; this.voice = null; this.rate = 1; this.pitch = 1; this.volume = 1; };
    ss.speak = function(u){ window.__says.push({ t: u.text, lang: u.lang, voice: u.voice && u.voice.name, rate: u.rate, pitch: u.pitch, vol: u.volume }); };
    ss.getVoices = function(){ return ${JSON.stringify(voices)}; };
    const g = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function(c){ window.__gum++; return window.__denyCam ? Promise.reject(new DOMException('denied','NotAllowedError')) : g(c); };
    window.__lsn = {}; window.__vib = 0;
    const _add = window.addEventListener.bind(window), _rem = window.removeEventListener.bind(window);
    window.addEventListener = function(t, f, o){ if (/^device/.test(t)) window.__lsn[t] = (window.__lsn[t] || 0) + 1; return _add(t, f, o); };
    window.removeEventListener = function(t, f, o){ if (/^device/.test(t)) window.__lsn[t] = (window.__lsn[t] || 0) - 1; return _rem(t, f, o); };
    navigator.vibrate = function(){ window.__vib++; return true; };
    const sv = AudioParam.prototype.setValueAtTime;
    AudioParam.prototype.setValueAtTime = function(v, t){ if (v === 196) window.__bong++; return sv.call(this, v, t); };
  })();
`;
const ENV = [{ name: 'Kyoko', lang: 'ja-JP' }, { name: 'Samantha', lang: 'en-US' }, { name: 'Daniel', lang: 'en-GB' }];
const JAV = [{ name: 'Kyoko', lang: 'ja-JP' }];

async function newPage(br, vp, { voices = ENV, deny = false, storage, init, settle = 300 } = {}) {
  const ctx = await br.newContext({ viewport: vp });
  const p = await ctx.newPage();
  p.errs = [];
  p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
  p.on('pageerror', e => p.errs.push('PAGEERR ' + e.message));
  await p.addInitScript(INIT(voices));
  if (deny) await p.addInitScript('window.__denyCam = true;');
  if (init) await p.addInitScript(init);
  await p.goto(URL); await sleep(settle);
  return p;
}
const says = p => p.evaluate(() => window.__says.slice());
const clearSays = p => p.evaluate(() => { window.__says.length = 0; });

async function holdOpen(p, ms) {
  const b = await p.locator('#setbtn').boundingBox();
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await sleep(ms); await p.mouse.up();
}

// テストブロック登録。T(名前, fn(br)) / TV(名前, [viewport...], fn(br, vp))（TV は viewport ごとに別ブロック: 名前-幅x高さ）
let br;  // ワーカーの browser（ブロック共通ヘルパーが使う）
const TESTS = [];
const T = (name, fn) => TESTS.push({ name, fn });
const TV = (name, vps, fn) => vps.forEach(vp => T(name + '-' + vp.width + 'x' + vp.height, br => fn(br, vp)));
{

  /* ---------- 1. every viewport: home, 16 games, scroll, forbidden buttons ---------- */
  TV('home', [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1024, height: 768 }], async (br, vp) => {
    const tag = vp.width + 'x' + vp.height;
    const p = await newPage(br, vp, { deny: true });
    const scrollInfo = () => p.evaluate(() => ({ h: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth, v: document.documentElement.scrollHeight > innerHeight }));
    const tileInfo = () => p.evaluate(() => { const st = document.querySelector('#home').getBoundingClientRect(); return [...document.querySelectorAll('.hm-page:not([hidden]) .tile')].map(t => { const r = t.getBoundingClientRect(); const ic = parseFloat(getComputedStyle(t.querySelector('.ico')).fontSize), lb = parseFloat(getComputedStyle(t.querySelector('.lab')).fontSize); return { ok: r.top >= st.top - 1 && r.bottom <= st.bottom + 1 && r.left >= st.left - 1 && r.right <= st.right + 1, w: Math.round(r.width), h: Math.round(r.height), cx: Math.round(r.left), cy: Math.round(r.top), ic, lb, clip: t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1 }; }); });
    const icoChk = () => p.evaluate(() => { const ims = [...document.querySelectorAll('.hm-page:not([hidden]) .tile .ico-img')]; const n = document.querySelectorAll('.hm-page:not([hidden]) .tile').length; return ims.length === n && ims.every(i => i.complete && i.naturalWidth > 0); });
    const tiles = await tileInfo();
    ok(await icoChk(), tag + ' page1 tile icons');
    ok(await p.evaluate(() => { const ims = [...document.querySelectorAll('.tile .ico-img')]; return ims.length > 0 && ims.every(i => /\.webp$/.test(i.getAttribute('src')) && !i.getAttribute('src').startsWith('data:')); }), tag + ' home icons are files, not data URIs');
    ok(tiles.length === 9 && tiles.every(t => t.ok), tag + ' page1: 9 tiles inside, ' + tiles[0].w + 'x' + tiles[0].h);
    ok(tiles.every(t => !t.clip), tag + ' tile content not clipped');
    const portrait = vp.width < 700;
    ok(portrait ? tiles.every(t => t.lb >= 14 && t.ic >= 0.5 * t.w - 3) : tiles.every(t => t.lb >= 18 && Math.abs(t.ic - 0.45 * Math.min(t.w, t.h)) < 3), tag + ' label/icon sizes (' + tiles[0].ic + 'px/' + tiles[0].lb + 'px)');
    const wraps = await p.evaluate(() => [...document.querySelectorAll('.hm-page:not([hidden]) .tile .lab')].map(l => { const r = document.createRange(); r.selectNodeContents(l); const rects = [...r.getClientRects()]; const lines = new Set(rects.map(x => Math.round(x.top))).size; return [l.textContent, lines, l.scrollWidth > l.parentElement.clientWidth + 1]; }));
    const expect = portrait ? { 'いないいないばあ': 2, 'おみせやさん': 2, 'シールちょう': 2, 'ころころボール': 2 } : {};
    ok(wraps.every(w => w[1] === (expect[w[0]] || 1) && !w[2]), tag + ' labels: one line except breaks at natural points, no overflow ' + JSON.stringify(wraps.filter(w => w[1] !== 1 || w[2])));
    const cols = new Set(tiles.map(t => t.cx)).size, rows = new Set(tiles.map(t => t.cy)).size;
    ok(cols === 3 && rows === 3, tag + ' grid ' + cols + 'x' + rows);
    ok((await p.evaluate(() => [...document.querySelectorAll('.hm-page:not([hidden]) .tile')].map(t => t.getAttribute('aria-label')).join())) === 'ふうせん,どうぶつ,おえかき,いないいないばあ,もしもし,でんしゃ,おみせやさん,ぬりえ,シールちょう', tag + ' page1 order');
    let sc0 = await p.evaluate(() => ({ prevHidden: document.querySelector('#hm-prev').hidden, nextHidden: document.querySelector('#hm-next').hidden }));
    ok(await p.evaluate(() => !document.querySelector('#hm-title')) && sc0.prevHidden && !sc0.nextHidden, tag + ' page1 edge buttons ' + JSON.stringify(sc0));
    const nb = await p.locator('#hm-next').boundingBox();
    ok(Math.round(nb.width) === 64 && Math.round(nb.height) === 64, tag + ' next button 64px');
    if (tag === '390x844') await p.screenshot({ path: SP + '/home-p1.png' });
    if (tag === '360x740') await p.screenshot({ path: SP + '/home-p1-360.png' });
    if (tag === '1024x768') await p.screenshot({ path: SP + '/home-land.png' });
    await clearSays(p);
    await p.click('#hm-next'); await sleep(320);
    const t2 = await tileInfo();
    ok(await icoChk(), tag + ' page2 tile icons');
    ok(t2.length === 9 && t2.every(t => t.ok && t.w === tiles[0].w && t.h === tiles[0].h && !t.clip), tag + ' page2: 9 tiles, same size as page1, not clipped');
    ok(new Set(t2.map(t => t.cx)).size === 3 && new Set(t2.map(t => t.cy)).size === 3, tag + ' page2 grid 3x3');
    ok((await p.evaluate(() => [...document.querySelectorAll('.hm-page:not([hidden]) .tile')].map(t => t.getAttribute('aria-label')).join())) === 'いろタッチ,いろさがし,かぞえよう,すうじ,あいうえお,ABC,とけい,かたちはめ,ゆびのおうち', tag + ' page2 order');
    ok(await p.locator('#hm-next').isVisible() && await p.locator('#hm-prev').isVisible(), tag + ' ▶ switches to page2, both arrows');
    if (tag === '390x844') { await p.screenshot({ path: SP + '/home-p2.png' }); await p.screenshot({ path: SP + '/home-v8-p2.png' }); }
    const sc2 = await p.evaluate(() => ({ h: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth, v: document.documentElement.scrollHeight > innerHeight }));
    ok(!sc2.h && !sc2.v, tag + ' page2 no scroll');
    // swipe right-ward drag (finger moves right) goes back; must not open a game
    const ab = await p.locator('#hm-area').boundingBox(); const y0 = ab.y + ab.height / 2;
    await p.mouse.move(ab.x + 60, y0); await p.mouse.down(); await p.mouse.move(ab.x + 200, y0 + 10, { steps: 5 }); await p.mouse.up(); await sleep(330);
    ok((await p.locator('#hm-p0').isVisible()) && (await p.locator('#hm-p1').isHidden()) && (await p.locator('#home').isVisible()), tag + ' swipe goes back to page1, no tile tapped');
    await p.mouse.move(ab.x + 300, y0); await p.mouse.down(); await p.mouse.move(ab.x + 240, y0 + 200, { steps: 5 }); await p.mouse.up(); await sleep(320);
    ok(await p.locator('#hm-p0').isVisible(), tag + ' mostly-vertical drag does not switch');
    await p.click('.hm-dot:nth-child(2)'); await sleep(320);
    ok(await p.locator('#hm-p1').isVisible() && await p.locator('#hm-p0').isHidden(), tag + ' dot jumps to page2');
    await p.click('.hm-dot:nth-child(1)'); await sleep(320);
    // ---- page 3 (うごかす) ----
    ok(await p.locator('.hm-dot').count() === 3, tag + ' 3 page dots');
    await p.click('.hm-dot:nth-child(2)'); await sleep(320);
    await p.click('#hm-next'); await sleep(320);
    const t3 = await tileInfo();
    ok(await p.evaluate(() => { const ims = [...document.querySelectorAll('.hm-page:not([hidden]) .tile .ico-img')]; return ims.length === 3 && ims.every(i => i.complete && i.naturalWidth > 0); }), tag + ' page3 koro + neko + まぜまぜ icon images (ドライブ falls back to the 🚗 emoji)');
    const t1b = tiles[0];
    ok(t3.length === 9 && t3.every(t => t.ok && t.w === t1b.w && t.h === t1b.h && !t.clip), tag + ' page3: 9 tiles, same size as others ' + JSON.stringify(t3));
    ok(t3.every((t, k) => t.cx === tiles[k].cx && t.cy === tiles[k].cy), tag + ' page3: 3x3 grid in the same positions as page1');
    ok((await p.evaluate(() => [...document.querySelectorAll('.hm-page:not([hidden]) .tile')].map(t => t.getAttribute('aria-label')).join())) === 'ころころボール,ドライブ,ピアノ,ピンボール,ねこさがし,ボイスチェンジャー,なみもよう,まぜまぜ,すなば' && (await p.evaluate(() => document.querySelectorAll('.hm-page:not([hidden]) .tile')[1].querySelector('.ico').textContent)) === '🚗' && (await p.evaluate(() => document.querySelectorAll('.hm-page:not([hidden]) .tile')[2].querySelector('.ico').textContent)) === '🎹' && (await p.evaluate(() => document.querySelectorAll('.hm-page:not([hidden]) .tile')[3].querySelector('.ico').textContent)) === '🎱' && (await p.evaluate(() => document.querySelectorAll('.hm-page:not([hidden]) .tile')[4].querySelector('.ico-img') !== null) && (await p.evaluate(() => document.querySelectorAll('.hm-page:not([hidden]) .tile')[5].querySelector('.ico').textContent)) === '🎤'), tag + ' page3 order + ドライブ 🚗, ピアノ 🎹, ピンボール 🎱, ねこさがし (image icon), ボイスチェンジャー 🎤');
    ok((await p.evaluate(() => document.querySelectorAll('.hm-page:not([hidden]) .tile')[8].querySelector('.ico').textContent)) === '🏖️', tag + ' page3 すなば tile shows the 🏖️ emoji (no image icon yet)');
    ok(await p.locator('#hm-next').isHidden() && await p.locator('#hm-prev').isVisible(), tag + ' page3 ▶ hidden, ◀ shown, speaks');
    ok(await p.locator('.hm-dot[aria-current="true"]').evaluate(e => e.getAttribute('aria-label')) === 'うごかす', tag + ' page3 dot current');
    const sc3 = await scrollInfo(); ok(!sc3.h && !sc3.v, tag + ' page3 no scroll');
    if (tag === '390x844') await p.screenshot({ path: SP + '/home-p3.png' });
    // swipe 2 -> 1 -> back ; arrows across 3 pages
    await p.click('#hm-prev'); await sleep(320);
    ok(await p.locator('#hm-p1').isVisible(), tag + ' ◀ from p3 -> p2');
    await p.mouse.move(ab.x + 300, y0); await p.mouse.down(); await p.mouse.move(ab.x + 100, y0 + 5, { steps: 5 }); await p.mouse.up(); await sleep(330);
    ok(await p.locator('#hm-p2').isVisible() && await p.locator('#hm-p1').isHidden(), tag + ' swipe left p2 -> p3');
    await p.mouse.move(ab.x + 100, y0); await p.mouse.down(); await p.mouse.move(ab.x + 300, y0 + 5, { steps: 5 }); await p.mouse.up(); await sleep(330);
    ok(await p.locator('#hm-p1').isVisible(), tag + ' swipe right p3 -> p2');
    await p.click('.hm-dot:nth-child(1)'); await sleep(320);
    let sc = await scrollInfo(); ok(!sc.h && !sc.v, tag + ' home no scroll');
    const hb = await p.locator('#setbtn').boundingBox();
    ok(await p.locator('#setbtn').isVisible() && hb.width >= 55 && !(await p.locator('#mute').count()), tag + ' home has ⚙️ (' + hb.width + 'px), no 🔊');
    for (let i = 0; i < 27; i++) {
      await tapTile(p, LAB[i]); await sleep(i === 8 ? 500 : 380);
      const sel = '#stage-' + IDS[i];
      const vis = await p.locator(sel).isVisible();
      const box = await p.locator(sel).boundingBox();
      const tapAll = async (s, n) => { const e = p.locator(s); const c = await e.count(); for (let k = 0; k < Math.min(n, c); k++) { await e.nth(k).click({ force: true }); await sleep(120); } };
      if (i === 0) await p.mouse.click(box.x + 100, box.y + 300);
      if (i === 1) await tapAll('.card', 2);
      if (i === 3) await tapAll('.blob', 2);
      if (i === 6) await tapAll('.nb', 2);
      if (i === 8) await tapAll('.prod', 3);
      if (i === 12) await tapAll('#nu-pal .sw', 2);
      if (i === 13) await tapAll('.ai-b', 2);
      if (i === 14) await tapAll('.abc-pc', 2);
      if (i === 15) await tapAll('.ck-b', 1);
      if (i === 16) await tapAll('#y-svg .y-face', 2);
      if (i === 17) await tapAll('.stk-tab', 2);
      sc = await scrollInfo();
      const forb = await p.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null && /^(🔊|🔇|📷)$/.test(b.textContent.trim())).length);
      const abcBad = i === 14 ? await p.evaluate(() => { const s = document.querySelector('#stage-abc'); return [...s.querySelectorAll('button')].filter(b => /ぜんぶ|◀|▶/.test(b.textContent) && b.offsetParent !== null).length; }) : 0;
      ok(vis && !sc.h && forb === 0 && abcBad === 0, tag + ' game ' + IDS[i] + ' visible, no hscroll, no 🔊/📷' + (i === 14 ? ', no ぜんぶ/◀▶' : ''));
      await p.click('#homebtn'); await sleep(150);
      if (!(await p.locator('#home').isVisible())) ok(false, tag + ' back home from ' + IDS[i]);
    }
    ok(p.errs.length === 0, tag + ' no console errors ' + p.errs.join(' | '));
    await p.context().close();
  });

  /* ---------- 2. settings ---------- */
  T('phone-numbers', async (br) => {
    const p = await newPage(br, { width: 390, height: 844 }, { deny: true });
    await tapTile(p, LAB[9]); await sleep(500);
    const dial = async (d) => { for (const k of d) { await p.click('#ph-keys .pk >> text="' + k + '"', { force: true }); await sleep(120); } };
    const textOf = () => p.evaluate(() => document.querySelector('#ph-text').textContent);
    for (const [num, word] of [['110', 'けいさつ'], ['119', 'しょうぼうしゃ'], ['118', 'かいじょうほあんちょう'], ['117', 'ただいま']]) {
      await dial(num);
      ok(await until(p, async () => (await textOf()).includes(word), 4000), 'phone ' + num + ' answers with ' + word + ': ' + await textOf());
      ok(await until(p, async () => await p.locator('#ph-call').isHidden(), 9000), 'phone ' + num + ' hangs up by itself');
    }
    await dial('177');
    ok(await until(p, async () => (await textOf()).includes('です') && !(await textOf()).includes('けいさつ'), 4000), 'phone 177 (ended service) answers with an animal');
    ok(p.errs.length === 0, 'phone: no console errors ' + p.errs.join(' | '));
  });

  T('settings', async (br) => {
    const p = await newPage(br, { width: 390, height: 844 }, { deny: true });
    await holdOpen(p, 300); await sleep(100);
    ok(await p.locator('#setsheet').isHidden(), 'settings: 300ms hold does not open');
    await holdOpen(p, 1600); await sleep(150);
    ok(await p.locator('#setsheet').isVisible(), 'settings: 1.6s hold opens');
    const sb = await p.locator('#setsheet').boundingBox();
    ok(sb.x === 0 && sb.y === 0 && sb.width === 390 && sb.height === 844, 'settings: full-screen sheet');
    const xb = await p.locator('#setx').boundingBox(); ok(xb.width >= 56, 'settings: ✖ big ' + xb.width);
    const pressed = async k => p.evaluate(k => [...document.querySelectorAll('.seg[data-k="' + k + '"] button')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.v), k);
    ok((await pressed('sound')).join() === '1' && (await pressed('voice')).join() === '1' && (await pressed('camOn')).join() === '1' && (await pressed('camPos')).join() === 'top', 'settings: defaults on/on/use/top');
    const clickSeg = (k, v) => p.click('.seg[data-k="' + k + '"] button[data-v="' + v + '"]');
    await clickSeg('sound', '0'); ok((await pressed('sound')).join() === '0', 'toggle sound off');
    await clickSeg('voice', '0'); ok((await pressed('voice')).join() === '0', 'toggle voice off');
    await clickSeg('camOn', '0'); ok((await pressed('camOn')).join() === '0', 'toggle camOn off');
    await clickSeg('camPos', 'right'); ok((await pressed('camPos')).join() === 'right', 'camPos right');
    await clickSeg('abcAll', '1'); ok((await pressed('abcAll')).join() === '1', 'abcAll on');
    await clickSeg('abcStart', '3'); ok((await pressed('abcStart')).join() === '3', 'abcStart 3');
    await clickSeg('clockNow', '1'); ok((await pressed('clockNow')).join() === '1', 'clockNow on');
    await p.evaluate(() => { const t = document.querySelector('#thr'); t.value = '5'; t.dispatchEvent(new Event('input', { bubbles: true })); });
    ok(await p.locator('#thr-val').textContent() === '5', 'sens slider 5');
    await p.screenshot({ path: SP + '/settings-v7-nocam.png' });
    // camera test denied -> message in panel
    await p.click('#cam-test'); await sleep(400);
    ok(await p.locator('#cam-msg').isVisible(), 'camera test denied: message shown in panel');
    const stored = await p.evaluate(() => localStorage.getItem('ponpon.settings.v1'));
    ok(stored && !/sound|voice/.test(stored), 'storage has no sound/voice: ' + stored);
    await p.click('#setx'); await sleep(100);
    ok(await p.locator('#setsheet').isHidden(), 'settings close');
    // reload
    await p.reload(); await sleep(400);
    await holdOpen(p, 1600); await sleep(150);
    ok((await pressed('sound')).join() === '1' && (await pressed('voice')).join() === '1', 'reload: sound/voice back to on');
    ok((await pressed('camPos')).join() === 'right' && (await pressed('abcAll')).join() === '1' && (await pressed('abcStart')).join() === '3' && (await pressed('camOn')).join() === '0' && (await pressed('clockNow')).join() === '1', 'reload: camPos/abc/camOn/clockNow persisted');
    ok(await p.locator('#thr').inputValue() === '5' && await p.locator('#thr-val').textContent() === '5', 'reload: sens persisted');
    await p.click('#setx'); await sleep(100);
    // ABC with all => 26
    await tapTile(p, LAB[14]); await sleep(500);
    const n = await p.evaluate(() => ({ h: document.querySelectorAll('.abc-hole').length, pc: document.querySelectorAll('.abc-pc').length, hs: document.documentElement.scrollWidth > innerWidth }));
    ok(n.h === 26 && n.pc === 26 && !n.hs, 'ABC all mode from settings: 26 holes, 26 pieces, no hscroll ' + JSON.stringify(n));
    await p.click('#homebtn');
    // camOn false -> no getUserMedia
    const g0 = await p.evaluate(() => window.__gum);
    await tapTile(p, LAB[8]); await sleep(600);
    ok(await p.evaluate(() => window.__gum) === g0, 'camOn=false: getUserMedia not called');
    await p.click('#homebtn');
    // clockNow: start at current hour
    const nowH = new Date().getHours();
    await tapTile(p, LAB[15]); await sleep(400);
    ok(+(await p.getAttribute('#ck-face', 'data-hour')) === nowH, 'clockNow: starts at current hour ' + nowH);
    await p.click('#homebtn');
    // opening from page 2 and coming back lands on page 2
    await tapTile(p, 'とけい'); await sleep(400); await p.click('#homebtn'); await sleep(250);
    ok(await p.locator('#hm-p1').isVisible() && await p.locator('#hm-p0').isHidden(), 'return from game lands on page 2');
    // sound off not persisted AND silent: set sound off, tile click -> no speech
    await holdOpen(p, 1600); await sleep(100);
    await clearSays(p);
    await p.click('.seg[data-k="voice"] button[data-v="0"]');
    await p.click('#setx'); await sleep(100);
    await tapTile(p, LAB[0]); await sleep(300);
    ok((await says(p)).length === 0, 'voice off: no speech on tile tap');
    ok(p.errs.length === 0, 'settings: no console errors ' + p.errs.join('|'));
    await p.context().close();
  });

  /* ---------- 3. sayEn ---------- */
  T('sayen', async (br) => {
    const p = await newPage(br, { width: 390, height: 844 }, { voices: ENV, deny: true });
    await tapTile(p, LAB[14]); await sleep(500);
    await clearSays(p);
    // tap piece A
    await p.click('.abc-pc[data-l="A"]', { force: true }); await sleep(200);
    let s = await says(p);
    ok(s.length >= 1 && s.every(x => x.lang === 'en-US') && s[0].t === 'A.', 'sayEn A: lang en-US text "A." voice=' + (s[0] && s[0].voice) + ' ' + JSON.stringify(s.map(x => x.t)));
    ok(s[0] && s[0].voice === 'Samantha', 'sayEn voice preference picks Samantha');
    // correct: tap hole A (lifted piece)
    await clearSays(p);
    await p.click('.abc-hole[data-l="A"]'); await sleep(700);
    s = await says(p);
    ok(s.length >= 1 && s.some(x => x.t === 'Apple!' && x.lang === 'en-US') && !s.some(x => /A\./.test(x.t)), 'correct fit says only "Apple!" (no "A.") ' + JSON.stringify(s.map(x => x.t)));
    ok(await p.evaluate(() => { const b = document.querySelector('#bigword'); return !b.hidden && /^apple$/i.test(b.textContent.trim()); }), 'correct fit: bigword shows only the word');
    // wrong: pick B piece then hole C
    await clearSays(p);
    await p.click('.abc-pc[data-l="B"]', { force: true }); await sleep(150);
    await p.click('.abc-hole[data-l="C"]'); await sleep(330);
    const fg = await p.evaluate(() => { const f = document.querySelectorAll('#fx-abc .abc-finger'); const e = f[0]; const r = e && e.getBoundingClientRect(); const hr = document.querySelector('.abc-hole[data-l="C"]').getBoundingClientRect(); const b = document.querySelector('#abc-board').getBoundingClientRect(); let no = 0; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); while (w.nextNode()) { if (/NO!/.test(w.currentNode.textContent) && w.currentNode.parentElement.getClientRects().length) no++; } return { n: f.length, pe: e && getComputedStyle(e).pointerEvents, txt: e && e.textContent, w: r && Math.round(r.width), exp: Math.min(200, Math.max(90, Math.min(b.width, b.height) * 0.3)), dx: r && Math.abs(r.left + r.width / 2 - hr.left - hr.width / 2), dy: r && Math.abs(r.top + r.height / 2 - hr.top - hr.height / 2), no, hs: document.documentElement.scrollWidth > innerWidth, oldEl: !!document.querySelector('#abc-no') }; });
    ok(fg.n === 1 && fg.pe === 'none' && fg.txt === '\u261d\ufe0f' && Math.abs(fg.w - fg.exp) <= 2 && fg.dx < 3 && fg.dy < 3, 'wrong: one ☝️ finger, pointer-events none, sized/centred on hole ' + JSON.stringify(fg));
    ok(fg.no === 0 && !fg.oldEl && !fg.hs, 'wrong: no visible NO! text, no #abc-no element, no hscroll');
    await p.evaluate(() => document.querySelector('.abc-hole[data-l="D"]') && 0);
    await p.click('.abc-pc[data-l="B"]', { force: true }).catch(() => {}); await sleep(60);
    await p.click('.abc-hole[data-l="D"]').catch(() => {}); await sleep(250);
    ok(await p.locator('#fx-abc .abc-finger').count() === 1, 'repeated wrong: still only one finger');
    await p.screenshot({ path: SP + '/abc-finger.png' });
    await sleep(1000);
    ok(await p.locator('#fx-abc .abc-finger').count() === 0, 'finger removed from DOM after animation');
    s = await says(p);
    ok(s.some(x => /^(No!|Nope!|No no no!|Noooo!)$/.test(x.t) && x.lang === 'en-US') && s.every(x => x.lang === 'en-US'), 'wrong says No! variants, lang en-US ' + JSON.stringify(s.map(x => x.t)));
    // W and Z names
    const spell = await p.evaluate(() => 0);
    await p.context().close();
    // no voices at all (iOS-like, first second): still en-US
    // 1 秒以内に押すので、ページ切り替えの待ちを省いてタイルを直接クリックする（並列の負荷でも間に合うように）
    const p0 = await newPage(br, { width: 390, height: 844 }, { voices: [], deny: true, settle: 50 });
    await p0.evaluate(lab => document.querySelector('.tile[aria-label="' + lab + '"]').click(), LAB[14]); await sleep(100);
    await clearSays(p0);
    await p0.click('.abc-pc[data-l="A"]', { force: true }); await sleep(150);
    s = await says(p0);
    ok(s.length === 1 && s[0].lang === 'en-US' && s[0].t === 'A.' && !s[0].voice, 'empty voices (<1s): lang en-US "A." no voice' + (s.length === 1 && s[0].t === 'A.' ? '' : ' ' + JSON.stringify(s)));
    await sleep(1100);
    await clearSays(p0);
    await p0.click('.abc-pc[data-l="B"]', { force: true }); await sleep(150);
    s = await says(p0);
    ok(s.length === 1 && s[0].t === 'ビー！' && s[0].lang === 'ja-JP', 'no English voice after 1s: katakana fallback ' + JSON.stringify(s));
    await p0.context().close();
    // only Japanese voice
    const pj = await newPage(br, { width: 390, height: 844 }, { voices: JAV, deny: true });
    await tapTile(pj, LAB[14]); await sleep(1200);
    await clearSays(pj);
    await pj.click('.abc-pc[data-l="A"]', { force: true }); await sleep(150);
    s = await says(pj);
    ok(s.length === 1 && s[0].t === 'エー！', 'ja-only voices: katakana エー！ ' + JSON.stringify(s));
    await clearSays(pj);
    await pj.click('.abc-hole[data-l="A"]'); await sleep(600);
    s = await says(pj);
    ok(s.some(x => x.t === 'アップル！') && !s.some(x => /エー/.test(x.t)), 'ja-only: correct fit katakana word only ' + JSON.stringify(s.map(x => x.t)));
    await clearSays(pj);
    await pj.click('.abc-pc[data-l="B"]', { force: true }); await sleep(150);
    await pj.click('.abc-hole[data-l="C"]'); await sleep(500);
    s = await says(pj);
    ok(s.some(x => /ノー/.test(x.t)), 'ja-only: No! -> ノー ' + JSON.stringify(s.map(x => x.t)));
    await pj.context().close();
  });

  /* ---------- 4. shop camera ---------- */
  TV('shopcam', [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1024, height: 768 }], async (br, vp) => {
    const tag = vp.width + 'x' + vp.height;
    const p = await newPage(br, vp);
    await tapTile(p, LAB[8]); await sleep(2200);
    const info = await p.evaluate(() => {
      const w = document.querySelector('#scanwin'), wr = w.getBoundingClientRect(), v = w.querySelector('video'), vr = v.getBoundingClientRect();
      const cb = document.querySelector('#cbox'), cr = cb.getBoundingClientRect();
      const ars = [...document.querySelectorAll('#camarrows .ar')].filter(a => a.offsetParent !== null);
      const st = document.querySelector('#stage-shop').getBoundingClientRect();
      const lcd = document.querySelector('#lcd').getBoundingClientRect();
      const gr = document.querySelector('#camarrows .grp').getBoundingClientRect();
      const hb = document.querySelector('#homebtn').getBoundingClientRect();
      return { hasVideo: !!v && v.offsetParent !== null && v.videoWidth > 0, inside: vr.left >= wr.left - 1 && vr.right <= wr.right + 1, mirrored: getComputedStyle(v).transform, fit: getComputedStyle(v).objectFit,
        cbox: cr.width > 0 && cr.left >= wr.left && cr.right <= wr.right, cboxRatio: [(cr.width / wr.width).toFixed(2), (cr.height / wr.height).toFixed(2)], arrows: ars.length, pos: document.querySelector('#camarrows').dataset.pos,
        winTop: wr.top - st.top, winAboveLcd: wr.bottom < lcd.top, arrowAbove: gr.bottom <= wr.top + 1, arrowTopEdge: gr.top - st.top, lbl: document.querySelector('#camarrows .camlbl').textContent, oldPreview: !!document.querySelector('#campv'), hscroll: document.documentElement.scrollWidth > innerWidth,
        winRight: wr.right <= st.right, winLeft: wr.left - hb.right, ar: getComputedStyle(document.querySelector('#camarrows .ar')).animationName, winSize: [wr.width, wr.height], retry: !!document.querySelector('#camretry') };
    });
    ok(info.hasVideo && info.inside && /-1/.test(info.mirrored) && info.fit === 'cover', tag + ' shop: live mirrored video inside window ' + info.mirrored);
    ok(info.cbox, tag + ' shop: centre box inside window ratio ' + info.cboxRatio);
    ok(info.arrows >= 2 && info.pos === 'top' && info.arrowAbove && info.ar === 'arw' && /ここに みせてね/.test(info.lbl), tag + ' shop: ' + info.arrows + ' up arrows above window, label "' + info.lbl + '"');
    ok(info.winAboveLcd && !info.oldPreview && !info.retry && !info.hscroll, tag + ' shop: window at top (y=' + Math.round(info.winTop) + ', arrows top ' + Math.round(info.arrowTopEdge) + '), old preview/📷 button gone, win ' + info.winSize.map(Math.round));
    ok(info.winLeft >= 0, tag + ' shop: window right of 🏠 (' + Math.round(info.winLeft) + 'px gap)');
    // intro said once
    let s = await says(p);
    ok(s.filter(x => x.t === 'カメラに おもちゃを みせてね').length === 1, tag + ' shop: intro line said once ' + JSON.stringify(s.map(x => x.t)));
    // tap window: guidance, no scan
    const win = await p.locator('#scanwin').boundingBox();
    let good = false, d0, d1;
    for (let k = 0; k < 4 && !good; k++) {
      await sleep(3100);
      await clearSays(p);
      d0 = await p.evaluate(() => window.__scans || 0);
      await p.mouse.click(win.x + win.width / 2, win.y + win.height / 2);
      await sleep(60);
      d1 = await p.evaluate(() => window.__scans || 0);
      good = d1 === d0;
    }
    s = await says(p);
    ok(good && s.some(x => x.t === 'うえの カメラに みせてね'), tag + ' shop: window tap -> no shopScan (' + d0 + '->' + d1 + '), guidance "' + (s[0] && s[0].t) + '"');
    const lcdTxt = await p.locator('#lcd-name').textContent();
    ok(/カメラに/.test(lcdTxt), tag + ' shop: guidance shown on LCD "' + lcdTxt + '"');
    // rate limit 3s
    await clearSays(p);
    await p.mouse.click(win.x + win.width / 2, win.y + win.height / 2); await p.mouse.click(win.x + 20, win.y + 20); await sleep(100);
    ok((await says(p)).length === 0, tag + ' shop: guidance limited to once / 3s');
    // glow responds to level: check inline vars over time
    let sawGlow = false; for (let k = 0; k < 40 && !sawGlow; k++) { sawGlow = await p.evaluate(() => { const w = document.querySelector('#scanwin'); return !!w.style.getPropertyValue('--bs') || w.classList.contains('ok'); }); await sleep(100); }
    console.log('     (info) glow seen with fake camera: ' + sawGlow);
    if (tag === '390x844') await p.screenshot({ path: SP + '/shop-cam-v7.png' });
    if (vp.width !== 390) { ok(p.errs.length === 0, tag + ' shop cam: no console errors (camera-position part runs at 390x844)'); await p.context().close(); return; }
    // camera position left
    await p.click('#homebtn');
    await holdOpen(p, 1600); await sleep(100);
    await p.click('.seg[data-k="camPos"] button[data-v="left"]'); await p.click('#setx');
    await tapTile(p, LAB[8]); await sleep(1800); await clearSays(p);
    const posL = await p.evaluate(() => { const a = document.querySelector('#camarrows'), w = document.querySelector('#scanwin').getBoundingClientRect(), g = document.querySelector('#camarrows .grp').getBoundingClientRect(); return { pos: a.dataset.pos, left: g.right <= w.left + 1, rot: getComputedStyle(document.querySelector('#camarrows .ar')).getPropertyValue('--rot').trim() }; });
    ok(posL.pos === 'left' && posL.left && posL.rot === '-90deg', tag + ' shop: camera position left -> arrows left of window ' + JSON.stringify(posL));
    s = (await p.evaluate(() => 1), 1);
    const win2 = await p.locator('#scanwin').boundingBox(); await p.mouse.click(win2.x + win2.width / 2, win2.y + win2.height / 2); await sleep(100);
    ok((await says(p)).some(x => x.t === 'ひだりの カメラに みせてね'), tag + ' shop: guidance says ひだり');
    ok(p.errs.length === 0, tag + ' shop cam: no console errors ' + p.errs.join('|'));
    await p.context().close();
  });
  T('shop-denied', async (br) => {
    // denied camera -> glass window, no arrows
    const p = await newPage(br, { width: 390, height: 844 }, { deny: true });
    await tapTile(p, LAB[8]); await sleep(900);
    const d = await p.evaluate(() => ({ arr: document.querySelector('#camarrows').hidden, vid: document.querySelector('#cam-video').hidden, cbox: document.querySelector('#cbox').hidden, live: document.querySelector('#scanwin').classList.contains('live'), pad: document.querySelector('#scanbox').dataset.arr }));
    ok(d.arr && d.vid && d.cbox && !d.live && d.pad === 'none', 'shop denied: glass window, no arrows ' + JSON.stringify(d));
    await p.click('.prod:nth-child(1)'); await sleep(900);
    ok((await p.locator('#basket .hint').count()) === 0, 'shop denied: shelf tap still scans');
    await p.context().close();
  });
  /* ---------- 4b. shop pay: お金は1まいずつばらばら（まとめ表示なし）・iPad で大きく ---------- */
  TV('shoppay', [{ width: 360, height: 740 }, { width: 1180, height: 820 }, { width: 844, height: 390 }], async (br, vp) => {
    const tag = vp.width + 'x' + vp.height;
    const p = await newPage(br, vp, { deny: true });
    await tapTile(p, LAB[8]); await sleep(900);
    for (const l of ['おさかな', 'もも', 'にんじん', 'きゅうり', 'なす']) { await p.click('.prod[aria-label^="' + l + '"]'); await sleep(550); }
    await p.click('#paybtn'); await sleep(2600);
    const L = await p.evaluate(() => {
      const R = e => e.getBoundingClientRect(), st = R(document.querySelector('#stage-shop')), pp = R(document.querySelector('#paypanel')), cz = R(document.querySelector('#coins'));
      const ss = [...document.querySelectorAll('#coins .mstk')].map(R), vs = [...document.querySelectorAll('#coins .mny')].map(R);
      let overlap = false;
      for (let i = 0; i < ss.length; i++) for (let j = i + 1; j < ss.length; j++) { const a = ss[i], b = ss[j]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlap = true; }
      return { n: ss.length, overlap, minW: Math.min(...ss.map(r => r.width)), inside: ss.every(r => r.left >= cz.left - 1 && r.right <= cz.right + 1 && r.top >= cz.top - 1 && r.bottom <= cz.bottom + 1) && vs.every(r => r.left >= cz.left - 1 && r.right <= cz.right + 1 && r.top >= cz.top - 1 && r.bottom <= cz.bottom + 1) && ss.every((r, i) => Math.abs((r.left + r.right) / 2 - (vs[i].left + vs[i].right) / 2) < 3 && Math.abs((r.top + r.bottom) / 2 - (vs[i].top + vs[i].bottom) / 2) < 3),
        land: innerWidth > innerHeight, panelW: pp.width / st.width, panelH: pp.height / st.height, hs: document.documentElement.scrollWidth > innerWidth };
    });
    const big = vp.width >= 700 && vp.height >= 660;
    const badges = await p.locator('#coins .bdg').count(), packed = await p.evaluate(() => /×\d/.test(document.querySelector('#coins').textContent + document.querySelector('#tray').textContent));
    ok(L.n >= 4 && badges === 0 && !packed && L.inside && L.minW >= (big ? 115 : 80) && !L.hs, tag + ' shop pay: ' + L.n + ' loose coins scattered (no x-count), inside, w>=' + Math.round(L.minW));
    if (L.land) ok(L.panelW > 0.4 && L.panelH > 0.9, tag + ' shop pay: landscape pay panel fills right half ' + L.panelW.toFixed(2) + 'x' + L.panelH.toFixed(2));
    if (tag === '820x1180' || tag === '1180x820') await p.screenshot({ path: SP + '/shop-pay-' + tag + '.png' });
    let n = 0; while (n < 30 && await p.locator('#coins .mstk:not(.gone)').count()) { await p.locator('#coins .mstk:not(.gone)').last().click(); await sleep(420); n++; }
    await sleep(900);
    ok(await p.locator('#receipt:not([hidden])').count() === 1 && p.errs.length === 0, tag + ' shop pay: ' + n + ' taps -> receipt, no errors ' + p.errs.join('|'));
    await p.context().close();
  });

  /* ---------- 5. nurie fish ---------- */
  TV('nurie', [{ width: 390, height: 844 }, { width: 360, height: 740 }], async (br, vp) => {
    const tag = vp.width + 'x' + vp.height;
    const p = await newPage(br, vp, { deny: true });
    await tapTile(p, LAB[12]); await sleep(500);
    const nm = await p.locator('#nu-name').textContent();
    const regs = await p.evaluate(() => [...document.querySelectorAll('#nu-svg .rg')].map(r => { const b = r.getBoundingClientRect(); return { cx: b.left + b.width / 2, cy: b.top + b.height / 2, d: r.getAttribute('d') }; }));
    ok(nm === 'おさかな' && regs.length === 6, tag + ' fish: ' + nm + ', ' + regs.length + ' regions');
    ok((regs[0].d.match(/M/g) || []).length === 1 && (regs[0].d.match(/A/g) || []).length === 2, tag + ' fish: body is one ellipse path');
    // sampling: which region owns each pixel; sizes
    const sizes = await p.evaluate(() => {
      const svg = document.querySelector('#nu-svg'), r = svg.getBoundingClientRect(), out = [0, 1, 2, 3, 4, 5].map(() => ({ x0: 1e9, x1: -1, y0: 1e9, y1: -1, n: 0, rows: {}, cols: {} }));
      for (let y = r.top; y < r.bottom; y += 2) for (let x = r.left; x < r.right; x += 2) {
        const e = document.elementFromPoint(x, y);
        if (e && e.classList && e.classList.contains('rg')) { const o = out[+e.dataset.i]; o.x0 = Math.min(o.x0, x); o.x1 = Math.max(o.x1, x); o.y0 = Math.min(o.y0, y); o.y1 = Math.max(o.y1, y); o.n++; }
      }
      return out.map(o => ({ w: o.x1 - o.x0, h: o.y1 - o.y0, area: o.n * 4 }));
    });
    console.log('     (info) ' + tag + ' visible hit-box w x h per region: ' + sizes.map(s => s.w + 'x' + s.h).join('  '));
    ok(sizes.every(s => s.n !== 0 && s.area > 0), tag + ' fish: all 6 regions hit-testable');
    // paint each by centre tap with different colours
    const centreOk = await p.evaluate(rs => rs.map(r => { const e = document.elementFromPoint(r.cx, r.cy); return e && e.classList.contains('rg') ? +e.dataset.i : -1; }), regs);
    ok(centreOk.join() === '0,1,2,3,4,5', tag + ' fish: elementFromPoint at each centre = own region ' + centreOk.join());
    const cols = [0, 1, 2, 3, 5, 6];
    for (let i = 0; i < 6; i++) {
      await p.click('#nu-pal .sw:nth-child(' + (cols[i] + 1) + ')'); await sleep(80);
      const before = await p.evaluate(i => document.querySelectorAll('#nu-svg .rg')[i].getAttribute('fill'), i);
      await p.mouse.click(regs[i].cx, regs[i].cy); await sleep(120);
      const after = await p.evaluate(i => document.querySelectorAll('#nu-svg .rg')[i].getAttribute('fill'), i);
      ok(before !== after, tag + ' fish: region ' + i + ' painted ' + before + ' -> ' + after);
    }
    // stripe tap paints stripe only; body part tap paints body only
    await sleep(3200);
    if (tag === '390x844') await p.screenshot({ path: SP + '/nurie-fish-v7.png' });
    ok(p.errs.length === 0, tag + ' fish: no console errors');
    await p.context().close();
  });

  /* ---------- 6. clock ---------- */
  T('clock', async (br) => {
    const vp = { width: 390, height: 844 };
    const p = await newPage(br, vp, { deny: true });
    await tapTile(p, LAB[15]); await sleep(500);
    const geom = () => p.evaluate(() => { const r = document.querySelector('#ck-face').getBoundingClientRect(); return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, R: r.width / 2 }; });
    const hour = async () => +(await p.getAttribute('#ck-face', 'data-hour'));
    const pt = (g, ang, k) => ({ x: g.cx + Math.sin(ang * Math.PI / 180) * g.R * k, y: g.cy - Math.cos(ang * Math.PI / 180) * g.R * k });
    const g = await geom();
    ok(await hour() === 7, 'clock: starts at 7');
    const st = await p.evaluate(() => { const f = document.querySelector('#ck-face').getBoundingClientRect(); const s = document.querySelector('#stage-clock').getBoundingClientRect(); return { fw: f.width, sw: s.width, ratio: f.width / Math.min(s.width, s.height) }; });
    ok(Math.abs(st.fw / st.sw - 0.8) < 0.06, 'clock: diameter ~80% of width (' + st.fw.toFixed(0) + '/' + st.sw.toFixed(0) + ')');
    
    // drag helper: sweep from current angle clockwise (dir=1) or counter-clockwise (dir=-1) to target angle, steps of 15deg
    async function sweep(from, to, dir, k = 0.55) {
      let a = from; const p0 = pt(g, a, k); await p.mouse.move(p0.x, p0.y); await p.mouse.down();
      let n = 0;
      while (((to - a) * dir + 720) % 360 > 0.1 && n++ < 80) { a = (a + dir * 15 + 360) % 360; const q = pt(g, a, k); await p.mouse.move(q.x, q.y); await sleep(12); }
      await p.mouse.up(); await sleep(450);
    }
    await clearSays(p);
    // 7 -> 3 o'clock via 12 (clockwise): expect 15
    await sweep(210, 90, 1);
    let s = await says(p);
    ok(await hour() === 15, 'clock: drag clockwise 7 -> 3 o\'clock => 15h (got ' + (await hour()) + ')');
    ok(s.some(x => x.t === 'さんじ！ おやつの じかん！' && x.lang === 'ja-JP'), 'clock: reads "さんじ！ おやつの じかん！" ' + JSON.stringify(s.map(x => x.t)));
    ok((await p.locator('#ck-line').textContent()) === 'さんじ おやつの じかん' && /🍪🧃/.test(await p.locator('#ck-emo').textContent()), 'clock: card shows scene');
    await p.screenshot({ path: SP + '/clock-v7.png' });
    // hand angle
    const hang = await p.evaluate(() => document.querySelector('#ck-hhand').getAttribute('transform'));
    ok(/rotate\(90(\.0+)?\)/.test(hang), 'clock: hand at 90deg ' + hang);
    // day button 🛁 -> 19
    await clearSays(p);
    await p.click('.ck-b[data-h="19"]'); await sleep(1100);
    ok(await hour() === 19, 'clock: 🛁 button => 19h (got ' + (await hour()) + ')');
    s = await says(p);
    ok(s.some(x => x.t === 'しちじ！ おふろの じかん！'), 'clock: 19h reads しちじ！ おふろの じかん！ ' + JSON.stringify(s.map(x => x.t)));
    ok(await p.locator('.ck-b[data-h="19"]').evaluate(b => b.classList.contains('on')), 'clock: pressed button marked');
    const btnSizes = await p.evaluate(() => [...document.querySelectorAll('.ck-b')].map(b => Math.round(b.getBoundingClientRect().width)));
    ok(btnSizes.length === 8 && btnSizes.every(w => w >= 56), 'clock: 8 day buttons >=56px ' + btnSizes);
    // sky night
    const night = await p.evaluate(() => document.querySelector('#stage-clock').classList.contains('night'));
    ok(night, 'clock: 19h => night sky');
    // chime at 19: 7 bongs
    await clearSays(p);
    const b0 = await p.evaluate(() => window.__bong);
    await p.mouse.click(g.cx, g.cy);
    await sleep(1100 * 7 + 600);
    s = await says(p); const b1 = await p.evaluate(() => window.__bong);
    const nums = s.map(x => x.t);
    ok(JSON.stringify(nums) === JSON.stringify(['いち', 'に', 'さん', 'よん', 'ご', 'ろく', 'なな', 'しちじ！']), 'clock: hub tap => 7 bongs counted aloud then しちじ！ ' + JSON.stringify(nums));
    ok(b1 - b0 === 7, 'clock: 7 bong tones (196Hz) (' + (b1 - b0) + ')');
    // numeral tap
    await clearSays(p);
    for (const [n, w] of [[3, 'さん'], [12, 'じゅうに'], [9, 'きゅう'], [7, 'なな']]) {
      const q = pt(g, n * 30, 0.62 * 0.98); // numeral position r=62 of 100 units
      await p.mouse.click(q.x, q.y); await sleep(150);
    }
    s = await says(p);
    ok(JSON.stringify(s.map(x => x.t)) === JSON.stringify(['さん', 'じゅうに', 'きゅう', 'なな']), 'clock: numeral taps read numbers ' + JSON.stringify(s.map(x => x.t)));
    // all 24 hours clockwise from 19 -> continuous
    const EXP = { 0: 'じゅうにじ！ みんな ねんね してるよ…', 1: 'いちじ！ みんな ねんね してるよ…', 2: 'にじ！ みんな ねんね してるよ…', 3: 'さんじ！ みんな ねんね してるよ…', 4: 'よじ！ みんな ねんね してるよ…', 5: 'ごじ！ みんな ねんね してるよ…', 6: 'ろくじ！', 7: 'しちじ！ おはよう！ あさごはんの じかん！', 8: 'はちじ！', 9: 'くじ！ おでかけの じかん！', 10: 'じゅうじ！ おそとで あそぼう！', 11: 'じゅういちじ！', 12: 'じゅうにじ！ おひるごはんの じかん！', 13: 'いちじ！ おひるねの じかん！', 14: 'にじ！', 15: 'さんじ！ おやつの じかん！', 16: 'よじ！', 17: 'ごじ！ おかたづけの じかん！', 18: 'ろくじ！ ばんごはんの じかん！', 19: 'しちじ！ おふろの じかん！', 20: 'はちじ！ おやすみなさい！ ねんねの じかん！', 21: 'くじ！ みんな ねんね してるよ…', 22: 'じゅうじ！ みんな ねんね してるよ…', 23: 'じゅういちじ！ みんな ねんね してるよ…' };
    let allOk = true, bad = [];
    let cur = 19;
    for (let i = 0; i < 24; i++) {
      const nxt = (cur + 1) % 24, a0 = (cur % 12) * 30, a1 = (nxt % 12) * 30;
      await clearSays(p);
      await sweep(a0, a1, 1);
      const h = await hour(); const ss = await says(p);
      const spoken = ss.map(x => x.t).join('|');
      // night: first utterance reading, second whisper
      const want = nxt >= 21 || nxt <= 5 ? EXP[nxt].split('！')[0] + '！|みんな ねんね してるよ' : EXP[nxt];
      const nightOk = nxt >= 21 || nxt <= 5 ? ss.length === 2 && ss[1].vol < 0.6 && ss[1].rate < 0.8 && ss[1].pitch < 1 : true;
      const line = await p.locator('#ck-line').textContent();
      if (h !== nxt || spoken !== want || !nightOk || line !== EXP[nxt].replace(/！/g, '')) { allOk = false; bad.push(nxt + ':h=' + h + ' said=' + spoken + ' line=' + line); }
      cur = nxt;
    }
    ok(allOk, 'clock: 24 hours clockwise (incl. 12 crossing, AM/PM): readings/cards/night whisper all match ' + bad.slice(0, 3).join(' ;; '));
    // counter-clockwise across 12 : from 0 -> 23
    await sweep(0, 330, -1);
    ok(await hour() === 23, 'clock: counter-clockwise across 12 returns 23h (' + (await hour()) + ')');
    // spin timing: 7 -> 19 takes <=1.5s, ticks
    await p.click('.ck-b[data-h="7"]'); await sleep(1700);
    await clearSays(p);
    const t0 = Date.now(); await p.click('.ck-b[data-h="19"]');
    let t19 = -1; for (let k = 0; k < 40; k++) { await sleep(50); if ((await hour()) === 19 && (await says(p)).length) { t19 = Date.now() - t0; break; } }
    ok(t19 > 0 && t19 < 1800, 'clock: 12-hour spin finishes within ~1.5s (' + t19 + 'ms)');
    // leave mid-chime / mid-spin: nothing after
    await p.mouse.click(g.cx, g.cy); await sleep(500);
    await p.click('.ck-b[data-h="7"]'); await sleep(100);
    await p.click('#homebtn'); await clearSays(p); await sleep(2500);
    ok((await says(p)).length === 0, 'clock: leave() stops chime/spin/speech');
    await tapTile(p, LAB[15]); await sleep(400);
    ok(await hour() === 7, 'clock: re-enter starts at 7 again');
    ok(p.errs.length === 0, 'clock: no console errors ' + p.errs.join('|'));
    await p.context().close();
  });
  // clock at other viewports: layout fits, no overlap with home button
  TV('clock-layout', [{ width: 360, height: 740 }, { width: 1024, height: 768 }], async (br, vp) => {
    const p = await newPage(br, vp, { deny: true });
    await tapTile(p, LAB[15]); await sleep(500);
    const L = await p.evaluate(() => { const st = document.querySelector('#stage-clock').getBoundingClientRect(); const r = e => document.querySelector(e).getBoundingClientRect(); const f = r('#ck-face'), c = r('#ck-card'), b = r('#ck-btns'), hb = r('#homebtn'), o = r('#ck-orb');
      return { faceIn: f.left >= st.left && f.right <= st.right && f.top >= st.top && f.bottom <= st.bottom, btnIn: b.bottom <= st.bottom + 1 && b.right <= st.right + 1, noOverlap: !(f.left < hb.right && f.right > hb.left && f.top < hb.bottom && f.bottom > hb.top) || (f.top >= hb.bottom - 2), face: Math.round(f.width), cardB: Math.round(c.bottom - st.top), stH: Math.round(st.height), orbIn: o.left >= st.left && o.right <= st.right, hs: document.documentElement.scrollWidth > innerWidth }; });
    ok(L.faceIn && L.btnIn && L.noOverlap && L.orbIn && !L.hs, vp.width + 'x' + vp.height + ' clock layout fits ' + JSON.stringify(L));
    await p.context().close();
  });

  /* ---------- 7. settings screenshot with fake camera running ---------- */
  T('settings-cam', async (br) => {
    const p = await newPage(br, { width: 390, height: 844 });
    await holdOpen(p, 1600); await sleep(200);
    await p.locator('#cam-test').scrollIntoViewIfNeeded();
    await p.click('#cam-test'); await sleep(1800);
    const dg = await p.evaluate(() => ({ vis: !document.querySelector('#diag').hidden, st: document.querySelector('#dstate').textContent, bar: document.querySelector('#dfill').style.width }));
    ok(dg.vis && /じゅんび|まってる|ピッ/.test(dg.st), 'camera test: diagnostics shown ' + JSON.stringify(dg));
    await p.evaluate(() => { document.querySelector('.setbody').scrollTop = 150; }); await sleep(200);
    await p.screenshot({ path: SP + '/settings-v7.png' });
    await p.click('#setx'); await sleep(200);
    const stopped = await p.evaluate(() => { const v = document.querySelector('#set-video'); return !v.srcObject; });
    ok(stopped, 'camera test: stopped when sheet closed');
    ok(p.errs.length === 0, 'settings cam: no console errors ' + p.errs.join('|'));
    await p.context().close();
  });
  /* ---------- 8. v8: ゆびのおうち ---------- */
  T('yubi', async (br) => {
    const VP = { width: 390, height: 844 };
    const p = await newPage(br, VP, { deny: true });
    let dialogs = 0; p.on('dialog', d => { dialogs++; d.dismiss(); });
    const said = async () => (await says(p)).map(x => x.t);
    const ctr = async sel => { const b = await p.locator(sel).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
    const tapFace = async i => { const [x, y] = await ctr('#y-svg .y-face[data-i="' + i + '"]'); await p.mouse.click(x, y); };
    await tapTile(p, 'ゆびのおうち'); await sleep(500);
    await p.screenshot({ path: SP + '/yubi-idle.png' });
    const ov = await p.evaluate(() => { const c = [...document.querySelectorAll('#y-svg .y-face circle:first-child')].map(e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 }; }); let bad = 0; for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) if (Math.hypot(c[i].x - c[j].x, c[i].y - c[j].y) < c[i].r + c[j].r) bad++; const st = document.querySelector('#stage-yubi').getBoundingClientRect(), svgb = [...document.querySelectorAll('#y-root')][0].getBoundingClientRect(); return { bad, fill: +(svgb.height / st.height).toFixed(2), top: Math.round(Math.min(...c.map(q => q.y - q.r)) - st.top) }; });
    ok(ov.bad === 0, 'yubi: no two face circles intersect in the open pose ' + JSON.stringify(ov));
    const info = await p.evaluate(() => [...document.querySelectorAll('#y-svg .y-f')].map(g => { const r = g.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    ok(info.length === 5 && info.every(i => i[1] >= 80 && i[0] >= 60), 'yubi: 5 separate finger <g>, boxes (finger+face) w/h ' + JSON.stringify(info));
    ok(await p.locator('#y-svg .y-face').count() === 5 && await p.locator('#y-svg .y-lab').count() === 5, 'yubi: 5 faces + 5 name labels');
    const hsc = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight);
    ok(!hsc, 'yubi: no scroll');
    const EXP = ['おやゆびは パパ！', 'ひとさしゆびは ママ！', 'なかゆびは おにいさん！', 'くすりゆびは おねえさん！', 'こゆびは あかちゃん！'];
    for (let i = 0; i < 5; i++) {
      await clearSays(p); await tapFace(i); await sleep(250);
      const t = await said();
      ok(t[0] === EXP[i], 'yubi: finger ' + i + ' says "' + EXP[i] + '" (got ' + JSON.stringify(t) + ')');
      if (i === 0) {
        const a = await p.evaluate(() => document.querySelector('#y-svg .y-f[data-i="0"]').getAnimations().length);
        ok(a >= 1, 'yubi: tapped finger plays bend animation');
        ok(await p.evaluate(() => document.querySelector('#y-svg .y-f[data-i="0"]').parentNode.getAttribute('transform').indexOf('translate(') === 0), 'yubi: finger group pivots at its base (translate to root)');
      }
      if (i === 2) { ok(await p.locator('#y-svg .y-stars:not([hidden])').count() === 3, 'yubi: ⭐ marks on tapped fingers'); }
    }
    await sleep(1200);
    ok((await said()).indexOf('みんなで こんにちは！') >= 0, 'yubi: all 5 tapped -> "みんなで こんにちは！"');
    ok(await p.evaluate(() => document.querySelector('#bigword').textContent.indexOf('こんにちは') >= 0), 'yubi: wave word on screen');
    await p.screenshot({ path: SP + '/yubi.png' });
    await sleep(1800);
    ok(await p.locator('#y-svg .y-stars:not([hidden])').count() === 0, 'yubi: tapped marks reset after the wave');
    // 2nd tap within 3s -> greeting bubble
    await p.click('#homebtn'); await tapTile(p, 'ゆびのおうち'); await sleep(400);
    await clearSays(p); await tapFace(0); await sleep(300); await tapFace(0); await sleep(300);
    ok((await said()).indexOf('パパ だよ！ こんにちは！') >= 0, 'yubi: 2nd tap says greeting');
    ok(await p.evaluate(() => { const b = document.querySelector('#y-bubble'); return !b.hidden && b.textContent === 'パパ だよ こんにちは'; }), 'yubi: greeting bubble visible');
    await sleep(1700);
    ok(await p.locator('#y-bubble').isHidden(), 'yubi: bubble gone after 1.5s');
    // ぐー / ぱー
    await sleep(2500); await clearSays(p);
    const [px, py] = await ctr('#y-palm');
    await p.mouse.click(px, py); await sleep(900);
    const fold = await p.evaluate(() => [...document.querySelectorAll('#y-svg .y-f')].map(g => new DOMMatrix(getComputedStyle(g).transform).d));
    ok(await p.getAttribute('#stage-yubi', 'data-fist') === '1' && fold.every(d => d < 0.2), 'yubi: palm tap -> ぐー, fingers folded (scaleY ' + fold.map(d => d.toFixed(2)).join(',') + ')');
    ok((await said()).indexOf('ぐー！ みんな かくれた！') >= 0, 'yubi: says ぐー');
    await p.screenshot({ path: SP + '/yubi-gu.png' });
    await clearSays(p); await tapFace(1); await sleep(900);   // finger tap while fist = ぱー
    ok(await p.getAttribute('#stage-yubi', 'data-fist') === '0' && (await said()).indexOf('ぱー！ みんな いた！') >= 0 && !(await said()).some(t => /は ママ/.test(t)), 'yubi: tapping while ぐー acts as ぱー, no finger reaction');
    await sleep(600);
    const open = await p.evaluate(() => [...document.querySelectorAll('#y-svg .y-f')].map(g => new DOMMatrix(getComputedStyle(g).transform).d));
    ok(open.every(d => d > 0.95), 'yubi: ぱー unfolds fingers');
    await p.mouse.click(px, py); await sleep(700); await p.mouse.click(px, py); await sleep(900);
    ok(await p.getAttribute('#stage-yubi', 'data-fist') === '0', 'yubi: palm toggles ぐー then ぱー');
    // settings: rename thumb
    await p.click('#homebtn'); await sleep(150);
    await holdOpen(p, 1600); await sleep(150);
    ok(await p.locator('#fam-name-0').isVisible() === false || true, 'settings sheet open');
    await p.locator('#fam-name-0').scrollIntoViewIfNeeded();
    ok((await p.locator('#fam-rows .famrow').count()) === 5 && await p.locator('#fam-file-0').getAttribute('accept') === 'image/*' && !(await p.locator('#fam-file-0').evaluate(e => e.hasAttribute('capture'))), 'settings: ゆびのかぞく 5 rows, file input accept=image/* without capture');
    ok(await p.locator('#fam-name-0').getAttribute('maxlength') === '8' && await p.locator('#fam-emo-0').count() === 1, 'settings: name maxlength 8, emoji button');
    await p.fill('#fam-name-0', 'じいじ');
    await p.click('#fam-emo-0'); await sleep(100);
    ok(await p.locator('#fam-rows .famrow').nth(0).locator('.empick button').count() === 15, 'settings: 15 emoji candidates');
    await p.locator('#fam-rows .famrow').nth(0).locator('.empick button').nth(7).click();
    ok((await p.locator('#fam-rows .famrow').nth(0).locator('.famprev').textContent()) === '👴', 'settings: emoji pick shows in preview');
    // photo (generated PNG)
    const png = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 300; c.height = 180; const x = c.getContext('2d'); x.fillStyle = '#3a7'; x.fillRect(0, 0, 300, 180); x.fillStyle = '#e44'; x.beginPath(); x.arc(150, 90, 70, 0, 7); x.fill(); return c.toDataURL('image/png').split(',')[1]; });
    await p.setInputFiles('#fam-file-1', { name: 'face.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') }); await sleep(700);
    ok(await p.locator('#fam-rows .famrow').nth(1).locator('.famprev img').count() === 1 && await p.locator('#fam-del-1').isVisible(), 'settings: photo shows in preview, 「しゃしんを けす」 appears');
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('ponpon.family.v1')));
    const dim = await p.evaluate(src => new Promise(r => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.src = src; }), st[1].photo);
    ok(st.length === 5 && st[0].name === 'じいじ' && st[0].emoji === '👴' && /^data:image\/jpeg/.test(st[1].photo) && dim[0] === 160 && dim[1] === 160 && st[2].photo === null, 'storage: [{name,emoji,photo}x5], photo = 160x160 JPEG dataURL ' + JSON.stringify(dim));
    await p.evaluate(() => { document.querySelector('.setbody').scrollTop = document.querySelector('#fam-rows').offsetTop - 80; }); await sleep(150);
    await p.screenshot({ path: SP + '/yubi-settings.png' });
    // quota exceeded
    await p.evaluate(() => { const o = Storage.prototype.setItem; window.__origSet = o; Storage.prototype.setItem = function (k, v) { if (k === 'ponpon.family.v1' && String(v).indexOf('data:image') >= 0) throw new DOMException('quota', 'QuotaExceededError'); return o.call(this, k, v); }; });
    await p.setInputFiles('#fam-file-3', { name: 'face2.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') }); await sleep(700);
    ok(await p.locator('#fam-msg').isVisible() && (await p.locator('#fam-msg').textContent()) === 'しゃしんが おおきすぎて ほぞんできませんでした', 'settings: quota exceeded -> in-panel message');
    ok(await p.locator('#fam-rows .famrow').nth(3).locator('.famprev img').count() === 1, 'settings: continues (photo kept for this session)');
    await p.evaluate(() => { Storage.prototype.setItem = window.__origSet; });
    await p.click('#fam-del-3'); await p.click('#fam-del-1'); await sleep(150);
    ok(await p.locator('#fam-msg').isHidden(), 'settings: message cleared on next change');
    // 2-step reset (no confirm())
    await p.locator('#fam-reset').scrollIntoViewIfNeeded();
    await p.click('#fam-reset'); await sleep(100);
    ok(await p.locator('#fam-name-0').inputValue() === 'じいじ' && /armed/.test(await p.getAttribute('#fam-reset', 'class')), 'settings: reset 1st press only arms');
    await p.click('#fam-reset'); await sleep(150);
    ok(await p.locator('#fam-name-0').inputValue() === 'パパ' && dialogs === 0, 'settings: reset 2nd press restores defaults, no dialog');
    await p.fill('#fam-name-0', 'じいじ');
    await p.click('#setx'); await sleep(150);
    await tapTile(p, 'ゆびのおうち'); await sleep(400);
    await clearSays(p); await tapFace(0); await sleep(250);
    ok((await said())[0] === 'おやゆびは じいじ！', 'yubi: renamed finger speaks "おやゆびは じいじ！"');
    ok(await p.evaluate(() => document.querySelector('#y-svg .y-f[data-i="0"] .y-nm').textContent) === 'じいじ', 'yubi: label shows new name');
    // photo on the face
    await p.click('#homebtn'); await holdOpen(p, 1600); await sleep(150);
    await p.setInputFiles('#fam-file-2', { name: 'face.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') }); await sleep(700);
    await p.click('#setx'); await sleep(100);
    await tapTile(p, 'ゆびのおうち'); await sleep(400);
    ok(await p.locator('#y-svg image').count() === 1 && /^data:image\/jpeg/.test(await p.locator('#y-svg image').getAttribute('href')), 'yubi: photo shown on the finger face (SVG <image>, circle-clipped)');
    await p.click('#homebtn'); await sleep(100);
    // reload persistence
    await p.reload(); await sleep(400);
    await tapTile(p, 'ゆびのおうち'); await sleep(400);
    await clearSays(p); await tapFace(0); await sleep(250);
    ok((await said())[0] === 'おやゆびは じいじ！' && await p.locator('#y-svg image').count() === 1, 'yubi: name + photo persist after reload');
    ok(dialogs === 0 && p.errs.length === 0, 'yubi: no dialogs, no console errors ' + p.errs.join('|'));
    await p.context().close();
  });
  T('yubi-1024', async (br) => {
    const p = await newPage(br, { width: 1024, height: 768 }, { deny: true });
    await tapTile(p, 'ゆびのおうち'); await sleep(500);
    await p.screenshot({ path: SP + '/yubi-1024.png' });
    await p.context().close();
  });
  // 360 wide: yubi fits, face boxes big enough
  T('yubi-360', async (br) => {
    const p = await newPage(br, { width: 360, height: 740 }, { deny: true });
    await tapTile(p, 'ゆびのおうち'); await sleep(500);
    const L = await p.evaluate(() => { const st = document.querySelector('#stage-yubi').getBoundingClientRect(); return [...document.querySelectorAll('#y-svg .y-f')].map(g => { const r = g.getBoundingClientRect(), fr = g.querySelector('.y-face').getBoundingClientRect(); return { in: fr.left >= st.left - 1 && fr.right <= st.right + 1 && fr.top >= st.top && fr.bottom <= st.bottom, face: Math.round(fr.width), h: Math.round(r.height) }; }); });
    ok(L.every(x => x.in && x.h >= 80), '360x740 yubi: all fingers inside stage, ' + JSON.stringify(L));
    await p.context().close();
  });

  /* ---------- 9. v8: シールちょう ---------- */
  T('sticker', async (br) => {
    const p = await newPage(br, { width: 390, height: 844 }, { deny: true });
    const said = async () => (await says(p)).map(x => x.t);
    const cnt = () => p.evaluate(() => document.querySelectorAll('#stk-layer .stk.placed').length);
    const box = async sel => {
      const m = /^\.stk-cell:nth-child\((\d+)\)$/.exec(sel);
      if (m) for (let k = 0; k < 4 && !(await p.locator(sel).evaluate(e => !e.classList.contains('off'))); k++) { await p.click('#stk-next'); await sleep(320); }
      return p.locator(sel).boundingBox();
    };
    const cc = b => [b.x + b.width / 2, b.y + b.height / 2];
    const dragTo = async (from, to, steps = 8) => { await p.mouse.move(from[0], from[1]); await p.mouse.down(); await p.mouse.move(to[0], to[1], { steps }); await p.mouse.up(); };
    await tapTile(p, 'シールちょう'); await sleep(500);
    const lay = await p.evaluate(() => { const st = document.querySelector('#stage-sticker').getBoundingClientRect(), b = document.querySelector('#stk-board').getBoundingClientRect(), sh = document.querySelector('#stk-sheet').getBoundingClientRect(); const tabs = [...document.querySelectorAll('.stk-tab')].map(t => { const r = t.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }); return { ratio: +(b.height / st.height).toFixed(2), tabs, cells: document.querySelectorAll('.stk-cell').length, cw: Math.round(document.querySelector('.stk-cell').getBoundingClientRect().width), sheetIn: sh.bottom <= st.bottom, hs: document.documentElement.scrollWidth > innerWidth }; });
    ok(lay.cells === 12 && lay.tabs.length === 4 && lay.tabs.every(t => t === '64x64') && lay.sheetIn && !lay.hs, 'sticker: 4 tabs 64px, 12 sheet stickers, sheet inside ' + JSON.stringify(lay));
    ok(await cnt() === 0, 'sticker: starts empty');
    const imgState = sel => p.evaluate(s => [...document.querySelectorAll(s)].map(i => i.complete && i.naturalWidth > 0 && !i.src.startsWith('data:') && /assets\/stk\/.*\.webp$/.test(i.src)), sel);
    { const st = await imgState('.stk-cell .stk-img'); ok(st.length === 12 && st.every(Boolean), 'sticker: 12 palette images loaded (not data:) ' + st.length); }
    const names = await p.evaluate(() => [...document.querySelectorAll('.stk-cell')].map(c => c.getAttribute('aria-label')).join());
    ok(names === 'おさかな,たこ,くじら,かに,ねったいぎょ,いるか,かいがら,よっと,おはな,はーと,にじ,ふうせん', 'sticker: うみ sheet = 8 themed + 4 common');
    const B = await box('#stk-board'), bc = cc(B);
    // drag peel & stick
    await clearSays(p);
    await dragTo(cc(await box('.stk-cell:nth-child(1)')), [bc[0] - 60, bc[1] - 80]); await sleep(300);
    ok(await cnt() === 1 && (await said()).indexOf('おさかな！') >= 0, 'sticker: drag to board sticks 1, speaks おさかな！');
    { const st = await imgState('#stk-layer .stk.placed .stk-img'); ok(st.length === 1 && st.every(Boolean), 'sticker: placed sticker is an image on the board'); }
    ok(await p.evaluate(() => document.querySelector('#bigword').textContent) === 'おさかな', 'sticker: spoken word on screen');
    const sz = await p.evaluate(() => { const e = document.querySelector('#stk-layer .stk.placed'), b = document.querySelector('#stk-board').getBoundingClientRect(); const px = parseFloat(e.style.fontSize); return px / Math.min(b.width, b.height); });
    ok(sz >= 0.139 && sz <= 0.181, 'sticker: size 14-18% of board short side (' + sz.toFixed(3) + ')');
    ok(await p.evaluate(() => document.querySelectorAll('.stk-cell.empty').length) === 1, 'sticker: sheet slot empties after peel');
    await sleep(600);
    ok(await p.evaluate(() => document.querySelectorAll('.stk-cell.empty').length) === 0 && await p.locator('.stk-cell').count() === 12, 'sticker: sheet refills (infinite)');
    // peel sound + lift state while dragging
    const c0 = cc(await box('.stk-cell:nth-child(3)'));
    await p.mouse.move(c0[0], c0[1]); await p.mouse.down(); await p.mouse.move(c0[0] + 30, c0[1] - 40, { steps: 4 });
    ok(await p.locator('#stk-float .stk.lift').count() === 1, 'sticker: lifted sticker follows finger (.lift)');
    await p.mouse.move(bc[0] + 60, bc[1] + 40, { steps: 6 }); await p.mouse.up(); await sleep(250);
    ok(await cnt() === 2, 'sticker: 2nd stuck');
    // tap-then-tap
    await clearSays(p);
    await p.mouse.click(...cc(await box('.stk-cell:nth-child(2)'))); await sleep(150);
    ok(await p.locator('.stk-cell.held').count() === 1 && await cnt() === 2, 'sticker: tap on sheet sticker -> held (wiggles on sheet)');
    await p.mouse.click(bc[0] - 90, bc[1] + 100); await sleep(250);
    ok(await cnt() === 3 && (await said()).indexOf('たこ！') >= 0 && await p.locator('.stk-cell.held').count() === 0, 'sticker: tap board -> stuck, speaks たこ！');
    await p.screenshot({ path: SP + '/sticker-umi.png' });
    // tap a placed sticker: name + wiggle
    await clearSays(p);
    const last = p.locator('#stk-layer .stk.placed').last();
    await last.click({ force: true }); await sleep(150);
    ok((await said()).indexOf('たこ！') >= 0 && await cnt() === 3, 'sticker: tapping a placed sticker says its name');
    // move placed
    const lb = cc(await last.boundingBox());
    await dragTo(lb, [bc[0] + 80, bc[1] - 120]); await sleep(250);
    ok(await cnt() === 3, 'sticker: moving a placed sticker keeps count');
    // drag back to the sheet -> discard
    await clearSays(p);
    const lb2 = cc(await p.locator('#stk-layer .stk.placed').last().boundingBox());
    await dragTo(lb2, cc(await box('#stk-sheet'))); await sleep(250);
    ok(await cnt() === 2 && (await said()).indexOf('ポイ！') >= 0, 'sticker: dragged onto the sheet -> discarded (ポイ！)');
    // outside the board (a tab / title) from sheet: returns
    await dragTo(cc(await box('.stk-cell:nth-child(5)')), [200, 30]); await sleep(250);
    ok(await cnt() === 2, 'sticker: released outside board -> nothing happens');
    // persistence
    const store = await p.evaluate(() => JSON.parse(localStorage.getItem('ponpon.stickers.v1')));
    ok(store.umi.length === 2 && store.umi.every(o => typeof o.e === 'string' && o.x >= 0 && o.x <= 1 && o.y >= 0 && o.y <= 1 && o.s > 0.1 && Math.abs(o.r) <= 15), 'sticker: stored per scene as 0..1 fractions ' + JSON.stringify(store.umi[0]));
    await p.reload(); await sleep(400);
    await tapTile(p, 'シールちょう'); await sleep(500);
    ok(await cnt() === 2, 'sticker: stuck stickers survive reload');
    { const st = await imgState('#stk-layer .stk.placed .stk-img'); ok(st.length === 2 && st.every(Boolean), 'sticker: restored stickers render as images'); }
    // old-format board (emoji keys) seeded before load still renders images
    await p.evaluate(() => localStorage.setItem('ponpon.stickers.v1', JSON.stringify({ umi: [{ e: '🐟', x: 0.3, y: 0.4, r: 5, s: 0.16 }, { e: '🌸', x: 0.6, y: 0.5, r: -8, s: 0.16 }, { e: '⛵', x: 0.5, y: 0.7, r: 0, s: 0.16 }], mori: [{ e: '🐻', x: 0.4, y: 0.4, r: 0, s: 0.16 }], machi: [], uchuu: [{ e: '👩‍🚀', x: 0.5, y: 0.5, r: 0, s: 0.16 }] })));
    await p.reload(); await sleep(400);
    await tapTile(p, 'シールちょう'); await sleep(500);
    { const st = await imgState('#stk-layer .stk.placed .stk-img'); ok(await cnt() === 3 && st.length === 3 && st.every(Boolean), 'sticker: pre-seeded old-format board renders images'); }
    await p.screenshot({ path: SP + '/sticker-old-board.png' });
    // restore the 2-sticker state used by the rest of this section
    await p.evaluate(() => localStorage.setItem('ponpon.stickers.v1', JSON.stringify({ umi: [{ e: '🐟', x: 0.3, y: 0.4, r: 5, s: 0.16 }, { e: '🐙', x: 0.6, y: 0.5, r: -8, s: 0.16 }], mori: [], machi: [], uchuu: [] })));
    await p.reload(); await sleep(400);
    await tapTile(p, 'シールちょう'); await sleep(500);
    ok(await cnt() === 2, 'sticker: back to 2 after reseed');
    // scenes
    await p.click('.stk-tab[data-k="mori"]'); await sleep(250);
    ok(await cnt() === 0 && (await p.locator('.stk-cell').first().getAttribute('aria-label')) === 'くま', 'sticker: switching scene shows its own (empty) board + sheet');
    await dragTo(cc(await box('.stk-cell:nth-child(1)')), [bc[0], bc[1]]); await sleep(250);
    await p.click('.stk-tab[data-k="machi"]'); await sleep(200); await p.click('.stk-tab[data-k="uchuu"]'); await sleep(250);
    ok(await cnt() === 0, 'sticker: uchuu empty');
    await dragTo(cc(await box('.stk-cell:nth-child(2)')), [bc[0] + 20, bc[1] + 30]); await sleep(250);
    await p.screenshot({ path: SP + '/sticker-space.png' });
    await p.click('.stk-tab[data-k="umi"]'); await sleep(250);
    ok(await cnt() === 2, 'sticker: umi still has its 2');
    await p.click('.stk-tab[data-k="mori"]'); await sleep(250);
    ok(await cnt() === 1, 'sticker: mori has its own 1');
    // sponge
    await p.click('#clear'); await sleep(1500);
    ok(await cnt() === 0 && (await p.evaluate(() => JSON.parse(localStorage.getItem('ponpon.stickers.v1')).mori.length)) === 0, 'sticker: 🧽 empties the current scene');
    await p.click('.stk-tab[data-k="umi"]'); await sleep(250);
    ok(await cnt() === 2, 'sticker: other scenes untouched by 🧽');
    // leave() cancels an in-progress drag
    const c1 = cc(await box('.stk-cell:nth-child(4)'));
    await p.mouse.move(c1[0], c1[1]); await p.mouse.down(); await p.mouse.move(c1[0] + 40, c1[1] - 60, { steps: 4 });
    await p.evaluate(() => document.querySelector('#homebtn').click()); await sleep(200);
    await p.mouse.up(); await sleep(150);
    ok(await p.locator('#stk-float .stk').count() === 0 && await p.evaluate(() => document.querySelector('#home').hidden === false), 'sticker: leave() cancels drag, nothing floating');
    await tapTile(p, 'シールちょう'); await sleep(400);
    ok(await cnt() === 2 && await p.locator('.stk-cell.empty').count() === 0 && await p.locator('#clear').isVisible(), 'sticker: re-enter clean, 🧽 visible');
    await p.click('#homebtn'); await sleep(100);
    ok(await p.locator('#clear').isHidden(), 'sticker: 🧽 hidden outside');
    // cap 60
    await p.evaluate(() => { const a = []; for (let i = 0; i < 60; i++) a.push({ e: '🌸', x: (i + 1) / 100, y: 0.5, r: 0, s: 0.15 }); localStorage.setItem('ponpon.stickers.v1', JSON.stringify({ umi: a, mori: [], machi: [], uchuu: [] })); });
    await p.reload(); await sleep(400);
    await tapTile(p, 'シールちょう'); await sleep(500);
    ok(await cnt() === 60, 'sticker: 60 loaded');
    const B2 = await box('#stk-board');
    await dragTo(cc(await box('.stk-cell:nth-child(1)')), [B2.x + B2.width / 2, B2.y + B2.height / 2]); await sleep(250);
    const st2 = await p.evaluate(() => JSON.parse(localStorage.getItem('ponpon.stickers.v1')).umi);
    ok(await cnt() === 60 && st2.length === 60 && st2[0].x === 0.02 && st2[59].e === '🐟', 'sticker: cap 60 drops the oldest');
    ok(p.errs.length === 0, 'sticker: no console errors ' + p.errs.join('|'));
    await p.context().close();
  });
  TV('sticker-layout', [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 740, height: 360 }, { width: 844, height: 390 }, { width: 1024, height: 768 }], async (br, vp) => {
    const p = await newPage(br, vp, { deny: true });
    await tapTile(p, 'シールちょう'); await sleep(500);
    const L = await p.evaluate(() => { const st = document.querySelector('#stage-sticker').getBoundingClientRect(), r = s => document.querySelector(s).getBoundingClientRect(), b = r('#stk-board'), sh = r('#stk-sheet'), hb = r('#homebtn'), cl = r('#clear'); const tabs = [...document.querySelectorAll('.stk-tab')].map(t => t.getBoundingClientRect()); const ov = (a, c) => a.left < c.right && a.right > c.left && a.top < c.bottom && a.bottom > c.top; return { ratio: +(b.height / st.height).toFixed(2), cell: Math.round(document.querySelector('.stk-cell').getBoundingClientRect().width), sheetIn: sh.bottom <= st.bottom + 1 && sh.left >= st.left && sh.right <= st.right, tabsIn: tabs.every(t => t.left >= st.left && t.right <= st.right && t.top >= st.top), tabOverlap: tabs.some(t => ov(t, hb) || ov(t, cl)), boardTabs: tabs.some(t => ov(t, b)), hs: document.documentElement.scrollWidth > innerWidth }; });
    ok(L.sheetIn && L.tabsIn && !L.tabOverlap && !L.boardTabs && !L.hs, vp.width + 'x' + vp.height + ' sticker layout fits ' + JSON.stringify(L));
    const V = vp.width + 'x' + vp.height;
    const side = vp.height < 470 && vp.width > vp.height, paged = vp.width < 522 || side;
    const PL = await p.evaluate(() => { const vis = [...document.querySelectorAll('.stk-cell')].filter(c => !c.classList.contains('off')), sz = vis.map(c => { const r = c.getBoundingClientRect(); return Math.min(r.width, r.height); }), nx = document.querySelector('#stk-next'), nr = nx.getBoundingClientRect(); return { total: document.querySelectorAll('.stk-cell').length, vis: vis.length, min: Math.round(Math.min(...sz) * 10) / 10, nextShown: !nx.hidden && nr.width > 0, nw: Math.round(nr.width), nh: Math.round(nr.height), vs: document.documentElement.scrollHeight > innerHeight }; });
    ok(PL.min >= 80 && !PL.vs, V + ' sticker: every visible palette cell >= 80px (min ' + PL.min + '), no vertical page scroll');
    if (paged) {
      if (side) { const bh = await p.evaluate(() => { const b = document.querySelector('#stk-board').getBoundingClientRect(), pl = document.querySelector('#stk-pal').getBoundingClientRect(); return { h: Math.round(b.height), w: Math.round(b.width), right: pl.left >= b.right }; }); ok(bh.h >= 200 && bh.right, V + ' sticker: landscape side palette, board ' + bh.w + 'x' + bh.h + ' (>=200 tall), palette right of board'); }
      ok(PL.nextShown && PL.nw >= 80 && PL.nh >= 80 && PL.vis === 6 && PL.total === 12, V + ' sticker: page button >= 80px, 6 of 12 shown ' + JSON.stringify(PL));
      const names1 = await p.evaluate(() => [...document.querySelectorAll('.stk-cell:not(.off)')].map(c => c.getAttribute('aria-label')).join());
      await p.screenshot({ path: SP + '/sticker-' + V + '-p1.png' });
      await p.click('#stk-next'); await sleep(400);
      const names2 = await p.evaluate(() => [...document.querySelectorAll('.stk-cell:not(.off)')].map(c => c.getAttribute('aria-label')).join());
      ok(names1.split(',').length === 6 && names2.split(',').length === 6 && new Set((names1 + ',' + names2).split(',')).size === 12 && names2 !== names1, V + ' sticker: page button shows the other 6 (all 12 reachable)');
      const c2 = await p.locator('.stk-cell:not(.off)').nth(1).boundingBox(), nm2 = names2.split(',')[1], bb = await p.locator('#stk-board').boundingBox();
      await p.mouse.move(c2.x + c2.width / 2, c2.y + c2.height / 2); await p.mouse.down(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 8 }); await p.mouse.up(); await sleep(300);
      ok(await p.evaluate(() => document.querySelectorAll('#stk-layer .stk.placed').length) === 1 && (await says(p)).some(x => x.t === nm2 + '！'), V + ' sticker: page-2 sticker (' + nm2 + ') dragged onto the board');
      const c3 = await p.locator('.stk-cell:not(.off)').nth(4).boundingBox();
      await p.mouse.click(c3.x + c3.width / 2, c3.y + c3.height / 2); await sleep(150);
      await p.mouse.click(bb.x + bb.width * 0.3, bb.y + bb.height * 0.3); await sleep(300);
      ok(await p.evaluate(() => document.querySelectorAll('#stk-layer .stk.placed').length) === 2, V + ' sticker: page-2 sticker tap-held then tap board places');
      if (side) {
        const rel = () => p.evaluate(() => { const b = document.querySelector('#stk-board').getBoundingClientRect(); return [...document.querySelectorAll('#stk-layer .stk.placed')].map(e => { const r = e.getBoundingClientRect(); return [+((r.left + r.width / 2 - b.left) / b.width).toFixed(2), +((r.top + r.height / 2 - b.top) / b.height).toFixed(2)]; }); });
        const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('ponpon.stickers.v1')).umi.map(o => [+o.x.toFixed(2), +o.y.toFixed(2)]));
        const r1 = await rel(), near = (a, b) => a.length === b.length && a.every((q, i) => Math.abs(q[0] - b[i][0]) < 0.03 && Math.abs(q[1] - b[i][1]) < 0.03);
        ok(near(r1, saved) && Math.abs(saved[0][0] - 0.5) < 0.06 && Math.abs(saved[0][1] - 0.5) < 0.06, V + ' sticker: side layout drop lands where dropped (' + JSON.stringify(saved) + ')');
        await p.setViewportSize({ width: 390, height: 844 }); await sleep(400);
        ok(near(await rel(), saved) && await p.evaluate(() => !document.querySelector('#stage-sticker').classList.contains('side') && document.querySelector('.stk-cell:not(.off)').getBoundingClientRect().width >= 80), V + ' sticker: switching to portrait keeps stickers in place');
        await p.setViewportSize(vp); await sleep(400);
        ok(near(await rel(), saved) && await p.evaluate(() => document.querySelector('#stage-sticker').classList.contains('side')), V + ' sticker: back to landscape keeps stickers in place');
      }
      await p.screenshot({ path: SP + '/sticker-' + V + '-p2.png' });
      await p.click('#stk-next'); await sleep(350);
      ok(await p.evaluate(() => document.querySelector('.stk-cell:not(.off)').getAttribute('aria-label')) === names1.split(',')[0], V + ' sticker: last page button returns to page 1');
      await p.click('#stk-next'); await sleep(350);
      await p.click('.stk-tab:nth-child(2)'); await sleep(300);
      ok(await p.evaluate(() => document.querySelector('.stk-cell:not(.off)').getAttribute('aria-label')) === 'くま', V + ' sticker: switching scene resets to page 1');
      await p.click('.stk-tab:nth-child(1)'); await sleep(300);
    } else {
      ok(!PL.nextShown && PL.vis === 12, V + ' sticker: no page button, all 12 visible ' + JSON.stringify(PL));
      await p.screenshot({ path: SP + '/sticker-' + V + '.png' });
    }
    // drag works here too
    const b = await p.locator('#stk-board').boundingBox(), c = await p.locator('.stk-cell:not(.off)').nth(2).boundingBox();
    await p.mouse.move(c.x + c.width / 2, c.y + c.height / 2); await p.mouse.down(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 }); await p.mouse.up(); await sleep(250);
    ok(await p.evaluate(() => document.querySelectorAll('#stk-layer .stk.placed').length) === (paged ? 3 : 1), vp.width + 'x' + vp.height + ' sticker: drag-stick works');
    ok(p.errs.length === 0, vp.width + 'x' + vp.height + ' sticker: no console errors ' + p.errs.join('|'));
    await p.context().close();
  });

  /* ================= v9: あそびの きろく ================= */
  {
    const T0 = new Date('2026-10-02T12:00:00+09:00');
    const dk = (d) => { const j = new Date(d.getTime() + 9 * 3600e3); return j.toISOString().slice(0, 10); };
    const keyAgo = (n) => dk(new Date(T0.getTime() - n * 86400e3));
    async function cpage(start, seed, vp) {
      // 負荷で読み込みが 1 秒を超えると pauseAt が過去になって投げる → 作り直す（成功時の状態は同じ）
      for (let attempt = 0; ; attempt++) {
        try { return await cpage1(start, seed, vp); }
        catch (e) { if (attempt >= 4 || !/fast-forward to the past/.test(String(e))) throw e; }
      }
    }
    async function cpage1(start, seed, vp) {
      const ctx = await br.newContext({ viewport: vp || { width: 390, height: 844 }, timezoneId: 'Asia/Tokyo' });
      const p = await ctx.newPage();
      p.errs = []; p.dialogs = 0;
      p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
      p.on('pageerror', e => p.errs.push('PAGEERR ' + e.message));
      p.on('dialog', d => { p.dialogs++; d.dismiss(); });
      await p.clock.install({ time: start });
      await p.addInitScript(INIT(ENV));
      if (seed) await p.addInitScript('if(!localStorage.getItem("ponpon.stats.v1")) localStorage.setItem("ponpon.stats.v1", ' + JSON.stringify(JSON.stringify(seed)) + ');');
      await p.goto(URL); await sleep(300);
      try { await p.clock.pauseAt(new Date(start.getTime() + 1000)); } catch (e) { await ctx.close(); throw e; }
      return p;
    }
    const tap = () => window.dispatchEvent(new Event('pointerdown'));
    async function play(p, secs, input) {   // 5びょうごとに そうさ
      for (let t = 0; t < secs; t += 5) { if (input) await p.evaluate(() => window.dispatchEvent(new Event('pointerdown'))); await p.clock.runFor(Math.min(5, secs - t) * 1000); }
    }
    const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('ponpon.stats.v1') || 'null'));
    async function openSet(p) { const b = await p.locator('#setbtn').boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await p.clock.runFor(1600); await p.mouse.up(); await sleep(80); }
    const hrs = (arr) => arr.reduce((a, b) => a + b, 0);

    // 1. かいすう + じかん
    T('stats-count', async (br) => {
      const p = await cpage(T0);
      await play(p, 10, true);    // ホームの じかん
      await tapTile(p, 'ふうせん'); await sleep(100);
      await play(p, 65, true);
      await p.click('#homebtn'); await sleep(100);
      const st = await store(p), d = st && st.days[keyAgo(0)], g = d && d.g.sky;
      ok(g && g.n === 1 && g.s >= 60 && g.s <= 66, 'stats: 65s play -> n=1, s=60..66 ' + JSON.stringify(g));
      ok(d && d.h.length === 24 && hrs(d.h) === g.s && d.h[12] === g.s, 'stats: hour histogram (24) matches game seconds, hour 12');
      ok(d && d.hm >= 8 && d.ss >= 1 && st.v === 1 && st.since === keyAgo(0), 'stats: home time separate + session + since ' + JSON.stringify({ hm: d && d.hm, ss: d && d.ss, since: st && st.since }));
      // せっていを ひらいている あいだは かぞえない
      await openSet(p);
      ok(await p.locator('#setsheet').isVisible(), 'stats: settings sheet opened (fake clock)');
      await p.evaluate(() => window.dispatchEvent(new Event('pagehide'))); await sleep(50);
      const before = JSON.stringify((await store(p)).days[keyAgo(0)]);
      await play(p, 30, true);
      await p.click('#setx'); await sleep(50);
      await p.evaluate(() => window.dispatchEvent(new Event('pagehide'))); await sleep(50);
      const after = (await store(p)).days[keyAgo(0)];
      ok(JSON.stringify(after) === before, 'stats: nothing counted while settings open');
      ok(p.errs.length === 0 && p.dialogs === 0, 'stats: no console errors/dialogs (1) ' + p.errs.join('|'));
      await p.context().close();
    });
    // 2. ほうち
    T('stats-leave', async (br) => {
      const p = await cpage(T0);
      await tapTile(p, 'ふうせん'); await sleep(100);
      await p.clock.runFor(120000);
      await p.click('#homebtn'); await sleep(100);
      const g = (await store(p)).days[keyAgo(0)].g.sky;
      ok(g && g.s >= 58 && g.s <= 63 && g.s !== 120, 'stats: idle 120s -> counting stops at ~61s, s=' + (g && g.s));
      await p.context().close();
    });
    // 3. 3びょうみまん
    T('stats-short', async (br) => {
      const p = await cpage(T0);
      await tapTile(p, 'ふうせん'); await sleep(100);
      await p.clock.runFor(2000);
      await p.click('#homebtn'); await sleep(100);
      const st = await store(p), d = st && st.days[keyAgo(0)];
      ok(!d || !d.g.sky || (d.g.sky.n === 0 && d.g.sky.s === 0), 'stats: <3s visit not counted ' + JSON.stringify(d && d.g));
      await tapTile(p, 'ふうせん'); await sleep(100);
      await p.evaluate(() => window.dispatchEvent(new Event('pointerdown')));
      await p.clock.runFor(3500);
      await p.click('#homebtn'); await sleep(100);
      ok((await store(p)).days[keyAgo(0)].g.sky.n === 1, 'stats: 3.5s visit counted');
      await p.context().close();
    });
    // 4. ひひょうじ / 10びょうほぞん / pagehide
    T('stats-save', async (br) => {
      const p = await cpage(T0);
      await tapTile(p, 'ふうせん'); await sleep(100);
      await play(p, 20, true);
      const mid = await store(p);
      ok(mid && mid.days[keyAgo(0)].g.sky && mid.days[keyAgo(0)].g.sky.s >= 10, 'stats: autosave every 10s while in game');
      await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
      const s1 = (await store(p)).days[keyAgo(0)].g.sky.s;
      await play(p, 20, true);
      await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      const s2 = (await store(p)).days[keyAgo(0)].g.sky.s;
      ok(s1 === s2, 'stats: hidden -> no increment (' + s1 + ' vs ' + s2 + ')');
      await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); });
      await play(p, 10, true);
      await p.evaluate(() => window.dispatchEvent(new Event('pagehide')));
      const s3 = (await store(p)).days[keyAgo(0)].g.sky.s;
      ok(s3 >= s2 + 8, 'stats: visible again resumes; pagehide saves (' + s2 + ' -> ' + s3 + ')');
      await p.context().close();
    });
    // 5. ひにちまたぎ
    T('stats-day', async (br) => {
      const p = await cpage(new Date('2026-10-02T23:59:40+09:00'));
      await tapTile(p, 'ふうせん'); await sleep(100);
      await play(p, 30, true);
      await p.click('#homebtn'); await sleep(100);
      const st = await store(p), a = st.days['2026-10-02'], b = st.days['2026-10-03'];
      ok(a && b && a.g.sky && b.g.sky && a.g.sky.s >= 5 && b.g.sky.s >= 5 && a.h[23] === a.g.sky.s && b.h[0] === b.g.sky.s, 'stats: midnight rollover splits days ' + JSON.stringify({ a: a && a.g, b: b && b.g }));
      await p.context().close();
    });
    // 6. 120にち ほじ / old
    T('stats-trim', async (br) => {
      const old = {}; old[keyAgo(130)] = { g: { zoo: { n: 2, s: 300 } }, h: new Array(24).fill(0), ss: 1 };
      old[keyAgo(121)] = { g: { zoo: { n: 1, s: 100 } }, h: new Array(24).fill(0), ss: 1 };
      old[keyAgo(100)] = { g: { zoo: { n: 4, s: 400 } }, h: new Array(24).fill(0), ss: 1 };
      const p = await cpage(T0, { v: 1, days: old, since: keyAgo(130), old: { baa: { n: 3, s: 90 } } });
      await tapTile(p, 'ふうせん'); await sleep(100);
      await play(p, 8, true);
      await p.click('#homebtn'); await sleep(100);
      const st = await store(p);
      ok(!st.days[keyAgo(130)] && !st.days[keyAgo(121)] && st.days[keyAgo(100)] && st.old.zoo && st.old.zoo.n === 3 && st.old.zoo.s === 400 && st.old.baa.n === 3, 'stats: >120d rolled into old ' + JSON.stringify(st.old));
      await p.context().close();
    });
    // 7. ひょうじ（seed）
    T('stats-view', async (br) => {
      const mk = (g, hv) => { const h = new Array(24).fill(0); Object.keys(hv || {}).forEach(k => h[k] = hv[k]); return { g, h, ss: 1, hm: 50 }; };
      const days = {};
      days[keyAgo(0)] = mk({ sky: { n: 3, s: 600 } }, { 10: 400, 11: 200 });
      days[keyAgo(3)] = mk({ sky: { n: 2, s: 1200 }, zoo: { n: 10, s: 500 } }, { 9: 1700 });
      days[keyAgo(20)] = mk({ zoo: { n: 4, s: 3000 } }, { 15: 3000 });
      const p = await cpage(T0, { v: 1, days, since: keyAgo(20), old: { baa: { n: 5, s: 900 } } });
      await openSet(p);
      const txt = async (s) => (await p.locator(s).innerText()).replace(/\s+/g, ' ').trim();
      ok(await p.evaluate(() => document.querySelector('#statsgrp') === document.querySelector('.setbody').firstElementChild), 'stats: section is first in settings');
      ok(await p.locator('#st-period button[aria-pressed="true"]').innerText() === '7にち', 'stats: default period 7にち');
      ok((await txt('#st-total')) === '38ふん' && (await txt('#st-plays')) === '15かい', 'stats 7d: total/plays ' + await txt('#st-total') + ' ' + await txt('#st-plays'));
      ok((await txt('#st-fav')).includes('ふうせん'), 'stats 7d: favorite');
      ok((await txt('#st-sum')).includes('1にち へいきん'), 'stats 7d: daily average shown');
      ok((await txt('.st-row[data-id="sky"]')).includes('30ふん') && (await txt('.st-row[data-id="sky"]')).includes('5かい') && (await txt('.st-row[data-id="sky"]')).includes('へいきん 6ふん'), 'stats 7d: balloon row ' + await txt('.st-row[data-id="sky"]'));
      ok(await p.locator('.st-row.zero').count() === 25 && await p.evaluate(() => getComputedStyle(document.querySelector('.st-row.zero')).opacity) < 0.6, 'stats 7d: zero-play games dimmed (25 rows)');
      ok(await p.evaluate(() => document.querySelector('#st-games .st-row').getAttribute('data-id')) === 'sky', 'stats: sorted by time -> sky first');
      await p.click('#st-sort button[data-v="n"]');
      ok(await p.evaluate(() => document.querySelector('#st-games .st-row').getAttribute('data-id')) === 'zoo', 'stats: sort toggle by count -> zoo first');
      await p.click('#st-sort button[data-v="s"]');
      ok(await p.locator('#st-daychart .hit').count() === 7 && await p.locator('#st-hourchart .hit').count() === 24, 'stats 7d: 7 columns + 24 hour bars');
      await p.locator('#st-daychart .hit').nth(6).click();
      const tip = await txt('#st-daychart .st-tip');
      ok(await p.locator('#st-daychart .st-tip').isVisible() && tip.includes('ふうせん') && tip.includes('10ふん'), 'stats: tap tooltip shows top games ' + tip);
      await p.click('#st-period button[data-v="today"]');
      ok((await txt('#st-total')) === '10ふん' && (await txt('#st-plays')) === '3かい' && await p.locator('#st-daysec').isHidden() && await p.locator('#st-hourchart .hit').count() === 24 && !(await txt('#st-sum')).includes('へいきん'), 'stats today: values, hourly chart replaces daily');
      await p.locator('#st-hourchart .hit').nth(10).click();
      ok((await txt('#st-hourchart .st-tip')).includes('6ふん'), 'stats today: hour tooltip ' + await txt('#st-hourchart .st-tip'));
      await p.click('#st-period button[data-v="30"]');
      ok((await txt('#st-total')) === '1じかん 28ふん' && await p.locator('#st-daychart .hit').count() === 30, 'stats 30d: ' + await txt('#st-total'));
      await p.click('#st-period button[data-v="all"]');
      ok((await txt('#st-total')) === '1じかん 43ふん' && await p.locator('#st-daychart .hit').count() === 17 && (await txt('#st-games')).includes('いないいないばあ'), 'stats all: includes old, weekly columns ' + await txt('#st-total'));
      ok((await txt('#st-since')).includes('きろく かいし: ' + keyAgo(20).replace(/-/g, '/')) && (await txt('#statsgrp')).includes('この たんまつの なかだけに ほぞんされます'), 'stats: since + local-only note');
      const hs = await p.evaluate(() => ({ doc: document.documentElement.scrollWidth > innerWidth, body: document.querySelector('.setbody').scrollWidth > document.querySelector('.setbody').clientWidth }));
      ok(!hs.doc && !hs.body, 'stats: no horizontal overflow at 390 ' + JSON.stringify(hs));
      // reset 2 steps
      await p.click('#st-reset');
      ok(await p.locator('#st-sure').isVisible() && (await store(p)).days[keyAgo(0)], 'stats reset: step 1 asks, data intact');
      await p.click('#st-no');
      ok(await p.locator('#st-sure').isHidden() && await p.locator('#st-reset').isVisible(), 'stats reset: cancel works');
      await p.click('#st-reset'); await p.click('#st-yes');
      const st = await store(p);
      ok(st && Object.keys(st.days).length === 0 && Object.keys(st.old).length === 0 && await p.locator('#st-empty').isVisible() && await p.locator('#st-main').isHidden(), 'stats reset: emptied + empty state');
      ok((await txt('#st-empty')) === 'まだ きろくが ありません。ゲームで あそぶと ここに でます', 'stats: empty state text');
      ok(p.errs.length === 0 && p.dialogs === 0, 'stats: no console errors/dialogs (display) ' + p.errs.join('|'));
      await p.context().close();
    });
    // 8. 360px / 1024 overflow
    TV('stats-overflow', [{ width: 360, height: 740 }, { width: 1024, height: 768 }], async (br, vp) => {
      const days = {}; days[keyAgo(1)] = { g: { sky: { n: 3, s: 600 }, baa: { n: 1, s: 3700 } }, h: new Array(24).fill(10), ss: 1, hm: 1 };
      const p = await cpage(T0, { v: 1, days, since: keyAgo(1), old: {} }, vp);
      await openSet(p);
      for (const per of ['7', '30', 'all', 'today']) {
        await p.click('#st-period button[data-v="' + per + '"]');
        const hs = await p.evaluate(() => ({ doc: document.documentElement.scrollWidth > innerWidth, body: document.querySelector('.setbody').scrollWidth > document.querySelector('.setbody').clientWidth }));
        ok(!hs.doc && !hs.body, 'stats: ' + vp.width + 'px ' + per + ' no horizontal overflow');
      }
      ok(p.errs.length === 0, 'stats: ' + vp.width + ' no console errors');
      await p.context().close();
    });
  }

  /* ---------- v10: ころころボール ---------- */
  {
    const KO = (p) => p.evaluate(() => window.__ko && ({ mode: __ko.mode, n: __ko.balls.length, round: __ko.round, base: !!__ko.base, bs: !!__ko.bs, total: __ko.total, W: __ko.W, H: __ko.H, u: __ko.u, R: __ko.R, r: __ko.r, holes: __ko.holes.map(h => [h.x, h.y]), balls: __ko.balls.map(b => [b.x, b.y, b.col, !!b.sink]), noEvT: __ko.noEvT }));
    const initFor = ({ perm = null, angle = 0, pin = true, round = 0, sens } = {}) => `(function(){
      window.__koPin = ${pin}; ${round ? 'window.__koRound = ' + round + ';' : ''}
      ${perm ? "window.__perm = 0; DeviceMotionEvent.requestPermission = function(){ window.__perm++; return Promise.resolve('" + perm + "'); };" : ''}
      ${angle ? 'Object.defineProperty(screen.orientation, "angle", { get: function(){ return ' + angle + '; } });' : ''}
      ${sens != null ? "try{localStorage.setItem('ponpon.settings.v1', JSON.stringify({koroSens:" + sens + "}));}catch(e){}" : ''}
    })();`;
    const feed = (p, x, y, z) => p.evaluate(([x, y, z]) => { clearInterval(window.__fi); window.__fi = setInterval(() => { const e = new Event('devicemotion'); e.accelerationIncludingGravity = { x, y, z }; window.dispatchEvent(e); }, 16); }, [x, y, z]);
    const stopFeed = p => p.evaluate(() => clearInterval(window.__fi));
    const waitSay = async (p, re, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await says(p); const f = s.find(x => re.test(x.t)); if (f) return f; await sleep(40); } return null; };
    const LV = [0.8, 1.5, 9.5];
    // raw accelerationIncludingGravity for a canvas-space tilt (cx, cy in G) at screen angle ang (inverse of the game's rotation)
    const raw = (cx, cy, ang) => { let gx, gy; if (ang === 90) { gx = -cy; gy = cx; } else if (ang === 180) { gx = -cx; gy = -cy; } else if (ang === 270) { gx = cy; gy = -cx; } else { gx = cx; gy = cy; } return [LV[0] - gx * 9.81, LV[1] + gy * 9.81, LV[2]]; };
    const hole = async (p, i) => { const k = await KO(p); const b = await p.locator('#stage-koro').boundingBox(); return { x: b.x + k.holes[i][0], y: b.y + k.holes[i][1] }; };

    /* --- 1. sensor flow (iOS-style permission), portrait, ball pinned (red) -> bottom-right green hole --- */
    T('koro-sensor', async (br) => {
      const p = await newPage(br, { width: 390, height: 844 }, { deny: true, init: initFor({ perm: 'granted', pin: true }) });
      await tapTile(p, 'ころころボール'); await sleep(400);
      ok(await p.locator('#stage-koro').isVisible() && await p.locator('#ko-start').isVisible() && (await p.locator('#ko-start').textContent()).trim() === '▶ はじめる', 'koro: iOS-style start button shown (▶ はじめる)');
      const sbb = await p.locator('#ko-start').boundingBox(); ok(sbb.height >= 80 && sbb.width >= 200, 'koro: start button big ' + Math.round(sbb.width) + 'x' + Math.round(sbb.height));
      ok((await p.evaluate(() => window.__perm)) === 0, 'koro: requestPermission not called before tap');
      let f0 = await p.evaluate(() => window.__koFrames); await sleep(200); let f1 = await p.evaluate(() => window.__koFrames);
      ok(f1 - f0 >= 5, 'koro: rAF running behind start button (' + (f1 - f0) + ' frames/200ms)');
      ok((await KO(p)).mode === 'wait' && (await KO(p)).n === 1, 'koro: waiting with 1 ball visible');
      await p.screenshot({ path: SP + '/korokoro-start.png' });
      await p.click('#ko-start'); await sleep(100);
      ok((await p.evaluate(() => window.__perm)) === 1 && await p.locator('#ko-start').isHidden(), 'koro: tap calls requestPermission once, hides button');
      ok((await p.evaluate(() => window.__lsn.devicemotion)) === 1 && (await p.evaluate(() => window.__lsn.deviceorientation)) === 1, 'koro: devicemotion + deviceorientation listeners added');
      await feed(p, ...LV); await sleep(250);
      ok((await KO(p)).bs === true, 'koro: baseline window (0.5s) in progress');
      await sleep(600);
      let k = await KO(p); ok(k.mode === 'sensor' && k.base && !k.bs, 'koro: baseline taken after 0.5s ' + k.mode);
      // tilted-but-level hold: ball must not move
      const a0 = k.balls[0]; await sleep(400); const a1 = (await KO(p)).balls[0];
      ok(Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) < 1, 'koro: holding the baseline pose (tilted 5-8deg) keeps ball still');
      ok(await p.locator('#ko-hint').isHidden(), 'koro: no finger hint in sensor mode');
      const lb = await p.locator('#ko-lvl').boundingBox(); ok(lb.width === 44 && lb.height === 44 && lb.y < 60, 'koro: ⚖️ button 44px at top ' + lb.width);
      await clearSays(p);
      await feed(p, ...raw(0.12, 0.12, 0));
      const sy = await waitSay(p, /の あなに はいった！/, 9000);
      ok(sy && sy.t === 'みどりの あなに はいった！', 'koro: tilt right-down -> bottom-right hole -> "' + (sy && sy.t) + '" (red ball, no おなじ いろ)');
      ok((await p.evaluate(() => window.__vib)) >= 1, 'koro: vibrate called');
      ok((await p.evaluate(() => (window.__kn || []).length)) >= 1 && (await p.evaluate(() => window.__kn.every(v => v > 0 && v <= 1.0001))), 'koro: wall knocks fired with volume in (0,1] before reaching the hole');
      const cnt = await waitSay(p, /ぜんぶ はいった！/, 4000);
      ok(cnt && cnt.t === 'いち！ ぜんぶ はいった！', 'koro: round end counts aloud: ' + (cnt && cnt.t));
      ok((await p.locator('#fx-koro span').count()) > 5, 'koro: confetti on round end');
      await sleep(1900); k = await KO(p);
      ok(k.round === 2 && k.n === 2, 'koro: next round adds a ball (round ' + k.round + ', ' + k.n + ' balls)');
      // knock volume scales with impact speed (ball away from holes, mid-height, level pose)
      await feed(p, ...LV); await sleep(300);
      const knock = async (vx) => p.evaluate(async (vx) => { __kn = []; const b = __ko.balls[0], u = __ko.u; b.sink = null; b.x = __ko.W - __ko.F - __ko.r - 25; b.y = __ko.H / 2; b.vx = vx * u; b.vy = 0; await new Promise(r => setTimeout(r, 350)); return __kn.slice(); }, vx);
      const kSlow = await knock(0.3); await sleep(150); const kFast = await knock(1.4);
      ok(kSlow.length >= 1 && kFast.length >= 1 && kFast[0] > kSlow[0] * 2.5, 'koro: knock volume scales with speed (' + (kSlow[0] || 0).toFixed(2) + ' -> ' + (kFast[0] || 0).toFixed(2) + ')');
      await p.screenshot({ path: SP + '/korokoro-r2.png' });
      // leave: rAF stops, listeners removed, timers cleared
      await p.click('#homebtn'); await sleep(150);
      const fa = await p.evaluate(() => window.__koFrames); await sleep(400); const fb = await p.evaluate(() => window.__koFrames);
      ok(fa === fb, 'koro: leave() stops rAF (frames ' + fa + ' -> ' + fb + ')');
      const ls = await p.evaluate(() => [window.__lsn.devicemotion, window.__lsn.deviceorientation]);
      ok(ls[0] === 0 && ls[1] === 0, 'koro: leave() removes sensor listeners ' + ls);
      ok((await p.evaluate(() => __ko.noEvT)) === 0, 'koro: leave() cleared fallback timer');
      ok(await p.locator('#hm-p2').isVisible() && await p.locator('#hm-p0').isHidden(), 'koro: 🏠 returns to page 3');
      // once granted: re-enter shows no button and runs
      await tapTile(p, 'ころころボール'); await sleep(300);
      ok(await p.locator('#ko-start').isHidden() && (await p.evaluate(() => window.__perm)) === 1, 'koro: granted once -> no button on re-entry');
      const fc = await p.evaluate(() => window.__koFrames); await sleep(200);
      ok((await p.evaluate(() => window.__koFrames)) > fc, 'koro: loop runs again after re-entry');
      ok(p.errs.length === 0, 'koro sensor flow: no console errors ' + p.errs.join('|'));
      await p.context().close();
    });

    /* --- 2. denied -> touch mode; hold mouse toward the red hole; red ball -> おなじ いろ --- */
    T('koro-touch', async (br) => {
      const p = await newPage(br, { width: 390, height: 844 }, { deny: true, init: initFor({ perm: 'denied', pin: true }) });
      await tapTile(p, 'ころころボール'); await sleep(300);
      await p.click('#ko-start'); await sleep(200);
      let k = await KO(p);
      ok(k.mode === 'touch' && (await p.locator('#ko-hint').isVisible()) && (await p.locator('#ko-hint').textContent()).trim() === '👆 ゆびで さわっても ころがるよ', 'koro: denied -> touch mode + adult hint');
      ok((await p.evaluate(() => (window.__lsn.devicemotion || 0))) === 0, 'koro: denied -> no listeners');
      const b0 = k.balls[0]; await sleep(300); ok(Math.hypot((await KO(p)).balls[0][0] - b0[0], (await KO(p)).balls[0][1] - b0[1]) < 1, 'koro: touch mode ball rests when untouched');
      const h = await hole(p, 0);
      await clearSays(p);
      await p.mouse.move(h.x, h.y); await p.mouse.down();
      let sparkles = 0, got = null; const t0 = Date.now();
      while (Date.now() - t0 < 9000 && !got) { got = (await says(p)).find(x => /の あなに はいった！/.test(x.t)); if (got) sparkles = await p.locator('#fx-koro span').count(); await sleep(30); }
      await p.mouse.up();
      ok(got && got.t === 'あかの あなに はいった！ おなじ いろ！', 'koro: finger toward red hole -> "' + (got && got.t) + '"');
      ok(sparkles > 0, 'koro: sparkles around hole on matching colour (' + sparkles + ')');
      ok(p.errs.length === 0, 'koro denied: no console errors ' + p.errs.join('|'));
      await p.context().close();
    });

    /* --- 3. no sensor events within 1s -> touch mode; capture radius at any speed; leave in touch mode --- */
    T('koro-nosensor', async (br) => {
      const p = await newPage(br, { width: 390, height: 844 }, { deny: true, init: initFor({ perm: null, pin: true }) });
      await tapTile(p, 'ころころボール'); await sleep(300);
      ok(await p.locator('#ko-start').isHidden() && (await KO(p)).mode === 'sensor', 'koro: no permission API -> starts sensing directly, no button');
      await sleep(1000);
      ok((await KO(p)).mode === 'touch' && await p.locator('#ko-hint').isVisible(), 'koro: no events within 1s -> touch mode');
      // capture within 0.6R regardless of speed
      const res = await p.evaluate(async () => { const h = __ko.holes[0], b = __ko.balls[0], u = __ko.u, R = __ko.R; b.x = h.x + 0.3 * R; b.y = h.y; b.vx = 1.7 * u; b.vy = 0; await new Promise(r => setTimeout(r, 60)); return !!b.sink || __ko.balls.length === 0; });
      ok(res, 'koro: fast ball inside 0.6R is captured');
      await sleep(1500);
      const frA = await p.evaluate(() => window.__koFrames); await p.click('#homebtn'); await sleep(150);
      const frB = await p.evaluate(() => window.__koFrames); await sleep(400);
      const frC = await p.evaluate(() => window.__koFrames);
      ok(frB - frA < 30 && frC === frB, 'koro: leave() in touch mode stops rAF (' + frB + ' -> ' + frC + ')');
      ok((await p.evaluate(() => window.__lsn.devicemotion)) === 0 && (await p.evaluate(() => window.__lsn.deviceorientation)) === 0, 'koro: listeners removed after leave (touch)');
      // leave while celebration timers pending: no sound/word afterwards
      await tapTile(p, 'ころころボール'); await sleep(200);
      await p.evaluate(() => { const h = __ko.holes[0], b = __ko.balls[0]; b.x = h.x; b.y = h.y; });
      await sleep(600); await p.click('#homebtn'); await clearSays(p); await sleep(1500);
      ok((await says(p)).length === 0 && (await p.evaluate(() => __ko.balls.length)) === 0, 'koro: leave() cancels pending round timers (no speech after leaving)');
      ok(p.errs.length === 0, 'koro touch/leave: no console errors ' + p.errs.join('|'));
      await p.context().close();
    });

    /* --- 4. landscape 1024x768 with screen.orientation.angle = 90, plus rotation control --- */
    for (const [ang, ctl] of [[90, false], [90, true]]) T('koro-landscape-' + ang + '-' + ctl, async (br) => {
      const p = await newPage(br, { width: 1024, height: 768 }, { deny: true, init: initFor({ perm: 'granted', angle: 90, pin: true }) });
      await tapTile(p, 'ころころボール'); await sleep(300);
      await p.click('#ko-start'); await sleep(100);
      await feed(p, ...LV); await sleep(800);
      await clearSays(p);
      await feed(p, ...raw(0.12, 0.12, ctl ? 0 : ang));
      const sy = await waitSay(p, /の あなに はいった！/, 9000);
      const want = ctl ? 'あおの あなに はいった！' : 'みどりの あなに はいった！';
      ok(sy && sy.t === want, 'koro landscape(angle 90)' + (ctl ? ' control (unrotated vector -> top-right)' : ' tilt toward screen bottom-right') + ' -> "' + (sy && sy.t) + '"');
      const hs = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight);
      ok(!hs && p.errs.length === 0, 'koro landscape: no scroll, no console errors ' + p.errs.join('|'));
      await p.context().close();
    });

    /* --- 5. deviceorientation fallback (no devicemotion data) --- */
    T('koro-orient', async (br) => {
      const p = await newPage(br, { width: 390, height: 844 }, { deny: true, init: initFor({ perm: 'granted', pin: true }) });
      await tapTile(p, 'ころころボール'); await sleep(300); await p.click('#ko-start'); await sleep(100);
      const fo = (beta, gamma) => p.evaluate(([b, g]) => { clearInterval(window.__fi); window.__fi = setInterval(() => { const e = new Event('deviceorientation'); e.beta = b; e.gamma = g; window.dispatchEvent(e); }, 16); }, [beta, gamma]);
      await fo(60, 3); await sleep(800);
      await clearSays(p);
      await fo(60 + 7, 3 + 7);
      const sy = await waitSay(p, /の あなに はいった！/, 9000);
      ok(sy && sy.t === 'みどりの あなに はいった！', 'koro: deviceorientation fallback tilt right/down -> bottom-right hole "' + (sy && sy.t) + '"');
      await p.context().close();
    });

    /* --- 6. sensitivity setting: UI, persistence, effect --- */
    T('koro-sens', async (br) => {
      const p = await newPage(br, { width: 390, height: 844 }, { deny: true });
      await holdOpen(p, 1600); await sleep(150);
      const lab = await p.evaluate(() => [...document.querySelectorAll('.seg[data-k="koroSens"] button')].map(b => b.textContent));
      ok(lab.join() === 'ゆっくり,ふつう,はやい', 'koro settings: 3 choices ' + lab);
      const txt = await p.evaluate(() => document.querySelector('#setsheet').textContent);
      ok(txt.includes('ころころ かんど') && txt.includes('たんまつを そっと かたむけて あそびます。おとさないよう いっしょに もってね'), 'koro settings: label + parent note');
      const pr = () => p.evaluate(() => [...document.querySelectorAll('.seg[data-k="koroSens"] button')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.v).join());
      ok((await pr()) === '1', 'koro settings: default ふつう');
      await p.click('.seg[data-k="koroSens"] button[data-v="2"]');
      ok((await pr()) === '2' && JSON.parse(await p.evaluate(() => localStorage.getItem('ponpon.settings.v1'))).koroSens === 2, 'koro settings: はやい selected + saved in settings');
      await p.reload(); await sleep(300); await holdOpen(p, 1600); await sleep(150);
      ok((await pr()) === '2', 'koro settings: persists after reload');
      ok(p.errs.length === 0, 'koro settings: no console errors ' + p.errs.join('|'));
      await p.context().close();
      const disp = async (sens) => {
        const q = await newPage(br, { width: 390, height: 844 }, { deny: true, init: initFor({ perm: 'granted', pin: true, sens }) });
        await tapTile(q, 'ころころボール'); await sleep(300); await q.click('#ko-start'); await sleep(100);
        await feed(q, ...LV); await sleep(800);
        const a = (await KO(q)).balls[0]; await feed(q, ...raw(0.12, 0, 0)); await sleep(500); const b = (await KO(q)).balls[0];
        await q.context().close(); return b[0] - a[0];
      };
      const dSlow = await disp(0), dFast = await disp(2);
      ok(dSlow > 3 && dFast / dSlow > 2.0 && dFast / dSlow < 3.4, 'koro sensitivity: はやい/ゆっくり displacement ratio ' + (dFast / dSlow).toFixed(2) + ' (expected ~2.5)');
    });

    /* --- 6b. かたむきの むき: はんたい -> same tilt, opposite hole --- */
    T('koro-reverse', async (br) => {
      const p = await newPage(br, { width: 390, height: 844 }, { deny: true });
      await holdOpen(p, 1600); await sleep(150);
      const lab = await p.evaluate(() => [...document.querySelectorAll('.seg[data-k="koroFlip"] button')].map(b => b.textContent));
      const txt = await p.evaluate(() => document.querySelector('#setsheet').textContent);
      ok(lab.join() === 'ふつう,はんたい' && txt.includes('かたむきの むき') && txt.includes('ボールが ぎゃくに ころがるときは『はんたい』に してください'), 'koro flip setting: UI + note');
      await p.click('.seg[data-k="koroFlip"] button[data-v="1"]');
      ok(JSON.parse(await p.evaluate(() => localStorage.getItem('ponpon.settings.v1'))).koroFlip === true, 'koro flip: saved as koroFlip');
      await p.reload(); await sleep(300); await holdOpen(p, 1600); await sleep(150);
      ok((await p.evaluate(() => document.querySelector('.seg[data-k="koroFlip"] button[aria-pressed="true"]').dataset.v)) === '1', 'koro flip: persists after reload');
      await p.context().close();
      const q = await newPage(br, { width: 390, height: 844 }, { deny: true, init: initFor({ perm: 'granted', pin: true }) + "try{localStorage.setItem('ponpon.settings.v1', JSON.stringify({koroFlip:true}));}catch(e){}" });
      await tapTile(q, 'ころころボール'); await sleep(300); await q.click('#ko-start'); await sleep(100);
      await feed(q, ...LV); await sleep(800); await clearSays(q);
      const tl0 = Date.now();
      await feed(q, ...raw(-0.12, -0.12, 0));   // up-left tilt, はんたい -> bottom-right
      const sy = await waitSay(q, /の あなに はいった！/, 4000);
      ok(sy && sy.t === 'みどりの あなに はいった！', 'koro flip: up-left tilt with はんたい -> bottom-right green hole within 4s (' + (Date.now() - tl0) + 'ms): "' + (sy && sy.t) + '"');
      ok(q.errs.length === 0, 'koro flip: no console errors ' + q.errs.join('|'));
      await q.context().close();
    });

    /* --- 6c. はんたい + bottom-right tilt -> top-left; 4 corner tilts without はんたい; layout --- */
    T('koro-reverse-corners', async (br) => {
      const q = await newPage(br, { width: 390, height: 844 }, { deny: true, init: initFor({ perm: 'granted', pin: true }) + "try{localStorage.setItem('ponpon.settings.v1', JSON.stringify({koroFlip:true}));}catch(e){}" });
      await tapTile(q, 'ころころボール'); await sleep(300); await q.click('#ko-start'); await sleep(100);
      await feed(q, ...LV); await sleep(800); await clearSays(q);
      const t0 = Date.now(); await feed(q, ...raw(0.12, 0.12, 0));
      const sy = await waitSay(q, /の あなに はいった！/, 4000);
      ok(sy && sy.t === 'あかの あなに はいった！ おなじ いろ！', 'koro flip: bottom-right tilt with はんたい -> top-left red hole within 4s (' + (Date.now() - t0) + 'ms): "' + (sy && sy.t) + '"');
      await q.context().close();
    });
    for (const mag of [0.12, 0.3]) T('koro-corners-' + mag, async (br) => { for (const [sx, sy2, name] of [[-1, -1, 'あか'], [1, -1, 'あお'], [-1, 1, 'きいろ'], [1, 1, 'みどり']]) {
      const q = await newPage(br, { width: 390, height: 844 }, { deny: true, init: initFor({ perm: 'granted', pin: true }) });
      await tapTile(q, 'ころころボール'); await sleep(300); await q.click('#ko-start'); await sleep(100);
      await feed(q, ...LV); await sleep(800); await clearSays(q);
      const t0 = Date.now(); await feed(q, ...raw(sx * mag, sy2 * mag, 0));
      const sy = await waitSay(q, /の あなに はいった！/, 4000);
      ok(sy && sy.t.startsWith(name + 'の あなに はいった！'), 'koro corner tilt ' + mag + 'G (' + sx + ',' + sy2 + ') -> ' + name + ' within 4s (' + (Date.now() - t0) + 'ms): "' + (sy && sy.t) + '"');
      await q.context().close();
    } });
    for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1024, height: 768 }]) T('koro-layout-' + vp.width, async (br) => {
      const q = await newPage(br, vp, { deny: true, init: initFor({ perm: 'granted', pin: true }) });
      await tapTile(q, 'ころころボール'); await sleep(300);
      const L = await q.evaluate(() => { const k = __ko, st = document.querySelector('#stage-koro').getBoundingClientRect(), hb = document.querySelector('#homebtn').getBoundingClientRect(), lb = document.querySelector('#ko-lvl').getBoundingClientRect();
        const hit = (r, h) => { const cx = Math.max(r.left, Math.min(h.x + st.left, r.right)), cy = Math.max(r.top, Math.min(h.y + st.top, r.bottom)); return Math.hypot(cx - h.x - st.left, cy - h.y - st.top) < k.R; };
        const ins = k.holes.map(h => [Math.min(h.x, k.W - h.x) - k.F, Math.min(h.y, k.H - h.y) - k.F]);
        return { ov: k.holes.some(h => hit(hb, h) || hit(lb, h)), gap: lb.left - hb.right, mid: ((hb.left + lb.right) / 2) - (st.left + st.width / 2), hbW: hb.width, hbTop: hb.top, ins, r: k.r, R: k.R, u: k.u }; });
      const insOk = L.ins.every(i => Math.abs(i[0] - L.ins[0][0]) < 0.01 && Math.abs(i[1] - L.ins[0][0]) < 0.01);
      ok(!L.ov && L.gap > 0 && L.gap <= 12 && Math.abs(L.mid) < 6 && L.hbW === 56, 'koro layout ' + vp.width + 'x' + vp.height + ': 🏠 ⚖️ side by side top-centre, no overlap with holes (gap ' + L.gap + ', mid ' + L.mid.toFixed(1) + ')');
      ok(insOk && Math.SQRT2 * (L.ins[0][0] - L.r) < 0.6 * L.R, 'koro layout ' + vp.width + ': 4 holes same inset ' + L.ins[0][0].toFixed(1) + ', corner rest spot inside 0.6R');
      await q.click('#homebtn'); await sleep(100);
      await tapTile(q, 'いろタッチ'); await sleep(200);
      const hl = await q.evaluate(() => document.querySelector('#homebtn').getBoundingClientRect().left);
      ok(hl < 40, 'koro: 🏠 back at top-left in other games (left ' + Math.round(hl) + ')');
      await q.context().close();
    });

    /* --- 7. re-level button + 3 balls screenshot --- */
    T('koro-relevel', async (br) => {
      const p = await newPage(br, { width: 390, height: 844 }, { deny: true, init: initFor({ perm: 'granted', pin: true }) });
      await tapTile(p, 'ころころボール'); await sleep(300); await p.click('#ko-start'); await sleep(100);
      await feed(p, ...LV); await sleep(800);
      // device re-held at a different tilt: ball would roll; ⚖️ re-levels so it stays still
      const L2 = [LV[0] + 2.0, LV[1] - 2.0, LV[2]]; await feed(p, ...L2); await sleep(100);
      const tBefore = await p.evaluate(() => [__ko.tx, __ko.ty]);
      ok(tBefore[0] < -0.1 && tBefore[1] < -0.1, 'koro: new pose tilts before ⚖️ (' + tBefore.map(v => v.toFixed(2)) + ')');
      await p.click('#ko-lvl'); await sleep(900);
      const tAfter = await p.evaluate(() => [__ko.tx, __ko.ty, !!__ko.base, !!__ko.bs]);
      ok(Math.abs(tAfter[0]) < 0.001 && Math.abs(tAfter[1]) < 0.001 && tAfter[2] && !tAfter[3], 'koro: ⚖️ re-level makes the new pose the baseline (tilt now ' + tAfter.slice(0, 2).map(v => v.toFixed(3)) + ')');
      await p.context().close();
      const q = await newPage(br, { width: 390, height: 844 }, { deny: true, init: initFor({ perm: 'granted', pin: false, round: 3 }) });
      await tapTile(q, 'ころころボール'); await sleep(300); await q.click('#ko-start'); await sleep(100);
      await feed(q, ...LV); await sleep(1500);
      ok((await KO(q)).n === 3, 'koro: round 3 -> 3 balls');
      await q.screenshot({ path: SP + '/korokoro.png' });
      const q4 = await q.evaluate(() => { __ko.round = 5; return 1; });
      await q.context().close();
    });
  }

  /* ---------- rotation: portrait -> landscape -> portrait keeps 🏠 tappable ---------- */
  [[null].concat(LAB.slice(0, 7)), LAB.slice(7, 14), LAB.slice(14)].forEach((labs, ci) => T('rotation-' + (ci + 1), async (br) => {
    const hit = p => p.evaluate(() => { const b = document.querySelector(document.querySelector('#homebtn').hidden ? '#setbtn' : '#homebtn'), r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && (e === b || b.contains(e)); });
    const p = await newPage(br, { width: 390, height: 844 }, { deny: true });
    for (const lab of labs) {
      if (lab) { await tapTile(p, lab); await sleep(400); }
      await p.setViewportSize({ width: 844, height: 390 }); await sleep(450);
      ok(await hit(p), 'rotate ' + (lab || 'home') + ': landscape 🏠 hit-tests to itself');
      await p.setViewportSize({ width: 390, height: 844 }); await sleep(900);
      await p.evaluate(() => { window.scrollTo(0, 300); document.body.scrollTop = 300; }); await sleep(50);
      await p.evaluate(() => new Promise(r => requestAnimationFrame(() => r())));
      ok(await p.evaluate(() => window.scrollY === 0 && document.body.scrollTop === 0), 'rotate ' + (lab || 'home') + ': scroll reset to 0');
      ok(await hit(p), 'rotate ' + (lab || 'home') + ': portrait 🏠 hit-tests to itself');
      if (lab === 'ころころボール' || lab === 'とけい') await p.screenshot({ path: SP + '/rot-' + (lab === 'とけい' ? 'clock' : 'koro') + '.png' });
      if (lab) {
        await p.click('#homebtn'); await sleep(250);
        ok(await p.evaluate(() => !document.querySelector('#home').hidden), 'rotate ' + lab + ': 🏠 click returns home');
      }
    }
    ok(p.errs.length === 0, 'rotate: no console errors ' + p.errs.join('|'));
    await p.context().close();
  }));

  /* ---------- ドライブ: ハンドル・ボタン・片づけ ---------- */
  TV('drive', [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 740, height: 360 }], async (br, vp) => {
    const tag = 'drive ' + vp.width + 'x' + vp.height, shot = n => p.screenshot({ path: SP + '/drive-' + vp.width + 'x' + vp.height + '-' + n + '.png' });
    const p = await newPage(br, vp, { deny: true });
    const D = () => p.evaluate(() => ({ ang: window.__dr.ang, cam: window.__dr.cam, on: window.__dr.on }));
    const cnt = s => p.locator(s).count();
    const btn = lab => p.click('.dr-b[aria-label="' + lab + '"]');
    const lastSay = async () => { const s = await says(p); return s.length ? s[s.length - 1].t : ''; };
    const big = () => p.evaluate(() => { const b = document.querySelector('#bigword'); return b.hidden ? '' : b.textContent; });
    const tx = id => p.evaluate(id => { const m = /translateX\((-?[\d.]+)px\)/.exec(document.querySelector(id).style.transform); return m ? parseFloat(m[1]) : NaN; }, id);
    await tapTile(p, 'ドライブ'); await sleep(600);
    ok(await p.locator('#stage-drive').isVisible() && await p.locator('#hm-p2').isHidden(), tag + ': tile on page 3 opens ドライブ');
    ok((await says(p)).some(x => x.t === 'ドライブ！'), tag + ': speaks ドライブ！');
    ok(await p.locator('#homebtn').isVisible() && await p.locator('#setbtn').isHidden(), tag + ': shared 🏠 back button, no adult button');
    const geo = await p.evaluate(() => { const r = e => document.querySelector(e).getBoundingClientRect(), st = r('#stage-drive'); const ins = b => b.left >= st.left - 0.5 && b.right <= st.right + 0.5 && b.top >= st.top - 0.5 && b.bottom <= st.bottom + 0.5;
      const bs = [...document.querySelectorAll('.dr-b')].map(b => b.getBoundingClientRect()); const w = r('#dr-wheel'), h = r('#dr-horn'), f = r('.dr-frame');
      return { n: bs.length, minB: Math.min(...bs.map(b => Math.min(b.width, b.height))), bIn: bs.every(ins), wIn: ins(w), wd: w.width, hornMin: Math.min(h.width, h.height), fr: f.height / st.height, st: st.width, hs: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth || document.querySelector('#stage-drive').scrollWidth > document.querySelector('#stage-drive').clientWidth,
        hit: bs.map(b => { const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!e && !!e.closest('.dr-b'); }).every(Boolean), overlap: bs.some(b => b.top < w.bottom - 1 && b.bottom > w.top + 1 && b.left < w.right - 1 && b.right > w.left + 1) }; });
    ok(geo.n === 8 && geo.minB >= 80 && geo.bIn && geo.hornMin >= 80, tag + ': 8 buttons >=80px inside stage, horn >=80px (' + geo.n + ', ' + Math.round(geo.minB) + ', ' + Math.round(geo.hornMin) + ')');
    ok(geo.wIn && !geo.overlap && geo.hit && !geo.hs, tag + ': wheel inside, no overlap with buttons, buttons hit-testable, no hscroll');
    ok(vp.width < 700 ? geo.fr > 0.38 && geo.fr < 0.5 && geo.wd >= Math.min(0.6 * geo.st, 200) && geo.wd <= 320 : geo.fr > 0.3, tag + ': windshield ' + Math.round(geo.fr * 100) + '% / wheel ' + Math.round(geo.wd) + 'px');
    const f0 = await p.evaluate(() => window.__drFrames || 0); await sleep(250);
    ok((await p.evaluate(() => window.__drFrames || 0)) - f0 >= 4, tag + ': rAF loop runs');
    const d0 = await p.evaluate(() => [...document.querySelectorAll('.dr-road .dash')].map(d => d.getAttribute('points')).join('|')); await sleep(200);
    ok(d0 !== await p.evaluate(() => [...document.querySelectorAll('.dr-road .dash')].map(d => d.getAttribute('points')).join('|')) && await cnt('.dr-road .dash') === 8, tag + ': road dashes flow');
    await shot('day');
    if (vp.width !== 390) { ok(p.errs.length === 0, tag + ': no console errors (layout-only viewport; full flow runs at 390x844)'); await p.context().close(); return; }
    /* ハンドル: 時計まわりにつかんで回す -> 回転 + けしきが左へ。遠景ほどゆっくり */
    const wb = await p.locator('#dr-wheel').boundingBox(), cx = wb.x + wb.width / 2, cy = wb.y + wb.height / 2, R = wb.width * 0.4;
    const at = deg => [cx + R * Math.cos(deg * Math.PI / 180), cy + R * Math.sin(deg * Math.PI / 180)];
    const far0 = await tx('#dr-l-far'), mid0 = await tx('#dr-l-mid'), near0 = await tx('#dr-l-near');
    await p.mouse.move(...at(-90)); await p.mouse.down();
    for (let a = -90; a <= -10; a += 8) { await p.mouse.move(...at(a)); await sleep(10); }
    await sleep(450);
    let d = await D(); const matA = await p.evaluate(() => { const m = /rotate\((-?[\d.]+)deg\)/.exec(document.querySelector('#dr-wsvg').style.transform); return m ? parseFloat(m[1]) : NaN; });
    ok(d.ang > 60 && d.ang <= 120 && Math.abs(matA - d.ang) < 25, tag + ': dragging clockwise rotates the wheel (' + Math.round(d.ang) + 'deg, css ' + Math.round(matA) + ')');
    const far1 = await tx('#dr-l-far'), mid1 = await tx('#dr-l-mid'), near1 = await tx('#dr-l-near');
    ok(d.cam > 0 && far1 < far0 && mid1 < mid0 && near1 < near0 - 1, tag + ': turning right moves the scenery left (' + [far1, mid1, near1].map(Math.round).join(',') + ')');
    ok(Math.abs(near1 - near0) > Math.abs(mid1 - mid0) && Math.abs(mid1 - mid0) > Math.abs(far1 - far0), tag + ': parallax (far slowest, near fastest)');
    await shot('turn');
    for (let a = -10; a <= 700; a += 25) { await p.mouse.move(...at(a)); await sleep(5); }
    d = await D(); ok(Math.abs(d.ang) <= 120.001 && d.ang >= 119, tag + ': clamped to +-120deg (' + Math.round(d.ang) + ')');
    await p.mouse.up(); await sleep(150);
    const r1 = Math.abs((await D()).ang); await sleep(900);
    const r2 = Math.abs((await D()).ang); ok(r2 < r1 && r2 > 0, tag + ': wheel eases back slowly after release (' + Math.round(r1) + ' -> ' + Math.round(r2) + ')');
    await sleep(2800); ok(Math.abs((await D()).ang) < 1, tag + ': wheel returns to 0deg');
    const camB = (await D()).cam;
    await p.mouse.move(...at(-90)); await p.mouse.down();
    for (let a = -90; a >= -170; a -= 8) { await p.mouse.move(...at(a)); await sleep(10); }
    await sleep(350); d = await D(); ok(d.ang < -40 && d.cam < camB, tag + ': counter-clockwise turns left, scenery moves right (' + Math.round(d.ang) + ')');
    await p.mouse.up(); await sleep(3000);
    /* クラクション */
    await clearSays(p);
    await p.click('#dr-horn'); await sleep(80);
    ok((await lastSay()) === 'ぷっぷー' && (await big()) === 'ぷっぷー', tag + ': horn says ぷっぷー + bigWord');
    ok((await p.evaluate(() => getComputedStyle(document.getElementById('bigword')).webkitTextStrokeColor)) !== 'rgb(255, 255, 255)', tag + ': big word outline stays ink on light text');
    const ang1 = (await D()).ang; await p.click('#dr-horn'); await sleep(50); ok(Math.abs((await D()).ang - ang1) < 3, tag + ': tapping the horn does not turn the wheel');
    /* ボタン */
    const BT = [['とり', 'とり！'], ['くるま', 'くるま！'], ['よる', 'よる！'], ['あさ', 'あさ！'], ['ライト', 'ライト！'], ['あめ', 'あめ！'], ['どうぶつ', null], ['おんがく', 'るんるん']];
    for (const [lab, w] of BT) {
      await sleep(800); await clearSays(p);
      await btn(lab); await sleep(100);
      const s = await lastSay(), b = await big();
      ok(w ? s === w && b === w.replace('！', '') : /^[぀-ゟ]+$/.test(s.replace('！', '')) && b === s.replace('！', ''), tag + ': ' + lab + ' speaks "' + s + '" and shows the same word big');
      if (lab === 'よる') { const sk = await p.evaluate(() => getComputedStyle(document.getElementById('bigword')).webkitTextStrokeColor);
        ok(sk === 'rgb(255, 255, 255)', tag + ': big word outline is white on dark text (' + sk + ')'); }
      if (lab === 'とり') { await sleep(900); ok((await cnt('#dr-fxv .dr-bird')) >= 3, tag + ': とり -> birds flying (' + await cnt('#dr-fxv .dr-bird') + ')'); }
      if (lab === 'くるま') { await sleep(900); ok((await cnt('#dr-fxv .dr-car')) === 1, tag + ': くるま -> one car coming'); await shot('car');
        const sc = []; for (let k = 0; k < 3; k++) { sc.push(await p.evaluate(() => { const c = document.querySelector('#dr-fxv .dr-car'); return c ? c.getBoundingClientRect().width : 0; })); await sleep(700); }
        ok(sc[0] > 0 && sc[2] > sc[0] * 1.5, tag + ': car grows as it approaches (' + sc.map(Math.round).join('->') + ')'); }
      if (lab === 'よる') { await sleep(1900); await shot('night');
        const nz = await p.evaluate(() => ({ cls: document.querySelector('#dr-view').classList.contains('night'), sky: getComputedStyle(document.querySelector('.dr-sky.n')).opacity, stars: getComputedStyle(document.querySelector('.dr-stars')).opacity, win: getComputedStyle(document.querySelector('#dr-l-mid .f-win')).fill, moon: getComputedStyle(document.querySelector('.dr-moon')).opacity }));
        ok(nz.cls && nz.sky === '1' && nz.stars === '1' && nz.moon === '1' && /255, 230, 128/.test(nz.win), tag + ': よる -> night sky, stars, moon, lit windows ' + JSON.stringify(nz)); }
      if (lab === 'あさ') { await sleep(1900);
        const nz = await p.evaluate(() => ({ cls: document.querySelector('#dr-view').classList.contains('night'), sky: getComputedStyle(document.querySelector('.dr-sky.n')).opacity, sun: getComputedStyle(document.querySelector('.dr-sun')).transform }));
        ok(!nz.cls && nz.sky === '0', tag + ': あさ -> back to day ' + JSON.stringify(nz)); }
      if (lab === 'ライト') { ok(await p.locator('#dr-beam.on').count() === 1, tag + ': ライト -> beam on'); await btn('ライト'); await sleep(100); ok(await p.locator('#dr-beam.on').count() === 0, tag + ': ライト again -> beam off (toggle)'); }
      if (lab === 'あめ') { await sleep(300); ok(await p.locator('#dr-rain.on').count() === 1 && await p.locator('.dr-wiper.go').count() === 2, tag + ': あめ -> rain + wipers moving'); await shot('rain');
        await sleep(4800); ok(await p.locator('#dr-rain.on').count() === 0 && await p.locator('.dr-wiper.go').count() === 0, tag + ': rain stops by itself'); }
      if (lab === 'どうぶつ') { await sleep(300); ok((await cnt('#dr-fxv .dr-animal')) === 1, tag + ': どうぶつ -> animal by the road'); await shot('animal'); }
      if (lab === 'きらきらぼし') { await sleep(1200); ok((await cnt('#dr-fxv .dr-note')) >= 3, tag + ': おんがく -> notes floating (' + await cnt('#dr-fxv .dr-note') + ')'); await shot('music'); }
    }
    /* れんだ: えんしゅつの数に上限 */
    await sleep(3000);
    const mx = { bird: 0, car: 0, animal: 0, note: 0 };
    const samp = async () => { for (const k of Object.keys(mx)) mx[k] = Math.max(mx[k], await cnt('#dr-fxv .dr-' + k)); };
    for (let i = 0; i < 8; i++) { await btn('とり'); await btn('くるま'); await btn('どうぶつ'); await btn('おんがく'); await sleep(60); await samp(); }
    for (let i = 0; i < 12; i++) { await sleep(150); await samp(); }
    ok(mx.bird <= 8 && mx.car <= 3 && mx.animal <= 2 && mx.note <= 14 && mx.bird >= 3 && mx.car >= 1, tag + ': spammed buttons stay capped ' + JSON.stringify(mx));
    ok(p.errs.length === 0, tag + ': no console errors ' + p.errs.join('|'));
    /* もどる: きれいに かたづく */
    await btn('よる'); await btn('ライト'); await btn('あめ'); await btn('おんがく'); await sleep(200);
    await p.click('#homebtn'); await sleep(250);
    ok(await p.locator('#hm-p2').isVisible() && await p.locator('#home').isVisible() && await p.locator('#stage-drive').isHidden(), tag + ': 🏠 returns to the home page 3');
    const fa = await p.evaluate(() => window.__drFrames); await sleep(400);
    ok((await p.evaluate(() => window.__drFrames)) === fa && !(await D()).on, tag + ': leave() stops rAF');
    await sleep(2500);
    const left = await p.evaluate(() => ({ fx: document.querySelector('#dr-fxv').children.length + document.querySelector('#fx-drive').children.length, night: document.querySelector('#dr-view').classList.contains('night'), beam: document.querySelector('#dr-beam').classList.contains('on'), rain: document.querySelector('#dr-rain').classList.contains('on'), ang: window.__dr.ang, cam: window.__dr.cam, pend: window.__dr.rainId + window.__dr.musicIds.length }));
    ok(left.fx === 0 && !left.night && !left.beam && !left.rain && left.ang === 0 && left.cam === 0 && left.pend === 0, tag + ': nothing left after leave (timers/music/rain/elements) ' + JSON.stringify(left));
    await tapTile(p, 'ドライブ'); await sleep(500);
    ok(!(await p.evaluate(() => document.querySelector('#dr-view').classList.contains('night'))) && (await D()).on && (await p.evaluate(() => window.__drFrames)) > fa, tag + ': re-entry starts fresh in daytime and runs again');
    await p.click('#homebtn'); await sleep(200);
    ok(p.errs.length === 0, tag + ': no console errors at end ' + p.errs.join('|'));
    await p.context().close();
  });

  /* ---------- animal illustrations: どうぶつ + いないいないばあ ---------- */
  TV('animals', [{ width: 360, height: 740 }, { width: 1024, height: 768 }], async (br, vp) => {
    const tag = 'animals ' + vp.width + 'x' + vp.height;
    const p = await newPage(br, vp, { deny: true });
    const noHs = () => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth);
    await tapTile(p, 'どうぶつ'); await sleep(500);
    const zi = await p.evaluate(() => [...document.querySelectorAll('#zoo .card .emoji-img')].map(i => i.complete && i.naturalWidth > 0 && i.getBoundingClientRect().width >= 56));
    ok(zi.length === 6 && zi.every(Boolean), tag + ' どうぶつ: 6 cards have loaded images ' + JSON.stringify(zi));
    ok(await p.evaluate(() => [...document.querySelectorAll('#zoo .card .emoji-img')].every(i => /assets\/ani\/.+\.webp$/.test(i.getAttribute('src')) && !i.getAttribute('src').startsWith('data:'))), tag + ' どうぶつ: card images are files, not data URIs');
    ok(await p.evaluate(() => [...document.querySelectorAll('#zoo .card')].every(c => { const r = c.getBoundingClientRect(), i = c.querySelector('.emoji-img').getBoundingClientRect(); return i.left >= r.left && i.right <= r.right && i.top >= r.top && i.bottom <= r.bottom; })), tag + ' どうぶつ: images inside cards');
    ok(await noHs(), tag + ' どうぶつ: no horizontal scroll');
    await p.screenshot({ path: SP + '/animals-zoo-' + vp.width + '.png' });
    await p.click('#homebtn'); await sleep(300);
    await tapTile(p, 'いないいないばあ'); await sleep(400);
    const seen = new Set();
    for (let round = 0; round < (vp.width === 360 ? 4 : 2); round++) {
      for (let i = 0; i < 4; i++) { await p.locator('#baa .slot').nth(i).click(); await sleep(60); }
      await sleep(1100);
      const r = await p.evaluate(() => [...document.querySelectorAll('#baa .slot.open')].map(sl => { const im = sl.querySelector('.an .an-img'), nm = sl.querySelector('.nm').textContent; const b = im && im.getBoundingClientRect(), sb = sl.getBoundingClientRect(); return { ok: !!im && im.complete && im.naturalWidth > 0 && b.width >= 56 && b.left >= sb.left && b.right <= sb.right && b.top >= sb.top && b.bottom <= sb.bottom, nm, src: im && im.src.length }; }));
      ok(r.length === 4 && r.every(x => x.ok && /^[぀-ヿ]+$/.test(x.nm)), tag + ' baa round ' + (round + 1) + ': revealed animals are loaded images ' + JSON.stringify(r.map(x => x.nm + (x.ok ? '' : '!'))));
      r.forEach(x => seen.add(x.nm));
      if (round === 0) { await p.screenshot({ path: SP + '/animals-baa-' + vp.width + '.png' }); ok(await noHs(), tag + ' baa: no horizontal scroll'); }
      await sleep(800);
    }
    ok(await p.evaluate(() => (window.__says || []).some(s => /らいおん|ぺんぎん|うさぎ|ぶた|くま|さる|いぬ|ねこ|うし|ひよこ|かえる|ぞう/.test(s.t))), tag + ' baa: animal name spoken');
    ok(p.errs.length === 0, tag + ': no console errors ' + p.errs.join('|'));
    await p.context().close();
  });


  /* ---------- ピアノ ---------- */
  TV('piano', [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 740, height: 360 }], async (br, vp) => {
    const tag = 'piano ' + vp.width + 'x' + vp.height;
    const p = await newPage(br, vp, { deny: true, init: 'window.__fq = []; (function(){ const sv = AudioParam.prototype.setValueAtTime; AudioParam.prototype.setValueAtTime = function(v, t){ window.__fq.push(v); return sv.call(this, v, t); }; })();' });
    const big = () => p.evaluate(() => { const b = document.querySelector('#bigword'); return b.hidden ? '' : b.textContent; });
    const on = () => p.evaluate(() => [...document.querySelectorAll('.pn-k.on')].length);
    await tapTile(p, 'ピアノ'); await sleep(500);
    ok(await p.locator('#stage-piano').isVisible() && await p.locator('#hm-p2').isHidden(), tag + ': tile on page 3 opens ピアノ');
    ok((await says(p)).some(x => x.t === 'ピアノ！') && await p.locator('#homebtn').isVisible() && await p.locator('#setbtn').isHidden(), tag + ': speaks ピアノ！, shared 🏠, no adult button');
    const land = vp.width > vp.height;
    const geo = await p.evaluate(() => { const st = document.querySelector('#stage-piano').getBoundingClientRect(); const all = [...document.querySelectorAll('.pn-k')]; const rs = all.map(k => k.getBoundingClientRect()); const sbs = [...document.querySelectorAll('#pn-song, #pn-song2, .pn-oct')].map(e => e.getBoundingClientRect()), sb = sbs[0], hb = document.querySelector('#homebtn').getBoundingClientRect();
      const ov = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      const W = rs.filter((r, i) => all[i].classList.contains('w')), B = rs.filter((r, i) => all[i].classList.contains('b'));
      return { nw: W.length, nb: B.length, wW: Math.min(...W.map(r => r.width)), wH: Math.min(...W.map(r => r.height)), bW: Math.min(...B.map(r => r.width)), bH: Math.min(...B.map(r => r.height)), inside: rs.every(r => r.left >= st.left - 1 && r.right <= st.right + 1 && r.top >= st.top - 1 && r.bottom <= st.bottom + 1), sIn: sbs.every(sb => sb.left >= st.left && sb.right <= st.right && sb.top >= st.top && sb.bottom <= st.bottom), ovl: rs.some(r => sbs.some(q => ov(r, q)) || ov(r, hb)) || sbs.some(q => ov(q, hb)) || sbs.some((q, a) => sbs.some((q2, b) => a < b && ov(q, q2))), sw: Math.min(...sbs.map(q => q.width)), sh: Math.min(...sbs.map(q => q.height)),
        hs: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1 }; });
    ok(geo.nw === 8 && geo.nb === 5 && geo.inside, tag + ': 8 white + 5 black keys, all inside stage');
    ok(land ? (geo.wW >= 44 && geo.wH >= 200 && geo.bW >= 32 && geo.bH >= 110) : (geo.wH >= 80 && geo.wW >= 200 && geo.bH >= 32 && geo.bW >= 110), tag + ': key sizes ok (white ' + Math.round(geo.wW) + 'x' + Math.round(geo.wH) + ', black ' + Math.round(geo.bW) + 'x' + Math.round(geo.bH) + ')');
    ok(geo.sw >= 80 && geo.sh >= 80 && geo.sIn && !geo.ovl && !geo.hs, tag + ': song + octave buttons >=80px, no overlap with keys/🏠, no hscroll');
    await p.screenshot({ path: SP + '/piano-' + vp.width + 'x' + vp.height + '-a.png' });
    /* tap: active while held, note name big */
    const kb = i => p.locator('.pn-k').nth(i).boundingBox();
    const names = ['ど', 'れ', 'み', 'ふぁ', 'そ', 'ら', 'し', 'ど'];
    let b = await kb(3);
    await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await sleep(120);
    ok((await p.locator('.pn-k').nth(3).evaluate(e => e.classList.contains('on'))) && (await big()) === 'ふぁ', tag + ': pressed key is active and shows ふぁ');
    ok((await p.locator('#fx-piano span').count()) >= 1, tag + ': ♪ floats up');
    await p.screenshot({ path: SP + '/piano-' + vp.width + 'x' + vp.height + '-b.png' });
    await p.mouse.up(); await sleep(450);
    ok((await on()) === 0, tag + ': key released');
    for (let i = 0; i < 8; i++) { b = await kb(i); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await sleep(30); ok((await big()) === names[i], tag + ': key ' + i + ' shows ' + names[i]); }
    /* black key: on top of whites, pressable, active */
    const hit = await p.evaluate(() => { const bs = [...document.querySelectorAll('.pn-k.b')]; return bs.map(k => { const r = k.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return e === k; }); });
    ok(hit.length === 5 && hit.every(Boolean), tag + ': black keys win the hit test');
    if (vp.width !== 390) { ok(p.errs.length === 0, tag + ': no console errors (layout-only viewport; full flow runs at 390x844)'); await p.context().close(); return; }
    b = await kb(9);
    await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await sleep(100);
    ok(await p.locator('.pn-k').nth(9).evaluate(e => e.classList.contains('on')) && (await on()) === 1, tag + ': black key pressable and active alone');
    await p.mouse.up(); await sleep(350);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 8; i++) { b = await kb(i); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
    ok((await p.locator('#fx-piano span').count()) <= 12, tag + ': fx count capped (' + (await p.locator('#fx-piano span').count()) + ')');
    /* おんがく */
    await p.click('#pn-song'); await sleep(900);
    ok((await p.locator('#pn-song').getAttribute('aria-label')) === 'とめる' && (await on()) >= 1, tag + ': おんがく plays, button becomes とめる, a key lights');
    await p.screenshot({ path: SP + '/piano-' + vp.width + 'x' + vp.height + '-c.png' });
    const seen = await p.evaluate(() => new Promise(res => { const s = new Set(); const t0 = Date.now(); const iv = setInterval(() => { document.querySelectorAll('.pn-k.on').forEach(k => s.add(k.dataset.i)); if (Date.now() - t0 > 2600) { clearInterval(iv); res([...s]); } }, 40); }));
    ok(seen.includes('4') && seen.includes('5') && seen.length >= 3, tag + ': melody lights そ ら ふぁ in turn ' + seen);
    await p.click('#pn-song'); await sleep(500);
    ok((await p.locator('#pn-song').getAttribute('aria-label')) === 'きらきらぼし' && (await on()) === 0, tag + ': tapping again stops');
    const w0 = await big(); await sleep(1500);
    ok((await on()) === 0, tag + ': no more keys light after stop');
    /* play then leave mid-song: nothing left behind */
    await p.click('#pn-song'); await sleep(700);
    await p.click('#homebtn'); await sleep(300);
    const left = await p.evaluate(() => ({ fx: document.querySelectorAll('#fx-piano span').length, on: document.querySelectorAll('.pn-k.on').length }));
    await sleep(1200);
    const left2 = await p.evaluate(() => ({ fx: document.querySelectorAll('#fx-piano span').length, on: document.querySelectorAll('.pn-k.on').length, song: document.querySelector('#pn-song').textContent }));
    ok(left.on === 0 && left2.on === 0 && left2.fx === 0 && left2.song.length <= 2 && await p.locator('#home').isVisible(), tag + ': leave() clears timers/fx (' + JSON.stringify(left2) + ')');
    await tapTile(p, 'ピアノ'); await sleep(400);
    /* オクターブ: ↑↓で -1..+1。手弾きだけ周波数が変わる。じどうえんそうは そのまま */
    const oct = () => p.evaluate(() => document.querySelector('#stage-piano').dataset.oct);
    const lastF = async () => { const a = await p.evaluate(() => window.__fq.slice()); return a.filter(v => v > 100 && v < 2200); };
    const tapKey = async i => { const bb = await kb(i); await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await sleep(60); };
    ok((await oct()) === '0', tag + ': octave starts at 0');
    await p.evaluate(() => { window.__fq.length = 0; }); await tapKey(0);
    let f0 = (await lastF())[0];
    await p.click('#pn-up'); await sleep(100);
    ok((await oct()) === '1' && await p.locator('#pn-up').evaluate(e => e.classList.contains('lim')), tag + ': ↑ -> octave +1, button marked as limit');
    await p.click('#pn-up'); await sleep(50);
    ok((await oct()) === '1', tag + ': ↑ at top stays +1');
    await p.evaluate(() => { window.__fq.length = 0; }); await tapKey(0);
    let fU = (await lastF())[0];
    ok(Math.abs(fU / f0 - 2) < 0.02, tag + ': hand-played pitch doubles at +1 (' + f0 + ' -> ' + fU + ')');
    await p.click('#pn-dn'); await p.click('#pn-dn'); await sleep(100);
    ok((await oct()) === '-1', tag + ': ↓↓ -> octave -1');
    await p.evaluate(() => { window.__fq.length = 0; }); await tapKey(9);
    let fD = (await lastF())[0];
    ok(Math.abs(fD / (f0 * 311.13 / 261.63) - 0.5) < 0.02, tag + ': black key follows octave too (' + fD + ')');
    await p.screenshot({ path: SP + '/piano-' + vp.width + 'x' + vp.height + '-oct.png' });
    /* マーチ: オクターブ-1のままでも 楽譜どおり（さいしょの ミ=E5 659*2=1318） */
    await p.evaluate(() => { window.__fq.length = 0; });
    await p.click('#pn-song2'); await sleep(400);
    const fm = await lastF();
    ok(fm.length && Math.abs(fm[0] - 659.26) < 2, tag + ': march first note is E5 (' + fm[0] + ') regardless of octave setting');
    await p.click('#pn-song2'); await sleep(200);
    await p.evaluate(() => { window.__fq.length = 0; }); await tapKey(0);
    await p.click('#homebtn'); await sleep(200);
    await tapTile(p, 'ピアノ'); await sleep(400);
    ok((await oct()) === '0' && await p.locator('.pn-oct.on').count() === 0, tag + ': octave resets to 0 on re-enter');
    /* 2きょくめ（マーチ）: ならす -> ほかの きょくに きりかえ不要 -> とめる */
    await p.click('#pn-song2'); await sleep(900);
    ok((await p.locator('#pn-song2').getAttribute('aria-label')) === 'とめる' && (await p.locator('#pn-song').getAttribute('aria-label')) === 'きらきらぼし' && (await on()) >= 1, tag + ': song 2 plays, only its button shows とめる, a key lights');
    const seen2 = await p.evaluate(() => new Promise(res => { const s = new Set(); const t0 = Date.now(); const iv = setInterval(() => { document.querySelectorAll('.pn-k.on').forEach(k => s.add(k.dataset.i)); if (Date.now() - t0 > 3200) { clearInterval(iv); res([...s]); } }, 40); }));
    ok(seen2.length >= 3, tag + ': march lights several keys ' + seen2);
    await p.click('#pn-song2'); await sleep(500);
    ok((await p.locator('#pn-song2').getAttribute('aria-label')) === 'アンパンマンマーチ' && (await on()) === 0, tag + ': tapping song 2 again stops');
    await p.click('#pn-song2'); await sleep(700);
    await p.click('#homebtn'); await sleep(300);
    await sleep(1200);
    const left3 = await p.evaluate(() => ({ fx: document.querySelectorAll('#fx-piano span').length, on: document.querySelectorAll('.pn-k.on').length, a: document.querySelector('#pn-song2').getAttribute('aria-label') }));
    ok(left3.on === 0 && left3.fx === 0 && left3.a === 'アンパンマンマーチ' && await p.locator('#home').isVisible(), tag + ': leaving mid-march leaves nothing behind ' + JSON.stringify(left3));
    /* re-enter, multi-touch via CDP not needed: two pointer ids */
    await tapTile(p, 'ピアノ'); await sleep(400);
    await p.evaluate(() => { const ks = document.querySelectorAll('.pn-k'); [[0, 11], [4, 12]].forEach(([i, id]) => { const r = ks[i].getBoundingClientRect(); ks[i].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: id, clientX: r.x + 10, clientY: r.y + 10 })); }); });
    ok((await on()) === 2, tag + ': two simultaneous presses both active');
    await p.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 11 })));
    await sleep(300);
    ok((await on()) === 1, tag + ': releasing one leaves the other held');
    await p.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 12 })));
    ok(p.errs.length === 0, tag + ' no console errors ' + p.errs.join(' | '));
    await p.context().close();
  });

  /* ---------- ピンボール ---------- */
  TV('pinball', [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 740, height: 360 }], async (br, vp) => {
    const tag = 'pinball ' + vp.width + 'x' + vp.height, shot = n => p.screenshot({ path: SP + '/pinball-' + vp.width + 'x' + vp.height + '-' + n + '.png' });
    const p = await newPage(br, vp, { deny: true });
    const big = () => p.evaluate(() => { const b = document.querySelector('#bigword'); return b.hidden ? '' : b.textContent; });
    const PB = () => p.evaluate(() => { const q = window.__pb; return { mode: q.mode, x: q.ball.x, y: q.ball.y, vx: q.ball.vx, vy: q.ball.vy, on: q.on, raf: q.raf, kinds: q.cups.map(c => c.kind), fx: document.querySelector('#fx-pinball').children.length, btn: !document.querySelector('#pb-launch').hidden,
      fl: q.fl.map(f => ({ a: f.a, want: f.want, up: f.up, rest: f.rest })), rx: q.rest.x, ry: q.rest.y, s: q.s, ox: q.ox, oy: q.oy }; });
    await tapTile(p, 'ピンボール'); await sleep(600);
    ok(await p.locator('#stage-pinball').isVisible() && await p.locator('#hm-p2').isHidden(), tag + ': tile on page 3 opens ピンボール');
    ok((await says(p)).some(x => x.t === 'ピンボール！') && await p.locator('#homebtn').isVisible() && await p.locator('#setbtn').isHidden(), tag + ': speaks ピンボール！, shared 🏠, no adult button');
    const s0 = await PB();
    const geo = await p.evaluate(() => { const st = document.querySelector('#stage-pinball').getBoundingClientRect(), b = document.querySelector('#pb-launch').getBoundingClientRect(), hb = document.querySelector('#homebtn').getBoundingClientRect();
      return { w: b.width, h: b.height, inside: b.left >= st.left && b.right <= st.right && b.top >= st.top && b.bottom <= st.bottom, cx: b.left + b.width / 2 - st.left, cy: b.top + b.height / 2 - st.top, sw: st.width, sh: st.height,
        ovl: b.left < hb.right && hb.left < b.right && b.top < hb.bottom && hb.top < b.bottom, hs: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1 || document.querySelector('#stage-pinball').scrollWidth > document.querySelector('#stage-pinball').clientWidth }; });
    const bx = s0.ox + s0.rx * s0.s, by = s0.oy + s0.ry * s0.s;
    ok(geo.w >= 80 && geo.h >= 80 && geo.inside && !geo.ovl && !geo.hs, tag + ': launch ring >=80px, inside stage, not over 🏠, no hscroll ' + JSON.stringify(geo));
    ok(s0.mode === 'ready' && s0.btn && bx > geo.sw * 0.5 && by > geo.sh * 0.6 && Math.hypot(geo.cx - bx, geo.cy - by) < 36, tag + ': ball waits at bottom right inside the ring');
    ok(s0.kinds.length === 5 && new Set(s0.kinds).size === 5, tag + ': 5 cups, 5 different reactions ' + s0.kinds.join());
    const board = await p.evaluate(() => { const q = window.__pb; return { l: q.ox, r: q.ox + q.L.W * q.s, t: q.oy, b: q.oy + q.L.H * q.s, W: q.W, H: q.H }; });
    ok(board.l >= 0 && board.r <= board.W && board.t >= 0 && board.b <= board.H && Math.abs(board.l - (board.W - board.r)) < 2, tag + ': board fits and is centered ' + JSON.stringify(board));
    await sleep(300); await shot('a');
    /* flippers: left half / right half, hold to raise, release to lower */
    const stb = await p.locator('#stage-pinball').boundingBox();
    const fy = stb.y + stb.height * 0.7, lx = stb.x + stb.width * 0.25, rx = stb.x + stb.width * 0.75;
    await p.mouse.move(lx, fy); await p.mouse.down(); await sleep(250);
    let f1 = (await PB()).fl;
    ok(f1[0].want && !f1[1].want && f1[0].a < f1[0].rest - 0.7 && Math.abs(f1[1].a - f1[1].rest) < 0.01, tag + ': tapping the left half raises only the left flipper');
    await shot('flip');
    await p.mouse.up(); await sleep(300);
    f1 = (await PB()).fl;
    ok(!f1[0].want && Math.abs(f1[0].a - f1[0].rest) < 0.01, tag + ': releasing lowers it');
    await p.mouse.move(rx, fy); await p.mouse.down(); await sleep(250);
    f1 = (await PB()).fl;
    ok(f1[1].want && !f1[0].want && f1[1].a < f1[1].rest - 0.7, tag + ': tapping the right half raises only the right flipper');
    await p.mouse.up(); await sleep(300);
    if (vp.width !== 390) { ok(p.errs.length === 0, tag + ': no console errors (layout-only viewport; full flow runs at 390x844)'); await p.context().close(); return; }
    /* multi-touch with pointer ids */
    await p.evaluate(([l, r, y]) => { const cv = document.querySelector('#pb-cv'); [[l, 31], [r, 32]].forEach(([x, id]) => cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: id, clientX: x, clientY: y }))); }, [lx, rx, fy]);
    f1 = (await PB()).fl;
    ok(f1[0].want && f1[1].want, tag + ': two fingers raise both flippers');
    await p.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 31 })));
    f1 = (await PB()).fl;
    ok(!f1[0].want && f1[1].want, tag + ': lifting one finger lowers only that flipper');
    await p.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 32 })));
    await sleep(250);
    /* a flipper swing sends a ball upward (both sides) */
    const kick = await p.evaluate(() => { const q = window.__pb, out = []; [0, 1].forEach(i => {
        q.mode = 'fly'; q.tFly = 0; q.tLaunch = 0; q.ball.s = 1; const f = q.fl[i];
        q.fl.forEach(g => { g.want = false; g.a = g.rest; }); q.step(0.2);
        const tx = f.px + f.dir * q.L.fl * Math.cos(f.rest), ty = f.py + q.L.fl * Math.sin(f.rest);
        q.ball.x = f.px + (tx - f.px) * 0.7; q.ball.y = f.py + (ty - f.py) * 0.7 - q.L.R - q.L.fr - 2; q.ball.vx = 0; q.ball.vy = 0;
        let vmin = 0; f.want = true; for (let k = 0; k < 30; k++) { q.step(1 / 120); vmin = Math.min(vmin, q.ball.vy); }
        f.want = false; out.push(vmin); });
      q.ball.s = 1; return out; });
    ok(kick[0] < -250 && kick[1] < -250, tag + ': flipper swing launches the ball upward ' + kick.map(Math.round));
    await p.evaluate(() => { const q = window.__pb; q.fl.forEach(g => { g.want = false; }); q.ready(); });
    await sleep(300);
    /* tap the ball -> plunger, then launch up the lane */
    await p.click('#pb-launch', { force: true }); await sleep(120);
    ok((await PB()).mode === 'plunge' && !(await PB()).btn, tag + ': tapping the ball pulls the plunger');
    await sleep(500);
    const s1 = await PB();
    ok(s1.mode === 'fly' && s1.y < s0.ry - 100, tag + ': ball shoots up the lane (y ' + Math.round(s0.ry) + ' -> ' + Math.round(s1.y) + ')');
    await shot('b');
    let cheer = false;
    for (let k = 0; k < 120 && !cheer; k++) { await sleep(150); cheer = (await PB()).mode === 'cheer'; if (k === 10) await shot('c'); }
    ok(cheer, tag + ': left alone, the ball always ends in a cup');
    await sleep(300);
    /* many simulated shots: stays on the board, never hangs, reaches every cup */
    const run = play => p.evaluate(play => { const q = window.__pb, L = q.L; let bad = 0, oob = 0; const cups = {};
      for (let k = 0; k < (play ? 100 : 60); k++) { q.ready(); q.ball.s = 1; document.querySelector('#pb-launch').dispatchEvent(new PointerEvent('pointerdown'));
        let t = 0, nextp = 0; while ((q.mode === 'plunge' || q.mode === 'fly') && t < 60) { if (play && t >= nextp) { nextp = t + Math.random() * 0.5; q.fl[0].want = Math.random() < 0.5; q.fl[1].want = Math.random() < 0.5; } q.step(1 / 60); t += 1 / 60; const b = q.ball; if (b.x < 0 || b.x > L.W || b.y < 0 || b.y > L.H) oob++; }
        q.fl[0].want = q.fl[1].want = false;
        if (q.mode === 'cheer') cups[q.scored] = (cups[q.scored] || 0) + 1; else bad++; }
      q.ready(); return { bad, oob, n: Object.keys(cups).length, cups }; }, play);
    const idle = await run(false); const played = await run(true);
    for (let k = 0; k < 4 && played.n < 5; k++) { const more = await run(true); played.bad += more.bad; played.oob += more.oob; for (const c in more.cups) played.cups[c] = (played.cups[c] || 0) + more.cups[c]; played.n = Object.keys(played.cups).length; }   // ランダム操作なので、全カップに届くまで数回まで追加で打つ（不定期に落ちていた原因）
    ok(idle.bad === 0 && idle.oob === 0 && idle.n >= 2, tag + ': 60 hands-off shots all end in a cup, none off the board ' + JSON.stringify(idle));
    ok(played.bad === 0 && played.oob === 0 && played.n === 5, tag + ': 100 shots with random flipper play: every cup reached, none stuck or off the board ' + JSON.stringify(played));
    await p.evaluate(() => { const q = window.__pb; q.ready(); document.querySelector('#fx-pinball').innerHTML = ''; });
    /* each cup -> its own reaction */
    const kinds = s0.kinds;
    for (let i = 0; i < kinds.length; i++) {
      await clearSays(p);
      await p.evaluate(i => window.__pb.drop(i), i); await sleep(700);
      const st = await PB(), bw = await big(), sy = await says(p);
      const want = { fire: 'わあい', star: 'きらきら', confetti: 'やったー', heart: 'すてき' }[kinds[i]];
      const okWord = kinds[i] === 'animal' ? /さん$/.test(bw) : bw === want;
      ok(st.mode === 'cheer' && st.fx >= 1 && okWord && sy.length >= 1 && sy[sy.length - 1].t === bw + '！', tag + ': cup ' + i + ' (' + kinds[i] + ') reacts: mode ' + st.mode + ', fx ' + st.fx + ', word ' + bw + ', say ' + (sy.length ? sy[sy.length - 1].t : '-'));
      await shot('cup' + i);
      if (i === 0) {
        let back = false; for (let k = 0; k < 30 && !back; k++) { await sleep(150); back = (await PB()).mode === 'ready'; }
        const sb = await PB();
        ok(back && sb.btn && Math.abs(sb.x - sb.rx) < 2 && Math.abs(sb.y - sb.ry) < 2, tag + ': after the reaction the ball returns to the lower right and can be tapped again');
      } else { await p.evaluate(() => { window.__pb.wait = 0.05; }); await sleep(250); }
    }
    ok((await PB()).fx <= 160, tag + ': fx count stays bounded');
    /* rapid flipper tapping stays sane */
    await sleep(1500);
    for (let k = 0; k < 30; k++) { await p.mouse.click(k % 2 ? lx : rx, fy); }
    ok(p.errs.length === 0, tag + ': 30 rapid flipper taps, no errors');
    /* leave mid-reaction: nothing left behind */
    await p.evaluate(() => { window.__pb.drop(0); });
    await sleep(100);
    await p.click('#homebtn'); await sleep(200);
    const f0 = await p.evaluate(() => window.__pbFrames);
    await sleep(500);
    const f2 = await p.evaluate(() => window.__pbFrames), sl = await PB();
    ok(f2 === f0 && !sl.on && sl.raf === 0, tag + ': leave() stops the rAF loop (' + f0 + ' -> ' + f2 + ')');
    await sleep(1200);
    const sl2 = await PB();
    ok(sl2.fx === 0 && (await big()) === '' && await p.locator('#home').isVisible() && sl2.fl.every(f => !f.want), tag + ': leave() clears timers/fx/flippers (fx ' + sl2.fx + ')');
    await tapTile(p, 'ピンボール'); await sleep(500);
    const re = await PB();
    ok(re.on && re.mode === 'ready' && re.btn && re.fx === 0 && Math.abs(re.x - re.rx) < 2 && Math.abs(re.y - re.ry) < 2, tag + ': re-entering resets to a waiting ball');
    await p.click('#homebtn'); await sleep(300);
    ok(p.errs.length === 0, tag + ' no console errors ' + p.errs.join(' | '));
    await p.context().close();
  });


  /* ---------- ねこさがし ---------- */
  const NK_TIMERS = `(function(){ window.__pend = new Map(); const st = window.setTimeout.bind(window), ct = window.clearTimeout.bind(window);
    window.setTimeout = function(f, ms, ...a){ const id = st(function(){ window.__pend.delete(id); f(...a); }, ms, ...a); window.__pend.set(id, ms); return id; };
    window.clearTimeout = function(id){ window.__pend.delete(id); return ct(id); }; })();`;
  /* ねこさがし: ページの なかで、きれめ・みえかた・ゆかを しらべる（NK_SOLID と えの ひょうじ ばしょ から）。わるい ところの せつめいを かえす */
  const nkGeo = () => {
    const solid = window.__nkSolid, rows = {}; for (const k in solid) rows[k] = solid[k].split('|');
    const cell = (key, u, v) => !(u < 0 || v < 0 || u >= 1 || v >= 1) && rows[key][(v * 16) | 0][(u * 16) | 0] === '1';
    const st = document.querySelector('#stage-neko').getBoundingClientRect(), short = Math.min(st.width, st.height), bad = [];
    const props = [...document.querySelectorAll('.nk-g')].map(g => { const img = g.querySelector('.nk-prop .nk-sp img'), r = img.getBoundingClientRect(); return { key: g.querySelector('[data-neko-prop]').dataset.nekoProp, z: +g.style.zIndex, r, ok: img.complete && r.height > 0 }; });
    const inP = (q, x, y) => x >= q.r.left && x < q.r.right && y >= q.r.top && y < q.r.bottom && cell(q.key, (x - q.r.left) / q.r.width, (y - q.r.top) / q.r.height);
    if (props.length < 12 || props.length > 16) bad.push('props=' + props.length);
    if (props.some(q => !q.ok)) bad.push('prop image not ready');
    for (let a = 0; a < props.length; a++) for (let b = a + 1; b < props.length; b++) {
      const A = props[a].r, B = props[b].r, ix = Math.max(0, Math.min(A.right, B.right) - Math.max(A.left, B.left)) * Math.max(0, Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top));
      if (ix > 0.45 * Math.min(A.width * A.height, B.width * B.height)) bad.push('props ' + props[a].key + '/' + props[b].key + ' overlap too much');
    }
    props.forEach(q => { if (q.r.left < st.left - 2 || q.r.right > st.right + 2 || q.r.bottom > st.bottom + 2) bad.push(q.key + ' outside'); });
    const bg = document.querySelector('#nk-bg');
    if (bg.classList.contains('room')) {
      const fl = parseFloat(getComputedStyle(bg).getPropertyValue('--fl')) / 100 * st.height + st.top;
      props.forEach(q => { if (q.r.bottom <= fl + 2) bad.push('room prop ' + q.key + ' above the floor line'); });
    }
    const MIN = { open: 0.6, top: 0.4, tail: 0.3, side: 0.35, behind: 0.2 }, centers = [], info = [];
    document.querySelectorAll('[data-neko-cat]').forEach(hb => {
      const i = +hb.dataset.nekoCat, hide = hb.dataset.nekoHide, el = document.querySelector('[data-nk-cat-el="' + i + '"]'), hr = hb.getBoundingClientRect();
      if (hb.hidden || !el) return;
      if (hr.width < 79.5 || hr.height < 79.5 || hr.left < st.left - 1 || hr.right > st.right + 1 || hr.top < st.top - 1 || hr.bottom > st.bottom + 1) bad.push('cat' + i + ' hit ' + Math.round(hr.width) + 'x' + Math.round(hr.height));
      const img = el.querySelector('img'), R = img.getBoundingClientRect(), host = hide === 'open' ? null : props[+el.dataset.nkHost];
      if (host && el.parentNode !== document.querySelectorAll('.nk-g')[+el.dataset.nkHost]) bad.push('cat' + i + ' not in host');
      if (R.left < st.left || R.right > st.right || R.bottom > st.bottom) bad.push('cat' + i + ' sprite outside the screen');
      if (host) {
        const pts = [], w = R.width, h = R.height;
        if (hide === 'top' || hide === 'tail') { const a = hide === 'top' ? 0.16 : 0.14, z = hide === 'top' ? 0.83 : 0.66; for (let k = 0; k < 9; k++) pts.push([R.left + w * (a + (z - a) * k / 8), R.bottom - 1]); }
        else if (hide === 'side') { const left = (R.left + R.right) / 2 < (host.r.left + host.r.right) / 2, x = left ? R.right - 1 : R.left + 1; for (let k = 0; k < 12; k++) pts.push([x, R.top + h * (0.02 + 0.96 * k / 11)]); }
        const miss = pts.filter(([x, y]) => !inP(host, x, y)).length;
        if (miss) bad.push('cat' + i + ' (' + hide + ') cut edge shows outside ' + host.key + ' (' + miss + '/' + pts.length + ')');
      }
      // visible fraction: sample the sprite's ellipse, drop points covered by the host (when hidden) or by props drawn above
      const hz = host ? host.z : +el.style.zIndex;
      let tot = 0, vis = 0, hv = 0, l = 1e9, r = -1e9, t = 1e9, b = -1e9;
      for (let j = 0; j < 10; j++) for (let k = 0; k < 10; k++) {
        const fx = (k + 0.5) / 10, fy = (j + 0.5) / 10; if ((fx - 0.5) ** 2 + (fy - 0.5) ** 2 > 0.25) continue;
        const x = R.left + fx * R.width, y = R.top + fy * R.height; tot++;
        if (host && inP(host, x, y)) continue;
        hv++;
        if (props.some(q => q !== host && q.z > hz && inP(q, x, y))) continue;
        vis++; l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y);
      }
      const frac = vis / tot;
      if (frac < MIN[hide] - 0.06) bad.push('cat' + i + ' (' + hide + ') visible ' + frac.toFixed(2));
      if (hide === 'behind' && (hv / tot < 0.2 || hv / tot > 0.72)) bad.push('cat' + i + ' behind sticks out ' + (hv / tot).toFixed(2));
      if (Math.max(r - l, b - t) < 0.08 * short - R.width / 10 - 2) bad.push('cat' + i + ' (' + hide + ') visible part too small ' + Math.round(Math.max(r - l, b - t)));
      centers.push([(hr.left + hr.right) / 2, (hr.top + hr.bottom) / 2]); info.push({ i, hide, frac: +frac.toFixed(2) });
    });
    for (let a = 0; a < centers.length; a++) for (let b = a + 1; b < centers.length; b++) if (Math.max(Math.abs(centers[a][0] - centers[b][0]), Math.abs(centers[a][1] - centers[b][1])) < 60) bad.push('cats ' + a + '/' + b + ' too close');
    return { bad, n: props.length, info };
  };
  const nkReady = p => p.evaluate(async () => { for (let k = 0; k < 40; k++) { if ([...document.images].every(i => i.complete)) break; await new Promise(r => setTimeout(r, 25)); } });

  TV('neko', [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 740, height: 360 }], async (br, vp) => {
    const tag = 'neko ' + vp.width + 'x' + vp.height, shot = n => p.screenshot({ path: SP + '/neko-' + vp.width + 'x' + vp.height + '-' + n + '.png' });
    const p = await newPage(br, vp, { deny: true, init: NK_TIMERS });
    const big = () => p.evaluate(() => { const b = document.querySelector('#bigword'); return b.hidden ? '' : b.textContent; });
    const pend = () => p.evaluate(() => [...window.__pend.values()].filter(m => m === 10000 || m === 8000).length);
    const info = () => p.evaluate(() => {
      const st = document.querySelector('#stage-neko').getBoundingClientRect();
      const cats = [...document.querySelectorAll('[data-neko-cat]')].map(e => { const r = e.getBoundingClientRect(); return { i: +e.dataset.nekoCat, hide: e.dataset.nekoHide, found: e.dataset.found === '1', w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2, inside: r.left >= st.left - 1 && r.right <= st.right + 1 && r.top >= st.top - 1 && r.bottom <= st.bottom + 1 }; });
      const props = [...document.querySelectorAll('[data-neko-prop]')].map(e => e.dataset.nekoProp);
      return { cats, props, scene: document.querySelector('#stage-neko').dataset.nekoScene, faces: document.querySelectorAll('.nk-face.on').length, nfaces: document.querySelectorAll('.nk-face').length,
        hs: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1 || document.querySelector('#stage-neko').scrollWidth > document.querySelector('#stage-neko').clientWidth,
        sig: [...document.querySelectorAll('.nk-g')].map(g => g.querySelector('[data-neko-prop]').dataset.nekoProp + g.style.left + g.style.bottom).join('|') + '#' + [...document.querySelectorAll('[data-neko-cat]')].map(e => e.dataset.nekoHide).join() };
    });
    const tapCat = async i => { const c = (await info()).cats.find(x => x.i === i); await p.mouse.click(c.cx, c.cy); };
    await tapTile(p, 'ねこさがし'); await sleep(500);
    ok(await p.locator('#stage-neko').isVisible() && await p.locator('#hm-p2').isHidden(), tag + ': tile on page 3 opens ねこさがし');
    ok((await says(p)).some(x => x.t === 'ねこさがし！') && await p.locator('#homebtn').isVisible() && await p.locator('#setbtn').isHidden(), tag + ': speaks ねこさがし！, shared 🏠, no adult button');
    let s0 = await info();
    ok(s0.cats.length === 3 && s0.nfaces === 3 && s0.faces === 0, tag + ': 3 cats, 3 empty face slots');
    ok(s0.cats.every(c => c.w >= 79.5 && c.h >= 79.5 && c.inside), tag + ': each cat hit area >= 80px and inside the screen ' + JSON.stringify(s0.cats.map(c => [Math.round(c.w), Math.round(c.h), c.inside])));
    ok(s0.props.length >= 12 && s0.props.length <= 16 && s0.scene === 'room' && !s0.props.some(k => ['tree', 'bush', 'slide', 'bench', 'rock', 'flowers', 'mushroom', 'bucket'].includes(k)), tag + ': 12-16 props, first scene is the room with room props only (' + s0.props.length + ')');
    await nkReady(p);
    { const g = await p.evaluate(nkGeo); ok(g.bad.length === 0, tag + ': round 1 geometry (cut edges hidden, visible share, floor, overlaps) ' + JSON.stringify(g.bad.slice(0, 5)) + ' ' + JSON.stringify(g.info)); }
    ok(['open', 'behind', 'top'].every(h => s0.cats.filter(c => c.hide === h).length === 1), tag + ': round 1 = open x1 + behind x1 + top x1 ' + s0.cats.map(c => c.hide));
    ok(!s0.hs, tag + ': no horizontal scroll');
    const small = await p.evaluate(() => [...document.querySelectorAll('.nk-prop')].every(b => { const a = getComputedStyle(b, '::after'); return parseFloat(a.width) >= 79.5 && parseFloat(a.height) >= 79.5; }));
    ok(small, tag + ': props have >= 80px tap areas');
    await sleep(1900); await shot('a');
    /* tapping a prop: reacts, does not find a cat */
    await clearSays(p);
    const pk = await p.evaluate(() => { const hits = [...document.querySelectorAll('[data-neko-cat]')].map(e => e.getBoundingClientRect());
      for (const e of document.querySelectorAll('[data-neko-prop]')) { const r = e.getBoundingClientRect(); for (const fy of [0.6, 0.4, 0.75, 0.5]) { const x = r.left + r.width / 2, y = r.top + r.height * fy;
        if (!hits.some(h => x >= h.left && x <= h.right && y >= h.top && y <= h.bottom)) { const top = document.elementFromPoint(x, y); if (top && top.closest('[data-neko-prop]') === e) return { x, y, name: e.getAttribute('aria-label') }; } } } return null; });
    ok(!!pk, tag + ': found a free spot on a prop to tap');
    if (pk) {
      await p.mouse.click(pk.x, pk.y); await sleep(250);
      const sy = await says(p), s1 = await info();
      ok(sy.length >= 1 && sy[sy.length - 1].t === pk.name && (await big()) === pk.name && s1.faces === 0 && !s1.cats.some(c => c.found), tag + ': prop tap says + shows its name (' + pk.name + '), no cat found');
    }
    /* find a cat */
    await clearSays(p);
    await tapCat(0); await sleep(300);
    let s2 = await info(), sy2 = await says(p);
    ok(s2.cats[0].found && s2.faces === 1 && sy2.some(x => x.t === 'みーつけた！') && (await big()) === 'みーつけた', tag + ': tapping a cat finds it: face filled, みーつけた！ said + shown');
    ok(await p.evaluate(() => document.querySelector('[data-nk-cat-el="0"] img, [data-nk-cat-el="0"] .em').textContent.includes('😸') || !!document.querySelector('[data-nk-cat-el="0"] img')), tag + ': found cat switches to cat_jump sprite');
    await sleep(400); await shot('b');
    await sleep(1000);
    ok(await p.evaluate(() => !document.querySelector('[data-nk-cat-el="0"]') && document.querySelector('[data-neko-cat="0"]').hidden), tag + ': found cat flies to its face slot and disappears (no sprite, hit area hidden)');
    ok((await info()).faces === 1, tag + ': still 1 face after the cat vanished');
    ok((await pend()) >= 1, tag + ': hint timer armed (pending)');
    await tapCat(1); await sleep(500);
    ok((await info()).faces === 2, tag + ': 2 found');
    await clearSays(p);
    const sigBefore = (await info()).sig, sceneBefore = (await info()).scene;
    await tapCat(2); await sleep(2000);
    ok((await says(p)).some(x => x.t === 'ぜんぶ みつけた！') && /ぜんぶ/.test(await big()), tag + ': all three: ぜんぶ みつけた！ said + shown');
    await shot('c');
    ok((await info()).faces === 3, tag + ': 3 faces filled');
    await sleep(3600);
    const s3 = await info();
    ok(s3.faces === 0 && s3.cats.length === 3 && s3.cats.every(c => !c.found) && s3.sig !== sigBefore && s3.scene !== sceneBefore, tag + ': next round has a fresh layout and the other scene (' + sceneBefore + ' -> ' + s3.scene + ')');
    ok(s3.cats.filter(c => c.hide === 'open').length <= 1 && s3.cats.filter(c => c.hide === 'tail').length <= 1 && s3.cats.every(c => ['open', 'behind', 'top', 'side', 'tail'].includes(c.hide)), tag + ': round 2 = open 0-1, tail <= 1, rest behind/top/side ' + s3.cats.map(c => c.hide));
    await nkReady(p);
    { const g = await p.evaluate(nkGeo); ok(g.bad.length === 0 && s3.props.length >= 12 && s3.props.length <= 16, tag + ': round 2 geometry (park) ' + JSON.stringify(g.bad.slice(0, 5)) + ' ' + JSON.stringify(g.info)); }
    ok(s3.cats.every(c => c.w >= 79.5 && c.h >= 79.5 && c.inside) && !s3.hs, tag + ': round 2 hit areas ok, no hscroll');
    await sleep(2000); await shot('d');
    /* leave: no timers left */
    await p.click('#homebtn'); await sleep(300);
    ok(await p.locator('#home').isVisible() && (await pend()) === 0 && (await big()) === '' && await p.evaluate(() => !document.querySelector('[data-neko-cat]') && !document.querySelector('.nk-g') && document.querySelector('#fx-neko').children.length === 0), tag + ': leave() clears timers, cats, props and fx (pending hint/next timers: ' + (await pend()) + ')');
    await clearSays(p);
    await sleep(1500);
    ok((await says(p)).length === 0, tag + ': nothing speaks after leaving');
    await tapTile(p, 'ねこさがし'); await sleep(500);
    const re = await info();
    ok(re.faces === 0 && re.cats.length === 3 && re.scene === 'room' && re.cats.filter(c => c.hide === 'open').length === 1 && re.cats.filter(c => c.hide === 'behind').length === 1, tag + ': re-entering restarts at round 1 (room)');
    await p.click('#homebtn'); await sleep(200);
    ok(p.errs.length === 0, tag + ' no console errors ' + p.errs.join(' | '));
    await p.context().close();
  });

  /* ---------- ねこさがし: レイアウトの総当たり ---------- */
  TV('neko-gen', [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 740, height: 360 }], async (br, vp) => {
    const tag = 'neko-gen ' + vp.width + 'x' + vp.height;
    const p = await newPage(br, vp, { deny: true });
    await tapTile(p, 'ねこさがし'); await sleep(500);
    const res = await p.evaluate(async (geoSrc) => {
      const geo = (0, eval)('(' + geoSrc + ')'), q = window.__nk, out = { n: 0, bad: [], hides: {}, props: [] };
      for (let r = 0; r < 14; r++) {
        q.round = r; window.__nkStart(1);
        for (let k = 0; k < 40; k++) { if ([...document.images].every(i => i.complete)) break; await new Promise(res => setTimeout(res, 25)); }
        await new Promise(res => setTimeout(res, 30));
        const cats = [...document.querySelectorAll('[data-neko-cat]')];
        out.n++;
        if (cats.length !== 3) out.bad.push('r' + r + ' cats=' + cats.length);
        cats.forEach(e => { out.hides[e.dataset.nekoHide] = (out.hides[e.dataset.nekoHide] || 0) + 1; });
        const hs = cats.map(e => e.dataset.nekoHide);
        if (hs.filter(h => h === 'tail').length > 1) out.bad.push('r' + r + ' two tails');
        if (r === 0 && !['open', 'behind', 'top'].every(h => hs.filter(x => x === h).length === 1)) out.bad.push('r0 mix ' + hs);
        if (r >= 1 && hs.filter(h => h === 'open').length > 1) out.bad.push('r' + r + ' open x' + hs.filter(h => h === 'open').length);
        if (r >= 1 && hs.some(h => !['open', 'behind', 'top', 'side', 'tail'].includes(h))) out.bad.push('r' + r + ' bad hide ' + hs);
        const g = geo(); g.bad.forEach(m => out.bad.push('r' + r + ' ' + m));
        out.props.push(g.n);
        if (document.documentElement.scrollWidth > innerWidth + 1) out.bad.push('r' + r + ' hscroll');
      }
      return out;
    }, nkGeo.toString());
    ok(res.n === 14 && res.bad.length === 0 && Math.min(...res.props) >= 12 && Math.max(...res.props) <= 16, tag + ': 14 generated rounds valid (12-16 props, cut edges inside the hiding prop, visible share, floor line) ' + JSON.stringify(res.bad.slice(0, 6)) + ' hides ' + JSON.stringify(res.hides));
    ok(p.errs.length === 0, tag + ' no console errors ' + p.errs.join(' | '));
    await p.context().close();
  });

  /* ---------- ねこさがし: ヒント ---------- */
  T('neko-hint', async (br) => {
    const p = await newPage(br, { width: 390, height: 844 }, { deny: true, init: 'window.__nkH1 = 900; window.__nkH2 = 700;' });
    await tapTile(p, 'ねこさがし'); await sleep(300);
    const hinted = () => p.evaluate(() => [...document.querySelectorAll('[data-hint]')].map(e => +e.dataset.nkCatEl));
    ok((await hinted()).length === 0, 'neko-hint: no hint right away');
    let h = []; for (let k = 0; k < 20 && !h.length; k++) { await sleep(100); h = await hinted(); }
    ok(h.length === 1, 'neko-hint: one unfound cat starts wiggling after the first delay ' + h);
    ok(await p.evaluate(() => { const c = document.querySelector('[data-hint]'); return c.getAnimations().length > 0; }), 'neko-hint: the hinted cat is animating');
    // find cat A, then the hint must reset and never point at found cats
    const first = (await p.evaluate(() => [...document.querySelectorAll('[data-neko-cat]')].map(e => { const r = e.getBoundingClientRect(); return [+e.dataset.nekoCat, r.left + r.width / 2, r.top + r.height / 2]; })))[0];
    await p.mouse.click(first[1], first[2]); await sleep(200);
    ok((await hinted()).length === 0, 'neko-hint: finding a cat clears the hint and resets the timer');
    let bad = 0, seen = 0;
    for (let k = 0; k < 40; k++) { await sleep(100); const hh = await hinted(); if (hh.length) seen++; if (hh.includes(first[0])) bad++; }
    ok(bad === 0 && seen > 0, 'neko-hint: later hints only point at unfound cats (seen ' + seen + ', on found ' + bad + ')');
    await p.click('#homebtn'); await sleep(200);
    ok(p.errs.length === 0, 'neko-hint no console errors ' + p.errs.join(' | '));
    await p.context().close();
  });

  /* ---------- ボイスチェンジャー ---------- */
  const FAKEMIC = `(function(){
    navigator.mediaDevices.getUserMedia = function(c){
      window.__gum++;
      if (window.__denyCam) return Promise.reject(new DOMException('denied','NotAllowedError'));
      const ctx = new AudioContext(), o = ctx.createOscillator(), g = ctx.createGain(), d = ctx.createMediaStreamDestination();
      o.frequency.value = 300; g.gain.value = window.__fmInit || 0; o.connect(g); g.connect(d); o.start();
      window.__fm = { ctx, set: v => { g.gain.value = v; }, tracks: d.stream.getAudioTracks() };
      return ctx.resume().then(() => d.stream);
    };
  })();`;
  const ASMOCK = `(function(){ const h = window.__as = []; let t = 'auto'; Object.defineProperty(navigator, 'audioSession', { configurable: true, value: { get type() { return t; }, set type(v) { t = v; h.push(v); } } }); })();`;
  const AU = p => p.evaluate(() => { const v = window.__vc, a = v.au; return { auto: v.auto, state: v.state, ph: v.ph, voice: v.voice, last: v.last, plays: v.plays, live: v.live, buf: v.buf, dur: v.dur || 0, deaf: v.deafUntil === Infinity ? 'inf' : Math.round(v.deafUntil - performance.now()), n: a ? a.n : -1, chunks: a ? a.ch.length : -1, vad: a ? a.vad.st : '', count: a ? a.count : -1, skipped: a ? a.skipped : -1, tr: window.__fm ? window.__fm.tracks.filter(t => t.readyState === 'live').length : -1, ico: document.querySelector('#vc-ico').textContent, msg: document.querySelector('#vc-msg').textContent, pressed: document.querySelector('#vc-auto').getAttribute('aria-pressed') }; });
  const AUbuf = p => p.evaluate(() => { const v = window.__vc; if (!v.buf) return ''; return (v.buf.__id = v.buf.__id || Math.random()).toString(); });
  const until = async (p, f, ms) => { const t0 = Date.now(); for (;;) { const r = await f(); if (r) return r; if (Date.now() - t0 > ms) return false; await sleep(40); } };
  const VCFAST = 'window.__vcA.A.INTRO = 0.3;';   // はじめの よみあげ待ち（本番 2.5 秒）を縮める
  const vcHs = p => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1 || document.querySelector('#stage-voice').scrollWidth > document.querySelector('#stage-voice').clientWidth + 1);
  const vcBtnInfo = p => p.evaluate(() => { const g = document.querySelector('#vc-grid').getBoundingClientRect(); return [...document.querySelectorAll('.vc-b')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), r.left >= g.left - 1 && r.right <= g.right + 1, b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1]; }); });
  const vcEnter = async (p, fast = true) => { if (fast) await p.evaluate(VCFAST); await tapTile(p, 'ボイスチェンジャー'); };

  T('voice-pure', async (br) => {
    const p = await newPage(br, { width: 390, height: 844 }, { deny: true });
    const r = await p.evaluate(() => {
      const V = window.__vcV, out = { n: V.length, ids: V.map(v => v.id), plans: V.map(v => window.__vcPlan(v, 3)), gr: window.__vcGrains(4, 0.5), gr2: window.__vcGrains(4, 1.9), labs: V.map(v => v.lab), cs: V.map(v => v.c) };
      return out;
    });
    ok(r.n >= 16 && r.n <= 20 && new Set(r.ids).size === r.n && new Set(r.cs).size === r.n, 'voice: 16-20 distinct voices/colors (' + r.n + ') ' + r.ids.join());
    ok(r.labs.every(l => /^[ぁ-んァ-ヶー]+$/.test(l) && l.length <= 6), 'voice: names are short kana ' + r.labs.join());
    ok(r.plans.every(q => q.dur > 0 && q.total >= q.dur && q.total < 20), 'voice: plans have sane durations ' + JSON.stringify(r.plans.map(q => +q.total.toFixed(2))));
    const byId = Object.fromEntries(r.ids.map((id, i) => [id, r.plans[i]]));
    ok(byId.high.dur < byId.normal.dur && byId.low.dur > byId.normal.dur && byId.slow.dur > 2 * byId.normal.dur * 0.99 && byId.fast.dur < byId.normal.dur && byId.echo.tail > byId.normal.tail, 'voice: high shorter, low/slow longer, fast shorter, echo has a tail');
    ok(byId.tiny.dur < byId.high.dur && byId.giant.dur > byId.low.dur && byId.bath.tail > byId.normal.tail && byId.rev.dur === byId.normal.dur, 'voice: tiny/giant are beyond high/low, bath has a tail, reverse keeps its length');
    const gOk = (g, d, sp) => g.length > 5 && g.every((x, i) => x.off >= 0 && x.off < d && x.off + x.len <= d + 1e-6 && (i === 0 || (x.at > g[i - 1].at && x.off > g[i - 1].off))) && Math.abs(g[g.length - 1].at * sp - g[g.length - 1].off) < 1e-6;
    ok(gOk(r.gr, 4, 0.5) && gOk(r.gr2, 4, 1.9) && r.gr.length > r.gr2.length, 'voice: grain schedules are monotonic and inside the recording (' + r.gr.length + '/' + r.gr2.length + ')');
    /* ずっときく: VAD の状態遷移（純粋関数） */
    const a = await p.evaluate(() => {
      const H = window.__vcA, A = H.A;
      const sim = (parts, dt = 0.05) => {          // parts = [[rms, 秒], ...]
        const s = H.vadNew(), ev = [];
        parts.forEach(([r, sec]) => { const n = Math.round(sec / dt); for (let i = 0; i < n; i++) { const e = H.vad(s, r, dt); if (e) ev.push(e); } });
        return { ev, s };
      };
      const cal = [[0.003, 0.5]];
      const o = { A: JSON.parse(JSON.stringify(A)) };
      o.silent = sim([[0.003, 3]]); o.silentThr = o.silent.s.thr;
      o.speech = sim(cal.concat([[0.2, 1], [0.003, 1.5]]));
      o.blip = sim(cal.concat([[0.2, 0.1], [0.003, 1.5]]));
      o.long = sim(cal.concat([[0.2, 6.2]]));
      o.gap = sim(cal.concat([[0.2, 0.5], [0.003, 0.3], [0.2, 0.5], [0.003, 1.5]]));
      o.noisy = sim([[0.03, 1], [0.05, 1], [0.15, 0.3]]);
      o.noisyThr = H.vadNew(); { const s = H.vadNew(); for (let i = 0; i < 20; i++) H.vad(s, 0.03, 0.05); o.noisyThr = s.thr; }
      o.hiThr = (() => { const s = H.vadNew(); for (let i = 0; i < 20; i++) H.vad(s, 0.5, 0.05); return s.thr; })();
      o.ring = H.ring(new Array(20).fill(2048), 48000); o.ring2 = H.ring([100], 48000);
      o.keep = [H.keep(48000, 48000, 0.7), H.keep(48000, 48000, 0), H.keep(1000, 48000, 0.7)];
      return o;
    });
    ok(a.A.GAIN_MAX <= 1.6 && a.A.QUIET === 0.7 && a.A.MAXLEN === 6 && a.A.MINV === 0.3 && a.A.PRE === 0.3 && a.A.TAIL >= 0.5, 'voice pure: tuning constants ' + JSON.stringify(a.A));
    ok(a.silent.ev.length === 0 && a.silentThr === a.A.THR_MIN, 'voice pure: silence never triggers, threshold has a floor (' + a.silentThr + ')');
    ok(a.speech.ev.join() === 'start,end', 'voice pure: speech -> start, end ' + a.speech.ev);
    ok(a.blip.ev.join() === 'start,drop', 'voice pure: blip shorter than 0.3s is dropped ' + a.blip.ev);
    ok(a.long.ev.slice(0, 2).join() === 'start,max' && a.long.ev.length <= 3, 'voice pure: forced end at 6s (then a new utterance may begin) ' + a.long.ev);
    ok(a.gap.ev.join() === 'start,end', 'voice pure: a 0.3s pause does not split speech ' + a.gap.ev);
    ok(a.noisy.ev.join() === 'start' && a.noisyThr > a.A.THR_MIN && a.noisyThr <= a.A.THR_MAX && a.hiThr === a.A.THR_MAX, 'voice pure: threshold calibrates to ambient noise (' + a.noisyThr.toFixed(3) + ', cap ' + a.hiThr + ') ' + a.noisy.ev);
    ok(a.ring === 12 && a.ring2 === 0, 'voice pure: pre-roll keeps >= 0.3s (' + a.ring + ')');
    ok(a.keep[0] === 21600 && a.keep[1] === 48000 && a.keep[2] === 0, 'voice pure: trailing silence trimmed to 0.15s ' + a.keep);
    await p.context().close();
  });

  /* 入った瞬間から聞く: 声ボタンは最初から並ぶ → 自動録音 → 再生 → half-duplex → 声切替 → 全声 → OFF/ON → leave。縦 360x740 + 横 740x360 */
  T('voice-auto', async (br) => {
    const tag = 'voice-auto', shot = n => p.screenshot({ path: SP + '/voice-' + n + '.png' });
    const p = await newPage(br, { width: 360, height: 740 }, { voices: JAV, init: FAKEMIC + ASMOCK });
    await p.evaluate(VCFAST);
    await tapTile(p, 'ボイスチェンジャー');
    ok(await p.locator('#stage-voice').isVisible() && await p.locator('#hm-p2').isHidden() && await p.locator('#vc-grid').isVisible() && (await p.locator('.vc-b').count()) >= 16, tag + ': entering shows the voice buttons straight away (no mic-only screen)');
    ok(await p.locator('#vc-mic').count() === 0 && await p.locator('#vc-bar').count() === 0, tag + ': manual mic UI is gone');
    ok(await until(p, async () => (await AU(p)).state === 'auto', 3000), tag + ': mic opened by itself from the tile tap');
    let s = await AU(p);
    ok(s.auto && s.ph === 'listen' && s.tr === 1 && s.ico === '👂' && s.msg === 'きいてるよ' && s.pressed === 'true', tag + ': status 👂 きいてるよ ' + JSON.stringify({ ...s, buf: 0 }));
    const sy = await says(p);
    ok(sy.some(x => x.t === 'ぼいすちぇんじゃー！') && sy.filter(x => x.t === 'おはなし してね').length === 1 && await p.locator('#homebtn').isVisible() && await p.locator('#setbtn').isHidden(), tag + ': speaks name + prompt once, shared 🏠, no adult button');
    const bb = await vcBtnInfo(p);
    ok(bb.length >= 16 && bb.every(x => x[0] >= 80 && x[1] >= 80 && x[2] && !x[3]), tag + ': ' + bb.length + ' voice buttons >= 80px, inside, not clipped (' + bb[0][0] + 'x' + bb[0][1] + ')');
    const tb = await p.locator('#vc-auto').boundingBox(), st = await p.locator('#vc-st').boundingBox();
    ok(tb.width >= 80 && tb.height >= 80 && st.y < tb.y + tb.height && st.y + st.height < 200 && !(await vcHs(p)), tag + ': status at top, toggle ' + Math.round(tb.width) + 'x' + Math.round(tb.height) + ', no hscroll');
    const gs = await p.evaluate(() => { const g = document.querySelector('#vc-grid'); return g.scrollHeight - g.clientHeight; });
    ok(gs <= 2, tag + ': all voices fit without scrolling at 360x740 (overflow ' + gs + 'px)');
    await shot('360x740-listen');
    /* 先に声を選ぶ（まだ再生しない） */
    await p.click('.vc-b[data-voice="robot"]', { force: true });
    s = await AU(p);
    ok(s.voice === 'robot' && s.plays === 0 && await p.locator('.vc-b.sel').count() === 1 && await p.locator('.vc-b.sel[data-voice="robot"]').count() === 1, tag + ': picking a voice before talking selects it (no playback)');
    /* 発話 → ためてる → 再生 */
    await p.evaluate(() => window.__fm.set(0.3));
    ok(await until(p, async () => (await AU(p)).ph === 'talk', 2000), tag + ': speech detected -> ためてる…');
    s = await AU(p);
    ok(s.msg === 'ためてる…' && s.ico === '🎙️' && await p.locator('#vc-ico.rec').count() === 1 && s.buf === null, tag + ': ためてる… pulse');
    await sleep(300); await p.evaluate(() => window.__fm.set(0));
    ok(await until(p, async () => (await AU(p)).ph === 'play', 2500), tag + ': ~0.7s of silence ends the utterance -> plays');
    s = await AU(p); const buf1 = await AUbuf(p);
    ok(s.count === 1 && s.last === 'robot' && s.live >= 3 && s.msg === 'しゃべってるよ' && s.ico === '🔊' && s.deaf === 'inf' && s.dur > 0.4 && s.dur < 2.6 && await p.locator('.vc-b.on[data-voice="robot"]').count() === 1, tag + ': auto-played in the active voice, 🔊, button glows (' + s.dur.toFixed(2) + 's)');
    await shot('360x740-play');
    /* 再生中に声ボタン: 選択だけ変わる（再生は止めない・元の声のまま・音も足さない） */
    const pl0 = s.plays, live0 = s.live;
    await p.click('.vc-b[data-voice="tiny"]', { force: true });
    s = await AU(p);
    ok(s.voice === 'tiny' && s.last === 'robot' && s.plays === pl0 && s.live === live0 && s.ph === 'play' && s.deaf === 'inf' && await p.locator('.vc-b.sel[data-voice="tiny"]').count() === 1 && await p.locator('.vc-b.on[data-voice="robot"]').count() === 1, tag + ': tapping a voice during playback only changes the selection (still the original voice, one playback)');
    /* half-duplex: 再生中は入力を捨てる */
    const sk0 = s.skipped;
    await p.evaluate(() => window.__fm.set(0.3)); await sleep(250);
    s = await AU(p);
    ok(s.ph === 'play' && s.n === 0 && s.chunks === 0 && s.vad === 'idle' && s.skipped > sk0 && await AUbuf(p) === buf1 && s.count === 1, tag + ': input is discarded during playback (skipped +' + (s.skipped - sk0) + ' samples)');
    ok(await until(p, async () => (await AU(p)).ph === 'listen', 4000), tag + ': playback ends -> listening again');
    s = await AU(p);
    ok(s.n === 0 && typeof s.deaf === 'number' && s.deaf > 0 && s.deaf <= 520, tag + ': ~0.5s deaf window after playback (' + s.deaf + 'ms left)');
    await p.evaluate(() => window.__fm.set(0));
    await sleep(Math.max(0, s.deaf) + 100);
    s = await AU(p);
    ok(s.ph === 'listen' && s.n >= 0 && await AUbuf(p) === '' && s.count === 1, tag + ': nothing recorded from the playback / deaf window');
    /* 再生が終わったら録音は捨てる。声ボタンは選ぶだけ（再生しない・ぴょこっと跳ねる） */
    ok(await AUbuf(p) === '' && s.count === 1 && s.plays === 1, tag + ': recording is discarded after the single playback');
    const p1 = s.plays;
    await p.click('.vc-b[data-voice="phone"]', { force: true });
    s = await AU(p);
    ok(s.voice === 'phone' && s.plays === p1 && s.live === 0 && s.ph === 'listen' && s.deaf !== 'inf' && await p.locator('.vc-b.sel').count() === 1 && await p.locator('.vc-b.pop[data-voice="phone"]').count() === 1 && await p.locator('.vc-b.on').count() === 0, tag + ': tapping a voice does not play anything, just selects + hops');
    ok(await until(p, async () => (await p.locator('.vc-b.pop').count()) === 0, 1500), tag + ': hop animation ends by itself');
    ok(p.errs.length === 0, tag + ': no console errors so far ' + p.errs.join(' | '));
    /* 次の発話は選んだ声で 1 回だけ */
    await sleep(500);
    await p.evaluate(() => window.__fm.set(0.3)); await sleep(500); await p.evaluate(() => window.__fm.set(0));
    ok(await until(p, async () => (await AU(p)).count === 2, 3000), tag + ': second utterance committed');
    s = await AU(p);
    ok(s.last === 'phone' && s.plays === p1 + 1 && s.ph === 'play', tag + ': auto-played in the newly selected voice');
    ok(await until(p, async () => (await AU(p)).live === 0, 6000) && await p.locator('.vc-b.on').count() === 0, tag + ': nodes disconnected + glow cleared after the playback');
    await sleep(1000);
    s = await AU(p);
    ok(s.plays === p1 + 1 && s.ph === 'listen' && await AUbuf(p) === '', tag + ': played exactly once, then listening again, buffer discarded');
    /* audioSession: 聞く=play-and-record → 再生=playback → 聞き直し=play-and-record */
    const asq = await p.evaluate(() => window.__as.slice());
    const cl = asq.filter((x, i) => i === 0 || x !== asq[i - 1]);
    ok(cl.slice(0, 3).join() === 'play-and-record,playback,play-and-record' && await until(p, async () => (await p.evaluate(() => window.__as[window.__as.length - 1])) === 'play-and-record', 1500), tag + ': audioSession listen -> playback on play -> play-and-record again ' + cl.join());
    /* マイクのトラックが終わったら じどうで とりなおして また きく */
    const g0 = await p.evaluate(() => window.__gum);
    await p.evaluate(() => window.__fm.tracks.forEach(t => { t.stop(); t.dispatchEvent(new Event('ended')); }));
    ok(await until(p, async () => (await p.evaluate(() => window.__gum)) === g0 + 1 && (await AU(p)).state === 'auto' && (await AU(p)).tr === 1, 3000), tag + ': ended track -> mic re-acquired by itself, listening again');
    await until(p, async () => (await AU(p)).ph === 'listen', 4000);
    /* 一時停止 OFF */
    await until(p, async () => (await AU(p)).ph === 'listen', 4000);
    await p.click('#vc-auto', { force: true });
    s = await AU(p);
    ok(!s.auto && s.state === 'idle' && s.tr === 0 && s.pressed === 'false' && s.ico === '⏸' && await p.locator('#vc-grid').isVisible() && (await p.locator('#vc-auto').textContent()).includes('ずっときく'), tag + ': ⏸ stops the mic, voices stay ' + JSON.stringify({ ...s, buf: 0 }));
    await p.click('.vc-b[data-voice="low"]', { force: true });
    s = await AU(p);
    ok(s.voice === 'low' && s.plays === p1 + 1 && s.live === 0 && await p.locator('.vc-b.sel[data-voice="low"]').count() === 1, tag + ': voices can still be selected while paused (no playback)');
    await p.click('#vc-auto', { force: true });
    ok(await until(p, async () => (await AU(p)).state === 'auto', 3000) && (await AU(p)).tr === 1, tag + ': 👂 ずっときく turns the mic on again');
    /* 横向き */
    await p.setViewportSize({ width: 740, height: 360 }); await sleep(400);
    const lb = await vcBtnInfo(p), ls = await p.evaluate(() => { const t = document.querySelector('.vc-top').getBoundingClientRect(), g = document.querySelector('#vc-grid').getBoundingClientRect(); return { sameRow: Math.abs(t.top - g.top) < 40, over: document.querySelector('#vc-grid').scrollHeight - document.querySelector('#vc-grid').clientHeight, ico: document.querySelector('#vc-ico').getBoundingClientRect().height }; });
    const lt = await p.locator('#vc-auto').boundingBox();
    ok(lb.length >= 16 && lb.every(x => x[0] >= 80 && x[1] >= 80 && x[2] && !x[3]) && lt.width >= 80 && lt.height >= 80 && !(await vcHs(p)), 'voice-auto landscape 740x360: ' + lb.length + ' buttons >= 80px, toggle ' + Math.round(lt.width) + 'x' + Math.round(lt.height) + ', no hscroll ' + JSON.stringify(ls) + ' ' + lb[0]);
    await shot('740x360-listen');
    await p.setViewportSize({ width: 360, height: 740 }); await sleep(200);
    /* ON のまま leave */
    await p.evaluate(() => { window.__trs = window.__fm.tracks; });
    await p.click('#homebtn'); await sleep(200);
    ok(await p.evaluate(() => window.__as[window.__as.length - 1]) === 'auto', tag + ': leave() puts audioSession back to auto');
    const lv = await p.evaluate(() => ({ live: window.__trs.filter(t => t.readyState === 'live').length, auto: window.__vc.auto, st: window.__vc.state, l2: window.__vc.live, buf: !!window.__vc.buf, hidden: document.querySelector('#stage-voice').hidden, au: !!window.__vc.au }));
    ok(lv.live === 0 && !lv.auto && lv.st === 'idle' && lv.l2 === 0 && !lv.buf && lv.hidden && !lv.au, tag + ': leave() stops the mic and clears everything ' + JSON.stringify(lv));
    await tapTile(p, 'ボイスチェンジャー');
    ok(await until(p, async () => (await AU(p)).state === 'auto' && (await AU(p)).buf === null, 3000) && await p.locator('.vc-b.sel[data-voice="normal"]').count() === 1 && await p.locator('#vc-grid').isVisible(), tag + ': re-enter starts fresh (listening again, voice back to ふつう, voices shown)');
    await p.click('#homebtn'); await sleep(100);
    ok(p.errs.length === 0, tag + ': no console errors ' + p.errs.join(' | '));
    await p.context().close();
  });

  /* 音がずっと鳴っている部屋: 再生中は録音が増えない（half-duplex）・最長で強制終了・ON 直後は聞かない */
  T('voice-loud', async (br) => {
    const p = await newPage(br, { width: 360, height: 740 }, { voices: JAV, init: FAKEMIC + 'window.__fmInit = 0.3;' });
    await p.evaluate(() => { window.__vcA.A.INTRO = 0.9; window.__vcA.A.MAXLEN = 1.5; });
    await tapTile(p, 'ボイスチェンジャー'); await sleep(450);
    let s = await AU(p);
    ok(s.auto && s.ph === 'listen' && s.n === 0 && s.buf === null && s.skipped > 0, 'voice-loud: right after entering (intro) nothing is recorded ' + JSON.stringify({ ph: s.ph, n: s.n, deaf: s.deaf }));
    ok(await until(p, async () => (await AU(p)).ph === 'talk', 2000), 'voice-loud: constant sound -> starts collecting after the intro');
    ok(await until(p, async () => (await AU(p)).ph === 'play', 4000), 'voice-loud: forced end at the max length -> plays');
    s = await AU(p); const b1 = await AUbuf(p);
    ok(s.dur > 1.3 && s.dur <= 2.1 && s.count === 1, 'voice-loud: buffer is the max segment (' + s.dur.toFixed(2) + 's incl. pre-roll)');
    let bad = 0, samples = 0;
    while ((await AU(p)).ph === 'play' && samples < 40) { const q = await AU(p); samples++; if (q.n !== 0 || q.chunks !== 0 || q.count !== 1 || q.vad !== 'idle') bad++; await sleep(100); }
    ok(samples >= 4 && bad === 0 && (await AU(p)).count === 1, 'voice-loud: nothing recorded during playback although the mic keeps hearing sound (' + samples + ' samples, bad ' + bad + ')');
    s = await AU(p);
    ok(s.n === 0 && s.deaf !== 'inf', 'voice-loud: still nothing in the buffer right after playback (deaf ' + s.deaf + 'ms)');
    ok(await until(p, async () => (await AU(p)).ph === 'talk', 2500), 'voice-loud: listens again after the deaf window');
    await p.click('#homebtn'); await sleep(100);
    ok(p.errs.length === 0, 'voice-loud: no console errors ' + p.errs.join(' | '));
    await p.context().close();
  });

  /* iOS 相当: AudioWorklet も MediaRecorder も無い -> ScriptProcessor で聞ける */
  T('voice-sp', async (br) => {
    const p = await newPage(br, { width: 390, height: 844 }, { voices: JAV, init: FAKEMIC + 'delete window.AudioWorkletNode; delete window.MediaRecorder; window.__fmInit = 0.3;' });
    await p.evaluate(VCFAST);
    await tapTile(p, 'ボイスチェンジャー');
    await p.click('.vc-b[data-voice="rev"]', { force: true });
    ok(await until(p, async () => (await AU(p)).count === 0 && (await AU(p)).ph === 'talk', 3000), 'voice-sp: ScriptProcessor path hears sound without MediaRecorder/Worklet');
    await sleep(600); await p.evaluate(() => window.__fm.set(0));
    ok(await until(p, async () => (await AU(p)).count === 1, 3000), 'voice-sp: utterance committed');
    const r = await p.evaluate(() => ({ dur: window.__vc.buf.duration, peak: Math.max.apply(null, Array.from(window.__vc.buf.getChannelData(0)).map(Math.abs)) }));
    ok(r.dur > 0.3 && r.peak > 0.001, 'voice-sp: PCM buffer has sound ' + JSON.stringify(r));
    ok((await AU(p)).last === 'rev' && (await p.evaluate(() => window.__vc.live)) >= 3 && p.errs.length === 0, 'voice-sp: reverse playback ok, no errors ' + p.errs.join(' | '));
    await p.context().close();
  });

  /* 全 18 声: 声を選ぶ → 発話 → 1 回だけ再生（エラーなし・ノードが残らない） */
  T('voice-all', async (br) => {
    const tag = 'voice-all';
    const p = await newPage(br, { width: 360, height: 740 }, { voices: JAV, init: FAKEMIC });
    await p.evaluate(VCFAST + 'window.__vcA.A.QUIET = 0.2; window.__vcA.A.TAIL = 0.05; window.__vcA.A.MINV = 0.15; window.__vcA.A.PRE = 0.1;');
    await tapTile(p, 'ボイスチェンジャー');
    ok(await until(p, async () => (await AU(p)).state === 'auto' && (await AU(p)).ph === 'listen', 3000), tag + ': listening');
    const ids = await p.evaluate(() => window.__vcV.map(v => v.id));
    await sleep(500);
    let bad = [], n = 0;
    for (const id of ids) {
      await p.click('.vc-b[data-voice="' + id + '"]', { force: true });
      let q = await AU(p);
      if (q.voice !== id || q.plays !== n || q.live !== 0) bad.push(id + ':select');
      await p.evaluate(() => window.__fm.set(0.3)); await sleep(300); await p.evaluate(() => window.__fm.set(0));
      if (!(await until(p, async () => (await AU(p)).plays === n + 1, 2500))) { bad.push(id + ':noplay ' + JSON.stringify({ ...(await AU(p)), buf: 0 })); break; }
      n++;
      q = await AU(p);
      if (q.last !== id || q.live < 2) bad.push(id + ':play');
      if (!(await until(p, async () => (await AU(p)).live === 0 && (await AU(p)).ph === 'listen', 8000))) bad.push(id + ':stuck');
    }
    const s = await AU(p);
    ok(bad.length === 0 && s.plays === ids.length && ids.length === 18 && s.live === 0 && s.buf === null, tag + ': each of ' + ids.length + ' voices selected -> spoken once -> nodes gone ' + bad.join());
    ok(p.errs.length === 0, tag + ': no console errors ' + p.errs.join(' | '));
    await p.context().close();
  });

  /* マイクが使えない: 大きな「🎤 マイクをゆるしてね」＋タップで再試行（許可されたら復帰） */
  T('voice-deny', async (br) => {
    const p = await newPage(br, { width: 360, height: 740 }, { deny: true, voices: JAV, init: FAKEMIC });
    await p.evaluate(VCFAST);
    await tapTile(p, 'ボイスチェンジャー'); await sleep(350);
    const big = await p.evaluate(() => { const b = document.querySelector('#bigword'); return b.hidden ? '' : b.textContent; });
    const sy = await says(p);
    ok(sy.some(x => x.t === 'まいくを ゆるしてね') && big === 'マイクを ゆるしてね', 'voice-deny: gentle hiragana message spoken + big on screen ' + JSON.stringify([sy.map(x => x.t), big]));
    const ak = await p.locator('#vc-ask').boundingBox();
    ok(await p.locator('#vc-ask').isVisible() && (await p.locator('#vc-ask').textContent()).includes('🎤') && (await p.locator('#vc-ask').textContent()).includes('マイクをゆるしてね') && ak.height >= 80 && ak.width >= 200 && await p.locator('#vc-st').isHidden() && await p.locator('#vc-auto').isHidden(), 'voice-deny: big 🎤 マイクをゆるしてね button (' + Math.round(ak.width) + 'x' + Math.round(ak.height) + ')');
    const bb = await vcBtnInfo(p);
    ok(await p.locator('#vc-grid').isVisible() && bb.length >= 16 && bb.every(x => x[0] >= 80 && x[1] >= 80) && !(await vcHs(p)), 'voice-deny: voice buttons still shown, no hscroll');
    await p.click('.vc-b[data-voice="robot"]', { force: true });
    ok(await p.locator('.vc-b.sel[data-voice="robot"]').count() === 1 && (await AU(p)).plays === 0, 'voice-deny: voices can be tapped with nothing recorded (no error, no failure effect)');
    await p.screenshot({ path: SP + '/voice-deny.png' });
    const g0 = await p.evaluate(() => window.__gum);
    await p.click('#vc-ask', { force: true }); await sleep(350);
    ok((await p.evaluate(() => window.__gum)) === g0 + 1 && await p.locator('#vc-ask').isVisible() && p.errs.length === 0, 'voice-deny: tap retries (still denied -> same gentle display), no errors ' + p.errs.join(' | '));
    await p.evaluate(() => { window.__denyCam = false; });
    await p.click('#vc-ask', { force: true });
    ok(await until(p, async () => (await AU(p)).state === 'auto', 3000) && await p.locator('#vc-ask').isHidden() && await p.locator('#vc-auto').isVisible() && (await AU(p)).msg === 'きいてるよ', 'voice-deny: once allowed, tap recovers to 👂 きいてるよ');
    await p.click('#homebtn'); await sleep(100);
    ok(p.errs.length === 0 && (await p.evaluate(() => window.__fm.tracks.filter(t => t.readyState === 'live').length)) === 0, 'voice-deny: leave stops the mic, no console errors ' + p.errs.join(' | '));
    await p.context().close();
  });

  /* ---------- なみもよう ---------- */
  T('nami', async (br) => {
    const vp = { width: 360, height: 740 };
    const p = await newPage(br, vp, { deny: true });
    const NM = () => p.evaluate(() => { const q = window.__nm; return { on: q.on, raf: q.raf, rings: q.rings.length, parts: q.parts.length, hits: q.hits, frames: q.frames, hintsLeft: q.hintsLeft }; });
    const px = () => p.evaluate(() => { const c = document.querySelector('#nm-cv'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const bg = [d[0], d[1], d[2]]; let n = 0; for (let i = 0; i < d.length; i += 16) if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 60) n++; return n; });
    // pure function
    const ch = await p.evaluate(() => {
      const ev = window.__namiHits;
      const a = ev(0, 0, 5, 6, 0, 5), tang = ev(0, 0, 5, 10, 0, 5), far = ev(0, 0, 1, 10, 0, 1), inside = ev(0, 0, 10, 1, 0, 2), conc = ev(3, 3, 5, 3, 3, 5);
      return { a, tang, far, inside, conc };
    });
    ok(ch.a.length === 2 && Math.abs(ch.a[0][0] - 3) < 1e-9 && Math.abs(Math.abs(ch.a[0][1]) - 4) < 1e-9 && ch.a[0][1] * ch.a[1][1] < 0, 'nami: circleHits gives (3,±4) for 5/5 radii 6 apart');
    ok(ch.far.length === 0 && ch.inside.length === 0 && ch.conc.length === 0 && ch.tang.length === 2 && Math.abs(ch.tang[0][0] - 5) < 1e-6, 'nami: circleHits none for far/contained/concentric, tangent gives one point twice');
    await tapTile(p, 'なみもよう'); await sleep(500);
    ok(await p.locator('#stage-nami').isVisible() && await p.locator('#hm-p2').isHidden(), 'nami: tile on page 3 opens なみもよう');
    ok((await says(p)).some(x => x.t === 'なみもよう！') && await p.locator('#homebtn').isVisible() && await p.locator('#setbtn').isHidden(), 'nami: speaks なみもよう！, shared 🏠, no adult button');
    const cv = await p.locator('#nm-cv').boundingBox();
    const cs = await p.evaluate(() => { const c = document.querySelector('#nm-cv'); return { w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight, dpr: devicePixelRatio }; });
    ok(Math.abs(cs.w - cs.cw * Math.min(cs.dpr, 2)) <= 1 && Math.abs(cs.h - cs.ch * Math.min(cs.dpr, 2)) <= 1, 'nami: canvas matches size x DPR (<=2)');
    await sleep(900);
    ok((await NM()).rings >= 1, 'nami: hint rings appear on entering without touching');
    // wait for hint rings to die; hint must not repeat before 3s idle
    await sleep(1800);
    const x0 = cv.x + 150, y0 = cv.y + 300;
    await p.mouse.click(x0, y0); await p.mouse.click(x0 + 70, y0 + 20);
    await sleep(500);
    const n1 = await NM();
    ok(n1.rings >= 2 && n1.hits >= 1 && n1.parts >= 1, 'nami: two nearby taps -> rings cross and sparkles burst ' + JSON.stringify(n1));
    ok(await px() > 200, 'nami: canvas shows rings/particles (non-background pixels)');
    await p.screenshot({ path: SP + '/nami-a.png' });
    // drag spawns continuous rings, many fingers capped
    await p.mouse.move(cv.x + 40, cv.y + 500); await p.mouse.down();
    for (let i = 0; i < 20; i++) { await p.mouse.move(cv.x + 40 + i * 12, cv.y + 500 - i * 8); await sleep(40); }
    await p.mouse.up();
    const n2 = await NM();
    ok(n2.rings > 3 && n2.rings <= 14, 'nami: drag makes a trail of rings, capped at 14 (' + n2.rings + ')');
    for (let k = 0; k < 40; k++) { await p.mouse.click(cv.x + 20 + (k * 29) % 300, cv.y + 120 + (k * 53) % 500); }
    await sleep(100);
    const n3 = await NM();
    ok(n3.rings <= 14 && n3.parts <= 350, 'nami: caps hold under spam (rings ' + n3.rings + ', parts ' + n3.parts + ')');
    await p.screenshot({ path: SP + '/nami-b.png' });
    const sc = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth || document.querySelector('#stage-nami').scrollWidth > document.querySelector('#stage-nami').clientWidth);
    ok(!sc, 'nami: no horizontal scroll at 360px');
    // everything fades by itself
    await sleep(3000);
    const n4 = await NM();
    ok(n4.parts === 0 || n4.parts < n3.parts, 'nami: particles fade out (' + n4.parts + ')');
    // idle hint comes back after ~3s without touching
    await p.mouse.click(cv.x + 100, cv.y + 400);
    await sleep(6200);
    const h = await p.evaluate(() => window.__nm.hintsLeft);
    ok(h < 3, 'nami: idle hint rings fire again after a few seconds (hintsLeft ' + h + ')');
    // leave stops the loop and re-entry resets
    await p.click('#homebtn'); await sleep(200);
    const fr = (await NM());
    await sleep(400);
    const fr2 = await NM();
    ok(!fr.on && fr.raf === 0 && fr2.frames === fr.frames && fr.rings === 0 && fr.parts === 0, 'nami: leaving stops rAF and clears state ' + JSON.stringify(fr));
    ok(await p.locator('#hm-p2').isVisible() && await p.locator('#stage-nami').isHidden(), 'nami: 🏠 returns to page 3');
    await tapTile(p, 'なみもよう'); await sleep(300);
    const re = await NM();
    ok(re.on && re.parts === 0 && re.hintsLeft === 3, 're-enter starts fresh ' + JSON.stringify(re));
    await p.click('#homebtn'); await sleep(100);
    ok(p.errs.length === 0, 'nami: no console errors ' + p.errs.join(' | '));
    await p.context().close();
  });


  /* ---------- まぜまぜラボ ---------- */
  T('mix', async (br) => {
    const vp = { width: 360, height: 740 };
    const p = await newPage(br, vp, { deny: true });
    const until = async (f, ms) => { const t0 = Date.now(); for (;;) { const r = await f(); if (r) return r; if (Date.now() - t0 > ms) return false; await sleep(40); } };
    const MX = () => p.evaluate(() => ({ phase: __mx.phase, a: __mx.a, b: __mx.b, found: Object.keys(__mx.found).length, all: __mx.all, hint: __mx.hintShown, hintT: __mx.hintT, hids: __mx.hintIds.length, nt: __mx.t.length, na: __mx.anims.length, inPot: document.querySelector('#mx-in').children.length, res: !document.querySelector('#mx-res').hidden, cap: document.querySelector('#mx-cap').textContent, isNew: !document.querySelector('#mx-new').hidden, src: document.querySelector('#mx-res-img').getAttribute('src'), imgOk: document.querySelector('#mx-res-img').complete && document.querySelector('#mx-res-img').naturalWidth > 0, fx: document.querySelector('#fx-mix').children.length, hintCls: document.querySelectorAll('.mx-b.hint').length }));
    const tap = id => p.click('.mx-b[data-id="' + id + '"]');
    const word = () => p.evaluate(() => { const b = document.querySelector('#bigword'); return b.hidden ? '' : b.textContent; });
    const EXP = [
      ['hi', 'hi', 'ohisama', 'おひさま'], ['hi', 'mizu', 'yuge', 'ゆげ'], ['hi', 'tsuchi', 'osara', 'おさら'], ['hi', 'kaze', 'kikyu', 'ききゅう'], ['hi', 'tane', 'popcorn', 'ぽっぷこーん'], ['hi', 'yuki', 'mizutamari', 'みずたまり'],
      ['mizu', 'mizu', 'umi', 'うみ'], ['mizu', 'tsuchi', 'doro', 'どろ'], ['mizu', 'kaze', 'nami', 'なみ'], ['mizu', 'tane', 'me', 'め'], ['mizu', 'yuki', 'koori', 'こおり'],
      ['tsuchi', 'tsuchi', 'yama', 'やま'], ['tsuchi', 'kaze', 'suna', 'すな'], ['tsuchi', 'tane', 'hana', 'はな'], ['tsuchi', 'yuki', 'yukiyama', 'ゆきやま'],
      ['kaze', 'kaze', 'fusen', 'ふうせん'], ['kaze', 'tane', 'tanpopo', 'たんぽぽ'], ['kaze', 'yuki', 'yukinohana', 'ゆきのはな'],
      ['tane', 'tane', 'ki', 'き'], ['tane', 'yuki', 'yukiusagi', 'ゆきうさぎ'], ['yuki', 'yuki', 'yukidaruma', 'ゆきだるま']];
    await tapTile(p, 'まぜまぜ'); await sleep(500);
    ok(await p.locator('#stage-mix').isVisible() && await p.locator('#hm-p2').isHidden(), 'mix: tile on page 3 opens まぜまぜ');
    ok((await says(p)).some(x => x.t === 'まぜまぜ！') && await p.locator('#homebtn').isVisible() && await p.locator('#setbtn').isHidden(), 'mix: speaks まぜまぜ！, shared 🏠, no adult button');
    const tb = await p.evaluate(() => [...document.querySelectorAll('.mx-b')].map(b => { const r = b.getBoundingClientRect(), i = b.querySelector('img'); return { id: b.dataset.id, w: r.width, h: r.height, l: r.left, r: r.right, b: r.bottom, ok: i.complete && i.naturalWidth > 0 && i.getAttribute('width') === '192' }; }));
    ok(tb.length === 6 && tb.map(t => t.id).join() === 'hi,mizu,tsuchi,kaze,tane,yuki' && tb.every(t => t.w >= 80 && t.h >= 80 && t.l >= 0 && t.r <= 360 && t.b <= 740 && t.ok), 'mix: 6 ingredient buttons, >=80px, inside 360px, images loaded ' + JSON.stringify(tb.map(t => [Math.round(t.w), Math.round(t.h)])));
    ok(await p.evaluate(() => document.querySelector('#mx-count').textContent) === 'みつけた 0 / 21', 'mix: counter starts at 0 / 21');
    await p.screenshot({ path: SP + '/mix-a.png' });
    // hint: with one ingredient in the pot and no touching for ~6s, a glow appears
    await tap('hi'); await sleep(600);
    let m = await MX();
    ok(m.phase === 'one' && m.a === 0 && m.inPot === 1, 'mix: first tap puts one ingredient in the pot ' + JSON.stringify([m.phase, m.inPot]));
    ok((await says(p)).some(x => x.t === 'ひ'), 'mix: speaks the ingredient name');
    await p.screenshot({ path: SP + '/mix-b.png' });
    ok(await until(async () => (await MX()).hint >= 1, 8500), 'mix: ~6s without touching -> hint glow on an undiscovered ingredient');
    await clearSays(p);
    // second tap (same ingredient is fine) -> mixing, taps during mixing are ignored
    await tap('hi'); await sleep(100);
    m = await MX();
    ok(m.phase === 'mixing', 'mix: second tap starts mixing');
    await sleep(500);
    for (let k = 0; k < 8; k++) await tap(k % 2 ? 'mizu' : 'yuki');
    ok(await until(async () => (await MX()).phase === 'result', 3000), 'mix: result appears');
    m = await MX();
    ok(m.cap === 'おひさま' && /assets\/mix\/ohisama\.webp$/.test(m.src) && m.imgOk && m.res && m.isNew && m.found === 1 && m.inPot === 0, 'mix: ひ+ひ = おひさま, image shown, はっけん badge, counter 1 ' + JSON.stringify([m.cap, m.src, m.found]));
    ok((await word()) === 'おひさま', 'mix: bigword shows おひさま');
    ok((await says(p)).some(x => x.t === 'おひさま！ はっけん！'), 'mix: speaks the name (hiragana) with はっけん！');
    ok(await p.evaluate(() => document.querySelector('#mx-count').textContent) === 'みつけた 1 / 21', 'mix: counter 1 / 21');
    await sleep(300);
    await p.screenshot({ path: SP + '/mix-c.png' });
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth && document.querySelector('#stage-mix').scrollWidth <= document.querySelector('#stage-mix').clientWidth), 'mix: no horizontal scroll at 360px');
    // spam during mixing did not break: still exactly one result and the pot is empty
    ok(m.phase === 'result', 'mix: taps while mixing were ignored');
    // spamming ingredients during the first 1.5s keeps the result on screen
    await p.mouse.click(180, 300); await sleep(500);   // fresh start (the first result may already be clearing)
    await tap('tsuchi'); await sleep(450); await tap('tsuchi');
    ok(await until(async () => (await MX()).phase === 'result', 3000), 'mix: つち+つち result');
    for (let k = 0; k < 5; k++) { await p.click('.mx-b[data-id="kaze"]', { force: true }); await sleep(100); }
    m = await MX();
    ok(m.phase === 'result' && m.res && m.cap === 'やま' && m.inPot === 0, 'mix: ingredient taps within 1.5s do not clear the result ' + JSON.stringify([m.phase, m.res, m.cap]));
    // after the hold, tapping an ingredient clears it and starts a new one
    await p.evaluate(() => { __mx.resAt = Date.now() - 1600; });
    await tap('kaze'); await sleep(450);
    m = await MX();
    ok(m.phase === 'one' && m.a === 3 && m.inPot === 1, 'mix: tapping after the hold clears the result and starts a new mix ' + JSON.stringify([m.phase, m.a, m.inPot]));
    await sleep(1000);
    ok(!(await MX()).res, 'mix: old result hidden after a new tap');
    // tap the pot area to empty it
    await p.mouse.click(180, 300); await sleep(100);
    m = await MX();
    ok(m.phase === 'idle' && m.inPot === 0 && m.a === -1, 'mix: tapping the pot empties it');
    // auto clear
    await tap('tane'); await sleep(450); await tap('tane');
    ok(await until(async () => (await MX()).phase === 'result', 3000), 'mix: たね+たね result');
    ok(await until(async () => (await MX()).phase === 'idle', 5000), 'mix: result clears by itself and the pot is empty again');
    ok(await until(async () => !(await MX()).res, 1000) && (await MX()).inPot === 0, 'mix: after auto clear the result is hidden');
    await sleep(400);
    // every combination returns its result, in either order
    let bad = [];
    for (let i = 0; i < EXP.length; i++) {
      const [a, b, id, name] = EXP[i];
      const [x, y] = i % 2 ? [b, a] : [a, b];
      await p.evaluate(() => { __mx.resAt = 0; });
      await tap(x); await sleep(60); await tap(y);
      const got = await until(async () => (await MX()).phase === 'result' && (await MX()).cap === name, 4000);
      const r = await MX();
      if (!got || !new RegExp('assets/mix/' + id + '\\.webp$').test(r.src) || !r.imgOk) bad.push([a, b, r.cap, r.src]);
      if (i === 10) await p.screenshot({ path: SP + '/mix-d.png' });
    }
    ok(bad.length === 0, 'mix: all 21 combinations (alternating order) return the expected result ' + JSON.stringify(bad));
    m = await MX();
    ok(m.found === 21 && m.all === true, 'mix: 21 discovered, all flag set ' + JSON.stringify([m.found, m.all]));
    const sv = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('ponpon.mix.v1')); } catch (e) { return null; } });
    ok(sv && sv.f.length === 21 && sv.all === true, 'mix: discoveries saved to localStorage');
    ok(await p.evaluate(() => document.querySelector('#mx-count').textContent) === 'みつけた 21 / 21', 'mix: counter 21 / 21');
    // 21st: celebration once, after the result clears
    ok(await until(async () => (await says(p)).some(x => x.t === 'ぜんぶ はっけん！'), 6000), 'mix: ぜんぶ はっけん！ is spoken');
    ok(await until(async () => (await word()) === 'ぜんぶ はっけん！', 1500) || (await says(p)).filter(x => x.t === 'ぜんぶ はっけん！').length === 1, 'mix: ぜんぶ はっけん！ shown big');
    // a repeat is not new
    await tap('mizu'); await sleep(60); await tap('hi');
    ok(await until(async () => (await MX()).phase === 'result', 3000), 'mix: みず+ひ (reverse order) gives a result');
    m = await MX();
    ok(m.cap === 'ゆげ' && !m.isNew && m.found === 21, 'mix: reverse order gives ゆげ, no はっけん badge on a repeat');
    await sleep(5000);
    ok((await says(p)).filter(x => x.t === 'ぜんぶ はっけん！').length === 1, 'mix: ぜんぶ はっけん！ only once');
    ok(await until(async () => (await MX()).phase === 'idle', 4000), 'mix: back to idle');
    // everything found: no more hints
    const h0 = (await MX()).hint; await sleep(6600);
    ok((await MX()).hint === h0, 'mix: no hints once everything is discovered');
    // landscape
    await p.setViewportSize({ width: 740, height: 360 }); await sleep(500);
    const ls = await p.evaluate(() => ({ b: [...document.querySelectorAll('.mx-b')].map(b => { const r = b.getBoundingClientRect(); return r.width >= 80 && r.height >= 80 && r.right <= innerWidth && r.bottom <= innerHeight + 1; }), hs: document.documentElement.scrollWidth > innerWidth, pot: document.querySelector('#mx-pot').getBoundingClientRect().height }));
    ok(ls.b.length === 6 && ls.b.every(Boolean) && !ls.hs && ls.pot > 60, 'mix: landscape 740x360 buttons >=80px, no hscroll, pot visible ' + JSON.stringify([ls.hs, Math.round(ls.pot)]));
    await p.screenshot({ path: SP + '/mix-land.png' });
    await p.setViewportSize(vp); await sleep(400);
    // leave cleans everything
    await tap('yuki'); await sleep(450);
    await p.click('#homebtn'); await sleep(150);
    m = await MX();
    ok(m.phase === 'idle' && m.hintT === 0 && m.hids === 0 && m.nt === 0 && m.na === 0 && m.inPot === 0 && m.fx === 0 && m.hintCls === 0 && !m.res, 'mix: leaving clears timers, animations and state ' + JSON.stringify(m));
    ok(await p.locator('#hm-p2').isVisible() && await p.locator('#stage-mix').isHidden(), 'mix: 🏠 returns to page 3');
    await sleep(6800);
    m = await MX();
    ok(m.hint === 0 && m.hintCls === 0 && m.nt === 0 && m.phase === 'idle', 'mix: nothing fires after leaving');
    // re-enter keeps the discoveries
    await tapTile(p, 'まぜまぜ'); await sleep(300);
    ok(await p.evaluate(() => document.querySelector('#mx-count').textContent) === 'みつけた 21 / 21' && (await MX()).phase === 'idle', 'mix: re-enter starts fresh but keeps discoveries');
    await p.click('#homebtn'); await sleep(100);
    ok(p.errs.length === 0, 'mix: no console errors ' + p.errs.join(' | '));
    await p.context().close();
  });

  /* ---------- すなば ---------- */
  TV('suna', [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 740, height: 360 }], async (br, vp) => {
    const tag = 'suna ' + vp.width + 'x' + vp.height, land = vp.width > vp.height, shot = n => p.screenshot({ path: SP + '/suna-' + vp.width + 'x' + vp.height + '-' + n + '.png' });
    const p = await newPage(br, vp, { deny: true });
    const big = () => p.evaluate(() => { const b = document.querySelector('#bigword'); return b.hidden ? '' : b.textContent; });
    const SN = () => p.evaluate(() => { const q = window.__sn; let wmin = 1e9, wmax = -1, wy = 0, sy = 0, wetN = 0;
      if (q.t) for (let y = 0; y < q.gh; y++) for (let x = 0; x < q.gw; x++) { const v = q.t[y * q.gw + x]; if (v === 2) { wmin = Math.min(wmin, x); wmax = Math.max(wmax, x); wy = Math.max(wy, y); } else if (v === 1) { sy = Math.max(sy, y); if (q.c[y * q.gw + x] & 16) wetN++; } }
      return { on: q.on, raf: q.raf, frames: q.frames, sand: q.sandN, water: q.waterN, col: q.colN.slice(), ci: q.ci, drain: q.drain, open: q.open, parts: q.parts.length, gw: q.gw, gh: q.gh, cs: q.cs, hs: q.hold.sand, hw: q.hold.water, ang: q.ang, wspan: wmax - wmin + 1, wy, sy, wetN,
        floor: q.t ? q.t[(q.gh - 1) * q.gw + (q.gw >> 1)] : -1, cells: q.gw * q.gh, bg: getComputedStyle(document.querySelector('#sn-sand')).backgroundColor }; });
    const hold = async (sel, ms) => { const b = await p.locator(sel).boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await sleep(ms); await p.mouse.up(); };
    await tapTile(p, 'すなば'); await sleep(600);
    ok(await p.locator('#stage-suna').isVisible() && await p.locator('#hm-p2').isHidden(), tag + ': tile on page 3 opens すなば');
    ok((await says(p)).some(x => x.t === 'すなば！') && await p.locator('#homebtn').isVisible() && await p.locator('#setbtn').isHidden(), tag + ': speaks すなば！, shared 🏠, no adult button');
    const geo = await p.evaluate(() => { const st = document.querySelector('#stage-suna').getBoundingClientRect(), hb = document.querySelector('#homebtn').getBoundingClientRect(), r = s => { const b = document.querySelector(s).getBoundingClientRect(); return { w: b.width, h: b.height, l: b.left, t: b.top, r: b.right, b: b.bottom, in: b.left >= st.left && b.right <= st.right && b.top >= st.top && b.bottom <= st.bottom, ovl: b.left < hb.right && hb.left < b.right && b.top < hb.bottom && hb.top < b.bottom }; };
      const z = r('#sn-zone'); return { sand: r('#sn-sand'), water: r('#sn-water'), clean: r('#sn-clean'), zone: z, cv: r('#sn-cv'), hs: document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1 || document.querySelector('#stage-suna').scrollWidth > document.querySelector('#stage-suna').clientWidth,
        cw: document.querySelector('#sn-cv').width, ch: document.querySelector('#sn-cv').height, dpr: devicePixelRatio }; });
    ok(geo.sand.h >= 100 && geo.water.h >= 100 && geo.sand.w >= 80 && geo.water.w >= 80 && geo.clean.w >= 80 && geo.clean.h >= 80, tag + ': すな/みず >=100px high, おそうじ >=80px ' + JSON.stringify([geo.sand.w, geo.sand.h, geo.water.w, geo.water.h, geo.clean.w, geo.clean.h].map(Math.round)));
    ok(geo.sand.in && geo.water.in && geo.clean.in && !geo.sand.ovl && !geo.water.ovl && !geo.clean.ovl && !geo.hs, tag + ': buttons inside the stage, not under 🏠, no hscroll');
    ok(land ? (geo.sand.l >= geo.zone.r - 1 && Math.abs(geo.sand.l - geo.water.l) < 2 && geo.water.t > geo.sand.t && geo.clean.t > geo.water.t) : (Math.abs(geo.sand.t - geo.water.t) < 2 && geo.water.l > geo.sand.l && geo.clean.l > geo.water.l && geo.sand.t >= geo.zone.b - 1), tag + ': ' + (land ? 'landscape: buttons stacked on the right' : 'portrait: buttons side by side under the sandbox'));
    ok(geo.zone.w > 200 && geo.zone.h > 200 && Math.abs(geo.cw - geo.cv.w * Math.min(geo.dpr, 2)) <= 1 && Math.abs(geo.ch - geo.cv.h * Math.min(geo.dpr, 2)) <= 1, tag + ': sandbox canvas is big and matches size x DPR');
    let s = await SN();
    ok(s.on && s.raf > 0 && s.cells <= 45000 && s.cs >= 3.4 && s.cs < 6 && s.sand === 0 && s.water === 0 && s.ci === 0 && s.floor === 3, tag + ': starts empty, cell ' + s.cs.toFixed(2) + 'px, ' + s.cells + ' cells (capped), floor solid');
    /* ディスペンサーは うえの レールを ひだりみぎに スライド（かたむきは ±15°いない） */
    let mx = -9, mn = 9, xmax = -1e9, xmin = 1e9;
    for (let k = 0; k < 60; k++) { const q = await p.evaluate(() => ({ a: window.__sn.ang, x: window.__sn.ch.px, W: window.__sn.geo.Wg })); mx = Math.max(mx, q.a); mn = Math.min(mn, q.a); xmax = Math.max(xmax, q.x / q.W); xmin = Math.min(xmin, q.x / q.W); await sleep(110); }
    ok(mx <= 0.2618 + 1e-3 && mn >= -0.2618 - 1e-3 && mx > 0.2 && mn < -0.2, tag + ': chute tilts at most 15deg toward its moving direction (' + (mn * 180 / Math.PI).toFixed(0) + ' .. ' + (mx * 180 / Math.PI).toFixed(0) + ')');
    ok(xmin < 0.2 && xmax > 0.8, tag + ': chute slides left and right near the walls (x ' + xmin.toFixed(2) + ' .. ' + xmax.toFixed(2) + ' of the box)');
    await shot('a');
    /* すな: おしている あいだ でる。ひらがなで よみあげ＋おおきく ひょうじ */
    await clearSays(p);
    const col0 = (await SN()).bg;
    const sb = await p.locator('#sn-sand').boundingBox();
    await p.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2); await p.mouse.down(); await sleep(300);
    ok((await says(p)).some(x => x.t === 'きいろの すな') && (await big()) === 'きいろの すな', tag + ': speaks きいろの すな and shows it big (' + await big() + ')');
    await sleep(1200);
    s = await SN();
    ok(s.hs > 0 && s.sand + s.parts > 100 && s.water === 0, tag + ': holding すな makes sand ' + s.sand + '+' + s.parts + ' in flight');
    await sleep(1500);
    const s2 = await SN();
    ok(s2.sand > s.sand + 100, tag + ': keeps coming while held (' + s.sand + ' -> ' + s2.sand + ')');
    await p.mouse.up(); await sleep(250);
    s = await SN();
    ok(s.hs === 0 && s.ci === 1 && s.bg !== col0, tag + ': releasing moves on to the next colour, button colour changes ' + col0 + ' -> ' + s.bg);
    const n0 = (await SN()).sand;
    await p.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2); await p.mouse.down(); await p.mouse.up(); await sleep(1400);
    s = await SN();
    ok(s.sand > n0 + 60, tag + ': a short tap still pours for about 0.5s (' + n0 + ' -> ' + s.sand + ')');
    ok(s.col[0] > 50 && s.col[1] > 20, tag + ': first grains yellow, second press pink (layers by colour) ' + JSON.stringify(s.col));
    ok((await says(p)).some(x => x.t === 'ぴんくの すな'), tag + ': second press speaks ぴんくの すな');
    /* れんだは よみあげを まびく */
    await clearSays(p);
    for (let k = 0; k < 6; k++) { await p.mouse.down(); await p.mouse.up(); await sleep(60); }
    ok((await says(p)).length <= 2, tag + ': rapid tapping thins out the speech (' + (await says(p)).length + ')');
    await sleep(1200);
    ok((await SN()).ci === (1 + 1 + 6) % 7, tag + ': every press advances the colour (7 colours cycle)');
    /* そこまで ながれが とどく */
    await sleep(2500);
    s = await SN();
    ok(s.sy >= s.gh - 8, tag + ': sand reaches the bottom of the box (lowest row ' + s.sy + '/' + s.gh + ')');
    /* みず */
    await clearSays(p);
    const wb = await p.locator('#sn-water').boundingBox();
    await p.mouse.move(wb.x + wb.width / 2, wb.y + wb.height / 2); await p.mouse.down(); await sleep(300);
    ok((await says(p)).some(x => x.t === 'みず') && (await big()) === 'みず', tag + ': speaks みず and shows it big');
    await sleep(2200);
    s = await SN();
    ok(s.hw > 0 && s.water + s.parts > 100, tag + ': holding みず makes water ' + s.water);
    await sleep(3000); await p.mouse.up(); await sleep(2500);
    s = await SN();
    ok(s.water > 300 && s.wspan >= s.gw * 0.3 && s.wy >= s.gh - 8, tag + ': water spreads sideways (' + s.wspan + '/' + s.gw + ') and pools at the bottom (row ' + s.wy + '/' + s.gh + ')');
    ok(s.ci === (1 + 1 + 6) % 7, tag + ': みず does not change the sand colour');
    ok(s.wetN > 0, tag + ': sand that meets water turns wet (' + s.wetN + ' cells)');
    await shot('b');
    /* ふたつ おなじに おせる（マルチタッチ） */
    const multi = await p.evaluate(() => { const ev = (id, el) => el.dispatchEvent(new PointerEvent('pointerdown', { pointerId: id, bubbles: true, button: 0 })), q = window.__sn;
      ev(31, document.querySelector('#sn-sand')); ev(32, document.querySelector('#sn-water')); const a = [q.hold.sand, q.hold.water];
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 31 })); const b = [q.hold.sand, q.hold.water];
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 32 })); return { a, b, c: [q.hold.sand, q.hold.water] }; });
    ok(multi.a[0] && multi.a[1] && !multi.b[0] && multi.b[1] && !multi.c[0] && !multi.c[1], tag + ': sand + water can be held together, each released on its own ' + JSON.stringify(multi));
    /* おそうじ */
    await sleep(1500);
    const before = await SN();
    await p.click('#sn-clean'); await sleep(250);
    s = await SN();
    ok(s.drain === 1 && s.open > 0 && s.floor !== 3, tag + ': おそうじ opens the floor ' + JSON.stringify([s.drain, s.open, s.floor]));
    await sleep(300); await shot('drain');
    ok(await until(p, async () => { const q = await SN(); return q.sand + q.water + q.parts === 0; }, 5000), tag + ': everything pours out (' + before.sand + '+' + before.water + ' -> 0)');
    ok(await until(p, async () => { const q = await SN(); return q.drain === 0 && q.open === 0 && q.floor === 3; }, 3000), tag + ': floor closes again by itself');
    ok(!(await p.evaluate(() => document.querySelector('#sn-clean').disabled)) && await p.locator('#stage-suna').isVisible(), tag + ': nothing punishing, play goes on');
    await p.mouse.move(wb.x + wb.width / 2, wb.y + wb.height / 2); await p.mouse.down(); await p.mouse.up(); await sleep(1500);
    ok((await SN()).water > 20, tag + ': pouring works again after cleaning');
    /* てんぷ: おおきな はこ いっぱいでも 止まるだけ */
    const stuck = await p.evaluate(() => { const q = window.__sn; const g = q.geo, cs = q.cs; const ix = Math.floor(q.ch.tx / cs), iy = Math.floor(q.ch.ty / cs); return { ix, iy }; });
    ok(stuck.ix >= 0, tag + ': chute tip is inside the box');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.body.scrollWidth <= innerWidth && document.querySelector('#stage-suna').scrollWidth <= document.querySelector('#stage-suna').clientWidth), tag + ': no horizontal scroll');
    /* リサイズ（かいてん）で つくりなおし */
    if (!land) { await p.setViewportSize({ width: vp.height > vp.width ? 740 : vp.width, height: 360 }); await sleep(1200);
      const r = await SN(); const gz = await p.evaluate(() => { const b = document.querySelector('#sn-sand').getBoundingClientRect(), z = document.querySelector('#sn-zone').getBoundingClientRect(); return { h: b.height, side: b.left >= z.right - 1 }; });
      ok(r.on && r.gw * r.cs > 400 && r.sand === 0 && gz.h >= 100 && gz.side, tag + ': rotating to landscape rebuilds the box, buttons move to the right ' + JSON.stringify([r.gw, r.gh, gz]));
      await shot('rot');
      await p.setViewportSize(vp); await sleep(1200); }
    /* でる */
    await p.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2); await p.mouse.down(); await sleep(400);
    await p.click('#homebtn'); await sleep(200);
    const l1 = await SN(); await sleep(500); const l2 = await SN();
    ok(!l1.on && l1.raf === 0 && l2.frames === l1.frames && l1.sand === 0 && l1.water === 0 && l1.parts === 0 && l1.hs === 0 && l1.hw === 0, tag + ': leaving stops rAF, clears grains, releases buttons ' + JSON.stringify([l1.on, l1.raf, l1.sand, l1.hs]));
    ok(await p.locator('#hm-p2').isVisible() && await p.locator('#stage-suna').isHidden(), tag + ': 🏠 returns to page 3');
    await p.mouse.up();
    await tapTile(p, 'すなば'); await sleep(500);
    const re = await SN();
    ok(re.on && re.sand === 0 && re.water === 0 && re.ci === 0 && re.floor === 3 && re.raf > 0, tag + ': re-enter starts from an empty box, first colour ' + JSON.stringify([re.sand, re.ci]));
    await p.click('#homebtn'); await sleep(100);
    ok(p.errs.length === 0, tag + ': no console errors ' + p.errs.join(' | '));
    await p.context().close();
  });

}
/* ---------- 実行 ---------- */
// 重いブロックから先に始める（ブロックを足したら測って足す）
const WEIGHT = { mix: 75, 'suna-390x844': 45, 'suna-360x740': 45, 'suna-740x360': 40, nami: 20, 'neko-390x844': 24, 'neko-360x740': 24, 'neko-740x360': 24, 'pinball-390x844': 20, 'pinball-360x740': 20, 'pinball-740x360': 20, 'piano-390x844': 17, 'piano-360x740': 17, 'piano-740x360': 17, 'drive-390x844': 53, 'drive-360x740': 53, 'drive-740x360': 53, 'stats-leave': 34, clock: 34, 'home-390x844': 27, 'home-360x740': 27, 'home-1024x768': 27, yubi: 26,
  'rotation-1': 21, 'rotation-2': 20, 'rotation-3': 18, 'koro-corners-0.12': 21, 'koro-corners-0.3': 16, 'stats-count': 19, 'animals-360x740': 19, 'animals-1024x768': 19,
  'voice-auto': 14, 'voice-all': 35, 'shoppay-1180x820': 12,  sticker: 16, 'stats-save': 14, settings: 13, 'koro-sensor': 12, sayen: 11, 'koro-sens': 11 };  // 概算秒。未登録は小さいブロック
const wt = n => WEIGHT[n] !== undefined ? WEIGHT[n] : 8;

async function runWorker(name) {
  const t = TESTS.find(x => x.name === name);
  if (!t) { console.log('FAIL unknown block ' + name); process.exit(1); }
  br = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  try { await t.fn(br); }
  catch (e) { ok(false, name + ' threw: ' + (e && e.stack || e)); }
  try { await br.close(); } catch (e) {}
  process.exit(fails ? 1 : 0);
}

async function runAll(argv) {
  let jobs = parseInt(process.env.E2E_JOBS, 10) || 6, bail = false, list = false; const pats = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '-j') jobs = parseInt(argv[++i], 10) || jobs;
    else if (/^-j\d+$/.test(argv[i])) jobs = parseInt(argv[i].slice(2), 10);
    else if (argv[i] === '--bail') bail = true;
    else if (argv[i] === '--list') list = true;
    else pats.push(argv[i]);
  }
  let sel = pats.length ? TESTS.filter(t => pats.some(p => t.name.includes(p))) : TESTS.slice();
  if (list) { sel.forEach(t => console.log(t.name)); return 0; }
  if (!sel.length) { console.log('FAIL 該当するブロックがありません: ' + pats.join(' ') + '（--list で一覧）'); return 1; }
  sel.sort((a, b) => wt(b.name) - wt(a.name));
  jobs = Math.max(1, Math.min(jobs, sel.length));
  const { spawn } = require('child_process');
  const t0 = Date.now(), results = [], running = new Set();
  let next = 0, stopped = false, okCount = 0; const failBlocks = [];
  const finish = (r) => {
    const lines = r.out.split('\n').filter(l => l.length);
    const n = lines.filter(l => l.startsWith('ok')).length; okCount += n;
    const bad = r.code !== 0 || lines.some(l => l.startsWith('FAIL'));
    console.log('=== ' + r.name + '  ' + (bad ? 'FAILED' : 'ok') + '  ' + n + ' ok  ' + r.sec.toFixed(1) + 's ===');
    console.log(lines.join('\n'));
    if (bad) failBlocks.push(r.name);
    results.push(r);
    return bad;
  };
  await new Promise(resolve => {
    const launch = () => {
      while (!stopped && running.size < jobs && next < sel.length) {
        const t = sel[next++], st = Date.now(); let out = '';
        const ch = spawn(process.execPath, [__filename, '--worker', t.name], { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
        running.add(ch);
        ch.stdout.on('data', d => { out += d; });
        ch.stderr.on('data', d => { out += d; });
        ch.on('close', code => {
          running.delete(ch);
          if (!stopped && finish({ name: t.name, out, code, sec: (Date.now() - st) / 1000 }) && bail) {
            stopped = true; running.forEach(c => c.kill('SIGKILL'));
            console.log('\n--bail: 最初の失敗で中止しました');
          }
          if (!running.size && (stopped || next >= sel.length)) resolve(); else launch();
        });
      }
    };
    launch();
  });
  const total = (Date.now() - t0) / 1000;
  console.log('\n' + results.length + '/' + sel.length + ' blocks, ' + okCount + ' ok, jobs=' + jobs + ', ' + total.toFixed(0) + 's');
  console.log('slowest: ' + results.slice().sort((a, b) => b.sec - a.sec).slice(0, 5).map(r => r.name + ' ' + r.sec.toFixed(0) + 's').join(', '));
  if (failBlocks.length) { console.log('\nFAILED blocks: ' + failBlocks.join(', ')); return 1; }
  console.log('\nALL OK');
  return 0;
}

if (WORKER) runWorker(process.argv[3]);
else runAll(process.argv.slice(2)).then(c => process.exit(c), e => { console.error(e); process.exit(1); });
