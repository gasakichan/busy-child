#!/usr/bin/env python3
"""ねこさがしの物の「なかみマップ」NK_SOLID を assets/neko/*.webp のアルファから作って表示する。
物の絵を差し替えたら実行して、index.html の NK_SOLID を置きかえる。
使い方: python3 tools/neko-solid.py"""
import numpy as np
from PIL import Image
keys = 'sofa plant box toybox basket table bear ball tree bush slide bench rock flowers mushroom bucket'.split()
N = 16
print('  var NK_SOLID = {')
for n, k in enumerate(keys):
    a = np.asarray(Image.open('assets/neko/%s.webp' % k).convert('RGBA'))[..., 3] > 128
    H, W = a.shape
    rows = [''.join('1' if a[j*H//N:(j+1)*H//N, i*W//N:(i+1)*W//N].mean() >= 0.85 else '0' for i in range(N)) for j in range(N)]
    print("    %s: '%s'%s" % (k, '|'.join(rows), ',' if n < len(keys) - 1 else ''))
print('  };')
