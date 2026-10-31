#!/bin/bash
# measurement wrapper: every `dafny verify` also writes Dafny's CSV log (one row per verification condition with its
# ResourceCount) into $RLOG; the "Results File:" line the CSV logger prints is dropped from stdout
RLOG=/root/lanes/dafny-resource-limit/rlog
if [ "$1" = "verify" ]; then
  id="$(date +%s%N)-$$"
  printf '%s\t%s\t%s\n' "$id" "$PWD" "$*" >> "$RLOG/index.tsv"
  out="$RLOG/$id.stdout"
  /opt/dafny/dafny "$@" --log-format "csv;LogFileName=$RLOG/$id.csv" > "$out"
  rc=$?
  grep -v '^Results File:' "$out"
  rm -f "$out"
  exit $rc
fi
exec /opt/dafny/dafny "$@"
