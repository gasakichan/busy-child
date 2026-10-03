// アイコン再生成: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tools/make-icons.js
// icons/icon.svg から PNG（192/512/maskable 512/apple-touch 180）を書き出す。
const path = require('path'), fs = require('fs');
function loadPw() {
  for (const p of ['playwright', '/home/claude/.npm-global/lib/node_modules/playwright', '/opt/node-tools/node_modules/playwright']) { try { return require(p); } catch (e) {} }
  throw new Error('playwright が見つかりません');
}
const { chromium } = loadPw();
const DIR = path.join(__dirname, '..', 'icons');
const svg = fs.readFileSync(path.join(DIR, 'icon.svg'), 'utf8');
const art = svg.slice(svg.indexOf('<g '), svg.indexOf('</g>') + 4);
const BG = '#FFF6E0';
// full: 角丸の背景つき / flat: 全面ベタ背景（maskable・apple-touch）、art は中央に scale 倍
const flat = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="${BG}"/><g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${art}</g></svg>`;
const jobs = [
  ['icon-192.png', 192, svg],
  ['icon-512.png', 512, svg],
  ['icon-maskable-512.png', 512, flat(0.88)], // 絵は中央 80% セーフゾーンの内側に収める
  ['apple-touch-icon.png', 180, flat(1.05)],
];
(async () => {
  const b = await chromium.launch();
  for (const [name, size, markup] of jobs) {
    const pg = await b.newPage({ viewport: { width: size, height: size } });
    await pg.setContent(`<html><body style="margin:0;background:transparent">${markup.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `)}</body></html>`);
    await pg.screenshot({ path: path.join(DIR, name), omitBackground: name !== 'apple-touch-icon.png' && name !== 'icon-maskable-512.png' });
    await pg.close();
    console.log('wrote', name);
  }
  await b.close();
})();
