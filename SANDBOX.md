# The sandbox

How the agent sandbox is used, by what a reader does with it. The commands that start it, with every argument and
option, are in "Commands" of [`COMMANDS.md`](COMMANDS.md), and what the sandbox confines is in
"What the sandbox defends against".

* [Before the first run](#before-the-first-run)
* [Running a unit](#running-a-unit)
* [Running on a branch without the change process](#running-on-a-branch-without-the-change-process)
* [Getting the work back](#getting-the-work-back)
* [Two agents on one unit](#two-agents-on-one-unit)
* [Running on the tree as it is](#running-on-the-tree-as-it-is)
* [Commit messages](#commit-messages)
* [Logging in](#logging-in)
* [Reaching more hosts](#reaching-more-hosts)
* [Holding a harness version](#holding-a-harness-version)
* [Adding software to the sandbox](#adding-software-to-the-sandbox)
* [The status line](#the-status-line)
* [The local model server](#the-local-model-server)
* [Where things are kept on the host](#where-things-are-kept-on-the-host)
* [What the sandbox defends against](#what-the-sandbox-defends-against)
* [When something goes wrong](#when-something-goes-wrong)

## Before the first run

The sandbox is a Docker container that a harness is run in, with a clone of a unit's branch or the project mounted
read-write at `/work`.

What a run needs:

* The host needs Docker: Desktop on macOS, Engine on Linux
* Never run it with `sudo`. The wrapper refuses to run with uid or gid 0, because the agent inside the sandbox would
  then be root too. When Docker needs elevated permissions on the machine, add the user to the `docker` group instead
* A run says what it mounts at `/work`, and there is no default. A command that names no unit, and gives no
  `--in-place`, no `--workdir` and no `--connect` either, starts nothing and names the forms

A project configures the sandbox with two files, and may add a third:

* `sandbox.sh` at the project root, a shim that execs `node_modules/agentrite/container/sandbox.sh` with the
  project root as its first argument, after `--sandbox-only` in a sandbox-only project
* `sandbox/compose.project.yml`, holding what varies per project: the Compose project name, the image name, the egress
  allowlist, the resource limits and, for a project with Playwright, the `PLAYWRIGHT_VERSION` build argument
* `sandbox/Dockerfile`, which the project may add for software it needs in the sandbox, such as a JDK, and which
  the wrapper builds on the kit's image. `init` and `refresh` do not write it. See "Adding software to the sandbox"

What a run does, besides what the sections below say:

* A unit run, or a run with `--in-place`, builds the image on first use and opens a shell in the container. A command
  appended to it runs instead of the shell, as in `./sandbox.sh 0029 claude` and `./sandbox.sh --in-place npm test`
* `./sandbox.sh --in-place --rebuild` builds the image again before running

## Running a unit

```sh
./sandbox.sh 0029 claude
./sandbox.sh feature-0029-sandbox-clone-of-the-branch claude
```

A unit run mounts a clone of the unit's branch at `/work`, not the developer's checkout. It is for the planner, the
implementer and the reviewer. Specifying is done on the host, on the default branch: the specifier commits the unit's
spec and record there, and the human approves them there.

The unit is a local branch, named in one of two ways:

* By its name
* By a number that its name holds as a whole number: `0029` names `feature-0029-sandbox-clone-of-the-branch`, and
  `29` and `002` name nothing

When a number names no branch, the wrapper cuts one from the default branch, which the first unit run of a unit
does. The default branch is the local branch that `defaultBranch` names in `agentrite.json`:

1. The wrapper reads the `agentrite.json` of the checkout the command is run from, as it is in the working tree, on
   whatever branch that checkout is and whether or not the file is committed. It is not the clone's
2. It looks at `changes/` as the default branch holds it, and takes the one unit there whose directory opens with
   that number and a dash
3. The branch is cut from the default branch. Its name is `feature`, `bugfix` or `task`, by the `kind` in the unit's
   record on the default branch, then a dash and the directory's name
4. The wrapper says what it cut, from which branch and commit and for which unit, before it builds an image or
   starts a container

A run that cuts no branch, a unit whose branch exists, `--in-place` or `--workdir`, reads only `bell` and
`harnesses` of `agentrite.json`, as "The bell" and "Holding a harness version" say, and judges no other key.
`--connect` reads none of it.

Before the container starts, the wrapper clones the repository, with that branch checked out at the commit the
host's branch is at:

* The clone holds what is committed and nothing else. Uncommitted work, ignored files such as a `.env`, and
  `node_modules` stay on the host. Without `node_modules` the role files under it are not found, the suite does not
  run, and the change check refuses too, since the files that `agentrite.json` names under `node_modules` are not
  there. So a new clone that holds a `package-lock.json` has its dependencies installed with `npm ci` in the
  container, as the agent and after the firewall, before the command or the shell starts:
    * The wrapper's standard error says first that the dependencies are being installed, and what npm prints, on its
      standard output and its standard error alike, is on standard error too. The standard output of the run is the
      command's own
    * An install that fails starts no command. The work is brought back as after any run, and the wrapper exits with
      npm's status. See "When something goes wrong"
    * A clone without a `package-lock.json` is not installed, and nothing is said of an install
    * A clone that an earlier run left is resumed as it is and not installed, and neither is the tree of `--in-place`
      or `--workdir`, nor a command of `--connect`
* A project's own role or standards file, named in `agentrite.json`, is in the clone only when it is committed
* The host's other branches are in the clone as `origin/*`. The default branch is among them, as
  `origin/<default branch>`, which is the base the change check compares with
* The change check inside the clone reads the clone's own `agentrite.json`, which is the one committed on the unit's
  branch. So the file is committed: with none in the clone, the check refuses there
* The host's `.reviews` directory is mounted at `/work/.reviews`, so what the reviewer writes there is on the host
  as it is written
* The host's `.orchestrator` directory is mounted at `/work/.orchestrator`, whatever `orchestrator` in
  `agentrite.json` holds, so the runs of the orchestrator are on the host as they are written. The wrapper makes the
  directory on the host, and its mount point in the clone, as the developer before the container starts, as it does
  for `.reviews`
* The image, the allowlist, the limits and the harness versions are those of the checkout the command is run
  from, on whatever branch that is, and not those of the clone. A unit that changes `sandbox/compose.project.yml`
  runs without its own change until that is checked out on the host
* Where the clone is on the host is in "Where things are kept on the host"

Several runs:

* Two units run side by side, each on its own clone, in its own container, and each container has the full memory
  and CPU limits of the project's compose file
* Two runs never work on one branch: the container is named after the Compose project and the branch. See "Two
  agents on one unit"
* Two checkouts of one project on one host share a branch's clone
* A unit's variants run beside the unit's run and beside each other, each on a branch of its own. See "Two
  implementations of one unit"

Every command in the sandbox, of a unit run, of `--in-place`, of `--workdir` and of `--connect`, has the `TERM` and the
`COLORTERM` of the terminal the wrapper was run from, so a harness draws in the colours it draws in there on the host.
Run from a shell without a `TERM`, as a script may be, the command has the `TERM` Docker gives a command: `xterm` on a
terminal, and none without one. A `TERM` that the image holds no description of, as that of a terminal named after its
own program may be, is `xterm-256color` in the sandbox, with the host's `COLORTERM` beside it. `echo $TERM` in the
sandbox shows which it is.

The orchestrator, which takes a unit through its roles, runs in a unit run as any command does, and passes
`--skip-permissions` to every step. See "The orchestrator" of `ORCHESTRATOR.md`:

```sh
./sandbox.sh 0029 npx agentrite orchestrate 0029 --skip-permissions
```

From the shell of a unit run, it is `npx agentrite orchestrate 0029 --skip-permissions`.

`--follow` is given to the command in a unit run as on the host, to print each step's messages and tool calls while
it runs:

```sh
./sandbox.sh 0029 npx agentrite orchestrate 0029 --skip-permissions --follow
```

A run that stopped for the human is resumed in a unit run on the same branch, once the human has done what it
stopped for, with `--resume`, and with the human's words to the step it reruns in `--prompt`:

```sh
./sandbox.sh 0029 npx agentrite orchestrate 0029 --resume --skip-permissions --prompt "Take the second reading of R2."
```

For a unit run that starts nothing, see "When something goes wrong".

## Running on a branch without the change process

```sh
./sandbox.sh docs-rewrite claude
./sandbox.sh --connect docs-rewrite
```

A sandbox-only project uses the sandbox without the change process in `changes/`, the roles or the orchestrator. It
is set up with `npx agentrite init --sandbox-only` and the harnesses it uses, as in
`npx agentrite init --sandbox-only claude`, as "Installing it into a project" in [`SETUP.md`](SETUP.md) says, and its
`agentrite.json` holds `"process": false`. Its shim tells the sandbox so, and a run there is given a branch rather than
a unit:

* The local branch of that exact name is run on a clone, as a unit run is. Only local branches are looked at
* A name that is no local branch gets a branch of that name first, cut from the head of the local default branch that
  `defaultBranch` names in `agentrite.json`. The wrapper says what it cut, from which branch and at which commit,
  before it builds an image or starts a container. Nothing of `changes/` is read and no name is matched as a number:
  `0029` is cut as a branch named `0029`
* A name that git takes for no branch cuts nothing and starts nothing. See "When something goes wrong"
* A command given without saying what to mount is taken for a branch's name, so `./sandbox.sh claude` cuts a branch
  `claude`. The wrapper names the branch when it cuts it, and `git branch -d claude` removes it
* The clone is made, brought back, kept and resumed as a unit run's is, as "Getting the work back" says, and two runs
  never work on one branch, since the container is named after the Compose project and the branch
* Neither `.reviews` nor `.orchestrator` is mounted in the clone or made in the project root: both are the change
  process's
* `--connect BRANCH` runs a command beside the run of that branch, as "Two agents on one unit" says for a unit. It
  cuts no branch
* There are no variants. Two runs beside each other are given two branches
* `--in-place` and `--workdir` run as they do with the process, as "Running on the tree as it is" says
* No commit message is checked, as "Commit messages" says

A project that changes `process` in `agentrite.json` runs `npx agentrite refresh`, which rewrites `sandbox.sh` for the
other mode, as "The project's settings" in `SETUP.md` says. Until then the sandbox runs as the shim it has.

## Getting the work back

When the container exits, whatever its exit code, the wrapper brings the work back:

1. It fetches the clone's branch into the host's repository as `sandbox/<branch>`. Only that branch is fetched
2. It fast-forwards the host's branch to it, whether or not that branch is checked out, and removes
   `sandbox/<branch>`. When the host's branch cannot be fast-forwarded, the commits wait at `sandbox/<branch>`
3. It removes the clone when nothing in it would be lost. A clone that holds a file that is not committed, apart
   from ignored files, or a commit on another branch or in a stash, is kept, and the wrapper says where it is and
   what it holds

A clone that was kept is resumed by the same command, as it is: it is not updated from the host's branch. How a
clone is discarded is in "Where things are kept on the host".

For commits that wait, a crash during a unit run and a removal that fails, see "When something goes wrong".

## Two agents on one unit

```sh
./sandbox.sh --connect <unit> [COMMAND...]
```

A second command is run beside the first command of a unit run with `--connect`, from another terminal on the host.
It runs the command in the container of the run that is under way for the unit, beside what runs there, and with no
command it opens the shell a unit run opens. That is how two harnesses work on one unit at the same time, such as the
implementer in one and the reviewer in the other. In one terminal:

```sh
./sandbox.sh 0029 claude
```

And in another, while that runs:

```sh
./sandbox.sh --connect 0029 opencode
```

* The unit is given as a unit run takes it: by its branch's name, or by a number that one local branch's name
  holds. It names the container that the unit run of that branch named
* The connected command is in that container, not in one like it. It has the same `/work`, the same home and the
  same processes, and the firewall and the egress proxy stand between it and the network as they do for the first
  command
* It runs as the agent, as the first command does: the same user and groups, no capability and no way to gain one,
  `HOME`, `USER`, `LOGNAME` and `PATH` as the first command has them, and `/work` as its working directory. Its
  `TERM` and `COLORTERM` are those of the terminal `--connect` was run from, and not the first command's: one that
  its shell lacks is not taken from the first command
* It is given a terminal when `--connect` is run from one, and none when it is not, so a script can connect a
  command and give it its input. The wrapper exits with the status the command exited with
* Any number of commands may be connected to one run at a time. Two harnesses in one clone write the same files and
  commit on the same branch, and keeping them out of each other's way is the developer's, as it is with two
  terminals on the host

The first command owns the container, so end the first shell last:

* When the first command ends, the container stops, every connected command ends with it, and the wrapper of the
  unit run brings the work back, as "Getting the work back" says. The wrapper of a connected command then prints
  nothing and exits with 137
* A session of a harness in a connected shell that had not saved what it held is lost with the container. A commit
  is not: whatever was committed in the clone is brought back, and a file that was not committed keeps the clone
* A connected command that ends changes nothing for the first command or for another connected command

Only a unit run can be connected to. A run with `--in-place` or `--workdir` has a container whose name Compose made
up, and no unit to give.

For a `--connect` that runs nothing, see "When something goes wrong".

## Two implementations of one unit

```sh
./sandbox.sh <unit> --variant <name> [COMMAND...]
```

A variant is a second run of a unit, with its own clone, its own container and its own branch, so that two models can
implement one unit, each on its own, and the results can be laid side by side. `--connect` is not that: it puts two
agents on one tree. In two terminals, with another `--model` in each:

```sh
./sandbox.sh 0029 --variant opus npx agentrite run implementer claude 0029 --model <id>
./sandbox.sh 0029 --variant gpt-6-1 npx agentrite run implementer opencode 0029 --model <id>
```

Each clone is new and holds no `node_modules`, so each has its dependencies installed before its command, as "Running
a unit" says.

* `--variant` is optional. Without it a unit run is as "Running a unit" says. It is given before the unit or right
  after it, and it is refused together with `--in-place` and `--workdir`, which have no unit, and when it is given
  twice
* A variant's name is one or more words of the lowercase letters `a` to `z` and the digits `0` to `9`, joined by
  single hyphens, as `opus` or `gpt-6-1`. A name of another form is refused before anything is started
* The variant works on the branch that is the unit's branch, two hyphens and the name, as
  `feature-0029-sandbox-clone-of-the-branch--opus`. It is a unit run of that branch, and everything "Running a unit"
  and "Getting the work back" say of a unit run holds for it
* When that branch does not exist, the wrapper cuts it from the host's branch of the unit, at the commit that branch
  is at, and says what it cut and from which commit before it builds an image or starts a container. A unit with no
  branch gets its branch cut first, from the default branch, and then the variant's. Commits of a unit run that is
  under way and has not been brought back to the host are in its clone and not in the variant. When the branch
  exists, the run works on it as it is, and nothing of the unit's branch is taken into it
* A variant runs while the unit's run, or another variant, runs, and while none does. Any number may run at a time.
  Starting, running and ending one stops nothing in another container, writes nothing in another clone and moves no
  other branch
* A variant's commits are brought back to the variant's branch and to no other. The unit's branch and the other
  variants' are as they were
* Two runs of one variant are refused as two unit runs of one branch are, and the message names `--connect`
* A number names the unit's branch alone, whatever variants the unit has. A variant is named afterwards by its unit
  and its name, as in `./sandbox.sh --connect 0029 --variant opus`, or by its branch's full name, as in
  `./sandbox.sh feature-0029-sandbox-clone-of-the-branch--opus`. `--variant` is not given with a branch that is
  a variant's already
* `--connect` with `--variant` runs the command in the variant's container, and without it in the unit run's

The reviews are kept apart by the name of their file in `.reviews/<unit-directory>/`, which the runs share: a
reviewer on a variant saves its findings in a file whose name ends in `--<name>.md`, and on the unit's branch in a file
whose name holds no `--`. An implementer takes findings only from the files of its own run. The roles read the variant
from the branch they are on.

The runs of the orchestrator are kept apart in the same way, by the name of their directory in
`.orchestrator/<unit-directory>/`: the directory of a run on a variant's branch ends in `--<name>`, as
`2026-10-21T10:00:00Z--opus`, and that of a run on the unit's branch is the instant alone. Two variants that start in
the same second each get a directory. `npx agentrite runs` shows the variant of each run.

To compare two results and take one, use git. Compare with `git diff <unit's branch> <variant's branch>`, or of two
variants' branches. Take one by merging its branch into the unit's branch with `git merge`, or by moving the unit's
branch to it with `git branch --force <unit's branch> <variant's branch>` while the unit's branch is not checked out.
A variant that is not taken is a branch to delete, with `git branch --delete --force`, and its clone with `rm -rf` of
its directory when one was kept, as "Where things are kept on the host" says.

## Running on the tree as it is

```sh
./sandbox.sh --workdir /path/to/other/clone
./sandbox.sh --in-place --mount ~/reference:ro --mount ~/scratch
```

* In place, with `--in-place`, the sandbox mounts the project at `/work` as it is on the host, `node_modules`
  included
* `--workdir DIR` mounts `DIR` at `/work`, as it is, in place of a clone or the project root. The container works on
  a full checkout on a branch, not a `git worktree`: a worktree's `.git` points at an absolute path on the host that
  does not resolve inside the container. To isolate the work further, run the unit on a clone, which makes the clone
  and brings its commits back. See "Running a unit"
* `--mount HOST` mounts a host directory at `/mnt/<basename>`, read-write, and `--mount HOST:ro` mounts it
  read-only. The option may be repeated

In a run with `--in-place` or `--workdir`, the host and the sandbox share one `node_modules`: an install on either
side writes into the same directory. A unit run has a clone with a `node_modules` of its own, which the host never
installs into. For what an install on the other side changes, see "When something goes wrong".

## Commit messages

A commit in the sandbox whose message holds a trailer the standards forbid, `Co-Authored-By` or `Claude-Session`, is
refused, and git makes no commit. `git commit` prints each offending line and what to do, and exits 1:

```
line 3: Co-Authored-By: Claude <noreply@anthropic.com>
The standards forbid the trailers Co-Authored-By and Claude-Session, so remove these lines and make the commit again.
```

The same commit without those lines is made. It is the rule of the project's own `commit-msg` hook on the host, run
by the same checker, as "Git hooks" in [`SETUP.md`](SETUP.md) says.

* The hook is the image's, and not the clone's: git in the container runs the hooks of a directory in the image,
  which the agent cannot write. It holds in a unit run, with `--in-place`, `--workdir` and `--mount`, and in a command
  of `--connect`, and in a unit run's clone before `npm ci`, since nothing of the project is needed for it
* Git in the container runs the image's hooks only. The hooks of a repository mounted with `--in-place` or
  `--workdir`, and those of a hooks directory that its configuration names, as `npm ci` may set in a clone, are not
  run there. A project runs its own checks in the sandbox as commands
* In a sandbox-only project no commit message is checked: git in the container runs the hooks of an empty directory of
  the image, so a message with those trailers is committed. The hooks of a mounted repository, and of a hooks
  directory its configuration names, are not run there either
* The image holds the hook of the kit it was built from. The first start after an update of the kit builds the image
  again, and the wrapper says so before it builds:

  ```
  sandbox.sh: the image was built from the kit 8.0.0 and 8.1.0 is installed. Rebuilding.
  ```

## Logging in

A harness is logged in to its model provider from the sandbox's shell, and the login is kept:

* Claude Code is logged in once per home volume
* OpenCode is logged in once per log directory, so a new home volume of the project needs no new login of OpenCode
* Codex is logged in once per log directory too. With a ChatGPT account, log in with a device code, which needs no
  browser to reach the sandbox: run `codex login --device-auth`, open the address it prints on the host and enter the
  code there. With an API key, run `codex login --with-api-key`, which reads the key from its standard input: paste
  the key, press Enter and then Ctrl-D

Codex loads the project's `.codex/config.toml` and `.codex/agents/` in every run of the sandbox, `--in-place`,
`--workdir` and a unit run alike, with no need to mark the project trusted: the kit's configuration of Codex in the
sandbox trusts `/work`. It also turns Codex's check for an update off, and neither the project nor the home can turn
it back on.

Where each harness keeps its login is in "Where things are kept on the host". For a login that cannot complete, and
for a login or a prompt that fails, see "When something goes wrong".

## Reaching more hosts

The sandbox's egress is bounded by hostname. What leaves the container is:

* DNS to its resolvers
* the local model server's host and port. See "The local model server"
* HTTPS on port 443 to the allowlisted hosts

Everything else is denied, whatever its port or address.

The allowlist is two lists together. Both are checked the same way, and a host in both is admitted once.

`KIT_ALLOWLIST`, in the kit's `container/compose.yml`, holds the hosts the kit itself needs: its own host, and the
hosts of each harness the project's `agentrite.json` names under `harnesses`, which the wrapper adds at each start.
They need no listing in a project, and a kit release that needs another host adds it, with no change to any project.
A harness's hosts are admitted only in a project that names that harness:

| Host                  | Admitted                 | What it is for                                                      |
|-----------------------|--------------------------|---------------------------------------------------------------------|
| The npm registry      | Always                   | The probe host, and `npm ci` and `npm install` inside the container |
| `api.anthropic.com`   | When it names `claude`   | The API Claude Code uses                                            |
| `platform.claude.com` | When it names `claude`   | Claude Code contacts it at start-up when it holds no saved login    |
| `models.opencode.ai`  | When it names `opencode` | OpenCode fetches its model catalog from it                          |
| `auth.openai.com`     | When it names `opencode` | OpenCode logged in with a ChatGPT account signs in there            |
| `chatgpt.com`         | When it names `opencode` | OpenCode logged in with a ChatGPT account sends its prompts there   |
| `api.openai.com`      | When it names `codex`    | Codex logged in with an API key sends its prompts there             |
| `chatgpt.com`         | When it names `codex`    | Codex logged in with a ChatGPT account sends its prompts there      |
| `auth.openai.com`     | When it names `codex`    | Codex logs in with a ChatGPT account there, by a device code too    |

A project's `sandbox/compose.project.yml` does not set `KIT_ALLOWLIST`, nor the build arguments `HARNESS_PACKAGES`,
`HARNESS_RECORD` and `HARNESS_DIRECTORIES`, which are the kit's to set, and a start refuses a file that sets one.

`ALLOWLIST`, in the project's `sandbox/compose.project.yml`, holds what the project needs besides, and may be empty
or left out. Add the API host of any other model provider the project's agents use, and whatever its tools and
tests reach. A provider's login may need further hosts. See "When something goes wrong".

* Allowlist entries are hostnames, matched exactly. A subdomain needs its own entry
* Plain HTTP is refused, also to an allowlisted host, and so is TLS on any port but 443

For a connection that is refused, and for a sandbox that the entrypoint refuses to start, see "When something goes
wrong".

## Holding a harness version

```yaml
services:
  sandbox:
    build:
      args:
        CLAUDE_CODE_VERSION: 2.1.288
        OPENCODE_VERSION: 1.18.33
        CODEX_VERSION: 0.167.0
```

A project holds a version by adding the build argument to its `sandbox/compose.project.yml`, for any of its
harnesses. Give an exact version. The argument of a harness the project does not name is ignored.

The image holds the harnesses the project's `agentrite.json` names under `harnesses`, and no other: of Claude Code,
OpenCode and Codex, any one or more. A harness the project does not name is not in the sandbox, and its command is not
found there. For each harness on its own, the version is the first of these that exists:

1. the version the project's `sandbox/compose.project.yml` gives
2. the version installed on the host

With neither of the two, the image gets the latest published version at the time it is built.

The host's version:

* It is what `claude --version`, `opencode --version` and `codex --version` print, for the command on the `PATH` of
  whoever runs `./sandbox.sh`. Of what Codex prints, as `codex-cli 0.167.0`, the version is the word after
  `codex-cli`. Only the harnesses the project names are asked
* A harness that is not there, or that is reached only through a shell alias, counts as not installed
* So does one whose command is there and prints no version, and the wrapper says so at each start

A newer version:

* At each start the wrapper compares the versions it wants with those the image was built with, which the image
  holds in one label, `com.ritenoar.agentrite.harnesses`, as words such as `claude@2.1.288 opencode@1.18.33`, and
  builds the image again by itself when they differ, saying which harness and why. So no flag is needed after a
  harness is updated on the host
* A harness with neither source has the latest published version. The sandbox keeps that version until the image is
  built again, whatever is published in the meantime. `./sandbox.sh --in-place --rebuild` builds it again, and is how
  such a sandbox gets a newer one. A build for another reason, such as an update of another harness on the host,
  brings the latest too

Another set of harnesses:

* `agentrite.json` is read at each start. When the harnesses the image holds are not those it names, a harness
  added or one taken away, the wrapper builds the image again at the next start, saying which harnesses the image
  holds and which the file names, as in `the image holds the harnesses claude and opencode, and agentrite.json names
  claude`
* The new image holds the harnesses the file names, and the allowlist and the mounts of a run are theirs alone. A
  harness taken away keeps its sessions and its login in the project's log directory, where a later image that holds
  it finds them again

To see what an image holds, read its labels, where `<image>` is as "Where things are kept on the host" has it, or
ask the harness in the sandbox:

```sh
docker image inspect --format '{{ json .Config.Labels }}' <image>
./sandbox.sh --in-place claude --version
```

The image is per machine. Two developers on one project run what their own hosts have, until the project holds a
version. The versions and the image are worked out from the checkout the command is run from, also for a unit run.
See "Running a unit".

For a build that fails, and for a version of a harness that breaks something, see "When something goes wrong".

## Adding software to the sandbox

```dockerfile
ARG AGENTRITE_IMAGE
FROM ${AGENTRITE_IMAGE}

ARG TARGETARCH
RUN apt-get update \
    && apt-get install -y --no-install-recommends openjdk-17-jdk-headless \
    && rm -rf /var/lib/apt/lists/*
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-${TARGETARCH}
```

A project adds software to the sandbox's image with a Dockerfile of its own, at `sandbox/Dockerfile`. It opens with
these two lines:

```dockerfile
ARG AGENTRITE_IMAGE
FROM ${AGENTRITE_IMAGE}
```

The kit gives `AGENTRITE_IMAGE` the name of its own image, so the file is built on the kit's image. What the file
runs, it runs as root, and the project root is its context, as it is for the kit's own Dockerfile. A project without
the file runs the kit's image as it is.

The example above installs a JDK from the Debian packages of the image, which is Debian bookworm, and sets
`JAVA_HOME`. `TARGETARCH` is `amd64` or `arm64`, as the machine is, so the path holds on both.

The file must not change the entrypoint, the command, the user or the working directory that the kit's image sets,
with `ENTRYPOINT`, `CMD`, `USER` or `WORKDIR`. The kit's entrypoint is what installs the firewall and drops to the
agent. At every start with the file, the wrapper compares the image with the kit's, and refuses to start an image
that changes one of them.

The build runs on the host, with the host's network, outside the sandbox's firewall, as the build of the kit's image
does.

The file is committed with the project. The image is built from the file of the checkout the command is run from,
also for a unit run. So a change to it that an agent made in a unit run's clone reaches the image only once the
developer has it in that checkout. See "Running a unit".

The image is built anew at a start:

* when the content of `sandbox/Dockerfile` is not the content the image was built from, which the image records as
  a label, and when the file was added or removed since the image was built. The wrapper says so
* whenever the kit's image is built, for a reason in "Holding a harness version", for an update of the kit as
  "Commit messages" says, or because there is none. The project's file is then built on it in the same start
* with `--rebuild`, which builds both

Otherwise a start builds nothing, and needs no network.

A tool the file adds that downloads at run time, such as a build tool that fetches dependencies, needs its hosts in
the project's `ALLOWLIST`. See "Reaching more hosts".

What the file must not do besides, with what goes wrong and what to do instead:

* Install into `/home/agent` or `/work`. Both are mounted over at run time, so what the file put there is hidden,
  or, in the home, seen only in a home volume made after the build. Install under `/usr/local` or `/opt`
* Leave a tool to write outside the agent's home, `/work` and `/tmp` at run time. The root filesystem is read-only
  then, and the tool fails when it writes elsewhere. Point its cache and its settings into the home or `/tmp`, as
  with an environment variable the tool reads
* Install or upgrade Claude Code or OpenCode. The image then holds another version than the kit takes it to hold.
  Hold a version as "Holding a harness version" says, and name a harness in `agentrite.json` to have it installed
* Set `PLAYWRIGHT_BROWSERS_PATH`, which the kit's image sets to where the browser tests find the browser. Setting it
  anew changes how the browser tests behave. Leave it as the kit's image sets it. The variables that keep the
  harnesses from updating themselves, `DISABLE_AUTOUPDATER` and `DISABLE_UPDATES` for Claude Code and
  `OPENCODE_CONFIG` for OpenCode, are given to every run, and stand above what the file sets

For a build of the file that fails, see "When something goes wrong".

## The status line

A developer's own Claude Code status line is shown in the sandbox of a project that names `claude`. When
`~/.claude/statusline-command.sh` is a file on the host that can be read as the sandbox starts, the wrapper mounts it
read-only at `/etc/claude-code/statusline-command.sh`, together with the kit's
`container/harnesses/claude/managed-settings.json` at `/etc/claude-code/managed-settings.json`, whose one setting
runs the script with `bash`. With no such file on the host, neither is mounted.

* That script is the only file under the host's `~/.claude` the sandbox can read, and the agent cannot change it.
  The credentials, the settings and the history stay on the host, apart from the number of "How long Claude Code's
  sessions are kept", which the wrapper reads on the host and gives the sandbox alone
* The script runs in the sandbox, so the tools it calls must be in the image, which has `jq` and `git`
* Managed settings stand above Claude Code's other settings, so while the host file exists it replaces a status line
  set inside the sandbox, in the home volume's `~/.claude/settings.json`
* A script under another name is reached with a symbolic link at `~/.claude/statusline-command.sh`
* It is mounted at each start, so a start picks up the script and a change to it with no rebuild, and nothing is
  written to the home volume
* OpenCode has no such status line, and nothing is mounted for it
* When the developer's organization delivers managed settings from the claude.ai console, Claude Code by default
  uses those and ignores the file, so the status line is then whatever that policy gives

## The bell

The harnesses in the sandbox ring the terminal's bell when they need the developer or stop:

* Claude Code at each `Notification`, when it asks for a permission or waits for input, and at each `Stop`, when it
  ends a turn
* OpenCode each time a session goes idle and each time it asks for a permission
* Codex each time it ends a turn

It rings in every project whose `agentrite.json` holds `"bell": true`, which the file `init` and `config` write
holds. Nothing is set in the home volume or on the host: the wrapper mounts the kit's `container/bell/ring-bell.sh`
read-only at each start, and for each harness the project names its file of `container/harnesses/<name>/`, Claude
Code's hooks as managed settings, OpenCode's plugin named in its configuration and Codex's `notify` command in its
system configuration, `/etc/codex/config.toml`. With `"bell": false` that file is not mounted. A `notify` the project's
`.codex/config.toml` or the home sets stands above the kit's, and Codex then runs that one instead.

* The bell is the one byte BEL, written to the session's terminal. It comes out on the terminal the sandbox was
  started from, and through it tmux, which marks the window whose pane rang
* The host's own hooks, plugins and settings of a bell do not hold in the sandbox, which reads none of the host's
  settings but the number of "How long Claude Code's sessions are kept". A hook that calls `tmux` cannot work there
  either, since tmux runs on the host
* A bell the developer sets in the home volume rings besides, and is not removed
* A run with no terminal, such as `agentrite run --headless` started by a script, rings nothing
* When the developer's organization delivers managed settings from the claude.ai console, Claude Code may ignore
  the kit's, as it does for the status line, and then rings as that policy says

To turn it off, a project sets `"bell": false` in its `agentrite.json`. The file is read at each start, so the
change holds from the next start, with no rebuild. A developer who wants no bell in a project that rings mutes it in
their terminal or in tmux.

## The local model server

The sandbox reaches one host and port outside the allowlist: `MODEL_SERVER_HOST` on `MODEL_SERVER_PORT`, which
`container/compose.yml` sets to `host.docker.internal` and `11434`, and nothing else on the host.

For a model that the container cannot reach, see "When something goes wrong".

## Where things are kept on the host

What the sandbox keeps on the host, where it is and how it is removed:

| What              | Where it is                                           | How it is removed                       |
|-------------------|-------------------------------------------------------|-----------------------------------------|
| The clone         | `~/.local/state/agentrite/<Compose project>/<branch>` | `rm -rf` of its directory               |
| The log directory | `<data>/agentrite/<name>`                             | `rm -rf` of the directory               |
| The home volume   | `<project>_agent-home`                                | `docker volume rm <project>_agent-home` |
| The image         | `<image>`                                             | `docker image rm <image>`               |
| The kit's image   | `<image>-base`                                        | `docker image rm <image>-base`          |

**The clone of a unit run**

The clone of the unit's branch that a unit run mounts at `/work`. It is under `$XDG_STATE_HOME` when that is set.
What it holds is in "Running a unit". A variant's clone is kept as a unit run's is, at its branch's name, as in
`~/.local/state/agentrite/<Compose project>/feature-0029-sandbox-clone-of-the-branch--opus`.

A run on a branch in a sandbox-only project keeps its clone as a unit run's is, at the branch's name. A unit run makes
`.reviews` and `.orchestrator` in the project root, as "Running a unit" says, and a sandbox-only project's root gets
neither.

To discard a clone, remove its directory with `rm -rf`. When the wrapper removes it itself is in "Getting the work
back".

**The project's log directory**

Claude Code, OpenCode and Codex each keep a log of every session on disk: what was asked, what was answered and how many
tokens it took. In the sandbox those logs are on the host and not in the home volume. In every run, whatever is
mounted at `/work`, the wrapper mounts a directory of the host over each directory in the agent's home that holds
the logs of a harness the project names.

Every run of one project root uses that directory: a unit run of any branch, `--in-place` and `--workdir` alike.
The wrapper makes it, with the directories of the project's harnesses in it, as the developer, before the container
starts.

`<logs>` is the project's log directory, `<data>/agentrite/<name>`:

* `<data>` is `$XDG_DATA_HOME` when that is set and `~/.local/share` when it is not
* `<name>` is the name of the project root's directory, so a project at `~/projects/norareit` has
  `~/.local/share/agentrite/norareit/`

It holds, of each harness the project names or named before:

* `<logs>/.claude/projects`, mounted at `/home/agent/.claude/projects`: Claude Code's sessions. A sandboxed session
  is started in `/work`, so Claude Code's sessions are under `.claude/projects/-work`
* `<logs>/.local/share/opencode`, mounted at `/home/agent/.local/share/opencode`: OpenCode's data: its database,
  its login. OpenCode's login is `<logs>/.local/share/opencode/auth.json`, a file of the host
* `<logs>/.codex`, mounted at `/home/agent/.codex`: the whole of Codex's home: its login, its configuration, its
  sessions, the SQLite files that index them, which resuming a session needs, and its logs. Codex's login is
  `<logs>/.codex/auth.json`, a file of the host. A session is resumed in a later container of the project, since
  both its file and its index are there
* `<logs>/claude-cleanup-period-<n>.json`, such as `claude-cleanup-period-365.json`, mounted read-only at
  `/etc/claude-code/managed-settings.d/agentrite-cleanup-period.json`: the number `<n>` of "How long Claude Code's
  sessions are kept", alone. The wrapper writes the file of a number at a start when the host holds that number
  and the file is not there yet, and changes or removes none, so one is left for each number the host has held

The directories have the places they have in a home, so a tool on the host that reads the harnesses' logs is
given that one path and reads them there. What a harness writes belongs to the developer on the host, who reads it
like any other file of theirs, without Docker.

With no sandbox of the project running, remove the directory with `rm -rf`. The sessions of the harnesses, the logins
of OpenCode and Codex and the files of the numbers go with it. The next run makes the directory again, empty.

**How long Claude Code's sessions are kept**

Claude Code in the sandbox removes its sessions older than `cleanupPeriodDays`, by default 30 days, each time it
starts. The wrapper takes the number from the host's `~/.claude/settings.json` at each start, and from no other file
of the host, so a value in the host's project or local settings, or in a file under `CLAUDE_CONFIG_DIR`, is not
taken. To keep the sessions of every sandboxed project for a year, the host's `~/.claude/settings.json` holds,
beside what it already holds:

```json
{
  "cleanupPeriodDays": 365
}
```

* Only the number reaches the sandbox, and nothing else of the file. It is given to Claude Code as managed
  settings, so it stands above a `cleanupPeriodDays` set in the home volume's `~/.claude/settings.json`, and the
  agent cannot change it
* With no number on the host, because there is no such file or it holds no `cleanupPeriodDays`, the sandbox keeps
  Claude Code's default of 30 days, or the value set in the home volume
* A change on the host holds from the next start, with no rebuild. A shell connected with `--connect` has the number
  of the run it joins
* A number made smaller removes, at the next start, the sessions older than it. Sessions removed earlier do not come
  back when it is made larger
* The start is refused when the host's file cannot be read, is not a JSON object, or holds a `cleanupPeriodDays`
  that is not a whole number of 1 or more, such as `0`, `1.5`, `-1` or `"365"`
* When the developer's organization delivers managed settings from the claude.ai console, Claude Code may ignore the
  number, as it does the status line, and then keeps sessions as that policy says
* OpenCode's and Codex's sessions are not affected

**The home volume**

The agent's home, `/home/agent`, is a named volume in `container/compose.yml`, which survives a container.

`<project>` is not the repository's name but the Compose project's, the `name:` key in the project's own
`sandbox/compose.project.yml`. `docker volume ls` shows the exact name.

It holds:

* Claude Code's login and settings, which are beside its projects directory and not in it
* whatever else a harness keeps in its home
* the npm cache
* the records of the runs of the orchestrator made in a unit run, in `~/.local/state/agentrite/.orchestrator-runs`,
  which a resume of such a run takes, as "What .orchestrator holds" of `ORCHESTRATOR.md` says

The directories of the harnesses' logs in the home are not of the volume: the harnesses' sessions, and with them
the logins of OpenCode and Codex, are in the project's log directory on the host.

```sh
docker volume ls
docker volume rm <project>_agent-home
```

Removing the volume discards the harnesses' saved logins, such as Claude Code's, and the records of the orchestrator's
runs, so it leaves no run that stopped in the sandbox before it to resume. The next start creates a new volume owned
by the agent.

**The image**

What the wrapper builds for the project's sandbox. `<image>` is the `image:` of the project's
`sandbox/compose.project.yml`. It holds the harnesses the project's `agentrite.json` names. For which versions, and
what a change of `harnesses` does, see "Holding a harness version".

```sh
docker image rm <image>
```

The next start builds the image again. Each rebuild leaves the image it replaced behind, untagged, at about 0.6 GB.
`docker image prune` removes them.

**The kit's image**

A project with a `sandbox/Dockerfile` has two images. `<image>` is the project's file built on the kit's image, and
the kit's image is kept beside it as `<image>-base`, the base the project's file is built on. A project without the
file has no `<image>-base`, and one that removed the file keeps the one it had until it is removed. See "Adding
software to the sandbox".

```sh
docker image rm <image>-base
```

The next start with a project's file builds it again, and the project's file on it.

## What the sandbox defends against

What it confines:

* The container's root filesystem is read-only. The agent writes the working directory, its home volume, the
  project's log directory on the host and `/tmp`
* `/tmp` is in memory and is emptied when the container stops, and files in it can be run, so a test suite or a tool
  that runs what it writes to the temporary directory works as on the host
* Egress is bounded by hostname: HTTPS on port 443 to the allowlisted hosts, and little else. See "Reaching more
  hosts"
* Everything that confines the container is in `container/compose.yml` and `container/entrypoint.sh`

Nothing of the host is reachable but what is mounted at `/work`, with these exceptions:

| Of the host                                       | Mounted    | In `SANDBOX.md`                     |
|---------------------------------------------------|------------|-------------------------------------|
| The developer's `~/.gitconfig`                    | Read-only  |                                     |
| The developer's Claude Code status line           | Read-only  | "The status line"                   |
| The project's log directory                       | Read-write | "Where things are kept on the host" |
| The local model server's port                     |            | "The local model server"            |
| The project's `.reviews`, in a unit run only      | Read-write | "Running a unit"                    |
| The project's `.orchestrator`, in a unit run only | Read-write | "Running a unit"                    |

The `~/.gitconfig` makes commits from inside carry the same name and email as on the host.

A unit run defends the host's repository against an agent that was misled, for example by an instruction injected
through a dependency, and that writes whatever it likes under `/work`, the clone's `.git` included. Against
that agent:

* nothing it writes is run on the host by the wrapper
* nothing reaches the host's repository but the commits of the unit's branch and the files under `.reviews` and
  `.orchestrator`
* a git hook, a line in `.git/config` and a file in `node_modules` stay in the clone
* a commit in the container runs the image's `commit-msg` hook, which the agent cannot write, and not a hook of the
  clone
* the kit's commands on the host follow no link the agent made under `.orchestrator`, write under it only in the
  directory of their own run, and resume only a run made where it is resumed whose files are as that run left them
* the wrapper compares the clone's files with the branch without running any filter of git

It does not defend against:

* what a commit contains. A script in a commit runs on the host once the developer checks it out and runs it. The
  commit is in a diff the developer can read first
* what a review file says, to a human or to an agent that reads it on the host
* what a file under `.orchestrator` says, to a human, or a program other than the kit's commands, that reads it on the
  host
* a run with `--in-place` or `--workdir`, which mounts a directory as it is
* a commit made with `git commit --no-verify`, which skips the hook, or by a command that sets `core.hooksPath`
  itself
* a flaw in git's handling of a fetch from a hostile repository, or in Docker
* the saved logins. Where they are is in "Where things are kept on the host"
* what is in the project's log directory, which is one more place of the host that such an agent writes, in every
  run

The agent writes the project's log directory. It is a directory of the host that the agent writes besides `/work`,
and what is in it was written by an agent that may have been misled: it can put anything there, a false record of
usage and a link to a file elsewhere among it. So whatever reads the log directory treats what it finds as data. A
container reaches its own project's log directory and no other project's, no directory above it, and none of the
host's own `~/.claude`, OpenCode or `~/.codex` directories.

Docker's own command starts a process in a running container too, and that process is not what `--connect` gives.
`docker exec <container> bash`, with no user named, is root and holds `NET_ADMIN`, `SETUID`, `SETGID` and `KILL`,
and `NET_ADMIN` is what changing the firewall takes. `--connect` is the way to a second shell. See "Two agents on one
unit".

Egress is bounded by hostname, as "Reaching more hosts" says. It does not stop data leaving through a host that is
allowlisted, or through DNS to the permitted resolvers.

The supported usage is one developer, one host, branches made on the host, and a clone that only the wrapper and
the sandbox touch. Submodules and Git LFS are as plain `git clone` leaves them, and a push to a remote from inside
a clone does not work: its `origin` is the host's path, which the container cannot reach.

## When something goes wrong

Each failure is given by what you see, in bold, then why, then what to do.

**For a unit run, the wrapper says why and starts nothing: it refuses the unit, or cuts no branch for it.**

Why, and what to do for each:

* The unit is given by a name that no branch has, which is refused. Give the unit by the name of a branch that
  exists, which `git branch` lists, or by its number. A command that is given with no unit before it, as in
  `./sandbox.sh claude`, is taken for the unit: say what to mount first
* The unit is given by a number that names no branch, and the default branch holds no unit of that number. Specify
  the unit and commit it on the default branch first: the wrapper cuts a branch for a unit whose directory is in
  `changes/` on the default branch. Or give the number of a unit that is there
* The unit is given by such a number, and the unit's record on the default branch cannot be read or names no kind
  the kit has. Commit a `record.md` for the unit on the default branch whose frontmatter names its `kind` as
  `feature`, `bug` or `task`
* The unit is given by such a number, and the default branch that `agentrite.json` names is no local branch. Make
  the local branch, for example with `git branch main origin/main` for a default branch `main`. Or, when the name
  is not the project's default branch, correct `defaultBranch` in `agentrite.json`

**In a sandbox-only project, the wrapper says why and starts nothing: it refuses the branch, or cuts none for it.**

Why, and what to do for each:

* The name is not one git takes for a branch, such as `HEAD`, a name that opens with `-`, or one that holds a space
  or `..`. Give a name git takes, which `git check-ref-format --branch <name>` prints and a name it refuses does not
* The default branch that `agentrite.json` names is no local branch, so no branch can be cut from it. Make the local
  branch, for example with `git branch main origin/main` for a default branch `main`. Or, when the name is not the
  project's default branch, correct `defaultBranch` in `agentrite.json`
* With `--connect`, the name is no local branch, so there is no run to connect to. Give the name of the branch whose
  run is under way, which `git branch` lists

**A unit run prints that the dependencies of the clone are being installed with `npm ci`, then npm's error, starts no
command, and the wrapper exits with npm's status.**

Why: `npm ci` failed in the new clone, as it does for a `package-lock.json` that is out of step with `package.json`,
for a registry that the allowlist does not admit, or for an install script that failed.

What to do: correct what npm names on the unit's branch, commit it and run again. A clone that held no work the host
lacks was removed, so the next run makes a new clone and installs it. A clone that was kept is resumed as it is,
without an install, so run `npm ci` in its shell.

**In a unit run's clone, or in a new checkout, the change check, `npx agentrite` and `./sandbox.sh` refuse
`agentrite.json`, saying that `standards` or a role of `roles` is a path and there is no file at it.**

Why: every command that reads `agentrite.json` checks that each file it names is in the working tree. The kit's own
files are under `node_modules`, which a new checkout does not have until `npm ci` has run. A unit run's new clone has
its dependencies installed before the command, so the case is left for a clone that a run resumed, for a new
checkout, and for a clone whose install failed. A project's own role or standards file is in a clone only when it is
committed.

What to do: run `npm ci` in the clone or the checkout, for a path under `node_modules`. For a file of the project's
own, commit it on the branch the clone is of. For a path that names no file anywhere, as after a release that moved
one of the kit's files, correct the path in `agentrite.json`.

**The container, the wrapper or the host crashed during a unit run.**

Why: after a crash, the clone is still there and nothing has been fetched.

What to do: `./sandbox.sh <unit> true` resumes it, runs nothing of note and brings its commits back.

**The host's branch is left as it is, the commits wait at `sandbox/<branch>`, and the wrapper names the command
that merges them.**

Why: the host's branch moved meanwhile and cannot be fast-forwarded. The same happens when the branch is checked
out and the commits add a file where the host has an ignored one, which a fast-forward would overwrite.

What to do:

```sh
git merge sandbox/<branch>
```

**The wrapper keeps the clone and lists among its files that are not committed files the agent did not change.**

Why: git converts these files when it checks them out, as Git LFS and an end-of-line attribute make it do, so the
clone holds them as git wrote them and not as they are committed. The wrapper compares the clone's files with the
branch by their bytes as they are, without running any conversion of git, so such a file differs.

What to do: make sure that nothing else is listed, which the agent did change and which would be lost, and then
remove the clone:

```sh
rm -rf <clone>
```

**The wrapper says that the removal of a clone failed, and where the remains are: beside the clone's place, as
`.discarded-<branch>`.**

Why: the removal itself failed, for example on a directory the agent made read-only.

What to do: remove the remains by hand.

**`--connect` runs nothing, says why and exits with 1, or with 2 for an option of a run.**

Why, and what to do for each:

* The unit names no local branch, and it exits with 1. A number that no branch holds is refused although the default
  branch holds a unit of that number: a unit with no branch has no run to connect to, and only a unit run cuts the
  branch. Start a unit run of the unit first, giving the unit by its number, as in `./sandbox.sh 0029`: a branch that is
  not there yet is cut for a number and not for a name. Then connect to it while it runs
* Docker could not be asked whether the container is running, and it exits with 1. See that Docker runs and that the
  user may use it: Docker's own error is printed above the wrapper's. Then give the command again
* It is given together with `--in-place`, `--workdir`, `--mount` or `--rebuild`, which are options of a run, and it
  exits with 2. It names the option. Leave the option out: `--connect` takes the unit and a command, and nothing else

**After an install on one side of a shared `node_modules`, packages of the other side are gone, and nothing
reports it.**

On a macOS host:

* After an install in the sandbox, the host's macOS-only packages are gone. `fsevents`, which Playwright uses to
  watch files, is one. Playwright still runs without it, so the loss goes unnoticed
* After an install on the host, the sandbox's Linux-only packages are gone in the same way
* A package that ships a native binary per platform, as a bundler may, then fails on the side that did not install
  last, because the binary it finds is the other platform's

Why: in a run with `--in-place` or `--workdir`, an install on either side of the shared `node_modules` installs for
that side's platform and removes what only the other side's platform used. On a Linux host both sides are the same
platform and nothing is lost. A macOS host is the case where it matters.

What to do: `npm ci` on the side about to be used restores that side. On the host:

```sh
npm ci
```

And for the sandbox:

```sh
./sandbox.sh --in-place -- npm ci
```

Use `npm ci` rather than `npm install`. `npm install` swaps the platform-limited packages but leaves every package
that is already installed as the other side left it, including a binary that one of them set up for the other
platform.

**A login that sends the browser back to a port on `localhost` cannot complete in the sandbox.**

Why: the container publishes no port, and its firewall drops every inbound connection.

What to do: use a login that needs no callback. For OpenAI in OpenCode with a ChatGPT account, that is:

```
opencode auth login -p openai -m "ChatGPT Pro/Plus (headless)"
```

* The method's label is the one OpenCode used when this was written, and another version may name it differently
* It prints an address and a code to enter there, in any browser, and completes on its own once the code is
  accepted
* The kit admits the two hosts this login needs itself, so the project adds nothing for it. See "Reaching more
  hosts"
* A login with an API key needs `api.openai.com` in the project's `ALLOWLIST` instead

**A login or a prompt fails. A refused client fails with a TLS `unrecognized_name` alert.**

Why: the connection is to a host that is not on the allowlist, and is refused.

What to do: the refusal is in the proxy's log, `/run/egress-proxy.log`, which the agent can read:

```sh
grep 'not allowlisted' /run/egress-proxy.log
```

What a project adds to its `ALLOWLIST` is in "Reaching more hosts".

**The entrypoint refuses to start.**

Why: at start-up the entrypoint proves the boundary before it drops to the agent, and refuses to start if any check
fails. The message names the check that failed. The checks, and what to do for each:

* The canary host (`FIREWALL_CANARY`) cannot be reached on port 80. When the canary is reached, nothing a reader
  does repairs it: egress is not confined. Do not work around it, for example by naming another canary, and report
  it to whoever maintains the kit. When the message says that the canary does not resolve, see that the host has
  network and DNS
* Every allowlisted host, and the probe host (`FIREWALL_PROBE`), can be reached through the proxy. When a host is
  not reached, the message names it. See that the host machine has network. For a host of the project's
  `ALLOWLIST`, see that its name is right and that it answers HTTPS on port 443, and correct it or take it out
* The canary's hostname, presented at the probe's own address, is refused by the proxy, which shows that the check
  is on the hostname and not the address. When the canary's hostname is not refused, the same holds as when the
  canary is reached: egress is not bounded by hostname, so do not work around it, and report it

**The sandbox does not start, although an image exists.**

Why: a build that the wrapper started by itself failed, for example with no network, or a build of the project's
`sandbox/Dockerfile` failed. Docker's output names the instruction of the file that failed.

What to do: holding the versions the image already has, in the project's `sandbox/compose.project.yml`, without
committing the edit, is how to start the sandbox while a build cannot run. For the project's `sandbox/Dockerfile`,
correct the file, or remove it without committing the removal to start without it while it cannot build.

**A version of a harness breaks something.**

What you see is one of:

* the harness's own error, such as `Unable to connect`, or a feature that is missing, with the refused host in
  `/run/egress-proxy.log`
* a login method OpenCode does not know
* a blank status line
* an update attempt that fails against the read-only root and the firewall
* for a version that is not on the npm registry, a build that fails with npm's error

Why: the kit checks no version of either harness. What it promises for no version, because none is checked:

* that both harnesses start with the kit's allowlist alone
* that the login command for OpenCode in this section names a method that exists
* that the developer's status line shows through the managed settings
* that the environment variables and the configuration file a run is given do switch self-update off

What to do, in the order of least effort: add the refused host to the project's `ALLOWLIST`, or hold a version that
works in the project's `sandbox/compose.project.yml`.

**The container cannot reach the model of the local model server.**

Why: the host is a Linux host whose firewall denies incoming traffic by default, `ufw` for example.

What to do: allow the Docker bridge subnets to `MODEL_SERVER_PORT` on the host.

**Either harness continues or lists another project's sessions, a reader cannot tell the two projects' sessions
apart, and the two share one OpenCode login.**

Why: two projects whose root directories have one name share a log directory, wherever on the host they are.

What to do: renaming one of the roots ends it.

**Pasting an image into Claude Code with Ctrl+V pastes nothing, and Claude Code answers that images are pasted with
Ctrl+V.**

Why: text reaches the harness through the terminal, but an image does not. Claude Code reads an image from the
system clipboard itself, with `wl-paste` or `xclip`. The image holds neither, and the container cannot reach the
host's display, so there is no clipboard for it to read.

What to do: save the image in the directory the container works in, or in one it mounts, and name its path in the
container in the prompt, relative to the working directory for example. Dragging a file into the terminal types its
path on the host, which the container does not have, since it mounts the work at `/work`.
