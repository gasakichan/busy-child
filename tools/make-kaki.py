#!/usr/bin/env python3
"""かきじゅん データ（assets/kaki/kanjivg.js）を KanjiVG から つくる。
つかいかた: python3 tools/make-kaki.py [KanjiVG の kanji/ ディレクトリ]
ディレクトリを わたさないと GitHub から 1 もじずつ よむ。
KanjiVG (C) Ulrich Apel, CC BY-SA 3.0 — https://kanjivg.tagaini.net
"""
import json, os, re, sys, urllib.request

CHARS = ('あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほ'
         'まみむめもやゆよらりるれろわをん0123456789')
SRC = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/%05x.svg'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'kaki', 'kanjivg.js')

def load(ch, d):
    if d:
        with open(os.path.join(d, '%05x.svg' % ord(ch)), encoding='utf-8') as f:
            return f.read()
    with urllib.request.urlopen(SRC % ord(ch)) as r:
        return r.read().decode('utf-8')

def num(m):
    v = round(float(m.group(0)), 1)
    s = ('%.1f' % v).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s.replace('0.', '.', 1) if s.startswith('0.') else s.replace('-0.', '-.', 1)

def main():
    d = sys.argv[1] if len(sys.argv) > 1 else None
    data = {}
    for ch in CHARS:
        svg = load(ch, d)
        paths = re.findall(r'<path[^>]*\bid="kvg:[0-9a-f]+-s(\d+)"[^>]*\bd="([^"]+)"', svg)
        paths.sort(key=lambda p: int(p[0]))
        data[ch] = [re.sub(r'-?\d*\.?\d+(?:e-?\d+)?', num, p[1]) for p in paths]
        assert data[ch], ch
    js = ('/* かきじゅん データ（よこ・たて 109 の わく の なかの 1 かくずつの せんの パス）。\n'
          '   KanjiVG (C) Ulrich Apel ほか。CC BY-SA 3.0 https://creativecommons.org/licenses/by-sa/3.0/\n'
          '   https://kanjivg.tagaini.net より、すうちを まるめて ぬきだした もの（tools/make-kaki.py で つくりなおせる）。\n'
          '   この ファイルは CC BY-SA 3.0 で くばる。 */\n'
          'window.KAKI = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('],"', '],\n"') + ';\n')
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(js)
    print(OUT, len(js), 'bytes', {k: len(v) for k, v in data.items()})

main()
