#!/usr/bin/env bash
#
# Moves the findings files of an audit of the security reviewer from its clone into the project's
# .reviews/security-audits/, and removes the clone, which setup-security-audit.sh made. Only this
# repository has this file; it is not part of the kit. CONTRIBUTING.md describes it under "Commands".
#
# Everything in the clone was written by the agent of the audit. So nothing of it is run, git
# among it, since git runs the hooks and the configuration of a repository, and of the clone only
# the names and the kinds of the files of .reviews/security-audits/ are read.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
audits="$here/.reviews/security-audits"
clones="$audits/clones"

if [ $# -ne 1 ] || [ -z "$1" ]; then
  echo 'usage: ./finish-security-audit.sh <clone>' >&2
  exit 2
fi
# No cd: a relative <clone> is taken from the directory the script is run from.
clone="$1"

refuse() {
  echo "finish-security-audit: $1" >&2
  exit 1
}

# Every later step works on the resolved path, so that a <clone> given as a link to the clone
# removes the clone and not the link alone.
absolute="$(realpath -- "$clone")" || refuse "cannot resolve $clone"

if [ ! -f "$clones" ] || ! grep -Fxq -- "$absolute" "$clones"; then
  refuse "$absolute is not a clone that setup-security-audit.sh made, so nothing is moved or removed"
fi

# A directory that is not there holds no findings file, as a run stopped before it saved its file
# leaves it. A link is tested first, since -d follows one.
findings_directory=""
for directory in "$absolute/.reviews" "$absolute/.reviews/security-audits"; do
  if [ ! -e "$directory" ] && [ ! -L "$directory" ]; then
    break
  fi
  if [ -L "$directory" ] || [ ! -d "$directory" ]; then
    refuse "$directory is a link or is not a directory, so nothing is moved or removed"
  fi
  findings_directory="$directory"
done

to_move=()
if [ "$findings_directory" = "$absolute/.reviews/security-audits" ]; then
  shopt -s nullglob
  for file in "$findings_directory"/security-audit-*.md; do
    if [ -L "$file" ] || [ ! -f "$file" ]; then
      echo "finish-security-audit: $file is a link or not a regular file, and is left in place"
      continue
    fi
    to_move+=("$file")
  done
  shopt -u nullglob
fi

# Every name is checked before the first move, so that a refusal moves nothing.
for file in ${to_move[@]+"${to_move[@]}"}; do
  name="$(basename -- "$file")"
  if [ -e "$audits/$name" ] || [ -L "$audits/$name" ]; then
    refuse "$audits/$name is there already, so $name is not moved, and nothing is moved or removed"
  fi
done

if [ ${#to_move[@]} -eq 0 ]; then
  echo "finish-security-audit: $absolute holds no findings file, so nothing is moved"
else
  mkdir -p "$audits"
  for file in "${to_move[@]}"; do
    mv -- "$file" "$audits/" || refuse "moving $file failed, so the clone is not removed"
    echo "finish-security-audit: moved $(basename -- "$file") to $audits/"
  done
fi

# rm -rf removes a link inside the directory and not what it points to.
rm -rf -- "$absolute"
kept="$(mktemp "$clones.XXXXXX")"
# grep exits 1 when it keeps no line, which is the list of a last clone removed.
grep -Fxv -- "$absolute" "$clones" >"$kept" || [ $? -eq 1 ]
mv -- "$kept" "$clones"
echo "finish-security-audit: removed $absolute"
