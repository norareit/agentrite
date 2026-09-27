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
- 2026-09-27T22:53:11Z [human] asked for `AGENTS.md` and `CLAUDE.md` to be written always, whatever the
  harnesses, and, when `AGENTS.md` exists, for `init` to state clearly which of its sections, as in Norareit's, must
  be pasted into it
- 2026-09-27T22:53:11Z [Claude Code, anthropic/claude-opus-5-5] rewrote requirements 3 and 4 and added requirement 5
  for the notices, renumbering the rest, and added the decision and the plan tasks that go with them. Status left at
  `draft`
- 2026-09-27T22:55:11Z [human] agreed that what a project gets should live in template files in the kit rather
  than in the script
- 2026-09-27T22:55:11Z [Claude Code, anthropic/claude-opus-5-5] added requirement 15 for `templates/project/`, with
  the notice's sections cut from the `AGENTS.md` template, renumbered the README and test requirements to 16 and 17,
  and added the decision, the template task and the checks that go with it. Status left at `draft`
