---
kind: task
status: implemented
timestamp: 2026-09-24T23:33:39Z
---

# 0001 Copy the kit's history from Norareit

## Description

The agent kit grew out of changes made in the Norareit project, whose change units still live in
`../norareit/changes/`. This repository's `changes/` holds none of them, so the reasoning behind the kit is not
findable from the kit itself.

Copy these Norareit units into `changes/`, each directory prefixed with `history-`, so `0035-shared-agent-kit`
becomes `history-0035-shared-agent-kit`:

* `0030-role-instructions`
* `0031-code-standards`
* `0033-agent-sandbox-container`
* `0035-shared-agent-kit`
* `0036-install-the-agent-kit`
* `0037-kit-as-an-npm-package`
* `0038-agent-model-suggestions`
* `0039-sni-filtering-proxy`

The files are copied unchanged. Paths and references inside them, such as `changes/0033-agent-sandbox-container`,
keep naming Norareit's directories, because they record what was true in the project where the work was done.

## Log

- 2026-09-24T23:33:39Z [human] asked for the Norareit units 0030, 0031, 0033, 0035, 0036, 0037, 0038 and 0039 to be
  copied into this repository's `changes/`, each prefixed with `history-`, with a task created for it first
- 2026-09-24T23:33:39Z [Claude Code, anthropic/claude-opus-5-5] took the planner role. A task rather than a feature:
  the request names the units and the prefix, so the work is a copy with no decisions left open
- 2026-09-24T23:33:39Z [human] set the number to 0001: this is the first unit of agent-kit's own. The `history-`
  directories are Norareit's numbering and do not count toward it
- 2026-09-24T23:35:20Z [human] approved the unit, in the request to do the copying once the task existed
- 2026-09-24T23:35:20Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role and moved the status to
  `in-progress`
- 2026-09-24T23:35:20Z [Claude Code, anthropic/claude-opus-5-5] copied the eight units in 268a0a9. `diff -r` against
  each directory in `../norareit/changes/` reported no differences
- 2026-09-24T23:35:20Z [Claude Code, anthropic/claude-opus-5-5] ran `node scripts/check-changes.mjs` and `npm test`
  on 268a0a9: the check exited 0, and the tests reported 67 passed, 0 failed. No review was run for this task. Moved
  the status to `implemented`

## Changes

Added `changes/history-0030-role-instructions`, `history-0031-code-standards`, `history-0033-agent-sandbox-container`,
`history-0035-shared-agent-kit`, `history-0036-install-the-agent-kit`, `history-0037-kit-as-an-npm-package`,
`history-0038-agent-model-suggestions` and `history-0039-sni-filtering-proxy`, each a verbatim copy of the Norareit
unit of the same name without the prefix.
