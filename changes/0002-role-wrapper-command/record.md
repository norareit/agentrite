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
