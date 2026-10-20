#!/usr/bin/env bash
#
# Runs the sandbox of this working copy rather than the released kit's, to try a change
# to container/ before it is released. Only this repository has this file; it is not
# part of the kit. CONTRIBUTING.md describes it under "Trying the working copy's sandbox".
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# sandbox/compose.project.yml names the Compose project and the image after this variable,
# so the working copy's sandbox gets an image and a home volume of its own and leaves
# those of ./sandbox.sh alone.
export SANDBOX_PROJECT_NAME=ritenoar-agentrite-sandbox-dev
# Build before every run: the wrapper otherwise reuses an image built before the change
# under test. Not for --connect, which starts no run and which the wrapper refuses
# together with --rebuild. Whether --connect is given is read as the wrapper reads its
# options: up to a -- or the first word that is no option, which opens the unit or the
# command, and past the directory of --workdir and of --mount and the name of --variant.
# The options are the wrapper's, so one it gains that takes a value is added here too.
rebuild=(--rebuild)
arguments=("$@")
index=0
while [ "$index" -lt $# ]; do
  case "${arguments[$index]}" in
    --connect)
      rebuild=()
      break
      ;;
    --workdir | --mount | --variant) index=$((index + 2)) ;;
    --rebuild | --in-place | --variant=*) index=$((index + 1)) ;;
    *) break ;;
  esac
done
exec "$here/container/sandbox.sh" "$here" ${rebuild[@]+"${rebuild[@]}"} "$@"
