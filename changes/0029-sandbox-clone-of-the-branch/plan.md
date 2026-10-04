# 0029 The sandbox works on a clone of the unit's branch

## Approach

The wrapper, `container/agent.sh`, gains a second way to run. With `--in-place` or `--workdir` it does what it does
today, ending in the same `exec docker compose run`. With a unit it resolves the branch, prepares the clone, runs
the container under a name, and then lands the work. It can no longer `exec` in that case, because it has work to
do after the container.

The git work goes in a new file beside it, `container/unit-clone.sh`, which the wrapper sources. It holds
functions and no top-level code, so the wrapper stays the one place that orders the steps and talks to Docker:

* `resolve_unit_branch ROOT UNIT` prints the branch or fails with the message of requirement 3
* `prepare_clone ROOT BRANCH CLONE` makes the clone or reports a resumed one, after the check of requirement 5
* `land_clone ROOT BRANCH CLONE` fetches, fast-forwards, compares and removes, and reports what it kept

Where things are:

* The clone is `${XDG_STATE_HOME:-$HOME/.local/state}/agentrite/<compose project>/<branch>`. The branch name is
  used as it is, so a branch with a slash is a nested directory and two branches never share one
* The container is named `<compose project>-<branch>`, with every character outside `[A-Za-z0-9_.-]` replaced by
  `-`. Two branches that differ only in such a character share a name, and the second is refused while the first
  runs
* The Compose project's name is the `name:` line of `docker compose config`, asked for once, next to the existing
  query for the image

The commands, as tried while planning:

```sh
# The branch an ID names: a whole number in the name
git -C "$root" for-each-ref --format='%(refname:short)' refs/heads \
  | grep -E "(^|[^0-9A-Za-z])$unit([^0-9A-Za-z]|\$)"

# A clone that shares no file with the host
git clone --quiet --no-hardlinks --branch "$branch" "$root" "$clone"

# Running, by name
docker ps --quiet --filter "name=^/$name\$"

# Landing
git -C "$root" fetch --quiet "$clone" "+refs/heads/$branch:refs/remotes/sandbox/$branch"
git -C "$root" merge --ff-only "refs/remotes/sandbox/$branch"                         # checked out
git -C "$root" fetch --quiet . "refs/remotes/sandbox/$branch:refs/heads/$branch"      # not checked out
git -C "$root" update-ref -d "refs/remotes/sandbox/$branch"

# What the clone still holds, read from the host's side
GIT_INDEX_FILE="$scratch" git --git-dir="$host_git_dir" --work-tree="$clone" read-tree "$fetched"
GIT_INDEX_FILE="$scratch" git --git-dir="$host_git_dir" --work-tree="$clone" \
  ls-files --modified --deleted --others --exclude-standard
git -C "$root" ls-remote "$clone"    # each commit named must pass: git -C "$root" cat-file -e "$sha^{commit}"
```

No `git -C "$clone"` and no `cd "$clone"` followed by git appears anywhere on the host side. That is requirement 15,
and a reviewer can check it by reading.

The tests drive the real wrapper with a stand-in `docker` on the `PATH`, as `tests/agent-wrapper.test.mjs` does, and
with real git in temporary repositories. For a unit run the stand-in also plays the agent: when a test gives it a
script, it runs that script in the directory mounted at `/work` and exits with the script's status.

This repository's own `./agent.sh` runs the released wrapper, so the change is tried with `./agent-dev.sh`, on the
host.

## Files

- `container/agent.sh`: the `--in-place` option, the required choice, the unit run, and a header comment that says
  what the wrapper now does
- `container/unit-clone.sh`: new, the three functions above
- `tests/agent-wrapper-setup.mjs`: new, the `setUp` that `tests/agent-wrapper.test.mjs` has today, moved so that
  two test files share it, with the stand-in `docker` extended
- `tests/agent-wrapper.test.mjs`: imports `setUp`; its runs gain `--in-place`; new tests for the required choice
- `tests/agent-unit-run.test.mjs`: new, the unit run
- `tests/agent-dev.test.mjs`: its runs gain `--in-place` where they run a command
- `README.md`: "Running the sandbox" and its subsections, and the example under "Trying the working copy's sandbox"
- `changes/0029-sandbox-clone-of-the-branch/record.md`: the log, and the real check

`templates/project/agent.sh`, `agent.sh` and `agent-dev.sh` pass their arguments on and do not change. Nothing in
the image changes, so no rebuild is needed for the change itself.

## Tasks

- [ ] Move `setUp` from `tests/agent-wrapper.test.mjs` to `tests/agent-wrapper-setup.mjs` and import it. No test
  changes and the suite passes as before. This is a refactoring and is committed on its own (R17)
- [ ] Extend the stand-in `docker` in `tests/agent-wrapper-setup.mjs`, with no test depending on it yet: it answers
  `compose ... config` with a `name:` line, answers `ps` with the container name when the test says a container is
  running, accepts `rm`, and on `compose ... run` runs the test's script, if any, in the directory mounted at
  `/work` and exits with its status. `setUp` gives the wrapper an `XDG_STATE_HOME` of its own and returns its path.
  The suite still passes (R17)
- [ ] In `tests/agent-wrapper.test.mjs`, write the tests of the required choice and see them fail (R1, R2, R17):
    - with no unit, no `--in-place` and no `--workdir`, the wrapper exits non-zero, names the three forms and
      makes no Docker call
    - `--in-place echo hi` makes exactly the Docker calls today's `echo hi` makes
    - `--workdir DIR echo hi` mounts `DIR` at `/work` and makes no clone
- [ ] Add `--in-place` to the runs of the existing tests in `tests/agent-wrapper.test.mjs` and
  `tests/agent-dev.test.mjs` that run a command, and implement the option and the required choice in
  `container/agent.sh`. The check comes before any Docker call. The suite passes (R1, R2)
- [ ] In `tests/agent-unit-run.test.mjs`, write the tests of resolving and starting, in a temporary repository
  with the branches `master`, `feature-0010-init`, `feature-0010-init2` and `task-0026-doc`, and see them fail
  (R3, R4, R5, R6, R7, R8, R9, R17):
    - `task-0026-doc` and `0026` both run the branch `task-0026-doc`
    - `0010` lists both branches, exits non-zero and makes no `run` call; `026`, `0099` and `claude` name no
      branch, exit non-zero and say the branch is made on the host
    - with the stand-in reporting the container running, the run is refused naming the container, and the clone
      directory and the repository's refs are as before
    - a new run mounts `<state>/agentrite/project-agent/task-0026-doc` at `/work` under the name
      `project-agent-task-0026-doc`. In it the branch is checked out at the host's commit, `origin/master` is the
      host's `master`, an object file's inode differs from the host's, and a file the host had uncommitted and an
      ignored file are absent
    - a clone directory already there is mounted as it is, a file left in it still there, and the output says it
      was resumed
    - with `refs/remotes/sandbox/task-0026-doc` ahead of the branch and no clone, the run is refused with a
      message naming the ref
    - the `run` call mounts the host's `.reviews` at `/work/.reviews`, and both directories exist before the call,
      owned by the caller. The stand-in mounts nothing, so a file written there reaching the host is left to the
      real check
- [ ] Add `container/unit-clone.sh` with `resolve_unit_branch` and `prepare_clone`, and the unit run in
  `container/agent.sh` up to and including the named `docker compose run`. A stopped container under the name is
  removed with `docker rm` before the run. The tests of the previous task pass (R3 to R9)
- [ ] In `tests/agent-unit-run.test.mjs`, write the tests of landing and see them fail (R10 to R17). The script
  the stand-in runs is the agent:
    - a commit on the branch: afterwards the host's branch is at it, checked out or not, `sandbox/<branch>` is
      gone, and the clone directory is gone
    - the host's branch moved meanwhile: it is left, `sandbox/<branch>` holds the agent's commit, the output names
      `git merge sandbox/<branch>`, and the exit code is the command's
    - a changed file, an untracked file, a commit on a second branch, and a stash, each on its own: the clone is
      kept and the output names its path. A new `node_modules` directory that the project ignores does not keep it
    - the script exits 7: the commit lands and the wrapper exits 7
    - the stand-in reports the container still running after `run` returns: nothing is fetched and the clone
      stays
    - the fetch fails, with the clone's `.git` removed by the script: the wrapper says the fetch failed, keeps the
      directory and exits non-zero
    - the script sets `core.fsmonitor` and `uploadpack.packObjectsHook` in the clone and adds executable
      `post-checkout`, `pre-commit` and `post-merge` hooks, each leaving a marker file outside the clone: after
      the run no marker exists
    - after a run the host's `.git/config` and `.git/hooks` are byte for byte as before, and its other branches
      are where they were
- [ ] Add `land_clone` to `container/unit-clone.sh` and call it from `container/agent.sh` after the container,
  with the three signals ignored for the duration of the run. The suite passes (R10 to R16)
- [ ] Update the header comment of `container/agent.sh`: the usage, the two ways to run, and that the wrapper
  still sets nothing that confines the container (R19)
- [ ] In `README.md` (R19):
    - "Starting it": the command is `./agent.sh <unit>` or `./agent.sh --in-place`, and what each mounts. The
      examples `./agent.sh claude` and `./agent.sh npm test` become `./agent.sh 0029 claude` and
      `./agent.sh --in-place npm test`
    - a new subsection after it, "Working on a clone": planning on the host and the sandbox for implementing and
      reviewing; the unit by ID or branch and what happens when an ID names several; only committed work goes in;
      `npm ci` first in a new clone; where the clones are; what happens when the container exits, with
      `sandbox/<branch>` and the merge; a kept clone and how it is resumed, landed with `./agent.sh <unit> true`
      or discarded with `rm -rf`; two units side by side and that each container has the full memory and CPU
      limits; `.reviews`; and the boundary as the spec's "The boundary" states it
    - "Another working directory": the last sentence, which advises a separate clone made by hand, now points at
      "Working on a clone"
    - "The shared `node_modules`": a first sentence saying it applies to `--in-place` and `--workdir`
    - "Trying the working copy's sandbox": the example becomes `./agent-dev.sh --in-place npm test`, and a line
      says that a unit run of the dev sandbox has clones of its own, under its own Compose project name
    - check that every sentence removed or moved is accounted for, as the process asks of a documentation change
- [ ] Check it for real on a host with Docker, with `./agent-dev.sh`, on a throwaway branch made for the purpose,
  and log what was seen with the Docker and Compose versions (R18):
    - `./agent-dev.sh <branch> sh -c 'echo x > f && git add f && git commit -m try'`: the host's branch has the
      commit, `git branch -r` shows no `sandbox/` ref, and the clone directory is gone
    - the same with `echo y > g` and no commit: the clone is kept and named; `./agent-dev.sh <branch> ls` shows
      `g` and says it was resumed
    - a shell left open in one terminal and the same command in another: refused, naming the container
    - a second throwaway branch run at the same time: both run
    - `touch /work/.reviews/seen` inside: the file is in the host's `.reviews`, owned by the developer
    - `docker kill` of the container from another terminal after a commit inside: the commit lands
    - `npm ci && npm run check-changes` inside a new clone exits 0
    - remove the throwaway branches, the kept clone and the `seen` file, and log that nothing is left
- [ ] Log in the record that Docker Desktop for macOS was not tried, unless it was (R18)

## Verification

- [ ] `npm test` exits 0 on the host
- [ ] `npm run check-changes` exits 0 on the committed branch
- [ ] No line of a changed file is over 120 characters, and none holds an em dash
- [ ] `grep -n 'git -C "\$clone"\|cd "\$clone"' container/agent.sh container/unit-clone.sh` finds nothing
- [ ] `git status --short` shows nothing left of the real check, and the state directory holds no clone of the
  throwaway branches

## Commit Points

- [ ] `feature-0029` the shared `setUp`, as a refactoring
- [ ] `feature-0029` the extended stand-in, the tests of the required choice, `--in-place` and the updated runs
- [ ] `feature-0029` the tests of resolving and starting, `resolve_unit_branch`, `prepare_clone` and the named run
- [ ] `feature-0029` the tests of landing, `land_clone` and the header comment
- [ ] `feature-0029` the README
- [ ] `feature-0029` the record of the real check
