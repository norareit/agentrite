# 0123 The kit moves to OpenCode 2

## Context

The human keeps running into problems with OpenCode 1 and wants to move to OpenCode 2. When OpenCode 2 first came
out they waited, since it was new and it was unclear what the kit would need for it. No record of `changes/` holds
that earlier reasoning, so this unit starts from what was found on 2026-11-26 and 2026-11-27.

The human decided that the kit moves to OpenCode 2 and stops supporting OpenCode 1, rather than supporting both, as
"Decisions" gives. The human keeps the host on OpenCode 1.19.6 until a release of the kit holds this unit.

### What OpenCode 2 is

OpenCode 2 is published on npm as `@opencode/cli`. Its latest on 2026-11-27 is 2.4.2, published on 2026-11-26. The
package `opencode-ai`, which the kit installs today, ends at 1.19.6. `@opencode/cli` installs the command `opencode`,
and `opencode2` beside it, with a binary for each platform from optional dependencies, as `opencode-ai` does. Both
packages install a command named `opencode`, so one host holds one of them.

OpenCode's guide to moving from 1 to 2, https://opencode.ai/docs/migrate-v1/, names three breaking changes: a new
plugin API, under which a plugin of OpenCode 1 does not run; a new server API and clients; and the configuration of
the terminal client moving from `tui.json` to one global `cli.json`. It says that a configuration of OpenCode 1 keeps
working, read without being rewritten, and it renames keys such as `plugin` to `plugins`, `provider` to `providers`,
`permission` to `permissions` and `autoupdate` to `update`. It does not describe `opencode run`, its JSON output or
its options.

### What was found

On the host, Linux with Docker, OpenCode 2.4.2 was installed into a scratch directory, with its home and its XDG
directories pointed there, and run with the free model `opencode/big-pickle`. The kit was then copied into a scratch
clone, changed only as far as needed to build OpenCode 2.4.2 into its sandbox, and run under a Compose project, an
image, a home volume and a log directory of its own. The human checked the interactive client in that sandbox.

What the kit relies on and found changed:

* `opencode --version` prints `opencode v2.4.2`. The kit reads the first word as the version, which is `opencode`
* `opencode run` refuses `--variant` with `Unrecognized flag: --variant in command opencode run` and exits 1. A
  variant is given with the model, as `--model=<provider>/<model>#<variant>`. An unknown variant ends the run with an
  `error` event, `Variant unavailable for opencode/big-pickle: high`, and exit 1
* The tool of the shell is named `shell` in a `tool_use` event, where OpenCode 1 named it `bash`. The tools of files,
  `read` and `write` among them, take the path as `path`, where OpenCode 1 took `filePath`
* A call refused for lack of permission in `opencode run` without `--auto` is a `tool_use` event whose
  `state.status` is `error` and whose `state.error` is `This non-interactive run cannot ask the user for permission,
  so the request was rejected. Continue without this action.` OpenCode 1 gave `The user rejected permission to use
  this specific tool call.`
* An `error` event holds `error.message` and `error.type`, such as `provider.no-route` with `Model unavailable:
  opencode/no-such-model`. OpenCode 1 held `error.data.message` and `error.name`, so the kit would print the error's
  JSON
* `opencode run`, and the terminal client, work through a background server, `opencode serve --service`, which the
  first of them starts and which stays running after it, for later starts to share. A run with `--standalone` has a
  server of its own instead, which ends with it. With the shared server, a run's `OPENCODE_CONFIG_CONTENT` was
  applied or not by which run had started the server: a later run without the variable had it, and a run with the
  variable did not, when the server was started without it. With `--standalone` the variable held at every run.
  `opencode models` started the shared server as well, in the sandbox too
* A plugin of OpenCode 1, the kit's bell, is not loaded: OpenCode logs `configured plugin path must be a directory`
  and runs without it. A plugin is a directory, named under `plugins`, whose module's default export is
  `{ id, setup(ctx) }`, which needs no import. `ctx.event.subscribe({ types })` gives the events as an async
  iterable. No `session.idle` event is emitted. A turn that ends gives `session.execution.succeeded`, and a turn that
  fails `session.execution.failed`. A permission asked for gives `permission.asked`. A plugin of that shape, ringing
  the bell's script on those three events, was loaded in the sandbox, and the human heard it ring in the terminal
  client
* On the first search, OpenCode downloads ripgrep from `github.com`. In the sandbox the proxy refuses the host and
  every call of the `grep` tool fails with `ripgrep execution failed`. With Debian's `ripgrep` 13.0.0 on the `PATH`
  the `grep` tool worked and nothing was downloaded
* OpenCode 2 has no built-in agent `scout`. Its own agents are `build`, `plan`, `general` and `explore`, and the
  hidden `compaction`, `title` and `summary`, per https://opencode.ai/docs/agents/

What the kit relies on and found unchanged:

* The JSON events of `opencode run --format json`: `step_start`, `text`, `tool_use`, `step_finish` and `error`, each
  with `type`, `timestamp` and `sessionID`, and a `part` with `id`, `messageID`, `text`, `tool` and `state` with
  `status` and `input`. Each call of the model is a message of its own, ended by a `step_finish`
* `--session <id>` resumes a session, also in a later container of the sandbox. `--agent`, `--auto`, `--format
  json`, and `--model=` and `--agent=` joined by `=`. A failed run exits 1. An agent that does not exist ends the run
  with `Agent not found`
* The `instructions` list of a project's `opencode.json`, its `$schema` `https://opencode.ai/config.json`,
  `OPENCODE_CONFIG`, and `OPENCODE_CONFIG_CONTENT` with `--standalone`. `autoupdate: false` is taken without a warning
* The wrappers `init` writes under `.opencode/agents/`, with `description` and `mode: all` and the body that says to
  read the role's file, are found by `--agent` and their body is followed
* The local providers of the host in OpenCode 1's shape, `provider` with `npm` and `options.baseURL`, which unit 0106
  hands to the sandbox: OpenCode 2 listed the model of such a provider
* OpenCode's data directory is `~/.local/share/opencode`, now holding `opencode.db`, `log`, `repos` and `snapshot`,
  so the log directory of the sandbox keeps its sessions and its login as before
* The hosts OpenCode reaches in the sandbox are those the kit admits today, but for `github.com` for ripgrep. It
  still reaches `models.opencode.ai`. OpenCode's own free models are served from `opencode.ai`, which the kit does not
  admit, under OpenCode 1 either
* In the terminal client in the sandbox, started with `--standalone --prompt`, the prompt was sent and answered, the
  colours were right, the bell rang, and a login with a ChatGPT account held into the next start, in a new container,
  where a model of OpenCode's OpenAI provider answered

Seen under OpenCode 1 as under 2, and not part of this unit: in the sandbox, `opencode run` with a standard input
that stays open waits for it, and the local model server of the human's host was not reached from the sandbox.

## Requirements

The version:

1. The sandbox installs OpenCode from the package `@opencode/cli`, at the version it chooses as today: the one the
   project's `sandbox/compose.project.yml` gives, else the host's, else the latest published
2. The version of OpenCode the host has is read from what `opencode --version` prints, `opencode v2.4.2` as
   `2.4.2`, and a pre-release of the shape `0.0.0-<tag>` as that whole word
3. A start of the sandbox whose chosen version of OpenCode is below `2.0.0`, and is no `0.0.0-<tag>` pre-release,
   is refused before anything is built, with the status of "Exit statuses" of `COMMANDS.md` for a refusal. Its
   message names the version, where it came from, the project's `sandbox/compose.project.yml` or the host's
   `opencode`, that the kit needs OpenCode 2, and what to do: install OpenCode 2, `@opencode/cli`, on the host, or
   give a version of 2 in `sandbox/compose.project.yml`, or keep the release of the kit before the one that holds
   this unit. A project whose `agentrite.json` does not name `opencode` is not refused for it

Starting OpenCode:

4. Every start of OpenCode that the kit makes, interactive and headless, on the host and in the sandbox, passes
   `--standalone`
5. An effort is given to OpenCode with its model, as the one argument `--model=<model>#<level>`, and no other argument
   carries it. Without `--effort` the model is given as `--model=<model>`, as today
6. The kit's names of OpenCode's own agents are those of OpenCode 2: `build`, `plan`, `general`, `explore`,
   `compaction`, `title` and `summary`

Reading a headless run:

7. A call of the shell, the tool `shell`, is shown and reported as a call of the shell, as a call of `bash` is under
   OpenCode 1 today, and the path of a call of a tool of files is read from its `path`
8. A call that OpenCode 2 refused for lack of permission, with the `state.error` that "What was found" gives, is a
   refused call, as unit 0090 reports one
9. The text of an `error` event is its `error.message` when it has one, its `error.type` otherwise, and its JSON when
   it has neither

The sandbox:

10. The bell of OpenCode, with `"bell": true`, is a plugin that OpenCode 2 loads, and rings the bell's script when a
    turn ends, when a turn fails, and when OpenCode asks for a permission, the moments OpenCode 1's plugin rang at
11. The sandbox's own configuration of OpenCode turns updating off with OpenCode 2's key, `"update": "disable"`
12. The image holds `rg`, so that OpenCode's `grep` tool works in the sandbox without a download. `github.com` is not
    admitted for it

The documents:

13. The kit's documents describe OpenCode 2: no document gives `--variant`, `opencode-ai`, a plugin of OpenCode 1 or
    a version of OpenCode 1 as what the kit uses, and the examples of "Holding a harness version" in `SANDBOX.md` give
    a version of OpenCode 2

Verification, by the implementer, with OpenCode 2 in this repository's own sandbox, `./sandbox-dev.sh`:

14. The implementation is checked, and the checks recorded in `record.md` with the versions they ran with:
    * a headless step of `npx agentrite run` in OpenCode, with a model and an effort, that calls the shell and a
      tool of files, as the output of the step shows them; one resumed with its session; one with a call refused,
      as the stop reports it; and one with an unknown model, as the error of the step shows it
    * the terminal client started by the kit with `--prompt`, its colours, the bell when a turn ends, and a login
      that holds into a new container
    * a start refused by requirement 3, with a version of 1 given in `sandbox/compose.project.yml`

## Decisions

* **Moving to OpenCode 2, without OpenCode 1.** Supporting both would mean a second reading of the JSON events, a
  second plugin, a second set of options and a version check in front of each, and each check of a unit that touches
  OpenCode run twice, for as long as both are supported. The kit's users with OpenCode 1 are the human's own
  projects, which move too. The cost is a release of the kit that breaks a project still on OpenCode 1, which
  requirement 3 makes visible at the start with what to do, and which the release's notes, written when it is made,
  say. Supporting both was weighed and declined by the human
* **The release that holds this unit is a major one**, since a project on OpenCode 1 cannot use it
* **`--standalone` at every start, on the host too.** In the sandbox the kit hands OpenCode its configuration, the
  bell's plugin and the local providers through the environment of the start, and only `--standalone` makes the
  environment of each start hold, as "What was found" gives. On the host the kit hands nothing through the
  environment, but without `--standalone` a step of the orchestrator would run in the developer's own background
  server, with the configuration that server loaded when it started, and a step the kit stops at its time limit
  might go on working in that server. That last was not checked. Passing it everywhere keeps one way of starting
  OpenCode. It costs the start of a server at each start, a matter of a moment, and the features of OpenCode 2 that
  reach a running session from elsewhere, as `opencode pair` does, for the sessions the kit starts. Passing it in
  the sandbox alone was weighed and declined by the human
* **An effort without a model stays refused.** `npx agentrite run` already refuses `--effort` without `--model`, for
  every harness, with exit 2. OpenCode 2 can take a variant only as part of the model, so that refusal is what the
  human chose for it, and nothing about it changes
* **OpenCode 2's default for files outside the project is followed.** OpenCode 1 asked before a tool of files
  reached outside the project, and OpenCode 2 allows it. A rule in the `opencode.json` that `init` writes, setting
  `external_directory` back to ask, was weighed and declined by the human, who found OpenCode 1's asking a burden.
  The rule would not have held the shell: in the check, a `read` it refused was followed by a `cat` of the same file
  through `shell`, which ran. What contains an agent is the sandbox, as before
* **Debian's `ripgrep` in the image, not `github.com` in the allowlist.** With `rg` on the `PATH` OpenCode downloads
  nothing, and admitting `github.com` would admit far more than a download of ripgrep. Debian's is 13.0.0 where
  OpenCode would download 15.1.0, and the `grep` tool worked with it
* **The rest of OpenCode 2's new configuration shapes are not adopted.** The wrappers keep `mode: all` and the
  sandbox's configuration keeps `provider` for the local providers, since OpenCode 2 reads both, as found. The bell's
  plugin and `update` change because OpenCode 2 does not read the old ones, or not as OpenCode 1 did
* **The bell rings when a turn fails too.** OpenCode 1's `session.idle` came at the end of every turn, whatever its
  end, and OpenCode 2 splits that end into two events, so the plugin rings on both

## Non-goals

* Supporting OpenCode 1 beside 2, or a project that holds OpenCode 1 at a version
* Moving the projects that use the kit to OpenCode 2's shapes of configuration, such as their own `opencode.json`,
  agents or plugins. OpenCode 2 reads the shapes of 1, and a project moves its own when it wants to
* A refusal of OpenCode 1 on the host, outside the sandbox. See "Beyond the request"
* Reading the host's local providers when the host's file is in OpenCode 2's shape. See "Beyond the request"
* Permission rules of the kit's own for OpenCode, `external_directory` among them
* Admitting `opencode.ai`, for OpenCode's own free models, in the sandbox
* The wait of `opencode run` on an open standard input, and the reach of the local model server from the sandbox on
  the human's host, which are the same under OpenCode 1
* `CHANGELOG.md`, which is written at the release, as `AGENTS.md` gives

## Beyond the request

1. **A refusal of OpenCode 1 on the host.** `npx agentrite run` and the steps of `npx agentrite orchestrate` on the
   host would read `opencode --version` and refuse a version below 2, as requirement 3 does for the sandbox. It
   costs a run of `opencode --version` at each start on the host, and a message and a test. Without it, OpenCode 1 on
   the host is given `--standalone` and an effort in the model, which it may refuse with its own message or take
   another way. What OpenCode 1.19.6 does with `--standalone` was not checked
2. **Reading the host's local providers in OpenCode 2's shape.** Unit 0106 reads `provider`, with `npm` and
   `options.baseURL`. OpenCode 2 writes `providers`, with `package` and `settings.baseURL`. Reading both costs a
   second reading of the file and its tests. Without it, a developer who moves the host's file to OpenCode 2's shape
   sees the line of 0106 that the file holds no local provider, and the sandbox lists none until the file holds the
   old shape again or a later unit reads the new one
3. **Checking that a step stopped at its time limit leaves no work going on in a shared server.** It costs a check
   on the host with OpenCode 2 without `--standalone`. Requirement 4 makes the question moot for the kit's own
   starts, so without it the decision on `--standalone` rests in part on a risk that was not measured
