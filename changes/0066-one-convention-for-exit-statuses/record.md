---
kind: feature
status: draft
timestamp: 2026-10-21T09:50:41Z
---

# 0066 One convention for exit statuses

## Log

- 2026-10-21T09:50:41Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `2a7094b`, on the human's request to define the exit statuses of the kit's tools once, after unit
  0065 gave the orchestrator a status of its own. Made the unit as a feature, since it changes what `./sandbox.sh`
  exits with. Numbered 0066: the highest number in `changes/` is 0065. Read every statement of an exit status in
  `README.md` and `SANDBOX.md`, the exits of `scripts/agentrite.mjs`, `scripts/agentrite-settings.mjs`,
  `scripts/check-changes.mjs` and `container/sandbox.sh`, and found that `./sandbox.sh` exits 2 for every refusal
  where `npx agentrite` exits 1. Wrote `spec.md`. The status is `draft`
- 2026-10-21T10:20:44Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's decision to take item 1
  of "Beyond the request" into the unit: added requirement 7, that the change check refuses a second argument with its
  usage and exit status 2, renumbered the requirements after it, added its test to requirement 9 and recorded why under
  "Decisions". "Beyond the request" holds nothing now. The status is `draft`
