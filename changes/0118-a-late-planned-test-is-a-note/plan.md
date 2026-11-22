# 0118 A planned test written late is a note, and the planned tests have a commit of their own

## Approach

The unit changes the text of three role files and the commit points of the plan's template. The tree is that of
`9e2db59`, the head of `master`, where 0117 has landed. This unit is therefore the one that lands second: 0117's rules
for findings stay as they are, and the note is added beside them. The sections this unit edits, "Working the plan" of
the implementer, "The three axes" of the reviewer and "Writing the plan" of the planner, are ones 0117 did not change.

The wording below is the plan's, so that the role files grow by no more than the change needs. It is put in as
written, wrapped at 120 characters.

**`roles/implementer.md`, "Working the plan".** The bullet that opens "Write the test before the code it covers" is
replaced by these three, in this order, ahead of the bullet "When necessary work is not in the plan":

```markdown
* Write each test the plan schedules before the code it covers, and commit it at the commit point the plan gives it.
  There a test of new or changed behavior is seen to fail, and a test that pins existing behavior, as before a
  refactoring, passes
* Show a regression test failing without the fix on a commit, with or without a `plan.md`: the tests' own commit
  point, or afterwards the commit before the fix, with the test and the files it needs taken from a commit for the
  run. Log in `record.md` the commits the run used and what it reported. A regression test never seen to fail proves
  nothing
* A test found to be needed during the work is welcome at any time, also for code of the unit written before it, and
  is no departure from that order. Add it to `plan.md` where there is one, and log it in one line of `record.md`
```

**`roles/reviewer.md`, "The three axes".** These two paragraphs go after the list of the axes, before the heading
"What blocks":

```markdown
A test the plan scheduled that the history shows written with or after the code it covers is a note and not a
finding. Report it when the late test shows in the diff this review covers, in your response and in the findings
file, apart from the findings and with no label of an axis. It is not one of the `findings` of a step's outcome, never
blocks, and asks nothing of the implementer, neither a fix nor a proposed decline. A test found to be needed during
the work, added to `plan.md` where there is one and logged in `record.md`, is never a note, whenever it was written.

A planned test that was not written, new logic with no unit test, and a regression test that nothing shows failing
without the fix are findings, and block where `process.md` says. The commits the record names for a regression test
let you run it as the implementer did and see it fail, in a checkout apart from the working tree under review, so
that you still change nothing under review.
```

**`roles/planner.md`, "Writing the plan".** The bullet "For a bug, the first task is the failing regression test" is
replaced by the first bullet below, and the bullet "Set commit points" by the second, each in its place:

```markdown
* Give the tests the plan schedules a commit point of their own, before that of the code they cover, so that git
  shows the order and a reviewer can run them there. It is the one commit point at which tests may fail, and only
  those it adds or changes for new or changed behavior, as an assertion updated for a changed behavior. A test that
  pins existing behavior passes there. For a bug, the failing regression test is the first task and has this commit
  point
```

```markdown
* Set the other commit points where the tree is coherent and the change is reviewable on its own
```

**`templates/changes/plan.md`, "Commit Points".** The one line `- [ ] [Commit]` becomes these two:

```markdown
- [ ] [Commit of the planned tests, before the code they cover]
- [ ] [Commit of the code they cover]
```

**No planned tests in this unit.** It adds no logic, so the standards ask for no unit test, and the spec asks for no
test of the wording. It therefore has no commit point of planned tests. What it must make true of the text is checked
by the commands under "Verification". `process.md`, `standards.md`, the specifier's role file and the agents' wrappers
are not changed: the search of the tree found no other statement of the order of tests, and the wrappers hold only a
pointer to the role file.

## Files

- `roles/implementer.md`: the three bullets of "Working the plan" (R1, R2, R3, R4)
- `roles/reviewer.md`: the two paragraphs of "The three axes" (R5, R6, R7)
- `roles/planner.md`: the two bullets of "Writing the plan" (R8)
- `templates/changes/plan.md`: the two lines of "Commit Points" (R12)
- `changes/0118-a-late-planned-test-is-a-note/record.md`: the word counts and what the added words are for (R10)

## Tasks

- [x] Log in `record.md` the counts of `wc -w` on `9e2db59`, the commit the branch is cut from: `process.md` 2562,
  `standards.md` 1205, `roles/implementer.md` 1241, `roles/reviewer.md` 2302, `roles/planner.md` 686 (R10)
- [x] In `roles/implementer.md`, replace the bullet on writing the test first by the three bullets of "Approach", and
  keep the sentence that a regression test never seen to fail proves nothing (R1, R2, R3, R4)
- [x] In `roles/reviewer.md`, add the two paragraphs of "Approach" before the heading "What blocks", changing no other
  section (R5, R6, R7)
- [x] In `roles/planner.md`, replace the two bullets as "Approach" gives them (R8)
- [x] In `templates/changes/plan.md`, replace the line of "Commit Points" by the two lines of "Approach" (R12)
- [x] Run the search under "Verification", and confirm that no document, role file, template or prompt of the kit
  calls a test found during the work a departure, makes the order of the tests a finding, or makes the order the proof
  of a regression test, and that `process.md` and `standards.md` show no diff against `9e2db59` (R9)
- [x] Log in `record.md` the counts of `wc -w` of the five files on the finished work, and what the words added to
  each role file are for. Put no growth in a findings file (R10)
- [ ] Run the checks under "Verification" on the final commit, and log in `record.md` what each reported, naming any
  test skipped for want of Docker (R11)

## Verification

- [x] `git diff --exit-code 9e2db59 -- process.md standards.md` exits 0 (R9)
- [x] `grep -rnIiE 'regression|tests? first|test before|before the code|written first|fails? first|departure|order of
  (the )?tests' --exclude-dir=node_modules --exclude-dir=changes --exclude-dir=.git --exclude-dir=.reviews
  --exclude=CHANGELOG.md .`, run as one line, shows no statement that R9 rules out (R9)
- [x] `awk 'length > 120 { print FILENAME": "FNR; found = 1 } END { exit found }' roles/implementer.md
  roles/reviewer.md roles/planner.md templates/changes/plan.md changes/0118-a-late-planned-test-is-a-note/record.md`,
  run as one line, exits 0 (R11)
- [x] `git diff 9e2db59 -- roles templates changes/0118-a-late-planned-test-is-a-note | grep '^+' |
  LC_ALL=C grep -c $'\xe2\x80\x94'`, run as one line, prints 0, which is the count of em dashes added (R11)
- [x] `npm test` passes (R11)
- [ ] `npm run check-changes` exits 0, on the committed work (R11)

## Commit Points

- [ ] `task-0118 Log the word counts the unit starts from`, with `record.md`
- [ ] `task-0118 Have the implementer commit planned tests first and show a regression test failing`, with
  `roles/implementer.md` and its entry in `record.md`
- [ ] `task-0118 Have the reviewer report a late planned test as a note`, with `roles/reviewer.md` and its entry in
  `record.md`
- [ ] `task-0118 Give the planned tests a commit point of their own`, with `roles/planner.md`,
  `templates/changes/plan.md` and their entry in `record.md`
- [ ] `task-0118 Record the word counts and the checks of the finished work`, with `plan.md` and `record.md`
