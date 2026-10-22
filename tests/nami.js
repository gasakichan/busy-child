const fs = require('fs');
// なみもよう の交点計算の単体テスト。使い方: node tests/nami.js
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/\/\* nami:begin \*\/([\s\S]*?)\/\* nami:end \*\//);
if (!m) { console.log('NO circleHits FOUND'); process.exit(2); }
const circleHits = new Function(m[1] + '; return circleHits;')();
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };
const near = (a, b) => Math.abs(a - b) < 1e-9;
let h = circleHits(0, 0, 5, 6, 0, 5);
ok(h.length === 2 && near(h[0][0], 3) && near(Math.abs(h[0][1]), 4) && near(h[0][1], -h[1][1]), 'two points (3, ±4)');
h = circleHits(0, 0, 5, 10, 0, 5); ok(h.length === 2 && near(h[0][0], 5) && near(h[0][1], 0), 'tangent externally');
ok(circleHits(0, 0, 1, 10, 0, 1).length === 0, 'too far apart');
ok(circleHits(0, 0, 10, 1, 0, 2).length === 0, 'one inside the other');
ok(circleHits(3, 3, 5, 3, 3, 5).length === 0, 'concentric ignored');
ok(circleHits(3, 3, 5, 3, 3, 7).length === 0, 'concentric, different radii');
h = circleHits(10, 10, 13, 10, 20, 15);   // 非対称
ok(h.every(p => near(Math.hypot(p[0] - 10, p[1] - 10), 13) && near(Math.hypot(p[0] - 10, p[1] - 20), 15)) && h.length === 2, 'both points lie on both circles');
console.log(fails ? 'FAILED' : 'ALL OK'); process.exit(fails ? 1 : 0);
