---
kind: feature
status: approved
timestamp: 2026-10-09T18:32:07Z
---

# 0044 This repository installs the kit from the npm registry

## Log

- 2026-10-09T18:32:07Z [human] in a session of Claude Code on the host, after release 6.0.0 was published on the npm
  registry, `agentrite@1.0.0` was marked as deprecated and `agentrite-roles@2.0.1` was published, which are human steps
  1 to 4 of unit 0043. Asked for the unit of step 5, which moves this repository to the release
- 2026-10-09T18:32:07Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the main session on the Linux host,
  on `master` at `209efdd`, which holds the release 6.0.0. Read `process.md` and `roles/specifier.md` of the installed
  release 5.0.0. Made the unit as a feature, for the reason its spec gives. Numbered 0044: the plain directories run
  from 0001 to 0043 without a gap, and the `history-` directories do not count. Wrote `spec.md`, from requirement 5 and
  human step 5 of unit 0043. Added to them: the comment in `sandbox/compose.project.yml` that names the kit's release
  host, and `npm ci` inside the working copy's sandbox as something to see. Not checked: that the working copy of
  `scripts/` is what 6.0.0 shipped, which the spec leaves to the planner. The status is `draft`
- 2026-10-09T18:40:39Z [human] approved the spec. The status is `approved`

## Amendments
