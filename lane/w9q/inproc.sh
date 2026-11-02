#!/usr/bin/env bash
# inproc.sh <mutant id> <lean tree> <out dir> [n]: inproc.mjs on the mutant's unit (the parent and candidate as unit.sh
# writes them), under --cpu-prof into <out dir>/prof.
set -u
id=$1; lean=$2; outd=$3; n=${4:-3}
D3=/root/da-lanes/w9d-hour-bench/tree/research/open-code-review/d3
inst=$D3/bench/instances/$id.json
read -r path unit mb patchf < <(python3 -I -c '
import json,sys; d=json.load(open(sys.argv[1])); e=d["edit"]; print(e["path"], e["unit"], d["merge_base"], e["patch"])' "$inst")
ck=/root/da-bench/w9q-parent-load-rest/ck/${id%~*}
dir=$(dirname "$path"); base=$(basename "$path"); tag=$(echo "$id" | tr -c 'A-Za-z0-9\n' _)
parent=$dir/.lean_base_${tag}_$base; cand=$dir/.lean_mut_${tag}_$base
mkdir -p "$outd/prof"
cd "$ck" || exit 2
git show "$mb:$path" > "$parent" || exit 2
patch -s -p1 -o "$cand" -i "$D3/bench/$patchf" "$path" || exit 2
timeout 3600 node --max-old-space-size=6144 --cpu-prof --cpu-prof-dir="$outd/prof" /root/lanes/w9q-parent-load-rest/tree/lane/w9q/inproc.mjs "$lean" "$ck/$parent" "$ck/$cand" "$unit" "$n" > "$outd/out.json" 2> "$outd/err.log"
rc=$?
rm -f "$parent" "$cand"
echo "exit=$rc"; cat "$outd/out.json"
