---
kind: feature
status: approved
timestamp: 2026-11-04T11:55:47Z
---

# 0095 A project uses the sandbox alone

## Log

- 2026-11-04T11:55:47Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `b776739`, on the
  human's request that a project can have the sandbox, with its run on a clone of a branch that is brought back,
  without the change process, the roles or the orchestrator, and on the human's decisions recorded in the spec: a new
  required key, no key made optional, the file kept as `./sandbox.sh`, a branch name run or cut from the default
  branch, no hook on the host or in the sandbox, and nothing of the process written. Numbered 0095: the highest
  number in `changes/`, on every branch, is 0094. Read `container/sandbox.sh`, `container/unit-clone.sh`,
  `container/compose.yml`, `scripts/agentrite-settings.mjs`, `init`, `config` and `refresh` in
  `scripts/agentrite.mjs`, the project templates, and the sections of `README.md` and `SANDBOX.md` on them. Wrote
  `spec.md`. The status is `draft`
- 2026-11-04T12:05:50Z [Claude Code, anthropic/claude-opus-5-5] on the human's decision, renamed the option of `init`
  from `--no-process` to `--sandbox-only`, and recorded the decision in the spec. The key stays `process`. The status
  is `draft`
- 2026-11-04T12:11:59Z [Claude Code, anthropic/claude-opus-5-5] on the human's decision that this unit is built after
  units 0093 and 0094, rewrote the requirements on the documents against the documents 0094 leaves, as requirements
  26 to 31, with one line of the README in the map of the documents, which the human decided, and added requirements
  32 to 34 on the tests, from the plan of 0093 at `ab7a8e5`. The context and the decisions say so. The status is
  `draft`
- 2026-11-04T12:43:39Z [Claude Code, anthropic/claude-opus-5-5] on the human's decisions: the specifier's choices are
  accepted, the hooks directory of the image without a hook, a shim that passes no mode running as today, the mode
  taken from the shim alone, and a branch cut for any name that is no branch; `BTR1` to `BTR4` are declined; the spec
  is not reviewed by the spec-reviewer. The status is `draft`
- 2026-11-04T12:44:17Z [human] approved the spec. The status is `approved`
