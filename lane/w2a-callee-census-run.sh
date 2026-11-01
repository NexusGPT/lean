#!/usr/bin/env bash
# The callee census over one population, three roots at a time (w2a-callee-census lane, 2026-11-01).
#   bash lane/w2a-callee-census-run.sh <population-name> <out-dir> <source-root>...
# Each root is copied (without node_modules) to /root/census-installs/w2a/<population>-<name>, read there by
# `census.mjs --install-under /root/census-installs/w2a --callees --clean-after` (the install is the census's own:
# the lockfile's manager, frozen, --ignore-scripts), and the copy is removed. The sources are never written.
# Before each root: the one-minute load is read, and above 40 the run waits five minutes and reads it again; `/` keeps
# more than 40 GB free.
set -u
POP="$1"; OUT="$2"; shift 2
TREE="$(cd "$(dirname "$0")/.." && pwd)"
UNDER=/root/census-installs/w2a
mkdir -p "$OUT" "$UNDER"
one() {
  local src="$1" name; name="$(basename "$src")"
  while :; do
    local load; load="$(cut -d' ' -f1 /proc/loadavg)"
    local free; free="$(df --output=avail -BG / | tail -1 | tr -dc 0-9)"
    if awk -v l="$load" 'BEGIN { exit !(l > 40) }' || [ "$free" -le 60 ]; then
      echo "$(date -u +%FT%TZ) $name waits: load $load, free ${free}G" >> "$OUT/run.log"; sleep 300; continue
    fi
    echo "$(date -u +%FT%TZ) $name starts: load $load, free ${free}G" >> "$OUT/run.log"; break
  done
  local copy="$UNDER/$POP-$name"
  rm -rf "$copy" && mkdir -p "$copy" && (cd "$src" && tar --exclude=node_modules -cf - .) | (cd "$copy" && tar -xf -)
  local t0; t0=$(date +%s)
  NODE_OPTIONS=--max-old-space-size=12288 node "$TREE/langs/ts/census.mjs" "$copy" --install-under "$UNDER" --npm-cache "$UNDER/.npm-cache" \
    --callees --clean-after --out "$OUT/$name.json" --report "$OUT/$name.md" > "$OUT/$name.log" 2>&1
  local code=$?
  echo "exit $code" >> "$OUT/$name.log"
  echo "$(date -u +%FT%TZ) $name exit $code $(( $(date +%s) - t0 )) s" >> "$OUT/run.log"
  rm -rf "$copy"
}
export -f one; export POP OUT TREE UNDER
printf '%s\n' "$@" | xargs -P 3 -I{} bash -c 'one "$@"' _ {}
echo "$(date -u +%FT%TZ) done" >> "$OUT/run.log"
