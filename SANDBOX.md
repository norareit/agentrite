# The sandbox

The reference of the agent sandbox: what a run mounts, writes, refuses and leaves behind. The commands that start
it, with every argument and option, are in "Commands" of [`README.md`](README.md), and what the sandbox confines
is in "The sandbox" there.

* [Working on a clone](#working-on-a-clone)
* [Connecting to a unit run](#connecting-to-a-unit-run)
* [What a unit run defends against](#what-a-unit-run-defends-against)
* [Another working directory](#another-working-directory)
* [Extra directories](#extra-directories)
* [The shared `node_modules`](#the-shared-node_modules)
* [The home volume](#the-home-volume)
* [The harness logs](#the-harness-logs)
* [The harness versions](#the-harness-versions)
* [The status line](#the-status-line)
* [Logging in to a model provider](#logging-in-to-a-model-provider)
* [Egress](#egress)
* [The local model server](#the-local-model-server)

## Working on a clone

A unit run mounts a clone of the unit's branch at `/work`, not the developer's checkout. It is for the planner, the
implementer and the reviewer. Specifying is done on the host, on `master`: the specifier commits the unit's spec and
record there, and the human approves them there.

```sh
./agent.sh 0029 claude
./agent.sh feature-0029-sandbox-clone-of-the-branch claude
```

The unit is a local branch, named in one of two ways:

* By its name. A name that no branch has is refused
* By a number that its name holds as a whole number: `0029` names `feature-0029-sandbox-clone-of-the-branch`, and
  `29` and `002` name nothing. When a number names several branches, the wrapper lists them and asks for one by its
  name

When a number names no branch, the wrapper cuts one, which the first unit run of a unit does:

* It looks at `changes/` as `master` holds it, and takes the one unit there whose directory opens with that number
  and a dash
* The branch is cut from `master`. Its name is `feature`, `bugfix` or `task`, by the `kind` in the unit's record on
  `master`, then a dash and the directory's name
* The wrapper says what it cut, from which commit and for which unit, before it builds an image or starts a
  container
* Cutting checks nothing out and moves no branch that exists, so the host's checkout, its working tree and its
  index are as they were
* The wrapper cuts nothing, says why and starts nothing when `master` holds no unit of that number, when the unit's
  record on `master` cannot be read or names no kind the kit has, and when there is no local branch `master`

Before the container starts, the wrapper clones the repository, with that branch checked out at the commit the
host's branch is at:

* The clone holds what is committed and nothing else. Uncommitted work, ignored files such as a `.env`, and
  `node_modules` stay on the host. So the first command in a new clone is `npm ci`, without which the role files
  under `node_modules` are not found and the suite does not run
* The host's other branches are in the clone as `origin/*`, `origin/master` among them, which is the base the
  change check compares with
* The clone is at `~/.local/state/agentrite/<Compose project>/<branch>`, or under `$XDG_STATE_HOME` when that is
  set
* The host's `.reviews` directory is mounted at `/work/.reviews`, so what the reviewer writes there is on the host
  as it is written
* The image, the allowlist, the limits and the harness versions are those of the checkout the command is run
  from, on whatever branch that is, and not those of the clone. A unit that changes `agent/compose.project.yml`
  runs without its own change until that is checked out on the host

When the container exits, whatever its exit code, the wrapper brings the work back:

* It fetches the clone's branch into the host's repository as `sandbox/<branch>`. Only that branch is fetched
* It fast-forwards the host's branch to it, whether or not that branch is checked out, and removes
  `sandbox/<branch>`
* When the host's branch moved meanwhile and cannot be fast-forwarded, it is left as it is, the commits wait at
  `sandbox/<branch>`, and the wrapper names the command that merges them: `git merge sandbox/<branch>`. The same
  happens when the branch is checked out and the commits add a file where the host has an ignored one, which a
  fast-forward would overwrite
* It does neither while the container is still running, or when Docker cannot say whether it is
* It removes the clone when nothing in it would be lost. A clone that holds a file that is not committed, apart
  from ignored files, or a commit on another branch or in a stash, is kept, and the wrapper says where it is and
  what it holds
* When the removal itself fails, for example on a directory the agent made read-only, the wrapper says so and
  where the remains are, beside the clone's place as `.discarded-<branch>`, to be removed by hand

A clone that is still there:

* A clone that was kept is resumed by the same command, as it is: it is not updated from the host's branch
* After a crash of the container, the wrapper or the host, the clone is still there and nothing has been fetched.
  `./agent.sh <unit> true` resumes it, runs nothing of note and brings its commits back
* To discard a clone, remove its directory with `rm -rf`
* A new run is refused while `sandbox/<branch>` holds commits the branch does not have: merge it or delete it first

Several runs:

* Two units run side by side, each on its own clone, in its own container, and each container has the full memory
  and CPU limits of the project's compose file
* Two runs never work on one branch: the container is named after the Compose project and the branch, and a second
  run for a branch whose container is running is refused. That refusal names `--connect`
* Two checkouts of one project on one host share a branch's clone

## Connecting to a unit run

A second command is run beside the first command of a unit run with `--connect`, from another terminal on the host:

```sh
./agent.sh --connect <unit> [COMMAND...]
```

It runs the command in the container of the run that is under way for the unit, beside what runs there, and with no
command it opens the shell a unit run opens. That is how two harnesses work on one unit at the same time, such as the
implementer in one and the reviewer in the other. In one terminal:

```sh
./agent.sh 0029 claude
```

And in another, while that runs:

```sh
./agent.sh --connect 0029 opencode
```

* The unit is given as a unit run takes it: by its branch's name, or by a number that one local branch's name
  holds. It names the container that the unit run of that branch named
* The connected command is in that container, not in one like it. It has the same `/work`, the same home and the
  same processes, and the firewall and the egress proxy stand between it and the network as they do for the first
  command
* It runs as the agent, as the first command does: the same user and groups, no capability and no way to gain one,
  `HOME`, `USER`, `LOGNAME` and `PATH` as the first command has them, and `/work` as its working directory
* It is given a terminal when `--connect` is run from one, and none when it is not, so a script can connect a
  command and give it its input. The wrapper exits with the status the command exited with
* Any number of commands may be connected to one run at a time. Two harnesses in one clone write the same files and
  commit on the same branch, and keeping them out of each other's way is the developer's, as it is with two
  terminals on the host
* `--connect` starts no container and stops none, builds no image, asks npm nothing, makes no clone, cuts no branch
  and fetches nothing, and it changes nothing in the host's repository

The first command owns the container, so end the first shell last:

* When the first command ends, the container stops, every connected command ends with it, and the wrapper of the
  unit run brings the work back, as "Working on a clone" says. The wrapper of a connected command then prints
  nothing and exits with 137
* A session of a harness in a connected shell that had not saved what it held is lost with the container. A commit
  is not: whatever was committed in the clone is brought back, and a file that was not committed keeps the clone
* A connected command that ends changes nothing for the first command or for another connected command

`--connect` runs nothing, says why and exits with 2 when:

* no unit is given
* the unit names no local branch. A number that no branch holds is refused although `master` holds a unit of that
  number: a unit with no branch has no run to connect to, and only a unit run cuts the branch
* the unit names several branches, which it lists, as a unit run does
* no container of the unit's run is running. It says that no run is under way for the unit, and names the command
  that starts one
* Docker could not be asked whether the container is running
* it is given together with `--in-place`, `--workdir`, `--mount` or `--rebuild`, which are options of a run. It
  names the option
* it is run with uid or gid 0, as every form of the wrapper is

Only a unit run can be connected to. A run with `--in-place` or `--workdir` has a container whose name Compose made
up, and no unit to give.

Docker's own command starts a process in a running container too, and that process is not what `--connect` gives.
`docker exec <container> bash`, with no user named, is root and holds `NET_ADMIN`, `SETUID` and `SETGID`, and
`NET_ADMIN` is what changing the firewall takes. `--connect` is the way to a second shell.

`--connect` was shown on Linux with Docker 28.4.0. It was not shown with a harness in each of two shells, and not
on macOS.

## What a unit run defends against

A unit run defends the host's repository against an agent that was misled, for example by an instruction injected
through a dependency, and that writes whatever it likes under `/work`, the clone's `.git` included. Against that
agent:

* nothing it writes is run on the host by the wrapper
* nothing reaches the host's repository but the commits of the unit's branch and the files under `.reviews`
* a git hook, a line in `.git/config` and a file in `node_modules` stay in the clone

It does not defend against:

* what a commit contains. A script in a commit runs on the host once the developer checks it out and runs it. The
  commit is in a diff the developer can read first
* what a review file says, to a human or to an agent that reads it on the host
* a run with `--in-place` or `--workdir`, which mounts a directory as it is
* a flaw in git's handling of a fetch from a hostile repository, or in Docker
* the saved logins, which are Claude Code's in the home volume and OpenCode's in the project's log directory, and
  data leaving through an allowlisted host or through DNS
* what is in the project's log directory, which is one more place of the host that such an agent writes, in every
  run. See "The harness logs"

The supported usage is one developer, one host, branches made on the host, and a clone that only the wrapper and
the sandbox touch. Submodules and Git LFS are as plain `git clone` leaves them, and a push to a remote from inside
a clone does not work: its `origin` is the host's path, which the container cannot reach.

## Another working directory

`--workdir DIR` mounts `DIR` at `/work`, as it is, in place of a clone or the project root:

```sh
./agent.sh --workdir /path/to/other/clone
```

The container works on a full checkout on a branch, not a `git worktree`: a worktree's `.git` points at an absolute
path on the host that does not resolve inside the container. To isolate the work further, run the unit on a clone,
which makes the clone and brings its commits back. See "Working on a clone".

## Extra directories

`--mount HOST` mounts a host directory at `/mnt/<basename>`, read-write, and `--mount HOST:ro` mounts it read-only.
The option may be repeated:

```sh
./agent.sh --in-place --mount ~/reference:ro --mount ~/scratch
```

## The shared `node_modules`

This applies to a run with `--in-place` or `--workdir`. A unit run has a clone with a `node_modules` of its own,
which the host never installs into.

In place, the sandbox mounts the project at `/work` as it is on the host, `node_modules` included. The host and the
sandbox share one `node_modules`: an install on either side writes into the same directory, installs for that side's
platform and removes what only the other side's platform used, and nothing reports it. On a Linux host both sides
are the same platform and nothing is lost. A macOS host is the case where it matters:

* After an install in the sandbox, the host's macOS-only packages are gone. `fsevents`, which Playwright uses to
  watch files, is one. Playwright still runs without it, so the loss goes unnoticed
* After an install on the host, the sandbox's Linux-only packages are gone in the same way
* A package that ships a native binary per platform, as a bundler may, then fails on the side that did not install
  last, because the binary it finds is the other platform's

`npm ci` on the side about to be used restores that side. On the host:

```sh
npm ci
```

And for the sandbox:

```sh
./agent.sh --in-place -- npm ci
```

Use `npm ci` rather than `npm install`. `npm install` swaps the platform-limited packages but leaves every package
that is already installed as the other side left it, including a binary that one of them set up for the other
platform.

## The home volume

The agent's home, `/home/agent`, is a named volume in `container/compose.yml`, which survives a container. It
holds:

* Claude Code's login and settings
* whatever else a harness keeps in its home
* the npm cache

So authentication happens once. Two directories in the home are not of the volume: the harnesses' sessions, and
with them OpenCode's login, are in the project's log directory on the host. See "The harness logs".

The agent is always the host user's uid, set when the image is built. A home volume that was first filled by an
image whose agent had another uid stays owned by that uid, and the agent cannot write it. The entrypoint then
refuses to start, naming both uids and how to recover:

```sh
docker volume ls
docker volume rm <project>_agent-home
```

* `<project>` is not the repository's name but the Compose project's, the `name:` key in the project's own
  `agent/compose.project.yml`. `docker volume ls` shows the exact name
* Removing the volume discards the harnesses' saved logins
* The next start creates a new volume owned by the agent

The entrypoint refuses one more home volume, in the same way and with the same recovery: one in which a directory
above the two mounted log directories is not the agent's. See "The harness logs".

## The harness logs

Claude Code and OpenCode each keep a log of every session on disk: what was asked, what was answered and how many
tokens it took. In the sandbox those logs are on the host and not in the home volume. In every run, whatever is
mounted at `/work`, the wrapper mounts two directories of the host over the two in the agent's home that hold them:

| In the container                    | On the host                    | What it holds                            |
|-------------------------------------|--------------------------------|------------------------------------------|
| `/home/agent/.claude/projects`      | `<logs>/.claude/projects`      | Claude Code's sessions                   |
| `/home/agent/.local/share/opencode` | `<logs>/.local/share/opencode` | OpenCode's data: its database, its login |

* `<logs>` is the project's log directory, `<data>/agentrite/<name>`
* `<data>` is `$XDG_DATA_HOME` when that is set and `~/.local/share` when it is not
* `<name>` is the name of the project root's directory, so a project at `~/projects/norareit` has
  `~/.local/share/agentrite/norareit/`
* Every run of one project root uses that directory: a unit run of any branch, `--in-place` and `--workdir` alike
* The wrapper makes it, with the two directories in it, as the developer, before the container starts

What is in the log directory:

* The two directories have the places they have in a home, so a tool on the host that reads the harnesses' logs is
  given that one path and reads them there
* What a harness writes belongs to the developer on the host, who reads it like any other file of theirs, without
  Docker
* A sandboxed session is started in `/work`, so Claude Code's sessions are under `.claude/projects/-work`
* OpenCode's login is `<logs>/.local/share/opencode/auth.json`, a file of the host. Claude Code's login and
  settings are beside its projects directory and not in it, so they stay in the home volume

The agent writes the log directory. It is a directory of the host that the agent writes besides `/work`, and what
is in it was written by an agent that may have been misled: it can put anything there, a false record of usage and
a link to a file elsewhere among it. So whatever reads the log directory treats what it finds as data. A container
reaches its own project's log directory and no other project's, no directory above it, and none of the host's own
`~/.claude` or OpenCode directories.

Two projects whose root directories have one name share a log directory, wherever on the host they are. Either
harness may then continue or list the other project's sessions, a reader cannot tell the two projects' sessions
apart, and the two share one OpenCode login. Renaming one of the roots ends it.

The mounts were shown to work on macOS 15.1.1 with Docker Desktop 4.26.0 and VirtioFS as its file sharing. They
were shown with no other file sharing of Docker Desktop for macOS, so neither with gRPC FUSE nor with osxfs.

### Moving from a release up to 4.0.0

Releases up to 4.0.0 kept the logs in the home volume. Moving a project that has such a volume to a later release
does this:

* The sessions in the volume are no longer listed or continued, because the harnesses now look in the log directory
* OpenCode asks for its login once more
* Nothing is deleted. The volume holds what it held, under the mounted directories, where a container no longer
  sees it

To have the volume's logs in the log directory, copy them by hand, from the project root, while no sandbox of the
project runs. `<project>` is the Compose project's name, the `name:` of the project's `agent/compose.project.yml`,
and `<image>` is its `image:`:

```sh
logs="${XDG_DATA_HOME:-$HOME/.local/share}/agentrite/$(basename "$PWD")"
mkdir -p "$logs/.claude/projects" "$logs/.local/share/opencode"
docker run --rm --network none --entrypoint bash --user "$(id -u):$(id -g)" \
  --volume <project>_agent-home:/from:ro --volume "$logs:/to" <image> -c '
    cd /from
    sessions=.claude/projects
    opencode=.local/share/opencode
    if [ -d "$sessions" ]; then cp -Rnv "$sessions/." "/to/$sessions/"; fi
    if [ -e "/to/$opencode/opencode.db" ]; then
      echo "The log directory holds a database of OpenCode, so the data of OpenCode was not copied."
    elif [ -d "$opencode" ]; then cp -Rnv "$opencode/." "/to/$opencode/"; fi'
```

* It copies Claude Code's sessions and OpenCode's data directory, each when the volume holds it, and prints every
  file it copied
* The volume is mounted read-only, and the container has no network and does not run the sandbox's entrypoint, so
  it installs no firewall
* It runs as the developer, so what it writes is the developer's
* It overwrites nothing that the log directory already holds
* Of OpenCode it copies nothing at all once the log directory holds a database, and says so. Run it before the
  first start with the later release for that reason: once OpenCode has held a session in a sandbox, the log
  directory holds a new database

A home volume in which a harness was never started may be refused after the move:

* Such a volume lacks `.claude`, or `.local/share`, so the mount point inside it, and every missing directory above
  it, is root's, and the agent cannot write them
* The entrypoint then refuses to start, before the command runs, naming the first such directory, its owner and the
  agent's uid
* Removing the volume is the way on, with `docker volume rm <project>_agent-home`, as "The home volume" has it. The
  next start makes a new one from the image, which holds both mount points and every directory above them as the
  agent's
* A developer who wants the volume's logs copies them first, with the command above, which a refused volume still
  allows
* A directory that admits its owner alone, as tools that follow the XDG convention make `.local`, passes when it is
  the agent's. One that even the agent cannot read is refused in the same way, with what the read said in place of
  an owner

## The harness versions

The image holds Claude Code and OpenCode. For each on its own, the version is the first of these that exists:

1. the version the project's `agent/compose.project.yml` gives
2. the version installed on the host

The kit names no version of either harness. With neither of the two, the image gets the latest published version
at the time it is built, and the wrapper says which, in one line.

A project holds a version by adding the build argument to its `agent/compose.project.yml`, for either harness or
for both:

```yaml
services:
  agent:
    build:
      args:
        CLAUDE_CODE_VERSION: 2.1.288
        OPENCODE_VERSION: 1.18.33
```

Give an exact version. The value is passed to npm as it is, so a tag such as `latest` is installed once, when the
image is built, and not again.

The host's version:

* It is what `claude --version` and `opencode --version` print, for the command on the `PATH` of whoever runs
  `./agent.sh`
* A harness that is not there, or that is reached only through a shell alias, counts as not installed
* So does one whose command is there and prints no version, and the wrapper says so at each start

The latest published version, for a harness with neither source:

* The sandbox keeps that version until the image is built again, whatever is published in the meantime.
  `./agent.sh --in-place --rebuild` builds it again, and is how such a sandbox gets a newer one. A build for
  another reason, such as an update of the other harness on the host, brings the latest too
* The wrapper finds the latest with `npm view <package> version` on the host, so the build needs `npm` on the host
  for this
* It asks only when it is about to build: a start that builds nothing asks the registry nothing, and neither does a
  build for which the project or the host gives both versions
* When the latest cannot be found, because the registry is not reached, `npm` is not on the `PATH`, or its answer
  is not a version, the wrapper stops. It builds nothing and starts nothing, although an image may exist, and says
  which harness and which command gave no version. Either gets past it: a version in the project's file, under
  `services.agent.build.args`, or the harness on the host

Rebuilding:

* At each start the wrapper compares the versions it wants with those the image was built with, which the image
  holds as two labels, and builds the image again by itself when they differ, saying which harness and why. So no
  flag is needed after a harness is updated on the host
* For a harness with neither source there is nothing to compare: the sandbox keeps the version the image records,
  and the wrapper builds only when the image records none
* An image built by a release that did not write the labels records no version, and is built again at the first
  start
* When that build fails, for example with no network, the sandbox does not start, although an image exists

To see what an image holds, read its labels, where `<image>` is the `image:` of the project's
`agent/compose.project.yml`, or ask the harness in the sandbox:

```sh
docker image inspect --format '{{ json .Config.Labels }}' <image>
./agent.sh --in-place claude --version
```

The versions and the image are worked out from the checkout the command is run from, also for a unit run: a
version that a unit's branch gives in its `agent/compose.project.yml` counts once that branch is checked out on
the host.

What follows from that:

* The image is per machine. Two developers on one project run what their own hosts have, until the project holds a
  version
* On a host without a harness, the sandbox's version of it is the latest of the day the image was last built
* Each rebuild leaves the image it replaced behind, untagged, at about 0.6 GB. `docker image prune` removes them
* Self-update stays off inside the sandbox, for both harnesses: its root filesystem is read-only, and holds what
  the build installed

The kit checks no version of either harness. What it promises for a harness version:

* For any version: the confinement, which depends on no harness's version. The firewall, the proxy, the read-only
  root, the capabilities and the mounts are the same whichever version is installed, and a harness that contacts a
  host the kit does not admit is refused as before. And that the image holds exactly the version the rules above
  name, or the start fails
* For no version, because none is checked: that both harnesses start with the kit's allowlist alone, that the
  login command for OpenCode in "Logging in to a model provider" names a method that exists, that the developer's
  status line shows through the managed settings, and that the environment variables and the configuration file the
  image sets do switch self-update off
* What a developer sees when a version breaks one of these: the harness's own error, such as
  `Unable to connect`, or a feature that is missing, with the refused host in `/run/egress-proxy.log`; a login
  method OpenCode does not know; a blank status line; an update attempt that fails against the read-only root and
  the firewall; or, for a version that is not on the npm registry, a build that fails with npm's error
* To recover, in the order of least effort: add the refused host to the project's `ALLOWLIST`, or hold a version
  that works in the project's `agent/compose.project.yml`. Holding the versions the image already has, without
  committing the edit, is also how to start the sandbox while a build cannot run

## The status line

A developer's own Claude Code status line is shown in the sandbox. When `~/.claude/statusline-command.sh` is a file
on the host as the sandbox starts, the wrapper mounts it read-only at `/etc/claude-code/statusline-command.sh`,
together with the kit's `container/claude-managed-settings.json` at `/etc/claude-code/managed-settings.json`, whose
one setting runs the script with `bash`. With no such file on the host, neither is mounted.

* That script is the only file under the host's `~/.claude` the sandbox can read, and the agent cannot change it.
  The credentials, the settings and the history stay on the host
* The script runs in the sandbox, so the tools it calls must be in the image, which has `jq` and `git`
* Managed settings stand above Claude Code's other settings, so while the host file exists it replaces a status line
  set inside the sandbox, in the home volume's `~/.claude/settings.json`
* A script under another name is reached with a symbolic link at `~/.claude/statusline-command.sh`
* It is mounted at each start, so a start picks up the script and a change to it with no rebuild, and nothing is
  written to the home volume
* OpenCode has no such status line, and nothing is mounted for it
* When the developer's organization delivers managed settings from the claude.ai console, Claude Code by default
  uses those and ignores the file, so the status line is then whatever that policy gives

## Logging in to a model provider

A harness is logged in to its model provider from the sandbox's shell, and the login is kept:

* Claude Code is logged in once per home volume, which holds its login
* OpenCode is logged in once per log directory, which holds its login, so a new home volume of the project needs no
  new login of OpenCode. See "The harness logs"

A login that sends the browser back to a port on `localhost` cannot complete in the sandbox: the container
publishes no port, and its firewall drops every inbound connection. Use a login that needs no callback.

For OpenAI in OpenCode with a ChatGPT account, that is:

```
opencode auth login -p openai -m "ChatGPT Pro/Plus (headless)"
```

* The method's label is the one OpenCode used when this was written, and another version may name it differently
* It prints an address and a code to enter there, in any browser, and completes on its own once the code is
  accepted
* The kit admits the two hosts this login needs itself, so the project adds nothing for it. See "Egress"
* A login with an API key needs `api.openai.com` in the project's `ALLOWLIST` instead

When a login or a prompt fails for a host that is not on the allowlist, the refusal is in the proxy's log:
`grep 'not allowlisted' /run/egress-proxy.log`.

## Egress

The sandbox's egress is bounded by hostname. What leaves the container is:

* DNS to its resolvers
* the local model server's host and port. See "The local model server"
* HTTPS on port 443 to the allowlisted hosts

Everything else is denied, whatever its port or address.

The allowlist is two lists together. Both are checked the same way, and a host in both is admitted once.

`KIT_ALLOWLIST`, in the kit's `container/compose.yml`, holds the hosts the kit itself needs. They need no listing
in a project, and a kit release that needs another host adds it there, with no change to any project:

| Host                     | What it is for                                                      |
|--------------------------|---------------------------------------------------------------------|
| `api.anthropic.com`      | The probe host, and the API Claude Code uses                        |
| `platform.claude.com`    | Claude Code contacts it at start-up when it holds no saved login    |
| `models.opencode.ai`     | OpenCode fetches its model catalog from it                          |
| `auth.openai.com`        | OpenCode logged in with a ChatGPT account signs in there            |
| `chatgpt.com`            | OpenCode logged in with a ChatGPT account sends its prompts there   |
| The npm registry         | `npm ci` and `npm install` inside the container                     |
| `agentrite.ritenoar.com` | The kit's releases, which npm installs by URL                       |

`ALLOWLIST`, in the project's `agent/compose.project.yml`, holds what the project needs besides, and may be empty
or left out. Add the API host of any other model provider the project's agents use, and whatever its tools and
tests reach. A provider's login may need further hosts. See "Logging in to a model provider".

Every outbound connection on port 443 goes to `container/egress-proxy.mjs`, which runs as its own unprivileged
account:

* It reads the hostname from the TLS ClientHello and admits the connection only if that host is allowlisted
* It resolves the host itself and connects there, never to the address the client asked for, so an allowlisted name
  sent to some other address does not reach that address
* It terminates no TLS and installs no certificate: it forwards the connection's bytes unchanged, and the client
  validates the origin's own certificate
* A refused client fails with a TLS `unrecognized_name` alert
* It logs one line for each connection it allows or refuses to `/run/egress-proxy.log`, which the agent can read

What follows from that:

* Another host served from the same address as an allowlisted one is refused. So is plain HTTP, and so is TLS on any
  port but 443
* Allowlist entries are hostnames, matched exactly. A subdomain needs its own entry, and an address or CIDR range is
  refused at start-up
* A host whose addresses rotate stays reachable, because the proxy resolves it per connection
* Encrypted ClientHello is judged by its outer hostname, the one sent in the clear. Chromium sends the extension as
  GREASE and puts the real hostname there, so it is checked like any other. A genuine ECH connection carries the
  provider's public name there, and is refused unless that public name is itself allowlisted, in which case the real
  hostname inside is not seen
* If the proxy stops, egress stops. The redirect still points at its port and nothing else admits port 443

It does not stop data leaving through a host that is allowlisted, or through DNS to the permitted resolvers.

At start-up the entrypoint proves the boundary before it drops to the agent, and refuses to start if any check
fails:

* the canary host (`FIREWALL_CANARY`) cannot be reached on port 80
* every allowlisted host, and the probe host (`FIREWALL_PROBE`), can be reached through the proxy
* the canary's hostname, presented at the probe's own address, is refused by the proxy, which shows that the check
  is on the hostname and not the address

## The local model server

The sandbox reaches one host and port outside the allowlist: `MODEL_SERVER_HOST` on `MODEL_SERVER_PORT`, which
`container/compose.yml` sets to `host.docker.internal` and `11434`, and nothing else on the host.

On a Linux host whose firewall denies incoming traffic by default, `ufw` for example, allow the Docker bridge subnets
to that port on the host, or the container cannot reach the model.
