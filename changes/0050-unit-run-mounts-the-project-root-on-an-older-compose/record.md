---
kind: bug
status: in-progress
timestamp: 2026-10-14T12:21:25Z
---

# 0050 On a Compose older than 2.35.0 a unit run mounts the project root instead of the clone

## Log

- 2026-10-14T12:21:25Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the macOS host,
  on `master` at `5dd13cd`, on the human's request for a bug unit for the unit run of 0048 that worked in the
  developer's checkout, with the fix they chose of the two offered: the base Compose file declares no volume at
  `/work`. Made the unit as a bug. Numbered 0050: the plain directories run from 0001 to 0048, `origin` was
  fetched and holds no unit past 0048, and 0049 is the number of a unit that another session specified at the same
  time.
  Read the role file and `process.md` as installed under `node_modules/agentrite`, which is release 6.0.0. Read
  besides: the base Compose file and the wrapper, which are the same in this repository as in the installed kit
  for the base file, the tests of the wrapper and of `sandbox-dev.sh` for the calls to Docker, and "Running a unit"
  of `SANDBOX.md` and "The sandbox" of `README.md`.
  Seen while the container of 0048 still ran, on Docker Desktop 4.26.0 with Engine 24.0.7 and Compose
  2.23.3-desktop.2: `docker inspect` listed the project root at `/work` and its `.reviews` at `/work/.reviews`, and
  no mount of the clone, which was at `f43b190`. The commits of 0048 in the host's checkout are stamped `+0000`.
  Reproduced without the kit, with a Compose file of one `alpine:latest` service with the volume `.:/work` and a
  `run --volume` of another directory at `/work`: the file's directory is mounted on the Compose of Docker Desktop
  and on the standalone 2.23.3, 2.24.0, 2.27.0, 2.30.0, 2.33.0, 2.33.1 and 2.34.0, and the run's on 2.35.0, 2.35.1,
  2.36.0, 2.39.2 and 5.6.0. A `run --volume` at `/work/.reviews` is mounted on all of them.
  The root cause is from the source of `docker/compose`: the diff of `pkg/compose/create.go` between `v2.34.0` and
  `v2.35.0`, commit `0c37c1096` of pull request #12722, and `cmd/compose/run.go` at `v2.34.0`, which appends a
  run's volumes after the file's. The Docker Desktop release notes give 4.41.0 as the first to ship Compose 2.35 or
  later.
  Shown for the fix, on Compose 2.23.3-desktop.2: with a file that declares no volume at `/work`, `run --volume` of
  a directory at `/work` and of another at `/work/.reviews` mounts both. Checked that the wrapper reads nothing of
  the merged configuration's volumes, and that every other target it passes is not one the base file declares.
  Wrote `spec.md`. Decided, each with its reason under "Decisions": no Compose version is required, the regression
  test is on the file and the proof is a run on a host with each kind of Compose. Left out, under "Beyond the
  request": the wrapper refusing a project's Compose file that declares a volume at `/work`.
  Not checked: the fix through the wrapper, which is the implementer's, and a Linux host. The status is `draft`
- 2026-10-14T12:27:53Z [human] approved the spec. The status is `approved`
- 2026-10-14T12:33:24Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the macOS host, on
  the host rather than in the sandbox, whose unit run on this host's Compose is the bug. Cut
  `bugfix-0050-unit-run-mounts-the-project-root-on-an-older-compose` from `master` at `193e7e7`. Read the role file
  and `process.md` as installed, release 6.0.0. Judged that the fix needs a plan: a regression test, the fix and
  runs through the wrapper on two Compose versions. Read besides: `container/compose.yml`, the comments of the
  wrapper and of `container/unit-clone.sh` on landing a clone in a checked-out branch, `sandbox-dev.sh`,
  `sandbox/compose.project.yml` for the container's name, and `tests/compose-tmpfs.test.mjs` for how the suite reads
  the compose file. Only the comment above the volume says the file mounts the project root.
  Tried on this host, for the newer Compose of requirement 4: the standalone Compose 2.39.2 as the CLI plugin of a
  scratch Docker configuration directory gives `docker compose version` 2.39.2 against Docker Desktop 4.26.0, builds
  with Desktop's buildx 0.12.0, and mounts a `run --volume` at `/work` over a file's `.:/work`. The host's own
  `docker compose` stays 2.23.3-desktop.2.
  Wrote `plan.md`. The status is `planned`
- 2026-10-14T12:35:23Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the macOS host,
  on the host rather than in the sandbox, on `bugfix-0050-unit-run-mounts-the-project-root-on-an-older-compose` at
  `06f586a`. Read the role file as installed, release 6.0.0. The status is `in-progress`
- 2026-10-14T12:35:56Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, wrote
  `tests/compose-work-volume.test.mjs` as the plan describes. On the tree of `06f586a` with the test added,
  `node --test tests/compose-work-volume.test.mjs` on the host reports 4 tests, 3 passing and 1 failing: "the base
  compose file declares no volume of the sandbox at /work", with `container/compose.yml declares - .:/work at
  /work` and the reason, and `[ '- .:/work' ]` where `[]` is expected
- 2026-10-14T12:53:47Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, removed `- .:/work` from
  `container/compose.yml` and wrote the comment of the plan at the head of the service's `volumes:` list. The four
  tests of `tests/compose-work-volume.test.mjs` pass. `docker compose config` of the base and the project's files,
  with the variables the wrapper sets, lists the service's volumes as `agent-home` at `/home/agent` and the
  developer's `.gitconfig` at `/etc/gitconfig`, and nothing at `/work`.
  On that tree, `npm test` on the host reports 546 tests, 529 passing, 17 skipped and none failing. They are the
  seventeen of unit 0046, which this unit leaves as they were: the new file skips none, and no other test file
  changes. `./sandbox.sh --in-place npm test`, through the installed release 6.0.0 on Compose 2.23.3-desktop.2,
  reports 546 tests, 546 passing, none skipped and none failing
- 2026-10-14T13:02:29Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the working copy's sandbox
  through the wrapper on `d1a032d`, with `./sandbox-dev.sh`, on the macOS host with Docker Desktop 4.26.0 and Engine
  24.0.7, on two Compose versions. Each run was inspected while its container was up with `docker inspect`, of
  which the mounts at `/work` and under it are given here, and every run exited 0. The commands slept 120 seconds
  for the first unit run, 30 for the second and 20 for the others, long enough for the inspection.
  * On the host's own Compose 2.23.3-desktop.2:
    * `./sandbox-dev.sh 0050 sleep 120`, in the container
      `ritenoar-agentrite-sandbox-dev-bugfix-0050-unit-run-mounts-the-project-root-on-an-older-compose`:
      `bind /Users/stef/.local/state/agentrite/ritenoar-agentrite-sandbox-dev/<the unit's branch> -> /work` and
      `bind /Users/stef/projects/agentrite/.reviews -> /work/.reviews`, and nothing else at or under `/work`. In
      the container, `git log -1` in `/work` gave `d1a032d` and `git rev-parse --show-toplevel` gave `/work`.
      Before and after the run, the checkout was on the unit's branch at `d1a032d`, with nothing in
      `git status --porcelain`, and the last entry of `git reflog` was the commit of `d1a032d`, made before the
      run. After it, the clone's directory was gone and no ref under `refs/remotes/sandbox` was left
    * `./sandbox-dev.sh --workdir <a directory made with mktemp -d> sleep 20`: that directory at `/work`, and
      nothing else at or under it. `/work` held the file `marker` put there
    * `./sandbox-dev.sh --in-place sleep 20`: `bind /Users/stef/projects/agentrite -> /work`, and nothing else at or
      under it
  * On Compose 2.39.2, the standalone binary of `docker/compose` as the CLI plugin of a scratch Docker configuration
    directory, as the plan describes, against the same Docker Desktop. It reports each host path with Docker
    Desktop's prefix `/host_mnt`, which 2.23.3 does not:
    * `./sandbox-dev.sh 0050 sleep 30`, in the same container name: the clone at `/work` and the host's `.reviews`
      at `/work/.reviews`, and nothing else at or under it. Before and after, the checkout was on the unit's
      branch at `d1a032d`, `git status --porcelain` held the one line of this unit's `plan.md`, ticked and not yet
      committed, and the last entry of `git reflog` was the commit of `d1a032d`. After it, the clone's directory
      was gone and no ref under `refs/remotes/sandbox` was left
    * `./sandbox-dev.sh --workdir <a directory in the scratch directory> sleep 20`: that directory at `/work`,
      holding `marker`, and nothing else at or under it
    * `./sandbox-dev.sh --in-place sleep 20`: the project root at `/work`, and nothing else at or under it
  The scratch directories were removed afterwards, and no container of `ritenoar-agentrite-sandbox-dev` is left.
  Not checked: a Linux host, and a Compose between 2.23.3 and 2.39.2 other than these two through the wrapper
- 2026-10-14T13:09:20Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the verification of the plan
  on the tree of `d1a032d` with this record and the ticks of `plan.md`, which change no code. `npm test` on the
  host reports 546 tests, 529 passing, 17 skipped and none failing. `./sandbox.sh --in-place npm test` reports 546
  tests, 546 passing, none skipped and none failing. `npm pack --dry-run` lists 33 files, the same as on `master`
  at `193e7e7` in a worktree. `npm run check-changes` is run on the commit of this entry. Every task of the plan is
  ticked. The status stays `in-progress` until the review: the unit has not been reviewed
- 2026-10-14T19:59:29Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, reviewed unit 0050 at
  `dbf901ffdd39b585a745046764d1c3ef6c9f5684`, a full review against merge base
  `193e7e70b11d2e3245b2c16df7b24ebf3670970a`. Returned S1. The complete findings are in
  `.reviews/0050-unit-run-mounts-the-project-root-on-an-older-compose/20261014T195743Z-full-review.md`.
  Independently ran `npm test`: 546 tests, 529 passing, 17 skipped and none failing; the first attempt timed out,
  and the repeat completed. Ran `./sandbox.sh --in-place npm test` through a terminal: 546 passing, none skipped
  or failing. The change check and package dry run passed. Inspected all three forms of the working copy's
  wrapper run on Docker Engine 24.0.7 and Compose 2.23.3-desktop.2, and compared the checkout's branch, HEAD,
  status, staged-file listing and last HEAD reflog entry before and after. Not independently verified: the
  recorded Compose 2.39.2 runs and their historical checkout observations, the historical order of writing the
  regression test and applying the fix, or wrapper mounts on a Linux host
- 2026-10-14T20:05:39Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, accepted S1, which blocks: a
  volume at `/work` that carries a trailing comment, in the short form or the long one, escapes the regression
  test, which R7 does not allow. Reproduced on `dbf901f` with the reviewer's command, without editing a file:
  `- .:/work # project checkout` injected into the compose text the test reads gives 4 tests passing and none
  failing, and so does a long-form entry with `target: /work # project checkout`, while `- .:/work` gives 1
  failing. The gap is in the plan's description of the parser, which the test follows. Added to `plan.md`, before
  doing it, a rule of the parser for trailing comments, a fifth test, a task, a commit point, and the verification
  to be run again on the new tree, on the human's word to apply the finding
- 2026-10-14T20:08:54Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, applied S1. Added test 5 to
  `tests/compose-work-volume.test.mjs` and saw it fail, on `- .:/work # the checkout` and on the long form with
  `target: /work # the checkout`, while its quoted `#` and its `#` with no whitespace before it were found already.
  Then had `workVolumes` read each line without its trailing comment: from a `#` that follows whitespace and is
  outside quotes, where a quote counts only where it opens a value, after whitespace. The five tests pass. The
  case `- ./it's:/work # the checkout`, added to test 5 with that last rule, fails when a quote may open anywhere,
  shown on a copy of the test outside the repository. The reviewer's reproduction of S1, with
  `- .:/work # project checkout` and with its long form, now gives 4 tests passing and 1 failing, test 1, whose
  message names the commented line. S1 is resolved.
  On that tree, `npm test` on the host reports 547 tests, 530 passing, 17 skipped and none failing.
  `./sandbox.sh --in-place npm test` reports 547 tests, 547 passing, none skipped and none failing. `npm pack
  --dry-run` lists 33 files, the same as on `master` at `193e7e7`. `npm run check-changes` is run on the commit
  of this entry. Every task of the plan is ticked. The change for S1 has not been reviewed, so the status stays
  `in-progress` for the human to decide whether it is reviewed again

## Amendments
