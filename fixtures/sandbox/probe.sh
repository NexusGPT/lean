#!/bin/bash
# The probe log of langs/ts/design/sandbox-boundary.md: every probe of probes.ts through lane B in the open mode and
# under LEAN_NET=deny, then the probes of a unit with no parent (new-unit-probe.ts). A listener on 127.0.0.1:47391
# answers the network probes, so a refused attempt is the mode's, never an empty port. Run from the repository root:
#   bash fixtures/sandbox/probe.sh > langs/ts/design/sandbox-boundary-probes.txt
set -u
out=$(mktemp -d)
node -e "require('node:http').createServer((q, r) => r.end('probe')).listen(47391, '127.0.0.1', () => console.log('listening'))" > "$out/listener.log" &
listener=$!
for i in 1 2 3 4 5 6 7 8 9 10; do grep -q listening "$out/listener.log" && break; sleep 0.5; done
echo "# node $(node --version), $(uname -sr); listener pid $listener on 127.0.0.1:47391"
show='const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); const w = (r.witnesses || [])[0]; const o = w ? w.parent.outcome : r.faultExamples ? r.faultExamples[0].error.message : r.reason; console.log("  verdict", r.verdict, "| outcome", JSON.stringify(o)); const sb = (r.record && r.record.sandbox) || r.sandbox; if (sb) console.log("  record.sandbox", JSON.stringify(sb));'
probe() { # mode parent candidate unit
  echo "\$ LEAN_NET=$1 node langs/ts/exec/run.mjs --parent $2 --candidate $3 --unit $4 --n 1 --no-project --out <tmp>/$4.json"
  LEAN_NET=$1 node --no-warnings langs/ts/exec/run.mjs --parent "$2" --candidate "$3" --unit "$4" --n 1 --no-project --out "$out/$4.json" > "$out/run.log" 2>&1
  echo "  exit $? | $(grep -v -e ExperimentalWarning -e trace-warnings "$out/run.log" | sed "s#$out#<tmp>#g" | tr '\n' ' ')"
  node -e "$show" "$out/$4.json"
}
for mode in open deny; do
  echo; echo "## units the parent holds (the lane B worker, under --permission), LEAN_NET=$mode"
  for u in reachHost fileRead envRead fileWrite childProcess nativeAddon workerThread rawBinding unseal netSocket hostFetch dnsLookup udpSend sandboxFetch; do
    probe "$mode" fixtures/sandbox/probes.ts fixtures/sandbox/blank.ts "$u"
  done
  echo; echo "## a unit with no parent (exec/new-unit.mjs, its own child), LEAN_NET=$mode"
  for u in newUnitReach newUnitNet; do probe "$mode" fixtures/sandbox/blank.ts fixtures/sandbox/new-unit-probe.ts "$u"; done
done
kill "$listener"; wait "$listener"
echo; echo "# listener $listener stopped (exit $?); requests it answered: see the probes above"
rm -rf "$out"
