# 0021 A sandbox built from the working copy

## Context

This repository runs the kit's sandbox as any project does: `./agent.sh` is the shim the kit generates, and it runs
the wrapper of the released kit installed under `node_modules`. A change to the sandbox made here, to the base
Compose file, the Dockerfile, the entrypoint, the proxy or the wrapper, is therefore not in the sandbox `./agent.sh`
starts until it has been released and this repository has moved to that release. The README says as much, under
"The kit's own copy of the kit": "Work on the sandbox itself is therefore done inside the sandbox the last release
built, not the working copy's."

That leaves no documented way to try a sandbox change before releasing it. Units 0020 and 0015, and their
reviewers, each assembled a `docker compose` command by hand to do it. For 0015 it took a third Compose file written
outside the repository and this command:

```sh
AGENTRITE_CONTAINER=node_modules/@ritenoar/agentrite/container AGENT_UID=$(id -u) AGENT_GID=$(id -g) \
  docker compose --project-directory . -f container/compose.yml -f agent/compose.project.yml \
  -f /tmp/0015-home.yml run --rm agent
```

The human met this while checking 0015 by hand on 2026-10-04, and asked for a solution: not being able to test live
what is being changed, for want of a release, is not acceptable while developing the kit.

### What was found while planning

On Linux with Docker Engine 28.4.0 and Compose 2.39.2, from a git worktree of this repository at `master`
(`58430fa`), where the working copy's sandbox files are identical to those of the installed release 2.2.1. To tell
the two apart, a marker was put in the working copy's base Compose file, as an environment variable, and another
in its entrypoint, as a log line. Everything created was named `agentrite-0021-plan` and removed afterwards, and
the temporary edits were reverted.

* **The kit's wrapper already runs from the working copy.** It takes the project root as its argument and uses the
  directory it sits in as the kit. Run from the working copy with this repository's root, the container had the
  Compose file's marker in its environment and printed the entrypoint's marker, so both the Compose file and the
  files the image holds came from the working copy
* **The wrapper passes exactly two Compose files**, the kit's base and the project's, and nothing in its interface
  adds a third. The project name, the image name and so the home volume's name all come from the project's file,
  which names them literally. Run as it is, the working copy's wrapper therefore uses the release sandbox's project,
  image and home volume. This was read from the wrapper and the files and not run, since running it would have
  mounted the human's home volume
* **A variable in the project's file is enough to change all three.** With the project name and the image name
  each written as a variable that defaults to today's literal name, Compose resolved the same project, image,
  network and volume names as today when the variable was unset, and `agentrite-0021-plan`,
  `agentrite-0021-plan_default` and `agentrite-0021-plan_agent-home` when it was set. Setting Compose's own
  `COMPOSE_PROJECT_NAME` instead changed the project, the network and the volume but not the image
* **A stale image is the foreseeable trap.** The wrapper builds only when the image is missing or `--rebuild` is
  given. After the entrypoint's marker was changed, a run without `--rebuild` exited 0 and printed the old marker.
  With `--rebuild` it printed the new one
* **Rebuilding every time cost nothing measurable.** A run with `--rebuild` and nothing changed took 8 seconds, and
  the same run without it took 8 seconds, nearly all of it the entrypoint's start-up check. The first build of the
  new image took 9 seconds including the run, because every layer was in the build cache from the release image
* **The home volume is the only state.** A file written to the home in one run was there in the next. After
  `docker volume rm` of the volume, the next run created it again holding only what the image puts there. The
  release image's id and the list of volumes and networks were the same after the runs as before
* The suite reports 178 passing and 0 failing on `master`, and `npm pack --dry-run` lists 22 files

Not established:

* Docker Desktop for macOS, and any Docker or Compose version but the ones above
* How long the first build takes on a host whose build cache does not hold the release image's layers
* Whether either harness starts in a sandbox run this way. Only `bash` commands were run. 0015's record has both
  harnesses reaching their first screen in a sandbox started from the working copy's Compose file by hand
* The report that the bare command `./container/agent.sh "$PWD"` brought the sandbox up on the 0015 branch. It was
  not repeated, for the reason above. What was run is the same wrapper with only the names changed

## Requirements

1. `./agent-dev.sh`, run on the host from the root of a checkout of this repository, starts the sandbox of that
   checkout's working copy: the wrapper, the base Compose file, the Dockerfile, the entrypoint and the proxy are
   the files in the working tree, with this repository's own project Compose file. It takes the options and the
   command the wrapper takes, and passes them on unchanged
2. That sandbox has its own Compose project, image and home volume: the project and the image are named
   `ritenoar-agentrite-agent-dev`, and the home volume `ritenoar-agentrite-agent-dev_agent-home`. Starting it, with
   or without an image to build, leaves the image `ritenoar-agentrite-agent` and the volume
   `ritenoar-agentrite-agent_agent-home` as they were, and it starts while a sandbox started with `./agent.sh` is
   running
3. Every start builds the image from the working copy before it runs, so that a change to a file the image holds
   is in the sandbox that starts, with no flag to remember
4. `./agent.sh` is unchanged in what it does: with the variable this unit introduces unset, Compose resolves the
   same project name, image name, network name and volume name for this repository as it does today
5. Nothing of this reaches a project that installs the kit. The package holds the same files as before, and `init`
   and `refresh` write and rewrite what they did
6. The suite, which runs no Docker, holds requirements 1 to 4 as far as it can: that the command runs the working
   copy's wrapper with the checkout as the project root and passes its arguments on, that Docker is asked to build
   before it is asked to run even when the image exists, that Docker is run with the name of requirement 2 in the
   variable, and that this repository's project Compose file takes both its project name and its image name from
   that variable with today's name as the default
7. The README says how to try the working copy's sandbox: the command, what it runs and under which names, that it
   runs on the host and not from inside a sandbox, how to empty its home, and how to remove what it created. The
   paragraph under "The kit's own copy of the kit" no longer reads as if the working copy's sandbox cannot be run
8. The behavior is checked for real on a host with Docker, and what was seen is in the record with the Docker and
   Compose versions: that a marker put in the working copy's base Compose file and one put in its entrypoint both
   show in a sandbox started with `./agent-dev.sh` and with no flag, that the names are those of requirement 2, and
   that the release image's id and the release home volume are the same afterwards

## Decisions

* **A shim of this repository's own, beside the generated one.** `./agent.sh` stays the generated shim, which
  `refresh` rewrites and the README says is not a file to edit. The new command is a second file that only this
  repository has. Rejected: a flag on `./agent.sh`, which `refresh` would remove; and an npm script, which would
  make the command `npm run` with a `--` before every argument
* **It runs the kit's own wrapper, not a `docker compose` command of its own.** The wrapper is one of the files a
  sandbox change may touch, so it is under test too, and a second copy of what it does, the uid, the mounts and the
  build, would be knowledge held twice
* **The names come from one variable in this repository's project Compose file.** The project name and the image
  name are each written as `AGENT_PROJECT_NAME` with today's name as the default, and the command sets the
  variable. The file is the project's own, which `init` wrote once and nothing rewrites, and it already takes
  `AGENT_MEM_LIMIT` and `AGENT_CPUS` from the environment the same way. Rejected:
    * A third Compose file, which is what was done by hand. The wrapper passes two files, so it needs either a
      change to the shipped wrapper for a need only this repository has, or a command that does not use the wrapper
    * `COMPOSE_PROJECT_NAME` alone, which leaves the image name as it is, and so leaves the release image to be
      replaced by a rebuild
    * The image name written as `COMPOSE_PROJECT_NAME`, which resolved correctly both set and unset, and is one
      edited line instead of two. It makes the image's name depend on a variable that Compose defines and that
      nothing in the file shows a default for, where a variable of the project's own with its default beside it
      can be read without knowing Compose's rules
* **Always build.** The command is for trying a change, and the trap seen while planning is a run that exits 0 on
  the image built before the change. The build is cached, and with nothing changed it cost nothing measurable.
  Rejected: leaving `--rebuild` to the caller, which is the flag one forgets exactly when it matters
* **One home volume that lasts, emptied by removing it.** The dev sandbox's home is its own and survives a run, as
  the release sandbox's does, so a login made there to try a harness is made once. It starts empty the first time,
  which gives the "no saved login" case, and `docker volume rm ritenoar-agentrite-agent-dev_agent-home` gives it
  again. That one command is documented and is not wrapped. See "Beyond the request" for the flag that would wrap it
* **The dev names are fixed, and shared by every checkout and worktree of this repository on a host.** One image
  and one home are enough to try a change, and a name per checkout would leave images and volumes behind for each
* **What the separation is for.** It keeps a developer's or an agent's ordinary use of the command from replacing
  the image the everyday sandbox runs on and from running an untried sandbox against the saved logins. It is not a
  boundary against anyone: a caller who sets the variable to the release's name gets the release's names, and
  whoever can run Docker on the host can reach every image and volume anyway. The confinement of the container is
  whatever the working copy's files make it, which is the thing being tried

## Non-goals

* Running the command from inside a sandbox. The sandbox has no Docker and is not given any, so trying a sandbox
  change is done on the host, by the human or by an agent that runs there
* Any change to the kit's wrapper, base Compose file, Dockerfile, entrypoint or proxy, or to anything a project
  receives. A way to pass a further Compose file through the wrapper would serve other projects too, and is not
  this unit
* Making agents work inside the working copy's sandbox by default. `./agent.sh` stays the everyday sandbox, from
  the release, which is the point of the paragraph the README has
* The same for the instructions: agents still read `process.md` and the roles from the installed release
* Removing the dangling images that repeated rebuilds leave. The README says how to remove what the command
  created, and Docker's own pruning does the rest
* Docker Desktop for macOS. Requirement 8 asks for the host the implementer has
* Git inside a sandbox whose working directory is a git worktree, which no shim handles today

## Beyond the request

* **A flag that starts with an empty home**, such as `./agent-dev.sh --fresh-home`. It would cost option parsing
  in a shim that otherwise has none, a decision on whether it removes the lasting volume or uses a throwaway one,
  and tests for both. Without it, the documented `docker volume rm` does the same in one more command, and fails
  with Docker's own message when a container still uses the volume
* **Letting the caller choose the name**, by having the command keep an `AGENT_PROJECT_NAME` that is already set.
  It would give a throwaway sandbox on demand and let two reviewers try different checkouts at once without
  sharing a home. It costs one expansion and a test, and it makes `AGENT_PROJECT_NAME=ritenoar-agentrite-agent
  ./agent-dev.sh` a way to replace the release image. Without it, two runs at once share the dev image and home,
  which nobody has needed yet
* **A rule in `AGENTS.md`** that a unit changing the sandbox verifies with `./agent-dev.sh`. It costs a line. The
  README is already required reading and will name the command, so without the rule a planner finds it there
