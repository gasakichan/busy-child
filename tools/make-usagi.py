#!/usr/bin/env python3
"""ひっぱり更新の うさぎ: マゼンタ背景の 4 コマ GIF（ChatGPT 製）を 透過 WebP 4 まいにする。
使い方: python3 tools/make-usagi.py はしる.gif
 → assets/usagi/run0〜3.webp（4 コマ 共通の 枠で 切るので ずれない。高さ 192px）
元 GIF はリポジトリに置かない。キーイングは make-kaeru.py と同じ（関数を そのまま 写してある）。"""
import os
import sys
import tempfile
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets', 'usagi')


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


def main(src):
    os.makedirs(OUT, exist_ok=True)
    gif = Image.open(src)
    frames = []
    with tempfile.TemporaryDirectory() as td:
        for i in range(gif.n_frames):
            gif.seek(i)
            p = os.path.join(td, 'f%d.png' % i)
            gif.convert('RGB').save(p)
            rgba, _ = clean(to_rgba(p))
            frames.append(rgba)
    al = np.max([f[..., 3] for f in frames], axis=0)
    ys, xs = np.where(al > 40)
    y0, y1, x0, x1 = max(0, ys.min() - 3), ys.max() + 4, max(0, xs.min() - 3), xs.max() + 4
    H = 192
    for i, f in enumerate(frames):
        img = Image.fromarray(f[y0:y1, x0:x1], 'RGBA')
        img = img.resize((round(img.width * H / img.height), H), Image.LANCZOS)
        save(img, os.path.join(OUT, 'run%d.webp' % i))


if __name__ == '__main__':
    main(sys.argv[1])
