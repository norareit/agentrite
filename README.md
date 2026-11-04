# AgentRite

A kit for running coding agents by a fixed process.

The shared instructions and tooling that coding agents work under, in one place so that an improvement is made once
rather than once per project. Projects install it as the npm package `agentrite` and keep only what is
specific to them.

By default the kit holds:

* the process, in `process.md`: how a change is specified, planned, built, reviewed, recorded and frozen
* the standards, in `standards.md`: the rules on how text, documentation, commits, code and tests are written
* four opinionated roles, the specifier, the planner, the implementer and the reviewer, each a file under `roles/`
* the sandbox, a container that an agent runs in

The process is the same in every project. A project can replace the standards, and each of the roles, with a file of
its own, named in its `agentrite.json`. See [Replacing a role or the standards](#replacing-a-role-or-the-standards).
A project can add roles of its own as well. See [Adding a role](#adding-a-role).

* [The name](#the-name)
* [What is here](#what-is-here)
* [How it works](#how-it-works)
* [Commands](COMMANDS.md#commands)
* [The orchestrator](ORCHESTRATOR.md)
* [Installing it into a project](#installing-it-into-a-project)
* [Git hooks](#git-hooks)
* [The project's settings](#the-projects-settings)
* [Replacing a role or the standards](#replacing-a-role-or-the-standards)
* [Adding a role](#adding-a-role)
* [Updating a project to a newer kit](#updating-a-project-to-a-newer-kit)
* [The sandbox](#the-sandbox)

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
| `process.md`         | How work is done: the changes process, the roles, the commit prefixes                     |
| `standards.md`       | The rules on how text, documentation, commits, code and tests are written                 |
| `orchestrator.json`  | The orchestrator's default definition, which a project may copy and change                |
| `CHANGELOG.md`       | What each release changed, and what is worth knowing when updating to it                  |
| `README.md`          | What the kit is and how a project uses it                                                 |
| `LICENSE`            | The MIT License, which the kit is open source under                                       |
| `SANDBOX.md`         | The reference of the sandbox                                                              |
| `COMMANDS.md`        | Every command a project runs, with every argument and option, and the exit statuses       |
| `ORCHESTRATOR.md`    | The orchestrator: its definition, how a run ends and what it keeps                        |
| `package.json`       | The package's name, its version and the commands it installs                              |
| `roles/`             | The specifier, planner, implementer and reviewer instructions                             |
| `templates/changes/` | The starting `spec.md`, `plan.md` and `record.md` for a change unit                       |
| `templates/project/` | The files `agentrite init` writes, its `commit-msg` hook among them, and `config`'s       |
| `scripts/`           | `check-changes.mjs`, the freeze check, and the `agentrite` command                        |
| `container/`         | The agent sandbox: image, entrypoint, egress proxy, Compose file, wrapper, commit checker |

Nothing here names a particular project. A rule that would need rewording to make sense elsewhere belongs in the
project's own `AGENTS.md`, which links here for the rest.

## How it works

A change is worked as a unit, a directory under `changes/`, by four roles in this order:

| Role        | Is given                      | Produces                                                             |
|-------------|-------------------------------|----------------------------------------------------------------------|
| Specifier   | A request                     | What the unit must make true: its `spec.md`, or a task's `record.md` |
| Planner     | An approved unit              | The unit's `plan.md`: the ordered tasks the implementer then follows |
| Implementer | An approved unit and its plan | The implementation, with the plan ticked and the record kept         |
| Reviewer    | An implemented unit           | Its findings, which it returns and does not apply                    |

A task has no plan, and a bug may have none, which its record then says; the implementer is given such a unit
without one. The rules each role works by are in `process.md`, the project's standards and the role's own file: the
kit's `standards.md` and the files under `roles/`, unless the project replaced them.

Each of the four roles covers one stage of the process and moves the unit through the statuses. A project can add
roles that run just before or just after one of the four, within its stage, and that move it through none. See
[Adding a role](#adding-a-role).

The writers current workflow:

1. Use Claude Code with Opus as the `specifier` role and ask it to refine a feature (or bug or task) together
2. Read the `spec.md` that comes out of this, ask for a few clarifications or corrections if necessary and approve it
3. Run the `sandbox.sh 0007` where `0007` is the change number. This cuts the branch and starts the container
4. Run Claude Code with Opus as the `planner` role and ask it to create a plan for feature 0007
5. Run Claude Code with Sonnet or OpenCode with Qwen 3.8 27b as the `implementer` role and ask it to implement the
   plan
6. Run OpenCode with GPT Sol as the `reviewer` role and ask it to review the code
7. Reopen Claude (`claude -c`) and ask the implementer to check the review and see which changes need to be made
8. Repeat step 6 and 7 until no more issues arise
9. Exit the container. This will fast-forward the branch on the host to the one from the container (which was a
   separate checkout!). At this point it is up to you how to handle the rest. You can create a pull request and check
   the changes yourself, or you can simply mark the change `implemented` and merge it back to the default branch

## Installing it into a project

The kit is the package `agentrite` on the npm registry, and a project adds it by its name:

```sh
npm install --save-dev agentrite
```

npm writes the package, with a range from the version it installed, under `devDependencies` of the project's
`package.json`, and the version, its address on the registry and an integrity hash into `package-lock.json`. The kit
assumes npm: `init` reads `package-lock.json`, and the sandbox's image installs from it.

Then set the project up from its root, naming only the harnesses it uses:

```sh
npx agentrite init claude opencode
```

A project whose default branch is not `master` names it:

```sh
npx agentrite init --default-branch main claude opencode
```

It prints each file it wrote, changed or skipped. It writes:

| File                          | What it is for                                                                       |
|-------------------------------|--------------------------------------------------------------------------------------|
| `agentrite.json`              | The project's settings, which the kit's commands read. See "The project's settings"  |
| `.claude/agents/*.md`         | For `claude`: a wrapper per role for Claude Code, pointing at the role's file        |
| `.opencode/agents/*.md`       | For `opencode`: the same for OpenCode                                                |
| `.agentrite/instructions.md`  | The list of the instruction files in use, which the kit writes from `agentrite.json` |
| `AGENTS.md`                   | The project's agent instructions, pointing at the list of the files in use           |
| `CLAUDE.md`                   | Imports the kit's `process.md`, the project's standards and `AGENTS.md`              |
| `opencode.json`               | For `opencode`: loads `process.md` and the standards. Amended if present             |
| `sandbox.sh`                  | The shim that runs the kit's sandbox from the project root. See "The sandbox"        |
| `sandbox/compose.project.yml` | The project's half of the sandbox configuration                                      |
| `.git/hooks/commit-msg`       | The hook that refuses a commit message the standards forbid. See "Git hooks"         |

* Every generated file is the project's own once written, and the project may edit any of them, but for the list
  `.agentrite/instructions.md`, which `refresh` writes as `agentrite.json` gives it. The list is committed, as the
  wrappers are
* The role files the wrappers point at, and the standards the list and `CLAUDE.md` name, are the kit's, as the
  default `agentrite.json` names them. See "Replacing a role or the standards"
* A project without the sandbox runs `npx agentrite init --no-sandbox claude opencode`, which leaves out `sandbox.sh`,
  `sandbox/compose.project.yml` and `.dockerignore`, as "agentrite init" in `COMMANDS.md` says, and writes `sandbox` as
  `false` in `agentrite.json`
* `init` never regenerates one: a file it would create that already exists is left as it is and reported as
  skipped, so running it again only adds what is missing. In a project that has its `agentrite.json`, that is
  `npx agentrite init` with no argument
* The OpenCode wrappers are written with `mode: all`, which makes each role both a primary agent and a subagent.
  The roles are therefore also offered among the primary agents in OpenCode's own interface
* `init` refuses to run, writing nothing, when `package.json` has no `name`, unless the project is without the
  sandbox: `--no-sandbox`, or `sandbox` `false` in its `agentrite.json`

The files a project is expected to edit are these:

* `agentrite.json`, where a setting is not what the project has. See "The project's settings"
* `AGENTS.md` has a marked section for what is specific to the project, such as its house style, its code rules and
  how its tests run, and keeps only that: what holds for every project is in the files the list names. The three
  sections above it,
  Development Guidelines, Roles and Changes in this project, are what make the kit's instructions reach an agent, and
  are best kept. See "How the kit's instructions reach an agent"
* `sandbox/compose.project.yml` holds the Compose project and image names, both derived from the `name` in
  `package.json`, the `PLAYWRIGHT_VERSION` build argument when the project has Playwright, the memory and CPU limits,
  and the project's `ALLOWLIST`. The allowlist lists only what the project needs beyond what the kit admits itself.
  See "Reaching more hosts" of [`SANDBOX.md`](SANDBOX.md)
* The role wrappers, to pin a model per role

`CLAUDE.md` is best left as written, and what it must keep is in "How the kit's instructions reach an agent".
`sandbox.sh` and `.agentrite/instructions.md` are not files to edit, and of what a project adds to a role wrapper
only a pinned model lasts. See "Updating a project to a newer kit".

A file that already exists:

* When `AGENTS.md` already exists, `init` leaves it untouched and prints the three sections it would have written,
  ready to be pasted in. An agent does not see the kit's instructions until the existing file holds them, so paste
  in whichever it lacks. When the file does not name `.agentrite/instructions.md`, `init` says so in a notice after
  the sections. See "How the kit's instructions reach an agent"
* When `CLAUDE.md` already exists, it is left untouched too, and must hold the lines
  `@node_modules/agentrite/process.md`, `@` and the path of the project's standards, and `@AGENTS.md`. With `claude`
  among the harnesses, `init` prints a notice that names the ones it lacks. See "How the kit's instructions reach an
  agent"
* When `opencode.json` already exists, with `opencode` among the harnesses, `init` amends it as said below, or leaves
  it with a notice when it cannot
* An existing `sandbox/compose.project.yml` is left as it is

`init` also amends three files, adding only what is missing:

* `package.json` gains a `check-changes` script, unless it has one, keeping every other key, their order and the
  indentation:

  ```json
  "scripts": {
    "check-changes": "node node_modules/agentrite/scripts/check-changes.mjs"
  }
  ```

* `.dockerignore` is written when there is none. When it keeps any file of the kit's `container/` directory out of
  the build context, whatever its patterns, the exception is appended, so that the image build can reach the kit.
  Otherwise the file is left alone
* `opencode.json`, with `opencode` among the harnesses, is written when there is none. When it is a JSON object,
  whichever of `node_modules/agentrite/process.md` and the path of the project's standards its `instructions` list
  lacks is added at the end of it, in that order, or the list is added with both, keeping every other key, their order
  and the indentation. When it cannot be amended, because it cannot be read, is not JSON, is not a JSON object, or has
  an `instructions` that is not a list, it is left with a notice of what to add by hand. One that loads both already is
  left alone

A project whose `.dockerignore` excludes `node_modules` must let that one directory's files back in:

```
node_modules
!node_modules/agentrite/container/**
```

The exception names the files rather than the directory: `!node_modules/agentrite/container` alone does
not bring back a kit file that a pattern excluded by name.

A project that depends on Playwright gets a sandbox with its browser:

* `init` takes the version from `package-lock.json` and writes it into `sandbox/compose.project.yml` as the
  `PLAYWRIGHT_VERSION` build argument. When the lockfile resolves no `playwright`, `init` writes the compose file
  without the argument, and the sandbox is built without a browser. `init` exits 0 either way
* The browser is in the image when the project's compose file gives `PLAYWRIGHT_VERSION` under
  `services.sandbox.build.args`, and not otherwise: the build argument alone decides
* A project that starts using Playwright adds the argument by hand, as the version its `package-lock.json`
  resolves, and one that stops removes it, and both rebuild with `./sandbox.sh --in-place --rebuild`. `init` and
  `refresh` never rewrite `sandbox/compose.project.yml`, which is the project's own

`init` fills in the templates in the kit's `templates/project/`, which ship in the package, at
`node_modules/agentrite/templates/project/`. A project set up or repaired by hand starts from the same
files, filling in each `{{placeholder}}` itself.

### How the kit's instructions reach an agent

A harness loads the kit's `process.md` and the project's standards into every session, and an agent finds the role
files from `AGENTS.md`, because of what three files of the project hold. The standards are the file that `standards`
in `agentrite.json` names, which is `node_modules/agentrite/standards.md` unless the project replaced it, and the
paths below are those of a project that did not. Each file, what it must hold, and the harness that reads it:

* `AGENTS.md`, read by Claude Code and OpenCode: the sections Development Guidelines, Roles and Changes in this
  project, as `init` writes them. They call the files that `.agentrite/instructions.md` names required reading, link
  that list, and name no role file and no standards file themselves. `init` and `refresh` print a notice for an
  `AGENTS.md` that is missing or does not hold the text `.agentrite/instructions.md`
* `CLAUDE.md`, read by Claude Code: the lines `@node_modules/agentrite/process.md`,
  `@node_modules/agentrite/standards.md` and `@AGENTS.md`, each on a line of its own and outside a code span or a fenced
  block. From them Claude Code loads `process.md`, the standards and `AGENTS.md` into every session. With standards of
  the project's own, the second line is `@` and their path, and the line `@node_modules/agentrite/standards.md` is
  removed, since Claude Code would load both sets of rules; `init` and `refresh` print a notice for it
* `opencode.json` at the project root, read by OpenCode, and needed only with `opencode` among the harnesses:
  `node_modules/agentrite/process.md` and `node_modules/agentrite/standards.md` in its `instructions` list. From it
  OpenCode loads `process.md` and the standards into every session, beside `AGENTS.md`, which it reads by itself. With
  standards of the project's own, their path stands in the place of the second, and the kit's is removed, as for
  `CLAUDE.md`

The list `.agentrite/instructions.md`, which the kit writes from `agentrite.json` with `init` and `refresh`, names by
their paths from the project root, each linked: the kit's `process.md`, the standards, and the file of each role, the
four first and then the roles of the project's own. It says that these are the files whose instructions hold in the
project, that the standards are the project's whole set of rules on how text, documentation, commits, code and tests are
written, and that the list is not edited by hand. The harnesses do not load it. It is there for an agent that reads
files itself, from `AGENTS.md` or from a kit role file, which sends it to the standards and to the other role files by
the list.

The three lines of `CLAUDE.md` are shown here in a block. In the file they are not in one, since Claude Code does not
read a line inside a fenced block or a code span:

```
@node_modules/agentrite/process.md
@node_modules/agentrite/standards.md
@AGENTS.md
```

The `opencode.json` that `init` writes into a project that has none:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    "node_modules/agentrite/process.md",
    "node_modules/agentrite/standards.md"
  ]
}
```

* `init` puts these into each of the three files it writes, and into an `opencode.json` it can amend. For an
  `AGENTS.md` or a `CLAUDE.md` that exists, and for an `opencode.json` it cannot amend, it only prints a notice of
  what is missing. The project then adds that by hand
* Neither harness reports a file that lacks them. There is no error: a session starts without the kit's instructions in
  its context, and reads them only if the model follows the link to the list in `AGENTS.md`, and from it to the files
* `refresh` never adds them to `CLAUDE.md` or `opencode.json`. It prints a notice on each run for as long as one of
  them lacks them, so a project that leaves them out on purpose gets that notice on every `refresh`

### On a fresh clone

A fresh clone of a project has no kit. `npm ci` installs it with the project's other dependencies, at exactly the
release and integrity hash `package-lock.json` records, and fails rather than install anything else.

Installing and updating are `npm ci` and `npm install`, which run on the host and inside a project's sandbox alike:
the sandbox admits the hosts they need itself. See "Reaching more hosts" of `SANDBOX.md`. A project's `sandbox.sh`
runs the wrapper from `node_modules`, though, so a fresh clone needs `npm ci` on the host before its sandbox can
start.

A clone does not copy git's hooks, so a fresh clone has no `commit-msg` hook until `npx agentrite refresh` writes it.
See [Git hooks](#git-hooks).

The kit is a development dependency. An install that leaves those out, as `npm ci --omit=dev` and an `npm ci` with
`NODE_ENV=production` do, installs no kit, and `npx agentrite` and `npm run check-changes` do not run there. A job
that runs the change check therefore installs with a plain `npm ci`.

## Git hooks

The kit puts one git hook in a project, `commit-msg`, which git runs after a commit message is written and before
the commit is made. It refuses a message that holds a trailer the standards forbid, `Co-Authored-By` or
`Claude-Session`, and git then makes no commit and shows what it printed. The rule is the one
[check-commit-message](COMMANDS.md#check-commit-message) gives, since the hook runs that checker.

The hook is written into the hooks directory that git uses for the project: `.git/hooks` unless the project sets
`core.hooksPath`, which git then reads in its place, a directory outside the project included. In a linked worktree
it is the hooks directory of the repository the worktree belongs to. `init` and `refresh` print its path relative to
the project root when it is under it, as `.git/hooks/commit-msg`, and as it is otherwise.

The hook is a shell script the owner may execute. Its second line is the kit's mark:

```sh
# agentrite: commit-msg hook
```

It finds the top of the work tree that git runs it in and runs
`node <top>/node_modules/agentrite/container/check-commit-message.mjs` with the path git gives it, so it uses the
checker of the kit installed in that work tree. When it cannot run the checker it refuses the commit too, and says
which of the two it is and what to do:

* `commit-msg: the commit message checker is not at <path>.`, when the work tree has no kit under `node_modules`. Its
  dependencies are installed in that work tree, as with `npm ci`, and the commit is made again. Each worktree needs
  its own, as the project's other commands do
* `commit-msg: node is not on the PATH that git gives the hook, ...`, when git was started with a `PATH` that holds
  no `node`, as a git client outside a terminal may be. `node` is made reachable from git, and the commit is made
  again

What `init` and `refresh` do with it:

* `init` writes the hook where nothing is at its path, making the hooks directory when it is missing, and prints
  `wrote <path>`. A file already there, of whatever content, it leaves as it is, and prints
  `skipped <path>, which exists`
* `refresh` writes the hook where nothing is at its path, and prints `wrote <path>`. A regular file that holds the
  mark as a line of its own is the kit's: it rewrites it as this release writes it, and makes it executable, printing
  `refreshed <path>`, or `up to date <path>` when there was nothing to change. Anything else at the path, a file
  without the mark or a symbolic link among it, is the project's own: it leaves it as it is, prints no line for it,
  and prints a notice that the hook at that path is not the kit's, that commit messages are then not checked for the
  trailers unless that hook calls the checker, and that this section says how
* Outside a git repository neither writes a hook. Each prints a notice that no hook was written and why, that the
  project is not inside a git repository or that git could not be run, with what git said. The notice changes
  neither what else they write nor their exit status

A project with a `commit-msg` hook of its own keeps it, and calls the checker from it, from the top of the work tree:

```sh
node node_modules/agentrite/container/check-commit-message.mjs "$1" || exit 1
```

A project that does not want the hook puts a file of its own at the path, which `refresh` then leaves as it is.

`git commit --no-verify` skips the hook, and a commit that git makes without running `commit-msg`, as some steps of
`cherry-pick`, `revert` and `rebase` do, is not checked. The hook in the sandbox is the image's, and the clone's is
not run there. See "Commit messages" in [`SANDBOX.md`](SANDBOX.md).

## The project's settings

A project's settings are in `agentrite.json` at the project root, a JSON object with seven keys:

| Key             | What it holds                                         | What reads it                        |
|-----------------|-------------------------------------------------------|--------------------------------------|
| `defaultBranch` | The branch that units are cut from and compared with  | Change check, unit run, `approve`    |
| `harnesses`     | The harnesses the project uses, as a list             | `init` and `refresh`                 |
| `sandbox`       | `true` with the sandbox, `false` without it           | `init` and `refresh`                 |
| `bell`          | `true` for a sandbox that rings, `false` for none     | `./sandbox.sh`, at each start        |
| `standards`     | The path of the standards file the project uses       | `init` and `refresh`                 |
| `orchestrator`  | The path of the orchestrator's definition, or `false` | `orchestrate`                        |
| `roles`         | Each role's name, with the path of its file in use    | `init`, `refresh`, `roles` and `run` |

The default file, which `npx agentrite config` writes, and `npx agentrite init claude opencode` too:

```json
{
  "defaultBranch": "master",
  "harnesses": ["claude", "opencode"],
  "sandbox": true,
  "bell": true,
  "standards": "node_modules/agentrite/standards.md",
  "orchestrator": "node_modules/agentrite/orchestrator.json",
  "roles": {
    "specifier": "node_modules/agentrite/roles/specifier.md",
    "planner": "node_modules/agentrite/roles/planner.md",
    "implementer": "node_modules/agentrite/roles/implementer.md",
    "reviewer": "node_modules/agentrite/roles/reviewer.md"
  }
}
```

* `init` writes the file from its arguments in a project that has none, and `config` writes the default file. The
  default branch is `master` unless `--default-branch` or an edit says otherwise
* The file is committed
* All seven keys are required. `defaultBranch` is a string that is not empty, `harnesses` is a list of one or more of
  `claude` and `opencode`, in which a name given more than once counts once, and `sandbox` and `bell` are each `true`
  or `false`, not a string. A key the kit does not know is ignored
* `bell` says whether the harnesses in the sandbox ring the terminal's bell when they need the developer or stop, as
  "The bell" in `SANDBOX.md` says. It is read at each start of the sandbox, so a change holds from the next start. It
  has no effect outside the sandbox: the harnesses on the host are the developer's, and the kit changes nothing of
  their configuration
* `orchestrator` names the definition that `agentrite orchestrate` runs, or holds `false` for a project that does not
  use the orchestrator, which `init --no-orchestrator` writes. It is `false` or a path, not a string that says
  `false`. The file `config` and `init` write names the kit's default definition, and a project that wants another
  copies it and names the copy, as "The orchestrator" in `ORCHESTRATOR.md` says
* `standards` and `roles` name the kit's own files in the file `config` and `init` write. A project uses another file
  by naming its path instead, as "Replacing a role or the standards" says. `roles` holds the four names
  `specifier`, `planner`, `implementer` and `reviewer`, each with the path of its file, and may hold roles of the
  project's own besides, as "Adding a role" says. Two or more roles may name the same file, each role then getting its
  wrappers, with that file's description, and its line in the list
* The name of a role of the project's own is one or more words of the lowercase letters `a` to `z`, joined by single
  hyphens, as `security-reviewer`. A name of another form is refused, naming the name and the form. A name that a
  harness has for an agent of its own is refused too, whichever harnesses `harnesses` names and without regard to case,
  because a wrapper of that name and the harness's agent would take each other's place. The names are:

  | Harness     | Its own agents                                                                                  |
  |-------------|-------------------------------------------------------------------------------------------------|
  | Claude Code | `Explore`, `Plan`, `general-purpose`, `claude`, `statusline-setup`, `claude-code-guide`, `fork` |
  | OpenCode    | `build`, `plan`, `general`, `explore`, `scout`, `compaction`, `title`, `summary`                |

  The message names the name and the harness. `agentrite roles` and the list `.agentrite/instructions.md` give the
  four first and then the roles of the project's own, in the order of the file
* A path in `standards`, `orchestrator` or `roles` is a string that is not empty, relative to the project root, that
  does not lead outside the project, and that names a regular file in the project's working tree. Whether it leads
  outside is judged on the path as it is written, with no symbolic link followed. Whether it names a file is judged with
  symbolic links followed, so a kit linked into `node_modules`, as `npm link` does, is taken
* The file is read by `refresh`, by `init` in a project that has one, by `agentrite roles`, by `agentrite run`, by
  `agentrite orchestrate`, by `agentrite approve`, by the change check, and by `./sandbox.sh`. Every form of
  `./sandbox.sh` but `--connect` reads `bell` at each start, and judges no other key of the file, unless a unit run
  cuts a branch, which reads the whole file. `--connect` does not read it
* A command that reads the file refuses in a project that has none, and names `npx agentrite config` as the command
  that writes one. It refuses a file that is not valid too, also when what is wrong is a key the command does not
  use, and names the file, the key, what is wrong with it and what it must hold. A path that names no file is refused
  so by every command that reads the file, also one that does not use it: the message names the key, the path and
  that there is no file at it. Either way it writes and changes nothing and exits with 1. No
  command takes a missing file for the default file, or a missing key for its default value
* A start of `./sandbox.sh` that cuts no branch judges `bell` alone. It refuses a project with no file, a file that
  is not a JSON object, one that lacks `bell` and one whose `bell` is neither `true` nor `false`, names the file, the
  key, what it holds or that it is missing, and what it must hold, starts nothing and exits 1. Another key at fault
  does not stop it

A setting is changed by editing the file by hand. What to run afterwards:

* `defaultBranch`: nothing
* `bell`: nothing. It holds from the next start of the sandbox
* `orchestrator`: nothing. It holds from the next run of `agentrite orchestrate`
* A harness added to `harnesses`: `npx agentrite refresh` writes its wrappers. The wrapper directories that the
  project's `AGENTS.md` lists are the project's to bring up to date
* `sandbox` set to `true`: `npx agentrite init` writes the files of the sandbox that are missing
* A role of the project's own added to `roles`: `npx agentrite refresh` writes its wrappers and the list
* A role taken out of `roles`, or renamed: `npx agentrite refresh` removes the wrappers of the old name, as "agentrite
  refresh" in `COMMANDS.md` says, and writes those of the new one
* A harness taken out, or `sandbox` set to `false`: no command removes a file, and what is left is removed by hand
* `standards` or a file in `roles` changed: `npx agentrite refresh` rewrites the wrappers and the list, and prints the
  notices of "agentrite refresh" on a `CLAUDE.md` and an `opencode.json` that do not load the new standards, or still
  load the kit's beside them. The project changes those two files by hand

## Replacing a role or the standards

A project can use a file of its own in the place of the kit's `standards.md`, and in the place of any of the kit's
four role files, and keep everything else the kit wires up. It names the file's path, from the project root, in
`standards` or in the role's entry of `roles` in `agentrite.json`, commits the file, and runs `npx agentrite refresh`.
The process in `process.md` is the same in every project and is not replaced.

A role file opens with front matter that holds its description, which is what a harness dispatches the role on and
what `agentrite roles` lists. The front matter opens and closes with a line `---`, and holds the description and
nothing else, in one of two forms. On one line:

```markdown
---
description: Reviews a finished change unit against this project's checklist. Dispatch it with the unit directory.
---
```

Or folded, the text on lines indented by two spaces, which are read as one line joined by spaces:

```markdown
---
description: >-
  Reviews a finished change unit against this project's checklist.
  Dispatch it with the unit directory.
---
```

A command that needs the description refuses a role file without front matter in one of these forms, names the file
and the form it must have, and writes nothing. After the front matter, a role file holds:

* first, an instruction to read `process.md` and the project's standards, with a link to `process.md` that works from
  where the file is, such as `node_modules/agentrite/process.md` from the project root. The kit's role files say that
  the standards are the file `.agentrite/instructions.md` names, and a project's can name its own file directly
* what the role is given, what it produces and the status it sets, in terms of the documents of `changes/` and the
  statuses that `process.md` gives: a spec the human approves, a plan where the kind needs one, the work, and a review
  whose blocking findings `implemented` waits on. Each role covers one of these, and none is left out

A standards file is the project's whole set of rules on how text, documentation, commits, code and tests are written:
with it, the kit's `standards.md` no longer holds in the project. A broken rule in it blocks `implemented` as a broken
rule of the kit's does.

* A replaced file gets none of the kit's later improvements to the file it replaces. A new release changes the kit's
  files under `node_modules`, and not the project's
* The file is committed. A unit run of the sandbox works in a clone, which holds only what is committed, and every
  command that reads `agentrite.json` refuses a path that names no file
* What a project adds to a role without replacing it, as "our reviewer also checks the migrations", belongs in the
  project's `AGENTS.md`, which every session reads. The kit has no file for an addition to a role
* Two roles may name one file, as one file for the specifier and the planner. The process still has the two done at
  their own moments, and the file says how to do both

## Adding a role

A project can add roles of its own to the kit's four. An extra role adds no stage and no status: the four stages of
`process.md` and its five statuses stay as they are, and each of the four roles still covers one stage and moves the
unit through the statuses. An extra role runs just before or just after one of the four, within that role's stage, and
moves the unit through none. Some examples:

| Extra role          | Runs                         | The unit's status while it runs |
|---------------------|------------------------------|---------------------------------|
| A spec reviewer     | After the specifier          | `draft`                         |
| A plan reviewer     | After the planner            | `approved`                      |
| A test writer       | Before the implementer       | `approved` or `in-progress`     |
| A security reviewer | Before or after the reviewer | `in-progress`                   |

It is added by its name and the path of its file in `roles` of `agentrite.json`, after the four, with the file
committed, and then `npx agentrite refresh`, which writes its wrappers for each harness and names it in the list
`.agentrite/instructions.md`. A name is of the form "The project's settings" gives. Removed from `roles`, with
`npx agentrite refresh` run after, its wrappers are removed too.

```json
  "roles": {
    "specifier": "node_modules/agentrite/roles/specifier.md",
    "planner": "node_modules/agentrite/roles/planner.md",
    "implementer": "node_modules/agentrite/roles/implementer.md",
    "reviewer": "node_modules/agentrite/roles/reviewer.md",
    "security-reviewer": "rules/security-reviewer.md"
  }
```

The file of an extra role opens with the front matter of a role file, and then first with an instruction to read
`process.md` and the project's standards, as "Replacing a role or the standards" says of a role file. It also says:

* which of the four roles it runs before or after, what it is given and what it produces. It sets no status: the
  statuses stay with the four roles, and the kit cannot enforce this, so the file must say it
* where its findings go, such as to the human, to the role whose work it judged, or to the implementer. They do not
  block `implemented`; what blocks is in `process.md`. A project that wants a check to block makes it part of its
  reviewer, by replacing the reviewer's file
* that it writes at least one entry in the unit's `record.md`, as `as the <name>` with its name as `roles` gives it,
  each time it works on the unit. The kit's reviewer reads the file of each extra role that has such an entry and
  judges the work against it, as it does the files of the specifier, the planner and the implementer. An extra role
  with no entry did not work on the unit, and its file is not read

The kit does not yet run an extra role at its moment, and does not read where the role file says it runs. The human
dispatches it, in a session of the harness or with `npx agentrite run <name> <harness> <unit>`, at that moment.

## Updating a project to a newer kit

Install the newest release:

```sh
npm install --save-dev agentrite@latest
```

That changes only `package.json` and `package-lock.json`, which the project commits like any other change.
`npm outdated` reports when a newer release exists.

What a release changed, and what is worth knowing when updating to it, is in the kit's `CHANGELOG.md`, which after
the install is at `node_modules/agentrite/CHANGELOG.md`. It holds one section per release, newest first. A
project that skips releases reads every section between its old version and the new one.

A project with no `agentrite.json` first runs `npx agentrite config`, checks what it wrote against the project,
edits the file where the project differs, and commits it. See "The project's settings".

A project whose `agentrite.json` lacks `standards` and `roles` adds them, as the default file gives them, before any
command that reads the file runs again: until then every such command refuses the file. The two keys, after
`sandbox`:

```json
  "standards": "node_modules/agentrite/standards.md",
  "roles": {
    "specifier": "node_modules/agentrite/roles/specifier.md",
    "planner": "node_modules/agentrite/roles/planner.md",
    "implementer": "node_modules/agentrite/roles/implementer.md",
    "reviewer": "node_modules/agentrite/roles/reviewer.md"
  }
```

A project whose `agentrite.json` lacks `orchestrator` adds it before any command that reads the file runs again:
until then every such command refuses the file. The line, after `standards`, with `false` for a project that does not
use the orchestrator:

```json
  "orchestrator": "node_modules/agentrite/orchestrator.json",
```

A project whose `agentrite.json` lacks `bell` adds it before any command that reads the file runs again, and before
the sandbox starts again: until then every such command refuses the file, and every start but `--connect` is
refused. The line, after `sandbox`, with `false` for a project that wants no bell:

```json
  "bell": true,
```

The first start of the sandbox after the update builds its image again, since the image records the release of the
kit it was built from, and the wrapper says so before it builds.

Then bring the kit's own files in the project up to date, from the project root:

```sh
npx agentrite refresh
```

It rewrites the role wrappers of the harnesses that `agentrite.json` names, the list `.agentrite/instructions.md`,
`sandbox.sh`, and the `commit-msg` hook when it carries the kit's mark, as the new release writes them, writes any
that are missing, and prints each file as written, refreshed or up to date. A hook of the project's own is left as it
is, with a notice, as [Git hooks](#git-hooks) says. The list is committed with the wrappers. Without it those
copies stay as an older release wrote them, and nothing says so. In a project whose `agentrite.json` says `sandbox`
`false`, it leaves `sandbox.sh` out, so that one the project removed on purpose is not written back.

* A model pinned in a wrapper survives: a line in its frontmatter that opens with `model:` is kept, as written,
  after the kit's own keys
* Everything else in a wrapper, and all of the list and of `sandbox.sh`, is replaced, other keys a project added to
  the frontmatter among them. The wrappers are tracked files, so `git diff` shows what a refresh changed, and git has
  what it replaced
* `AGENTS.md`, `CLAUDE.md`, `opencode.json`, `sandbox/compose.project.yml`, `package.json` and `.dockerignore` are
  never written, and never created
* It reads `CLAUDE.md` with `claude` among the harnesses, and `opencode.json` with `opencode`, and after its lines
  prints a notice for each that does not load the kit's instructions, as "agentrite refresh" in `COMMANDS.md` says. A
  project set up before the release that loads them runs `npx agentrite init` with no argument, which writes or
  amends its `opencode.json`, and adds what the notices still name by hand. See "How the kit's instructions reach
  an agent"
* It reads `AGENTS.md` and prints a notice for one that does not name `.agentrite/instructions.md`. An `AGENTS.md`
  that `init` wrote before the list existed lists the kit's `standards.md` and role files itself. Its sections
  Development Guidelines and Roles are replaced by those that `npx agentrite init` with no argument prints, which
  link the list, so that agents are sent to the files `agentrite.json` names
* A path that holds something other than a regular file, such as a symbolic link, is left as it is and named on
  standard error. The other files are still refreshed, and the command exits 1

An improvement found while working in a project is made in the kit's repository, and committed there. The installed
copy under a project's `node_modules` is not a working copy of that repository, and nothing in it reaches there. The
improvement reaches that project, and every other, as a new release that each one updates to as above.

## The sandbox

The sandbox is a Docker container that a harness is run in, with a clone of a unit's branch or the project mounted
read-write at `/work`. `./sandbox.sh` starts it, in the forms "Commands" of `COMMANDS.md` gives. The reference is
[`SANDBOX.md`](SANDBOX.md), which in a project is at `node_modules/agentrite/SANDBOX.md`.

What a run needs:

* The host needs Docker: Desktop on macOS, Engine on Linux
* Never run it with `sudo`. The wrapper refuses to run with uid or gid 0, because the agent inside the sandbox would
  then be root too. When Docker needs elevated permissions on the machine, add the user to the `docker` group instead
* A run says what it mounts at `/work`, and there is no default. A command that names no unit, and gives no
  `--in-place`, no `--workdir` and no `--connect` either, starts nothing and names the forms

What a run does:

* A unit run, as `./sandbox.sh 0029`, mounts a clone of that unit's branch. It is the way to implement and to review a
  unit. A number that no branch holds and that is a unit on the default branch gets its branch first. See "Running
  a unit" of `SANDBOX.md`
* A run with `--in-place` mounts the project as it is on the host, so the agent works in the developer's own
  checkout, `.git` and `node_modules` included. It is the way to run something on the tree as it is, such as the
  suite
* Either builds the image on first use and opens a shell in the container. A command appended to it runs instead of
  the shell, as in `./sandbox.sh 0029 claude` and `./sandbox.sh --in-place npm test`
* `./sandbox.sh --in-place --rebuild` builds the image again before running
* `./sandbox.sh --connect 0029` mounts and starts nothing: it runs a command in the container of the unit run that is
  under way for the unit, beside what runs there. See "Two agents on one unit" of `SANDBOX.md`
* `./sandbox.sh 0029 --variant opus claude` is a variant of the unit: a unit run of the branch
  `feature-0029-sandbox-clone-of-the-branch--opus`, in a container and on a clone of its own, beside the unit's run and
  other variants. See "Two implementations of one unit" of `SANDBOX.md`
* In a project whose `agentrite.json` holds `"bell": true`, Claude Code and OpenCode in the sandbox ring the
  terminal's bell when they need the developer or stop, with nothing to set in the home volume or on the host. See
  "The bell" of `SANDBOX.md`

What it confines:

* The container's root filesystem is read-only. The agent writes the working directory, its home volume, the
  project's log directory on the host and `/tmp`
* `/tmp` is in memory and is emptied when the container stops, and files in it can be run, so a test suite or a tool
  that runs what it writes to the temporary directory works as on the host
* Egress is bounded by hostname: HTTPS on port 443 to the allowlisted hosts, and little else. See "Reaching more
  hosts" of `SANDBOX.md`
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

A project configures the sandbox with two files, and may add a third:

* `sandbox.sh` at the project root, a shim that execs `node_modules/agentrite/container/sandbox.sh` with the
  project root as its first argument
* `sandbox/compose.project.yml`, holding what varies per project: the Compose project name, the image name, the egress
  allowlist, the resource limits and, for a project with Playwright, the `PLAYWRIGHT_VERSION` build argument
* `sandbox/Dockerfile`, which the project may add for software it needs in the sandbox, such as a JDK, and which
  the wrapper builds on the kit's image. `init` and `refresh` do not write it. See "Adding software to the sandbox"
  in [`SANDBOX.md`](SANDBOX.md#adding-software-to-the-sandbox)
