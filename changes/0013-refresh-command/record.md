---
kind: feature
status: in-progress
timestamp: 2026-10-02T14:01:59Z
---

# 0013 A command that brings the kit's own files in a project up to date

## Log

- 2026-10-02T14:01:59Z [human] asked, while preparing Norareit's move to AgentRite 2.0.0, whether the kit should
  have a way to clean out the generated files that are meant to be replaced, or an "install" and a "clean
  install", and then asked for a unit for a refresh command
- 2026-10-02T14:01:59Z [Claude Code, anthropic/claude-opus-5-5] took the planner role and wrote `spec.md` and
  `plan.md`. A feature: it narrows a decision of 0010 and needs decisions on which files are the kit's, what of a
  project's edits survives, and what happens at a path that is not a regular file. Read `scripts/agentrite.mjs`,
  `scripts/agentrite-roles.mjs` and the `init` tests before planning, so the plan names the functions it reuses.
  Written on a branch from `master` at 5f0705d, which does not yet hold 0012; the plan says to start once it does.
  Not decided by the human yet, and theirs to change on approval: that `CLAUDE.md` is not refreshed, that additions
  to a wrapper's body are replaced, and that `package.json` and `.dockerignore` are left alone
- 2026-10-02T15:46:08Z [human] asked for the unit to be implemented, which approves it as written, with the three
  decisions the planner had left to the human: `CLAUDE.md` is not refreshed, additions to a wrapper's body are
  replaced, and `package.json` and `.dockerignore` are left alone
- 2026-10-02T15:46:08Z [Claude Code, anthropic/claude-opus-5-5] rebased the branch onto `master` at ecccb16, which
  holds 0012 and 0014, took the implementer role and moved the status to `in-progress`. Since 0014 the wrappers hold a
  folded description, whose indented lines `refreshedWrapper` has to treat as part of the key, as the plan of 0014
  notes
- 2026-10-02T15:47:32Z [Claude Code, anthropic/claude-opus-5-5] rewrote the parsing tests for `parseArgs` and saw the
  file fail on the missing export. Replaced `parseInitArgs` with `parseArgs`, which returns the command and the
  harnesses, and dispatched on the command through a registry, `COMMANDS`, with `refresh` a stub that throws. One of
  the new tests then failed for a reason of its own: it matched a pattern against the error where `assert.throws`
  matches against the error with its `Error: ` prefix, and was corrected to compare the message. `npm test` passed,
  151 of 151
- 2026-10-02T15:48:06Z [Claude Code, anthropic/claude-opus-5-5] changed the plan before the refactoring, for a reason
  found in the code. The plan had `projectFiles` built from `kitOwnedFiles`. But `init` writes `AGENTS.md` and
  `CLAUDE.md` between the wrappers and the shim, and an existing test requires the wrappers `init` plans to equal
  those of `agentrite-roles` exactly, which a list that marks them for `refresh` would not. So the refactoring cuts
  out only `shimFile`, what `agent.sh` is, and `kitOwnedFiles` is written with `refresh`, its one caller. The
  requirements are untouched
- 2026-10-02T15:49:47Z [Claude Code, anthropic/claude-opus-5-5] wrote `tests/agentrite-refresh.test.mjs`, with the
  unit tests of `refreshedWrapper` and the end-to-end tests of the command in one go, where the plan has them as two
  steps, and saw the file fail on the missing export. Wrote `refreshedWrapper`, `kitOwnedFiles` and `refresh`. One
  unit test then failed because of its own input: it pinned a model on the line straight after `description: >-`,
  inside the folded text, which no YAML file holds; it now pins it ahead of the description. `npm test` passed, 170 of
  170. The two commit points for the function and for the command are one commit, since the tests of both are in one
  file. Beyond the plan's list, the tests also cover a folded description of other text being replaced whole, a second
  refresh of a refreshed wrapper changing nothing, a shim with the right content that is not executable, a dangling
  symbolic link, and the command run through a `node_modules/.bin` link
- 2026-10-02T15:49:47Z [Claude Code, anthropic/claude-opus-5-5] two things the tests pin down that the spec leaves to
  the implementation. A line in the frontmatter that is not a key line belongs to the key above it, which is a little
  wider than the plan's wording of indented lines, list items and blank lines: it also keeps a comment with the key it
  follows. And a shim whose content is right but which is not executable is reported as refreshed, not as up to date,
  since requirement 6 has the command make it executable
- 2026-10-02T15:50:32Z [Claude Code, anthropic/claude-opus-5-5] updated the README: the command under "Updating a
  project to a newer kit", and under "Installing it into a project" the wrappers and `agent.sh` as the exception to a
  generated file being the project's own. The one existing line that changed is "`CLAUDE.md` and `agent.sh` are best
  left as written", which now names `CLAUDE.md` alone; nothing else was removed
- 2026-10-02T15:50:32Z [Claude Code, anthropic/claude-opus-5-5] verified on 6ea8885: `npm test` passed, 170 of 170;
  `npx tsc -p infra` exited 0; `npm run check-changes` exited 0; `npm pack --dry-run` lists the same 22 files,
  `scripts/agentrite.mjs` among them. In a scratch project set up by `init` from the packed working copy, with a model
  pinned in `.opencode/agents/reviewer.md` and a line appended to `agent.sh`, `npx agentrite refresh claude opencode`
  exited 0, reported `agent.sh` as refreshed and the six wrappers as up to date, kept the pin, removed the appended
  line, and left `AGENTS.md`, `CLAUDE.md`, `agent/compose.project.yml`, `package.json` and `.dockerignore` byte for
  byte as they were; a second run reported all seven as up to date. The plan had expected the pinned wrapper to be
  reported as refreshed, which was wrong: a wrapper that differs only by a key added after the kit's own is already
  what a refresh writes. The verification line was corrected to say so. Not checked: either harness reading a wrapper
  after a refresh, which 0014 checked for the same generated content, and the command on macOS
- 2026-10-02T15:50:32Z [Claude Code, anthropic/claude-opus-5-5] every box in `plan.md` is ticked. The status stays
  `in-progress` until the unit is reviewed and the human has decided what the review returns
- 2026-10-02T16:05:02Z [OpenCode, openai/gpt-6.1-sol] completed a full first review of `0013-refresh-command` at
  commit `0111a17b383a30179ffb45585c852c06269e5e5b`, against the `master` merge-base
  `ecccb16f8681b1860cf42823853944cf97d49b0d`. Returned S1, S2 and C1; complete findings are saved in
  `.reviews/0013-refresh-command/20261002T160215Z-opencode-full.md`. Not verified: macOS execution, either harness
  consuming refreshed wrappers (including the recorded 0014 harness-consumption claim), and the original
  within-session test-first chronology. The packed CLI smoke used an extracted tarball, a local bin symlink and
  a synthetic lockfile, not a fresh npm dependency or Playwright installation

## Amendments
