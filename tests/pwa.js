// PWA テスト: node tests/pwa.js（PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers）
const path = require('path'), fs = require('fs'), http = require('http');
function loadPw() {
  for (const p of ['playwright', '/home/claude/.npm-global/lib/node_modules/playwright', '/opt/node-tools/node_modules/playwright']) { try { return require(p); } catch (e) {} }
  throw new Error('playwright が見つかりません');
}
const { chromium } = loadPw();
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const ok = (c, m) => { if (!c) throw new Error('NG: ' + m); console.log('ok  ' + m); };
(async () => {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://localhost:' + srv.address().port + '/';
  const b = await chromium.launch();
  try {
    const ctx = await b.newContext({ viewport: { width: 400, height: 800 } });
    // 外部（フォント）は繋がらない環境でも通るよう遮断
    await ctx.route(/^https?:\/\/(?!localhost)/, r => r.abort());
    const pg = await ctx.newPage();
    const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(base);
    await pg.waitForSelector('#home', { state: 'attached' });
    const mhref = await pg.getAttribute('link[rel=manifest]', 'href');
    ok(mhref === 'manifest.webmanifest', 'manifest link is relative');
    const man = await pg.evaluate(h => fetch(h).then(r => ({ ct: r.headers.get('content-type'), j: r.json() })).then(async o => ({ ct: o.ct, j: await o.j })), mhref);
    ok(/manifest\+json/.test(man.ct), 'manifest content-type');
    const m = man.j;
    ok(m.name && m.short_name && m.lang === 'ja' && m.start_url === './' && m.scope === './' && m.display === 'standalone', 'manifest required fields');
    const want = { 'icons/icon-192.png': [192, 'any'], 'icons/icon-512.png': [512, 'any'], 'icons/icon-maskable-512.png': [512, 'maskable'] };
    for (const [src, [sz, purpose]] of Object.entries(want)) {
      const ic = m.icons.find(i => i.src === src);
      ok(ic && ic.purpose === purpose && ic.sizes === sz + 'x' + sz, 'manifest icon ' + src);
    }
    for (const src of [...Object.keys(want), 'icons/apple-touch-icon.png']) {
      const dim = await pg.evaluate(s => new Promise((res, rej) => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.onerror = () => rej(new Error('load ' + s)); i.src = s; }), src);
      const exp = src.includes('apple') ? 180 : want[src][0];
      ok(dim[0] === exp && dim[1] === exp, src + ' is ' + exp + 'px');
    }
    ok(await pg.getAttribute('link[rel=apple-touch-icon]', 'href') === 'icons/apple-touch-icon.png', 'apple-touch-icon link');
    await pg.evaluate(() => navigator.serviceWorker.ready);
    await pg.reload();
    await pg.waitForSelector('#home', { state: 'attached' });
    await pg.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 10000 });
    ok(true, 'service worker controls the page');
    await ctx.setOffline(true);
    await pg.reload();
    await pg.waitForSelector('#home', { state: 'attached' });
    ok(await pg.evaluate(() => { const h = document.querySelector('#home'); return !!h && !h.hidden && document.querySelectorAll('#home .tile').length > 0; }), 'offline reload shows home with tiles');
    const pre = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8').match(/var PRECACHE = \[[\s\S]*?\]\)?;/)[0].match(/'\.\/[^']*'/g).map(s => s.slice(1, -1));
    ok(pre.filter(s => s.startsWith('./assets/')).length === 77, 'PRECACHE lists 77 assets');
    ok(pre.every(s => fs.existsSync(path.join(ROOT, s === './' ? 'index.html' : s))), 'every PRECACHE entry exists on disk');
    const codes = await pg.evaluate(async list => Promise.all(list.map(u => caches.match(u).then(r => !!r))), pre);
    ok(codes.every(Boolean), 'every PRECACHE entry is in the cache while offline');
    for (const a of ['assets/ico/sky.webp', 'assets/ani/inu.webp']) {
      const r = await pg.evaluate(u => fetch(u).then(r => [r.status, r.headers.get('content-type')]), a);
      ok(r[0] === 200 && r[1] === 'image/webp', a + ' served offline');
    }
    ok(errs.length === 0, 'no page errors ' + errs.join('|'));
    await ctx.setOffline(false);
    const live = await pg.evaluate(list => Promise.all(list.map(u => fetch(u, { cache: 'reload' }).then(r => r.status))), pre);
    ok(live.every(s => s === 200), 'every PRECACHE entry fetches 200 from server');
    console.log('PWA ALL OK');
  } finally { await b.close(); srv.close(); }
})().catch(e => { console.error(e); process.exit(1); });
