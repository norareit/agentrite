# 0050 On a Compose older than 2.35.0 a unit run mounts the project root instead of the clone

## Context

A unit run is to mount a clone of the unit's branch at `/work`, and to leave the developer's checkout alone until
the container exits, when the wrapper brings the work back. `SANDBOX.md` says so in "Running a unit", and `README.md`
in "The sandbox". On a host whose Docker Compose is older than 2.35.0 it mounts the project root at `/work` instead,
and the agent works in the developer's own checkout.

It was found on the macOS host, with Docker Desktop and the kit's release 6.0.0, while unit 0048 was being built with
`./sandbox.sh 0048`. The whole of unit 0048 was made in the developer's checkout: the planner switched it to the
unit's branch and committed the plan there, and the implementer and the reviewer committed in it after that.

A unit run that works in the developer's checkout loses what the clone is there for:

* The agent runs git in the checkout the developer works in. It switches the branch under the developer, commits on
  it, and has their uncommitted changes in its working tree
* The agent uses the host's `node_modules` and whatever else is in the checkout and not in a clone
* Two unit runs of the same project work in the same checkout, so they cannot run side by side

Every host whose Compose is older than 2.35.0 is affected, macOS and Linux alike. Docker Desktop ships Compose 2.35.0
or later from its release 4.41.0 on, and 4.40.0 ships 2.34.0. `README.md` asks for Docker Desktop on macOS and
Docker Engine on Linux, with no version.

A run with `--workdir DIR` mounts `DIR` at `/work` in the same way as a unit run mounts its clone, and is affected
in the same way: it gets the project root. A run with `--in-place` mounts the project root, which is what it asks
for, and is not affected.

## Observed behavior

On the macOS host, with Docker Engine 24.0.7 and Compose 2.23.3-desktop.2 (Docker Desktop 4.26.0) and the kit's
release 6.0.0, `./sandbox.sh 0048` cut the branch `feature-0048-load-the-process-through-the-harness` from `master`,
made its clone and started the container. `docker inspect` of the container listed these mounts at `/work`:

```
bind /Users/stef/projects/agentrite -> /work rw=true
bind /Users/stef/projects/agentrite/.reviews -> /work/.reviews rw=true
```

The clone was not mounted at all. It stayed at the commit it was cut at, `f43b190`, while the commits of unit 0048
appeared in the developer's checkout, stamped `+0000`, the container's time zone, where the developer's own are
`+0200`. The first of them in the host's reflog is the agent's `checkout: moving from master to
feature-0048-load-the-process-through-the-harness`. The developer saw the plan appear in their editor, in the
checkout they had open.

After the container exited the clone was gone. It held nothing the host's branch did not, which is when the wrapper
removes a clone.

## Expected behavior

A unit run mounts the clone of the unit's branch at `/work`, with the host's `.reviews` at `/work/.reviews`, and
nothing of the developer's checkout besides `.reviews`. A run with `--workdir DIR` mounts `DIR` at `/work`. Both
hold on every Compose, the ones older than 2.35.0 among them.

## Steps to reproduce

Through the wrapper, on a host with a Compose older than 2.35.0 and the kit's release 6.0.0:

1. Run `./sandbox.sh <unit>` for a unit of the project
2. From another terminal, run
   `docker inspect <container> --format '{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}'`, with
   the container's name as the wrapper gives it, `<Compose project>-<branch>`
3. Observe the project root at `/work`, and no mount of the clone under `~/.local/state/agentrite`

Without the kit, with a Compose file that declares a service with `image: alpine:latest`, `working_dir: /work` and
the volume `.:/work`, and a directory `proj` with a file `marker` holding `PROJECT` and a directory `clone` with one
holding `CLONE`:

1. Run `docker compose --project-directory proj -f <file> run --rm --volume "$PWD/clone:/work" <service>
   cat /work/marker`
2. Observe `PROJECT` on a Compose older than 2.35.0, and `CLONE` on 2.35.0 or later

Reproduced that way on the macOS host, with the Compose of Docker Desktop and with the standalone binaries of the
`docker/compose` releases:

| Compose                                                                       | What `/work` holds |
|-------------------------------------------------------------------------------|--------------------|
| 2.23.3-desktop.2, and 2.23.3, 2.24.0, 2.27.0, 2.30.0, 2.33.0, 2.33.1, 2.34.0 | `proj`             |
| 2.35.0, 2.35.1, 2.36.0, 2.39.2, 5.6.0                                         | `clone`            |

A second `--volume` to `/work/.reviews`, which the file does not declare, is mounted on every one of them.

## Root cause

The kit's base Compose file gives the service the volume `.:/work`, the project root, and the wrapper passes its own
mount at `/work` to `docker compose run` as a `--volume`, counting on it to replace the file's. A Compose older than
2.35.0 keeps the file's.

`docker compose run` appends each `--volume` to the service's volumes, after the ones of the file. When it then
makes the container's bind mounts, a Compose older than 2.35.0 writes each bind mount from the first of the
service's volumes with the same target: for `/work` that is the file's `.:/work`, with the project root as its
source, and the wrapper's `--volume` to `/work` is lost. A target the file does not declare, as `/work/.reviews`,
has only the run's own volume to be written from, and is mounted as given.

Compose 2.35.0 changed this in the commit `0c37c1096`, of pull request docker/compose#12722, "mount API is not
strictly equivalent to bind". A bind mount is written from the service's volume of the same target only when its
source is a named volume of the project, and a host path is mounted from its own source. The release notes list the
change as being about named volumes, and do not mention `run`. Shown by the diff of `pkg/compose/create.go` between
the tags `v2.34.0` and `v2.35.0`, and of `cmd/compose/run.go` at `v2.34.0` for the order of the volumes, and by the
reproduction above, which changes between those two releases.

The wrapper has passed its mount at `/work` this way since the kit was made, for `--workdir`. Unit 0029, which made
a unit run mount a clone, made it the way every unit run gets its working directory.

## Fix

The kit's base Compose file declares no volume at `/work`. What is mounted at `/work` is then the one mount the
wrapper passes, on any Compose, since there is nothing for it to lose to. The wrapper does not change: it passes a
mount at `/work` for every run that starts a container, and has no default.

Shown on the macOS host with Compose 2.23.3-desktop.2: with a file whose service declares no volume at `/work`, a
`--volume` of `clone` at `/work` and one of `proj/.reviews` at `/work/.reviews` mount both, and a `--volume` of
`proj` at `/work` mounts `proj`.

## Requirements

1. On a host whose Compose is older than 2.35.0, a unit run has the clone of the unit's branch at `/work` and the
   host's `.reviews` at `/work/.reviews`, and no other mount at `/work`. The branch, the commits, the index and the
   working tree of the developer's checkout are what they were when the run started, until the container exits and
   the wrapper brings the work back
2. On such a host, a run with `--workdir DIR` has `DIR` at `/work`, and no other mount at `/work`
3. On such a host, a run with `--in-place` has the project root at `/work`, as it does before this unit
4. Requirements 1 to 3 hold on a Compose of 2.35.0 or later, as they do before this unit
5. What the wrapper passes to Docker, for every form of run, is what it passes before this unit
6. The kit's base Compose file declares no volume of the service at `/work`
7. The suite holds a test that fails when the kit's base Compose file declares a volume of the service at `/work`,
   whether in the short form, as `.:/work`, or in the long one, with `target: /work`. Its message says that the
   wrapper passes the mount at `/work`, and that a Compose older than 2.35.0 mounts the file's volume instead
8. Requirements 1 and 2 are shown through the wrapper on a host whose Compose is older than 2.35.0, and requirement
   4 for a unit run on one whose Compose is 2.35.0 or later. The unit's record holds, for each, the Docker and
   Compose versions, what was run, and the mounts `docker inspect` listed for the container at `/work` and under it

## Decisions

* **The base Compose file stops declaring `/work`, and no Compose version is required.** On the human's word, who
  chose it of the two. The volume at `/work` is a default that no run uses: every run that starts a container
  passes its own mount at `/work`, and the base file refuses to be used without the wrapper, which the variables it
  takes from the wrapper see to. Without the volume the fix holds on every Compose, and nothing is to be checked or
  told. Rejected: requiring Compose 2.35.0 and having the wrapper refuse an older one. It would send every developer
  with an older Docker Desktop to upgrade for the sake of a line that serves nothing, and would have the wrapper read
  Compose's version, which comes with suffixes such as `-desktop.2`. Rejected as well: keeping the volume and
  removing it in the project's file with the `!reset` tag, which a Compose older than 2.24.0 does not know, and
  which would have every project carry the kit's repair
* **The regression test is on the file, and the proof is a run on a host.** The suite runs the wrapper with a
  stand-in for `docker`, and on hosts without Docker, so it cannot see what Compose mounts. What the kit controls
  is that its file declares no target the wrapper passes, and the test holds that. That the clone is then what
  `/work` holds is a matter of Compose, and is shown on a host with an affected Compose, as requirement 8 says, and
  on one with a newer Compose, so that the fix is shown to change nothing there
* **The message of the test names the cause.** The volume looks like a harmless default, and whoever adds it back
  would see no failure on a newer Compose. The message is what tells them why it may not be there
* **What the clone isolates, and from what.** A unit run keeps an agent that does its unit's work apart from the
  developer's checkout, so that the developer's branch, uncommitted work and `node_modules` stay as they are, and
  several units can run at once. It does not defend the checkout against an agent that tries to reach it, and
  nothing it is given needs that: `--in-place` mounts the checkout by design, and what the sandbox defends against
  is in "What the sandbox defends against" of `SANDBOX.md`, which this unit leaves as it is
* **A bug.** The wrapper and both documents say that a unit run mounts the clone, and on a host the kit supports
  it mounts the developer's checkout, with nothing that says so

## Non-goals

* Repairing a checkout that a unit run worked in on an affected Compose. The work is there on the unit's branch, as
  the wrapper would have brought it back, and is the developer's to keep or undo
* A minimum Docker or Compose version in `README.md`, or a check of the version
* A volume at `/work` in a project's own Compose file. See "Beyond the request"
* A change to `README.md` or `SANDBOX.md`, which describe what this unit makes true
* A change to any other mount: every other target the wrapper passes is one the base file does not declare, and is
  mounted as given on every Compose above
* A section in `CHANGELOG.md`, which is written when a release is made

## Beyond the request

* **The wrapper refuses a project's Compose file that declares a volume at `/work`.** A project's
  `sandbox/compose.project.yml` is merged with the base file, so such a volume brings this bug back on an older
  Compose. The wrapper reads the merged configuration already, to refuse a service named `agent`, and the check
  would be one more thing read from it, with its tests and an entry in the refusals. No project has done it.
  Without it, a project that does gets, on an older Compose, a unit run that silently works in the checkout, which
  the developer sees only by its effects, as with unit 0048
