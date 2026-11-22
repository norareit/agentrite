# 0118 A planned test written late is a note, and the planned tests have a commit of their own

## Context

`roles/implementer.md` says, under "Working the plan", to write the test before the code it covers, and for a bug to
write the regression test first, confirm that it fails, and only then implement the fix. `roles/planner.md` says to
put the test that proves a piece of behavior ahead of the code that provides it, that the first task of a bug is the
failing regression test, and to set commit points where the tree is coherent. `process.md` says that `plan.md` holds
ordered tasks, tests first. `roles/reviewer.md` says nothing of the order of the tests, and the standards, under
"Testing", ask for unit tests of all new logic and say nothing of the order either.

A project built with the kit by the orchestrator, 32 units with Sonnet as the implementer, shows what the rule does in
a run. In 6 units the records show the tests the plan scheduled written after the code they cover, which the
implementer reported honestly each time. The reviewer then reported the order as a finding. No change to the unit can
fix such a finding, since the order is in the history and commits are not rewritten, so the implementer proposed to
decline it, and a proposed decline stops a run of the orchestrator for the human. That made five stops for a decision
that was the same every time, and once the reviewer called the finding blocking. In none of the six was the late test
one that turned up during the work: each was a test the plan had scheduled first. In 18 of the 32 units, neither the
record nor git shows the order at all, since nearly every commit held tests and code together.

The human holds that a test found to be needed during the work is good, and never a departure from the plan's order:
the aim is that everything is covered. What a regression test must show is that it fails without the fix, and the
order is one way to show it, not the thing that is checked.

The default definition of the orchestrator, `orchestrator.json`, repeats the implementer and the reviewer `until`
`"no-findings"`, which holds only when the review's outcome has no finding at all, blocking or not. A finding that
never blocks still goes back to the implementer in the next round, and one it cannot fix is proposed for declining.

The human is concerned that the kit's instructions keep growing. `process.md` and the standards are read by every
session of every project. At `ed8c644`, `wc -w` in the root of this repository prints `2406` for `process.md`,
`1205` for `standards.md`, `963` for `roles/implementer.md`, `2012` for `roles/reviewer.md` and `686` for
`roles/planner.md`.

## Requirements

### The implementer

1. `roles/implementer.md` says that each test the plan schedules is written before the code it covers, committed at
   the commit point the plan gives it, and seen to fail there
2. `roles/implementer.md` says that a regression test is shown to fail without the fix, by a run before the fix or by
   a run afterwards on a tree without the fix, and that the implementer logs in `record.md` the commit or tree the run
   was on and what it reported. This holds for a bug with a `plan.md` and for one without
3. `roles/implementer.md` says that a test found to be needed during the work is welcome at any time, also for code
   of the unit written before it, and that it is not a departure from the order of R1. It is added to `plan.md`, where
   the unit has one, and logged in one line of `record.md`, by the rule the role file already gives for work not in
   the plan
4. `roles/implementer.md` no longer says that the regression test is written before the fix as what proves it. The
   sentence that a regression test never seen to fail proves nothing, or one of the same meaning, is kept

### The reviewer

5. `roles/reviewer.md` says that a test the plan scheduled which the history shows written with or after the code it
   covers is reported as a note and not as a finding:
    * the note is reported once, in the review that first sees it, and not again in a later review of the unit
    * it is written in the response and in the findings file, apart from the findings and with no label of an axis
    * it is not one of the `findings` of a step's outcome when the review runs in the orchestrator
    * it never blocks, and asks nothing of the implementer, neither a fix nor a proposed decline
6. `roles/reviewer.md` says that a test found to be needed during the work, added to `plan.md` and logged as R3 says,
   is neither a note nor a finding
7. `roles/reviewer.md` says that a test that is missing, as a test the plan scheduled that was not written or new
   logic with no unit test, and a regression test that nothing shows failing without the fix, are findings, and that
   they block where the blocking cases of `process.md` say. It says that a commit of the history holding the test
   without the code it covers, or without the fix, lets the reviewer run the test there and see it fail, in a checkout
   apart from the working tree under review, so that the reviewer still changes nothing under review

### The planner

8. `roles/planner.md` says that the tests the plan schedules get a commit point of their own, before the commit point
   of the code they cover, so that git shows the order and a reviewer can run them there and see them fail. It says
   that this commit point is the one at which tests may fail, and only the tests it adds. For a bug, the failing
   regression test is the first task and has that commit point

### Agreement and length

9. No document, role file, template or prompt of the kit says that a test found to be needed during the work is a
   departure, that the order of the tests is a finding, or that the order is what proves a regression test.
   `process.md` and `standards.md` are not changed by this unit: the bullet of `process.md` on `plan.md`, with its
   ordered tasks, tests first, agrees with R1 and R8 as it stands, and the "Testing" section of the standards states
   no order
10. Once the unit is done, `wc -w` prints for `process.md` and `standards.md` the count it prints at the commit the
    unit's branch is cut from, which at `ed8c644` is `2406` and `1205`. It prints for `roles/implementer.md` at most
    100 more than at that commit, for `roles/reviewer.md` at most 150 more, and for `roles/planner.md` at most 60 more
11. The lines of the changed files are within 120 characters, they hold no em dash, `npm test` passes, and the change
    check, `npm run check-changes`, exits 0

## Decisions

* **The kind is `task`.** The unit changes the text of three role files and nothing else, as 0060 changed a rule of
  `standards.md` and 0070 one of `process.md`, both tasks. What it had to decide, the form of the note, where it
  goes and the limits on length, is decided here, so that what is left is an edit whose description and diff say the
  same thing. `spec.md` is kept, as 0060 kept its own, because the reviewer judges the work against these
  requirements and decisions. Its branch is `task-0118-a-late-planned-test-is-a-note`
* **The order stays the rule for the planned tests, and stops being a finding.** Writing the planned tests first is
  what makes them a test of the spec rather than of the code, and the human keeps it. Once the history holds the
  wrong order, nothing inside the unit undoes it, since commits are not rewritten, so a finding of it can only be
  declined, and a decline is the human's. The note keeps the human informed and gives the implementer nothing to
  answer. Dropping the report altogether was rejected: the human would then not see how often a model skips the
  order, which is what the six units showed
* **The note is outside the findings, and not a finding that never blocks.** Under the default definition, a repeat
  `until` `"no-findings"` goes on while an outcome has any finding, so a non-blocking finding would still return to
  the implementer every round, which would propose to decline it in the end, and the run would stop as before.
  Leaving the note out of the labels and of the outcome's `findings` keeps it out of that loop, and the findings file
  is where the human reads it. Putting it in `afterwards` was rejected: that list is for what the human must do,
  check or decide after the run, and the note asks nothing of them
* **A regression test is judged by its evidence, not by its place in the history.** A run of the test on a tree
  without the fix shows what a regression test must show, whenever that run is made, and a single-commit fix, which
  `process.md` allows, holds the test and the fix in one commit by definition. The record names the tree the run was
  on, as "What you may claim" of the implementer's role file asks of every claim, so the reviewer can repeat it
* **A test found during the work is work not in the plan.** The implementer's role file already has that work added to
  `plan.md` and logged, which keeps the plan a true map of what was built. Naming the test there as welcome, rather
  than as a departure, is all this unit adds to it. The reviewer tells it from a late planned test by the plan: the
  planned tests are those of the plan as the planner wrote it, and a test added later stands in `plan.md` with its
  line in `record.md`
* **"Code that already exists" is the code of the unit.** A test found to be needed may cover code the unit wrote
  before the test. A test of code the unit does not change stays under the implementer's rule on scope, as an
  improvement worth raising and not worth including unasked. Taking such tests into a unit is BTR1
* **The planned tests get a commit of their own, which may fail.** It is what makes the order visible in git, which in
  18 of the 32 units it was not, and it gives the reviewer a commit on which to run the tests and see them fail. The
  planner's rule that a commit point leaves the tree coherent gets this one exception, limited to the tests that
  commit adds. A project whose own git hooks refuse a commit whose tests fail cannot make that commit; the implementer
  then commits the tests with the code and says so in the record, and the reviewer notes the order as R5 says. A
  hook is not bypassed for it
* **No mechanical check of the order of commits.** A check that a test's commit comes before its code's would refuse
  the tests found during the work, which the human welcomes, and could not tell the two apart without reading the plan
  as a reviewer does
* **`process.md` and the standards stay as they are.** Neither says anything this unit changes: "tests first" in the
  bullet of `plan.md` is the planned order, which stays, and a test added during the work is a change of the plan
  under the implementer's rule. Rewording the bullet would add words to the file every session reads, for no change
  of meaning. The limits of R10 are counted against the commit the branch is cut from, so that they hold whether
  0117 lands before this unit or after it
* **The role files grow by what the change needs, within stated limits.** The limits of R10 are those of a draft of
  the three texts, about 80, 140 and 50 words more, with some room for their wording
* **How this unit and 0117 touch the same files.** 0117, `changes/0117-set-a-unit-implemented-by-a-command/`, is a
  draft that changes `roles/implementer.md` under "Review findings" and `roles/reviewer.md` under "What blocks",
  "Reporting" and "Record that you reviewed", for the rule of `implemented` and the forms of the reviewer's entry and
  of a proposed decline. This unit changes `roles/implementer.md` under "Working the plan", `roles/reviewer.md` under
  "The three axes" and `roles/planner.md` under "Writing the plan", none of which 0117 changes, so that whichever
  lands second merges without a conflict of text. Neither depends on the other in meaning: the note of R5 is not a
  finding, so it stands in no entry of 0117's forms and holds back no `implemented` under either rule, and R7 says
  that a finding blocks where `process.md` says, whichever rule `process.md` then holds. This unit specifies nothing
  of the rule of `implemented`, of the reviewer's entry or of a proposed decline

## Non-goals

* A check, in the change check or elsewhere, of the order of the commits of tests and code
* Rewriting the history of a unit whose tests were committed late, in this repository or in a project
* Changing the orchestrator, its default definition, the outcome of a step or when a run stops
* Changing the blocking cases of `process.md`, or anything 0117 specifies
* A log entry for each planned test that shows it failing. The commit of the planned tests lets the reviewer see it
* Changing `process.md`, the standards, the templates or the specifier's role file

## Beyond the request

1. Welcome a test found to be needed during the work also for code the unit does not change. It would cover more of a
   project, at the cost of units whose diff reaches past their scope and a reviewer who can no longer tell such a
   test from unasked work. Without it, the implementer raises such a test as an improvement, as now
2. Show the planned tests' own commit point in `templates/changes/plan.md`, as a line under "Commit Points". It would
   cost one line of the template, and remind a planner who writes from the template alone. Without it, the planner's
   role file holds the rule, and a plan without the commit point shows in the review as a note of the order
3. Have the implementer log a run that shows each planned test failing at its commit point, as R2 asks of a
   regression test. It would put the evidence in the record, at the cost of a line per commit point in every unit.
   Without it, the reviewer runs the tests on that commit when it wants the evidence
