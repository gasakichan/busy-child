#!/usr/bin/env python3
"""へんしん の おめん の絵: マゼンタ背景のシート（3x3）を切り分けて透過 WebP にする。
使い方: python3 tools/make-omen.py シート.png
 左上から右へ neko inu usagi / kuma lion panda / obake robot ico
 → assets/omen/<name>.webp（正面むきの おめん 8 つ。ぴったり切り抜いて 長辺 320px）、ico は assets/ico/henshin.webp（192px 正方形。きらきらも のこす）
 あわせて おめんごとの 目の位置（切り抜いた絵の中の 0..1。ex1/ex2 = 左右の目の x、ey = 目の y、w/h = 絵の px）を JS の オブジェクトで 標準出力へ。
 （黒目の しろい ハイライトを 目印にさがす。panda は 黒目と 目のまわりの 黒が 同じ色なので、ほかの 7 つの ハイライト→黒目 のずれから 出す）
元シートはリポジトリに置かない。キーイングは make-dokoka.py / make-kaeru.py と同じ。"""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ICO_DIR = os.path.join(ROOT, 'assets', 'ico')
OM_DIR = os.path.join(ROOT, 'assets', 'omen')
GRID = 'neko inu usagi kuma lion panda obake robot ico'.split()   # 3x3（左上から右へ）
N = 3
OUTLINE_M = -35.0
EYE_OFF = {}   # 黒目の中心 - ハイライトの中心（顔の幅に対する割合）


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
    """小さなごみ（元絵の端のかけら）を消す。大きな塊の近く（100px 以内）の小片は きらきらなので のこす。"""
    al = rgba[..., 3].astype(np.float32) / 255
    lab, nl = ndi.label(al > 0.16)
    if nl == 0:
        return rgba
    ids = np.arange(1, nl + 1)
    sizes = ndi.sum(np.ones_like(al), lab, ids)
    big = sizes.max()
    main = ids[sizes >= 0.1 * big]
    near = ndi.binary_dilation(np.isin(lab, main), iterations=100)
    keep = [j for j in ids if sizes[j - 1] >= max(30, 0.003 * big) and near[lab == j].any()]
    out = rgba.copy()
    out[..., 3] = np.where(np.isin(lab, keep), out[..., 3], 0)
    return out


def bbox(rgba, pad=2):
    ys, xs = np.where(rgba[..., 3] > 40)
    H, W = rgba.shape[:2]
    return max(0, ys.min() - pad), min(H, ys.max() + 1 + pad), max(0, xs.min() - pad), min(W, xs.max() + 1 + pad)


def highlights(rgb):
    """左右の目のハイライト（まわりが黒目の しろい点）の中心を (x, y, 面積) で 返す。"""
    H, W = rgb.shape[:2]
    luma = rgb.astype(np.float32).mean(axis=2)
    bright = rgb.min(axis=2) > 225
    lab, nl = ndi.label(bright)
    res = []
    for j in range(1, nl + 1):
        ys, xs = np.where(lab == j)
        if not (25 <= len(ys) <= 1500):
            continue
        cy, cx = ys.mean(), xs.mean()
        if not (0.25 * H < cy < 0.65 * H):
            continue
        ring = ndi.binary_dilation(lab == j, iterations=6) & ~ndi.binary_dilation(lab == j, iterations=2)
        if (luma[ring] < 130).mean() < 0.6:
            continue
        res.append((cx, cy, len(ys)))
    return res


def pupil(rgb, hx, hy):
    """ハイライトを ふくむ 黒目（くらい塊）の 重心。"""
    luma = rgb.astype(np.float32).mean(axis=2)
    dark = luma < 130
    # ハイライトの穴を うめる（ハイライトの 8px まわりを くらい ことに する）
    hole = (rgb.min(axis=2) > 225)
    hl, _ = ndi.label(hole)
    j0 = hl[int(round(hy)), int(round(hx))]
    if j0:
        dark |= ndi.binary_dilation(hl == j0, iterations=2)
    # 目のまわりの 輪郭 や 黒い ぶちと つながらないよう、まるい 黒目だけ のこす
    dark = ndi.binary_opening(dark, structure=np.ones((3, 3)), iterations=6)
    lab, _ = ndi.label(dark)
    j = lab[int(round(hy)), int(round(hx))]
    if j == 0:
        return None
    ys, xs = np.where(lab == j)
    return xs.mean(), ys.mean(), len(ys)


if len(sys.argv) != 2:
    sys.exit(__doc__)
os.makedirs(OM_DIR, exist_ok=True)
rgba = to_rgba(sys.argv[1])
H, W = rgba.shape[:2]
lab, nl = ndi.label(rgba[..., 3] > 40)
cy, cx = (np.array(v) for v in zip(*ndi.center_of_mass(np.ones(lab.shape), lab, np.arange(1, nl + 1))))
owner = np.zeros(nl + 1, int) - 1
owner[1:] = (np.clip(cy * N // H, 0, N - 1) * N + np.clip(cx * N // W, 0, N - 1)).astype(int)
info = {}
for i, n in enumerate(GRID):
    m = ndi.binary_dilation(owner[lab] == i, iterations=3)
    cell = rgba.copy()
    cell[..., 3] = np.where(m, cell[..., 3], 0)
    cell = clean(cell)
    y0, y1, x0, x1 = bbox(cell)
    t = Image.fromarray(cell[y0:y1, x0:x1], 'RGBA')
    if n == 'ico':
        s = 180 / max(t.size)
        t = t.resize((max(1, round(t.size[0] * s)), max(1, round(t.size[1] * s))), Image.LANCZOS)
        c = Image.new('RGBA', (192, 192), (0, 0, 0, 0))
        c.paste(t, ((192 - t.size[0]) // 2, (192 - t.size[1]) // 2))
        out, path = c, '%s/henshin.webp' % ICO_DIR
    else:
        # 目の位置は 元の解像度で はかる（顔の中の 不透明な ところだけ見る）
        rgb = cell[y0:y1, x0:x1, :3]
        hl = highlights(rgb)
        w0, h0 = x1 - x0, y1 - y0
        info[n] = (w0, h0, hl, rgb)
        s = 320 / max(t.size)
        out = t.resize((max(1, round(t.size[0] * s)), max(1, round(t.size[1] * s))), Image.LANCZOS)
        path = '%s/%s.webp' % (OM_DIR, n)
    out.save(path, 'WEBP', quality=88, method=6)
    print('#', os.path.relpath(path, ROOT), out.size, os.path.getsize(path), 'bytes')

# 目の位置: 左右それぞれ いちばん大きい ハイライト → 黒目の重心
eyes = {}
for n, (w0, h0, hl, rgb) in info.items():
    L = [h for h in hl if h[0] < w0 / 2]
    R = [h for h in hl if h[0] >= w0 / 2]
    if not L or not R:
        sys.exit('目が みつからない: ' + n)
    L = max(L, key=lambda h: h[2])
    R = max(R, key=lambda h: h[2])
    p = [pupil(rgb, h[0], h[1]) for h in (L, R)]
    eyes[n] = (L, R, p)
    if n != 'panda':
        EYE_OFF[n] = [((q[0] - h[0]) / w0, (q[1] - h[1]) / w0) for q, h in zip(p, (L, R))]
if EYE_OFF:
    dx = np.mean([o[0] for v in EYE_OFF.values() for o in v])
    dy = np.mean([o[1] for v in EYE_OFF.values() for o in v])
print('# ハイライト→黒目のずれ（幅に対する割合）', round(dx, 4), round(dy, 4))
rows = []
for n in GRID[:-1]:
    w0, h0, _, _ = info[n]
    L, R, p = eyes[n]
    if n == 'panda':
        c = [(h[0] + dx * w0, h[1] + dy * w0) for h in (L, R)]
    else:
        c = [(q[0], q[1]) for q in p]
    ey = (c[0][1] + c[1][1]) / 2 / h0
    rows.append('  %s: { w: %d, h: %d, ex1: %.3f, ex2: %.3f, ey: %.3f }' % (n, round(w0 * 320 / max(w0, h0)), round(h0 * 320 / max(w0, h0)), c[0][0] / w0, c[1][0] / w0, ey))
print('{\n' + ',\n'.join(rows) + '\n}')
