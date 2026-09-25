---
kind: feature
status: in-progress
timestamp: 2026-09-24T23:44:22Z
---

# 0002 A command that writes the harness role wrappers

## Log

- 2026-09-24T23:44:22Z [human] asked for a small executable in the kit's tarball that creates or populates
  `.claude/agents/` with the three role wrappers as Norareit has them, and the equivalent for OpenCode as discussed in
  one of the historic changes. It fails hard when any file it would write already exists, and takes a required
  argument, `claude` or `opencode`, or both
- 2026-09-24T23:44:22Z [Claude Code, anthropic/claude-opus-5-5] took the planner role. A feature: the work needs
  decisions, among them the OpenCode directory and prompt form, what a refused run leaves behind, and the per-role
  model question Norareit's 0037 left open, which the spec settles by having the command only ever create files
- 2026-09-24T23:44:22Z [Claude Code, anthropic/claude-opus-5-5] checked OpenCode's behavior with the local 1.18.32
  in a scratch project, using `opencode debug agent`: markdown agents load from both `.opencode/agents/` and
  `.opencode/agent/`, `{file:...}` in a markdown agent's body is not expanded, and a markdown agent overrides a
  same-named `agent` entry in `opencode.json`. The sandbox pins 1.18.30, which was not checked
- 2026-09-24T23:44:22Z [Claude Code, anthropic/claude-opus-5-5] wrote `spec.md` and `plan.md`: ten requirements,
  ten decisions and seven non-goals; six tasks, six verification items and two commit points. Status left at `draft`
  for the human's approval
- 2026-09-25T00:07:11Z [human] questioned whether OpenCode really cannot reference a role file from a markdown agent
- 2026-09-25T00:07:11Z [Claude Code, anthropic/claude-opus-5-5] checked a `prompt: "{file:...}"` frontmatter key in
  OpenCode 1.18.32: it is ignored, giving an empty prompt without a body and the body's text with one. The only
  inclusion found is `{file:...}` in `opencode.json`, which the command would have to edit. The spec keeps the
  pointer wrapper, which works as Claude Code's does and copies no role content
- 2026-09-25T00:07:11Z [human] noted that projects do not read the kit's README, and agreed to narrow requirement 9
  to keeping the README's installation section true, and to drop the advice about an existing `opencode.json` block
- 2026-09-25T00:07:11Z [Claude Code, anthropic/claude-opus-5-5] narrowed requirement 9, reworded the `opencode.json`
  decision to leave deleting a leftover block to the project's own change, and dropped that advice from the plan's
  README task
- 2026-09-25T14:23:34Z [opencode, ollama/qwen3.8:27b-128k] took the implementer role and set the status to
  `in-progress`
- 2026-09-25T14:23:34Z [opencode, ollama/qwen3.8:27b-128k] copied Norareit's `.claude/agents/` at `610d564` into
  `tests/fixtures/claude-agents/`, and `diff` of each fixture against Norareit's current file reports nothing
- 2026-09-25T14:30:03Z [opencode, ollama/qwen3.8:27b-128k] wrote the unit tests, confirmed they fail, committed them
  with the fixtures; then implemented `scripts/agent-kit-roles.mjs`, the `bin` and `files` entries, and the README,
  and committed together
- 2026-09-25T14:30:03Z [opencode, ollama/qwen3.8:27b-128k] found the entry-point guard silent when the command is run
  through `node_modules/.bin/agent-kit-roles`, because node resolves that symlink and `import.meta.url` no longer
  matches `process.argv[1]`; `isMain` now compares the canonical paths of both. A stale install under `/tmp/opencode`
  from an earlier session had masked this, because its script was a different one
- 2026-09-25T14:30:03Z [opencode, ollama/qwen3.8:27b-128k] ran the suites on the final tree: `npm test` reports 79
  tests, all passing, and the new ones among them; the packed tarball lists `scripts/agent-kit-roles.mjs` at
  `rwxr-xr-x`; a fresh scratch project's `npm install` and `npx agent-kit-roles claude opencode` write the six files
  and a second run refuses, naming each on standard error and writing nothing; `opencode debug agent` reports the
  Norareit description, `mode` `subagent` and the pointer body for all three roles; `diff -r` of the scratch
  `.claude/agents/` against Norareit at `610d564` reports nothing; `node scripts/check-changes.mjs` passes on the
  branch
- 2026-09-25T18:13:37Z [OpenCode, openai/gpt-6-sol] reviewed unit 0002 in a full review of commit
  `bb19d49a4d6ae0723ee0c36d0c973805398fd589`. Findings: S1, S2, P1 and C1. Saved the review in
  `.reviews/0002-role-wrapper-command/review-bb19d49-20260925T1812Z.md`. The recorded packed-tarball installation
  and `npx` run, and behavior on the sandbox's OpenCode 1.18.30, were not verified; `npm test`, the change check, the
  package dry run and OpenCode 1.18.32 were checked on the reviewed tree.
- 2026-09-25T18:21:28Z [opencode, ollama/qwen3.8:27b-128k] accepted finding S1 and corrected it: `parseHarnesses`
  now checks membership with `Object.hasOwn(HARNESSES, name)`, so Object.prototype property names such as `toString`,
  `constructor` and `__proto__` are reported as unknown harnesses instead of being accepted. A new unit test covers all
  three. Verified: with `toString` and `__proto__` as the argument the CLI prints the usage to standard error and
  exits 2, and writes nothing
- 2026-09-25T18:21:28Z [opencode, ollama/qwen3.8:27b-128k] accepted finding S2 and corrected it: the preflight
  existence check now uses `lstatSync` instead of `existsSync`, so a dangling wrapper symlink is named on standard
  error and the run writes nothing, matching R7. A new test plants a dangling symlink at
  `.opencode/agents/reviewer.md` and asserts the refusal, that it survived, and that no other file was created.
  Verified by running the scenario directly: exit 1, the symlink named, and zero files written
- 2026-09-25T18:21:28Z [opencode, ollama/qwen3.8:27b-128k] accepted finding C1 and corrected it: added a test that
  executes the script through a `node_modules/.bin/agent-kit-roles` symlink, the path `npx` uses, so the `isMain`
  entry-point guard is covered by a test rather than only the manual scratch run
- 2026-09-25T18:21:28Z [opencode, ollama/qwen3.8:27b-128k] re-ran `npm test` after the corrections: 82 tests, all
  passing. Left the status at `in-progress` because P1 remains open for the human
- 2026-09-25T18:58:04Z [opencode, ollama/qwen3.8:27b-128k] held the P1 finding open and did not correct it: the
  record was left at `draft` "for the human's approval", then moved straight to `in-progress` with no `approved` entry
  in between. Reproduced in history: `446ab7d` carries `status: draft`, `574a705` carries `status: in-progress`. This
  is a records gate, not a code one, and the approval it names is the human's to grant, so it was not fabricated
- 2026-09-25T18:58:04Z [human] approved the unit, deciding to close P1 without back-dating any timestamp. The record
  keeps the existing log intact and notes the approval now, rather than inventing an `approved` transition
- 2026-09-25T18:58:04Z [opencode, ollama/qwen3.8:27b-128k] recorded the approval above. Status stays `in-progress`; the
  S1, S2 and C1 fixes still need a delta re-review of the commit after `bb19d49` before the unit can reach `implemented`
