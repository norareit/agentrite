#!/usr/bin/env bash
#
# Runs the sandbox of this working copy rather than the released kit's, to try a change
# to container/ before it is released. Only this repository has this file; it is not
# part of the kit. README.md describes it under "Trying the working copy's sandbox".
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# agent/compose.project.yml names the Compose project and the image after this variable,
# so the working copy's sandbox gets an image and a home volume of its own and leaves
# those of ./agent.sh alone.
export AGENT_PROJECT_NAME=ritenoar-agentrite-agent-dev
# Always build: the wrapper otherwise reuses an image built before the change under test.
exec "$here/container/agent.sh" "$here" --rebuild "$@"
