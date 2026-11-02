#!/usr/bin/env bash
# unitprof.sh <mutant id> <lean tree> <out dir> [n] [unit-seconds]: unit.sh's run of the mutated unit with a CPU profile of
# every node process (lane B's child included when it exits on its own: n small, the bound large), into <out dir>/prof.
set -u
id=$1; lean=$2; outd=$3; n=${4:-3}; us=${5:-1200}
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
export LEAN_WORKER_HEAP_MB=6144
NODE_OPTIONS="--cpu-prof --cpu-prof-dir=$outd/prof" timeout 3600 node "$lean/langs/ts/check.mjs" --parent "$parent" --candidate "$cand" --unit "$unit" --n "$n" --seed 1 --dafny-seconds 30 --unit-seconds "$us" > "$outd/out.json" 2> "$outd/err.log"
rc=$?
rm -f "$parent" "$cand"
echo "exit=$rc"
