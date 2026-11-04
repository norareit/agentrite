---
kind: feature
status: approved
timestamp: 2026-11-04T11:26:27Z
---

# 0094 Split the README into a landing page and references

## Log

- 2026-11-04T11:26:27Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `5913b67`, on the human's request that the README become a short page of what the kit is and how to
  start, with diagrams of the components and of the human's workflow, that the reference move into documents of its
  own with clear rules on what goes where, that `COMMANDS.md` open with a short reference table of every command,
  and that no document get a limit on its length. Numbered 0094: the highest number in `changes/`, on every branch,
  is 0093. Read the README, `SANDBOX.md`, `CONTRIBUTING.md`, "The documents" of `AGENTS.md`, `files` of
  `package.json`, and the pointers to the README in `scripts/`, `container/`, `templates/project/`, `pointers/` and
  `tests/`. Ran nothing in the sandbox. Wrote `spec.md`. The status is `draft`
- 2026-11-04T11:35:49Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's decisions: a line
  of a Markdown table may pass the line limit in every document, which became requirement 25 and its decision and
  lifts the requirement that the tables of `SANDBOX.md` fit the limit; the diagrams are addressed on `master`, as
  the spec had it; `BTR1` is declined; `BTR2` is taken, as requirement 26. The status is `draft`
- 2026-11-04T11:38:52Z [human] approved the spec. The status is `approved`
- 2026-11-04T12:49:20Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, on
  `feature-0094-split-the-readme`, cut from `master` at `2a20348`. Wrote `plan.md`. Two readings are the only ones
  that work and are logged here rather than put to the human: the README's paragraph of the sandbox (R2) is a
  subsection "The sandbox" of what the kit is, after "The name", since R1 names no other part for it; and
  `CHANGELOG.md` keeps its references to sections of the README, which name the README as it was at each release
  and hold no link. The SVGs are generated on the host, as R17 requires, so a session in the sandbox leaves that
  task to the host. The status is `approved`
