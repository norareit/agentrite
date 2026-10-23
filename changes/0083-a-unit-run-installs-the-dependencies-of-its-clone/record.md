---
kind: feature
status: approved
timestamp: 2026-10-23T22:37:29Z
---

# 0083 A unit run installs the dependencies of its clone

## Log

- 2026-10-23T22:37:29Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `dd7d669`, on the human's request that a unit run no longer needs `npm ci` typed before each command,
  and the human's choice that the sandbox installs a new clone itself, over a `node_modules` kept in a volume or a
  clone kept between runs. Made the unit as a feature. Numbered 0083: the highest number in `changes/` is 0082. Read
  "Running a unit", "Getting the work back", "Where things are kept on the host" and "When something goes wrong" of
  `SANDBOX.md`, "sandbox.sh" of `README.md`, and how `container/sandbox.sh`, `container/unit-clone.sh` and
  `container/entrypoint.sh` make the clone and start the command. Wrote `spec.md`. The status is `draft`
- 2026-10-23T22:44:30Z [human] approved the spec. The status is `approved`
