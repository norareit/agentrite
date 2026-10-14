# 0050 On a Compose older than 2.35.0 a unit run mounts the project root instead of the clone

## Approach

One entry of `container/compose.yml` goes, `- .:/work`, with the comment above it rewritten to say why the file
declares nothing at `/work`. The wrapper does not change. The work around the line is what proves it: a regression
test that reads the compose file, and runs through the wrapper on two versions of Compose.

**The test.** A new file, `tests/compose-work-volume.test.mjs`, reads `container/compose.yml` as text, as
`tests/compose-tmpfs.test.mjs` does, since the kit has no YAML parser. A function `workVolumes(text)` returns the
lines of the sandbox service's `volumes:` list that mount at `/work`:

* The list is the lines after the first line that is exactly `    volumes:`, the service's, up to the first line
  that is not blank, not a comment and not indented by more than four spaces. The top-level `volumes:` is not
  indented and is not it
* A short-form entry is a line that opens with `      - ` and holds no `: ` after it, as `- .:/work`. Its text,
  with surrounding quotes taken off, is split on `:`, and it mounts at `/work` when a field after the first is
  exactly `/work`. Any field after the first, and not only the second, so that a source with a colon in it, as
  `${SOURCE:-.}:/work`, is still caught
* A long-form entry mounts at `/work` when one of its lines is `target: /work`, with or without quotes, and whether
  the line opens the entry, as `      - target: /work`, or follows it, as `        target: /work`
* A target under `/work`, such as `/work/.reviews`, and a source of `/work`, are not `/work`

The tests of the file:

1. The kit's `container/compose.yml` gives `workVolumes` no line. The assertion's message names the lines it gave
   and says that the wrapper passes the mount at `/work` for every run, and that a Compose older than 2.35.0 mounts
   the file's volume instead, so that a unit run works in the project root and not in its clone
2. `workVolumes` finds the short form in a text that holds `- .:/work`, `- ./source:/work:ro` and
   `- "${SOURCE:-.}:/work"`, each in a list of the shape of the kit's, among comments
3. `workVolumes` finds the long form in a text that holds an entry with `type: bind`, `source: .` and
   `target: /work`, with the target on the entry's first line and on a later one
4. `workVolumes` finds nothing in a text whose list holds `- .:/work/.reviews`, `- agent-home:/home/agent`,
   `- ${HOME}/.gitconfig:/etc/gitconfig:ro`, `- /work:/elsewhere` and a long-form entry with `target: /work/.reviews`,
   and whose top-level `volumes:` names a volume `work`

Tests 2 to 4 hold the function to both forms, which test 1 cannot do, since the kit's file holds the short form
only.

**The comment.** The comment above the volume, which opens the service's `volumes:` list, goes with it. In its
place, at the head of the list, a comment says: nothing is declared at `/work`, because the wrapper passes
the mount at `/work` for every run, the clone of a unit run, the project root of `--in-place` or the directory of
`--workdir`, as a `docker compose run --volume`, and a Compose older than 2.35.0 mounts a volume this file declares
at a target in place of a run's `--volume` to the same target. A volume here at `/work` would have every unit run
work in the project root.

**The runs through the wrapper.** This repository's `./sandbox.sh` runs the installed release, 6.0.0, which still
has the volume, so the runs use `./sandbox-dev.sh`, which runs the working copy's `container/`. It rebuilds the image
on every run, and its container of a unit run is named
`ritenoar-agentrite-sandbox-dev-bugfix-0050-unit-run-mounts-the-project-root-on-an-older-compose`. A unit run of
this unit from the host's checkout, which is on the unit's branch, is what the wrapper allows: it brings the work
back by a merge when the branch is checked out.

Each run is given a command that keeps the container up long enough to be inspected, as `sleep 120`, and writes
nothing, so the unit run brings nothing back and the wrapper removes its clone. While it is up, from another shell:

```sh
docker inspect <container> --format '{{range .Mounts}}{{.Type}} {{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'
```

The container of a run that is not a unit run has the name Compose gives it, which `docker ps` shows.

The older Compose is the host's own: Docker Desktop 4.26.0, Compose 2.23.3-desktop.2. Leave Docker Desktop as it is
until those runs are recorded. The newer Compose is the standalone `docker/compose` 2.39.2, the version the earlier
units recorded on Linux, as the CLI plugin of a scratch Docker configuration directory, which leaves the host's own
Compose as it is. The planner tried it on this host: with it, `docker compose version` gives 2.39.2, `docker buildx
version` gives Desktop's 0.12.0, `docker compose build` builds, and a `run --volume` at `/work` mounts what it is
given against the file's `.:/work`. Make it in a scratch directory, never under the repository:

```sh
scratch=<a scratch directory>
mkdir -p "$scratch/docker-config/cli-plugins" "$scratch/compose-2.39.2"
cp ~/.docker/config.json "$scratch/docker-config/" && cp -R ~/.docker/contexts "$scratch/docker-config/"
ln -s ~/.docker/cli-plugins/docker-buildx "$scratch/docker-config/cli-plugins/docker-buildx"
curl -fsSL -o "$scratch/compose-2.39.2/docker-compose" \
  https://github.com/docker/compose/releases/download/v2.39.2/docker-compose-darwin-aarch64
chmod +x "$scratch/compose-2.39.2/docker-compose"
ln -s "$scratch/compose-2.39.2/docker-compose" "$scratch/docker-config/cli-plugins/docker-compose"
DOCKER_CONFIG="$scratch/docker-config" docker compose version
```

and give `DOCKER_CONFIG="$scratch/docker-config"` to `./sandbox-dev.sh`. Remove the scratch directory afterwards.
Should `docker compose version` not give 2.39.2 there, or the build fail, stop and ask the human for a host with a
Compose of 2.35.0 or later, as the Linux host the earlier units were checked on, or to update Docker Desktop to
4.41.0 or later once the runs on the older Compose are recorded.

A run of `./sandbox-dev.sh` needs a terminal for the container's `tty: true`. Where the agent's shell cannot start
one, ask the human to start the run in theirs and do the inspection from the agent's shell.

## Files

- `tests/compose-work-volume.test.mjs`: new, the regression test
- `container/compose.yml`: the volume `.:/work` goes, and the comment above it is rewritten
- `changes/0050-unit-run-mounts-the-project-root-on-an-older-compose/record.md`: the log, and what the runs showed

No other file changes. `README.md` and `SANDBOX.md` stay as they are, as the spec's non-goals say, and so do the
wrapper, `container/unit-clone.sh` and the wrapper's tests.

## Tasks

- [x] Write `tests/compose-work-volume.test.mjs` as the Approach describes. Run it with
  `node --test tests/compose-work-volume.test.mjs` on the host and see test 1 fail, naming `- .:/work`, and tests
  2 to 4 pass. Log the failure in `record.md` (R7)
- [x] In `container/compose.yml`, remove `- .:/work` and the comment above it, and write the comment the Approach
  describes at the head of the service's `volumes:` list. Change nothing else in the file. See the four tests pass
  (R6, R7)
- [x] Run `npm test` on the host and see no test fail, with the same tests skipped as on `master`. Run the whole
  suite in the sandbox with `./sandbox.sh --in-place npm test`, which the bug does not touch, and see no test fail
  and none skipped. See that `git diff master -- container/sandbox.sh container/unit-clone.sh tests/` lists the new
  test file and nothing else (R5)
- [ ] On the host's Compose 2.23.3-desktop.2, note the checkout's branch, `git rev-parse HEAD` and
  `git status --porcelain`. Run `./sandbox-dev.sh 0050 sleep 120`, and while it is up inspect its container: the
  clone under `~/.local/state/agentrite/ritenoar-agentrite-sandbox-dev/` at `/work`, the host's `.reviews` at
  `/work/.reviews`, and nothing else at `/work`. After it exits, see the checkout's branch, `HEAD` and
  `git status --porcelain` as noted, no entry in `git reflog` from the time of the run, and the clone removed (R1)
- [ ] On the same Compose, make a scratch directory outside the repository, run
  `./sandbox-dev.sh --workdir <that directory> sleep 120`, and see the directory at `/work` and nothing else at
  `/work` (R2)
- [ ] On the same Compose, run `./sandbox-dev.sh --in-place sleep 120`, and see the project root at `/work` and
  nothing else at `/work` (R3)
- [ ] Make the Compose 2.39.2 of the Approach, or follow the Approach where it cannot be made, and repeat the three
  runs above with it: the unit run with the same checks of the checkout, `--workdir` and `--in-place` (R4)
- [ ] Log in `record.md`, for each run: the Docker and Compose versions, the command, and the lines `docker inspect`
  listed at `/work` and under it. For the unit run on each Compose, what the checkout's branch, `HEAD`, status and
  reflog showed before and after (R8)

## Verification

- [ ] `npm test` passes on the host, with no more tests skipped than on `master`
- [ ] `./sandbox.sh --in-place npm test` passes, with no test skipped
- [ ] The runs of both Compose versions are in the record, with the versions and what `docker inspect` listed
- [ ] `npm pack --dry-run` lists the same files as on `master`
- [ ] `npm run check-changes` passes

## Commit Points

- [ ] The regression test and the fix, in one commit, as `bugfix-0050 Declare nothing at /work in the base Compose
  file`. The failure of the test before the fix is in the record, so the tree is never committed with a failing test
- [ ] The record of the runs, as `bugfix-0050 Record the runs on Compose 2.23.3 and 2.39.2`
