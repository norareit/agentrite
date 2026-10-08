---
kind: feature
status: approved
timestamp: 2026-10-08T13:27:02Z
---

# 0039 Slim down the sandbox reference

## Log

- 2026-10-08T13:27:02Z [human] in the session of Claude Code on the host in which unit 0037 was implemented, found
  `SANDBOX.md` too long to read through and expected that nobody will read it, asked for ways to slim it down, and
  was given ten. Decided that 0037 is reviewed first and that slimming the document is a unit of its own. After
  0037 was marked implemented, asked for that unit to be made
- 2026-10-08T13:27:02Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the main session on the Linux
  host, on `master` at `78b5975`. Read `process.md` and `roles/specifier.md` of the installed release 4.2.0. Made
  the unit as a feature, since what stays in the document takes decisions. Numbered 0039: the plain directories
  run from 0001 to 0038 without a gap, and 0042 and the `history-` directories do not count. Wrote a first
  `spec.md`, which kept the present sections and their titles and cut within them
- 2026-10-08T14:50:07Z [human] decided on that draft: no length is required of the document, which is as long as it
  needs to be. Said who its reader is: someone who uses AgentRite and wants to find out how to use the container in more
  detail than the README explains. Asked whether the document would be usable for that reader, was told that it would be
  shorter and still ordered by the parts of the sandbox, and asked for the spec to order it by what a reader does
- 2026-10-08T14:50:07Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `78e0a1b`, rewrote
  `spec.md` for that. `SANDBOX.md` has a table of contents since that commit, which the rewritten document keeps. The
  human asked for a unit for the ten ideas and chose among none of them, so these are the specifier's and not the
  human's in those words: the thirteen sections, their titles and their order; that the places on the host and the
  failures are each one table; that a refusal which explains itself goes, which changes what 0037 had the documents
  hold; and what "Holding a harness version" and "Reaching more hosts" keep. Read for it: `SANDBOX.md`, and the notes of
  4.1.0 in `CHANGELOG.md`, which name the README's "The harness logs" for the copy command and do not hold it, so the
  command stays. Not checked: which refusals have a message that names why and what to do, which is the implementer's by
  requirement 6; which lines outside `SANDBOX.md` name a section of it, which is the planner's; and whether the release
  notes say what was tried for `--connect`, as they do for the harness logs. Status left at `draft`
- 2026-10-08T14:56:21Z [human] asked for a requirement that `AGENTS.md` says when `SANDBOX.md` is changed or added to,
  so that a later feature of the sandbox ends up in it
- 2026-10-08T14:56:21Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, added that to requirement 16 as its
  first rule, with a decision. No requirement was renumbered. Status left at `draft`
- 2026-10-08T14:56:47Z [human] approved the spec as it stands on `master` at `bdba779`
- 2026-10-08T14:56:47Z [Claude Code, anthropic/claude-opus-5-5] in the main session on the Linux host, on `master` at
  `bdba779`, set the status to `approved`

## Amendments
