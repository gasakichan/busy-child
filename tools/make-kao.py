#!/usr/bin/env python3
"""かおスロット の絵: マゼンタ背景のシート（3x3）を切り分けて透過 WebP にする。
使い方: python3 tools/make-kao.py シート.png
 左上から右へ inu neko usagi / kuma buta panda / raion kaeru robo（どうぶつの かお）
 → assets/kao/<id>.webp（256x256 の正方形・透過。かおが 248px に おさまる大きさで まんなかに）
 → ホームのアイコン assets/ico/kao.webp（192px。うえ 1/3 = inu、まんなか 1/3 = neko、した 1/3 = buta を つないだ かお）
元シートはリポジトリに置かない。キーイングは make-dokoka.py と同じ。"""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ICO_DIR = os.path.join(ROOT, 'assets', 'ico')
KAO_DIR = os.path.join(ROOT, 'assets', 'kao')
GRID = 'inu neko usagi kuma buta panda raion kaeru robo'.split()   # 3x3（左上から右へ）
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


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    os.makedirs(KAO_DIR, exist_ok=True)
    rgba = to_rgba(sys.argv[1])
    H, W = rgba.shape[:2]
    # 絵はマスから少しはみ出すことがあるので、つながった塊ごとに 重心のあるマスへ振り分ける
    lab, nl = ndi.label(rgba[..., 3] > 40)
    cy, cx = (np.array(v) for v in zip(*ndi.center_of_mass(np.ones(lab.shape), lab, np.arange(1, nl + 1)))) if nl else ([], [])
    owner = np.zeros(nl + 1, int) - 1
    owner[1:] = (np.clip(cy * 3 // H, 0, 2) * 3 + np.clip(cx * 3 // W, 0, 2)).astype(int)
    faces = {}
    for i, n in enumerate(GRID):
        m = ndi.binary_dilation(owner[lab] == i, iterations=3)
        cell = rgba.copy()
        cell[..., 3] = np.where(m, cell[..., 3], 0)
        cell, _ = clean(cell)
        if not (cell[..., 3] > 40).any():
            sys.exit('%s: セルが からっぽです' % n)
        faces[n] = square(crop(cell), 256, 248)
        save(faces[n], '%s/%s.webp' % (KAO_DIR, n))
    # ホームのアイコン: 3 つの かおの 上・中・下を つなぐ
    whole = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    for k, n in enumerate(['inu', 'neko', 'buta']):
        y0, y1 = round(256 * k / 3), round(256 * (k + 1) / 3)
        whole.paste(faces[n].crop((0, y0, 256, y1)), (0, y0))
    ico = Image.new('RGBA', (192, 192), (0, 0, 0, 0))
    ico.paste(whole.resize((180, 180), Image.LANCZOS), (6, 6))
    os.makedirs(ICO_DIR, exist_ok=True)
    save(ico, '%s/kao.webp' % ICO_DIR)


main()
