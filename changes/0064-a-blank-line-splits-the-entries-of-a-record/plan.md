# 0064 A blank line splits the entries of a record

## Approach

Three parts, in this order: the check learns to read the body of a record and to reject an entry the branch adds
after a blank line, the rule is stated in `process.md` and `README.md`, and the blank lines that the records of this
repository already hold are removed in a commit of their own.

The check gains one pure function, `findSplitEntries(base, head)`, beside `findFrozenViolations` and
`findIncompletePlans`, taking the same `Record<string, ChangeDocuments>` shape. `ChangeDocuments` gains `record`, the
text of `record.md`, which `documentsAtRevision` already reads for the status. A section is the lines from
`## Log` or `## Amendments` to the next heading. An entry opens with a line that starts with `- ` at the left
margin, and its continuation lines are indented. An entry is split when it is not the first of its section and one or
more blank lines stand between it and the line before it. A blank line inside an entry, before an indented
continuation, does not open an entry and is not judged, which the spec lists as a non-goal. The blank line before
the next heading is not before an entry and is not judged either.

An entry is identified by its timestamp and its author: the text of the entry, its lines joined and its whitespace,
carriage returns among it, collapsed to single spaces, up to and including the first `]`. Rewrapping an entry or
changing its line endings leaves it the same entry. A split entry is a violation when the record of the same unit at the
merge base holds no split entry with the same timestamp and author. A unit absent from the base has all of its split
entries judged. The message is `<unit>: entry after a blank line: <opening line>`, which names the unit and the entry.
The check keeps its behaviour for every other input.

The removal is made by a one-off script in the scratchpad that is not committed. It takes every
`changes/*/record.md` and deletes a blank line whose next non-blank line opens an entry and whose previous non-blank
line is a line of an entry in the same section. It is checked by `git diff --stat` and by a diff that ignores
whitespace, so that the commit changes nothing but those lines.

## Files

- `scripts/check-changes.mjs`: `record` in `ChangeDocuments`, `findSplitEntries`, and its use in `run`
- `tests/check-changes.test.mjs`: unit tests of `findSplitEntries`, and two tests of the command on a repository
- `process.md`: the rule, with the rules on what an entry is made of
- `README.md`: "check-changes" says what the check rejects
- `changes/*/record.md`: blank lines between entries removed, in a commit of their own
- `changes/0064-a-blank-line-splits-the-entries-of-a-record/record.md`: log entries, the commit of the removal named

`templates/changes/record.md`, `roles/reviewer.md`, `CONTRIBUTING.md`, `SANDBOX.md` and `CHANGELOG.md` are not
changed. `npm run check-changes` here runs the released kit's check from `node_modules`, so it does not run the new
rule, and the tests and `node scripts/check-changes.mjs` run the working tree's.

## Tasks

- [x] Write the unit tests of `findSplitEntries` and the two tests of the command, and see them fail (R2, R3, R5)
    - [x] A new entry after a blank line is reported, in `## Log` and in `## Amendments`, with the unit and the entry
          in the message
    - [x] A split that the record at the base holds is not reported, and a record absent from the base is judged
          whole
    - [x] The blank line before the next heading, the blank line between a heading and its first entry, and a blank
          line before an indented continuation are not reported
    - [x] On a repository whose branch adds an entry after a blank line the command fails and names the unit and the
          entry, and on one whose base already holds the blank line it passes
- [x] Implement `findSplitEntries`, add `record` to what `documentsAtRevision` returns, and add the function to the
      violations of `run`. The tests pass (R2, R3)
- [x] State the rule in `process.md` after the list of what an entry is made of: the entries of a section follow one
      another with no blank line between them, and a new entry goes directly after the last one of its section, above
      the blank line before the next heading (R1)
- [x] Change "check-changes" in `README.md` so that it says the check also rejects an entry that the branch adds after
      a blank line (R4)
- [x] Write a unit test that an entry after a blank line at the base is not reported when the branch rewraps its
      opening line or gives the record CRLF line endings, and a test of the command for the rewrap, and see them fail
      (review finding S1, R3)
- [x] Identify an entry by its timestamp and its author, read across its lines with whitespace collapsed, and give
      the message the opening line without its carriage return. The tests pass (S1, R2, R3)
- [x] Remove the blank lines between entries from every `record.md` under `changes/` with the one-off script, and
      verify that 16 records change, that only blank lines are touched, and that a second run changes nothing (R7,
      R8)
- [x] Log in `record.md` of this unit the commit of the removal (R8)

## Verification

- [x] `npm test` passes, the new tests among it, and they failed before the check was changed (R5)
- [x] The end-to-end tests are run, as the standards ask after every change
- [x] `git diff --ignore-blank-lines --stat` of the removal commit against its parent is empty, and `git diff --stat`
      shows only `changes/*/record.md` (R8)
- [x] `awk` over every `record.md` finds no entry after a blank line in `## Log` or `## Amendments` (R7)
- [x] With the work committed, `npm run check-changes` and `node scripts/check-changes.mjs` both pass (R6)
- [x] The text added to `process.md` and `README.md` has no em dash and no line over 120 characters (R1, R4)

## Commit Points

- [x] `bugfix-0064` the tests of the check and the check, in one commit
- [x] `bugfix-0064` the rule in `process.md` and the text in `README.md`
- [x] `bugfix-0064` the removal of the blank lines between entries of the records, and nothing else
- [x] `bugfix-0064` the log entry naming the removal commit
- [ ] `bugfix-0064` the identification of an entry by its timestamp and its author, with its tests, in one commit
