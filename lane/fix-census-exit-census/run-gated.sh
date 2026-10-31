#!/usr/bin/env bash
# One census at a time, each started only when at least 12 GB are available and fewer than 6 census.mjs processes
# run (the lane's memory rule; node processes only: the lanes' own command lines name census.mjs in their brief text); tree (this lane) then base (lean-30569d74) per root, n8n then langchainjs.
set -u
out=/root/lanes/fix-census-exit/census
for root in n8n langchainjs; do
  for side in tree base; do
    while :; do
      avail=$(free -g | awk '/^Mem:/ {print $7}')
      running=$(pgrep -fc '^(\S*/)?node .*census\.mjs')
      echo "$(date -u +%FT%TZ) gate $root $side: available ${avail} GB, census processes ${running}"
      if [ "$avail" -ge 12 ] && [ "$running" -lt 6 ]; then break; fi
      sleep 300
    done
    echo "$(date -u +%FT%TZ) start $root $side"
    NODE_OPTIONS=--max-old-space-size=12288 node "/root/lanes/fix-census-exit/$side/langs/ts/census.mjs" "/root/da/census/repos/$root" --out "$out/$root-$side.json" > "$out/$root-$side.log" 2>&1
    echo "$(date -u +%FT%TZ) end $root $side exit $?"
  done
done
