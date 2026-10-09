#!/usr/bin/env bash
#
# The sandbox is AgentRite's. This shim keeps it one command from the repository
# root; it holds no configuration of its own. The command is described in the kit's
# README.md and the sandbox in its SANDBOX.md, and this project's half of the
# configuration is in sandbox/compose.project.yml.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# The kit's wrapper takes the project root as its first argument, because where npm
# installs the kit says nothing reliable about where the project is.
exec "$here/node_modules/agentrite/container/sandbox.sh" "$here" "$@"
