---
kind: feature
status: in-progress
timestamp: 2026-10-14T08:12:35Z
---

# 0048 Load the process through the harness

## Log

- 2026-10-14T08:12:35Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the macOS host,
  on `master` at `cf13900`, on the human's request to specify the first action of the notes of a conversation of
  2026-10-13, "Load the instructions through the harness". The human gave the notes as a file outside the
  repository, and they are not committed: what of them this unit needs is in the spec's "Context". The session took
  the role on itself, reading the role file and `process.md` as installed under `node_modules/agentrite`, which is
  release 6.0.0, and not through the wrapper. Made the unit as a feature. Numbered 0048: the highest number in
  `changes/` is 0047, and `origin` holds `master` alone, at `4d36473`, which is behind the local one.
  Read besides: `scripts/agentrite.mjs` for what `init` and `refresh` write and how `init` amends `package.json` and
  notices an existing `CLAUDE.md`, `scripts/agentrite-roles.mjs`, both templates in `templates/project/`, the
  sections of `README.md` on `init`, installing and updating, and the spec of unit 0045.
  Tested before specifying, as the notes asked, in scratch projects outside the repository, with Claude Code
  2.1.299 and Haiku, and OpenCode 1.19.0 and a local Gemma 4 31B: what the table in the spec's "Context" shows.
  Wrote `spec.md`. Of what the notes left to decide, the spec decides: existing projects run `init` and `refresh`
  takes neither file over, and `opencode.json` is written at the project root. The human was asked about neither,
  and approving the unit approves them. Not checked: the sandbox, where the same harnesses read the same files. The
  status is `draft`
- 2026-10-14T08:56:58Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's remark that a
  project may not see the notices of `init`, and that what must be in `CLAUDE.md` and `opencode.json` needs to be
  documented well. Changed `spec.md`: requirements 11 and 12 are new, and ask for a section of its own in
  `README.md` that lists every file and line that makes the kit's instructions reach an agent, says that a missing
  one fails without a word, and is pointed to from "agentrite init", the text on existing files and "Updating a
  project to a newer kit". What requirement 11 asked before is requirement 13. Added the decision with its
  rationale. The status is `draft`
- 2026-10-14T09:02:47Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's decision that
  `refresh` detects a `CLAUDE.md` or `opencode.json` that does not load the kit's instructions and prints a notice,
  and does not amend either file, so that the responsibility stays with the project and one that leaves the lines
  out on purpose is not overruled. The human weighed `refresh` amending both and turned it down. Changed `spec.md`:
  requirements 9 and 10 are new, on what `refresh` reads and notices and on the one rule both commands judge a file
  by. Requirement 2 now notices an existing `CLAUDE.md` only with `claude` among the harnesses and only when it
  lacks a line, and requirement 5 counts an `opencode.json` that is not JSON as loading the path when its text holds
  it in quotes. The requirements after 9 are renumbered. Rewrote the decision on `refresh`, added one on the rule,
  and added two entries to "Beyond the request". The status is `draft`
- 2026-10-14T09:24:08Z [human] approved the spec. The status is `approved`
- 2026-10-14T09:32:01Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the host, on
  `feature-0048-load-the-process-through-the-harness`, which was there already at the head of `master`, `f43b190`.
  Read the role file and `process.md` as installed under `node_modules/agentrite`, release 6.0.0. Wrote `plan.md`
  against that tree, where `npm test` passes 500 tests. What the spec left to the plan, the plan decides: a module
  `scripts/agentrite-instructions.mjs` that judges both files, the layout of an amended JSON file moved into
  `scripts/agentrite-json.mjs` for `package.json` and `opencode.json` alike, the phrases and notices, where the
  lines are printed, the heading of the README section, and that a `CLAUDE.md` that cannot be read lacks both
  lines. Found in the working tree an uncommitted edit of `README.md` that is not this unit's, "instp-alled" in
  the opening of "Commands". It was left as it is and not committed, for the human. The status is `planned`
- 2026-10-14T11:53:13Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on
  `feature-0048-load-the-process-through-the-harness` at `38d6568`, where `npm test` passes 500 tests. The working
  tree was clean: the uncommitted edit of `README.md` that the plan names was no longer there. The status is
  `in-progress`
- 2026-10-14T11:55:46Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, changed the notice of
  `refresh` for an `opencode.json` in `plan.md`, before writing it: its first line breaks before "because". Laid out
  as the plan gave it, the line is 133 characters for the problem of a list that lacks the path, and task 2 holds
  every notice under 120 for the problems that carry no error message. The plan contradicted itself there, and the
  break is the smallest change that keeps the text it gives
- 2026-10-14T11:59:24Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, added to `plan.md` two tests
  that compare every line `refresh` prints and that the plan did not name: "a project with the three wrappers of
  the release before gets the fourth" in `tests/agentrite-refresh.test.mjs`, and "refresh runs on the file config
  wrote" in `tests/agentrite-config.test.mjs`, which adds that file to "Files". Both failed on the notices of task
  8, and now compare the lines before the first empty line, as the plan has the others do
- 2026-10-14T12:02:50Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, made the check of task 15 in a
  scratch project outside the repository, in the session's scratch directory on Linux: the kit installed from
  `npm pack` of the working copy at `c9ed273`, `npx agentrite init --no-sandbox claude opencode`, which wrote
  `opencode.json` as R3 gives it and `CLAUDE.md` with both lines, and the line "The code word of this file is
  PERIWINKLE-0048." appended to the installed `node_modules/agentrite/process.md`. Each session was asked, without
  reading a file or running a tool, for the code words in its context, and each subagent was dispatched by such a
  session with the same question:
    * Claude Code 2.1.299 with `claude-haiku-5-5`, run with `-p` and with Read, Bash, Grep, Glob and the Agent tool
      disallowed: `PERIWINKLE-0048`
    * Its subagent of the `planner` wrapper, the Agent tool allowed and the file tools not: `PERIWINKLE-0048`, read
      from the tool result in the stream output, which reports 0 tool uses of the subagent
    * Claude Code, the same, in a copy of the project whose `CLAUDE.md` lacks the line
      `@node_modules/agentrite/process.md`: `NONE`. That is the row the spec's table has as not tested
    * OpenCode 1.19.0 with `openai/gpt-5.6-luna`, run with `opencode run`: `PERIWINKLE-0048`, with no tool part in its
      output
    * Its subagent of the `planner` wrapper, through the task tool: `PERIWINKLE-0048`, read from the child session in
      `opencode export`, which holds the prompt and the answer and no tool part
  Not as the spec's check ran it: no local model could be reached from here, so OpenCode ran a hosted OpenAI model
  and not Gemma 4 31B. `openai/gpt-5.4-mini` was tried first and refused by the account. Not checked: the sandbox,
  and a session on macOS
- 2026-10-14T12:03:44Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the plan's verification on
  `b72b9d8`, the last commit that changes code; the commit after it changes only this unit's `plan.md` and
  `record.md`. `npm test` passes 542 tests, against 500 before the unit. `node scripts/check-changes.mjs` exits 0.
  `node scripts/agentrite.mjs refresh` at the root prints `up to date` for the eight wrappers and `sandbox.sh`, then
  the notice of `CLAUDE.md`, which names `@node_modules/agentrite/process.md` alone, and the notice of an
  `opencode.json` that is missing, exits 0, and leaves `git status --short` empty. `node_modules/agentrite/process.md`
  is named in `scripts/` by `scripts/agentrite-instructions.mjs` alone, and `scripts/agentrite.mjs` judges neither
  file itself. `npm pack --dry-run` lists both new modules. No file the unit changed has a line over 120 characters
  or an em dash: the one the notices are checked for was a literal character in
  `tests/agentrite-instructions.test.mjs`, and is an escape since `b72b9d8`, a commit the plan does not list.
  `git diff master` of `CHANGELOG.md`, `CONTRIBUTING.md`, `SANDBOX.md`, `CLAUDE.md`, `AGENTS.md`, `process.md` and
  `roles` is empty. Every task of `plan.md` is ticked. Not checked: the suites on macOS. The unit stays
  `in-progress` until it is reviewed and the human has decided what the review blocks on

## Amendments
