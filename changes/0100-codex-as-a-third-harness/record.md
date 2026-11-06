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

## Amendments
