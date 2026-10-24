#!/usr/bin/env python3
"""とんとん（kiru）とホームアイコンの絵: マゼンタ背景のシートを切り分けて透過 WebP にする。
使い方: python3 tools/make-kiru.py シート1.png シート2.png
 シート1: 4x4 グリッド（1 セル 1 つ）。
   1 行目 drive piano pinball voice / 2 行目 nami mix suna kiru（→ assets/ico/、192px 正方形）
   3 行目 断面 ninjin kyuri banana sausage / 4 行目 roll knife pot plate
   （断面と roll は assets/kiru/sec-*.webp 192px、knife pot plate は assets/kiru/ 長辺 256px）
 シート2: 縦長。ninjin kyuri banana sausage roll の横向き 5 本（→ assets/kiru/*.webp 幅 640px）
元シートはリポジトリに置かない。キーイングは make-mix.py と同じ（キー = min(R,B)-G、縁はアルファを混色比から出してデスピル）。"""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ICO_DIR = os.path.join(ROOT, 'assets', 'ico')
KIRU_DIR = os.path.join(ROOT, 'assets', 'kiru')
GRID1 = 'drive piano pinball voice nami mix suna kiru sec-ninjin sec-kyuri sec-banana sec-sausage sec-roll knife pot plate'.split()
LONG = 'ninjin kyuri banana sausage roll'.split()
OUTLINE_M = -35.0


def key(a):
    return np.minimum(a[..., 0], a[..., 2]) - a[..., 1]


def to_rgba(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    m = key(a)
    bgc = np.median(a[m > 200], axis=0)
    bgm = float(np.median(m[m > 200]))
    bg = m > 150
    bg = ndi.binary_opening(bg, iterations=1) | (m > 215)
    near = ndi.binary_dilation(bg, iterations=3) & ~bg
    alpha = np.where(bg, 0.0, 1.0)
    e = near & (m > OUTLINE_M)
    alpha[e] = np.clip((bgm - m[e]) / (bgm - OUTLINE_M), 0, 1)
    alpha[near & ~e] = 1.0
    alpha = np.clip((alpha - 0.08) / 0.84, 0, 1)
    k = np.maximum(alpha, 1e-3)[..., None]
    fg = np.clip((a - (1 - k) * bgc) / k, 0, 255)
    solid = alpha > 0.98
    idx = ndi.distance_transform_edt(~solid, return_distances=False, return_indices=True)
    nearest = a[idx[0], idx[1]]
    edge = (alpha > 0) & (alpha < 0.98)
    fg = np.where(edge[..., None], 0.55 * nearest + 0.45 * fg, fg)
    ex = np.minimum(fg[..., 0], fg[..., 2]) - fg[..., 1]
    spill = edge & (ex > 0)
    fg[..., 0] = np.where(spill, fg[..., 0] - ex * 0.6, fg[..., 0])
    fg[..., 2] = np.where(spill, fg[..., 2] - ex * 0.6, fg[..., 2])
    return np.dstack([np.clip(fg, 0, 255), alpha * 255]).astype(np.uint8)


def clean(rgba):
    """小さなごみ（元絵の端のかけら）を消す。大きな塊の近く（60px 以内）の小片は残す。"""
    al = rgba[..., 3].astype(np.float32) / 255
    lab, nl = ndi.label(al > 0.16)
    if nl == 0:
        return rgba, None
    ids = np.arange(1, nl + 1)
    sizes = ndi.sum(np.ones_like(al), lab, ids)
    big = sizes.max()
    main = ids[sizes >= 0.1 * big]
    near = ndi.binary_dilation(np.isin(lab, main), iterations=60)
    keep = [j for j in ids if sizes[j - 1] >= max(30, 0.003 * big) and (near[lab == j].any())]
    mask = np.isin(lab, keep)
    out = rgba.copy()
    out[..., 3] = np.where(mask, out[..., 3], 0)
    return out, mask


def crop(rgba, pad=2):
    ys, xs = np.where(rgba[..., 3] > 40)
    y0, y1, x0, x1 = max(0, ys.min() - pad), ys.max() + 1 + pad, max(0, xs.min() - pad), xs.max() + 1 + pad
    return Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA')


def save(img, path):
    img.save(path, 'WEBP', quality=88, method=6)
    print(os.path.relpath(path, ROOT), img.size)


def square(t, size, fit):
    s = fit / max(t.size)
    t = t.resize((max(1, round(t.size[0] * s)), max(1, round(t.size[1] * s))), Image.LANCZOS)
    c = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    c.paste(t, ((size - t.size[0]) // 2, (size - t.size[1]) // 2))
    return c


def padded(t, long_side, pad=6):
    s = (long_side - 2 * pad) / max(t.size)
    t = t.resize((max(1, round(t.size[0] * s)), max(1, round(t.size[1] * s))), Image.LANCZOS)
    c = Image.new('RGBA', (t.size[0] + 2 * pad, t.size[1] + 2 * pad), (0, 0, 0, 0))
    c.paste(t, (pad, pad))
    return c


if len(sys.argv) != 3:
    sys.exit(__doc__)
os.makedirs(KIRU_DIR, exist_ok=True)

# ---- シート1: セルごと ----
rgba = to_rgba(sys.argv[1])
H, W = rgba.shape[:2]
for i, n in enumerate(GRID1):
    r, c = divmod(i, 4)
    y0, y1, x0, x1 = r * H // 4, (r + 1) * H // 4, c * W // 4, (c + 1) * W // 4
    cell = np.zeros_like(rgba)
    cell[y0:y1, x0:x1] = rgba[y0:y1, x0:x1]
    cell, _ = clean(cell)
    t = crop(cell)
    if i < 8:
        save(square(t, 192, 176), '%s/%s.webp' % (ICO_DIR, n))
    elif n.startswith('sec-'):
        save(square(t, 192, 176), '%s/%s.webp' % (KIRU_DIR, n))
    else:
        save(padded(t, 256), '%s/%s.webp' % (KIRU_DIR, n))

# ---- シート2: 横の帯ごと ----
rgba = to_rgba(sys.argv[2])
H, W = rgba.shape[:2]
rows = (rgba[..., 3] > 40).sum(axis=1) > 0
bands, start = [], None
for y in range(H + 1):
    on = y < H and rows[y]
    if on and start is None:
        start = y
    if not on and start is not None:
        bands.append([start, y]); start = None
bands = [b for b in bands if b[1] - b[0] > 20]
assert len(bands) == len(LONG), 'band count %d' % len(bands)
for n, (y0, y1) in zip(LONG, bands):
    cell = np.zeros_like(rgba)
    cell[y0:y1] = rgba[y0:y1]
    cell, _ = clean(cell)
    t = crop(cell, 3)
    t = padded_w = t.resize((640, max(1, round(t.size[1] * 640 / t.size[0]))), Image.LANCZOS)
    save(t, '%s/%s.webp' % (KIRU_DIR, n))
