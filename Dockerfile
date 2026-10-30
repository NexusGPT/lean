# lean with its proof lane: node 24 (lane B, the lint, the translator; lane B forks its worker under Node's permission
# model, `--permission`, which node 20 rejects, so node 20 cannot run it), python3 (the theorem writer, spec/theorem.py),
# Dafny 4.11.0 from its release zip, with the Z3 binaries that release bundles (4.12.1 and 4.14.1 in dafny/z3/bin).
# The `z3` on PATH is the bundled 4.12.1: the one Dafny verifies with and check.mjs records in every certificate, so the
# doubles rung (solve/fp.mjs, which runs `z3` from PATH) and lane A share one solver. Every version is pinned.
#   docker build -t lean:local .
#   docker run --rm -v "$PWD:/work" -w /work lean:local check --parent a.ts --candidate b.ts --unit f --no-project
FROM node:24.22.2-bookworm-slim

ARG DAFNY_VERSION=4.11.0
ARG DAFNY_SHA256=a46a9ff7cdd720f7955854c78e95df13f4cfe6b80691b05f8654fe19e8267179

# libicu: the .NET runtime Dafny is built on reads it for culture data; git: pr.mjs and the pair repositories; jq: the
# README quickstart reads the certificate with it
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 ca-certificates curl unzip libicu72 git jq \
 && curl -fsSL -o /tmp/dafny.zip "https://github.com/dafny-lang/dafny/releases/download/v${DAFNY_VERSION}/dafny-${DAFNY_VERSION}-x64-ubuntu-22.04.zip" \
 && echo "${DAFNY_SHA256}  /tmp/dafny.zip" | sha256sum -c - \
 && unzip -q /tmp/dafny.zip -d /opt \
 && rm /tmp/dafny.zip \
 && ln -s /opt/dafny/dafny /usr/local/bin/dafny \
 && ln -s /opt/dafny/z3/bin/z3-4.12.1 /usr/local/bin/z3 \
 && apt-get purge -y curl unzip \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/* \
 && dafny --version \
 && z3 --version

WORKDIR /lean
COPY . /lean
RUN chmod +x /lean/scripts/lean-docker.sh

ENTRYPOINT ["/lean/scripts/lean-docker.sh"]
CMD ["help"]
