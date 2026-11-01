// かえる の絵を SVG で描いて、Playwright で透過 WebP にする。
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tools/make-kaeru.js
// 出力: assets/kaeru/{frog-sit,frog-jump,pad1,pad2,lotus}.webp（256px）と assets/ico/kaeru.webp（192px）
// 同名の AI 生成画像（上向きのかえる）に差し替えてもゲームはそのまま動く。
const path = require('path'), fs = require('fs');
function loadPw() {
  for (const p of ['playwright', '/home/claude/.npm-global/lib/node_modules/playwright', '/opt/node-tools/node_modules/playwright']) { try { return require(p); } catch (e) {} }
  throw new Error('playwright が見つかりません');
}
const { chromium } = loadPw();
const ROOT = path.join(__dirname, '..');
const INK = '#5a3a28';
const svg = (size, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 256 256">${inner}</svg>`;
const G1 = '#9BE07A', G2 = '#7CCB5E', GS = '#6DBB52';   // かえるの みどり（うす・ふつう・はんてん）

// ふちどり付きの図形。shapes は塗りだけの SVG 断片。ふち用に stroke を太くして同じものを下に敷く
const outlined = (shapes, fill, w = 7) =>
  `<g fill="${INK}" stroke="${INK}" stroke-width="${w * 2}" stroke-linejoin="round" stroke-linecap="round">${shapes}</g>` +
  `<g fill="${fill}" stroke="none">${shapes}</g>`;
const strokeLine = (d, fillW, color, w = 7) =>
  `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${fillW + w * 2}" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${fillW}" stroke-linecap="round" stroke-linejoin="round"/>`;

function eye(cx, cy, r) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${INK}" stroke-width="5"/>` +
    `<circle cx="${cx}" cy="${cy + r * 0.12}" r="${r * 0.56}" fill="${INK}"/>` +
    `<circle cx="${cx + r * 0.2}" cy="${cy - r * 0.18}" r="${r * 0.22}" fill="#fff"/>`;
}
function face(cy, spread) {
  return `<ellipse cx="${128 - spread}" cy="${cy + 6}" rx="11" ry="7" fill="#FFB3C1" opacity=".85"/>` +
    `<ellipse cx="${128 + spread}" cy="${cy + 6}" rx="11" ry="7" fill="#FFB3C1" opacity=".85"/>` +
    `<path d="M${128 - 15} ${cy + 2} Q128 ${cy + 20} ${128 + 15} ${cy + 2}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` +
    `<circle cx="121" cy="${cy - 14}" r="2.6" fill="${INK}"/><circle cx="135" cy="${cy - 14}" r="2.6" fill="${INK}"/>`;
}
function toes(x, y, dx, dy, n = 3, r = 7) {   // 指の先の丸いふくらみ
  let s = '';
  for (let i = 0; i < n; i++) { const t = (i - (n - 1) / 2); s += `<circle cx="${x + dx * t}" cy="${y + dy * t}" r="${r}"/>`; }
  return s;
}

function frogSit() {
  const back = ['<ellipse cx="62" cy="168" rx="30" ry="42" transform="rotate(-18 62 168)"/>', '<ellipse cx="194" cy="168" rx="30" ry="42" transform="rotate(18 194 168)"/>'].join('') +
    '<ellipse cx="54" cy="212" rx="30" ry="14" transform="rotate(-10 54 212)"/><ellipse cx="202" cy="212" rx="30" ry="14" transform="rotate(10 202 212)"/>' +
    toes(30, 214, 0, 11, 3, 8) + toes(226, 214, 0, 11, 3, 8);
  const front = '<ellipse cx="72" cy="138" rx="15" ry="26" transform="rotate(14 72 138)"/><ellipse cx="184" cy="138" rx="15" ry="26" transform="rotate(-14 184 138)"/>' +
    toes(62, 164, 13, 0, 3, 7) + toes(194, 164, -13, 0, 3, 7);
  const bodyHead = '<ellipse cx="128" cy="152" rx="56" ry="64"/><ellipse cx="128" cy="96" rx="60" ry="46"/><circle cx="86" cy="64" r="26"/><circle cx="170" cy="64" r="26"/>';
  return svg(256,
    outlined(back, G2) +
    outlined(front, G2) +
    outlined(bodyHead, G1) +
    // せなかの もよう
    `<g fill="${GS}" opacity=".9"><ellipse cx="108" cy="170" rx="14" ry="10"/><ellipse cx="152" cy="182" rx="12" ry="9"/><ellipse cx="128" cy="205" rx="10" ry="7"/><ellipse cx="156" cy="152" rx="8" ry="6"/></g>` +
    eye(86, 64, 17) + eye(170, 64, 17) + face(100, 42));
}
function frogJump() {
  // うしろあし ながく のびる、まえあし まえへ
  const back = strokeLine('M96 168 L62 196 L82 240', 26, G2) + strokeLine('M160 168 L194 196 L174 240', 26, G2);
  const backFeet = outlined('<ellipse cx="80" cy="242" rx="22" ry="11" transform="rotate(-20 80 242)"/><ellipse cx="176" cy="242" rx="22" ry="11" transform="rotate(20 176 242)"/>' +
    toes(64, 243, 0, 0, 1, 0), G2, 6);
  const front = strokeLine('M96 104 L72 56 L66 30', 18, G2) + strokeLine('M160 104 L184 56 L190 30', 18, G2);
  const hands = outlined('<ellipse cx="62" cy="26" rx="17" ry="10" transform="rotate(-12 62 26)"/><ellipse cx="194" cy="26" rx="17" ry="10" transform="rotate(12 194 26)"/>', G2, 6);
  const bodyHead = '<ellipse cx="128" cy="140" rx="44" ry="58"/><ellipse cx="128" cy="92" rx="50" ry="38"/><circle cx="92" cy="68" r="22"/><circle cx="164" cy="68" r="22"/>';
  return svg(256,
    back + backFeet + front + hands +
    outlined(bodyHead, G1) +
    `<g fill="${GS}" opacity=".9"><ellipse cx="112" cy="168" rx="11" ry="9"/><ellipse cx="148" cy="178" rx="10" ry="8"/><ellipse cx="128" cy="150" rx="8" ry="6"/></g>` +
    eye(92, 68, 14.5) + eye(164, 68, 14.5) + face(108, 36));
}
function padSvg(opts) {
  const { fill, rim, vein, notch, veins, spots } = opts;
  const R = 112, cx = 128, cy = 128, a = notch * Math.PI / 180, half = 15 * Math.PI / 180;
  const P = t => [cx + R * Math.cos(t), cy + R * Math.sin(t)].map(v => v.toFixed(1)).join(' ');
  const d = `M${cx} ${cy} L${P(a + half)} A${R} ${R} 0 1 1 ${P(a - half)} Z`;
  let v = '';
  for (let i = 0; i < veins; i++) {
    const t = a + half + (i + 0.6) * (2 * Math.PI - 2 * half) / (veins + 0.2);
    v += `<path d="M${cx} ${cy} L${(cx + (R - 12) * Math.cos(t)).toFixed(1)} ${(cy + (R - 12) * Math.sin(t)).toFixed(1)}" stroke="${vein}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  }
  let sp = '';
  for (const [x, y, r] of spots || []) sp += `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.7}" fill="${rim}" opacity=".7"/>`;
  return svg(256,
    `<path d="${d}" fill="${INK}" stroke="${INK}" stroke-width="14" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="${fill}"/>` +
    `<path d="${d}" fill="none" stroke="${rim}" stroke-width="10" stroke-linejoin="round" transform="translate(128 128) scale(.93) translate(-128 -128)" opacity=".55"/>` +
    v + sp +
    `<circle cx="${cx}" cy="${cy}" r="9" fill="${rim}" stroke="${INK}" stroke-width="4" opacity=".9"/>` +
    `<path d="M70 70 Q96 48 130 44" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none" opacity=".45"/>`);
}
function lotus() {
  let outer = '', inner = '';
  for (let i = 0; i < 8; i++) outer += `<ellipse cx="128" cy="62" rx="26" ry="52" transform="rotate(${i * 45} 128 128)"/>`;
  for (let i = 0; i < 6; i++) inner += `<ellipse cx="128" cy="86" rx="20" ry="38" transform="rotate(${22 + i * 60} 128 128)"/>`;
  return svg(256,
    outlined(outer, '#FFB8D2') +
    outlined(inner, '#FFD3E4', 6) +
    `<circle cx="128" cy="128" r="22" fill="#FFE27A" stroke="${INK}" stroke-width="6"/>` +
    `<g fill="#F2B544"><circle cx="120" cy="122" r="4"/><circle cx="136" cy="122" r="4"/><circle cx="128" cy="136" r="4"/></g>`);
}
const PAD1 = { fill: '#8FD67F', rim: '#6DBB5E', vein: '#6DBB5E', notch: -60, veins: 9, spots: [[96, 168, 9], [170, 150, 7]] };
const PAD2 = { fill: '#A5DB7A', rim: '#7FC460', vein: '#7FC460', notch: 140, veins: 7, spots: [[160, 90, 8], [92, 100, 6], [150, 176, 8]] };
function icon() {
  const pad = padSvg({ fill: '#8FD67F', rim: '#6DBB5E', vein: '#6DBB5E', notch: 150, veins: 8, spots: [] }).replace(/^<svg[^>]*>|<\/svg>$/g, '');
  const frog = frogSit().replace(/^<svg[^>]*>|<\/svg>$/g, '');
  return svg(256, `<g transform="translate(128 140) scale(1.02) translate(-128 -128)">${pad}</g>` +
    `<g transform="translate(128 118) scale(.7) translate(-128 -128)">${frog}</g>`);
}

const JOBS = [
  ['assets/kaeru/frog-sit.webp', 256, frogSit()],
  ['assets/kaeru/frog-jump.webp', 256, frogJump()],
  ['assets/kaeru/pad1.webp', 256, padSvg(PAD1)],
  ['assets/kaeru/pad2.webp', 256, padSvg(PAD2)],
  ['assets/kaeru/lotus.webp', 256, lotus()],
  ['assets/ico/kaeru.webp', 192, icon()],
];
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage();
  await pg.setContent('<html><body style="margin:0;background:transparent"></body></html>');
  for (const [out, size, markup] of JOBS) {
    const b64 = await pg.evaluate(async ([m, size]) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(m); });
      const c = document.createElement('canvas'); c.width = c.height = size;
      c.getContext('2d').drawImage(img, 0, 0, size, size);
      return c.toDataURL('image/webp', 0.9).split(',')[1];
    }, [markup, size]);
    const f = path.join(ROOT, out);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, Buffer.from(b64, 'base64'));
    console.log('wrote', out, fs.statSync(f).size + 'B');
  }
  await b.close();
})();
