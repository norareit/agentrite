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

## Amendments
