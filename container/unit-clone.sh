# The git work of a unit run: the functions container/sandbox.sh calls to find the unit's
# branch, to make the clone it mounts at /work and to bring the work back. Sourced by
# the wrapper when it is given a unit, and holds no top-level code: the wrapper orders
# the steps and talks to Docker.
#
# It runs git, and node once, for the default branch, when a branch is cut.
#
# The clone is the agent's to write, its .git included, so nothing here runs git in
# it: git run in a repository runs what that repository's configuration and hooks say.
# The clone is only ever the source of a fetch, which runs nothing of its own, and its
# tree is compared from the host's repository.

# Cuts the branch of a unit that the default branch holds and that has none, and prints
# its name. The unit is given by its digits, and is the one directory of changes/ on the
# default branch whose name opens with them and a dash. The default branch is given by
# its name, and is read as a local branch and as nothing else. The unit's branch is named
# after the kind in the unit's record and its directory, as process.md names a unit's
# branch, and is cut at the head of the default branch. Only that branch is read, never
# the working tree, and nothing is checked out, so what the host has checked out and what
# it has not committed do not matter and are left as they are. Says on standard error
# what it cut, because standard output is the branch's name. Says why and fails
# otherwise, with 1 when the default branch holds no such unit and 3 when it holds one
# that no branch can be cut for.
cut_unit_branch() {
  local root="$1" unit="$2" default_branch="$3" directories directory record line kind="" prefix name
  local base="refs/heads/$default_branch"
  if ! git -C "$root" show-ref --verify --quiet "$base"; then
    echo "sandbox.sh: '$unit' names no local branch, and there is no local branch $default_branch to cut one from." >&2
    echo "agentrite.json names $default_branch as the default branch." >&2
    return 3
  fi
  directories="$(git -C "$root" ls-tree -d --name-only "$base" changes/ | grep -E "^changes/$unit-")" \
    || directories=""
  if [ -z "$directories" ]; then
    echo "sandbox.sh: '$unit' names no local branch, by its name or as a unit's number." >&2
    echo "$default_branch holds no unit of that number in changes/, so there is no branch to cut." >&2
    return 1
  fi
  if [ "$(grep -c '' <<< "$directories")" -gt 1 ]; then
    echo "sandbox.sh: '$unit' names no local branch, and $default_branch holds more than one unit of that number:" >&2
    echo "  ${directories//$'\n'/$'\n'  }" >&2
    echo "So no branch is cut." >&2
    return 3
  fi
  directory="${directories#changes/}"
  record="changes/$directory/record.md"
  if ! git -C "$root" cat-file -e "$base:$record" 2>/dev/null; then
    echo "sandbox.sh: $record cannot be read on $default_branch, so no branch is cut for '$unit'." >&2
    return 3
  fi
  while IFS= read -r line; do
    if [[ "$line" =~ ^kind:[[:space:]]*([^[:space:]]+)[[:space:]]*$ ]]; then
      kind="${BASH_REMATCH[1]}"
      break
    fi
  done < <(git -C "$root" show "$base:$record")
  case "$kind" in
    feature) prefix="feature" ;;
    bug) prefix="bugfix" ;;
    task) prefix="task" ;;
    *)
      echo "sandbox.sh: $record on $default_branch names no kind the kit has, which are feature, bug and task," >&2
      echo "so no branch is cut for '$unit'." >&2
      return 3
      ;;
  esac
  name="$prefix-$directory"
  if ! git -C "$root" branch --quiet --no-track "$name" "$base"; then
    echo "sandbox.sh: cutting $name from $default_branch failed." >&2
    return 3
  fi
  echo "sandbox.sh: cut $name from $default_branch at $(git -C "$root" rev-parse --short "$base")," \
    "for changes/$directory." >&2
  echo "$name"
}

# Prints the branch a unit names: the local branch of that name, or else, for a unit of
# digits only, the one local branch whose name holds it as a whole number. Runs git in
# the host's repository only, and changes nothing there: it finds a branch and never
# cuts one. Fails with 1, and says nothing, when the unit names no branch, which is the
# caller's to say. Fails with 3, and lists them, when it names several.
find_unit_branch() {
  local root="$1" unit="$2" matches="" match
  if git -C "$root" show-ref --verify --quiet "refs/heads/$unit" 2>/dev/null; then
    echo "$unit"
    return 0
  fi
  if [[ "$unit" =~ ^[0-9]+$ ]]; then
    matches="$(git -C "$root" for-each-ref --format='%(refname:short)' refs/heads \
      | grep -E "(^|[^0-9A-Za-z])$unit([^0-9A-Za-z]|\$)")" || matches=""
  fi
  [ -n "$matches" ] || return 1
  if [ "$(grep -c '' <<< "$matches")" -gt 1 ]; then
    echo "sandbox.sh: '$unit' names more than one branch. Give one by its name:" >&2
    while read -r match; do
      echo "  $match" >&2
    done <<< "$matches"
    return 3
  fi
  echo "$matches"
}

# Prints the branch a unit names, as find_unit_branch finds it, whose failure for
# several branches is this function's too. A unit of digits that no branch holds gets
# its branch cut from the default branch, by cut_unit_branch, whose failures are this
# function's too. The default branch is read only then, from the agentrite.json in the
# working tree of the project root, by the reader that is given as the third argument:
# the kit's scripts/agentrite-settings.mjs, which node runs. A project with no file, or
# with one that is not valid, gets the reader's own message and no branch, with 3. Says
# why and fails otherwise, with 1 when no branch is named and 3 when several are.
resolve_unit_branch() {
  local root="$1" unit="$2" reader="$3" found=0 default_branch
  find_unit_branch "$root" "$unit" || found=$?
  [ "$found" -eq 1 ] || return "$found"
  if [[ "$unit" =~ ^[0-9]+$ ]]; then
    if ! default_branch="$(node "$reader" "$root")"; then
      echo "sandbox.sh: so no branch is cut for '$unit'." >&2
      return 3
    fi
    cut_unit_branch "$root" "$unit" "$default_branch"
    return
  fi
  echo "sandbox.sh: '$unit' names no local branch, by its name or as a unit's number." >&2
  echo "A unit's branch is cut from the default branch when the unit is given by its number." >&2
  return 1
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
  echo "sandbox.sh: sandbox/$branch holds commits of an earlier run that $branch does not have," >&2
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
    echo "sandbox.sh: resuming the clone of $branch that an earlier run left at $clone." >&2
    return 0
  fi
  mkdir -p "$(dirname "$clone")"
  git clone --quiet --no-hardlinks --branch "$branch" "$root" "$clone"
}

# Moves the host's branch to sandbox/<branch> when that is a fast-forward, and removes
# sandbox/<branch> then. A branch that is checked out is moved by a merge, because git
# refuses to fetch into it, and its working tree follows. The merge is told not to
# overwrite an ignored file of the host with a file the commits add at its path, which
# git otherwise does without a word. Fails when the branch cannot be fast-forwarded,
# and leaves both as they are.
fast_forward_branch() {
  local root="$1" branch="$2"
  local ref="refs/remotes/sandbox/$branch"
  if ! git -C "$root" merge-base --is-ancestor "$ref" "refs/heads/$branch"; then
    if [ "$(git -C "$root" symbolic-ref --quiet HEAD || true)" = "refs/heads/$branch" ]; then
      git -C "$root" merge --quiet --ff-only --no-overwrite-ignore "$ref" || return 1
    else
      git -C "$root" fetch --quiet . "$ref:refs/heads/$branch" 2>/dev/null || return 1
    fi
    echo "sandbox.sh: $branch is now at $(git -C "$root" rev-parse --short "refs/heads/$branch")." >&2
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

# Removes a clone that holds nothing the host lacks. The clone is first moved aside, to
# a name beside it that no branch can have, because a part of a branch's name does not
# start with a dot. A removal that fails half way then leaves its remains there, and
# not where the next run would take them for a clone to resume. Fails, saying where the
# remains are, when the clone cannot be moved or removed.
discard_clone() {
  local clone="$1" aside
  aside="$(dirname "$clone")/.discarded-$(basename "$clone")"
  rm -rf "$aside" 2>/dev/null || true
  if [ -e "$aside" ] || ! mv "$clone" "$aside"; then
    echo "sandbox.sh: removing the clone failed: $aside, the remains of an earlier one, is in the way." >&2
    echo "The clone is at $clone and holds nothing the host lacks. Remove both by hand." >&2
    return 1
  fi
  if ! rm -rf "$aside"; then
    echo "sandbox.sh: removing the clone failed. It held nothing the host lacks." >&2
    echo "Its remains are at $aside. Remove them by hand." >&2
    return 1
  fi
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
    echo "sandbox.sh: fetching $branch from the clone failed. The clone is kept at $clone." >&2
    return 1
  fi
  commit="$(git -C "$root" rev-parse --verify "$ref^{commit}")"
  if ! fast_forward_branch "$root" "$branch"; then
    echo "sandbox.sh: $branch cannot be fast-forwarded to the commits of this run, which are at sandbox/$branch." >&2
    echo "With $branch checked out, merge them with 'git merge sandbox/$branch'." >&2
  fi
  if ! files="$(clone_changed_files "$root" "$clone" "$commit")"; then
    echo "sandbox.sh: comparing the clone's files with $branch failed. The clone is kept at $clone." >&2
    return 1
  fi
  if ! refs="$(clone_unfetched_refs "$root" "$clone")"; then
    echo "sandbox.sh: listing the clone's refs failed. The clone is kept at $clone." >&2
    return 1
  fi
  if [ -z "$files$refs" ]; then
    discard_clone "$clone"
    return
  fi
  echo "sandbox.sh: the clone is kept at $clone, because it holds what the host does not." >&2
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
