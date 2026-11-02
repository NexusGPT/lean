#!/usr/bin/env bash
# w8e: the validators on the rebased head, one heavy job at a time (load gate 64, JOBS 4)
set -u
O=/root/da-bench/w8e-callee-facts/final; T=/root/lanes/w8e-callee-facts/tree; B=/root/lanes/w8e-callee-facts/base-tree
export LEAN_WORKER_HEAP_MB=6144
gate() { while awk -v l="$(cut -d' ' -f1 /proc/loadavg)" 'BEGIN { exit !(l > 64) }'; do sleep 60; done; }
gate; (cd $T && python3 -I conformance/run.py ts > $O/conformance.txt 2>&1; echo "exit $?" >> $O/conformance.txt)
gate; bash /root/da-bench/w8e-callee-facts/census-one.sh $B /root/da/census/repos/agent-nexus $O/census-base-agent-nexus; echo "census base exit $?" >> $O/runs.log
gate; bash /root/da-bench/w8e-callee-facts/census-one.sh $T /root/da/census/repos/agent-nexus $O/census-lane-agent-nexus; echo "census lane exit $?" >> $O/runs.log
gate; (cd $T && LEAN_CONFORMANCE=full JOBS=4 LEAN_PAIRS="$(cat /root/da-bench/w8e-callee-facts/suite-pairs.txt)" NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/tests/run.mjs > $O/suite.txt 2>&1; echo "exit $?" >> $O/suite.txt)
echo "all done" >> $O/runs.log
