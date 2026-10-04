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

# Moves the host's branch to sandbox/<branch> when that is a fast-forward, and removes
# sandbox/<branch> then. A branch that is checked out is moved by a merge, because git
# refuses to fetch into it, and its working tree follows. Fails when the branch cannot
# be fast-forwarded, and leaves both as they are.
fast_forward_branch() {
  local root="$1" branch="$2"
  local ref="refs/remotes/sandbox/$branch"
  if ! git -C "$root" merge-base --is-ancestor "$ref" "refs/heads/$branch"; then
    if [ "$(git -C "$root" symbolic-ref --quiet HEAD || true)" = "refs/heads/$branch" ]; then
      git -C "$root" merge --quiet --ff-only "$ref" || return 1
    else
      git -C "$root" fetch --quiet . "$ref:refs/heads/$branch" 2>/dev/null || return 1
    fi
    echo "agent.sh: $branch is now at $(git -C "$root" rev-parse --short "refs/heads/$branch")." >&2
  fi
  git -C "$root" update-ref -d "$ref"
}

# Prints the files of the clone that differ from the commit, and those it has besides,
# ignored files apart. Asked of the host's repository, with the clone as its work tree
# and an index of its own read from the commit, so that only files of the clone are
# read. The host's own file system monitor, if it has one, is not asked about a tree
# that is not the host's.
clone_changed_files() {
  local root="$1" clone="$2" commit="$3" git_dir scratch status=0
  git_dir="$(git -C "$root" rev-parse --absolute-git-dir)" || return 1
  scratch="$(mktemp -d)" || return 1
  GIT_INDEX_FILE="$scratch/index" git --git-dir="$git_dir" --work-tree="$clone" read-tree "$commit" \
    && GIT_INDEX_FILE="$scratch/index" git -c core.fsmonitor=false --git-dir="$git_dir" --work-tree="$clone" \
      ls-files --modified --deleted --others --exclude-standard \
    || status=1
  rm -rf "$scratch"
  return "$status"
}

# Prints the refs of the clone that name something the host's repository does not hold.
clone_unfetched_refs() {
  local root="$1" clone="$2" refs object ref
  refs="$(git -C "$root" ls-remote "$clone")" || return 1
  while read -r object ref; do
    [ -n "$object" ] || continue
    git -C "$root" cat-file -e "$object^{commit}" 2>/dev/null || echo "$ref"
  done <<< "$refs"
}

# Brings the work of a run back: fetches the clone's branch as sandbox/<branch>,
# fast-forwards the host's branch when that is possible, and removes the clone when
# nothing in it would be lost. Only the unit's branch is fetched, and no tag and no
# submodule with it. Says what it kept and why. Fails, naming the step and keeping the
# clone, when a step fails.
land_clone() {
  local root="$1" branch="$2" clone="$3"
  local ref="refs/remotes/sandbox/$branch" commit files refs
  if ! git -C "$root" fetch --quiet --no-tags --no-recurse-submodules "$clone" "+refs/heads/$branch:$ref"; then
    echo "agent.sh: fetching $branch from the clone failed. The clone is kept at $clone." >&2
    return 1
  fi
  commit="$(git -C "$root" rev-parse --verify "$ref^{commit}")"
  if ! fast_forward_branch "$root" "$branch"; then
    echo "agent.sh: $branch cannot be fast-forwarded to the commits of this run, which are at sandbox/$branch." >&2
    echo "With $branch checked out, merge them with 'git merge sandbox/$branch'." >&2
  fi
  if ! files="$(clone_changed_files "$root" "$clone" "$commit")"; then
    echo "agent.sh: comparing the clone's files with $branch failed. The clone is kept at $clone." >&2
    return 1
  fi
  if ! refs="$(clone_unfetched_refs "$root" "$clone")"; then
    echo "agent.sh: listing the clone's refs failed. The clone is kept at $clone." >&2
    return 1
  fi
  if [ -z "$files$refs" ]; then
    rm -rf "$clone"
    return 0
  fi
  echo "agent.sh: the clone is kept at $clone, because it holds what the host does not." >&2
  if [ -n "$files" ]; then
    echo "Files that are not committed on $branch:" >&2
    echo "  ${files//$'\n'/$'\n'  }" >&2
  fi
  if [ -n "$refs" ]; then
    echo "Refs with commits that were not fetched:" >&2
    echo "  ${refs//$'\n'/$'\n'  }" >&2
  fi
  echo "The same command resumes it." >&2
}
