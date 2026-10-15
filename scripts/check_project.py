"""Portable static release checks; no browser/network access or third-party packages."""
from pathlib import Path
import ast
import json
import re
import shutil
import subprocess
import sys
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
errors=[]
node=shutil.which('node')
if not node:
    raise SystemExit('Node.js is required for JavaScript syntax checks; install it explicitly or use an existing installation.')
thread_scheme='codex'+'://threads/'
files=[p for p in ROOT.rglob('*') if p.is_file() and not any(x in {'.git','.local','__pycache__','node_modules'} for x in p.relative_to(ROOT).parts)]
links=0
for p in files:
    rel=str(p.relative_to(ROOT))
    if p.suffix not in {'.md','.html','.js','.mjs','.py','.yaml','.txt'}:
        continue
    raw=p.read_bytes()
    if raw.startswith(b'\xef\xbb\xbf'):errors.append(f'{rel}: UTF-8 BOM')
    try:text=raw.decode('utf-8')
    except UnicodeDecodeError:errors.append(f'{rel}: not UTF-8');continue
    if '\ufffd' in text:errors.append(f'{rel}: replacement character')
    if re.search(r'[A-Za-z]:[\\/]Users[\\/]|[A-Za-z]:[\\/]C_Documents[\\/]',text) or thread_scheme in text:errors.append(f'{rel}: private local reference')
    if re.search(r'gh[pousr]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9]{32,}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----',text):errors.append(f'{rel}: possible credential')
    if p.suffix=='.py':
        try:ast.parse(text)
        except SyntaxError as e:errors.append(f'{rel}: {e}')
    if p.suffix=='.md':
        for target in re.findall(r'\]\(([^)]+)\)',text):
            if target.startswith(('https://','http://','#','mailto:')):continue
            target=unquote(target.split('#')[0]);links+=1
            if not (p.parent/target).exists():errors.append(f'{rel}: broken link {target}')
    if p.suffix in {'.js','.mjs'}:
        result=subprocess.run([node,'--check',str(p)],capture_output=True,text=True)
        if result.returncode:errors.append(f'{rel}: JavaScript syntax failed: {result.stderr.strip()}')

required=['README.md','README.en.md','LICENSE','NOTICE.md','THIRD_PARTY_NOTICES.md',
          'assets/readme/cover.png','assets/readme/three-directions.gif',
          'licenses/p5-LGPL-2.1.txt','licenses/NotoSansSC-OFL-1.1.txt','licenses/Playwright-Apache-2.0.txt']
for name in required:
    if not (ROOT/name).is_file():errors.append(f'Missing {name}')
skill=ROOT/'skills/p5-explainer-animation/SKILL.md'
if not re.search(r'^---\s*\nname: p5-explainer-animation\ndescription: .+\n---',skill.read_text(encoding='utf-8')):errors.append('Invalid Skill frontmatter')
license_text=(ROOT/'LICENSE').read_text(encoding='utf-8')
if 'MIT License' not in license_text or 'Copyright (c) 2026 SalamancaDu' not in license_text:errors.append('License identity mismatch')
result=subprocess.run([sys.executable,'-B',str(ROOT/'scripts/build_examples.py'),'--check'],capture_output=True,text=True)
if result.returncode:errors.append(result.stdout+result.stderr)
print(json.dumps(dict(files=len(files),local_links=links,errors=errors),ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
