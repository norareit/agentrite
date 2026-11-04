---
kind: task
status: approved
timestamp: 2026-11-04T23:09:30Z
---

# 0096 Drop the check of the root agentrite.json

## Description

The test `the root agentrite.json is the default file of the release with its own roles added, and is not shipped`
in `tests/repository-own-files.test.mjs`, unit 0054's R24, holds this repository's root `agentrite.json` byte for
byte against the default file of the installed release, with the role `spec-reviewer` added. Since unit 0095 the
root file holds `process`, as its R4 asks, because the working tree's commands refuse a file without it. The
installed release's default file has no `process`, so the test fails until this repository depends on a release
that has it. `npm publish` runs the suite, so the test also stops the release that would end the failure.

The human decided to drop R24 of unit 0054. What the check guarded is caught elsewhere: a missing or invalid key of
the root file is refused by every command that reads it, with a message that names the key, and a path in it that
names no file is refused too. What the default file holds is tested on the working tree's template, by
`tests/agentrite-settings.test.mjs` and by the projects the suite makes from it. Without the check, only drift that
breaks nothing, such as the order of the keys or a valid value other than the default, goes unseen.

The change:

* The comparison of the root `agentrite.json` with the installed release's default file is removed from that test,
  together with what only it uses
* The test's assertion that `files` of `package.json` does not hold `agentrite.json` stays, as unit 0067's R1 asks.
  The test's name and its comment say what is left of it

Afterwards `npm test` passes, and `npm run check-changes` exits 0.

Not part of this task: unit 0054's R25, the test that the installed release's `refresh` finds every file it writes at
the root up to date, which stays as it is; and a test that every path the default file names is shipped by `files`
of `package.json`, which the human declined.

## Log

- 2026-11-04T23:09:30Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `d20c6c4`, on the human's request after step 1 of a release stopped for this test, the one failing of
  1447. Made the unit as a task: one test changed, with the one decision, dropping 0054's R24, made by the human.
  Numbered 0096: the highest number in `changes/` is 0095. Checked before writing: with `"process": true` taken out of
  the root `agentrite.json`, all 1447 tests passed; the file was put back. The status is `draft`
- 2026-11-04T23:10:32Z [human] approved the record. The status is `approved`

## Amendments
