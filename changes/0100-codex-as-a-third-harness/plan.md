# 0100 Codex as a third harness

## Approach

The work is in two parts. First, without changing what any command does, the contract gains the four members that
requirements 2 and 3 ask for, Claude Code's and OpenCode's modules implement them as the kit behaves today, and the
code that assumed `--agent` and Markdown wrappers goes through them. Then the Codex module, its files of the
sandbox, its tests and this repository's own files are added, and the documents describe it.

### The start in a role

`start` gains `role: (role: string, file: string) => { options: string[], opening: string | undefined }`, of kind
`function`, whose purpose is "the options and the opening words that start a run in a role, from the role's name and
its file". Claude Code's and OpenCode's each return `{ options: ['--agent', role], opening: undefined }`, written in
each module, since the two harnesses take the option independently.

`harnessCommand` of `scripts/agentrite-run.mjs` takes `roleFile`, the path of the role's file as the settings give
it, beside `role`, and names no option of its own:

* the options are `[...started.options, ...model, ...skipPermissions, ...harnessArguments]`, so that for Claude Code
  and OpenCode they are today's, in today's order
* the prompt is `${opening}\n\n${prompt}` when `opening` is given, and `prompt` otherwise

`run` of `scripts/agentrite.mjs` passes the `path` of the role that `checkRoleNamed` found. A step of the
orchestrator, and a step that resumes a session, go through `agentrite run` and so through `harnessCommand`, and get
the opening words on every run.

Codex's `start.role` returns `{ options: [], opening }`, where `opening` is

```text
You act as the <role>. Read `<file>` in the project root and follow it: it is the instruction of your role.
```

### The wrappers group

`wrappers` gains three members:

| Member                | Kind     | Purpose                                                                                       |
|-----------------------|----------|-----------------------------------------------------------------------------------------------|
| `wrappers.extension`  | string   | what the name of a role's wrapper in its directory ends with, after the role's name           |
| `wrappers.isKit`      | function | whether a file's text is a wrapper the kit wrote, whatever role, path or pinned model it holds |
| `wrappers.refreshed`  | function | what refresh writes over an existing wrapper: the rendered one, with the model pinned in it kept |

Claude Code and OpenCode take `.md`, `isKitWrapper` and `refreshedWrapper`. `refreshedWrapper` moves from
`scripts/agentrite.mjs` to `scripts/agentrite-roles.mjs`, beside `isKitWrapper`, since both are the Markdown format,
unchanged.

The body the kit writes is recognized the same way in both formats: the text after a part that is not looked into
is a fixed opening, then `wrapperBody(path)` for the path that its first backtick opens, trying each later backtick
as the end of the path, then a fixed closing. That loop is extracted from `isKitWrapper` into
`isWrapperBody(text, opening, closing)` of `scripts/agentrite-roles.mjs`, which the Markdown reader calls with `\n`
and an empty closing, and Codex's with an empty opening and `"""\n`.

The consumers, all in `scripts/agentrite-harness.mjs` and `scripts/agentrite.mjs`:

* `plannedFiles` names each wrapper `${wrappers.directory}/${role.name}${wrappers.extension}` and gives each file
  the `refreshed` of its harness. `kitOwnedFiles` stops adding `keepsModel`, and `refresh` writes
  `file.refreshed(existing, file.content)` over an existing file that has one
* `removeStaleWrappers` goes over the harnesses rather than their directories, and removes a regular file whose name
  ends with the harness's `extension`, whose role is not one of the project's, and whose text its `isKit` accepts
* `checkWrapper` finds the wrapper named `${role}${extension}` and compares it with what the harness's `refreshed`
  would leave
* `wrapperDirectories` stays, for the `AGENTS.md` template

### The Codex wrapper

A Codex wrapper is written as below, for the role `planner`. The description is a multi-line basic string that
opens with a line-ending backslash and ends each line but the last with one, so that TOML reads it as the one line it
is written from, and its lines are indented by two spaces, which the backslash trims. Each line is at most 120
characters: the words are wrapped by `wrapWords` at 117, indented by two spaces, and ` \` or `"""` is added. The
instructions are a multi-line basic string whose first line break TOML trims, holding `wrapperBody(path)`.

```toml
name = "planner"
description = """\
  Writes the plan of an approved change unit, against the tree the unit will be built on. Use once the human has \
  approved the unit's spec and the unit is next to be built, not before. Dispatch it with the unit directory."""
developer_instructions = """
Read `node_modules/agentrite/roles/planner.md` in the project root and follow it. It is your instruction; this file
holds none of its own.
"""
```

Every string the module writes into TOML, the name, the description, the path inside the body and the paths of the
instruction file, is escaped first by one function of the module: `\` as `\\`, `"` as `\"`, and every other control
character as `\uXXXX`. The path is escaped before `wrapperBody` wraps it, so that the wrapping counts what is
written, and `isKit` compares in the same escaped text.

* `isKit(text)`: the text, its CRLF read as LF, opens with `name = "`, has a line that is exactly
  `developer_instructions = """`, and what follows that line is `isWrapperBody` with an empty opening and `"""\n`
* `refreshed(existing, rendered)`: the lines of `existing` before its `developer_instructions = """` line that match
  `/^model\s*=/`, put into `rendered` before that line, as they are written. Without such a line, `rendered`. A
  description's lines are indented and cannot match, and nothing after the instructions' line is looked into
* `ownAgents`: `default`, `worker` and `explorer`, with the date and the source as the other modules write them.
  `harnessesWithAgent` then refuses them without regard to case, as it refuses the other harnesses' agents

### Codex's instruction file

`instructions.file` is `.codex/config.toml`. Where it is missing, `init` writes:

```toml
developer_instructions = """
Before anything else, read the files below in the project root and follow them. They hold the project's process \
and its standards.

- node_modules/agentrite/process.md
- node_modules/agentrite/standards.md
"""
```

with the paths of `instructionPaths(standards)`, each escaped. The file is judged by its text alone. It names a path
when its text holds the path as written. A file that names every path loads the instructions.

* `init`: missing, `wrote .codex/config.toml` and the content; naming every path, `skipped .codex/config.toml, which
  loads <paths joined by and>`; otherwise, `skipped .codex/config.toml, which does not name the kit's instructions`
  and the init notice. It writes nothing over a file that exists
* `refresh`: no notice for a file that names every path, and otherwise the refresh notice, for a file that is
  missing, that cannot be read, or that lacks paths, as `opencode.json`'s
* the init notice says that the file exists and was left as it is, that Codex reads the kit's instructions only when
  its `developer_instructions` names the paths below, and that init does not amend a TOML file; then the paths it
  lacks, one to a line, and `INSTRUCTIONS_SECTION`. The refresh notice says the file does not load the kit's
  instructions, why, that refresh does not add them, the paths it lacks and `INSTRUCTIONS_SECTION`
* the notice of the kit's standards, in `init` and `refresh` alike, is given when the standards are the project's own
  and the text holds `STANDARDS_PATH`: the file names the kit's `standards.md`, Codex then reads both sets of rules,
  and the path is to be removed from its `developer_instructions`, which init and refresh do not do, then the path and
  `INSTRUCTIONS_SECTION`

`writeInstructionFiles` makes the directory of an instruction file before it writes it, since Codex's is the first
not at the project root. `init` writes the wrappers first, so the directory is there already in every case the tests
know, and the change keeps it from depending on that.

### The headless run

| Member                   | Codex                                                                                      |
|--------------------------|--------------------------------------------------------------------------------------------|
| `start.command`          | `codex`                                                                                    |
| `start.skipPermissions`  | `--dangerously-bypass-approvals-and-sandbox`                                              |
| `start.interactive`      | `[...options, '--', prompt]`                                                               |
| `start.headless`         | `['exec', ...options, '--', prompt]`                                                       |
| `headless.arguments`     | `{ args: ['--json'], session: undefined }`, or with a session `{ args: ['--json', 'resume', session], session }` |
| `headless.read`          | the `thread_id` of the first `thread.started`; the `text` of the last `item.completed` whose `item.type` is `agent_message` |
| `headless.follow`        | for an `item.completed` of an `agent_message`, `textFollowed(undefined, item.text)`, and nothing for any other line |
| `headless.refused`       | always `[]`                                                                                |

A step that resumes runs `codex exec --model <id> --dangerously-bypass-approvals-and-sandbox --json resume <thread>
-- <prompt>`. The planner checked on the host with no login, so with no paid call, that `exec` with `-m` given before
`resume` records that model for the resumed turn in the session's file, and that the resumed run prints a
`thread.started` with the same id. Codex prints no time in its events, so what is followed carries none.

The fixture lines of the tests are those Codex 0.167.0 printed in the planner's run with no login, and for the
response the shapes the spec gives:

```text
{"type":"thread.started","thread_id":"01a1b16f-df1e-7c02-9266-33d818a31172"}
{"type":"turn.started"}
{"type":"error","message":"Reconnecting... 2/5 (unexpected status 401 Unauthorized: ...)"}
{"type":"item.completed","item":{"id":"item_0","type":"error","message":"Falling back from WebSockets to ..."}}
{"type":"item.completed","item":{"id":"item_1","type":"agent_message","text":"..."}}
{"type":"turn.completed","usage":{"input_tokens":1,"cached_input_tokens":0,"output_tokens":1}}
{"type":"turn.failed","error":{"message":"unexpected status 401 Unauthorized: ..."}}
```

### The sandbox

| Member                        | Codex                                                                                  |
|-------------------------------|----------------------------------------------------------------------------------------|
| `sandbox.package`             | `@openai/codex`                                                                        |
| `sandbox.versionArgument`     | `CODEX_VERSION`                                                                        |
| `sandbox.readVersion`         | the second word of the first line when the first is `codex-cli`, and otherwise none    |
| `sandbox.updates.environment` | none                                                                                   |
| `sandbox.updates.mounts`      | `managed_config.toml` at `/etc/codex/managed_config.toml`                              |
| `sandbox.logDirectories`      | `.codex`                                                                               |
| `sandbox.hosts`               | `api.openai.com`, `chatgpt.com` and `auth.openai.com`, each with its reason            |
| `sandbox.bell.environment`    | none                                                                                   |
| `sandbox.bell.mounts`         | `bell-config.toml` at `/etc/codex/config.toml`                                         |
| `sandbox.host`                | gives nothing                                                                          |

`container/harnesses/codex/managed_config.toml` holds `check_for_update_on_startup = false` and
`[projects."/work"]` with `trust_level = "trusted"`, each under a comment that says why. Codex's managed
configuration stands above the user's configuration in the home and the project's `.codex/config.toml`, and the
agent cannot write a file mounted read-only under `/etc` (R10). The trust is in the same file because Codex reads one
managed configuration and `/work` must be trusted in every run, as the update check must be off in every run, while
the bell's file is given only with `"bell": true`. The module's comment on `updates` says so, since that member's
purpose names the updates alone.

`container/harnesses/codex/bell-config.toml` holds `notify = ["sh", "/etc/agentrite/bell/ring-bell.sh"]`. It is
Codex's system configuration, which stands below the home's and the project's, so a project that sets its own
`notify` replaces it, which R14 does not forbid. Codex passes the notify command a JSON argument, which
`ring-bell.sh` does not read. The comment at the top of `ring-bell.sh` names Codex's notify among what runs it.

The hosts' reasons are:

* `api.openai.com`: the OpenAI API, which Codex sends the prompts of a login with an API key to
* `chatgpt.com`: Codex sends the prompts of a ChatGPT login here
* `auth.openai.com`: Codex's login with a ChatGPT account, by a device code among it, and every refresh of its token

`chatgpt.com` and `auth.openai.com` stay in OpenCode's module as well. `KIT_ALLOWLIST` gains neither: each module
lists the hosts of its own harness, the wrapper writes an `allow` line for each, and the entrypoint already admits a
host listed twice once (`awk '!seen[$0]++'` in `parse_allowlist`).

The whole of `~/.codex` is the log directory, so the login (`auth.json`), the configuration, the sessions and the
SQLite state are in the project's log directory on the host. The image's `HARNESS_DIRECTORIES` loop makes it as the
agent's, and the entrypoint's `log_directory_parents` gives it no parent to check. Nothing of the image, the compose
files, the wrapper or the entrypoint changes.

Three things the spec says were not tried are verified in the sandbox: that Codex reads
`/etc/codex/managed_config.toml` above the home's and the project's configuration, that it takes a project's trust
from it, and that it reads `/etc/codex/config.toml`. Where one does not hold, the implementer stops, logs what was
seen in `record.md`, and the unit comes back to the planner. No other place is tried in its stead.

### Trailers

Codex 0.167.0 holds, among its instructions to the model, that a commit message ends with
`Co-authored-by: Codex <noreply@openai.com>`. The check's `co-authored-by` already refuses it, without regard to
case. A case of the test holds that exact line, and the rule of `standards.md` that forbids `Co-Authored-By` says it
also holds for the one Codex adds.

### This repository

`agentrite.json` names `["claude", "opencode", "codex"]`. `npx agentrite refresh` writes `.codex/agents/` for the
five roles, and `.codex/config.toml` is written with the content `init` writes, which refresh then notices nothing
of. `sandbox/compose.project.yml` keeps `api.openai.com`, which its comment gives for the reviewer under OpenCode.

## Files

- `scripts/agentrite-harness.mjs`: `start.role`, `wrappers.extension`, `wrappers.isKit` and `wrappers.refreshed` in
  `Harness` and `HARNESS_CONTRACT`; `HARNESSES` with `codex` last; `plannedFiles`
- `scripts/agentrite-run.mjs`: `harnessCommand` with `roleFile`; the usage of `run` naming `codex`, a model id of it,
  and what `--skip-permissions` gives it
- `scripts/agentrite-roles.mjs`: `isWrapperBody`, `refreshedWrapper` moved in
- `scripts/agentrite.mjs`: `run`, `checkWrapper`, `kitOwnedFiles`, `refresh`, `removeStaleWrappers`,
  `writeInstructionFiles`
- `scripts/harnesses/claude.mjs`, `scripts/harnesses/opencode.mjs`: the four new members
- `scripts/harnesses/codex.mjs`: new
- `container/harnesses/codex/managed_config.toml`, `container/harnesses/codex/bell-config.toml`: new
- `container/bell/ring-bell.sh`: its opening comment
- `standards.md`: the rule on `Co-Authored-By`
- `package.json`: `scripts/harnesses/codex.mjs` in `files`, `codex` in `keywords`
- `agentrite.json`, `.codex/agents/*.toml`, `.codex/config.toml`: this repository's own
- `tests/agentrite-harness.test.mjs`, `tests/agentrite-run.test.mjs`, `tests/agentrite-roles.test.mjs`,
  `tests/agentrite-refresh.test.mjs`, `tests/agentrite-init.test.mjs`, `tests/agentrite-instructions.test.mjs`,
  `tests/agentrite-outcome.test.mjs`, `tests/agentrite-orchestrate.test.mjs`, `tests/agentrite-settings.test.mjs`,
  `tests/bell.test.mjs`, `tests/check-commit-message.test.mjs`, `tests/package-documents.test.mjs`,
  `tests/pointers.test.mjs`, `tests/repository-own-files.test.mjs`, and those that go over `HARNESSES` where a third
  harness shows a gap
- `README.md`, `COMMANDS.md`, `ORCHESTRATOR.md`, `SETUP.md`, `SANDBOX.md`, `CONTRIBUTING.md`
- `pointers/agentrite-roles/README.md`, `pointers/agentrite-roles/pointer.mjs`
- `diagrams/components.mmd` and its SVG
- `changes/0100-codex-as-a-third-harness/record.md`: the log

## Tasks

### The contract's new members, for the two harnesses there are

- [ ] In `tests/agentrite-harness.test.mjs`, update the test of the members' list to the four new members, and add,
  going over `HARNESSES`: `extension` opens with a dot and holds no slash; `isKit` accepts what `render` writes for
  a role, and `refreshed` of a rendered wrapper over itself is itself (R2, R3)
- [ ] In `tests/agentrite-run.test.mjs`, make every case of `harnessCommand` give `roleFile`, keep their expected
  arguments as they are, and add for each of `claude` and `opencode` that `start.role` gives `--agent <role>` and no
  opening, and that the prompt is unchanged (R2, R16)
- [ ] Add `start.role` to `Harness` and `HARNESS_CONTRACT`, implement it in both modules, and make `harnessCommand`
  take `roleFile` and the options and the opening from it, and `run` pass the role's path (R2)
- [ ] In `tests/agentrite-roles.test.mjs`, add cases of `isWrapperBody`, and move the cases of `refreshedWrapper` to
  import it from `scripts/agentrite-roles.mjs`. Extract `isWrapperBody` from `isKitWrapper`, and move
  `refreshedWrapper` there unchanged (R3)
- [ ] Add `wrappers.extension`, `wrappers.isKit` and `wrappers.refreshed` to `Harness` and `HARNESS_CONTRACT`,
  implement them in both modules, and make `plannedFiles`, `kitOwnedFiles`, `refresh`, `removeStaleWrappers` and
  `checkWrapper` go through them, as above (R3)
- [ ] Run `npm test`, and check that no expected output of `tests/agentrite-refresh.test.mjs`,
  `tests/agentrite-init.test.mjs` or `tests/agentrite-run.test.mjs` changed in this commit (R3, R16)

### Codex's module

- [ ] Write the cases of Codex's own in `tests/agentrite-harness.test.mjs`: `readVersion` of `codex-cli 0.167.0`,
  of the same with a second line, of a first word other than `codex-cli`, of `codex-cli` alone and of an empty output;
  `host` giving nothing; `start.role` giving no option and the opening words with the role and its file; the four
  `start` members' command lines for a session and a headless run (R1, R2, R6, R9)
- [ ] Write the cases of the Codex wrapper in `tests/agentrite-roles.test.mjs` or beside the module's other cases:
  the wrapper of `planner` exactly as above; a description that holds `"` and `\` escaped and wrapped with no line
  over 120; a path that holds a space, a quote and a backtick; `isKit` true for each, with CRLF, and with a `model`
  line before the instructions, and false for a file whose instructions name another body, for one that lacks the
  `name` line, and for a Markdown wrapper; `refreshed` keeping one and two `model` lines in place and their text,
  ignoring a `model` line after the instructions' line, and giving the rendered wrapper when none is there (R4)
- [ ] Write the cases of Codex's instruction file in `tests/agentrite-instructions.test.mjs`, or where the other two
  harnesses' `instructions.init` and `instructions.refresh` are tested: missing, written with the content above for
  the kit's standards and for the project's own; naming both paths; lacking one and both; unreadable; the standards
  the project's own with the kit's `standards.md` named; each with its line and notices, every notice ending with
  `INSTRUCTIONS_SECTION` (R5)
- [ ] Write the cases of Codex's headless readings in `tests/agentrite-outcome.test.mjs`, from the fixture lines
  above: the arguments without and with a session; the session from `thread.started` and none without it; the
  response the last `agent_message`'s text with two of them, none with only `error` items, none for an empty output
  and for lines that are no JSON; `follow` giving the text of an `agent_message` and nothing for each other line;
  `refused` empty for every fixture (R7, R8)
- [ ] Write `scripts/harnesses/codex.mjs` as above, add it to `HARNESSES` after `opencode`, add it to `files` of
  `package.json` and to the list of `tests/package-documents.test.mjs`, and add `codex` to `keywords` (R1, R4 to R9,
  R12, R13, R18)
- [ ] Write `container/harnesses/codex/managed_config.toml` and `container/harnesses/codex/bell-config.toml` as
  above, and change the opening comment of `container/bell/ring-bell.sh` (R10, R11, R14)
- [ ] In `tests/bell.test.mjs`, add that Codex's bell configuration runs `/etc/agentrite/bell/ring-bell.sh` and that
  the shared mount puts the script there (R14)
- [ ] Make `writeInstructionFiles` make the directory of the file before it writes it (R5)
- [ ] In `tests/agentrite-init.test.mjs` and `tests/agentrite-refresh.test.mjs`, add a project that names `codex`:
  `init` writes the five wrappers into `.codex/agents/` and `.codex/config.toml`, and prints their lines; `init`
  leaves an existing `.codex/config.toml` and prints its notice; `refresh` keeps a `model` key of a Codex wrapper,
  removes a Codex wrapper the kit wrote for a role the project no longer has, leaves a `.toml` of the project's own
  in `.codex/agents/`, and prints the notice of a `.codex/config.toml` that lacks a path. Keep a case of a project of
  `claude` and `opencode` whose files and printed lines are today's (R4, R5, R16)
- [ ] In `tests/agentrite-settings.test.mjs`, add that a role named `worker`, `Default` or `EXPLORER` is refused with
  the message that names Codex (R4)
- [ ] In `tests/agentrite-run.test.mjs`, add `agentrite run` on a fake `codex` for an interactive and a headless run
  and for each `start` of the three harnesses: the arguments it was given, the opening words before the unit's
  prompt for Codex alone, and the refusal of a missing or changed Codex wrapper as for the other two (R2, R3, R6, R20)
- [ ] In `tests/agentrite-orchestrate.test.mjs`, add a step of Codex with its fake harness printing the fixture lines,
  and a step that resumes its session: the arguments of each, its response and session read, and what `--follow`
  shows (R2, R7, R8, R20)
- [ ] Change the usage of `run` in `scripts/agentrite-run.mjs`: `<harness>` lists the three from `HARNESS_NAMES` as
  today, the model ids name one of Codex's, `gpt-6.1-sol`, and `--skip-permissions` says it gives
  `--dangerously-bypass-approvals-and-sandbox` for codex, which skips every approval and Codex's own sandbox. Update
  the expected usage in `tests/agentrite-run.test.mjs`, every line at most 120 characters (R18)
- [ ] In `tests/check-commit-message.test.mjs`, add that `Co-authored-by: Codex <noreply@openai.com>` is refused,
  and change the rule of `standards.md` on `Co-Authored-By` to say that it holds for the one Codex adds too (R15)
- [ ] Run `npm test` and correct until it passes, with the tests that go over `HARNESSES` now covering Codex, such as
  `tests/agentrite-sandbox.test.mjs`, `tests/sandbox-harness-names.test.mjs`, `tests/harness-versions.test.mjs` and
  `tests/sandbox-wrapper.test.mjs`. Where one of them assumed two harnesses, make it go over the list. The case of
  `tests/sandbox-wrapper.test.mjs` that holds the whole `docker compose run` of a project of `claude` and `opencode`
  keeps its expected flags (R1, R16, R20)

### This repository's own files

- [ ] Add `codex` to `harnesses` of `agentrite.json`, run `npx agentrite refresh`, write `.codex/config.toml` with
  the content `init` writes for this repository's standards, and check that `refresh` then prints no notice for it.
  Make `tests/repository-own-files.test.mjs` cover the Codex wrappers and `.codex/config.toml` if it does not by the
  list (R17)
- [ ] Add `.codex/` to the table "What the repository holds besides the package" of `CONTRIBUTING.md`, as the role
  wrappers for Codex and the configuration that loads the kit's instructions into it (R17)

### The documents

- [ ] `README.md`: name Codex wherever the harnesses are named, by the line of the map of the documents at most if
  nothing else names them, as the rule on `README.md` of `AGENTS.md` allows; and update `diagrams/components.mmd`
  with Codex and `.codex/agents/`, and generate its SVG with `npm run diagrams` (R18)
- [ ] `COMMANDS.md`: the harnesses `run` and the orchestrator take, the row of `run` in the table if it names them,
  `--skip-permissions` for codex, and every other sentence that lists the harnesses (R18)
- [ ] `ORCHESTRATOR.md`: a step of Codex is followed by its messages alone, and never stops for a refused permission,
  since Codex asks for none in a headless run (R18)
- [ ] `SETUP.md`: `codex` among the harnesses a project names; how the kit's instructions reach Codex, through
  `developer_instructions` of `.codex/config.toml`, which `init` writes where it is missing; that Codex loads it and
  `.codex/agents/` only in a project the developer marked trusted in their own configuration of Codex, as Codex asks
  at its first interactive start; that the project's `developer_instructions` replaces one the developer's own
  configuration sets; and that a Codex run is told its role in its prompt, the wrappers serving its subagents (R18)
- [ ] `SANDBOX.md`, each in the section of what the reader is doing: "Logging in" says to log in to Codex with
  `codex login --device-auth`, or with an API key by `codex login --with-api-key`, which reads the key from its
  standard input; the hosts admitted for Codex in the table of the allowlist; the bell of Codex rings when a turn
  ends; and "Where things are kept on the host" gives `.codex`, with its login, configuration, sessions and state, in
  the project's log directory (R18)
- [ ] `pointers/agentrite-roles/README.md` and `pointer.mjs`: name Codex where they name the harnesses, and update
  `tests/pointers.test.mjs` if it holds the text (R18)
- [ ] Rewrite "Adding a harness" of `CONTRIBUTING.md`: `scripts/harnesses/codex.mjs` among the modules to follow;
  what `start.role` asks of a new harness, an option that starts it as an agent or words that open the prompt; what
  `wrappers.extension`, `wrappers.isKit` and `wrappers.refreshed` ask, the format of its wrappers and how a model
  pinned in them is kept; `.codex/` among this repository's own files; and the tests of a harness's own, as the cases
  this unit added. Read the rest of the section and change what is no longer true (R19)
- [ ] Check every changed line against the limit of 120 characters (R18, R19)

## Verification

- [ ] `npm test` passes
- [ ] `npm run check-changes` passes after the commits
- [ ] For a project of `claude` and `opencode`, a scratch project initialized with the working tree's kit before and
  after this unit gets the same files, and `agentrite run` prints the same command line for each harness (R16)
- [ ] `./sandbox-dev.sh --in-place --rebuild true` builds the image with `@openai/codex`, and in it
  `codex --version` prints the version of the image's label (R9)
- [ ] In the sandbox, in `/work`, with no change to the home's configuration, `codex debug prompt-input` shows the
  `developer_instructions` of `/work/.codex/config.toml` and the Codex wrappers among the roles of the spawn tool, in
  an `--in-place` run, a `--workdir` run and a unit run. Where it does not, stop as the approach says (R11)
- [ ] In the sandbox, with `check_for_update_on_startup = true` in `~/.codex/config.toml` and in
  `/work/.codex/config.toml` in turn, an interactive start of `codex` neither writes `~/.codex/version.json` anew nor
  makes the egress proxy refuse a host of an update check. Where it does, stop as the approach says (R10)
- [ ] Log in to Codex in the sandbox with a ChatGPT account by `codex login --device-auth`, and in another project's
  log directory with an API key, and complete a turn with each, watching the egress proxy's refusals. Admit a host a
  turn needs with its reason, admit none that a turn does not need, and record in `record.md` what was run and what
  it showed. Where no account or key is available to the implementer, this is left to the human and recorded (R13)
- [ ] After that turn, start a new container of the same project and resume the session with
  `codex exec resume <thread>`: it finds the thread (R12)
- [ ] With `"bell": true`, a turn's end rings the bell on the host's terminal, and with `false`, nothing of
  `/etc/codex/config.toml` is in the container (R14)
- [ ] Run one step of the orchestrator on Codex in the sandbox and one that resumes it, with `--follow`: the step
  starts in its role, `--follow` shows its messages, its response and session are read, and the resumed run's
  session file records the step's model (R2, R7, R8)
- [ ] Have Codex make a commit in the sandbox, and record in `record.md` whether its message held a trailer and
  whether the hook refused it (R15)
- [ ] Where Docker is not reachable from the implementer's shell, the record says so and the sandbox's checks are
  left to the human

## Commit Points

- [ ] `feature-0100 Plan Codex as a third harness`: `plan.md` and the planner's entry in `record.md`
- [ ] `feature-0100 Give the harness contract how a run starts in a role and the format of its wrappers`: the four
  members for Claude Code and OpenCode, their consumers and tests. No command's behavior changes, and the tree passes
  `npm test`
- [ ] `feature-0100 Add Codex as a harness`: the module, its files of the sandbox, `ring-bell.sh`'s comment,
  `writeInstructionFiles`, the usage of `run`, `standards.md`, `package.json` and the tests. The tree passes
  `npm test`
- [ ] `feature-0100 Run this repository's own work on Codex too`: `agentrite.json`, `.codex/` and the table of
  `CONTRIBUTING.md`
- [ ] `feature-0100 Describe Codex as a harness`: the documents, the pointer package and the diagram
- [ ] `feature-0100 Record the implementation and the verification`: the implementer's entries in `record.md`
