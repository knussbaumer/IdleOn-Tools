"""Insert or refresh the shared tools menu (assets/nav-snippet.html) at the top of every tool page.

Usage: python3 scripts/sync-nav.py   (run from the repo root after rebuilding a tool)
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
snippet = open(os.path.join(ROOT, 'assets', 'nav-snippet.html'), encoding='utf-8').read().strip()
TOOLS = {'gap': ['sample-gap-finder/index.html', 'sample-gap-finder/src/template.html'],
         'stamp': ['stamp-planner/index.html', 'stamp-planner/src/page-body.html']}
MARGIN = {'gap': '-24px -16px 18px', 'stamp': '0'}
block = re.compile(r'<!-- tools-nav:.*?<!-- /tools-nav -->\n?', re.S)
for key, files in TOOLS.items():
    nav = snippet.replace('{{margin}}', MARGIN[key])
    for k in TOOLS:
        nav = nav.replace('{{%s}}' % k, ' aria-current="page"' if k == key else '')
    for rel in files:
        path = os.path.join(ROOT, rel)
        if not os.path.exists(path):
            continue
        t = open(path, encoding='utf-8').read()
        t = block.sub('', t)
        t = t.replace('<div class="wrap">', nav + '\n<div class="wrap">', 1)
        open(path, 'w', encoding='utf-8').write(t)
        print('menu in', rel)
