#!/usr/bin/env bash
# The ranked tables of one population of --callees runs (w2a-callee-census lane, 2026-11-01).
#   bash lane/w2a-callee-census-tables.sh <population-name> <runs-dir> <tables-dir>
# Three views over the same runs, each its JSON and Markdown: all origins; the world library (ecmascript, web, node,
# package); outside the language (web, node, package). Only complete runs are read (census.mjs refuses a partial one).
set -eu
POP="$1"; RUNS="$2"; OUT="$3"
TREE="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$OUT"
# the finished runs only: a root's log whose last line is `exit 0` (a run still walking holds a partial JSON)
FILES=(); for j in "$RUNS"/*.json; do l="${j%.json}.log"; [ -f "$l" ] && [ "$(tail -1 "$l")" = "exit 0" ] && FILES+=("$j"); done
t() { NODE_OPTIONS=--max-old-space-size=16384 node "$TREE/langs/ts/census.mjs" --callee-table "${FILES[@]}" --top 50 "$@"; }
t --out "$OUT/$POP-all.json" --report "$OUT/$POP-all.md" --title "Callee census, $POP: all origins"
t --origins ecmascript,web,node,package --out "$OUT/$POP-world.json" --report "$OUT/$POP-world.md" --title "Callee census, $POP: the world library (ecmascript, web, node, package)"
t --origins web,node,package --out "$OUT/$POP-host.json" --report "$OUT/$POP-host.md" --title "Callee census, $POP: outside the language (web, node, package)"
echo "$POP: ${#FILES[@]} runs -> $OUT"
