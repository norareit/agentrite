#!/usr/bin/env bash
#
# Makes the clone of the default branch that an audit of the security reviewer runs in, gives it the
# list of accepted risks, and records it for finish-security-audit.sh. Only this repository has this
# file; it is not part of the kit. CONTRIBUTING.md describes it under "Commands".
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ $# -ne 1 ] || [ -z "$1" ]; then
  echo 'usage: ./setup-security-audit.sh <clone>' >&2
  exit 2
fi
# No cd: a relative <clone> is taken from the directory the script is run from.
clone="$1"

# -L as well, since -e follows a link and a dangling one would pass it.
if [ -e "$clone" ] || [ -L "$clone" ]; then
  echo "setup-security-audit: $clone exists. The clone of an audit is made in a new directory: name one" >&2
  exit 1
fi

# The reader prints its own message when agentrite.json is at fault.
branch="$(node "$here/scripts/agentrite-settings.mjs" "$here")" || exit 1

if ! git clone --branch "$branch" -- "$here" "$clone"; then
  echo "setup-security-audit: git clone of $branch into $clone failed" >&2
  exit 1
fi

# Recorded before anything else is done in the clone, so that a clone a later step fails in is still one
# that finish-security-audit.sh removes.
mkdir -p "$here/.reviews/security-audits"
realpath -- "$clone" >>"$here/.reviews/security-audits/clones"

mkdir -p -- "$clone/.reviews"
if [ -f "$here/.reviews/security-accepted.md" ]; then
  cp -- "$here/.reviews/security-accepted.md" "$clone/.reviews/security-accepted.md"
  echo "setup-security-audit: copied the list of accepted risks, .reviews/security-accepted.md, into $clone"
else
  echo 'setup-security-audit: there is no list of accepted risks, so the audit runs with none'
fi

cat <<EOF
setup-security-audit: made the clone of $branch in $clone. What follows:
  1. Start the sandbox: ./sandbox.sh --workdir $clone <harness>
  2. Then dispatch the security reviewer in the session with no unit, from the harness's own list of agents
  3. After the run: ./finish-security-audit.sh $clone
EOF
