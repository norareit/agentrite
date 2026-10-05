---
kind: feature
status: draft
timestamp: 2026-10-05T12:51:34Z
---

# 0032 Run a role in a harness

## Log

- 2026-10-05T12:51:34Z [human] in a session about an orchestrator that is to live in a repository of its own,
  said: "One thing we will definitely need (and is even useful for Agentrite without an orchestrator) are those
  wrappers to call Claude Code and OpenCode with a given role and model. I think we should also be able to see the
  available roles somewhow with "agentrite list-roles" or something like that. When running "agentrite run" it
  should also show how the run command can be used. Can you act as the @planner and help me plan this unit of
  work?"
- 2026-10-05T12:51:34Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in the main session, found that
  OpenCode does not take the kit's wrappers on its command line: they are `mode: subagent`, and `opencode run
  --agent <role>` then falls back to its default agent. Asked the human four questions
- 2026-10-05T12:51:34Z [human] chose: interactive by default with a flag for a headless run; the wrappers carry
  the role, and the OpenCode wrappers become `mode: all`; one flag of the kit's for permissions, over passing the
  harness's flags through and over adding it inside the sandbox; a unit with optional text after it
- 2026-10-05T12:53:48Z [Claude Code, anthropic/claude-opus-5-5] wrote `spec.md` and `plan.md`. The unit is a
  feature: it adds two commands and changes what the OpenCode wrappers hold. Its number is 0032, the one after
  0031, as every unit since 0002 was numbered beside the `history-` directories. Four things about the harnesses
  are not established and are in the spec; the plan has a run on the real harnesses for each. The status stays
  `draft`
