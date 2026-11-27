---
kind: task
status: in-progress
timestamp: 2026-11-27T14:50:09Z
---

# 0124 The installed kit in a unit run

## Task

"The kit's command" in `AGENTS.md` says that `npx agentrite` runs the working tree's kit in this repository, and that
the installed release's command is `npm run kit -- <command>`. It does not say that this holds for a command given to
`./sandbox.sh`, whose working tree is the clone of the unit's branch, the code under change. The examples of
`SANDBOX.md`, `ORCHESTRATOR.md` and `COMMANDS.md`, and the hints the orchestrator prints when a run stops, are written
for a project that installs the kit and give `npx agentrite`, so that a command copied from them for this repository
runs the wrong kit.

The task adds to that section of `AGENTS.md` that the rule holds for a command given to `./sandbox.sh` too, and that
the `npx agentrite` of the other documents' examples and of the orchestrator's hints is written `npm run kit --` in this
repository, as in:

```sh
./sandbox.sh 0029 npm run kit -- orchestrate 0029 --resume --skip-permissions
```

No other file changes. The documents of the kit keep `npx agentrite`, which is right for the projects that read them.

## Log

- 2026-11-27T14:50:09Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master`, on the human's request
  after the agent had several times given a command for a unit run of this repository with `npx agentrite` where `npm
  run kit --` was meant. Numbered 0124: the highest number in `changes/` is 0123. Made it a task, since it is one
  sentence added to `AGENTS.md` and needs no decision. `AGENTS.md` is no file of the kit, so its words are not counted.
  The status is `draft`
- 2026-11-27T14:50:34Z [human] approved the record. The status is `approved`
- 2026-11-27T15:34:40Z [Claude Code, anthropic/claude-opus-5-5] as the planner, found that the task needs no plan: it is
  one addition to "The kit's command" in `AGENTS.md`, which the record describes in full and which fits the tree. The
  status stays `approved`
- 2026-11-27T15:40:12Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, began the work. The status is
  `in-progress`
- 2026-11-27T15:44:30Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, added to "The kit's command"
  of `AGENTS.md` that the rule holds for a command given to `./sandbox.sh` too, and that the `npx agentrite` of the
  examples of `SANDBOX.md`, `ORCHESTRATOR.md` and `COMMANDS.md` and of the orchestrator's hints is written `npm run
  kit --` in this repository, with the record's example. No other file changed. On `7428803`, `npm test` reported 2046
  passed, 0 failed and 34 skipped of 2080, `npm run check-changes` passed, and no line of `AGENTS.md` outside a table
  is longer than 120 characters. The repository has no separate end-to-end suite. The status stays `in-progress`
- 2026-11-27T15:38:04Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, reviewed the unit at `95abb8f94956` as a full
  review against merge base `86c7b816c35f` with `origin/master`. Returned no findings. Blocking findings: none.
  The review is in `.reviews/0124-the-installed-kit-in-a-unit-run/review-2026-11-27T153804Z.md`. Independently ran
  `npm test`: 2046 passed, 0 failed, 34 skipped of 2080; `npm run check-changes` and `git diff --check` passed.
  Docker-dependent tests and actual Docker execution of the example could not be verified without Docker.

## Amendments
