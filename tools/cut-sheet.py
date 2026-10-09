#!/usr/bin/env python3
"""白背景のスプライトシートを切り分けて透過 WebP にする。
使い方: python3 tools/cut-sheet.py シート.png 出力dir 名前1,名前2,...  [--size 192]
名前は左上から右へ・上から下への順。'-' は捨てる。
背景は四辺につながった白っぽい部分。物の中の白（閉じた部分）は残る。"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src, out, names = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
size = int(sys.argv[sys.argv.index('--size') + 1]) if '--size' in sys.argv else 192
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.int16)
light = (a.min(axis=2) > 222)
m = Image.fromarray((light * 255).astype(np.uint8)).copy()
W, H = m.size
for x in range(0, W, 8):
    for y in (0, H - 1):
        if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128)
for y in range(0, H, 8):
    for x in (0, W - 1):
        if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128)
bg = np.asarray(m) == 128
fg = ~bg
# 縁: 背景に接する明るい画素は白との混色なので、明るさから不透明度を出す
near = np.asarray(Image.fromarray((bg * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0
lum = a.min(axis=2)
alpha = np.where(bg, 0, 255).astype(np.float32)
edge = fg & near
alpha[edge] = np.clip((255 - lum[edge]) / (255 - 150) * 255, 0, 255)
# 白の混色を戻す（c = a*fgc + (1-a)*255）
rgb = a.astype(np.float32)
k = np.maximum(alpha / 255, 1e-3)[..., None]
rgb = np.where(edge[..., None], np.clip((rgb - (1 - k) * 255) / k, 0, 255), rgb)
rgba = np.dstack([rgb, alpha]).astype(np.uint8)

def bands(v, mingap):
    res, s, gap = [], None, 0
    for i, on in enumerate(v):
        if on:
            if s is None: s = i
            gap = 0; e = i
        elif s is not None:
            gap += 1
            if gap >= mingap: res.append((s, e + 1)); s = None
    if s is not None: res.append((s, e + 1))
    return res

solid = alpha > 40
items = []
for y0, y1 in bands(solid.any(axis=1), 4):
    for x0, x1 in bands(solid[y0:y1].any(axis=0), 24):
        sub = solid[y0:y1, x0:x1]
        ys = np.where(sub.any(axis=1))[0]
        items.append((x0, y0 + ys[0], x1, y0 + ys[-1] + 1))
print(len(items), 'items')
if len(items) != len(names):
    for it in items: print(it)
    sys.exit('数が名前と合わない')
for n, (x0, y0, x1, y1) in zip(names, items):
    if n == '-': continue
    t = Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA')
    t.thumbnail((size, size), Image.LANCZOS)
    t.save('%s/%s.webp' % (out, n), 'WEBP', quality=88, method=6)
    print(n, (x1 - x0, y1 - y0), '->', t.size)
