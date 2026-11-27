---
kind: task
status: approved
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

## Amendments
