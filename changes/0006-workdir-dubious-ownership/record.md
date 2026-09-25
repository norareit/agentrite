---
kind: bug
status: draft
timestamp: 2026-09-25T01:02:43Z
---

# 0006 Git refuses the sandbox's working directory

## Log

- 2026-09-25T01:02:43Z [human] asked for the sandbox faults found during Norareit's `0040-sandbox-firewall-dns` to be
  created as bug units in this repository
- 2026-09-25T01:02:43Z [Claude Code, anthropic/claude-opus-5-5] reproduced it on macOS with Docker Desktop, Docker
  Engine 24.0.7, with Norareit on kit 1.0.2: as the agent, uid 501, `git -C /work rev-parse` fails with "detected
  dubious ownership"; `stat` shows `/work` as `0:0` and its contents as `501:20`; a plain `alpine` container sees
  every bind mount root tried as `0:0`. Earlier, during 0040, the same git commands succeeded once `safe.directory`
  was set to `/work` through `GIT_CONFIG_*`, and now the image's git 2.39.5 accepts `/work` with `safe.directory`
  set to `*` both through `GIT_CONFIG_*` and through `-c`. Not checked: Linux Docker Engine. Not explained:
  Norareit's 0040 review reports its end-to-end suite, change check included, passing in the sandbox as uid 501;
  the review does not say how
- 2026-09-25T01:02:43Z [Claude Code, anthropic/claude-opus-5-5] took the planner role. `spec.md` written, status
  `draft`; a single-commit fix, so no `plan.md`. Four requirements, three decisions and two non-goals

## Amendments
