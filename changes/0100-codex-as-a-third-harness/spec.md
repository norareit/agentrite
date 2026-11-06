# 0100 Codex as a third harness

## Context

The kit knows two harnesses, Claude Code and OpenCode. Units `0091-one-contract-per-harness` and
`0097-the-sandbox-takes-its-harnesses-from-their-modules` put everything the kit's code and its sandbox know of a
harness into one module per harness under `scripts/harnesses/`, each implementing `HARNESS_CONTRACT` of
`scripts/agentrite-harness.mjs`, and listed in "Adding a harness" of `CONTRIBUTING.md` what a new harness takes. The
human wants OpenAI's Codex CLI added as the third harness, so that a project can name `codex` in its `harnesses`
setting and a step of the orchestrator can run on it.

The human's session researched Codex 0.167.0, and the specifier checked what follows on the host, with no paid model
call: the help texts of `codex`, `codex exec` and `codex exec resume`, the prompt Codex builds, read with
`codex debug prompt-input`, and runs of `codex exec` with no login, which fail at the API after the arguments are
read.

* **Role wrappers.** Codex has project custom agents, one TOML file per agent at `.codex/agents/<name>.toml`, with the
  required fields `name`, `description` and `developer_instructions`. A custom agent is only ever spawned as a
  subagent: no option starts the main session as one. A name with a hyphen, as `spec-reviewer`, is accepted: Codex
  lists it among the roles its spawn tool offers. Its own agents are `default`, `worker` and `explorer`. The kit's
  wrappers are Markdown with front matter today, and the code that names a wrapper `<role>.md`, recognizes one the
  kit wrote, and keeps a model a project pinned in it reads that format
* **Starting in a role.** `harnessCommand` of `scripts/agentrite-run.mjs` gives every harness `--agent <role>`, which
  Codex has no equivalent of. The human decided that how a run starts in a role becomes a member of the contract, and
  that Codex is told the role in its prompt. In an earlier spec review the human ran, Codex read `AGENTS.md` and the
  process and took on a role with no wrapper
* **Instructions.** Codex reads `AGENTS.md` natively, with no include syntax, and caps what it reads at 32 KiB. The
  human decided that the kit's instructions reach Codex through `developer_instructions` in the project's
  `.codex/config.toml`, pointing at the files `.agentrite/instructions.md` lists. Codex loads a project's
  `.codex/config.toml` and `.codex/agents/` only for a project its user configuration marks trusted: in a project
  that is not trusted it read `AGENTS.md` and neither of the two. The project's `developer_instructions` replaces one
  the user's own configuration sets, rather than adding to it
* **Headless runs.** `codex exec --json` prints JSONL: `thread.started` with the `thread_id`, `turn.started`, one
  `item.completed` per item, of which an `agent_message` has a `text`, and `turn.completed`. A session cannot be
  chosen in advance: it is the `thread_id`. `codex exec resume <thread_id>` continues it and keeps the id, and the
  options of `exec` are accepted before or after `resume`. A `--` before the prompt is accepted. `exec` reads stdin
  when it is no terminal, and a run with an empty or ignored stdin goes on
* **What a run shows.** Shell commands printed no items in the human's runs, so a follower sees the messages only. A
  write that Codex's own sandbox blocks is an ordinary failed command, and `exec` never asks for an approval, so no
  refusal can be read. The human agreed these are limits
* **Permissions.** `--dangerously-bypass-approvals-and-sandbox` skips every approval and Codex's own sandbox, and is
  meant for an environment that is sandboxed from outside, as the kit's sandbox is
* **The sandbox.** The npm package is `@openai/codex`, and `codex --version` prints `codex-cli 0.167.0`, the version
  after the name. `check_for_update_on_startup = false` turns its update check off. `~/.codex` holds the login
  (`auth.json`), the configuration, the sessions, and SQLite files that index the threads, which resuming one needs,
  and the logs. `notify` runs a command with a JSON payload when a turn ends. Codex also reads
  `/etc/codex/config.toml` and `/etc/codex/managed_config.toml`, which the binary names and which were not tried. It
  contacts `api.openai.com` for the API, and its binary names `chatgpt.com` and `auth.openai.com` for a ChatGPT
  login. `codex login --device-auth` logs in with a device code, which needs no callback from a browser into the
  sandbox

## Requirements

1. `scripts/harnesses/codex.mjs` implements `HARNESS_CONTRACT` for Codex, named `codex` and titled `Codex`, and stands
   in `HARNESSES` after `claude` and `opencode`. A project can name `codex` in `harnesses`, and every command that goes
   over the harnesses takes it as it takes the other two
2. The contract has a member of `start` through which a harness says how a run starts in a role, given the role's
   name and its file: the options it adds and the words the prompt opens with, if any. `harnessCommand` names no
   option of its own for the role. Claude Code and OpenCode are given `--agent <role>` as today, and their prompts are
   unchanged. Codex is given no option, and its prompt opens with words that name the role, say to take it on, and
   name the role's file to read and follow, before the prompt the command gives today. The same holds for a step of
   the orchestrator and for a step that resumes a session
3. The contract's `wrappers` group holds what the kit's code assumes of a wrapper's format today: the name of a role's
   wrapper in its directory, how a wrapper the kit wrote is recognized, and how a model a project pinned in it is kept.
   Claude Code's and OpenCode's wrappers, their names, their recognition by `refresh`, the check of `agentrite run`
   and the keeping of a `model:` line are as today
4. A Codex wrapper is `.codex/agents/<role>.toml`, TOML that Codex reads, with `name` the role's name, `description`
   the role file's description, and `developer_instructions` the body the kit writes for every wrapper, which says to
   read the role's file. `refresh` writes it, keeps a `model` key a project added to it, and removes one the kit
   wrote for a role the project no longer has, as it does for the other harnesses' wrappers. A role named `default`,
   `worker` or `explorer`, in any case, is refused for a project that names `codex`, as a role named after another
   harness's own agent is refused
5. `.codex/config.toml` is Codex's instruction file. `init` writes it where it is missing, with a
   `developer_instructions` that tells Codex to read and follow the files of `instructionPaths` for the project's
   standards, before anything else. Where it exists and does not name each of those files, `init` and `refresh` leave
   it as it is and print a notice that names what it lacks and ends with `INSTRUCTIONS_SECTION`. Where the project's
   standards are its own and the file names the kit's `standards.md`, they print the notice the other two harnesses
   print for that. The file is judged by its text, without a TOML parser
6. `start.command` is `codex`, `start.skipPermissions` is `--dangerously-bypass-approvals-and-sandbox`, a session is
   `codex <options> -- <prompt>` and a headless run is `codex exec <options> -- <prompt>`
7. A headless run of Codex prints JSONL with `--json`. A new run chooses no session, and the session is read from the
   `thread_id` of `thread.started`. A run that continues a session resumes it with `exec resume <thread_id>`, and the
   model, `--dangerously-bypass-approvals-and-sandbox` and the caller's own arguments reach the resumed run. The final
   response is the `text` of the last completed `agent_message`, and a run that printed none has no response
8. `--follow` shows the text of each completed `agent_message` of a Codex run, and nothing else of it. `refused` of a
   Codex run is always empty
9. The image of a project that names `codex` holds `@openai/codex` at the version wanted for it, chosen as for the
   other harnesses, with the build argument `CODEX_VERSION`. The version of the host's command is the word after
   `codex-cli` on the first line of what it prints for `--version`
10. In the sandbox, Codex does not update itself or check for an update, and the developer and the agent of a run
    cannot turn that check back on through the project, `/work` or the home volume
11. In the sandbox, Codex loads `/work/.codex/config.toml` and `/work/.codex/agents/` in every run, `--in-place`,
    `--workdir` and a unit run alike, without the developer marking the project trusted
12. `.codex` in the agent's home is Codex's log directory, mounted from the project's log directory on the host as the
    other harnesses' are. Its login, its configuration, its sessions and its SQLite state are kept there, so a session
    resumed in a later container of the same project finds its thread
13. The allowlist admits, for Codex, `api.openai.com`, `chatgpt.com` and `auth.openai.com`, each with its reason, and
    in a project that names `codex`, a Codex session logged in with a ChatGPT account and one logged in with an API
    key each complete a turn in the sandbox. A host Codex needs beyond these, found when the implementer runs it, is
    added with its reason, and a host it contacts that is not needed for a turn is not admitted. The implementer
    records in `record.md` what was run and what it showed
14. With `"bell": true`, Codex in the sandbox rings the bell through `container/bell/ring-bell.sh` when a turn ends,
    from a file of `container/harnesses/codex/` if it needs one. With `false`, nothing of its bell is given to a run
15. The trailer check of `container/check-commit-message.mjs` refuses any trailer Codex adds of its own to a commit
    message, if it adds one, and the rule on trailers in `standards.md` names it. The implementer records in
    `record.md` whether a commit Codex made in the sandbox held a trailer
16. In a project whose harnesses are `claude` and `opencode`, nothing changes: the files `init` and `refresh` write,
    the commands `agentrite run` and the orchestrator start, the image, the allowlist and the mounts are as before
    this unit
17. This repository names `codex` in its own `agentrite.json`, and holds its Codex wrappers and its
    `.codex/config.toml` as `refresh` writes them. The table "What the repository holds besides the package" of
    `CONTRIBUTING.md` lists `.codex/`
18. The places of "Adding a harness" that are outside the module name Codex where they name each harness: the usage
    of `agentrite run`, the documents, the `keywords` of `package.json`, the pointer package's text and the
    components diagram, with its SVG generated. `SETUP.md` says how the kit's instructions reach Codex, that Codex
    loads them only in a project the developer marked trusted in their own configuration of Codex, and that the
    project's `developer_instructions` replaces the developer's own. `SANDBOX.md` says how to log in to Codex in the
    sandbox, where its login and its logs are kept, and the hosts it admits for it. `ORCHESTRATOR.md` says that a
    step of Codex is followed by its messages alone and never stops for a refused permission
19. "Adding a harness" of `CONTRIBUTING.md` says what the members of requirements 2 and 3 ask of a new harness, and
    is otherwise true of the kit after this unit
20. The tests cover Codex as the existing tests cover the other two harnesses: its module's own readings, its
    wrappers and their refresh, its instruction file in `init` and `refresh`, its command lines, its headless
    readings from JSONL as the human's runs printed it, a start in a role for every harness, and its bell

## Decisions

* **The kind is feature.** How a run starts in a role, what the contract holds of a wrapper's format, how the
  instructions reach Codex and what the sandbox gives it are decisions
* **The role is told in the prompt, through a member of the contract.** The human decided it. Codex has no option
  that starts a session as a custom agent, and a spawned subagent would leave the main session, which runs the
  step, outside the role. The member returns options and opening words, so that `--agent` stays where it is for
  the two harnesses that have it and `harnessCommand` knows of neither form. The words are given on every run,
  resumed ones among them: `harnessCommand` does not know whether a run resumes, and a resumed session told its
  role again loses nothing
* **The wrappers are installed for Codex too.** The human wants them. They do not start a run in its role, but they
  let a session of Codex spawn a role as a subagent, as a session of the other two can. Since their format is TOML,
  the three things the kit's code assumes of the Markdown format move into the `wrappers` group. Keeping them
  outside, with a test of which harness it is, was rejected: it is the shape 0091 removed. `agentrite run` keeps
  checking a Codex wrapper as it checks the others, so that one rule says whether a project was refreshed for its
  harnesses, though Codex's run does not need the wrapper
* **The instructions go through `developer_instructions` of `.codex/config.toml`.** The human decided it. An
  `AGENTS.md` that holds the kit's files would exceed the 32 KiB that Codex reads, this repository's three files
  being about 27.6 KB before a project's own text, and would be a copy that goes stale. `model_instructions_file` was
  rejected because it replaces Codex's own instructions rather than adding to them. The file points at the files and
  does not hold them, as the role wrappers point at the roles
* **The project's `.codex/config.toml` is judged by its text.** The kit has no dependencies and no TOML parser, and
  a TOML file cannot be amended safely without one. So `init` writes it only where it is missing, as it writes a
  missing `CLAUDE.md`, and otherwise tells the developer what to add, as for a `CLAUDE.md` that lacks its lines
* **Trust is the developer's on the host and the sandbox's in the container.** On the host, Codex asks whether to
  trust a project at its first interactive start and keeps the answer in the developer's own configuration, which
  the kit does not write. In the sandbox, every run is in `/work`, which the kit trusts for it, since a developer
  cannot be asked to mark a container's path. Whether that is given in the home's configuration, a configuration of
  `/etc/codex/` or the command line is the plan's
* **The whole of `~/.codex` is the log directory.** Resuming a thread needs both the session files and the SQLite
  files that index them, which are at the top of `~/.codex`, so mounting `sessions/` alone would split them between
  the host and the home volume. The login is then a file of the host's log directory, as OpenCode's is
* **The update check is turned off where the agent cannot write.** A key in `~/.codex/config.toml` would sit in the
  log directory, which the agent writes. Which read-only place the plan uses is the plan's, so long as requirement 10
  holds
* **The hosts are each harness's own.** `chatgpt.com` and `auth.openai.com` are OpenCode's hosts too. Codex lists them
  again, so that a project that names Codex alone admits them, and one that drops OpenCode keeps them. Whether a host
  two harnesses list stands once in `KIT_ALLOWLIST` is the plan's
* **Follow and refused are limits, not gaps.** The human agreed: Codex 0.167.0 prints no item for a shell command in
  `exec --json` and never asks for an approval in `exec`, so the kit has nothing to show or to read. A step of Codex
  that a refusal would have stopped goes on to its outcome instead
* **The default orchestrator and the project template are unchanged.** Codex is a harness a project chooses. Adding it
  to `templates/project/agentrite.json` would put a third package and its hosts into every new project's image, and
  changing `orchestrator.json` is a choice of models, not of the kit's support of a harness. This repository names it,
  so that the kit's own work runs on it and its files are dog-fooded
* **The adversary is the agent in the container, as for the sandbox as a whole.** What makes Codex trust `/work`, and
  what turns its update check off, is the installed kit's, which a unit run's agent cannot write. Trusting `/work`
  gives the agent nothing it lacks: the project's `.codex/` that trust loads is a file the agent can write anyway.
  This unit does not defend against a compromised `@openai/codex` package, nor against what Codex does with
  `--dangerously-bypass-approvals-and-sandbox`, which is what the kit's sandbox is for

## Non-goals

* A third way for the kit's instructions to reach Codex, such as through `AGENTS.md` or a skill
* Codex's own sandbox modes in the kit's sandbox. A session started there without `--skip-permissions` runs with
  Codex's defaults, which the kit does not configure or test
* Reading a refusal of Codex, or showing its shell commands to a follower, until Codex prints them
* Changing a harness's position, title or behavior other than by requirements 2 and 3
* Checking on the host that Codex trusts the project, or writing the developer's own configuration of Codex
* A model of Codex in the default orchestrator, or in `templates/project/agentrite.json`
* Codex's other surfaces: the desktop app, the cloud, `codex review` and its app server

## Beyond the request

1. **`agentrite run` warns when Codex does not trust the project.** It reads the developer's `~/.codex/config.toml`
   and, for a project not marked trusted, says that Codex will not read the kit's instructions or the wrappers. It
   costs reading a TOML file the kit does not own, by its text, and a test. Without it, a headless run on the host in
   an untrusted project works without the kit's instructions, and the developer finds out from what the agent does,
   or from `SETUP.md`
2. **A wrapper keeps a pinned `model_reasoning_effort` too.** `refresh` keeps it beside `model`. It costs a line of
   the Codex module and a test. Without it, a project that pins an effort in a Codex wrapper loses it at `refresh`
   and pins it again, as it would after any change to a tracked file
3. **`--follow` shows other item types of Codex.** Items of types other than `agent_message`, such as a command or a
   file change, if a later Codex prints them, are shown as the other harnesses' tool calls are. It costs reading item
   types nobody has seen printed yet, guessed from documentation. Without it, a follower sees the messages, as the
   human agreed
