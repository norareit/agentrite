# 0021 A sandbox built from the working copy

## Approach

Two small pieces. This repository's project Compose file takes its project name and its image name from one
variable, `AGENT_PROJECT_NAME`, which defaults to today's name, so `./agent.sh` resolves what it always did. A new
shim at the root, `agent-dev.sh`, sets that variable to `ritenoar-agentrite-agent-dev` and execs the working copy's
`container/agent.sh` with the checkout as the project root and `--rebuild` ahead of the caller's arguments. The
wrapper is not changed: it already works out `AGENTRITE_CONTAINER` as `container` when it sits in the root's own
`container/` directory, and it accepts `--rebuild` more than once.

The shim, in full, modelled on `agent.sh`:

```sh
#!/usr/bin/env bash
#
# Runs the sandbox of this working copy rather than the released kit's, to try a change
# to container/ before it is released. Only this repository has this file; it is not
# part of the kit. README.md describes it under "Trying the working copy's sandbox".
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# agent/compose.project.yml names the Compose project and the image after this variable,
# so the working copy's sandbox gets an image and a home volume of its own and leaves
# those of ./agent.sh alone.
export AGENT_PROJECT_NAME=ritenoar-agentrite-agent-dev
# Always build: the wrapper otherwise reuses an image built before the change under test.
exec "$here/container/agent.sh" "$here" --rebuild "$@"
```

The tests run no Docker. `tests/agent-dev.test.mjs` builds a temporary root holding copies of `agent-dev.sh` and
`container/agent.sh` and an empty `agent/compose.project.yml`, puts a fake `docker` first on `PATH` that answers
`image inspect` with success and `config --images` with a name and records every other call with the
`AGENT_PROJECT_NAME` and `AGENTRITE_CONTAINER` it saw, as `tests/agent-wrapper.test.mjs` does. It has a fixture of
its own, small, and `tests/agent-wrapper.test.mjs` is not refactored to share one: its fixture answers different
questions, and a refactoring does not belong in this unit.

The first, the fourth and the sixth task run Docker, so they are done on the host. An implementer working inside a
sandbox does the others and leaves those three to the human or to a session on the host, saying so in the record.

## Files

- `tests/agent-dev.test.mjs`: new, the tests below
- `agent/compose.project.yml`: `name:` and `services.agent.image` become
  `${AGENT_PROJECT_NAME:-ritenoar-agentrite-agent}`, with a comment saying that `agent-dev.sh` sets the variable and
  why
- `agent-dev.sh`: new, mode 755, as above
- `README.md`: the paragraph under "The kit's own copy of the kit", and a new subsection after it
- `changes/0021-working-copy-sandbox/record.md`: the log

## Tasks

- [x] Before any edit, save what Compose resolves today, for the comparison in the fourth task. This reads
  configuration and creates nothing:
  `AGENTRITE_CONTAINER=node_modules/@ritenoar/agentrite/container AGENT_UID=$(id -u) AGENT_GID=$(id -g) docker
  compose --project-directory . -f node_modules/@ritenoar/agentrite/container/compose.yml -f
  agent/compose.project.yml config > /tmp/0021-before.yml` (R4)
- [x] Write `tests/agent-dev.test.mjs` and see each test fail for want of the shim or of the variable (R6):
    * the shim runs `container/agent.sh` of its own root: the recorded Compose calls name
      `<root>/container/compose.yml` and `<root>/agent/compose.project.yml`, with `--project-directory <root>`
      and `AGENTRITE_CONTAINER=container` (R1)
    * with an image that exists, a `build` call is recorded before the `run` call (R3)
    * every recorded call saw `AGENT_PROJECT_NAME=ritenoar-agentrite-agent-dev`, also when the caller's
      environment had set the variable to something else (R2)
    * `./agent-dev.sh --workdir <dir> --mount <dir>:ro echo hi` reaches `run` as the wrapper renders those
      options, with `agent echo hi` last (R1)
    * read as text, this repository's `agent/compose.project.yml` has exactly one top-level `name:` line and one
      `image:` line, and each has the value `${AGENT_PROJECT_NAME:-ritenoar-agentrite-agent}` (R2, R4)
- [x] Edit `agent/compose.project.yml` and add `agent-dev.sh`, executable. The suite passes (R1, R2, R3)
- [x] Run the command of the first task again into `/tmp/0021-after.yml`, with `AGENT_PROJECT_NAME` unset, and
  `diff` the two: no difference. `npm pack --dry-run` lists the same 22 files as on `master`, and `agent-dev.sh` is
  not among them. `git diff master -- container templates scripts package.json` is empty (R4, R5)
- [ ] In `README.md`, under "The kit's own copy of the kit", change the second paragraph to read:

  > The repository also runs the kit's sandbox, from the installed release, with `./agent.sh`, as any project does.
  > Work on the sandbox itself is therefore done inside the sandbox the last release built, not the working copy's:
  > a change to `container/` does not alter the sandbox the agent making it runs in. Trying such a change is done
  > from the host, as described below. `./deploy.sh` stays on the host: releasing needs AWS credentials and hosts the
  > sandbox does not reach.

  and add after it the subsection "Trying the working copy's sandbox", saying, in this order (R7):
    * `./agent-dev.sh` runs the sandbox from the working copy: `container/agent.sh`, `container/compose.yml`, the
      Dockerfile, the entrypoint and the proxy as they are in the working tree, with the repository's
      `agent/compose.project.yml`. It takes what `./agent.sh` takes, for example `./agent-dev.sh npm test`
    * It is this repository's own file. It is not in the package, and `init` and `refresh` do not write it
    * It builds the image on every start, so a change is in the sandbox that starts
    * It has its own Compose project and image, `ritenoar-agentrite-agent-dev`, and its own home volume,
      `ritenoar-agentrite-agent-dev_agent-home`, through `AGENT_PROJECT_NAME` in `agent/compose.project.yml`. The
      image and the saved logins of `./agent.sh` are not touched, and both sandboxes can run at once
    * It runs on the host. A sandbox has no Docker, so an agent working inside one cannot run it
    * The home starts empty and lasts. To empty it again:
      `docker volume rm ritenoar-agentrite-agent-dev_agent-home`
    * To remove everything it created: that volume, `docker network rm ritenoar-agentrite-agent-dev_default` and
      `docker image rm ritenoar-agentrite-agent-dev`
- [ ] Check it for real on a host with Docker, and log what was seen with the Docker and Compose versions (R8):
    * note `docker image inspect --format '{{.Id}}' ritenoar-agentrite-agent` and `docker volume ls`
    * add, uncommitted, an environment variable to `services.agent.environment` in `container/compose.yml` and a
      `log` line near the top of `container/entrypoint.sh`
    * `./agent-dev.sh bash -c 'echo "$<the variable>"'` prints the variable's value, and the entrypoint's line is
      in its output
    * change the entrypoint's line and run the same command again, with no flag: the changed line is printed
    * `docker volume ls`, `docker image ls` and `docker network ls` show `ritenoar-agentrite-agent-dev_agent-home`,
      `ritenoar-agentrite-agent-dev` and `ritenoar-agentrite-agent-dev_default`
    * the release image's id and the volume `ritenoar-agentrite-agent_agent-home` are as noted at the start
    * revert the two edits with `git checkout -- container`, and run `./agent-dev.sh npm test`: it exits 0 with
      the count the host reports
    * if a sandbox started with `./agent.sh` is running at the time, say so in the log; if none is, start
      `./agent.sh sleep 60` in another terminal first, so that the two are seen to run at once (R2)

## Verification

- [ ] `npm test` exits 0 on the host
- [ ] `npm run check-changes` exits 0 on the committed branch
- [ ] No line of a changed file is over 120 characters, and none holds an em dash
- [ ] `git status --short` shows nothing left of the real check's temporary edits, and `/tmp/0021-before.yml` and
  `/tmp/0021-after.yml` are removed

## Commit Points

- [ ] `feature-0021` the tests, the variable in `agent/compose.project.yml` and `agent-dev.sh`
- [ ] `feature-0021` the README
- [ ] `feature-0021` the record of the real check
