#!/usr/bin/env python3
"""かおスロット の絵: マゼンタ背景のシート（3x3）を切り分けて透過 WebP にする。
使い方: python3 tools/make-kao.py シート.png
 左上から右へ inu neko usagi / kuma buta panda / raion kaeru robo（どうぶつの かお）
 → assets/kao/<id>.webp（256x256 の正方形・透過。どの かおも おなじ ばいりつで、めの せんを y=138 に そろえ、だんの さかいで かおの はばを そろえる → 3 だんに きると みみ / め・はな / くち で りんかくが つながる）
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
EYE_Y = 138   # めの せんの たかさ（256px の なか）


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


def eyes(cell, cw):
    """めの たかさと まんなか: こげちゃの ぬりつぶし まる が よこに 2 つ ならんだ くみの うち いちばん したの もの（かえるの あたまの こぶより した）。"""
    a = cell[..., :3].astype(np.float32)
    dark = (cell[..., 3] > 200) & (a.mean(axis=2) < 95)
    r = max(3, int(cw * 0.022))
    yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
    blob = ndi.binary_opening(dark, structure=(xx * xx + yy * yy) <= r * r)
    lab, nl = ndi.label(blob)
    if nl < 2:
        return None
    ids = np.arange(1, nl + 1)
    cy, cx = (np.array(v) for v in zip(*ndi.center_of_mass(blob, lab, ids)))
    best = None
    for i in range(nl):
        for j in range(i + 1, nl):
            if abs(cy[i] - cy[j]) < cw * 0.06 and cw * 0.15 < abs(cx[i] - cx[j]) < cw * 0.6:
                y = (cy[i] + cy[j]) / 2
                if best is None or y > best[0]:
                    best = (y, (cx[i] + cx[j]) / 2)
    return best


def place(cell, cw, name):
    """みんな おなじ 大きさ（セルの はば → 256px）で、めの せんを そろえて おく。
    うえ 1/3 = みみ・あたま、まんなか 1/3 = め・はな、した 1/3 = くち・あご に なる（めは EYE_Y、まんなかと したの さかいは 171px）。"""
    e = eyes(cell, cw)
    ys, xs = np.where(cell[..., 3] > 40)
    if e is None:
        print('%s: めが みつからないので まんなかに おきます' % name)
        e = ((ys.min() + ys.max()) / 2, (xs.min() + xs.max()) / 2)
    s = 2 * 240.0 / cw   # 2 ばいで おいて、よこを そろえて から 256 に もどす
    t = crop(cell, 0)
    x0, y0 = xs.min(), ys.min()
    t = t.resize((max(1, round(t.size[0] * s)), max(1, round(t.size[1] * s))), Image.LANCZOS)
    c = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
    c.paste(t, (round(256 - (e[1] - x0) * s), round(2 * EYE_Y - (e[0] - y0) * s)), t)
    return np.asarray(c).astype(np.float32)


CUTS = (85, 171)   # 3 だんの さかい（256px の なか）


def span(a, y):
    """y の あたり（2 ばいの え）での かおの はしから はし（ひだり, みぎ）。"""
    rows = a[2 * y - 3:2 * y + 4, :, 3] > 128
    xs = np.where(rows.any(axis=0))[0]
    return (float(xs.min()), float(xs.max())) if len(xs) else (200.0, 312.0)


def even_up(faces):
    """だんの さかいで どの かおも おなじ はばと まんなかに なるよう、ぎょうごとに よこだけ のばす。
    さかいの あいだは なめらかに つなぎ、うえと したは さかいの ばいりつの まま。"""
    sp = {n: [span(a, y) for y in CUTS] for n, a in faces.items()}
    tw = [float(np.median([sp[n][k][1] - sp[n][k][0] for n in faces])) for k in range(2)]
    ys2 = np.array([2 * y for y in CUTS], np.float32)
    out = {}
    for n, a in faces.items():
        sc = [tw[k] / max(1.0, sp[n][k][1] - sp[n][k][0]) for k in range(2)]
        cx = [(sp[n][k][0] + sp[n][k][1]) / 2 for k in range(2)]
        pm = a.copy(); pm[..., :3] *= pm[..., 3:4] / 255.0
        res = np.zeros_like(a)
        X = np.arange(512, dtype=np.float32)
        for y in range(512):
            k = np.interp(y, ys2, sc); c = np.interp(y, ys2, cx)
            src = c + (X - 256) / k
            for ch in range(4):
                res[y, :, ch] = np.interp(src, X, pm[y, :, ch], left=0, right=0)
        al = res[..., 3:4]
        res[..., :3] = np.where(al > 0, res[..., :3] * 255.0 / np.maximum(al, 1e-3), 0)
        img = Image.fromarray(np.clip(res, 0, 255).astype(np.uint8), 'RGBA').resize((256, 256), Image.LANCZOS)
        out[n] = img
    return out


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
        faces[n] = place(cell, W / 3.0, n)
    faces = even_up(faces)
    for n in GRID:
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
