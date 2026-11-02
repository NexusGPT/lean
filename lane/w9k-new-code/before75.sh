#!/bin/bash
# the before side of the 75, queued on the shared bench lock; every start, end and signal logged
L=/root/da-bench/w9k-new-code/before75-wrapper.log
echo "$(date -u +%FT%TZ) wrapper $$ start" >> $L
trap 'echo "$(date -u +%FT%TZ) wrapper $$ got SIGTERM" >> $L' TERM
trap 'echo "$(date -u +%FT%TZ) wrapper $$ got SIGHUP" >> $L' HUP
rm -rf /root/ramwork/w9k-hour.work/w9k-before-75c
cd /root/da-lanes/w9k-new-code/bench-before/research/open-code-review/d3
LEAN_WORKER_HEAP_MB=6144 flock /root/runs/bench.lock bash -c 'echo "$(date -u +%FT%TZ) lock taken" >> /root/da-bench/w9k-new-code/before75-wrapper.log; exec python3 -I bench/hour.py --lean /root/lanes/w9k-new-code/lean-before --name w9k-before-75c --jobs 4 --cap 5 --lean-timeout 600 --load-max 64 --out /root/da-bench/w9k-new-code/hour --work /root/ramwork/w9k-hour.work' >> /root/da-bench/w9k-new-code/hour-before-75c.log 2>&1
echo "$(date -u +%FT%TZ) wrapper $$ end exit=$?" >> $L
