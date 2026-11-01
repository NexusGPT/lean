#!/usr/bin/env bash
# w8e: one root through census.mjs --callees from a tree, on a copy (the source never written)
#   bash census-one.sh <tree> <root-src> <out-prefix>
set -u
TREE="$1"; SRC="$2"; OUT="$3"; name="$(basename "$SRC")"
UNDER=/root/census-installs/w8e
while awk -v l="$(cut -d' ' -f1 /proc/loadavg)" 'BEGIN { exit !(l > 64) }'; do echo "$(date -u +%T) load high, waiting" >&2; sleep 120; done
copy="$UNDER/$(basename "$OUT")-$name"
rm -rf "$copy" && mkdir -p "$copy" && (cd "$SRC" && tar --exclude=node_modules -cf - .) | (cd "$copy" && tar -xf -)
export LEAN_WORKER_HEAP_MB=6144
NODE_OPTIONS=--max-old-space-size=12288 node "$TREE/langs/ts/census.mjs" "$copy" --install-under "$UNDER" --npm-cache "$UNDER/.npm-cache" \
  --callees --clean-after --out "$OUT.json" --report "$OUT.md" > "$OUT.log" 2>&1
code=$?
echo "exit $code" >> "$OUT.log"
rm -rf "$copy"
exit $code
