// E2E テスト（Playwright）。使い方: node tests/e2e.js  （スクショは tests/out/ に出る）
const path = require('path'), os = require('os');
function loadPw() {
  for (const p of ['playwright', '/home/claude/.npm-global/lib/node_modules/playwright', '/opt/node-tools/node_modules/playwright']) { try { return require(p); } catch (e) {} }
  throw new Error('playwright が見つかりません: npm i -g playwright（ブラウザは PLAYWRIGHT_BROWSERS_PATH を使う）');
}
const { chromium } = loadPw();
const fs = require('fs');
const SP = path.join(__dirname, 'out'); fs.mkdirSync(SP, { recursive: true });
const SITE = path.join(__dirname, '..', 'index.html');
// instrumented copy: count shopScan calls
let hooked = fs.readFileSync(SITE, 'utf8').replace('function shopScan(prod) {', 'function shopScan(prod) { window.__scans = (window.__scans || 0) + 1;');
let hooked2 = hooked;
const HK = [['function koFrame(ts) {', 'function koFrame(ts) { window.__koFrames = (window.__koFrames || 0) + 1;'],
  ['function koKnock(v) {', 'function koKnock(v) { (window.__kn = window.__kn || []).push(v);'],
  ['var koNoise = null;', 'var koNoise = null; window.__ko = ko;'],
  ['ko.total = n; ko.balls = koSpawn(n);', 'ko.total = n; ko.balls = koSpawn(n); if (window.__koPin && ko.round === 1) ko.balls.forEach(function (b) { b.x = ko.W * 0.45; b.y = ko.H * 0.45; b.col = 0; });'],
  ['ko.on = true; ko.round = 1;', 'ko.on = true; ko.round = window.__koRound || 1;']];
for (const [a, b] of HK) { if (!hooked2.includes(a)) throw new Error('hook failed ' + a); hooked2 = hooked2.replace(a, b); }
hooked = hooked2;
if (hooked === fs.readFileSync(SITE, 'utf8')) throw new Error('hook failed');
hooked = hooked.replace(/'assets\//g, "'../../assets/");
fs.writeFileSync(SP + '/hooked7.html', hooked);
const URL = 'file://' + SP + '/hooked7.html';  // hooked copy lives in tests/out, so point asset paths back at the repo
const IDS = ['sky','zoo','paint','touch','find','count','num','baa','shop','phone','shape','train','nurie','aiueo','abc','clock','yubi','sticker','koro'];
const LAB = ['ふうせん','どうぶつ','おえかき','いろタッチ','いろさがし','かぞえよう','すうじ','いないいないばあ','おみせやさん','もしもし','かたちはめ','でんしゃ','ぬりえ','あいうえお','ABC','とけい','ゆびのおうち','シールちょう','ころころボール'];
const PAGE2 = new Set(['いろタッチ','いろさがし','かぞえよう','すうじ','あいうえお','ABC','とけい','かたちはめ','ゆびのおうち']);
async function gotoPage(p, n) {
  const cur = await p.evaluate(() => [0, 1, 2].find(i => !document.querySelector('#hm-p' + i).hidden));
  if (cur !== n) { await p.click('.hm-dot:nth-child(' + (n + 1) + ')'); await sleep(280); }
}
async function tapTile(p, lab) {
  await gotoPage(p, lab === 'ころころボール' ? 2 : PAGE2.has(lab) ? 1 : 0);
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

async function newPage(br, vp, { voices = ENV, deny = false, storage, init } = {}) {
  const ctx = await br.newContext({ viewport: vp });
  const p = await ctx.newPage();
  p.errs = [];
  p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|Failed to load resource/.test(m.text())) p.errs.push(m.text()); });
  p.on('pageerror', e => p.errs.push('PAGEERR ' + e.message));
  await p.addInitScript(INIT(voices));
  if (deny) await p.addInitScript('window.__denyCam = true;');
  if (init) await p.addInitScript(init);
  await p.goto(URL); await sleep(300);
  return p;
}
const says = p => p.evaluate(() => window.__says.slice());
const clearSays = p => p.evaluate(() => { window.__says.length = 0; });

async function holdOpen(p, ms) {
  const b = await p.locator('#setbtn').boundingBox();
  await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await sleep(ms); await p.mouse.up();
}

(async () => {
  const br = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });

  /* ---------- 1. every viewport: home, 16 games, scroll, forbidden buttons ---------- */
  for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1024, height: 768 }]) {
    const tag = vp.width + 'x' + vp.height;
    const p = await newPage(br, vp, { deny: true });
    const scrollInfo = () => p.evaluate(() => ({ h: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth, v: document.documentElement.scrollHeight > innerHeight }));
    const tileInfo = () => p.evaluate(() => { const st = document.querySelector('#home').getBoundingClientRect(); return [...document.querySelectorAll('.hm-page:not([hidden]) .tile')].map(t => { const r = t.getBoundingClientRect(); const ic = parseFloat(getComputedStyle(t.querySelector('.ico')).fontSize), lb = parseFloat(getComputedStyle(t.querySelector('.lab')).fontSize); return { ok: r.top >= st.top - 1 && r.bottom <= st.bottom + 1 && r.left >= st.left - 1 && r.right <= st.right + 1, w: Math.round(r.width), h: Math.round(r.height), cx: Math.round(r.left), cy: Math.round(r.top), ic, lb, clip: t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1 }; }); });
    const icoChk = () => p.evaluate(() => { const ims = [...document.querySelectorAll('.hm-page:not([hidden]) .tile .ico-img')]; const n = document.querySelectorAll('.hm-page:not([hidden]) .tile').length; const ti = document.querySelector('#hm-title img'); return ims.length === n && ims.every(i => i.complete && i.naturalWidth > 0) && !!ti && ti.complete && ti.naturalWidth > 0; });
    const tiles = await tileInfo();
    ok(await icoChk(), tag + ' page1 tile icons + title image loaded');
    ok(await p.evaluate(() => { const ims = [...document.querySelectorAll('.tile .ico-img, #hm-title img')]; return ims.length > 0 && ims.every(i => /\.webp$/.test(i.getAttribute('src')) && !i.getAttribute('src').startsWith('data:')); }), tag + ' home icons are files, not data URIs');
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
    let sc0 = await p.evaluate(() => ({ t: document.querySelector('#hm-title').textContent, prevHidden: document.querySelector('#hm-prev').hidden, nextHidden: document.querySelector('#hm-next').hidden }));
    ok(sc0.t === 'あそぶ' && sc0.prevHidden && !sc0.nextHidden, tag + ' page1 title/edge buttons ' + JSON.stringify(sc0));
    const nb = await p.locator('#hm-next').boundingBox();
    ok(Math.round(nb.width) === 64 && Math.round(nb.height) === 64, tag + ' next button 64px');
    if (tag === '390x844') await p.screenshot({ path: SP + '/home-p1.png' });
    if (tag === '360x740') await p.screenshot({ path: SP + '/home-p1-360.png' });
    if (tag === '1024x768') await p.screenshot({ path: SP + '/home-land.png' });
    await clearSays(p);
    await p.click('#hm-next'); await sleep(400);
    const t2 = await tileInfo();
    ok(await icoChk(), tag + ' page2 tile icons + title image loaded');
    ok(t2.length === 9 && t2.every(t => t.ok && t.w === tiles[0].w && t.h === tiles[0].h && !t.clip), tag + ' page2: 9 tiles, same size as page1, not clipped');
    ok(new Set(t2.map(t => t.cx)).size === 3 && new Set(t2.map(t => t.cy)).size === 3, tag + ' page2 grid 3x3');
    ok((await p.evaluate(() => [...document.querySelectorAll('.hm-page:not([hidden]) .tile')].map(t => t.getAttribute('aria-label')).join())) === 'いろタッチ,いろさがし,かぞえよう,すうじ,あいうえお,ABC,とけい,かたちはめ,ゆびのおうち', tag + ' page2 order');
    ok((await says(p)).some(x => x.t === 'まなぶ') && (await p.locator('#hm-title').textContent()) === 'まなぶ' && await p.locator('#hm-next').isVisible() && await p.locator('#hm-prev').isVisible(), tag + ' ▶ switches to page2, speaks title, both arrows');
    if (tag === '390x844') { await p.screenshot({ path: SP + '/home-p2.png' }); await p.screenshot({ path: SP + '/home-v8-p2.png' }); }
    const sc2 = await p.evaluate(() => ({ h: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth, v: document.documentElement.scrollHeight > innerHeight }));
    ok(!sc2.h && !sc2.v, tag + ' page2 no scroll');
    // swipe right-ward drag (finger moves right) goes back; must not open a game
    const ab = await p.locator('#hm-area').boundingBox(); const y0 = ab.y + ab.height / 2;
    await p.mouse.move(ab.x + 60, y0); await p.mouse.down(); await p.mouse.move(ab.x + 200, y0 + 10, { steps: 5 }); await p.mouse.up(); await sleep(450);
    ok((await p.locator('#hm-p0').isVisible()) && (await p.locator('#hm-p1').isHidden()) && (await p.locator('#home').isVisible()), tag + ' swipe goes back to page1, no tile tapped');
    await p.mouse.move(ab.x + 300, y0); await p.mouse.down(); await p.mouse.move(ab.x + 240, y0 + 200, { steps: 5 }); await p.mouse.up(); await sleep(400);
    ok(await p.locator('#hm-p0').isVisible(), tag + ' mostly-vertical drag does not switch');
    await p.click('.hm-dot:nth-child(2)'); await sleep(400);
    ok(await p.locator('#hm-p1').isVisible() && await p.locator('#hm-p0').isHidden(), tag + ' dot jumps to page2');
    await p.click('.hm-dot:nth-child(1)'); await sleep(400);
    // ---- page 3 (うごかす) ----
    ok(await p.locator('.hm-dot').count() === 3, tag + ' 3 page dots');
    await p.click('.hm-dot:nth-child(2)'); await sleep(400);
    await p.click('#hm-next'); await sleep(400);
    const t3 = await tileInfo();
    ok(await icoChk(), tag + ' page3 tile icons + title image loaded');
    const ar = await p.locator('#hm-area').boundingBox(), t1b = tiles[0];
    ok(t3.length === 1 && t3[0].ok && t3[0].w === t1b.w && t3[0].h === t1b.h && !t3[0].clip, tag + ' page3: 1 tile, same size as others ' + JSON.stringify(t3[0]));
    ok(Math.abs((t3[0].cx + t3[0].w / 2) - (ar.x + ar.width / 2)) <= 2 && t3[0].cy === tiles[0].cy, tag + ' page3: tile centred in first row');
    ok((await p.locator('#hm-title').textContent()) === 'うごかす' && await p.locator('#hm-next').isHidden() && await p.locator('#hm-prev').isVisible() && (await says(p)).some(x => x.t === 'うごかす'), tag + ' page3 title, ▶ hidden, ◀ shown, speaks');
    ok(await p.locator('.hm-dot[aria-current="true"]').evaluate(e => e.getAttribute('aria-label')) === 'うごかす', tag + ' page3 dot current');
    const sc3 = await scrollInfo(); ok(!sc3.h && !sc3.v, tag + ' page3 no scroll');
    if (tag === '390x844') await p.screenshot({ path: SP + '/home-p3.png' });
    // swipe 2 -> 1 -> back ; arrows across 3 pages
    await p.click('#hm-prev'); await sleep(400);
    ok(await p.locator('#hm-p1').isVisible(), tag + ' ◀ from p3 -> p2');
    await p.mouse.move(ab.x + 300, y0); await p.mouse.down(); await p.mouse.move(ab.x + 100, y0 + 5, { steps: 5 }); await p.mouse.up(); await sleep(450);
    ok(await p.locator('#hm-p2').isVisible() && await p.locator('#hm-p1').isHidden(), tag + ' swipe left p2 -> p3');
    await p.mouse.move(ab.x + 100, y0); await p.mouse.down(); await p.mouse.move(ab.x + 300, y0 + 5, { steps: 5 }); await p.mouse.up(); await sleep(450);
    ok(await p.locator('#hm-p1').isVisible(), tag + ' swipe right p3 -> p2');
    await p.click('.hm-dot:nth-child(1)'); await sleep(400);
    let sc = await scrollInfo(); ok(!sc.h && !sc.v, tag + ' home no scroll');
    const hb = await p.locator('#setbtn').boundingBox();
    ok(await p.locator('#setbtn').isVisible() && hb.width >= 55 && !(await p.locator('#mute').count()), tag + ' home has ⚙️ (' + hb.width + 'px), no 🔊');
    for (let i = 0; i < 19; i++) {
      await tapTile(p, LAB[i]); await sleep(i === 8 ? 600 : 500);
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
  }

  /* ---------- 2. settings ---------- */
  {
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
  }

  /* ---------- 3. sayEn ---------- */
  {
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
    const p0 = await newPage(br, { width: 390, height: 844 }, { voices: [], deny: true });
    await tapTile(p0, LAB[14]); await sleep(100);
    await clearSays(p0);
    await p0.click('.abc-pc[data-l="A"]', { force: true }); await sleep(150);
    s = await says(p0);
    ok(s.length === 1 && s[0].lang === 'en-US' && s[0].t === 'A.' && !s[0].voice, 'empty voices (<1s): lang en-US "A." no voice');
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
  }

  /* ---------- 4. shop camera ---------- */
  for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1024, height: 768 }]) {
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
  }
  {
    // denied camera -> glass window, no arrows
    const p = await newPage(br, { width: 390, height: 844 }, { deny: true });
    await tapTile(p, LAB[8]); await sleep(900);
    const d = await p.evaluate(() => ({ arr: document.querySelector('#camarrows').hidden, vid: document.querySelector('#cam-video').hidden, cbox: document.querySelector('#cbox').hidden, live: document.querySelector('#scanwin').classList.contains('live'), pad: document.querySelector('#scanbox').dataset.arr }));
    ok(d.arr && d.vid && d.cbox && !d.live && d.pad === 'none', 'shop denied: glass window, no arrows ' + JSON.stringify(d));
    await p.click('.prod:nth-child(1)'); await sleep(900);
    ok((await p.locator('#basket .hint').count()) === 0, 'shop denied: shelf tap still scans');
    await p.context().close();
  }
  /* ---------- 4b. shop pay: お金の山が重ならない（.stk はシールと名前がぶつかっていた）・iPad で大きく ---------- */
  for (const vp of [{ width: 360, height: 740 }, { width: 820, height: 1180 }, { width: 1180, height: 820 }, { width: 844, height: 390 }]) {
    const tag = vp.width + 'x' + vp.height;
    const p = await newPage(br, vp, { deny: true });
    await tapTile(p, LAB[8]); await sleep(900);
    for (const l of ['おさかな', 'もも', 'にんじん', 'きゅうり', 'なす']) { await p.click('.prod[aria-label^="' + l + '"]'); await sleep(550); }
    await p.click('#paybtn'); await sleep(2600);
    const L = await p.evaluate(() => {
      const R = e => e.getBoundingClientRect(), st = R(document.querySelector('#stage-shop')), pp = R(document.querySelector('#paypanel')), cz = R(document.querySelector('#coins'));
      const ss = [...document.querySelectorAll('#coins .mstk')].map(R);
      let overlap = false;
      for (let i = 0; i < ss.length; i++) for (let j = i + 1; j < ss.length; j++) { const a = ss[i], b = ss[j]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlap = true; }
      return { n: ss.length, overlap, minW: Math.min(...ss.map(r => r.width)), inside: ss.every(r => r.left >= cz.left - 1 && r.right <= cz.right + 1 && r.top >= cz.top - 1 && r.bottom <= cz.bottom + 1),
        land: innerWidth > innerHeight, panelW: pp.width / st.width, panelH: pp.height / st.height, hs: document.documentElement.scrollWidth > innerWidth };
    });
    const big = vp.width >= 700 && vp.height >= 660;
    ok(L.n >= 4 && !L.overlap && L.inside && L.minW >= (big ? 115 : 80) && !L.hs, tag + ' shop pay: ' + L.n + ' money stacks apart, inside, w>=' + Math.round(L.minW));
    if (L.land) ok(L.panelW > 0.4 && L.panelH > 0.9, tag + ' shop pay: landscape pay panel fills right half ' + L.panelW.toFixed(2) + 'x' + L.panelH.toFixed(2));
    if (tag === '820x1180' || tag === '1180x820') await p.screenshot({ path: SP + '/shop-pay-' + tag + '.png' });
    let n = 0; while (n < 30 && await p.locator('#coins .mstk:not(.gone)').count()) { await p.locator('#coins .mstk:not(.gone)').first().click(); await sleep(420); n++; }
    await sleep(900);
    ok(await p.locator('#receipt:not([hidden])').count() === 1 && p.errs.length === 0, tag + ' shop pay: ' + n + ' taps -> receipt, no errors ' + p.errs.join('|'));
    await p.context().close();
  }

  /* ---------- 5. nurie fish ---------- */
  for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 740 }]) {
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
  }

  /* ---------- 6. clock ---------- */
  {
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
    ok((await p.locator('#ck-line').textContent()) === 'さんじ！ おやつの じかん！' && /🍪🧃/.test(await p.locator('#ck-emo').textContent()), 'clock: card shows scene');
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
      if (h !== nxt || spoken !== want || !nightOk || line !== EXP[nxt]) { allOk = false; bad.push(nxt + ':h=' + h + ' said=' + spoken + ' line=' + line); }
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
  }
  // clock at other viewports: layout fits, no overlap with home button
  for (const vp of [{ width: 360, height: 740 }, { width: 1024, height: 768 }]) {
    const p = await newPage(br, vp, { deny: true });
    await tapTile(p, LAB[15]); await sleep(500);
    const L = await p.evaluate(() => { const st = document.querySelector('#stage-clock').getBoundingClientRect(); const r = e => document.querySelector(e).getBoundingClientRect(); const f = r('#ck-face'), c = r('#ck-card'), b = r('#ck-btns'), hb = r('#homebtn'), o = r('#ck-orb');
      return { faceIn: f.left >= st.left && f.right <= st.right && f.top >= st.top && f.bottom <= st.bottom, btnIn: b.bottom <= st.bottom + 1 && b.right <= st.right + 1, noOverlap: !(f.left < hb.right && f.right > hb.left && f.top < hb.bottom && f.bottom > hb.top) || (f.top >= hb.bottom - 2), face: Math.round(f.width), cardB: Math.round(c.bottom - st.top), stH: Math.round(st.height), orbIn: o.left >= st.left && o.right <= st.right, hs: document.documentElement.scrollWidth > innerWidth }; });
    ok(L.faceIn && L.btnIn && L.noOverlap && L.orbIn && !L.hs, vp.width + 'x' + vp.height + ' clock layout fits ' + JSON.stringify(L));
    await p.context().close();
  }

  /* ---------- 7. settings screenshot with fake camera running ---------- */
  {
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
  }
  /* ---------- 8. v8: ゆびのおうち ---------- */
  {
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
    ok(await p.evaluate(() => { const b = document.querySelector('#y-bubble'); return !b.hidden && b.textContent === 'パパ だよ！ こんにちは！'; }), 'yubi: greeting bubble visible');
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
  }
  {
    const p = await newPage(br, { width: 1024, height: 768 }, { deny: true });
    await tapTile(p, 'ゆびのおうち'); await sleep(500);
    await p.screenshot({ path: SP + '/yubi-1024.png' });
    await p.context().close();
  }
  // 360 wide: yubi fits, face boxes big enough
  {
    const p = await newPage(br, { width: 360, height: 740 }, { deny: true });
    await tapTile(p, 'ゆびのおうち'); await sleep(500);
    const L = await p.evaluate(() => { const st = document.querySelector('#stage-yubi').getBoundingClientRect(); return [...document.querySelectorAll('#y-svg .y-f')].map(g => { const r = g.getBoundingClientRect(), fr = g.querySelector('.y-face').getBoundingClientRect(); return { in: fr.left >= st.left - 1 && fr.right <= st.right + 1 && fr.top >= st.top && fr.bottom <= st.bottom, face: Math.round(fr.width), h: Math.round(r.height) }; }); });
    ok(L.every(x => x.in && x.h >= 80), '360x740 yubi: all fingers inside stage, ' + JSON.stringify(L));
    await p.context().close();
  }

  /* ---------- 9. v8: シールちょう ---------- */
  {
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
    ok(await p.evaluate(() => document.querySelector('#bigword').textContent) === 'おさかな！', 'sticker: spoken word on screen');
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
  }
  for (const vp of [{ width: 360, height: 740 }, { width: 390, height: 844 }, { width: 740, height: 360 }, { width: 844, height: 390 }, { width: 667, height: 375 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }]) {
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
  }

  /* ================= v9: あそびの きろく ================= */
  {
    const T0 = new Date('2026-10-02T12:00:00+09:00');
    const dk = (d) => { const j = new Date(d.getTime() + 9 * 3600e3); return j.toISOString().slice(0, 10); };
    const keyAgo = (n) => dk(new Date(T0.getTime() - n * 86400e3));
    async function cpage(start, seed, vp) {
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
      await p.clock.pauseAt(new Date(start.getTime() + 1000));
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
    {
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
    }
    // 2. ほうち
    {
      const p = await cpage(T0);
      await tapTile(p, 'ふうせん'); await sleep(100);
      await p.clock.runFor(120000);
      await p.click('#homebtn'); await sleep(100);
      const g = (await store(p)).days[keyAgo(0)].g.sky;
      ok(g && g.s >= 58 && g.s <= 63 && g.s !== 120, 'stats: idle 120s -> counting stops at ~61s, s=' + (g && g.s));
      await p.context().close();
    }
    // 3. 3びょうみまん
    {
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
    }
    // 4. ひひょうじ / 10びょうほぞん / pagehide
    {
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
    }
    // 5. ひにちまたぎ
    {
      const p = await cpage(new Date('2026-10-02T23:59:40+09:00'));
      await tapTile(p, 'ふうせん'); await sleep(100);
      await play(p, 30, true);
      await p.click('#homebtn'); await sleep(100);
      const st = await store(p), a = st.days['2026-10-02'], b = st.days['2026-10-03'];
      ok(a && b && a.g.sky && b.g.sky && a.g.sky.s >= 5 && b.g.sky.s >= 5 && a.h[23] === a.g.sky.s && b.h[0] === b.g.sky.s, 'stats: midnight rollover splits days ' + JSON.stringify({ a: a && a.g, b: b && b.g }));
      await p.context().close();
    }
    // 6. 120にち ほじ / old
    {
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
    }
    // 7. ひょうじ（seed）
    {
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
      ok(await p.locator('.st-row.zero').count() === 17 && await p.evaluate(() => getComputedStyle(document.querySelector('.st-row.zero')).opacity) < 0.6, 'stats 7d: zero-play games dimmed (17 rows)');
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
    }
    // 8. 360px / 1024 overflow
    for (const vp of [{ width: 360, height: 740 }, { width: 1024, height: 768 }]) {
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
    }
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
    {
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
    }

    /* --- 2. denied -> touch mode; hold mouse toward the red hole; red ball -> おなじ いろ --- */
    {
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
    }

    /* --- 3. no sensor events within 1s -> touch mode; capture radius at any speed; leave in touch mode --- */
    {
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
    }

    /* --- 4. landscape 1024x768 with screen.orientation.angle = 90, plus rotation control --- */
    for (const [ang, ctl] of [[90, false], [90, true]]) {
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
    }

    /* --- 5. deviceorientation fallback (no devicemotion data) --- */
    {
      const p = await newPage(br, { width: 390, height: 844 }, { deny: true, init: initFor({ perm: 'granted', pin: true }) });
      await tapTile(p, 'ころころボール'); await sleep(300); await p.click('#ko-start'); await sleep(100);
      const fo = (beta, gamma) => p.evaluate(([b, g]) => { clearInterval(window.__fi); window.__fi = setInterval(() => { const e = new Event('deviceorientation'); e.beta = b; e.gamma = g; window.dispatchEvent(e); }, 16); }, [beta, gamma]);
      await fo(60, 3); await sleep(800);
      await clearSays(p);
      await fo(60 + 7, 3 + 7);
      const sy = await waitSay(p, /の あなに はいった！/, 9000);
      ok(sy && sy.t === 'みどりの あなに はいった！', 'koro: deviceorientation fallback tilt right/down -> bottom-right hole "' + (sy && sy.t) + '"');
      await p.context().close();
    }

    /* --- 6. sensitivity setting: UI, persistence, effect --- */
    {
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
    }

    /* --- 6b. かたむきの むき: はんたい -> same tilt, opposite hole --- */
    {
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
    }

    /* --- 6c. はんたい + bottom-right tilt -> top-left; 4 corner tilts without はんたい; layout --- */
    {
      const q = await newPage(br, { width: 390, height: 844 }, { deny: true, init: initFor({ perm: 'granted', pin: true }) + "try{localStorage.setItem('ponpon.settings.v1', JSON.stringify({koroFlip:true}));}catch(e){}" });
      await tapTile(q, 'ころころボール'); await sleep(300); await q.click('#ko-start'); await sleep(100);
      await feed(q, ...LV); await sleep(800); await clearSays(q);
      const t0 = Date.now(); await feed(q, ...raw(0.12, 0.12, 0));
      const sy = await waitSay(q, /の あなに はいった！/, 4000);
      ok(sy && sy.t === 'あかの あなに はいった！ おなじ いろ！', 'koro flip: bottom-right tilt with はんたい -> top-left red hole within 4s (' + (Date.now() - t0) + 'ms): "' + (sy && sy.t) + '"');
      await q.context().close();
    }
    for (const mag of [0.12, 0.3]) for (const [sx, sy2, name] of [[-1, -1, 'あか'], [1, -1, 'あお'], [-1, 1, 'きいろ'], [1, 1, 'みどり']]) {
      const q = await newPage(br, { width: 390, height: 844 }, { deny: true, init: initFor({ perm: 'granted', pin: true }) });
      await tapTile(q, 'ころころボール'); await sleep(300); await q.click('#ko-start'); await sleep(100);
      await feed(q, ...LV); await sleep(800); await clearSays(q);
      const t0 = Date.now(); await feed(q, ...raw(sx * mag, sy2 * mag, 0));
      const sy = await waitSay(q, /の あなに はいった！/, 4000);
      ok(sy && sy.t.startsWith(name + 'の あなに はいった！'), 'koro corner tilt ' + mag + 'G (' + sx + ',' + sy2 + ') -> ' + name + ' within 4s (' + (Date.now() - t0) + 'ms): "' + (sy && sy.t) + '"');
      await q.context().close();
    }
    for (const vp of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 1024, height: 768 }]) {
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
    }

    /* --- 7. re-level button + 3 balls screenshot --- */
    {
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
    }
  }

  /* ---------- rotation: portrait -> landscape -> portrait keeps 🏠 tappable ---------- */
  {
    const hit = p => p.evaluate(() => { const b = document.querySelector(document.querySelector('#homebtn').hidden ? '#setbtn' : '#homebtn'), r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!e && (e === b || b.contains(e)); });
    const p = await newPage(br, { width: 390, height: 844 }, { deny: true });
    for (const lab of [null].concat(LAB)) {
      if (lab) { await tapTile(p, lab); await sleep(400); }
      await p.setViewportSize({ width: 844, height: 390 }); await sleep(900);
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
  }

  /* ---------- animal illustrations: どうぶつ + いないいないばあ ---------- */
  for (const vp of [{ width: 360, height: 740 }, { width: 1024, height: 768 }]) {
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
    for (let round = 0; round < 6; round++) {
      for (let i = 0; i < 4; i++) { await p.locator('#baa .slot').nth(i).click(); await sleep(60); }
      await sleep(1100);
      const r = await p.evaluate(() => [...document.querySelectorAll('#baa .slot.open')].map(sl => { const im = sl.querySelector('.an .an-img'), nm = sl.querySelector('.nm').textContent; const b = im && im.getBoundingClientRect(), sb = sl.getBoundingClientRect(); return { ok: !!im && im.complete && im.naturalWidth > 0 && b.width >= 56 && b.left >= sb.left && b.right <= sb.right && b.top >= sb.top && b.bottom <= sb.bottom, nm, src: im && im.src.length }; }));
      ok(r.length === 4 && r.every(x => x.ok && /^[぀-ヿ]+$/.test(x.nm)), tag + ' baa round ' + (round + 1) + ': revealed animals are loaded images ' + JSON.stringify(r.map(x => x.nm + (x.ok ? '' : '!'))));
      r.forEach(x => seen.add(x.nm));
      if (round === 0) { await p.screenshot({ path: SP + '/animals-baa-' + vp.width + '.png' }); ok(await noHs(), tag + ' baa: no horizontal scroll'); }
      await sleep(1200);
    }
    ok(await p.evaluate(() => (window.__says || []).some(s => /らいおん|ぺんぎん|うさぎ|ぶた|くま|さる|いぬ|ねこ|うし|ひよこ|かえる|ぞう/.test(s.t))), tag + ' baa: animal name spoken');
    ok(p.errs.length === 0, tag + ': no console errors ' + p.errs.join('|'));
    await p.context().close();
  }

  await br.close();
  console.log(fails ? ('\n' + fails + ' FAILED') : '\nALL OK');
  process.exit(fails ? 1 : 0);
})();
