#!/usr/bin/env python3
"""どこかな の絵: マゼンタ背景のシート（4x4）を切り分けて透過 WebP にする。
使い方: python3 tools/make-dokoka.py シート.png
 左上から右へ tokei ringo banana kutsu / boushi koppu haburashi kuruma / boru onigiri kasa pan / ichigo kuma shutter ico
 → assets/dokoka/<name>.webp（どうぐ・たべものは 長辺 256px、shutter は 長辺 320px で 色ちがい shutter0〜5）、ico は assets/ico/dokoka.webp（192px 正方形）
元シートはリポジトリに置かない。キーイングは make-kaeru.py と同じ。"""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ICO_DIR = os.path.join(ROOT, 'assets', 'ico')
DK_DIR = os.path.join(ROOT, 'assets', 'dokoka')
GRID = 'tokei ringo banana kutsu boushi koppu haburashi kuruma boru onigiri kasa pan ichigo kuma shutter ico'.split()   # 4x4（左上から右へ）
SHUTTER_COL = [(352, 0.8), (32, 1.0), (50, 1.0), (105, 0.8), (205, 1.0), (268, 0.8)]   # とびら 6 つの 色（色相・彩度の倍率）
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


def long_side(t, n, pad=3):
    s = (n - 2 * pad) / max(t.size)
    t = t.resize((max(1, round(t.size[0] * s)), max(1, round(t.size[1] * s))), Image.LANCZOS)
    c = Image.new('RGBA', (t.size[0] + 2 * pad, t.size[1] + 2 * pad), (0, 0, 0, 0))
    c.paste(t, (pad, pad))
    return c


if len(sys.argv) != 2:
    sys.exit(__doc__)
os.makedirs(DK_DIR, exist_ok=True)
rgba = to_rgba(sys.argv[1])
H, W = rgba.shape[:2]
# 絵はマスから少しはみ出すことがあるので、つながった塊ごとに 重心のあるマスへ振り分ける
lab, nl = ndi.label(rgba[..., 3] > 40)
cy, cx = (np.array(v) for v in zip(*ndi.center_of_mass(np.ones(lab.shape), lab, np.arange(1, nl + 1)))) if nl else ([], [])
owner = np.zeros(nl + 1, int) - 1
owner[1:] = (np.clip(cy * 4 // H, 0, 3) * 4 + np.clip(cx * 4 // W, 0, 3)).astype(int)
for i, n in enumerate(GRID):
    m = owner[lab] == i
    m = ndi.binary_dilation(m, iterations=3)
    cell = rgba.copy()
    cell[..., 3] = np.where(m, cell[..., 3], 0)
    cell, _ = clean(cell)
    t = crop(cell)
    if n == 'ico':
        save(square(t, 192, 180), '%s/dokoka.webp' % ICO_DIR)
    elif n == 'shutter':
        t = long_side(t, 320)
        # 色ちがい 6 まい（水色の ところだけ 色相を かえる。焦げ茶の 輪郭は そのまま）
        a = np.asarray(t)
        hsv = np.asarray(Image.fromarray(a[..., :3]).convert('HSV')).copy()
        blue = (hsv[..., 0] >= 150 * 255 // 360) & (hsv[..., 0] <= 240 * 255 // 360) & (hsv[..., 1] > 20)
        for j, (hue, sat) in enumerate(SHUTTER_COL):
            h2 = hsv.copy()
            h2[..., 0] = np.where(blue, hue * 255 // 360, h2[..., 0])
            h2[..., 1] = np.where(blue, np.clip(h2[..., 1].astype(int) * sat, 0, 255), h2[..., 1]).astype(np.uint8)
            rgb = np.asarray(Image.fromarray(h2, 'HSV').convert('RGB'))
            save(Image.fromarray(np.dstack([rgb, a[..., 3]]), 'RGBA'), '%s/shutter%d.webp' % (DK_DIR, j))
    else:
        save(long_side(t, 256), '%s/%s.webp' % (DK_DIR, n))
