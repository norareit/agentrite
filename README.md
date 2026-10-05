# AgentRite

A kit for running coding agents by a fixed process.

The shared instructions and tooling that coding agents work under, in one place so that an improvement is made once
rather than once per project. Projects install it as the npm package `@ritenoar/agentrite` and keep only what is
specific to them.

## The name

A rite is a prescribed way of doing something, and that is what this kit is at its core. `process.md` lays down how
a change is specified, planned, recorded and frozen, and the roles and the sandbox exist so that agents follow it.

The name reads three ways, and all three are meant:

* a **rite** for agents: the process they work by
* agents done **right**
* agents that **write**

The "rite" is also Ritenoar's, whose projects carry it.

## What is here

| Path                 | What it holds                                                                             |
|----------------------|-------------------------------------------------------------------------------------------|
| `process.md`         | How work is done: the changes process, the commit conventions, the code standards         |
| `CHANGELOG.md`       | What each release changed, and what is worth knowing when updating to it                  |
| `RELEASING.md`       | How a release of the kit is made, which the `/release` skill follows                      |
| `roles/`             | The planner, implementer and reviewer instructions                                        |
| `templates/changes/` | The starting `spec.md`, `plan.md` and `record.md` for a change unit                       |
| `templates/project/` | The files `agentrite init` fills in and writes into a project                             |
| `scripts/`           | `check-changes.mjs`, the freeze check, and the `agentrite` and `agentrite-roles` commands |
| `tests/`             | The kit's own unit tests, run by node's built-in test runner                              |
| `container/`         | The agent sandbox: image, entrypoint, egress proxy, base Compose file and wrapper         |
| `infra/`             | The CDK app that serves release tarballs from `agentrite.ritenoar.com`                    |
| `deploy.sh`          | The release script, which deploys `infra/` and uploads the packed kit                     |

The `agentrite` command holds four commands of its own: `init` and `refresh`, which set a project up and bring it
up to date, and `roles` and `run`, which list the roles and run one in a harness.

Nothing here names a particular project. A rule that would need rewording to make sense elsewhere belongs in the
project's own `AGENTS.md`, which links here for the rest.

## Installing it into a project

The kit is the npm package `@ritenoar/agentrite`. It is served as a tarball from `agentrite.ritenoar.com` rather than
from a registry, so a project adds it by the URL of a release, which `deploy.sh` prints when it makes one:

```sh
npm install https://agentrite.ritenoar.com/ritenoar-agentrite-2.0.0.tgz
```

npm writes the URL into the project's `package.json`, and the resolved URL with an integrity hash into
`package-lock.json`. A project receives what `files` in this repository's `package.json` lists, which is
`process.md`, `CHANGELOG.md`, `roles/`, `templates/`, `scripts/check-changes.mjs`, `scripts/agentrite-roles.mjs`,
`scripts/agentrite-run.mjs`, `scripts/agentrite.mjs` and `container/`, plus the `package.json` and this README that
npm always ships. It does not receive this repository's `changes/`, `tests/`, `infra/` or `deploy.sh`.

The kit assumes npm: `init` reads `package-lock.json`, and the sandbox's image installs from it.

Then set the project up from its root, naming only the harnesses it uses:

```sh
npx agentrite init claude opencode
```

It prints each file it wrote, changed or skipped. It writes:

| File                        | What it is for                                                                       |
|-----------------------------|--------------------------------------------------------------------------------------|
| `.claude/agents/*.md`       | For `claude`: a wrapper per role for Claude Code, pointing at the kit's role file    |
| `.opencode/agents/*.md`     | For `opencode`: the same for OpenCode                                                |
| `AGENTS.md`                 | The project's agent instructions, pointing at the kit's `process.md` and role files  |
| `CLAUDE.md`                 | The bridge that imports `AGENTS.md` into Claude Code, written whatever the harnesses |
| `agent.sh`                  | The shim that runs the kit's sandbox from the project root, as described below       |
| `agent/compose.project.yml` | The project's half of the sandbox configuration                                      |

The role wrappers are the ones `npx agentrite-roles claude opencode` writes, which is still there for a project that
wants only those. Unlike `init`, it refuses to overwrite a file that already exists. A model per role goes in the
project's own wrapper.

The OpenCode wrappers are written with `mode: all`, which makes each role both a primary agent and a subagent.
OpenCode takes only a primary agent on its command line, which is where `agentrite run` gives it the role, and a
role is also dispatched as a subagent from a session, so a wrapper has to be both. The roles are therefore also
offered among the primary agents in OpenCode's own interface.

Every generated file is the project's own once written, and the project may edit any of them. `init` never
regenerates one: a file it would create that already exists is left as it is and reported as skipped, so running it
again only adds what is missing. What a kit release needs from every project is kept in the kit instead, where
updating the kit delivers it. The files a project is expected to edit are these:

* `AGENTS.md` has a marked section for what is specific to the project, such as its house style, its code rules and
  how its tests run, and keeps only that: what holds for every project is in the kit. The three sections above it,
  Development Guidelines, Roles and Changes in this project, are what make the kit's instructions reach an agent, and
  are best kept
* `agent/compose.project.yml` holds the Compose project and image names, both derived from the `name` in
  `package.json`, the `PLAYWRIGHT_VERSION` build argument when the project has Playwright, the memory and CPU limits,
  and the project's `ALLOWLIST`.
  The allowlist lists only what the project needs beyond what the kit admits itself, which is the Anthropic API,
  `platform.claude.com`, `models.opencode.ai`, `auth.openai.com`, `chatgpt.com`, the npm registry and
  `agentrite.ritenoar.com`; the kit's hosts need no listing. Add the API host of any other model provider the
  project's agents use, and whatever its tools and tests reach. A provider's login may need further hosts, as
  "Logging in to a model provider" below describes
* The role wrappers, to pin a model per role

`CLAUDE.md` is best left as written.

The role wrappers and `agent.sh` are the exception to a generated file being the project's own. They hold nothing
but what the kit put there, so `refresh`, described under "Updating a project to a newer kit", rewrites them as the
installed release writes them. The model pinned in a wrapper survives that. Anything else added to a wrapper, or to
`agent.sh`, does not, so `agent.sh` is not a file to edit.

When `AGENTS.md` already exists, `init` leaves it untouched and prints the three sections it would have written,
ready to be pasted in. An agent does not see the kit's instructions until the existing file holds them, so paste in
whichever it lacks. When `CLAUDE.md` already exists, it is left untouched too, and must import `AGENTS.md` with a line
holding `@AGENTS.md`.

`init` also amends two files, adding only what is missing:

* `package.json` gains a `check-changes` script, unless it has one, keeping every other key, their order and the
  indentation:

  ```json
  "scripts": {
    "check-changes": "node node_modules/@ritenoar/agentrite/scripts/check-changes.mjs"
  }
  ```

  `npm run check-changes` then compares the committed work on the current branch with `master`, and exits non-zero
  with a list of the offending units when a frozen `spec.md` or `plan.md` changed or an implemented plan has unticked
  tasks. It takes the repository root as an optional argument and defaults to the working directory. The npm script
  is one way to wire the check; a project may run the kit's script with `node` from a command of its own instead
* `.dockerignore` is written when there is none. When it keeps any file of the kit's `container/` directory out of
  the build context, whatever its patterns, the exception is appended, so that the image build can reach the kit.
  `init` decides this by the rules BuildKit applies. Otherwise the file is left alone

A project that depends on Playwright gets a sandbox with its browser: `init` takes the version from
`package-lock.json` and writes it into `agent/compose.project.yml` as the `PLAYWRIGHT_VERSION` build argument. When the
lockfile resolves no `playwright`, `init` writes the compose file without the argument, and the sandbox is built
without a browser. `init` exits 0 either way. An existing `agent/compose.project.yml` is left as it is. `init` refuses
to run, writing nothing, when `package.json` has no `name`.

`init` fills in the templates in the kit's `templates/project/`, which ship in the package, at
`node_modules/@ritenoar/agentrite/templates/project/`. A project set up or repaired by hand starts from the same
files, filling in each `{{placeholder}}` itself.

A missing or altered kit is then npm's error, like any other dependency's, and needs no check of the project's own.

## Installing on a fresh clone

A fresh clone of a project has no kit. `npm ci` installs it with the project's other dependencies, at exactly the
release and integrity hash `package-lock.json` records, and fails rather than install anything else.

The lockfile is authoritative. Installing the kit's latest on every run would mean two people cloning the same
project on different days run agents under different instructions, with nothing in the project's history showing it.
The lockfile makes a clone reproducible.

## Updating a project to a newer kit

Install the newer release by its URL:

```sh
npm install https://agentrite.ritenoar.com/ritenoar-agentrite-2.1.0.tgz
```

That changes only `package.json` and `package-lock.json`, which the project commits like any other change. Nothing
reports that a newer release exists: the URL is the pin, and `npm outdated` has no registry to ask. Moving to a newer
kit is a deliberate change to the project.

What a release changed, and what is worth knowing when updating to it, is in the kit's `CHANGELOG.md`, which after
the install is at `node_modules/@ritenoar/agentrite/CHANGELOG.md`. It holds one section per release, newest first. A
project that skips releases reads every section between its old version and the new one.

Then bring the kit's own files in the project up to date, from the project root, naming the harnesses it uses:

```sh
npx agentrite refresh claude opencode
```

It rewrites the role wrappers of those harnesses and `agent.sh` as the new release writes them, writes any that are
missing, and prints each file as written, refreshed or up to date. A release that changes a role's description, the
line that points at its role file, or the shim reaches a project this way; without it those copies stay as an older
release wrote them, and nothing says so.

* A model pinned in a wrapper survives: a line in its frontmatter that opens with `model:` is kept, as written,
  after the kit's own keys
* Everything else in a wrapper, and all of `agent.sh`, is replaced, other keys a project added to the frontmatter
  among them. The wrappers are tracked files, so `git diff` shows what a refresh changed, and git has what it
  replaced
* `AGENTS.md`, `CLAUDE.md`, `agent/compose.project.yml`, `package.json` and `.dockerignore` are never touched, and
  never created
* A path that holds something other than a regular file, such as a symbolic link, is left as it is and named on
  standard error. The other files are still refreshed, and the command exits non-zero

An improvement found while working in a project is made here, in the kit repository, and committed here. The
installed copy under a project's `node_modules` is not a working copy of this repository, and nothing in it reaches
here. The improvement reaches that project, and every other, as a new release that each one updates to as above.

## Running a role

`agentrite roles` lists the roles the kit has, each with the description its wrappers hold:

```sh
npx agentrite roles
```

It reads nothing of the project, and takes no argument but `--json`, which prints the same roles for a script:

```sh
npx agentrite roles --json
```

That is one JSON document: an object with one key, `roles`, an array that holds each role in the same order, as an
object with its `name` and its `description`. The description is on one line, not wrapped. Shortened here:

```json
{
  "roles": [
    {
      "name": "planner",
      "description": "Writes the documents a change unit needs in changes/, ..."
    }
  ]
}
```

`agentrite run` starts a harness as one of those roles, for one unit, from the project root:

```sh
npx agentrite run <role> <harness> <unit> [--prompt <text>] [--model <id>] [--headless] [--skip-permissions]
                  [-- <harness arguments...>]
```

The role is one that `agentrite roles` lists, and the harness is `claude` or `opencode`. The unit is a directory of
`changes/`, given by its name, with or without `changes/` before it and a slash after it, or by the four digits its
name opens with. A unit run by its number, in each harness:

```sh
npx agentrite run implementer claude 0032
npx agentrite run reviewer opencode 0032
```

The harness is started in the directory the command is run from, with the role as its agent and one prompt:
`The unit is changes/<directory>/.` The text of `--prompt` is added to that prompt, after an empty line:

```sh
npx agentrite run reviewer opencode 0032 --prompt "start with the tests of the wrappers"
```

The command waits for the harness, and exits with the status the harness exited with, or with a status other than
0 when a signal ended the harness. Run with no argument, it prints its usage.

The options may stand anywhere among the arguments before a `--`:

* `--prompt <text>` adds its text to the prompt, as it is written. The text is one argument, so a shell's quotes
  go around it, and it may hold any word, one that opens with a dash among them. A text that itself opens with a
  dash is given as `--prompt="<text>"`. The command takes no word after the unit that is not an option
* `--headless` chooses between the two modes. Without it the harness opens a session on the terminal the command
  was run on, with the prompt as its first. With it the harness is run without a session, for a script: it works on
  the prompt and ends
* `--model <id>` takes the harness's own id of a model and passes it on as it is written, such as
  `claude-sonnet-5-5` for Claude Code or `openai/gpt-6.1-sol` for OpenCode. The kit has no names of its own for
  models. Without the option the harness gets no model and decides by itself, and a model pinned in the role's
  wrapper is what such a run is expected to use
* `--skip-permissions` ends the harness's questions about permissions, in both modes. Claude Code gets
  `--dangerously-skip-permissions`, which bypasses every check, and OpenCode gets `--auto`, which approves what is
  not explicitly denied, so the two do not do the same. The option belongs in the sandbox. The command does not
  look where it runs, and on the host the flag does what its name says

A `--` ends the command's own arguments. Every argument after it is given to the harness as it is written and in
the order given, after the role, the model and the permission flag, and before the prompt. The prompt is the last
argument the harness gets, and where the harness takes it as an argument of its own, the command puts a `--` in
front of it, so that an option of the harness that takes several values does not take the prompt for one. The
command reads none of the arguments it passes on: it does not look whether one repeats or undoes an argument of
its own, such as a second `--model`, and what the harness makes of that is the harness's. With no `--`, or with
nothing after it, the harness gets the role, the prompt and what the options above give, and nothing else.

That is how a session is resumed, with the harness's own options, since the kit has no session of its own. In
Claude Code, give the first run an id, which is a UUID, and resume it by that id:

```sh
npx agentrite run implementer claude 0032 --headless -- --session-id 0b6f3c1e-58a4-4c0f-9d1b-2f1f6e3a7c55
npx agentrite run implementer claude 0032 --headless --prompt "go on" -- --resume 0b6f3c1e-58a4-4c0f-9d1b-2f1f6e3a7c55
```

In OpenCode, read the id of the session from `opencode session list` after the first run, and resume it by that:

```sh
npx agentrite run reviewer opencode 0032 --headless
opencode session list
npx agentrite run reviewer opencode 0032 --headless --prompt "go on" -- --session ses_ef35877c0ffefJvzVbIUZSXpWV
```

A resumed run gets the role as its agent again, and its prompt again: the unit, and the text when there is any.
That holds with `--headless`. A session of OpenCode that is resumed so opens on what was said before and does not
send the new prompt, as seen with OpenCode 1.18.34.

The command needs the role's wrapper for the harness as `refresh` leaves it, since the wrapper is what makes the
harness read the role's file. When the wrapper is missing, or holds anything but what `refresh` would write, a
pinned model aside, the command starts nothing, names the file and names the command that repairs it:

```sh
npx agentrite refresh opencode
```

So a project that moved to a newer kit runs `refresh` before `run`, and a key a project added to a wrapper by hand
stops `run` until `refresh` has removed it. The command also starts nothing when the harness's own command is not
on the `PATH`, and when `changes/` holds no directory for the unit, or more than one for its digits.

The command starts no sandbox: it starts the harness where it is run, on the host or inside the sandbox, and
`./agent.sh` is still what starts the sandbox. In a unit run of the sandbox, `npx agentrite` is there after
`npm ci` in the clone, like the role files.

## Where to run it

Installing and updating are `npm ci` and `npm install`, which run on the host and inside a project's sandbox alike: the
sandbox admits the npm registry and `agentrite.ritenoar.com` itself, through the kit's `KIT_ALLOWLIST`. A project's
`agent.sh` runs the wrapper from `node_modules`, though, so a fresh clone needs `npm ci` on the host before its sandbox
can start.

## Running the sandbox

`container/agent.sh` layers a project's compose file over the kit's base and runs the container. A project gives it
two files:

* `agent.sh` at the project root, a shim that execs `node_modules/@ritenoar/agentrite/container/agent.sh` with the
  project root as its first argument, so that the documented command stays one command from the repository root.
  The wrapper takes the root from its caller because how deep the kit sits under `node_modules` is npm's to decide
* `agent/compose.project.yml`, holding what varies per project: the Compose project name, the image name, the egress
  allowlist, the resource limits and, for a project with Playwright, the `PLAYWRIGHT_VERSION` build argument

Everything that confines the container is in `container/compose.yml` and `container/entrypoint.sh`. Which versions
of Claude Code and OpenCode the image holds, and how a sandbox gets a newer one, is under "The harness versions"
below.

The container's root filesystem is read-only. The agent writes the working directory, its home volume and `/tmp`.
`/tmp` is in memory and is emptied when the container stops, and files in it can be run, so a test suite or a tool
that runs what it writes to the temporary directory works as on the host.

The browser is in the image when the project's compose file gives `PLAYWRIGHT_VERSION` under
`services.agent.build.args`, and not otherwise: the build argument alone decides. A project that starts using
Playwright adds the argument by hand, as the version its `package-lock.json` resolves, and one that stops removes it,
and both rebuild with `./agent.sh --in-place --rebuild`. `init` and `refresh` never rewrite
`agent/compose.project.yml`, which is the project's own.

The build context is the project root, not the kit directory, because the Dockerfile copies the kit's files from under
it and, for a project with Playwright, installs the project's own dependencies to get Playwright's system libraries at
the version the project resolved. The wrapper passes
`--project-directory` so that relative paths in both compose files resolve from the project root, and passes the
kit's `container/` directory, relative to that root, as `AGENTRITE_CONTAINER`, which the compose file and the
Dockerfile use to find the kit's files. A project whose `.dockerignore` excludes `node_modules` must let that one
directory's files back in:

```
node_modules
!node_modules/@ritenoar/agentrite/container/**
```

The exception names the files rather than the directory. BuildKit lets an exception for a directory reach the files
in it only when the directory itself was excluded, so `!node_modules/@ritenoar/agentrite/container` alone does not
bring back a kit file that a pattern excluded by name.

### Starting it

The host needs Docker: Desktop on macOS, Engine on Linux. A run says what it mounts at `/work`, and there is no
default. From the project root, one of:

```sh
./agent.sh 0029
./agent.sh --in-place
```

The first names a unit, by its number or by its branch, and mounts a clone of that unit's branch, as "Working on a
clone" below describes. It is the way to implement and to review a unit. The second mounts the project as it is on
the host, so the agent works in the developer's own checkout, `.git` and `node_modules` included. It is the way to
run something on the tree as it is, such as the suite. A command that says neither, and gives no `--workdir`
either, starts nothing and names the forms.

Either builds the image on first use and opens a shell in the container, with the clone or the project mounted
read-write at `/work`. Nothing else of the host is reachable, with three exceptions: the developer's `~/.gitconfig`,
mounted read-only so that commits from inside carry the same name and email as on the host, the developer's Claude
Code status line script, as "The status line" below describes, and the local model server's port, as "The local
model server" below describes. A unit run also mounts the project's `.reviews` directory. A command appended to it
runs instead of the shell, as in `./agent.sh 0029 claude` and `./agent.sh --in-place npm test`. `--rebuild` is an
option of either form and builds the image again before running, as in `./agent.sh --in-place --rebuild`.

Never run it with `sudo`. The wrapper refuses to run with uid or gid 0, because the agent inside the sandbox would
then be root too. When Docker needs elevated permissions on the machine, add the user to the `docker` group instead.

### Working on a clone

Planning is done on the host: the planner makes the unit's branch and commits its documents there. The sandbox is
for the implementer and the reviewer, and a unit run gives them a copy of that branch to work on, not the
developer's checkout:

```sh
./agent.sh 0029 claude
./agent.sh feature-0029-sandbox-clone-of-the-branch claude
```

The unit is a local branch, named outright or by a number that its name holds as a whole number: `0029` names
`feature-0029-sandbox-clone-of-the-branch`, and `29` and `002` name nothing. When a number names several branches
the wrapper lists them and asks for one by its name, and when it names none it says so. The wrapper never makes a
branch.

Before the container starts, the wrapper clones the repository, with that branch checked out at the commit the
host's branch is at:

* The clone holds what is committed and nothing else. Uncommitted work, ignored files such as a `.env`, and
  `node_modules` stay on the host. So the first command in a new clone is `npm ci`, without which the role files
  under `node_modules` are not found and the suite does not run
* The host's other branches are in the clone as `origin/*`, `origin/master` among them, which is the base the
  change check compares with
* The clone is at `~/.local/state/agentrite/<Compose project>/<branch>`, or under `$XDG_STATE_HOME` when that is
  set: outside the project, and in a directory that a restart does not empty
* The host's `.reviews` directory is mounted at `/work/.reviews`, so what the reviewer writes there is on the host
  as it is written
* The image, the allowlist, the limits and the harness versions are those of the checkout the command is run
  from, on whatever branch that is, and not those of the clone. A unit that changes `agent/compose.project.yml`
  runs without its own change until that is checked out on the host

When the container exits, whatever its exit code, the wrapper brings the work back:

* It fetches the clone's branch into the host's repository as `sandbox/<branch>`. Only that branch is fetched
* It fast-forwards the host's branch to it, whether or not that branch is checked out, and removes
  `sandbox/<branch>`. When the host's branch moved meanwhile and cannot be fast-forwarded, it is left as it is,
  the commits wait at `sandbox/<branch>`, and the wrapper names the command that merges them:
  `git merge sandbox/<branch>`. The same happens when the branch is checked out and the commits add a file where
  the host has an ignored one, which a fast-forward would overwrite
* It does neither while the container is still running, or when Docker cannot say whether it is
* It removes the clone when nothing in it would be lost. A clone that holds a file that is not committed, apart
  from ignored files, or a commit on another branch or in a stash, is kept, and the wrapper says where it is and
  what it holds. When the removal itself fails, for example on a directory the agent made read-only, the wrapper
  says so and where the remains are, beside the clone's place as `.discarded-<branch>`, to be removed by hand

A clone that was kept is resumed by the same command, as it is: it is not updated from the host's branch. After a
crash of the container, the wrapper or the host, the clone is still there and nothing has been fetched;
`./agent.sh <unit> true` resumes it, runs nothing of note and brings its commits back. To discard a clone, remove
its directory with `rm -rf`. A new run is refused while `sandbox/<branch>` holds commits the branch does not have,
so that an earlier run's commits are not overwritten: merge it or delete it first.

Two units run side by side, each on its own clone, in its own container, and each container has the full memory
and CPU limits of the project's compose file. Two runs never work on one branch: the container is named after the
Compose project and the branch, and a second run for a branch whose container is running is refused. Two checkouts
of one project on one host share a branch's clone.

What the clone protects, and what it does not. A unit run defends the host's repository against an agent that was
misled, for example by an instruction injected through a dependency, and that writes whatever it likes under
`/work`, the clone's `.git` included. Against that agent, nothing it writes is run on the host by the wrapper, and
nothing reaches the host's repository but the commits of the unit's branch and the files under `.reviews`. A git
hook, a line in `.git/config` and a file in `node_modules` stay in the clone. It does not defend against:

* what a commit contains. A script in a commit runs on the host once the developer checks it out and runs it. The
  commit is in a diff the developer can read first
* what a review file says, to a human or to an agent that reads it on the host
* a run with `--in-place` or `--workdir`, which mounts a directory as it is
* a flaw in git's handling of a fetch from a hostile repository, or in Docker
* anything the sandbox did not defend against before: the saved logins in the home volume, and data leaving
  through an allowlisted host or through DNS

The supported usage is one developer, one host, branches made on the host, and a clone that only the wrapper and
the sandbox touch. Submodules and Git LFS are as plain `git clone` leaves them, and a push to a remote from inside
a clone does not work: its `origin` is the host's path, which the container cannot reach.

### Another working directory

`--workdir DIR` mounts `DIR` at `/work`, as it is, in place of a clone or the project root:

```sh
./agent.sh --workdir /path/to/other/clone
```

The container works on a full checkout on a branch, not a `git worktree`: a worktree's `.git` points at an absolute
path on the host that does not resolve inside the container. To isolate the work further, run the unit on a clone,
as "Working on a clone" above describes, which makes the clone and brings its commits back.

### Extra directories

`--mount HOST` mounts a host directory at `/mnt/<basename>`, read-write, and `--mount HOST:ro` mounts it read-only.
The option may be repeated:

```sh
./agent.sh --in-place --mount ~/reference:ro --mount ~/scratch
```

### The shared `node_modules`

This applies to a run with `--in-place` or `--workdir`. A unit run has a clone with a `node_modules` of its own,
which the host never installs into. In place, the sandbox mounts the project at `/work` as it is on the host,
`node_modules` included. The host and the sandbox therefore share one `node_modules`: an install on either side
writes into the same directory, and the container has none of its own.

npm installs a package that is limited to some platforms only on those platforms, and `npm ci` removes `node_modules`
before it installs. So an install on either side installs for that side's platform and removes what only the other
side's platform used, and nothing reports it. On a Linux host both sides are the same platform and nothing is lost.
A macOS host is the case where it matters:

* After an install in the sandbox, the host's macOS-only packages are gone. `fsevents`, which Playwright uses to watch
  files, is one. Playwright still runs without it, so the loss goes unnoticed
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

### The home volume

The agent's home, `/home/agent`, is a named volume in `container/compose.yml`, the one writable place that survives a
container. It holds both harnesses' credentials and state and the npm cache, so authentication happens once.

Docker fills a named volume from the image, ownership included, only the first time an empty volume is mounted, and
never changes it afterwards. The agent is always the host user's uid, set when the image is built. So a volume first
filled by an image whose agent had another uid stays owned by that uid, and the agent then cannot write its own home.
The entrypoint checks the owner of `/home/agent` against the agent's uid before it drops to the agent, and when they
differ it refuses to start, naming both uids and how to recover:

```
[entrypoint] FATAL: /home/agent is owned by uid 1000, but the agent is uid 501, so the agent cannot write its home.
Recover by removing the project's agent-home volume, which discards the harnesses' saved logins, and starting again.
The volume is named <project>_agent-home, where <project> is the Compose project's name, set as 'name:' in
agent/compose.project.yml. Find the exact name with docker volume ls, then:
  docker volume rm <project>_agent-home
```

That is: the home volume was created by an image for a different user, and the agent cannot write it. `<project>`
is not the repository's name but the Compose project's, the `name:` key in the project's own
`agent/compose.project.yml`, and the volume Docker names after it. A mismatched home is a one-off state: once the
volume is removed, the next start creates a new one owned by the agent.

### The harness versions

The image holds Claude Code and OpenCode. For each on its own, the version is the first of these that exists:

1. the version the project's `agent/compose.project.yml` gives
2. the version installed on the host

The kit names no version of either harness. With neither of the two, the image gets the latest published version
at the time it is built, and the wrapper says which, in one line, wrapped here:

```
agent.sh: neither the project nor the host gives a version of OpenCode, so the image is built with the latest
published, 1.18.34.
```

The sandbox then keeps that version until the image is built again, whatever is published in the meantime.
`./agent.sh --in-place --rebuild` builds it again, and is how such a sandbox gets a newer one. A build for another
reason, such as an update of the other harness on the host, brings the latest too. The wrapper finds the latest
with `npm view <package> version` on the host, so the build needs `npm` on the host for this. It asks only when it
is about to build: a start that builds nothing asks the registry nothing, and neither does a build for which the
project or the host gives both versions.

When the latest cannot be found, because the registry is not reached, `npm` is not on the `PATH`, or its answer is
not a version, the wrapper stops. It builds nothing and starts nothing, although an image may exist. It prints two
lines, the second wrapped here:

```
agent.sh: could not find the latest published version of OpenCode: 'npm view opencode-ai version' gave none.
Give a version in agent/compose.project.yml, under services.agent.build.args as OPENCODE_VERSION, or install
OpenCode on the host.
```

Either gets past it: a version in the project's file, as below, or the harness on the host.

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

The host's version is what `claude --version` and `opencode --version` print, for the command on the `PATH` of
whoever runs `./agent.sh`. A harness that is not there, or that is reached only through a shell alias, counts as
not installed. So does one whose command is there and prints no version, and the wrapper says so at each start:

```
agent.sh: 'claude --version' printed no version, so Claude Code counts as not installed on the host.
```

At each start the wrapper compares the versions it wants with those the image was built with, which the image
holds as two labels, and builds the image again by itself when they differ, saying which harness and why:

```
agent.sh: the image holds Claude Code 2.1.288 and 2.1.289 is wanted, from the host. Rebuilding.
agent.sh: the image records no OpenCode version and 1.18.34 is wanted, from the host. Rebuilding.
```

So no flag is needed after a harness is updated on the host. For a harness with neither source there is nothing
to compare: the sandbox keeps the version the image records, and the wrapper builds only when the image records
none. An image built by a release that did not write the
labels records no version, and is built again at the first start. When that build fails, for example with no
network, the sandbox does not start, although an image exists.

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
  login command for OpenCode below names a method that exists, that the developer's status line shows through the
  managed settings, and that the environment variables and the configuration file the image sets do switch
  self-update off
* What a developer sees when a version breaks one of these: the harness's own error, such as
  `Unable to connect`, or a feature that is missing, with the refused host in `/run/egress-proxy.log`; a login
  method OpenCode does not know; a blank status line; an update attempt that fails against the read-only root and
  the firewall; or, for a version that is not on the npm registry, a build that fails with npm's error
* To recover, in the order of least effort: add the refused host to the project's `ALLOWLIST`, or hold a version
  that works in the project's `agent/compose.project.yml`, as above. Holding the versions the image already has,
  without committing the edit, is also how to start the sandbox while a build cannot run

### The status line

A developer's own Claude Code status line is shown in the sandbox. When `~/.claude/statusline-command.sh` is a file
on the host as the sandbox starts, the wrapper mounts it read-only at `/etc/claude-code/statusline-command.sh`,
together with the kit's `container/claude-managed-settings.json` at `/etc/claude-code/managed-settings.json`, whose
one setting runs the script with `bash`. With no such file on the host, neither is mounted and the sandbox is as it
was.

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

### Logging in to a model provider

A harness is logged in to its model provider once per home volume, from the sandbox's shell, and the login is kept
there.

A login that sends the browser back to a port on `localhost` cannot complete in the sandbox. The browser is on the
host and the harness listens inside the container, which publishes no port and whose firewall drops every inbound
connection. That is deliberate: nothing reaches into the sandbox from outside. Use a login that needs no callback.

For OpenAI in OpenCode with a ChatGPT account, that is:

```
opencode auth login -p openai -m "ChatGPT Pro/Plus (headless)"
```

The method's label is the one OpenCode used when this was written, and another version may name it differently. It
prints an address and a code to enter there, in any browser, and completes on its own once the code is accepted.
The kit admits the two hosts this login needs itself, `auth.openai.com` to sign in and `chatgpt.com` for the prompts,
so the project adds nothing for it. A login with an API key needs `api.openai.com` in the project's `ALLOWLIST`
instead.

When a login or a prompt fails for a host that is not on the allowlist, the refusal is in the proxy's log:
`grep 'not allowlisted' /run/egress-proxy.log`.

### Egress

The sandbox's egress is bounded by hostname. What leaves the container is DNS to its resolvers, the local model
server's host and port, and HTTPS on port 443 to the allowlisted hosts. Everything else is denied, whatever its port
or address. "The local model server" below says where that host and port are set.

The allowlist is two lists together. `KIT_ALLOWLIST`, in the kit's `container/compose.yml`, holds the hosts the kit
itself needs: `api.anthropic.com`, which is the probe host and the API Claude Code uses, `platform.claude.com`, which
Claude Code contacts at start-up when it holds no saved login, `models.opencode.ai`, from which OpenCode fetches its
model catalog, `auth.openai.com` and `chatgpt.com`, which OpenCode logged in with a ChatGPT account uses to sign in
and to send its prompts, the npm registry and `agentrite.ritenoar.com`. `ALLOWLIST`, in the project's
`agent/compose.project.yml`, holds what the project needs besides, and may be empty or left out. Both are checked the
same way, and a host in both is admitted once. A kit release that needs another host adds it to `KIT_ALLOWLIST`, with
no change to any project.

The entrypoint redirects every outbound connection on port 443 to `container/egress-proxy.mjs`, which runs as its own
unprivileged account. The proxy reads the hostname from the TLS ClientHello, where it travels in the clear, and
admits the connection only if that host is allowlisted. It then resolves the host itself and connects there, never to
the address the client asked for, so an allowlisted name sent to some other address does not reach that address. It
terminates no TLS and installs no certificate: it forwards the connection's bytes unchanged, and the client validates
the origin's own certificate. A refused client fails with a TLS `unrecognized_name` alert, and the proxy logs one
line for each connection it allows or refuses to `/run/egress-proxy.log`, which the agent can read.

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

### The local model server

The sandbox reaches one host and port outside the allowlist: `MODEL_SERVER_HOST` on `MODEL_SERVER_PORT`, which
`container/compose.yml` sets to `host.docker.internal` and `11434`, and nothing else on the host.

On a Linux host whose firewall denies incoming traffic by default, `ufw` for example, allow the Docker bridge subnets
to that port on the host, or the container cannot reach the model.

## The kit's own tests

```sh
npm test
```

It runs node's built-in test runner over `tests/`, and the tests need no install. Releasing does: `infra/` needs
`aws-cdk-lib` and the CDK CLI, which are the kit's devDependencies, so run `npm ci` first. `deploy.sh` does that
itself.

The kit's own `changes/` go through the change check like any project's, wired the same way:

```sh
npm run check-changes
```

It runs the check from the released kit in `node_modules`, not from this repository's `scripts/`, so it needs
`npm ci` first.

## The kit's own copy of the kit

The kit is also a devDependency of itself, installed from a release by its URL like in any project, so that
`node_modules/@ritenoar/agentrite/` exists here too. `AGENTS.md` sends agents to the process and roles there, which
means work on the kit follows the released instructions rather than the working copy it may be changing. Changes are
made at the repository root, never under `node_modules`, and the installed copy moves to a newer release only by a
deliberate update, as described above. A release makes that update as one of its own steps, which
[`RELEASING.md`](RELEASING.md) gives.

The repository also runs the kit's sandbox, from the installed release, with `./agent.sh`, as any project does. Work
on the sandbox itself is therefore done inside the sandbox the last release built, not the working copy's: a change
to `container/` does not alter the sandbox the agent making it runs in. Trying such a change is done from the host, as
described below. `./deploy.sh` stays on the host: releasing needs AWS credentials and hosts the sandbox does not
reach.

### Trying the working copy's sandbox

`./agent-dev.sh` runs the sandbox from the working copy: `container/agent.sh`, `container/compose.yml`, the
Dockerfile, the entrypoint and the proxy as they are in the working tree, with the repository's
`agent/compose.project.yml`. It takes what `./agent.sh` takes, for example `./agent-dev.sh --in-place npm test`.

* It is this repository's own file. It is not in the package, and `init` and `refresh` do not write it
* It builds the image on every start, so a change is in the sandbox that starts
* It takes the harness versions as `./agent.sh` does. It builds on every start, so on a host without a harness it
  asks the registry at every start and gets the latest published version of that harness
* It has its own Compose project and image, `ritenoar-agentrite-agent-dev`, and its own home volume,
  `ritenoar-agentrite-agent-dev_agent-home`, through `AGENT_PROJECT_NAME` in `agent/compose.project.yml`. The image
  and the saved logins of `./agent.sh` are not touched, and both sandboxes can run at once
* A unit run of it has clones of its own, under its own Compose project name:
  `~/.local/state/agentrite/ritenoar-agentrite-agent-dev/<branch>`
* It runs on the host. A sandbox has no Docker, so an agent working inside one cannot run it
* The home starts empty and lasts. To empty it again: `docker volume rm ritenoar-agentrite-agent-dev_agent-home`
* To remove everything it created: that volume, `docker network rm ritenoar-agentrite-agent-dev_default` and
  `docker image rm ritenoar-agentrite-agent-dev`

## Releasing

A release is a tarball of the kit served from `https://agentrite.ritenoar.com/`, which a project installs from its
URL. `infra/` is the CDK app that serves it: a private bucket, a CloudFront distribution in front of it, a certificate
in us-east-1 because CloudFront takes no other, and the DNS record in the existing `ritenoar.com` hosted zone, which
it looks up rather than owns. None of it ships to a project.

A release is made with the `/release` skill, in a Claude Code session on the host, on `master`. The skill is
`.claude/skills/release/SKILL.md`, which holds one line that sends the agent to [`RELEASING.md`](RELEASING.md). That
file holds every step, and a human, or an agent in another harness, follows it directly.

In short: an agent sees that the suite passes and drafts the release notes in `CHANGELOG.md`; the human reads them,
corrects them and picks the version; the agent commits the notes; the human runs `npm version` and `./deploy.sh`;
the agent moves this repository's own dependency on the kit to the release; and the human pushes `master` and the
tag.

Releasing runs on the host only. It needs AWS credentials, and those never enter the sandbox.
