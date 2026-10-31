#!/bin/bash
# measure.sh <tree> <tag>: the heap-reach census (guard: exposure, determinate) then the lint census, one root at a time
set -u
TREE="$1"; TAG="$2"; OUT=/root/lanes/core-identity-destructured/census
export NODE_OPTIONS=--max-old-space-size=12288
for r in n8n langchainjs nexus; do
  echo "== heap-reach $r $TAG $(date -Is)"
  node "$TREE/langs/ts/design/heap-reach-census.mjs" "$OUT/hr/concepts-all.json" "$OUT/hr-$TAG-$r" --resolve --repos "$r" --tag "$TAG" > "$OUT/hr-$TAG-$r.log" 2>&1
  echo "exit $?"
done
for r in n8n langchainjs nexus; do
  echo "== census $r $TAG $(date -Is)"
  ( cd "$TREE" && node langs/ts/census.mjs "/root/da/census/repos/$r" --out "$OUT/census-$TAG-$r.json" ) > "$OUT/census-$TAG-$r.log" 2>&1
  echo "exit $?"
done
echo "== done $(date -Is)"
