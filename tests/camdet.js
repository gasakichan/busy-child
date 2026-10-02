const fs = require('fs');
// カメラ検出器の単体テスト。使い方: node tests/camdet.js
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/\/\* camdet:begin \*\/([\s\S]*?)\/\* camdet:end \*\//);
if (!m) { console.log('NO DETECTOR FOUND'); process.exit(2); }
const createCamDetector = new Function(m[1] + '; return createCamDetector;')();
const W = 64, H = 48, DT = 80;
// region in full-frame coords (must mirror 60% x 70% centre)
const RX0 = 13, RX1 = 51, RY0 = 7, RY1 = 41, RN = (RX1 - RX0) * (RY1 - RY0);
function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function bgFrame(gain) {
  const f = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const j = (y * W + x) * 4;
    const base = 70 + x * 1.2 + y * 0.8 + ((x >> 3) + (y >> 3)) % 2 * 25;
    f[j] = Math.min(255, base * gain); f[j + 1] = Math.min(255, (base * 0.9 + 8) * gain); f[j + 2] = Math.min(255, (base * 0.8 + 14) * gain); f[j + 3] = 255;
  }
  return f;
}
function rect(f, x0, y0, x1, y1, c) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const j = (y * W + x) * 4; f[j] = c[0]; f[j + 1] = c[1]; f[j + 2] = c[2]; }
}
const RED = [225, 35, 35], GREEN = [30, 200, 60], BLUE = [30, 70, 230];
// shapes as % of region area (ceil so that "x%" is a lower bound)
function box(cx, cy, pct) { const a = Math.ceil(RN * pct); const s = Math.ceil(Math.sqrt(a)); const w = s, h = Math.ceil(a / s); const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2); return [x0, y0, x0 + w, y0 + h, w * h / RN]; }
const CX = 32, CY = 24;
function run(name, sens, build, tEnd, seedN) {
  const d = createCamDetector({ sens });
  const scans = [];
  for (let t = 0; t <= tEnd; t += DT) {
    const f = build(t);
    const r = d.feed(f, W, H, t);
    if (r.scan) scans.push(t);
  }
  return scans;
}
const results = [];
function T(label, expected, got, extra) { results.push([label, expected, got.length, got.join(',') || '-', extra || '']); }
// 1 static bg 3 s
T('1 static 3s', 0, run('1', 3, t => bgFrame(1), 3000));
// 2 red 30% 1s, off 1s, green 1s, off => 2 (bg 1 s first)
{
  const R = box(CX, CY, 0.30), G = box(CX, CY, 0.30);
  const s = run('2', 3, t => { const f = bgFrame(1); if (t >= 1000 && t < 2000) rect(f, R[0], R[1], R[2], R[3], RED); if (t >= 3000 && t < 4000) rect(f, G[0], G[1], G[2], G[3], GREEN); return f; }, 5000);
  T('2 red,off,green,off', 2, s, 'box ' + (R[4] * 100).toFixed(1) + '%; latency red ' + (s[0] - 1000) + 'ms green ' + (s[1] - 3000) + 'ms');
}
// 3 red stays 3 s => 1
{
  const R = box(CX, CY, 0.30);
  const s = run('3', 3, t => { const f = bgFrame(1); if (t >= 1000) rect(f, R[0], R[1], R[2], R[3], RED); return f; }, 4000 + 1000);
  T('3 red stays 3s+', 1, s, 'latency ' + (s[0] - 1000) + 'ms');
}
// 4 after 3, blue 20% at another position => +1 (total 2)
{
  const R = box(CX, CY, 0.30), B = box(24, 16, 0.20);
  const s = run('4', 3, t => { const f = bgFrame(1); if (t >= 1000) rect(f, R[0], R[1], R[2], R[3], RED); if (t >= 4200) rect(f, B[0], B[1], B[2], B[3], BLUE); return f; }, 6000);
  T('4 red stays, then blue on top', 2, s, 'blue ' + (B[4] * 100).toFixed(1) + '%; blue latency ' + (s[1] - 4200) + 'ms');
}
// 5 small object ~15% region
{
  const S = box(CX, CY, 0.15);
  const mk = t => { const f = bgFrame(1); if (t >= 1000 && t < 3000) rect(f, S[0], S[1], S[2], S[3], RED); return f; };
  T('5a small 15%, sens 3', 0, run('5a', 3, mk, 4000), (S[4] * 100).toFixed(1) + '%');
  T('5b small 15%, sens 4', 1, run('5b', 4, mk, 4000), 'reacts');
  T('5c small 15%, sens 5', 1, run('5c', 5, mk, 4000), 'reacts');
}
// 6 exposure ramp x1.3 over 1 s (starting 1 s)
{
  const s = run('6', 3, t => { const g = t < 1000 ? 1 : t >= 2000 ? 1.3 : 1 + 0.3 * (t - 1000) / 1000; return bgFrame(g); }, 5000);
  T('6 exposure x1.3 in 1s', 0, s);
}
{ const s1 = run('6b', 3, t => bgFrame(t < 1000 ? 1 : 1.3), 4000); T('6b exposure step x1.3 at once (extra)', 0, s1);
  const s2 = run('6c', 3, t => bgFrame(t < 1000 ? 1 : 0.7), 4000); T('6c exposure step x0.7 at once (extra)', 0, s2); }
// 7 big motion in periphery only (outside centre rect)
{
  const r = rnd(7);
  const s = run('7', 3, t => {
    const f = bgFrame(1);
    // random big blocks in the outer ring, never touching the centre rect
    const c = [Math.floor(r() * 255), Math.floor(r() * 255), Math.floor(r() * 255)];
    const side = Math.floor(r() * 4);
    if (t >= 1000) {
      if (side === 0) rect(f, 0, 0, RX0, H, c); else if (side === 1) rect(f, RX1, 0, W, H, c); else if (side === 2) rect(f, 0, 0, W, RY0, c); else rect(f, 0, RY1, W, H, c);
      rect(f, 2, 2, 11, 46, [Math.floor(r() * 255), 90, 40]);
    }
    return f;
  }, 5000);
  T('7 periphery-only motion', 0, s);
}
// 8 noise +-6 over 5 s
{
  const r = rnd(8);
  const s = run('8', 3, t => { const f = bgFrame(1); for (let i = 0; i < f.length; i++) if ((i & 3) !== 3) { const v = f[i] + Math.round((r() * 2 - 1) * 6); f[i] = Math.max(0, Math.min(255, v)); } return f; }, 5000);
  T('8 noise +-6, 5s', 0, s);
  const s5 = run('8b', 5, t => { const f = bgFrame(1); for (let i = 0; i < f.length; i++) if ((i & 3) !== 3) f[i] = Math.max(0, Math.min(255, f[i] + Math.round((r() * 2 - 1) * 6))); return f; }, 5000);
  T('8b noise +-6, 5s, sens 5', 0, s5);
}
// extras
{ // hand sweeping in over ~0.5 s and out
  const R = box(CX, CY, 0.35);
  const s = run('x1', 3, t => { const f = bgFrame(1); if (t >= 1000 && t < 2500) { const k = Math.min(1, (t - 1000) / 500); const w = Math.round((R[2] - R[0]) * k); rect(f, R[0], R[1], R[0] + w, R[3], [220, 160, 130]); } return f; }, 4000);
  T('x1 slow slide-in 35% (extra)', 1, s, 'latency ' + (s[0] - 1000) + 'ms');
}
{ // object removed after scan must not scan (extra) + toy swapped in front of resting one
  const R = box(CX, CY, 0.30), G = box(CX, CY, 0.30);
  const s = run('x2', 3, t => { const f = bgFrame(1); if (t >= 1000) rect(f, R[0], R[1], R[2], R[3], RED); if (t >= 2000) rect(f, G[0], G[1], G[2], G[3], GREEN); return f; }, 4000);
  T('x2 swap red->green while resting (extra)', 2, s, 'spike path, second at ' + (s[1] - 2000) + 'ms after swap');
}
let ok = true;
console.log('scenario'.padEnd(40), 'expected'.padEnd(9), 'actual'.padEnd(7), 'result', ' scan times (ms) / notes');
for (const [l, e, a, ts, ex] of results) { const pass = e === a; if (!pass && !/extra/.test(l)) ok = false; console.log(l.padEnd(40), String(e).padEnd(9), String(a).padEnd(7), pass ? 'PASS  ' : 'FAIL  ', ts, ex); }
console.log(ok ? 'ALL REQUIRED PASS' : 'SOME FAIL');
process.exit(ok ? 0 : 1);
