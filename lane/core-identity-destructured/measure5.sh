#!/bin/bash
# measure5.sh: nexus before and after on the first 12000
# units (same file order on both sides; the machine's memory killed the full runs twice), then the lint census
set -u
L=/root/lanes/core-identity-destructured; OUT=$L/census
hr() { TREE=$L/$1; TAG=$2; r=$3; echo "== heap-reach $r $TAG (limit 12000 units) $(date -Is)"; rm -rf "$OUT/hr-$TAG-$r"; NODE_OPTIONS=--max-old-space-size=6144 node "$TREE/langs/ts/design/heap-reach-census.mjs" "$OUT/hr/concepts-all.json" "$OUT/hr-$TAG-$r" --resolve --repos "$r" --tag "$TAG" --limit 12000 > "$OUT/hr-$TAG-$r.log" 2>&1; echo "exit $?"; }
cen() { TREE=$L/$1; TAG=$2; r=$3; echo "== census $r $TAG $(date -Is)"; ( cd "$TREE" && NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs "/root/da/census/repos/$r" --out "$OUT/census-$TAG-$r.json" ) > "$OUT/census-$TAG-$r.log" 2>&1; echo "exit $?"; }
hr base before nexus; hr tree after nexus; hr scratch readonly nexus
for r in n8n langchainjs nexus; do cen base before $r; cen tree after $r; done
echo "== done $(date -Is)"
