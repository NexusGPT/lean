#!/bin/bash
# pair.sh <lean root> <pair>...: each pair alone (tests/run.mjs --pair, JOBS=1), its rows and a TOTAL line, exit code and wall
L=$1; shift
for p in "$@"; do
  r=$(mktemp /tmp/w9aj-pair-XXXX.json); t0=$(date +%s.%N)
  (cd $L/langs/ts && JOBS=1 LEAN_Z3=/opt/dafny/z3/bin/z3-4.12.1 LC_ALL=en_US.UTF-8 LEAN_WORKER_HEAP_MB=6144 nice -n 15 node tests/run.mjs --pair $p --result $r > $r.log 2>&1); ec=$?
  t1=$(date +%s.%N)
  python3 - "$r" "$p" "$ec" "$(echo "$t1 - $t0" | bc)" <<'PY'
import json, sys
r, p, ec, secs = sys.argv[1:]
try: rows = json.load(open(r))['rows']
except Exception as x: rows = []; print('| pair | %s | no result (%s) | FAIL |' % (p, x))
for x in rows: print('| %s | %s | %s | %s |             | %s' % (x['kind'], x['name'], x['check'], 'PASS' if x['ok'] else 'FAIL', str(x.get('detail'))[:200]))
bad = sum(1 for x in rows if not x['ok'])
print('%s exit %s secs %s | TOTAL | %d checks | %s |' % (p, ec, secs, len(rows), 'ALL PASS' if rows and not bad else '%d FAILED' % (bad or 1)))
PY
  rm -f $r $r.log
done
