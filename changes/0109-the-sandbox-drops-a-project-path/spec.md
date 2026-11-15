# 0109 The sandbox drops the PATH that a project's Dockerfile sets

## Context

A project adds software to the sandbox's image with a Dockerfile of its own, `sandbox/Dockerfile`, built on the
kit's image, as "Adding software to the sandbox" of `SANDBOX.md` describes. Software installed outside the
directories of the usual `PATH`, as under `/opt`, is found by its commands only when the file adds its directory to
`PATH`, with a line such as `ENV PATH=/opt/tool/bin:$PATH`.

`container/entrypoint.sh` runs as root at every start of a container. It exports a `PATH` of its own,
`/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`, before anything else, and the agent's command, which
it starts last through `setpriv`, inherits it. `sandbox.sh --connect` gives the command it runs in a unit run's
container the same `PATH`, by `--env PATH=...` on `docker exec`, so that the connected command has the first
command's `PATH`, as `SANDBOX.md` says it does.

A developer running the orchestrator on a project of their own reported that a line `ENV PATH` in the project's
Dockerfile is overridden without a word.

## Observed behavior

The agent's command, and a command run by `--connect`, run with
`/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin` as their `PATH`, whatever `ENV PATH` the project's
`sandbox/Dockerfile` sets. A command installed in a directory that only that line names is not found. Nothing says
that the line was not used.

## Expected behavior

The agent's command, and a command run by `--connect`, run with the `PATH` of the image the container runs, which
is the one the project's `sandbox/Dockerfile` sets when it sets one, and the one of the kit's image when it does
not.

## Steps to reproduce

Not reproduced in a running container. The cause below is read from `container/entrypoint.sh`,
`container/sandbox.sh` and the test that holds the two against each other.

1. In a project, write a `sandbox/Dockerfile` that installs a command in `/opt/tool/bin` and sets
   `ENV PATH=/opt/tool/bin:$PATH`
2. Start the sandbox for a unit with `sandbox.sh`, and run `echo $PATH` and the command in it
3. See `PATH` without `/opt/tool/bin`, and the command not found

## Root cause

The line `export PATH=...` that opens `container/entrypoint.sh` replaces the `PATH` that Docker gives the container
from the image, and the entrypoint passes the replaced one on to the agent's command. `sandbox.sh --connect` repeats
the replaced value, so that the connected command matches the first one. The fixed `PATH` is there so that the
entrypoint, which runs as root, runs the programs of the system directories and none that an image puts first on
its `PATH`. It was never meant for the agent's command, and nothing in `SANDBOX.md` says that a project's `PATH` is
not used.

## Fix

The entrypoint keeps its fixed `PATH` for everything it runs as root, and gives the agent's command the `PATH` it
was started with, which is the image's. `--connect` gives its command the `PATH` of the container, so that it still
has the first command's. `SANDBOX.md` says that the `PATH` a project's Dockerfile sets is the agent's.

## Requirements

1. In a container of an image whose `sandbox/Dockerfile` sets `ENV PATH`, the command that the entrypoint starts as
   the agent has that `PATH`
2. A command that `sandbox.sh --connect` runs in a unit run's container has the same `PATH` as the first command of
   that container
3. In a container of the kit's image, or of a project's image whose `sandbox/Dockerfile` sets no `PATH`, the agent's
   command and a connected command have the `PATH` they have now,
   `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`
4. Every command that `container/entrypoint.sh` runs before it drops to the agent runs with
   `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin` as its `PATH`, whatever `PATH` the image sets
5. "Adding software to the sandbox" of `SANDBOX.md` says that a `PATH` the file sets with `ENV` is the `PATH` of the
   agent's commands and of a connected command, and the statement of "Two agents on one unit" that a connected
   command has the first command's `PATH` stays true
6. Regression tests show R1, R2 and R4: that the entrypoint gives the agent's command the `PATH` it was started with
   and runs its own commands with the fixed one, and that `--connect` gives its command no `PATH` other than the
   container's

## Decisions

* **The kind is bug.** `SANDBOX.md` has a project add software with a Dockerfile, and `ENV` is how a Dockerfile sets
  the environment of what runs on the image. A `PATH` that is set there and dropped is a fault, not a missing
  feature
* **The entrypoint keeps a fixed `PATH` for itself.** It runs as root, installs the firewall and starts the proxy. A
  project's image is the project's own and is trusted, but a fixed `PATH` keeps what root runs the same on every
  image, which is what the entrypoint's tests rely on. Only what it hands to the agent changes
* **`--connect` takes the container's `PATH` rather than reading the image's.** `docker exec` gives its command the
  environment the container was created with, whose `PATH` is the image's, which is what the first command now gets
  as well. Reading the image's configuration with `docker image inspect` and passing it again was rejected: it is a
  second source for the same value, and the two could drift apart
* **No refusal or notice of an `ENV PATH`.** Once the line works, there is nothing to warn of
* **The cause is read, not reproduced.** The report is from the developer's project, and the replacing line and its
  copy in `--connect` are in the code as it stands

## Non-goals

* Other variables of the environment that the entrypoint sets, `HOME`, `USER` and `LOGNAME`, which stay as they are
* A `PATH` given to the container by the compose files of a project
* Checking what a project's `PATH` holds, such as whether it still holds the system directories

## Beyond the request

None
