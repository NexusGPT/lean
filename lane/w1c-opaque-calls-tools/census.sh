#!/bin/bash
# the census on the lane's three roots (A8), at the base (4747022f, a git archive in scratch/base) and at the lane's head
S=/root/lanes/w1c-opaque-calls/scratch
for r in nexus-agent-api snitch pipedream; do
  for side in ${SIDES:-base head}; do
    if [ $side = base ]; then C=$S/base/langs/ts/census.mjs; else C=/root/lanes/w1c-opaque-calls/tree/langs/ts/census.mjs; fi
    echo "$(date -u +%H:%M:%S) start $r $side load $(cut -d' ' -f1 /proc/loadavg)"
    node $C /root/da/census/repos/$r --install-under /root/census-installs/w1c --out $S/census/$r-$side.json --report $S/census/$r-$side.md > $S/census/$r-$side.log 2>&1
    echo "$(date -u +%H:%M:%S) end $r $side exit $?"
  done
done
