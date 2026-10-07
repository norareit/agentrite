# 0034 Connect to a unit run

## Approach

Written against `master` at `1391ee6`, which the branch was cut from.

`--connect` is one more option of the kit's wrapper, `container/agent.sh`, and a path of its own through it. It
shares with a unit run how a unit becomes a branch and how a branch becomes a container's name, and nothing else:
it leaves the wrapper before the host's harnesses are asked for a version, before a build is weighed and before the
log directories are made.

**The call.** The connected command is started with Docker's own `exec`, not with Compose's: a unit run's container
is one that `docker compose run` made, which `docker compose exec` does not address by a name. The wrapper ends in

```text
docker exec --interactive [--tty] --user agent --workdir /work \
  --env HOME=/home/agent --env USER=agent --env LOGNAME=agent \
  --env PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  <container> <command...>
```

* The wrapper `exec`s it, so the wrapper's status is the command's, and nothing of the wrapper is left to outlive
  the container
* `--interactive` always, so that a command a script runs can be given input. `--tty` when both standard input and
  standard output of the wrapper are a terminal, and not otherwise: Docker refuses a terminal without one on its
  input, and a terminal's line endings do not belong in a pipe
* `--user agent` by name and with no group, so that Docker takes the user's group and its other groups from the
  container's own account files, as the entrypoint's `setpriv --init-groups` does
* With no command the command is `bash`, which is the image's own default command and so what a unit run opens
* `HOME`, `USER`, `LOGNAME` and `PATH` are the values `container/entrypoint.sh` exports before it becomes the
  agent, the user is the one it becomes, `/work` is the working directory of `container/compose.yml`, and `bash` is
  the `CMD` of `container/Dockerfile`. The spec keeps the image, the entrypoint and the compose file as they are, so
  the wrapper holds these a second time. A test reads the three files and holds the wrapper's call against them, so
  that a change to one of them without the other fails the suite

**The wrapper's header says** that it sets nothing that confines the container. That stays true of the container.
The user of a connected process is the wrapper's to name, and the header says so where it describes `--connect`.

**The order in the wrapper**, each step before the next:

1. The option loop takes `--connect`
2. Right after the loop, before the refusal of nothing to mount: `--connect` together with `--in-place`,
   `--workdir`, `--mount` or `--rebuild` is refused, and `--connect` with no unit is refused. At this point the
   mounts hold only what `--mount` gave
3. The unit's branch: found for `--connect`, and found or cut for a run. `container/unit-clone.sh` gets a function
   that finds and never cuts, `find_unit_branch`, which `resolve_unit_branch` uses
4. The refusal to run as uid or gid 0, where it is today
5. After the wrapper's functions and before the host's harnesses are asked: the block of `--connect`. It asks
   Compose for the project's name, names the container, asks Docker whether it runs, refuses or `exec`s

The question to Compose and the naming of the container are each used twice now, so each becomes a function first,
in a commit that changes no behavior.

**The messages**, all on standard error, with `<unit>` as it was given and exit 2:

* **No unit**: `agent.sh: --connect needs a unit.` and the form `agent.sh --connect UNIT [COMMAND...]`
* **With an option of a run**: `agent.sh: --connect cannot be given together with <option>.`, one line for each
  option given, then `That is an option of a run, and --connect starts none.`
* **No branch**: `agent.sh: '<unit>' names no local branch, by its name or as a unit's number.` then
  `So there is no run to connect to.`
* **Several branches**: what a unit run says, from `find_unit_branch`
* **No container running**: `agent.sh: no run is under way for '<unit>': the container <name> is not running.`
  then `Start one with 'agent.sh <unit>'.`
* **Docker could not be asked**: the line of `unit_container_running`, then `Nothing was run.`
* **A second run**, which is requirement 12: the two lines of today, then
  `To run a command beside it: 'agent.sh --connect <unit> [COMMAND...]'.`

The refusals of `--connect` do not print the forms of `mount_forms`.

**What the stand-in cannot show** is requirement 16, which is run on a real Docker, on the host, with the working
copy's wrapper. `./agent-dev.sh` starts the run. It cannot connect: it always passes `--rebuild`, which requirement
10 refuses together with `--connect`. So the connecting side calls the working copy's wrapper itself, under the
name `./agent-dev.sh` gives its Compose project:

```sh
AGENT_PROJECT_NAME=ritenoar-agentrite-agent-dev container/agent.sh "$PWD" --connect <branch> <command...>
```

A sandbox has no Docker. An implementer that runs in one leaves that task unticked and logs it as a blocker, for
the human or a session on the host to run.

**Two things found while planning** are logged in the record for the human, and the plan decides neither:
`./agent-dev.sh --connect` is refused, as said above, while the README says that the shim takes what `./agent.sh`
takes; and the wrapper prints no usage besides the forms of `mount_forms`, so "the usage the wrapper prints" of
requirement 13 is read as those forms and the `Usage:` block of the wrapper's header.

## Files

- `container/unit-clone.sh`: `find_unit_branch`, split from `resolve_unit_branch`
- `container/agent.sh`: the two functions of the refactoring, the option, the refusals, the block that connects,
  the third line of the second run's refusal, the fourth form of `mount_forms`, and the header
- `tests/wrapper-fixture.mjs`: the stand-in's `exec` exits with a status a test gives
- `tests/agent-unit-run.test.mjs`: the tests of `--connect`, beside the unit run's, whose `setUp` they use, and the
  second run's refusal
- `tests/agent-wrapper.test.mjs`: the forms the wrapper lists
- `README.md`: `--connect`, under "Working on a clone" and in "Starting it"
- `changes/0034-connect-to-a-unit-run/record.md`: the log, with the runs on a real Docker

## Tasks

Refactoring, with no change of behavior. The suite passes before and after with no test changed.

- [x] In `container/unit-clone.sh`, split `find_unit_branch ROOT UNIT` from `resolve_unit_branch`. It prints the
      local branch of that name, or the one local branch whose name holds a unit of digits as a whole number. It
      fails with 1 and says nothing when the unit names no branch, and fails with 3 and lists the branches when
      it names several, in the words of today. `resolve_unit_branch` calls it, and on 1 cuts the branch of a unit of
      digits or says what it says today. Its header comment says that it runs git in the host's repository only
      and changes nothing (R2, R7, R10)
- [x] In `container/agent.sh`, move the question to Compose and the reading of its answer into a function,
      `read_merged_configuration`, which sets `image`, `claude_code_wanted`, `opencode_wanted` and `project`, and
      call it where the lines are. Move the two lines that make a container's name from the project and the branch
      into a function, `unit_container_name PROJECT BRANCH`, which prints it, and call it there (R2)

The command, tests first.

- [x] In `tests/wrapper-fixture.mjs`, let the stand-in `docker` exit from a recorded `exec` with the status in the
      file `execStatus`, when that is there, and return the file's path with the others. Say so in the comment of
      `fakeHost` (R15)
- [x] Test, for the unit as `task-0026-doc` and as `0026`, with a container running: `--connect <unit> echo hi`
      exits 0 and the only recorded call of Docker is the `exec` of the approach, word for word, without `--tty`,
      with the container `project-agent-task-0026-doc` and the command `echo hi`. With no command the call ends in
      `bash` (R1, R2, R3, R4, R15)
- [x] Test that the wrapper exits with the status the stand-in's `exec` exits with, for a status that is neither 0
      nor 2 (R3)
- [x] Test that the call holds `--tty` when the wrapper is run from a terminal. The test runs the wrapper under
      `script` of util-linux, taken from the suite's own PATH and not put in the stand-in's `bin`, and is skipped,
      with the reason, where `script --version` does not name util-linux (R3)
- [x] Test that what the call gives is what the image gives the first command: the values of `HOME`, `USER`,
      `LOGNAME` and `PATH` and the user are the ones `container/entrypoint.sh` exports and becomes, the working
      directory is the `working_dir` of `container/compose.yml`, and the default command is the `CMD` of
      `container/Dockerfile`. The test reads the three files (R1, R4)
- [x] Test what connecting leaves alone, on the host of `setUpWithBuildDue`, with a container running: after
      `--connect` the recorded calls of Docker are the one `exec`, npm was asked nothing, the state directory and
      the project's log directory do not exist, and `git for-each-ref` and `git status --porcelain` print what
      they printed before (R7)
- [x] Test that a unit run is as it was: the script that plays the agent of a unit run marks the container as
      running, runs the wrapper with `--connect` and a command, twice, and commits work. Both connects exit 0, and
      the unit run then fast-forwards the host's branch and removes the clone as it does with nothing connected
      (R8, R9)
- [x] Test the refusals. Each exits 2, records no call of Docker and asks npm nothing (R10):
    - `--connect` alone: names `--connect` and the form
    - a name that is no branch, and a number that no branch holds while `master` holds a unit of that number:
      names the unit, does not hold the word `cut`, and `git for-each-ref` prints what it printed before (R7)
    - `0010`: lists `feature-0010-init` and `feature-0010-init2`
    - no container running, for the unit as a branch and as a number: says that no run is under way, and holds
      `agent.sh <unit>` with the unit as it was given
    - Docker cannot be asked: holds `could not ask Docker whether` and `Nothing was run.`
    - each of `--in-place`, `--workdir DIR`, `--mount DIR` and `--rebuild`, once before `--connect` and once
      after it: names the option
- [x] Test that `--connect` is refused with exit 2, `refusing to run as root` and no call of Docker when the `id`
      of the stand-in's `bin` prints 0 (R11)
- [x] In `container/agent.sh`, implement `--connect` as the approach orders it, with the messages of its list,
      until the tests above pass: the option, the two refusals after the loop, `find_unit_branch` for the branch,
      and the block that names the container, asks Docker and ends in `exec docker exec`. Keep the unit as it was
      given, for the messages. A comment at the call names the three files its values come from and the test that
      holds them together (R1, R2, R3, R4, R7, R8, R9, R10, R11)
- [x] In the wrapper's header, describe `--connect`: a third paragraph beside the two ways to run, that it starts
      and mounts nothing and that the wrapper names the user of the connected process, the form in the `Usage:`
      block, and the option in the list under it (R13)

What says that it exists.

- [x] Extend the test of the second run's refusal: for the unit as a branch and as a number, standard error holds
      `agent.sh --connect <unit>` with the unit as it was given. Then add the line of the approach's list to the
      refusal (R12)
- [x] In `tests/agent-wrapper.test.mjs`, the test of the forms the wrapper lists also expects
      `agent.sh --connect UNIT `, and its name no longer counts three. Then add the form to `mount_forms`:
      `agent.sh --connect UNIT [COMMAND...]`, a command beside the one of the unit's run that is under way (R13)

The proof on a real Docker, on the host, before the README is written, so that the README says what was seen.
Each command and what it printed goes into `record.md`.

- [ ] Start a unit run of this unit's branch with `./agent-dev.sh`, whose first command writes a file to `/tmp`
      and then sleeps. With the connecting command of the approach, show from connected commands (R16):
    - the user, the group and the groups of the connected process and of the first command's process, from
      `id` and from `/proc/<pid>/status` of both, and that they are equal (R4)
    - `HOME`, `USER`, `LOGNAME` and `PATH` of both, from `env` and from `/proc/<pid>/environ` of the first
      command, and `pwd` (R4)
    - the lines `CapInh`, `CapPrm`, `CapEff`, `CapBnd`, `CapAmb` and `NoNewPrivs` of `/proc/self/status`, beside
      those of the first command's process. `CapPrm`, `CapEff` and `CapAmb` are all zeros and `NoNewPrivs` is 1
      (R5)
    - that a new privilege cannot be gained: `setpriv --reuid=0 true` and `iptables -S` both fail, with what
      they print (R5)
    - that it is in the container: it reads the file the first command wrote to `/tmp`, and it sees the first
      command's process (R6)
    - the canary of the compose file, `example.com`, refused with `curl`, and `api.anthropic.com` reached (R6)
    - `tty`, connected under `script` and connected without, which prints a terminal's name and `not a tty` (R3)
    - two connected commands at one time (R9)
    - a connected `sleep` under way when the first command ends: what the connecting wrapper prints and exits
      with, and that the unit run's wrapper then ends as it does today (R8)
- [ ] Where one of these is not as the requirement says, stop: log what was seen in `record.md`, leave the status
      `in-progress`, and write nothing into the README that was not seen. The unit goes back to the specifier and
      the human (R5, R16)

The README.

- [ ] In "Working on a clone", after the paragraph on two units side by side, add what requirement 14 names: the
      form `./agent.sh --connect <unit> [COMMAND...]`; an example with `./agent.sh 0029 claude` in one terminal and
      `./agent.sh --connect 0029 opencode` in another; that the first shell owns the container, that every
      connected command ends when it ends, with what the connecting wrapper then prints as it was seen, and that
      the first shell is therefore ended last, since a session that was not saved is lost while a commit is brought
      back; what `--connect` refuses; and that a process started in the container with `docker exec` and no user
      named is root and holds the capabilities the firewall is installed with, which is why `--connect` is the way.
      In that paragraph on two units, say that the refusal of a second run names `--connect` (R14)
- [ ] In "Starting it", name `--connect` in one sentence that points to "Working on a clone", and make the sentence
      on a command that says neither form true of the four forms (R13, R14)

## Verification

- [ ] `npm test` passes on the final tree
- [ ] `npm run check-changes` exits 0, run after the last commit
- [ ] No line of a changed or new file is over 120 characters, and none holds an em dash
- [ ] Every requirement of the spec has a ticked task that names it, and requirement 16 has its runs in `record.md`

## Commit Points

- [x] `feature-0034 Plan connecting to a unit run`: the plan and the record
- [x] `feature-0034 Split finding a unit's branch from cutting it`: the two refactoring tasks, with no change of
      behavior
- [x] `feature-0034 Connect a command to a unit run`: the stand-in, the tests of `--connect`, the wrapper and its
      header
- [x] `feature-0034 Name --connect where a second shell is looked for`: the second run's refusal and the forms
- [ ] `feature-0034 Record the runs on a real Docker`: the record
- [ ] `feature-0034 Describe --connect in the README`: the README
- [ ] `feature-0034 Record the implementation and what was run`: the record, with the suites on the final tree
