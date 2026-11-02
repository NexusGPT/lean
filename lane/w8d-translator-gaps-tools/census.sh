#!/bin/bash
# the census on the three w1c roots, at base (w1m head 2521973962, a git archive) and head (this lane's tree)
# usage: census.sh <root> <base|head>
W=/root/da-bench/w8d-translator-gaps
export PATH=$W/bin:$PATH
r=$1; side=$2
if [ $side = base ]; then C=$W/base/langs/ts/census.mjs; else C=/root/lanes/w8d-translator-gaps/tree/langs/ts/census.mjs; fi
while [ "$(cut -d. -f1 /proc/loadavg)" -gt 64 ]; do sleep 30; done
echo "$(date -u +%H:%M:%S) start $r $side load $(cut -d' ' -f1 /proc/loadavg)"
LEAN_WORKER_HEAP_MB=6144 node --max-old-space-size=12288 $C /root/census-installs/w8d/$r --install-under /root/census-installs/w8d --out $W/census/$r-$side.json --report $W/census/$r-$side.md > $W/census/$r-$side.log 2>&1
code=$?
echo "$(date -u +%H:%M:%S) end $r $side exit $code"
exit $code
