---
kind: bug
status: planned
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

## Amendments
