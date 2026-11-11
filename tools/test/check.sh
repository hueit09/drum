#!/bin/bash
# 公開前の全検証。1つでも落ちたら公開しない
cd "$(dirname "$0")"
curl -s -o /dev/null http://127.0.0.1:8765/index.html || { (cd "$(pwd)/../.." && nohup python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &); sleep 1; }
[ -f wav/tom220.wav ] || node mkwav.js >/dev/null
fail=0
run(){ local name="$1"; shift; out=$("$@" 2>&1); rc=$?; ng=$(echo "$out" | grep -c '^NG'); ok=$(echo "$out" | grep -c '^ok'); 
  if [ $rc -ne 0 ]; then fail=1; echo "✗ $name  (ok $ok / NG $ng)"; echo "$out" | grep -v '^ok' | head -20; else echo "✓ $name  ($(echo "$out" | tail -1)${ok:+, $ok項目})"; fi; }
run "構文・マークアップ" ./syntax.sh
run "レシピ再現"        node recipe.js
run "画面の崩れ"        node layout.js
run "通し操作"          node flow.js
run "マイクで読む"      node mic.js
run "曲から"            node song.js
[ -d ../sep/hyd/data/drumkits/GMRockKit ] && run "本物の太鼓の録音"  node realdrum.js
[ $fail = 0 ] && echo "ALL OK" || echo "FAILED"
exit $fail
