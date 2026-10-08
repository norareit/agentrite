---
kind: feature
status: draft
timestamp: 2026-10-08T13:27:02Z
---

# 0039 Slim down the sandbox reference

## Log

- 2026-10-08T13:27:02Z [human] in the session of Claude Code on the host in which unit 0037 was implemented, found
  `SANDBOX.md` too long to read through and expected that nobody will read it, asked for ways to slim it down, and
  was given ten. Decided that 0037 is reviewed first and that slimming the document is a unit of its own. After
  0037 was marked implemented, asked for that unit to be made
- 2026-10-08T13:27:02Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the main session on the Linux host,
  on `master` at `78b5975`. Read `process.md` and `roles/specifier.md` of the installed release 4.2.0. Made the unit as
  a feature, since what stays in the document takes decisions. Numbered 0039: the plain directories run from 0001 to
  0038 without a gap, and 0042 and the `history-` directories do not count. Wrote `spec.md`. The human asked for a unit
  for the ten ideas and chose among none of them, so these are the specifier's and not the human's in those words: that
  nine of the ten are requirements and the tenth, splitting the document, is decided against; that a refusal which
  explains itself goes, which changes what 0037 had the documents hold; and the titles "What the sandbox defends
  against" and "When something goes wrong". Read for it: `SANDBOX.md`, and the notes of 4.1.0 in `CHANGELOG.md`, which
  name "The harness logs" for the copy command and do not hold it, so the command stays. Not checked: which refusals
  have a message that names why and what to do, which is the implementer's by requirement 3; and whether the release
  notes say what was tried for `--connect`, as they do for the harness logs. Status left at `draft`

## Amendments
