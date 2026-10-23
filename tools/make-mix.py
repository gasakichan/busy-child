#!/usr/bin/env python3
"""まぜまぜラボの絵: マゼンタ背景の 3x3 シートを切り分けて透過 WebP（192px 正方形）にする。
使い方: python3 tools/make-mix.py 出力dir シート1.png シート2.png シート3.png
各シートは左上→右、上→下の順に 9 個。元シートはリポジトリに置かない。
背景は均一マゼンタ（#FF00FF 付近）。キー = min(R,B) - G。背景に接する縁の画素は
輪郭の焦げ茶との混色なので、アルファを混色比から出して、マゼンタ成分を戻す（デスピル）。"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

NAMES = [
    'hi mizu tsuchi kaze tane yuki ohisama yuge osara',
    'kikyu popcorn mizutamari umi doro nami me koori yama',
    'suna hana yukiyama fusen tanpopo yukinohana ki yukiusagi yukidaruma',
]
SIZE, FIT = 192, 176          # キャンバス / 絵の長辺
OUTLINE_M = -35.0             # 輪郭の焦げ茶の min(R,B)-G（縁の混色比の基準）

out, sheets = sys.argv[1], sys.argv[2:]
assert len(sheets) == 3, 'シートは 3 枚'

def key(a):
    return np.minimum(a[..., 0], a[..., 2]) - a[..., 1]

for names, src in zip(NAMES, sheets):
    im = Image.open(src).convert('RGB')
    W, H = im.size
    a = np.asarray(im).astype(np.float32)
    m = key(a)
    bgc = np.median(a[m > 200], axis=0)           # 背景色（ジッタの中央値）
    bgm = float(np.median(m[m > 200]))
    bg = m > 150
    bg = ndi.binary_opening(bg, iterations=1) | (m > 215)
    near = ndi.binary_dilation(bg, iterations=3) & ~bg
    # 縁: 混色比 a = (bgm - m) / (bgm - OUTLINE_M)
    alpha = np.where(bg, 0.0, 1.0)
    e = near & (m > OUTLINE_M)
    alpha[e] = np.clip((bgm - m[e]) / (bgm - OUTLINE_M), 0, 1)
    alpha[near & ~e] = 1.0
    # 縁をはっきりさせる（半透明の幅を狭く）
    alpha = np.clip((alpha - 0.08) / 0.84, 0, 1)
    k = np.maximum(alpha, 1e-3)[..., None]
    fg = np.clip((a - (1 - k) * bgc) / k, 0, 255)
    # 縁の画素の色は、近くの確実な前景色（輪郭の焦げ茶）に寄せてマゼンタ残りを消す
    solid = alpha > 0.98
    idx = ndi.distance_transform_edt(~solid, return_distances=False, return_indices=True)
    nearest = a[idx[0], idx[1]]
    edge = (alpha > 0) & (alpha < 0.98)
    mix = np.clip(alpha, 0, 1)[..., None]
    fg = np.where(edge[..., None], 0.55 * nearest + 0.45 * fg, fg)
    # 残ったピンク寄りを抑える: 縁の R,B が G より大きく上回る分を切る
    ex = np.minimum(fg[..., 0], fg[..., 2]) - fg[..., 1]
    spill = edge & (ex > 0)
    fg[..., 0] = np.where(spill, fg[..., 0] - ex * 0.6, fg[..., 0])
    fg[..., 2] = np.where(spill, fg[..., 2] - ex * 0.6, fg[..., 2])
    rgba = np.dstack([np.clip(fg, 0, 255), alpha * 255]).astype(np.uint8)
    # 絵はセル境界ぴったりに並ぶとは限らないので、つながった塊ごとに重心のセルへ振り分ける
    lab, nl = ndi.label(alpha > 0.16)
    ids = np.arange(1, nl + 1)
    sizes = ndi.sum(np.ones_like(alpha), lab, ids)
    cen = ndi.center_of_mass(np.ones_like(alpha), lab, ids)
    cellof = {}
    for j, (cy, cx) in zip(ids, cen):
        cellof[j] = min(2, int(cy * 3 / H)) * 3 + min(2, int(cx * 3 / W))
    for i, n in enumerate(names.split()):
        mine = [j for j in ids if cellof[j] == i]
        big = max(sizes[j - 1] for j in mine)
        keep = [j for j in mine if sizes[j - 1] >= max(30, 0.005 * big)]
        mask = np.isin(lab, keep)
        ys, xs = np.where(mask)
        y0, y1, x0, x1 = ys.min() - 2, ys.max() + 3, xs.min() - 2, xs.max() + 3
        print('  bbox', n, (x0, y0, x1, y1), 'cell', (i % 3 * W // 3, i // 3 * H // 3))
        cell = rgba[y0:y1, x0:x1].copy()
        if n == 'yuki':   # 元絵の輪郭だけ赤みが強いので、ほかの絵の焦げ茶にそろえる
            f = cell[..., :3].astype(np.float32)
            red = (f[..., 0] - f[..., 1] > 60) & (f[..., 0] < 190) & (f[..., 1] < 95) & (f[..., 2] < 75)
            f[red] *= np.array([0.68, 0.76, 0.66], np.float32)
            cell[..., :3] = f.astype(np.uint8)
        cell[..., 3] = np.where(mask[y0:y1, x0:x1], cell[..., 3], 0)
        al = cell[..., 3]
        ys, xs = np.where(al > 40)
        t = Image.fromarray(cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1], 'RGBA')
        s = FIT / max(t.size)
        t = t.resize((max(1, round(t.size[0] * s)), max(1, round(t.size[1] * s))), Image.LANCZOS)
        canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        canvas.paste(t, ((SIZE - t.size[0]) // 2, (SIZE - t.size[1]) // 2))
        canvas.save('%s/%s.webp' % (out, n), 'WEBP', quality=88, method=6)
        print(n, t.size)
