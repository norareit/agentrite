# The git work of a unit run: the functions container/agent.sh calls to find the unit's
# branch, to make the clone it mounts at /work and to bring the work back. Sourced by
# the wrapper when it is given a unit, and holds no top-level code: the wrapper orders
# the steps and talks to Docker.
#
# The clone is the agent's to write, its .git included, so nothing here runs git in
# it: git run in a repository runs what that repository's configuration and hooks say.
# The clone is only ever the source of a fetch, which runs nothing of its own, and its
# tree is compared from the host's repository.

# Prints the branch a unit names: the local branch of that name, or else, for a unit of
# digits only, the one local branch whose name holds it as a whole number. Says why and
# fails otherwise, with 1 when no branch is named and 3 when several are.
resolve_unit_branch() {
  local root="$1" unit="$2" matches="" match
  if git -C "$root" show-ref --verify --quiet "refs/heads/$unit" 2>/dev/null; then
    echo "$unit"
    return 0
  fi
  if [[ "$unit" =~ ^[0-9]+$ ]]; then
    matches="$(git -C "$root" for-each-ref --format='%(refname:short)' refs/heads \
      | grep -E "(^|[^0-9A-Za-z])$unit([^0-9A-Za-z]|\$)")" || matches=""
  fi
  if [ -z "$matches" ]; then
    echo "agent.sh: '$unit' names no local branch, by its name or as a unit's number." >&2
    echo "A unit's branch is made on the host, when the unit is planned." >&2
    return 1
  fi
  if [ "$(grep -c '' <<< "$matches")" -gt 1 ]; then
    echo "agent.sh: '$unit' names more than one branch. Give one by its name:" >&2
    while read -r match; do
      echo "  $match" >&2
    done <<< "$matches"
    return 3
  fi
  echo "$matches"
}

# Fails, saying what to do first, when a new clone would be made while sandbox/<branch>
# holds commits the branch lacks: they are an earlier run's, which the fetch after this
# run would overwrite.
refuse_unlanded() {
  local root="$1" branch="$2" clone="$3"
  local ref="refs/remotes/sandbox/$branch"
  [ ! -e "$clone" ] || return 0
  git -C "$root" show-ref --verify --quiet "$ref" || return 0
  [ -n "$(git -C "$root" rev-list --max-count=1 "refs/heads/$branch..$ref")" ] || return 0
  echo "agent.sh: sandbox/$branch holds commits of an earlier run that $branch does not have," >&2
  echo "and a new run would overwrite them. Merge it first, with 'git merge sandbox/$branch'," >&2
  echo "or delete it, with 'git branch --remotes --delete sandbox/$branch'." >&2
  return 1
}

# Makes the clone of the branch, or says that one is still there and is resumed as it
# is. Without hard links: a hard-linked object is one file in both repositories, which
# the agent could rewrite.
prepare_clone() {
  local root="$1" branch="$2" clone="$3"
  if [ -e "$clone" ]; then
    echo "agent.sh: resuming the clone of $branch that an earlier run left at $clone." >&2
    return 0
  fi
  mkdir -p "$(dirname "$clone")"
  git clone --quiet --no-hardlinks --branch "$branch" "$root" "$clone"
}
