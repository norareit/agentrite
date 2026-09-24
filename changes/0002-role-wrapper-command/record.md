---
kind: feature
status: draft
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
