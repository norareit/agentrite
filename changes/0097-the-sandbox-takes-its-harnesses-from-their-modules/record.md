---
kind: feature
status: in-progress
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
- 2026-11-06T10:53:43Z [Codex, openai/gpt-6] as the spec-reviewer, on the human's explicit exception to the
  draft-only restriction, fully reviewed `spec.md` and `record.md` at `d4e2314892c6c979a0f71e13066e550aa555dafc`.
  Returned F1 and F2, saved in
  `.reviews/0097-the-sandbox-takes-its-harnesses-from-their-modules/spec-review-2026-11-06T105343Z.md`.
  Live harness behavior and Docker execution were not checked. The status stays `approved`.
- 2026-11-06T10:57:51Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` and not on the unit's
  branch, on the human's decision to correct the approved spec as if it were not yet approved, settled the findings of
  `.reviews/0097-the-sandbox-takes-its-harnesses-from-their-modules/spec-review-2026-11-06T105343Z.md`. F1 is
  accepted: the non-goal on the egress proxy now allows the hosts of the project's harnesses alone, of requirements 7
  and 18, besides the probe, which is the only reading under which requirement 18 can hold. F2 is accepted with the
  human's choice: a start judges `bell` and `harnesses` alone, which requirement 18 and a new decision now say. The
  human approved both changes, so the status stays `approved`
- 2026-11-06T11:08:42Z [Claude Code, anthropic/claude-opus-5-5] as the planner, cut the unit's branch from `master` at
  `1486bf6` and wrote `plan.md` against it. Two readings of requirement 16 that the plan builds: the image gains the
  one file `/usr/local/lib/agentrite/log-directories`, since a variable of the compose file would be in the
  command's environment; and Claude Code's hooks are no longer also found at
  `/etc/agentrite/bell/claude-managed-settings.json`, which nothing reads, since requirement 3 moves them out of the
  directory mounted there. The status stays `approved`
- 2026-11-06T11:34:58Z [Claude Code, anthropic/claude-opus-5-5] as the planner, on the human's acceptance of both
  readings of requirement 16 in the entry above, which the plan keeps as written. The status stays `approved`
- 2026-11-06T11:35:52Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, began the work on the unit's
  branch at `e532a0d`. The status is `in-progress`

## Amendments
