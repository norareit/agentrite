#!/usr/bin/env bash
#
# The sandbox is the agent kit's. This shim keeps it one command from the repository
# root; it holds no configuration of its own. The wrapper is documented in the kit's
# README.md, and this project's half of the configuration is in
# agent/compose.project.yml.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# The kit's wrapper takes the project root as its first argument, because where npm
# installs the kit says nothing reliable about where the project is.
exec "$here/node_modules/@ritenoar/agent-kit/container/agent.sh" "$here" "$@"
