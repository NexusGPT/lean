#!/bin/bash
# usage: probe.sh <lean root> <case dir>...
L=$1; shift
for c in "$@"; do
  u=$(cat $c/unit)
  (cd $L/langs/ts && nice -n 15 env LEAN_Z3=/opt/dafny/z3/bin/z3-4.12.1 LC_ALL=en_US.UTF-8 node check.mjs --parent $c/parent.ts --candidate $c/candidate.ts --unit $u --n 30 --dafny-seconds 30 --out $c/v.json > $c/log 2>&1); ec=$?
  python3 -c "
import json,sys;d=json.load(open('$c/v.json'));print('$(basename $c)', 'exit $ec', d['verdict'], d.get('certificate',{}).get('lanes',{}).get('B',{}).get('verdict'), json.dumps(d.get('witness',{}).get('args'))[:80])"
done
