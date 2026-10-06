# 0035 Trying it on macOS

This file is for a session on a Mac with Docker Desktop. It is not part of the spec. It says how to find out, before
the unit is approved, what [`spec.md`](spec.md) lists as not established: whether both harnesses work when their
logs are on a mounted directory of a macOS host.

The unit does not have to be implemented for this. The sandbox image of the release 4.0.0 is used as it is, and the
two mounts the unit would add are given by hand.

Read `spec.md` first, at least "What was found while specifying" and the requirements.

## Why macOS is the open case

On Linux a mounted directory is the host's own file system. Under Docker Desktop for macOS it goes through a file
sharing layer between the Mac and Docker's virtual machine, and a named volume does not. OpenCode keeps its sessions
in a SQLite database, and SQLite's locking and its shared memory file, `opencode.db-shm`, are where such layers are
known to fail. Claude Code's logs are files it appends to, and are expected to be fine.

## What is needed

* A project on the Mac that has the sandbox of the release 4.0.0 installed, with its image built. Run its
  `./agent.sh --in-place true` once if it is not
* A human at hand: both harnesses have to be logged in, in a home volume made for the trial
* Node 22.13 or newer on the Mac, for step 4

## Setting up

From the project's root. `container/agent.sh` of the kit is the source for how Compose is called, should anything
here not fit the project.

```sh
export AGENTRITE_CONTAINER=node_modules/@ritenoar/agentrite/container
export AGENT_UID="$(id -u)" AGENT_GID="$(id -g)"
# Compose wants both set. They are read by a build only, and nothing is built here.
export AGENT_CLAUDE_CODE_VERSION=0.0.0 AGENT_OPENCODE_VERSION=0.0.0

trial="$HOME/.local/share/agentrite/mac-trial"
mkdir -p "$trial/.claude/projects" "$trial/.local/share/opencode"

# A Compose project of its own, so that the trial has a home volume of its own and the
# project's real one, with its logins, is left alone.
sandbox() {
  docker compose --project-name agentrite-mac-trial --project-directory "$PWD" \
    -f "$AGENTRITE_CONTAINER/compose.yml" -f agent/compose.project.yml \
    run --rm --volume "$PWD:/work" \
    --volume "$trial/.claude/projects:/home/agent/.claude/projects" \
    --volume "$trial/.local/share/opencode:/home/agent/.local/share/opencode" \
    agent "$@"
}
```

`sandbox` opens a shell in a container, and `sandbox <command>` runs a command in one. If Compose starts a build,
stop it: the image was not found, and the versions above would be built into it.

Note down, for the record: the macOS version, the Docker Desktop version, and the file sharing implementation set
under Settings, General (VirtioFS, gRPC FUSE or osxfs). The result may differ between them. If there is time, repeat
steps 2 to 4 with another one.

## The steps

Keep what was run and what it printed.

### 1. The home, with two directories mounted inside it

The first `sandbox` makes the trial's home volume. In its shell:

```sh
id
ls -ld ~ ~/.claude ~/.claude/projects ~/.local ~/.local/share ~/.local/share/opencode
touch ~/.claude/trial ~/.local/trial ~/.local/share/trial && echo writable
touch ~/.claude/projects/trial ~/.local/share/opencode/trial && echo mounts writable
```

Passes when every directory belongs to `agent`, both lines are printed, and the container started at all: the
entrypoint refuses a home the agent does not own.

On the Mac, `ls -l "$trial/.claude/projects"` shows who owns what the container wrote.

### 2. One container

In `sandbox`:

* Log in to Claude Code, give it one prompt, and leave it
* Log in to OpenCode (`opencode auth login`), give it one prompt (`opencode run "say hello"` or in its interface),
  and leave it
* Leave the container

In a second `sandbox`:

* `claude --continue` continues the session
* OpenCode lists the session (`opencode session list`, or the session list of its interface)
* OpenCode is still logged in. Its login is `auth.json` in the mounted directory

Passes when all three hold and neither harness printed an error about its database or its files.

### 3. Two containers at the same time

Open `sandbox` in two terminals. In both, at the same moment, run a few sessions one after another:

```sh
for i in 1 2 3 4 5; do opencode run "say the number $i"; done
```

Then run a Claude Code prompt in both at the same moment as well.

Passes when no run prints "database is locked", "disk I/O error", "malformed" or another SQLite error, and all ten
OpenCode sessions are listed afterwards. Leave both containers, and on the Mac:

```sh
sqlite3 "$trial/.local/share/opencode/opencode.db" "PRAGMA integrity_check;"
```

must print `ok`.

### 4. Reading from the Mac while a container writes

This is what a tool on the host does, and the step most likely to fail. In one `sandbox`, keep OpenCode writing:

```sh
for i in $(seq 1 20); do opencode run "say the number $i"; done
```

Meanwhile, on the Mac, read the database every few seconds, read-only, as the human's tool does:

```sh
node --no-warnings -e '
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(process.argv[1], { readOnly: true });
  console.log(db.prepare("SELECT COUNT(*) AS messages FROM message").get());
  db.close();
' "$trial/.local/share/opencode/opencode.db"
```

Passes when every read succeeds, the count grows from read to read, and OpenCode in the container prints no error
while it is being read. Afterwards, with the container gone, the integrity check of step 3 prints `ok` again.

Note separately what a read gives while the container is running and after it has stopped. A count that only catches
up once the container is gone is a result too.

Also, while Claude Code writes a session in a container, `tail -f` its newest file under `$trial/.claude/projects`
on the Mac. Passes when the lines arrive while the session runs.

## What the result means

| Result | For the unit |
|---|---|
| Steps 1 to 4 pass | macOS is established. The spec's open point and the README's sentence about macOS go |
| Step 1 fails | The mounts need another shape on macOS, or on both systems if Linux fails the same way |
| Step 2 or 3 fails for OpenCode | The spec needs another answer for OpenCode on macOS, as Claude Code's logs only |
| Only step 4 fails | The unit is fine as specified. The tool that reads the database has to read it another way |

## Afterwards

* Remove the trial: `docker volume rm agentrite-mac-trial_agent-home` and `rm -r "$trial"`. The directory holds an
  OpenCode login
* Add a log entry to [`record.md`](record.md), in the format of the entries there: the versions noted, each step with
  what was run and what it printed, and the result. Leave `spec.md` as it is. What the result changes in it is the
  specifier's to write and the human's to approve
* Commit on `master`, with nothing but this unit's documents, as `feature-0035 ...`
