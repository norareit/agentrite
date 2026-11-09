---
kind: feature
status: approved
timestamp: 2026-11-08T23:43:58Z
---

# 0101 The security reviewer: network controls, run names, audit scope, accepted risks and audit scripts

## Log

- 2026-11-08T23:43:58Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `0db3055`, on the
  human's request to change the security reviewer in three ways agreed after an audit run was stopped partway: no
  proofs of concept against the network controls, a findings file named by commit and instant with audits in a
  directory of their own, and a limited audit naming its scope. Read `extra-roles/security-reviewer.md`, its
  wrappers, "Security findings" of `AGENTS.md`, `extra-roles/spec-reviewer.md` for its instant, and the parts of
  `SANDBOX.md` on `.reviews` and the network controls, and searched the repository for every place that names a
  findings file. Wrote `spec.md`. The status is `draft`
- 2026-11-09T00:18:55Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `8d3a315`, on the
  human's request to add two parts to the unit: a list of the risks the human accepted, which the role reads and reports
  repeats of apart from its findings, and a script that sets up the clone of an audit with a second that finishes
  it. Read the role file again, the exit statuses of `COMMANDS.md`, the mounts of `SANDBOX.md` and "Commands" and
  the table of `CONTRIBUTING.md`. Added the two parts to `spec.md`, renumbering its last requirement, and retitled
  the unit, keeping its directory's name. The status is `draft`
- 2026-11-09T10:51:22Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `1a94de0`, on the
  human's request to fix the form of an entry of the list of accepted risks to the layout they use, with the commit
  at which the entry's file and line hold. Did not read `.reviews/security-accepted.md`, by "Security findings" of
  `AGENTS.md`, and worked from the empty layout the human gave. Rewrote requirement 19 to name the subsections,
  added to requirement 21 how the place is judged by the entry's commit, and added two decisions. The status is
  `draft`
- 2026-11-09T10:56:58Z [human] approved the spec. The status is `approved`

## Amendments
