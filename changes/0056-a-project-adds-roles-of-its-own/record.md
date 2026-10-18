---
kind: feature
status: draft
timestamp: 2026-10-18T17:01:25Z
---

# 0056 A project adds roles of its own

## Log

- 2026-10-18T17:01:25Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `d3e594e`, on the human's request to work out how a project adds roles of its own, after units 0052
  and 0054. Made the unit as a feature. Numbered 0056: the highest number in `changes/` is 0055. The session took
  the role on itself, from `roles/specifier.md` of the working tree, which differs from that of the installed
  release 7.1.0 only in the front matter and in naming the project's standards in the place of the kit's
  `standards.md`, as unit 0054 changed it. Read besides: the specs of units 0052 and 0054 and the record of 0054,
  `scripts/agentrite-roles.mjs`, `scripts/agentrite-settings.mjs`, the role handling of `scripts/agentrite-run.mjs`
  and of `refresh` and `run` in `scripts/agentrite.mjs`, `process.md`, `roles/reviewer.md`, and "How it works",
  "agentrite roles", "Running a role", "The project's settings" and "Replacing a role or the standards" of
  `README.md`. In the conversation the human decided that an extra role has no place in the process that the kit
  records in this unit, that its findings do not block `implemented`, and that it is added on top of the process,
  running just before or after one of the four roles. Wrote `spec.md`. Of what the conversation left to decide, the
  spec decides: an extra role sets no status, the form of a role's name, the order of the listings, that `refresh`
  removes the kit's wrappers of a role that is gone, and that `process.md` does not change. The status is `draft`
