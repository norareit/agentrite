---
kind: feature
status: in-progress
timestamp: 2026-11-06T14:12:53Z
---

# 0100 Codex as a third harness

## Log

- 2026-11-06T14:12:53Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `86eeac9`, on the
  human's request to add Codex as the kit's third harness, with the decisions the human made on the research of the
  human's session. Numbered 0100, which the human's session reserved while 0099 was written beside it. Read
  `scripts/agentrite-harness.mjs`, `scripts/harnesses/`, `scripts/agentrite-run.mjs`, the wrapper code of
  `scripts/agentrite.mjs` and `scripts/agentrite-roles.mjs`, "Adding a harness" of `CONTRIBUTING.md` and unit
  0097. Checked Codex 0.167.0 on the host with no paid call: its help texts; `codex debug prompt-input` in a
  scratch project, which showed a hyphenated agent name accepted, `developer_instructions` and the agents loaded
  only for a trusted project, and the project's `developer_instructions` replacing the user's; and runs of
  `codex exec` with no login, which showed `--`, an ignored stdin and both orders of `resume` accepted. Wrote
  `spec.md`. The status is `draft`
- 2026-11-06T15:05:01Z [human] approved the spec. The status is `approved`
- 2026-11-06T15:20:09Z [Claude Code, anthropic/claude-opus-5-5] as the planner, cut
  `feature-0100-codex-as-a-third-harness` from `master` at `41ad28c` and wrote `plan.md`. Checked on the host with
  Codex 0.167.0 and an empty `CODEX_HOME`, so with no login and no paid call: `codex exec --json` printed
  `thread.started`, `turn.started`, `error` events, an `item.completed` of type `error` and `turn.failed`, which the
  plan takes as its fixture lines; `codex exec -m <id> --json resume <thread> -- <prompt>` printed a `thread.started`
  with the same id and recorded that model for the resumed turn; and the binary holds the instruction that a commit
  message ends with `Co-authored-by: Codex <noreply@openai.com>`. Took three readings: a role named after one of
  Codex's own agents is refused in every project, as the other harnesses' own agents are, through `ownAgents`;
  `refresh` notices a missing `.codex/config.toml`, as it notices a missing `opencode.json`; and `chatgpt.com` and
  `auth.openai.com` stay in both modules, the entrypoint admitting a host listed twice once. The status stays
  `approved`
- 2026-11-06T15:23:32Z [Claude Code, anthropic/claude-opus-5-5] as the planner, recorded that the human confirmed
  the reading on Codex's own agents: a role named `default`, `worker` or `explorer` is refused in every project,
  whatever harnesses it names, as the plan has it. The status stays `approved`
- 2026-11-06T15:26:05Z [OpenCode, openai/gpt-6.1-sol] as the spec-reviewer, fully reviewed `spec.md` and `record.md`
  at `a7b8c68` on the unit's branch. The review came after approval at the human's request, as an exception to the
  role's timing and default-branch rules. Findings F1, F2 and F3 are saved in
  `.reviews/0100-codex-as-a-third-harness/spec-review-2026-11-06T152605Z.md`. Checked Codex 0.167.0's help texts;
  could not independently verify the earlier prompt and execution experiments, live authentication and required
  hosts, or protected sandbox configuration and precedence, as detailed in the findings file. The status stays
  `approved`
- 2026-11-06T15:31:35Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the unit's branch at `badb251`,
  at the human's request, checked the three findings of the spec review against the repository and corrected
  `spec.md` by them. All three hold. The changes, for the planner to bring `plan.md` in line with:
    * F1, accepted. Requirement 17 is replaced. It said this repository names `codex` in its own `agentrite.json`
      and holds its Codex wrappers and `.codex/config.toml`, with `.codex/` in the table of `CONTRIBUTING.md`. It
      now says the root's own files are as before this unit, with no `codex`, no Codex wrappers and no
      `.codex/config.toml`, and the suite's checks of the root against the installed release hold as before.
      Release 8.3.0, the installed one, knows no `codex`, and "The kit's own copy of the kit" of `CONTRIBUTING.md`
      changes the root only when the repository moves to the release that holds the change. A new decision, "This
      repository adopts Codex with the release that holds this unit, not in this unit", gives the reasons, and the
      sentence on dog-fooding is gone from the decision on the default orchestrator and the project template. For
      the plan: both tasks under "This repository's own files" go, and so does `.codex/` in the table of
      `CONTRIBUTING.md`
    * F2, moot by F1. It found that requirement 17 had `refresh` write `.codex/config.toml`, which by requirement 5
      only `init` writes. The new requirement 17 names no command. Requirement 5 is unchanged
    * F3, accepted. Requirements 1, 14 and 15 no longer name where the kit's code is: requirement 1 says a module of
      its own beside the other two harnesses' modules, requirement 14 says the sandbox's bell script and drops the
      file of Codex's own directory, and requirement 15 says the sandbox's check of a commit message's trailers.
      What each requires is unchanged. A new decision, "The spec names files a reader meets, and leaves the kit's
      own code to the plan", records which paths the spec keeps and why. For the plan: nothing changes but the
      references, since the plan already gives the files
- 2026-11-06T15:46:56Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, recorded that the human agreed to the
  correction by F1: this repository adopts Codex when it updates to the release that holds this unit, and not in
  this unit. The status stays `approved`
- 2026-11-06T15:50:17Z [Claude Code, anthropic/claude-opus-5-5] as the planner, brought `plan.md` in line with the
  corrected spec. By F1, the plan no longer changes the root's own files: the section on this repository says they
  stay as they are, the two tasks that added `codex` to `agentrite.json`, wrote `.codex/` and listed it in the table
  of `CONTRIBUTING.md` are replaced by one task that checks the root is unchanged and its suite's checks hold
  (R17), `.codex/` is gone from the rewrite of "Adding a harness", and the commit point of the repository's own
  files is removed. Since `./sandbox-dev.sh` takes its harnesses from the root's `agentrite.json`, the checks of
  the sandbox move to a scratch project into which the working tree's kit is installed from `npm pack`. F2 and F3
  change nothing of the plan, which gives the files itself. The status stays `approved`
- 2026-11-06T16:04:08Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, began the work on the unit's
  branch at `537f73d`, where `npm test` passes its 1624 tests. Ticked the plan's first commit point, which the
  planner's commits made. The status is `in-progress`
- 2026-11-06T16:24:20Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, added a task to `plan.md`
  before doing it: with a third harness, the usage of `init` grew to 125 characters, over the limit the commands
  print within, and the message of a `harnesses` at fault read `"claude" and "opencode" and "codex"`, so the usage
  gives the harnesses on a line of their own and the message joins them as the other lists of the kit do. The fake
  harness of the wrapper's tests printed no version Codex's `readVersion` reads, so it may print `codex-cli
  <version>`. Took one reading: the plan's case of a role named `Default` or `EXPLORER` cannot reach the refusal of
  an agent's name, since a role's name is in lowercase letters and such a name is refused by its form first; the
  test gives `default`, `worker` and `explorer` the refusal that names Codex, for a project of each harness, and the
  other cases the refusal of the form
- 2026-11-06T16:37:23Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, implemented the plan in
  `b7cb504`, `93e97c0` and `07e6eee`. On `07e6eee`, `npm test` passes its 1720 tests and `npm run check-changes`
  passes. The root's own files are unchanged: `git diff master` of `agentrite.json`, `.claude`, `.opencode`,
  `CLAUDE.md` and `opencode.json` is empty, the root holds no `.codex/`, `tests/repository-own-files.test.mjs` passes
  unchanged and `npm run kit -- refresh` prints `up to date` for every file (R17). For R16, two scratch projects of
  `claude` and `opencode` were set up with `npx agentrite init claude opencode` from the `npm pack` of `master` at
  `41ad28c` and of `07e6eee`: their files, `init`'s output and the command lines that `agentrite run` gave a fake of
  each harness, interactive and headless, with a model, `--skip-permissions` and arguments after `--`, are the same.
  Checked with Codex 0.167.0 and no login, so with no paid call:
    * On the host, with a `CODEX_HOME` that trusts a scratch project initialized with `claude`, `opencode` and `codex`,
      `codex debug prompt-input` lists the four TOML wrappers among the roles of its spawn tool, each description read
      as one line, and holds the `developer_instructions` of the project's `.codex/config.toml`
    * In that project's sandbox, from the `npm pack` of the working tree, `./sandbox.sh --in-place --rebuild` built
      an image labelled `claude@2.1.319 opencode@1.19.3 codex@0.167.0`, and `codex --version` in it printed
      `codex-cli 0.167.0` (R9)
    * With no configuration in the home, `codex debug prompt-input` in `/work` shows the project's
      `developer_instructions` and the wrappers in an `--in-place` run, a `--workdir` run and a unit run of an
      approved task (R11). The managed configuration cannot be written by the agent: an append to it fails with a
      read-only file system
    * Codex's update check is `GET https://api.github.com/repos/openai/codex/releases/latest`, as its log of an
      interactive start on the host with the check on shows, and that start wrote `version.json`. In the sandbox,
      an interactive start of 30 seconds with `check_for_update_on_startup = true` in `~/.codex/config.toml`, and
      then in `/work/.codex/config.toml`, wrote no `version.json`, and Codex's log holds no request of the update
      check (R10). The proxy refused `github.com`, `api.github.com` and `raw.githubusercontent.com`, which Codex's log
      gives as its sync of curated plugins and its announcement tip, and `files.openai.com` and `ab.chatgpt.com`,
      which its log does not name. None is needed for a turn, so none is admitted. Whether a turn needs another host
      is not known until a turn has run
    * With `"bell": true`, `/etc/codex/config.toml` holds `notify = ["sh", "/etc/agentrite/bell/ring-bell.sh"]` and
      the script is at that path, and with `"bell": false` `/etc/codex/` holds the managed configuration alone. That
      the bell rings at the end of a turn was not checked, since no turn ran (R14)
- 2026-11-06T16:37:23Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, left to the human the checks that
  need a login of Codex and paid turns, since the implementer has no account or key of its own: a turn with a
  ChatGPT login by `codex login --device-auth` and one with an API key, watching the proxy's refusals (R13); the
  resume of that session in a new container (R12); the bell ringing at the end of a turn (R14); a step of the
  orchestrator on Codex and one that resumes it, with `--follow` (R2, R7, R8); and a commit made by Codex, with
  whether its message held a trailer and the hook refused it (R15). Their boxes in `plan.md` stay open, and the
  status stays `in-progress`
- 2026-11-06T18:57:57Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the checks that need a login in
  the scratch project's sandbox, after the human logged in to Codex there with `codex login --device-auth`, a ChatGPT
  login, and asked for them. A login made on the host is not seen in the sandbox, as `SANDBOX.md` says: a turn before
  the login in the sandbox failed with a 401 that `api.openai.com` gave, so that host is reached through the proxy
    * R13, the ChatGPT login: `codex exec --json` completed a turn and printed `thread.started`, an `agent_message`
      and `turn.completed`. The proxy refused `example.com`, the entrypoint's canary, `ab.chatgpt.com`, which Codex's
      debug log gives as its export of metrics to `/otlp/v1/metrics`, and hosts of `oaiusercontent.com` such as
      `sdmntprsouthcentralus.oaiusercontent.com`, which its debug log gives as the downloads of the bundles of the
      remote plugins installed in the account, eight of them, as `gmail` and `google-drive`. The turn needed none, so
      none is admitted. A login with an API key was not checked: no key is available to the implementer
    * R12: in a new container, `codex exec --json resume <thread>` found the thread, printed `thread.started` with its
      id, and the model quoted its answer of the earlier turn
    * R2, R7, R8: a unit run of an approved task with `npx agentrite orchestrate --skip-permissions --follow` on a
      definition of two implementer steps of Codex on `gpt-6.1-sol` ran both and ended with exit 0. `--follow` showed
      each `agent_message` with the instant the command learned of it, the outcome of each step was read from its
      final response, `state.json` holds one session, the thread of the first step, which the second continued, and
      Codex's session file of that thread records two turns, each of `gpt-6.1-sol`. Codex printed `Reading additional
      input from stdin...` on its standard error at the start of each step, and went on
    * R15: Codex made three commits, `task-0001 begin implementation`, `task-0001 add hello text file` and
      `task-0001 record verification`, with a body of none and no trailer, so the hook refused none. Its session holds
      `Co-authored-by` only in the rule of `standards.md` it read
    * R14: not checked. Whether the bell rings is seen on the human's terminal alone

## Amendments
