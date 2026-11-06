---
kind: feature
status: approved
timestamp: 2026-11-06T10:15:15Z
---

# 0097 The sandbox takes its harnesses from their modules

## Log

- 2026-11-06T10:15:15Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `5315af1`, on the
  human's request to model the sandbox's knowledge of each harness as well as 0091 modelled the code's, before Codex
  is added as a third harness. Numbered 0097: the highest number in `changes/`, on every branch, is 0096. Read
  `container/Dockerfile`, `container/compose.yml`, `container/sandbox.sh`, `container/entrypoint.sh`,
  `container/bell/`, `container/claude-managed-settings.json`, `templates/project/sandbox/compose.project.yml`,
  `scripts/agentrite-harness.mjs` and "Adding a harness" of `CONTRIBUTING.md`. Wrote `spec.md`. The status is `draft`
- 2026-11-06T10:37:02Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master`, on the human's decisions
  to take `BTR1`, which became requirement 18: the image, the allowlist and a run hold only the harnesses the
  project's `harnesses` setting names, and a change of the setting makes a build due. Requirements 4, 5, 7, 9, 10,
  13, 16 and 17 now speak of the project's harnesses, a decision says why, the threat model covers the setting, and
  the non-goal that excluded it is narrowed. `BTR2` is declined, which the spec now marks. The status is `draft`
- 2026-11-06T10:49:22Z [human] approved the spec. The status is `approved`

## Amendments
