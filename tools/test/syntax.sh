#!/bin/bash
# 構文：スクリプトを取り出して node に通す。HTML の閉じ忘れも数える
T="$(cd "$(dirname "$0")" && pwd)"
R="$(cd "$T/../.." && pwd)"
F=$R/index.html
python3 - "$F" "$T" <<'PY'
import sys,re,io
s=io.open(sys.argv[1],encoding='utf-8').read()
js=re.findall(r'<script>(.*?)</script>',s,re.S)
io.open(sys.argv[2]+'/_a.js','w',encoding='utf-8').write(js[0])
io.open(sys.argv[2]+'/_b.js','w',encoding='utf-8').write(js[1])
body=re.sub(r'<script>.*?</script>','',s,flags=re.S); body=re.sub(r'<style>.*?</style>','',body,flags=re.S)
bad=0
for t in ['div','details','summary','button','p','ul','li','span','label','header','select','textarea','svg','b','i','em','strong','small','code','table','h1','h2']:
    o=len(re.findall(r'<%s[\s>]'%t,body)); c=len(re.findall(r'</%s>'%t,body))
    if o!=c: print('TAG MISMATCH',t,o,c); bad=1
ids=re.findall(r'\sid="([^"]+)"',body)
d=set([x for x in ids if ids.count(x)>1])
if d: print('DUP ID',d); bad=1
# JS が引く id が HTML にあるか
for m in set(re.findall(r'\bE\("([A-Za-z0-9_]+)"\)',js[0])+re.findall(r'getElementById\("([A-Za-z0-9_]+)"\)',js[0])):
    if m not in ids and ('id="'+m+'"') not in js[0]: print('MISSING ID',m); bad=1
css=''.join(re.findall(r'<style>(.*?)</style>',s,re.S))
if css.count('{')!=css.count('}'): print('CSS BRACE',css.count('{'),css.count('}')); bad=1
sys.exit(bad)
PY
r=$?
node --check $T/_a.js && node --check $T/_b.js && node --check $R/sw.js || r=1
python3 -c "import json;json.load(open('$R/version.json'));json.load(open('$R/manifest.webmanifest'))" || r=1
[ $r = 0 ] && echo "SYNTAX OK" || echo "SYNTAX NG"
exit $r
