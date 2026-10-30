#!/bin/sh
# The container's entry: `docker run lean check ...` runs langs/ts/check.mjs (likewise pr, convert, lint, translate);
# any other first word runs as a command, so `docker run lean node langs/ts/tests/run.mjs --pair <pair>` works too.
set -e
case "$1" in
  check|pr|convert|census|patch) tool="$1"; shift; exec node /lean/langs/ts/"$tool".mjs "$@" ;;
  lint|translate) tool="$1"; shift; exec node /lean/langs/ts/"$tool"/"$tool".mjs "$@" ;;
  help|"")
    echo "usage: docker run --rm -v \"\$PWD:/work\" -w /work <image> check|pr|convert|census|patch|lint|translate [args]"
    echo "       docker run --rm <image> <command> [args]   (runs in /lean, the checkout)"
    exit 0 ;;
  *) exec "$@" ;;
esac
