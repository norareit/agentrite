#!/usr/bin/env bash
#
# Generates the SVG of every diagram in diagrams/ from its Mermaid source, beside it, with a
# white background so that it reads the same in a light and a dark theme. Only this
# repository has this file; it is not part of the kit. CONTRIBUTING.md describes it under
# "npm run diagrams".
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
# The command line runs through npx, at a pinned version, and is no dependency of the
# repository: it downloads a headless Chrome, which npm ci would then download too, in
# the sandbox as well, which cannot reach the host Chrome comes from.
for source in diagrams/*.mmd; do
  npx --yes @mermaid-js/mermaid-cli@11.4.2 --input "$source" --output "${source%.mmd}.svg" \
    --backgroundColor white || exit 1
done
