#!/bin/bash
# guards.sh <tree> <outdir>: the GUARD lines of every pair file, translated as the pair runner does (--core --heap), 6 at a time
TREE="$1"; OUT="$2"; mkdir -p "$OUT"
one() { TREE="$1"; OUT="$2"; f="$3"; n=$(basename "$(dirname "$f")"); w=$(basename "$f" | sed 's/\..*//')
  node "$TREE/langs/ts/translate/translate.mjs" "$f" --core --suffix "$w" --out "$OUT/$n.$w.dfy" --prelude "$OUT/$n.$w.pre.dfy" --no-project --heap > "$OUT/$n.$w.log" 2>&1
  echo "$n $w exit $?" > "$OUT/$n.$w.exit"; }
export -f one
ls "$TREE"/langs/ts/tests/pairs/*/{parent,candidate}.{ts,tsx,mts} 2>&1 | grep -v "No such" | xargs -P 6 -I{} bash -c 'one "$0" "$1" "$2"' "$TREE" "$OUT" {}
cat "$OUT"/*.exit > "$OUT/exits.txt"
for f in "$OUT"/*.dfy; do b=$(basename "$f" .dfy); case "$b" in *.pre) continue;; esac; grep '^// GUARD' "$f" | sed "s|^|$b |"; done > "$OUT/guards.txt"
