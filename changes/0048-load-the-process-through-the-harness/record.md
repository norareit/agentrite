---
kind: feature
status: draft
timestamp: 2026-10-14T08:12:35Z
---

# 0048 Load the process through the harness

## Log

- 2026-10-14T08:12:35Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the macOS host,
  on `master` at `cf13900`, on the human's request to specify the first action of the notes of a conversation of
  2026-10-13, "Load the instructions through the harness". The human gave the notes as a file outside the
  repository, and they are not committed: what of them this unit needs is in the spec's "Context". The session took
  the role on itself, reading the role file and `process.md` as installed under `node_modules/agentrite`, which is
  release 6.0.0, and not through the wrapper. Made the unit as a feature. Numbered 0048: the highest number in
  `changes/` is 0047, and `origin` holds `master` alone, at `4d36473`, which is behind the local one.
  Read besides: `scripts/agentrite.mjs` for what `init` and `refresh` write and how `init` amends `package.json` and
  notices an existing `CLAUDE.md`, `scripts/agentrite-roles.mjs`, both templates in `templates/project/`, the
  sections of `README.md` on `init`, installing and updating, and the spec of unit 0045.
  Tested before specifying, as the notes asked, in scratch projects outside the repository, with Claude Code
  2.1.299 and Haiku, and OpenCode 1.19.0 and a local Gemma 4 31B: what the table in the spec's "Context" shows.
  Wrote `spec.md`. Of what the notes left to decide, the spec decides: existing projects run `init` and `refresh`
  takes neither file over, and `opencode.json` is written at the project root. The human was asked about neither,
  and approving the unit approves them. Not checked: the sandbox, where the same harnesses read the same files. The
  status is `draft`
- 2026-10-14T08:56:58Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's remark that a
  project may not see the notices of `init`, and that what must be in `CLAUDE.md` and `opencode.json` needs to be
  documented well. Changed `spec.md`: requirements 11 and 12 are new, and ask for a section of its own in
  `README.md` that lists every file and line that makes the kit's instructions reach an agent, says that a missing
  one fails without a word, and is pointed to from "agentrite init", the text on existing files and "Updating a
  project to a newer kit". What requirement 11 asked before is requirement 13. Added the decision with its
  rationale. The status is `draft`

## Amendments
