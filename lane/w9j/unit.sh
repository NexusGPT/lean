#!/usr/bin/env bash
# One mutant's mutated unit through lean's check.mjs alone (no model), as w8b's unit.sh: the parent is the unit's file at
# the merge base, the candidate the PR head's file with the mutant's patch applied, both written beside the file so their
# imports resolve as the file's own. The checkout is the PR head (ck.sh), never modified.
#   unit.sh <mutant id> <lean tree> <out json> [control]
# control: the candidate is the PR head's file without the mutation (the PR's own change against the merge base)
# Prints "<id> <tree> exit=<code> verdict=<verdict> | <reason>".
set -u
id=$1; lean=$2; out=$3; mode=${4:-mutant}
D3=/root/da-lanes/w9d-hour-bench/tree/research/open-code-review/d3
inst=$D3/bench/instances/$id.json
read -r path unit mb patchf < <(python3 -I -c '
import json,sys; d=json.load(open(sys.argv[1])); e=d["edit"]; print(e["path"], e["unit"], d["merge_base"], e["patch"])' "$inst")
ck=/root/da-bench/w9j-parent-load/ck/${id%~*}
dir=$(dirname "$path"); base=$(basename "$path"); tag=$(echo "$id" | tr -c 'A-Za-z0-9\n' _)
parent=$dir/.lean_base_${tag}_$base; cand=$dir/.lean_mut_${tag}_$base
cd "$ck" || exit 2
git show "$mb:$path" > "$parent" || exit 2
if [ "$mode" = control ]; then cp "$path" "$cand" || exit 2; else patch -s -p1 -o "$cand" -i "$D3/bench/$patchf" "$path" || exit 2; fi
export LEAN_WORKER_HEAP_MB=6144
timeout 1800 node "$lean/langs/ts/check.mjs" --parent "$parent" --candidate "$cand" --unit "$unit" --n 30 --seed 1 --dafny-seconds 30 > "$out" 2> "$out.stderr"
rc=$?
rm -f "$parent" "$cand"
v=$(python3 -I -c 'import json,sys
try: d=json.load(open(sys.argv[1])); B=d.get("certificate",{}).get("lanes",{}).get("B") or {}; print(d.get("verdict"), "| B", B.get("verdict"), B.get("kind"), str(B.get("reason",""))[:200].replace("\n"," "))
except Exception as x: print("unparsed", x)' "$out")
echo "$id $(basename "$(dirname "$lean")")/$(basename "$lean") $mode exit=$rc verdict=$v"
