# 0064 A blank line splits the entries of a record

## Context

Every entry under `## Log` and under `## Amendments` of a `record.md` is a list item, and `process.md` shows two of
them one directly after the other. Yet agents keep adding an entry after a blank line, which turns the section into a
loose Markdown list: it renders with a gap before the new entry, and the record reads as two lists. The human met it
again in the record of a unit of another project that uses the kit, where the reviewer's entry stood apart from the
ones above it, and has been bothered by it for a while.

## The bug

**Observed.** An entry added to `## Log` or `## Amendments` of a `record.md` is separated from the entry before it
by a blank line. On `master` at `ecb6d4f`, 72 entries in the records of this repository stand after such a line, in
11 numbered units and 5 `history-` ones. 30 were written by Claude Code, 19 by OpenCode, and 23 by the human. Of
the agents' entries that name the role they were written in, some are the implementer's and some the reviewer's.

**Expected.** The entries of a section follow one another with no blank line between them, and the only blank line
in the section is the one before the next heading.

**Steps to reproduce.** Have an agent add an entry to a section of a `record.md` that already holds one, in a
record made from `templates/changes/record.md`. It is not reproduced at will: some runs put the entry in its place,
and the records show the others.

**Root cause.** Inferred from the records and the kit's text, and not reproduced in a run. In
`templates/changes/record.md`, and so in every record made from it, the last entry of `## Log` is followed by a
blank line and then `## Amendments`. `process.md` says what an entry is made of but not where in its section a new
one goes, nor that entries stand without a blank line between them, and `roles/reviewer.md` says only to append the
entry. An agent that adds its entry after the last line of the section it sees puts it after that blank line. The
change check reads nothing of a record but its `status:`, so nothing catches it before the work is merged.

**Fix.** `process.md` states, with the rules on what an entry is made of, that the entries of a section follow one
another with no blank line between them, and that a new entry goes directly after the last one of its section,
above the blank line before the next heading. The change check rejects a blank line between an entry that the branch
adds and the entry before it. The blank lines between entries that the records of this repository already hold are
removed.

## Requirements

1. `process.md`, where it says what an entry of `record.md` is made of, states that the entries of `## Log` and of
   `## Amendments` follow one another with no blank line between them, and that a new entry goes directly after the
   last entry of its section, above the blank line before the next heading
2. The change check fails when, in the committed work on the current branch, an entry of `## Log` or of
   `## Amendments` of a `record.md` is separated by a blank line from an entry before it in the same section, and
   that separation is not in the record at the merge base. Its message names the unit and the entry, so that the
   entry can be found
3. The change check does not fail for a blank line between two entries that is already in the record at the merge
   base, nor for the blank line between the last entry of a section and the next heading
4. "check-changes" in `README.md` says that the check rejects what requirement 2 describes
5. The suite holds a test that fails on the tree this unit is cut from, for a record whose new entry stands after a
   blank line, and a test that a blank line already at the merge base passes
6. `npm run check-changes` passes on the unit's branch once the work is committed
7. No `record.md` under `changes/` of this repository, numbered or `history-`, has a blank line between two entries
   of `## Log` or of `## Amendments`. The text of every entry is as it was, and every other line of the records too
8. The blank lines of requirement 7 are removed in a commit of their own, which changes nothing but those lines

## Decisions

* **The kind is bug.** Records come out malformed by following the kit's own text and template, which is faulty
  behavior of the kit, and the human did not ask for a feature
* **The rule is stated once, in `process.md`, and not in `roles/reviewer.md`.** Every role and the human add
  entries, and the records show the blank line from the implementer, the reviewer and the human alike. The rules
  on an entry are in `process.md`, which every role reads. Stating the rule again beside "Append it" in the
  reviewer's file would put it in two places, which `process.md` forbids, and would leave the other roles without it
* **The change check enforces it, and the rule is not left to the agents alone.** The example in `process.md`
  already shows two entries with no blank line between them, and 49 entries of agents stand after one anyway. A
  check fails the same way for every harness and model, and the change check runs before every submission already.
  Rejected: the rule alone, which costs nothing to build and which the records show is not enough. This makes the
  check read the body of a record, where it read only its `status:` until now
* **The check judges only separations that the branch adds.** The records of this repository and of the projects
  that use the kit already hold such blank lines, and many are of implemented units. Judging every record would fail
  the check in all of them until each was rewritten. Comparing with the merge base, as the check already does for
  frozen documents, holds new entries to the rule and leaves history as it is
* **The records of this repository are tidied in the unit, in a commit of their own.** The human took it into the
  unit, for every record, the `history-` ones among them. A commit that only removes blank lines can be checked at a
  glance to change no entry, which it could not be if it were mixed with the rule and the check. No record gets an
  amendment for it: no entry's text changes, and an amendment in each of 16 records would add more than it removes.
  This unit's record names the commit. Removing the line between two entries does not edit either of them, so it is
  not what `roles/reviewer.md` forbids
* **The template keeps its blank line before `## Amendments`.** Markdown wants a blank line between a list and the
  next heading for the heading to read as one in every renderer, and the rule places the new entry above that line
  rather than removing it

## Non-goals

* Removing the blank lines that the records of a project that uses the kit already hold. They stay as written
* A blank line inside one entry, between two of its paragraphs. The records hold no such entry that was meant to be
  two, and requirement 2 is about the line between entries
* The order of the entries by their timestamps, which is not checked
* `templates/changes/record.md`, which is not changed

## Beyond the request

1. Have the check also reject a blank line inside an entry. It would cost a second rule in `process.md` and the
   check, for a case that no record holds. Without it, such an entry renders as a loose list item, which is seen in
   the record and fixed by removing the line
