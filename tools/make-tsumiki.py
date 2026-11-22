#!/usr/bin/env python3
"""つみき（tsumiki）用の 3D / 物理ライブラリを assets/tsumiki/ に ふつうの <script> として 置く。

ESM のままだと file:// で import() できない（e2e も file:// で うごく）ので、さいごの
`export { a as X, ... };` を `window.NAME = { X: a, ... };` に かえて 即時関数で つつむ。

  npm pack three@0.170.0 cannon-es@0.20.0
  tar xzf three-0.170.0.tgz -C t && tar xzf cannon-es-0.20.0.tgz -C c
  python3 tools/make-tsumiki.py t/package c/package
"""
import os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'tsumiki')


def wrap(src, glob, banner):
    m = list(re.finditer(r'export\s*\{([^}]*)\}\s*;?\s*$', src))
    if not m:
        sys.exit('export が みつからない: ' + glob)
    m = m[-1]
    body = src[:m.start()]
    if re.search(r'^\s*(import|export)\b', body, re.M) or 'import.meta' in body:
        sys.exit('のこりの import/export がある: ' + glob)
    pairs = []
    for part in m.group(1).split(','):
        part = part.strip()
        if not part:
            continue
        a = re.split(r'\s+as\s+', part)
        local, name = (a[0], a[1]) if len(a) == 2 else (a[0], a[0])
        pairs.append('%s:%s' % (name.strip(), local.strip()))
    return banner + '(function(){\n' + body + '\nwindow.' + glob + '={' + ','.join(pairs) + '};\n})();\n'


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    three, cannon = sys.argv[1], sys.argv[2]
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(three, 'build', 'three.module.min.js'), encoding='utf-8') as f:
        s = f.read()
    with open(os.path.join(OUT, 'three.js'), 'w', encoding='utf-8') as f:
        f.write(wrap(s, 'THREE', '/* three.js r170 (MIT) — tools/make-tsumiki.py が ESM から つくった */\n'))
    with open(os.path.join(cannon, 'dist', 'cannon-es.js'), encoding='utf-8') as f:
        s = f.read()
    with open(os.path.join(OUT, 'cannon.js'), 'w', encoding='utf-8') as f:
        f.write(wrap(s, 'CANNON', '/* cannon-es 0.20.0 (MIT) — tools/make-tsumiki.py が ESM から つくった */\n'))
    shutil.copy(os.path.join(three, 'LICENSE'), os.path.join(OUT, 'LICENSE-three.txt'))
    shutil.copy(os.path.join(cannon, 'LICENSE'), os.path.join(OUT, 'LICENSE-cannon-es.txt'))
    print('ok', OUT)


main()
