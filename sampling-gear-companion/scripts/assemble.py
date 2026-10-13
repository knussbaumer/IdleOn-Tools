"""Assemble index.html from src/template.html, the bundled parser and the data files.

The top-sampler benchmarks (data/bench*.json) are a snapshot of public IdleonToolbox profiles.
No personal save is embedded: the page starts empty and the user imports their own.

Usage: python3 scripts/assemble.py <sampling-gear-companion dir>
"""
import os
import sys

root = sys.argv[1]
read = lambda p: open(os.path.join(root, p), encoding='utf-8').read().replace('</script', '<\\/script')
t = open(os.path.join(root, 'src', 'template.html'), encoding='utf-8').read()
parts = [
    ('/*__BUNDLE__*/', read('.build/bundle.js')),
    ('/*__BENCH__*/', read('data/bench.json')),
    ('/*__KIM__*/', 'null'),
    ('/*__DET__*/', read('data/benchdet.json')),
    ('/*__INP__*/', read('data/benchinp.json')),
    ('/*__BIS__*/', read('data/bis.json')),
    ('/*__ICONS__*/', read('data/icons.json')),
]
for key, value in parts:
    assert key in t, key
    t = t.replace(key, value, 1)
t = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' + t.replace('<div class="wrap">', '</head>\n<body>\n<div class="wrap">', 1) + '\n</body>\n</html>\n'
open(os.path.join(root, 'index.html'), 'w', encoding='utf-8').write(t)
print('index.html', round(len(t) / 1e6, 2), 'MB')
