#!/bin/bash
# candidate-only lean runs of the 10 units, PR head and mutant; LEAN=<lean tree> OUT=<dir>
set -u
export LEAN_WORKER_HEAP_MB=6144
LEAN=${LEAN:-/root/lanes/w9k-new-code/tree}
OUT=${OUT:-/root/da-bench/w9k-new-code/probe}
mkdir -p "$OUT"
python3 -c "
import json
for k,v in json.load(open('/root/da-bench/w9k-new-code/ten.json')).items(): print(k, v['checkout'], v['file'], v['mutated'], v['unit'])
" | while read mid ck file mutated unit; do
  for side in head mut; do
    f=$file; [ $side = mut ] && f=$mutated
    tag="${mid//[#~]/_}.$side"
    [ $side = head ] && [ -f "$OUT/${mid%~*}.$unit.head.json" ] && continue
    [ $side = head ] && tag="${mid%~*}.$unit.head"
    ( cd "$ck" && timeout 900 node --max-old-space-size=12288 "$LEAN/langs/ts/check.mjs" --candidate "$f" --unit "$unit" --n ${N:-30} --dafny-seconds 5 --out "$OUT/$tag.json" > "$OUT/$tag.log" 2>&1 ); echo "$tag exit=$?"
  done
done
