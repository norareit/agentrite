#!/usr/bin/env bash
#
# Installs the kit into a project, as files copied in at the commit the project pins.
#
# Usage:
#   install.sh [--update] PROJECT DIRECTORY
#
#   PROJECT      the project's root, which holds agent-kit.md
#   DIRECTORY    the directory of PROJECT to install into, a direct child of it,
#                because container/agent.sh finds the project root one level up
#   --update     install the kit's master instead of the pin, and rewrite the pin
#                to it; this also creates agent-kit.md when the project has none
#
# The files are read with `git archive`, so the kit clone this script runs from is
# never checked out and its working tree is never read. The target directory is
# replaced whole, so nothing the pinned commit does not contain survives an
# install, which is why a directory holding no previous installation is refused.
set -euo pipefail

# What a project receives. The kit's changes/, tests/, package.json and README.md
# are the kit's own, and stay here.
payload=(process.md roles templates scripts/check-changes.mjs container)

# Written into the installed tree, holding the commit it came from. Its presence
# is also what marks a directory as a previous installation, safe to replace.
marker=.installed-commit
pin_file=agent-kit.md

kit="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  echo "usage: install.sh [--update] PROJECT DIRECTORY" >&2
  exit 2
}

fail() {
  echo "install.sh: $*" >&2
  exit 1
}

# The pin is the first field of agent-kit.md's frontmatter: its second line.
read_pin() {
  awk 'NR == 1 && $0 != "---" { exit } NR == 2 && /^commit: [0-9a-f]+$/ && length($2) == 40 { print $2 } NR == 2 { exit }' "$1"
}

# The directory is about to be deleted, and a mistyped target can hold a file of the
# marker's name, so the marker alone is not enough: it has to hold the full hash of a
# commit in this clone, which only an install writes. What else the directory holds is
# not checked, because an installation gains files beside it, such as a .DS_Store.
is_installation() {
  local installed
  installed="$(cat "$1/$marker" 2>/dev/null)" || return 1
  [[ "$installed" =~ ^[0-9a-f]{40}$ ]] || return 1
  git -C "$kit" rev-parse --verify --quiet "$installed^{commit}" >/dev/null
}

pin_file_text() {
  local commit="$1" directory="$2" source=""
  if source="$(git -C "$kit" remote get-url origin 2>/dev/null)"; then
    source=$'\n'"The kit repository is \`$source\`."
  fi
  cat <<EOF
---
commit: $commit
---

# Agent kit

\`$directory/\` holds the shared agent kit: the process every change follows, the planner, implementer and reviewer
role files, the change templates, the change check and the agent sandbox. It is installed from the kit repository at
the commit above, and it is not part of this repository.$source

* Do not edit anything in \`$directory/\`. It is gitignored, so an edit is never committed, and the next install
  replaces it. An improvement to the kit is made in the kit repository
* A fresh clone has no \`$directory/\`. Install the pinned commit from a clone of the kit, from this project's root:

      path/to/agent-kit/install.sh . $directory

* To move to the kit's current \`master\`, add \`--update\`. It rewrites the commit above, which is then committed
  like any other change
EOF
}

update=false
arguments=()
for argument in "$@"; do
  case "$argument" in
    --update) update=true ;;
    -*) usage ;;
    *) arguments+=("$argument") ;;
  esac
done
[ "${#arguments[@]}" -eq 2 ] || usage

project="$(cd "${arguments[0]}" 2>/dev/null && pwd)" || fail "no project directory at ${arguments[0]}"
directory="${arguments[1]%/}"
case "$directory" in
  "" | . | .. | */*) fail "the directory must be a direct child of the project, not '${arguments[1]}'" ;;
esac
target="$project/$directory"
pin_path="$project/$pin_file"

pin=""
if [ -f "$pin_path" ]; then
  pin="$(read_pin "$pin_path")"
  [ -n "$pin" ] || fail "$pin_path does not open with frontmatter whose first field is 'commit: <full commit hash>'"
fi

if $update; then
  commit="$(git -C "$kit" rev-parse --verify --quiet 'master^{commit}')" || fail "the kit clone at $kit has no master"
else
  [ -n "$pin" ] || fail "$pin_path does not exist. Run with --update to install the kit's master and create it"
  commit="$(git -C "$kit" rev-parse --verify --quiet "$pin^{commit}")" \
    || fail "the pinned commit $pin is not in the kit clone at $kit. Pull the kit, then install again"
fi

if [ -e "$target" ] && [ ! -d "$target" ]; then
  fail "$target exists and is not a directory"
fi
if [ -d "$target" ] && [ -n "$(ls -A "$target")" ] && ! is_installation "$target"; then
  fail "$target is not empty and is not a previous installation, so it is left untouched." \
    "If it is one from a commit this kit clone lacks, pull the kit and install again"
fi

# A payload path the commit does not have is one added to the kit after it.
present=()
for path in "${payload[@]}"; do
  if git -C "$kit" cat-file -e "$commit:$path" 2>/dev/null; then
    present+=("$path")
  fi
done
[ "${#present[@]}" -gt 0 ] || fail "commit $commit holds none of the kit's payload"

# Extracted beside the target and moved into place, so that a failed extraction
# leaves the previous installation as it was.
staging="$project/.$directory.installing.$$"
trap 'rm -rf "$staging"' EXIT
mkdir "$staging"
git -C "$kit" archive --format=tar "$commit" -- "${present[@]}" | tar -x -f - -C "$staging"
printf '%s\n' "$commit" >"$staging/$marker"
rm -rf "$target"
mv "$staging" "$target"

if $update; then
  if [ -n "$pin" ]; then
    awk -v commit="$commit" 'NR == 2 { $0 = "commit: " commit } { print }' "$pin_path" >"$pin_path.installing.$$"
    mv "$pin_path.installing.$$" "$pin_path"
  else
    pin_file_text "$commit" "$directory" >"$pin_path"
  fi
fi

echo "Installed the agent kit at ${commit:0:12} into $target."

# Staleness is reported, never applied: moving the pin is a change to the project.
master="$(git -C "$kit" rev-parse --verify --quiet 'master^{commit}')" || exit 0
if [ "$commit" = "$master" ]; then
  echo "That is the kit clone's master."
elif git -C "$kit" merge-base --is-ancestor "$commit" "$master"; then
  behind="$(git -C "$kit" rev-list --count "$commit..$master")"
  [ "$behind" -eq 1 ] && commits="commit" || commits="commits"
  echo "The kit clone's master is $behind $commits past it. To move to it, add --update:"
  echo "  $kit/install.sh --update $project $directory"
else
  echo "That commit is not on the kit clone's master. To move to master, add --update:"
  echo "  $kit/install.sh --update $project $directory"
fi
