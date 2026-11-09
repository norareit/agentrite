---
kind: feature
status: draft
timestamp: 2026-11-09T13:08:29Z
---

# 0103 The kit's code on the host and what a unit run brings back

## Log

- 2026-11-09T13:08:29Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `fa0f21f`, on the
  human's request to specify how the kit's code on the host treats what a unit run brings back, as a feature by
  "Security findings" of `AGENTS.md`. Read "What the sandbox defends against" and "Where things are kept on the host"
  of `SANDBOX.md`, "What .orchestrator holds" and "On the host and in the sandbox" of `ORCHESTRATOR.md`, "agentrite
  orchestrate" of `COMMANDS.md`, the run, resume and file-writing code of `scripts/agentrite.mjs`, the parsing of a
  run in `scripts/agentrite-runs.mjs`, the session arguments of the three harnesses, and the landing of a clone in
  `container/unit-clone.sh`. Wrote `spec.md`. The status is `draft`
- 2026-11-09T17:36:52Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `c2c262d`, on the
  human's decision to keep the record of runs rather than rely on the form of a session alone, added to requirement
  12 that `ORCHESTRATOR.md` and "The home volume" of `SANDBOX.md` say that removing the project's home volume
  leaves no run that stopped in the sandbox before it to resume. The status is `draft`

## Amendments
