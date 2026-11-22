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
never blocks still goes back to the implementer in the next round to be applied, and one it cannot apply it proposes
to decline, which stops the run.

The human is concerned that the kit's instructions keep growing. `process.md` and the standards are read by every
session of every project, and the role files by every session of their role. At `ed8c644`, `wc -w` in the root of
this repository prints `2406` for `process.md`, `1205` for `standards.md`, `963` for `roles/implementer.md`, `2012`
for `roles/reviewer.md` and `686` for `roles/planner.md`. The aim is that `process.md` and the standards do not
change in this unit, and that the role files grow by no more than the change needs. The human weighs a growth rather
than forbids it, as for 0117.

## Requirements

### The implementer

1. `roles/implementer.md` says that each test the plan schedules is written before the code it covers and committed
   at the commit point the plan gives it, where a test of new or changed behavior is seen to fail and a test that
   pins existing behavior, as before a refactoring, passes. The role file says nothing of a project whose hooks refuse
   that commit, which the decision on the planned tests' commit settles
2. `roles/implementer.md` says that a regression test is shown to fail without the fix on a commit: the tests' own
   commit point of R8, or afterwards the commit before the fix with the test and the files it needs taken from a
   commit for the run. The implementer logs in `record.md` the commits the run used and what it reported. This holds
   for a bug with a `plan.md` and for one without
3. `roles/implementer.md` says that a test found to be needed during the work is welcome at any time, also for code
   of the unit written before it, and that it is not a departure from the order of R1. It is added to `plan.md`, where
   the unit has one, and logged in one line of `record.md`, by the rule the role file already gives for work not in
   the plan
4. `roles/implementer.md` no longer says that the regression test is written before the fix as what proves it. The
   sentence that a regression test never seen to fail proves nothing, or one of the same meaning, is kept

### The reviewer

5. `roles/reviewer.md` says that a test the plan scheduled which the history shows written with or after the code it
   covers is reported as a note and not as a finding:
    * a review reports the note when the late test shows in the diff that review covers
    * it is written in the response and in the findings file, apart from the findings and with no label of an axis
    * it is not one of the `findings` of a step's outcome when the review runs in the orchestrator
    * it never blocks, and asks nothing of the implementer, neither a fix nor a proposed decline
6. `roles/reviewer.md` says that a test found to be needed during the work, added to `plan.md` and logged as R3 says,
   is never a note, whenever it was written
7. `roles/reviewer.md` says that a test that is missing, as a test the plan scheduled that was not written or new
   logic with no unit test, and a regression test that nothing shows failing without the fix, are findings, and that
   they block where the blocking cases of `process.md` say. It says that the commits R2 names let the reviewer run the
   test as the implementer did and see it fail, in a checkout apart from the working tree under review, so that the
   reviewer still changes nothing under review

### The planner

8. `roles/planner.md` says that the tests the plan schedules get a commit point of their own, before the commit point
   of the code they cover, so that git shows the order and a reviewer can run them there. It says that this commit
   point is the one at which tests may fail, and only the tests it adds or changes for new or changed behavior, as an
   assertion updated for a changed behavior, while a test that pins existing behavior passes there. For a bug, the
   failing regression test is the first task and has that commit point. The role file says nothing of a project
   whose hooks refuse that commit, as for R1

### Agreement and length

9. No document, role file, template or prompt of the kit says that a test found to be needed during the work is a
   departure, that the order of the tests is a finding, or that the order is what proves a regression test.
   `process.md` and `standards.md` are not changed by this unit: the bullet of `process.md` on `plan.md`, with its
   ordered tasks, tests first, agrees with R1 and R8 as it stands, and the "Testing" section of the standards states
   no order
10. `record.md` logs `wc -w` of `roles/implementer.md`, `roles/reviewer.md` and `roles/planner.md`, and of
    `process.md` and `standards.md` to show that they did not change, on the commit the unit's branch is cut from and
    once the work is done, and says what added words are for, as "The length of the kit's instructions" of
    `AGENTS.md` says. A growth is put to the human as that section says, and fails no requirement of the unit
11. The lines of the changed files are within 120 characters, they hold no em dash, `npm test` passes, and the change
    check, `npm run check-changes`, exits 0

### The template

12. `templates/changes/plan.md` holds, under "Commit Points", a line for the commit point of the planned tests, before
    the line for the commit of the code they cover, so that a planner who writes from the template sees that the
    planned tests have a commit point of their own, as R8 says (was BTR2)

## Decisions

* **The kind is `task`.** The unit changes the text of three role files and one line of the plan's template, and
  nothing else, as 0060 changed a rule of
  `standards.md` and 0070 one of `process.md`, both tasks. What it had to decide, the form of the note, where it
  goes and how its length is weighed, is decided here, so that what is left is an edit whose description and diff
  say the same thing. `spec.md` is kept, as 0060 kept its own, because the reviewer judges the work against these
  requirements and decisions. Its branch is `task-0118-a-late-planned-test-is-a-note`
* **The order stays the rule for the planned tests, and stops being a finding.** Writing the planned tests first is
  what makes them a test of the spec rather than of the code, and the human keeps it. Once the history holds the
  wrong order, nothing inside the unit undoes it, since commits are not rewritten, so a finding of it can only be
  declined, and a decline is the human's. The note keeps the human informed and gives the implementer nothing to
  answer. Dropping the report altogether was rejected: the human would then not see how often a model skips the
  order, which is what the six units showed
* **The note is outside the findings, and not a finding that never blocks.** Under the default definition's `until`
  of `"no-findings"`, a non-blocking finding goes back to the implementer to be applied. One that is still open after
  the last round does not stop the run, and a run stops for it only when the implementer proposes to decline it. A
  late planned test cannot be applied, since the order is in the history, so the implementer would propose to decline
  it, and that decline would stop the run as before. Leaving the note out of the labels and of the outcome's
  `findings` keeps it out of that loop, and the findings file is where the human reads it. Putting it in
  `afterwards` was rejected: that list is for what the human must do, check or decide after the run, and the note
  asks nothing of them
* **A regression test is judged by its evidence, not by its place in the history.** A run of the test without the
  fix shows what a regression test must show, whenever that run is made, and a single-commit fix, which `process.md`
  allows, holds the test and the fix in one commit by definition. The run is on a commit, the tests' own commit point
  or the commit before the fix, and the record names it, as "What you may claim" of the implementer's role file asks
  of every claim, so that the reviewer can repeat it. A run on an uncommitted tree was rejected, since nothing names
  that tree for the reviewer to rebuild
* **A run made afterwards names both of its commits, and one the reviewer cannot repeat is not proof.** For a run on
  the commit before the fix, the record names that commit and the commit the test files are taken from: the test and
  the files it needs, as a fixture or a helper. A later change to the test, as for a finding, is then a later commit
  that a new run names. When the reviewer cannot reproduce the run from what the record names, as when setup fails
  for a file left out, the run counts as not verified and is not proof, and the reviewer says so as it says what it
  could not check, and reports the missing proof under R7. This is settled here and not in the role files: the
  reviewer's role file already treats a record entry as a claim to verify, and says what it does with one it cannot
* **A test found during the work is work not in the plan.** The implementer's role file already has that work added to
  `plan.md` and logged, which keeps the plan a true map of what was built. Naming the test there as welcome, rather
  than as a departure, is all this unit adds to it. The reviewer tells it from a late planned test by the plan: the
  planned tests are those of the plan as the planner wrote it, and a test added later stands in `plan.md` with its
  line in `record.md`. What R6 exempts is only when such a test was written. It does not excuse a regression test
  added during the work that nothing shows failing without the fix, which R7 makes a finding, nor a test that does
  not exercise the behavior it is for, which the code quality axis judges as before. This is settled here and not in
  the role file, since the role file's rules on findings already hold for every test
* **"Code that already exists" is the code of the unit.** A test found to be needed may cover code the unit wrote
  before the test. A test of code the unit does not change stays under the implementer's rule on scope, as an
  improvement worth raising and not worth including unasked. Taking such tests into a unit is BTR1
* **The planned tests get a commit of their own, which may fail.** It is what makes the order visible in git, which in
  18 of the 32 units it was not, and it gives the reviewer a commit on which to run the tests and see them fail. The
  planner's rule that a commit point leaves the tree coherent gets this one exception, limited to the tests that
  commit adds or changes for new or changed behavior, as the updated assertions of exit statuses that 0066 planned.
  A test that pins existing behavior, as before a refactoring, goes first too
  and passes there, since what it shows is that the behavior is kept
* **A project whose hooks refuse a commit with failing tests is a recorded limitation.** Such a project cannot make
  the planned tests' own commit, and a hook is not bypassed for it. The implementer still writes the planned tests
  first, runs them and sees them fail, then commits them with the code and says so in the record, and the reviewer
  reports the combined commit as the note of R5. The role files say nothing of it: it changes no step of a run that
  matters, and the human wants the role files, read by every session of their role, to grow as little as possible
* **No mechanical check of the order of commits.** A check that a test's commit comes before its code's would refuse
  the tests found during the work, which the human welcomes, and could not tell the two apart without reading the plan
  as a reviewer does
* **`process.md` and the standards stay as they are.** Neither says anything this unit changes: "tests first" in the
  bullet of `plan.md` is the planned order, which stays, and a test added during the work is a change of the plan
  under the implementer's rule. Rewording the bullet would add words to the file every session reads, for no change
  of meaning. The counts of R10 are taken on the commit the branch is cut from, so that they compare alike whether
  0117 lands before this unit or after it
* **The length of the files is logged and put to the human, not limited.** This is the rule of "The length of the
  kit's instructions" of `AGENTS.md`, which follows the decision 0117 made on the length of `process.md`. A hard
  limit would fail the unit over a few words the change may need, and the human wants to weigh the growth rather
  than forbid it. A growth is not a finding, since a finding asks the implementer for a
  change, while the growth is the human's to reassess: as a non-blocking finding under `"no-findings"` it would go
  back to the implementer, which would trim words to make it go away, or propose to decline it, which stops the run
  for a decision the human wants to take at the end. The reviewer of this unit says it as an item under
  `**Needed from you**`, which reaches the human in its response by hand and in `afterwards`, and so in the end
  report, in a step of the orchestrator, without stopping the run. It is not put in the findings file, which the
  implementer takes findings from. A draft of the three role texts came to about 80, 140 and 50 words more, which
  the log of R10 lets the human compare with what the work added. It is a rule of `AGENTS.md` and not of the role
  files, since the length of the kit's instructions is a concern of the kit's own repository
* **A note may be repeated.** A review reports a late planned test that shows in the diff it covers, and no more is
  promised. A full re-review at the human's request, or a delta review whose diff holds a later edit of a test
  already noted, reports it again. That is harmless, since a note never blocks, asks nothing of the implementer and
  stops no run, while a rule for one note per run would have the reviewer look back through the reviews before it
* **How this unit and 0117 touch the same files.** 0117, `changes/0117-set-a-unit-implemented-by-a-command/`, is
  approved, and changes `roles/implementer.md` under "Review findings" and `roles/reviewer.md` under "What blocks",
  "Reporting", "Re-reviewing a unit" and "Record that you reviewed", for the rule of `implemented`, the findings a
  later review verifies and their labels, and the forms of the reviewer's entry and of a proposed decline. This unit
  changes `roles/implementer.md` under "Working the plan", `roles/reviewer.md` under "The three axes" and
  `roles/planner.md` under "Writing the plan", none of which 0117 changes, so that whichever lands second merges
  without a conflict of text. It adds nothing to the rules of "Re-reviewing a unit" for findings: the note of R5 is
  not a finding, and a review makes it from the diff that review covers, which that section already defines, so a
  delta review needs nothing of the reviews before it for the note. The implementer of the unit that lands second
  keeps 0117's rules for findings as they are, and adds the note of this unit beside them. Neither depends on the
  other in meaning: the note stands in no entry of 0117's forms and holds back no `implemented` under either rule,
  and R7 says that a finding blocks where `process.md` says, whichever rule `process.md` then holds. This unit
  specifies nothing of the rule of `implemented`, of the reviewer's entry or of a proposed decline
* **The template shows the planned tests' commit point (R12, was BTR2).** It reminds a planner who writes from the
  template alone. A plan that omits the commit point is no note by itself: R5 judges the history, so the note comes
  only when git shows a planned test committed with or after the code it covers

## Non-goals

* A check, in the change check or elsewhere, of the order of the commits of tests and code
* Rewriting the history of a unit whose tests were committed late, in this repository or in a project
* Changing the orchestrator, its default definition, the outcome of a step or when a run stops
* Changing the blocking cases of `process.md`, or anything 0117 specifies
* A log entry for each planned test that shows it failing. The commit of the planned tests lets the reviewer see it,
  where the project's hooks allow that commit
* Changing `process.md`, the standards, the templates other than the line of R12, or the specifier's role file

## Beyond the request

1. Welcome a test found to be needed during the work also for code the unit does not change. It would cover more of a
   project, at the cost of units whose diff reaches past their scope and a reviewer who can no longer tell such a
   test from unasked work. Without it, the implementer raises such a test as an improvement, as now
2. BTR2: taken, now R12
3. Have the implementer log a run that shows each planned test failing at its commit point, as R2 asks of a
   regression test. It would put the evidence in the record, at the cost of a line per commit point in every unit.
   Without it, the reviewer runs the tests on that commit when it wants the evidence
