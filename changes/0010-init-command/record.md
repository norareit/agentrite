---
kind: feature
status: draft
timestamp: 2026-09-27T22:45:28Z
---

# 0010 A command that sets up the kit in a project

## Log

- 2026-09-27T22:45:28Z [human] asked for a command, like `agent-kit-roles`, that sets up everything the kit needs in
  a project, with the README describing it. Raised that a project should own its `agent/compose.project.yml` once it
  is written, while a kit release may still need something in it
- 2026-09-27T22:45:28Z [Claude Code, anthropic/claude-opus-5-5] took the planner role and wrote `spec.md` and
  `plan.md`. A feature: the generated files, what happens to existing ones, and how a later release reaches a project
  all need decisions. The concern about releases is answered by keeping what every project needs in the kit, and
  having the wrapper check what only the project can supply. Making Playwright optional in the image is left as a
  non-goal. Status left at `draft` for approval
