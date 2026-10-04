# 0029 The sandbox works on a clone of the unit's branch

## Approach

The wrapper, `container/agent.sh`, gains a second way to run. With `--in-place` or `--workdir` it does what it does
today, ending in the same `exec docker compose run`. With a unit it resolves the branch, prepares the clone, runs
the container under a name, and then lands the work. It can no longer `exec` in that case, because it has work to
do after the container.

The git work goes in a new file beside it, `container/unit-clone.sh`, which the wrapper sources when it is given
a unit, and not for `--in-place` or `--workdir`: those runs stay what they are today, and the tests that install
the wrapper with nothing else of the kit beside it stay as they are. The file holds functions and no top-level
code, so the wrapper stays the one place that orders the steps and talks to Docker:

* `resolve_unit_branch ROOT UNIT` prints the branch or fails with the message of requirement 3
* `refuse_unlanded ROOT BRANCH CLONE` fails with the message of requirement 5 when there is no clone and
  `sandbox/<branch>` holds commits the branch lacks
* `prepare_clone ROOT BRANCH CLONE` makes the clone or reports a resumed one
* `land_clone ROOT BRANCH CLONE` fetches, fast-forwards, compares and removes, and reports what it kept

Since 0027 and 0030 the wrapper works out the harness versions, reads the image's labels, may ask npm and may
build, all before it runs the container. A unit run fits into that in this order, which the spec's requirements 1
and 3 to 6 fix:

1. The options are parsed, `--in-place` among them. With no `--in-place`, no `--workdir` and no argument left, the
   wrapper refuses (R1). This comes before `installed_version` and before any call of Docker or npm
2. Given a unit, the wrapper sources `container/unit-clone.sh` and resolves the branch, with git alone (R3)
3. The host's versions and the merged configuration, as today. The node script that reads the image name from the
   configuration prints its `name` too, which is the Compose project's name. No second query is made
4. For a unit run: the container's name and the clone's path, the refusal when `docker ps` shows the name running
   (R4), and `refuse_unlanded` (R5)
5. The image's labels, the registry and the build, as today
6. For a unit run: `prepare_clone`, the two `.reviews` directories, `docker rm` of a stopped container under the
   name, the named `docker compose run` without `exec`, and `land_clone`. Otherwise the `exec` of today

Where things are:

* The clone is `${XDG_STATE_HOME:-$HOME/.local/state}/agentrite/<compose project>/<branch>`. The branch name is
  used as it is, so a branch with a slash is a nested directory and two branches never share one
* The container is named `<compose project>-<branch>`, with every character outside `[A-Za-z0-9_.-]` replaced by
  `-`. Two branches that differ only in such a character share a name, and the second is refused while the first
  runs
* The Compose project's name is the `name` of the merged configuration the wrapper already asks Compose for with
  `config --format json`
* The character replacement is bash's own, `${name//[^A-Za-z0-9_.-]/-}`, so that it needs no command on the `PATH`

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

The tests drive the real wrapper on the host of `fakeHost` in `tests/wrapper-fixture.mjs`, which 0027 added and
both wrapper tests share: a `bin` directory that is the whole `PATH`, with a stand-in `docker`, a stand-in `npm`
and fake harnesses. The unit run's tests use real git in temporary repositories. For a unit run the stand-in
`docker` also plays the agent: when a test gives it a script, it runs that script in the directory mounted at
`/work` and exits with the script's status.

Two things follow from that `PATH`, both tried while revising the plan, with only `bash`, `basename`, `cat`,
`dirname`, `id` and `git` linked and an empty home:

* `git clone`, `git fetch` from the clone, `git ls-remote` and the fast-forward by `git fetch .` all work once
  `git` is linked. `grep`, `mktemp`, `mkdir` and `rm` are not found. Every command `container/unit-clone.sh`, the
  unit run in the wrapper and the agent scripts of the tests use is therefore added to the fixture's
  `linkedCommands`
* `git commit` fails with "Author identity unknown", because the wrapper runs with an empty home. The setup of the
  unit run's tests writes a `.gitconfig` with a name and an email into that home, which serves the commits it
  makes itself and those of the agent scripts

This repository's own `./agent.sh` runs the released wrapper, so the change is tried with `./agent-dev.sh`, on the
host.

## Files

- `container/agent.sh`: the `--in-place` option, the required choice, the unit run, and a header comment that says
  what the wrapper now does
- `container/unit-clone.sh`: new, the four functions above
- `container/compose.yml`: two comments that say what the wrapper mounts
- `tests/wrapper-fixture.mjs`: more linked commands, and the stand-in `docker` extended
- `tests/agent-wrapper.test.mjs`: its runs gain `--in-place`; new tests for the required choice
- `tests/agent-unit-run.test.mjs`: new, the unit run, with a setup of its own
- `tests/agent-dev.test.mjs`: its runs gain `--in-place`
- `README.md`: "Running the sandbox" and its subsections, "The harness versions" among them, and the example under
  "Trying the working copy's sandbox"
- `changes/0029-sandbox-clone-of-the-branch/record.md`: the log, and the real check

`templates/project/agent.sh`, `agent.sh` and `agent-dev.sh` pass their arguments on and do not change.
`RELEASING.md` runs no sandbox and does not change. `tests/harness-versions.test.mjs` searches every file under
`container/` for a version of a harness, the new file among them, and needs no change. Nothing in the image
changes, so no rebuild is needed for the change itself.

## Tasks

- [x] Extend `fakeHost` in `tests/wrapper-fixture.mjs`, with no test depending on it yet, and say each addition in
  its comment. The suite still passes, and this is committed on its own (R17):
    - `linkedCommands` gains `git`, `grep`, `mkdir`, `mktemp` and `rm`
    - the stand-in `docker` answers `ps` without recording it, as it does its other two questions: with the content
      of the file `runningContainer` when that is there, and with nothing otherwise
    - it records `rm` and exits 0
    - on `compose ... run`, after recording the call, it runs the file `agentScript` with `bash`, when that is
      there, in the directory the call mounts at `/work`, and exits with its status
    - `fakeHost` returns the paths of the two files
  The configuration it answers with has `name: "project-agent"` already
- [x] In `tests/agent-wrapper.test.mjs`, write the tests of the required choice and see them fail (R1, R2, R17):
    - with the project root alone, with `--rebuild` alone and with `--mount DIR` alone, on a host whose image is
      missing, the wrapper exits non-zero, names the three forms, and `dockerCalls()` and `npmCalls()` are empty
    - `--in-place echo hi` makes exactly the Docker calls today's `echo hi` makes
    - `--workdir DIR echo hi` mounts `DIR` at `/work`, and the home holds no `.local/state`
- [x] Add `--in-place` to every run of the existing tests in `tests/agent-wrapper.test.mjs` and
  `tests/agent-dev.test.mjs` that gets past the wrapper's first three refusals, which are the missing project root,
  the missing project Compose file and the kit outside the root. That is every run that expects a container, with
  or without a command, and the runs that expect a refusal by Compose, by the build or by the registry. The run of
  the dev shim's test that gives `--workdir` needs none. Implement the option and the required choice in
  `container/agent.sh`, as step 1 of the order above. The suite passes (R1, R2)
- [x] In `tests/agent-unit-run.test.mjs`, write the tests of resolving and starting and see them fail (R3, R4, R5,
  R6, R7, R8, R9, R17). Its setup is its own, on `fakeHost`: the project root is a git repository with the
  branches `master`, `feature-0010-init`, `feature-0010-init2` and `task-0026-doc`, a `.gitignore` that names
  `node_modules` and `.reviews`, and the wrapper and `container/unit-clone.sh` copied under its `node_modules`. The
  home holds a `.gitconfig` with a name and an email. The run sets no `XDG_STATE_HOME`, so the state directory is
  `.local/state` in that home, except in the one test that sets it:
    - `task-0026-doc` and `0026` both run the branch `task-0026-doc`
    - `0010` lists both branches and exits non-zero; `026`, `0099` and `claude` name no branch, exit non-zero and
      say the branch is made on the host. In each case `dockerCalls()` and `npmCalls()` are empty, on a host whose
      image is missing
    - with the stand-in reporting the container running, the run is refused naming the container, and the clone
      directory and the repository's refs are as before. On a host whose image is missing, no `build` is recorded
      and `npmCalls()` is empty
    - with `XDG_STATE_HOME` set, the clone is under it and the home holds no `.local/state`
    - with the image missing and the file `buildFails` there, the wrapper exits with the build's status and the
      state directory holds no clone
    - a new run mounts `<state>/agentrite/project-agent/task-0026-doc` at `/work` under the name
      `project-agent-task-0026-doc`. In it the branch is checked out at the host's commit, `origin/master` is the
      host's `master`, an object file's inode differs from the host's, and a file the host had uncommitted and an
      ignored file are absent
    - a clone directory already there is mounted as it is, a file left in it still there, and the output says it
      was resumed
    - with `refs/remotes/sandbox/task-0026-doc` ahead of the branch and no clone, the run is refused with a
      message naming the ref, and on a host whose image is missing no `build` is recorded
    - `--rebuild` and `--mount DIR` before the unit are taken as options: the image is built, and `DIR` is mounted
      beside the clone
    - the `run` call mounts the host's `.reviews` at `/work/.reviews`, and both directories exist before the call,
      owned by the caller. The stand-in mounts nothing, so a file written there reaching the host is left to the
      real check
- [x] Add `container/unit-clone.sh` with `resolve_unit_branch`, `refuse_unlanded` and `prepare_clone`, and the unit
  run in `container/agent.sh` up to and including the named `docker compose run`, in the order of the approach. A
  stopped container under the name is removed with `docker rm` before the run. The tests of the previous task
  pass, and so do those of `tests/agent-wrapper.test.mjs` and `tests/agent-dev.test.mjs`, whose setups copy no
  `unit-clone.sh` (R3 to R9)
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
  still sets nothing that confines the container. The paragraph on the harness versions stays as it is (R19)
- [ ] In `container/compose.yml`, bring two comments in line: the one at the top, which says the wrapper adds only
  the working directory, the extra mounts and the harness versions, and the one over `- .:/work`, which says the
  wrapper overrides the source with `--workdir`. Both now also name the clone of a unit run and the `.reviews`
  mount. No setting changes (R19)
- [ ] In `README.md` (R19):
    - "Starting it": the command is `./agent.sh <unit>` or `./agent.sh --in-place`, and what each mounts. The
      examples `./agent.sh claude` and `./agent.sh npm test` become `./agent.sh 0029 claude` and
      `./agent.sh --in-place npm test`, and `--rebuild` is described as an option of either form
    - every other command the README gives that names nothing to mount gains what it mounts, with its sentence
      otherwise as it is: `./agent.sh --rebuild` under "Running the sandbox" and under "The harness versions",
      `./agent.sh --mount ~/reference:ro --mount ~/scratch` under "Extra directories", `./agent.sh -- npm ci` under
      "The shared `node_modules`", and `./agent.sh claude --version` under "The harness versions". Afterwards
      `grep -n 'agent\(-dev\)\?\.sh' README.md` shows no command that the wrapper would refuse
    - "The harness versions" gains a sentence: the versions and the image are worked out from the checkout the
      command is run from, also for a unit run, as the spec's "The sandbox is configured from the host's checkout"
      states it
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

- [x] `feature-0029` the extended fixture, with no behavior changed
- [x] `feature-0029` the tests of the required choice, `--in-place` and the updated runs
- [x] `feature-0029` the tests of resolving and starting, `resolve_unit_branch`, `refuse_unlanded`, `prepare_clone`
  and the named run
- [ ] `feature-0029` the tests of landing, `land_clone`, the header comment and the comments of
  `container/compose.yml`
- [ ] `feature-0029` the README
- [ ] `feature-0029` the record of the real check
