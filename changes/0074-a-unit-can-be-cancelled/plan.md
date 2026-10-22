# 0074 A unit can be cancelled

## Approach

The unit has three parts, and each is small: the change check learns a second frozen status, `sandbox.sh` refuses to
cut a branch for a cancelled unit, and the documents of the process give the new status. The tests of each code part
go ahead of its code.

The change check, `scripts/check-changes.mjs`. `findFrozenViolations` today skips every unit whose status on the
merge base is not `implemented`. It gains a module constant, the set of the frozen statuses, `implemented` and
`cancelled`, and skips a unit whose base status the set does not hold. The messages stay as they are, which gives
requirement 8 its same messages by construction. `findIncompletePlans` is not changed: it already judges only an
`implemented` unit, which is requirement 9, and a test pins it.

The sandbox, `container/unit-clone.sh`. `cut_unit_branch` already reads the unit's `record.md` on the default branch,
line by line, for its `kind`. The same loop reads the record's `status` too, the first line that opens with
`status:`, as the change check's `statusFrom` reads it, and stops once it has both. When the status is `cancelled`
the function says why and returns 3, before the check of the kind and before any branch is made. Returning 3, and not
1, is what makes `sandbox.sh` exit with 1 without printing the forms of the command, as for the other refusals of a
unit the default branch holds: its caller prints the forms only for 1. The refusal comes before the image is built,
the registry asked or a container started, since `resolve_unit_branch` runs before all of them. A unit whose branch
exists never reaches `cut_unit_branch`, and is started as it is, as the spec's decision says. A `--variant` run of a
cancelled unit with no branch is refused the same way, since the unit's branch is cut before the variant's.

The message, two lines on standard error, with `<directory>` the unit's directory and `<default>` the default branch:

```
sandbox.sh: changes/<directory> is cancelled on <default>, so no branch is cut for it.
Taking its idea up again is a new unit that names <directory> in supersedes.
```

The orchestrator's code is not changed: requirement 16 is met by adding `cancelled` to the statuses that the
existing refusal test of `agentrite orchestrate` gives, which `checkApproved` in `scripts/agentrite.mjs` refuses.

The documents. `process.md` at the root of the repository is the package's, and is the one edited, never the copy
under `node_modules`. The paragraph of the statuses is rewritten for requirement 1, and a new paragraph after the one
that freezes an implemented unit gives the cancellation, requirements 2 to 5. The paragraph of the change check names
both end statuses, requirement 7. The paragraph that says everything after the approval is done on the unit's branch
names the cancellation as its exception, in the same paragraph, requirement 6. In `roles/reviewer.md` two sentences
tie the freeze to `implemented` alone and are reworded to say "frozen", as `process.md` already says of outcomes;
no other role file says or implies it, by a search of `roles/` and `extra-roles/` for `implemented`, `frozen` and
`Amendments`. `SANDBOX.md` is not changed, by requirement 13.

## Files

- `scripts/check-changes.mjs`: the set of frozen statuses, used by `findFrozenViolations`
- `tests/check-changes.test.mjs`: unit tests of `findFrozenViolations` and `findIncompletePlans` for `cancelled`, and
  one test of the command in a repository
- `container/unit-clone.sh`: `cut_unit_branch` reads the status and refuses a cancelled unit; its comment says so
- `tests/sandbox-unit-run.test.mjs`: a case of `noCut` for a cancelled unit, and the cut tested at every other status
- `tests/agentrite-orchestrate.test.mjs`: `cancelled` among the statuses the refusal test gives
- `process.md`: the five statuses, the cancellation, its commit, its freeze and the change check
- `templates/changes/record.md`: `cancelled` among the values of `status`
- `tests/package-documents.test.mjs`: the template's line of statuses, with five
- `roles/reviewer.md`: the two sentences that tie the freeze to `implemented`
- `README.md`: "check-changes" and "sandbox.sh" of "Commands", and "Adding a role"
- `changes/0074-a-unit-can-be-cancelled/record.md`: the log entries of the work

## Tasks

### The change check

- [x] In `tests/check-changes.test.mjs`, beside the tests of `findFrozenViolations`, add unit tests that give a base
  unit with `status: 'cancelled'` and expect: a changed `spec` is reported as `<unit>: spec.md`; a changed `plan` as
  `<unit>: plan.md`; a unit absent from the head as `<unit>: unit deleted`. Add one that gives a base unit `approved`
  and the head unit `cancelled` with a changed `spec` and `plan`, and expects no violation. Run them and see the
  first three fail (R8, R15)
- [x] Beside the tests of `findIncompletePlans`, add one that gives a `cancelled` unit whose `plan` holds `- [x]` and
  `- [ ]` tasks and expects no violation (R9, R15)
- [x] Beside "check-changes rejects a changed frozen spec in another repository", add a test of the command that
  commits on the default branch a second unit whose record holds `status: cancelled` and which has a `spec.md`,
  changes that `spec.md` on a branch `change`, runs the checker and expects a status other than 0 and the line
  `- <unit>: spec.md` (R8, R15)
- [x] In `scripts/check-changes.mjs`, add a constant for the frozen statuses, a `Set` of `implemented` and
  `cancelled`, with a comment that says that both end statuses freeze a unit and that only an implemented one must
  have a complete plan, and make `findFrozenViolations` skip a base unit whose status the set does not hold. Leave
  `findIncompletePlans` as it is. Run `node --test tests/check-changes.test.mjs` and see every test pass (R8, R9)

### The sandbox

- [ ] In `tests/sandbox-unit-run.test.mjs`, add to `noCut` a case named "a unit cancelled on master", unit `0031`,
  arranged with `commitUnit(host, 'kind: feature\nstatus: cancelled\ntimestamp: 2026-10-05T13:45:27Z')`, that says
  `/^sandbox\.sh: changes\/0031-cut-me is cancelled on master, so no branch is cut for it\.$/m` and
  `/^Taking its idea up again is a new unit that names 0031-cut-me in supersedes\.$/m`. The loop over `noCut` already
  asserts the exit status 1, that the refs are unchanged, so that no branch exists after it, and that Docker and npm
  were not called (R12, R13, R17)
- [ ] Beside the loop that cuts a branch for each kind, add a loop over the statuses `draft`, `approved`,
  `in-progress` and `implemented`, which commits a feature at that status and expects the run to exit 0, say
  `sandbox.sh: cut feature-0031-cut-me from master at <commit>, for changes/0031-cut-me.` and leave
  `refs/heads/feature-0031-cut-me` at the head of `master`. Run the file and see the cancelled case fail and the
  loop pass (R17)
- [ ] In `container/unit-clone.sh`, make the loop of `cut_unit_branch` that reads the record read `status` beside
  `kind`, the first line of each that matches `^status:[[:space:]]*([^[:space:]]+)[[:space:]]*$` and its `kind`
  counterpart, and break once both are read. After the loop and before the `case` of the kind, when the status is
  `cancelled`, print the two lines of the message the approach gives and return 3. Add to the function's comment
  that a unit cancelled on the default branch gets no branch, and is one of those that return 3. Run the file and see
  every test pass (R12, R13)

### The orchestrator

- [ ] In `tests/agentrite-orchestrate.test.mjs`, add `cancelled` to the list `['draft', 'in-progress',
  'implemented']` of the refusal test, so that it expects "the unit changes/<unit>/ is cancelled, and a run starts
  the work of an approved unit". Run the file and see it pass with no change to the code (R16)

### The documents

- [ ] In `tests/package-documents.test.mjs`, make the test of the record template expect the line
  `status: [draft | approved | in-progress | implemented | cancelled]`, and say in its name and comment that the
  template gives the five statuses, naming unit 0074, R10 beside unit 0052. Run it and see it fail (R10)
- [ ] In `templates/changes/record.md`, make the `status` line give `cancelled` after `implemented`. Run the test
  and see it pass (R10)
- [ ] In `process.md`, rewrite the opening sentence of the paragraph of the statuses: the statuses are `draft`,
  `approved`, `in-progress`, `implemented` and `cancelled`; a unit that is built goes through the first four in that
  order; `implemented` and `cancelled` are the two end statuses, and a unit leaves the order for `cancelled` only
  from `draft`, `approved` or `in-progress`. Leave the rest of the paragraph as it is (R1)
- [ ] In `process.md`, after the paragraph that ends with `supersedes:` for a correction that would make the record
  misleading, add a paragraph on cancelling. It says: only the human cancels a unit; an `implemented` unit is never
  cancelled, and undoing implemented work is a new unit that names the old one in `supersedes`, as the paragraph
  above says for a misleading correction; the log entry that sets `cancelled` gives the reason in words, and when
  another unit did the work or made it moot, names that unit's directory; a cancelled unit is frozen as an
  implemented one is, so that its `spec.md` and `plan.md` change no more, a later correction is an amendment in
  `record.md`, and outcomes recorded after the cancellation go under `## Amendments`; taking the idea up again is a
  new unit that names the cancelled one in `supersedes`, and a cancelled unit is never set back to an earlier status
  (R2, R3, R4, R5)
- [ ] In `process.md`, in the paragraph of the change check, make "any unit implemented on the merge base" say "any
  unit implemented or cancelled on the merge base". Leave the sentence on unticked tasks of an implemented unit as it
  is (R7)
- [ ] In `process.md`, in the paragraph that says everything after the approval is done on the unit's branch, name
  the cancellation as the exception to that rule where the rule is stated, and say, in that paragraph: a unit with no
  branch is cancelled on the default branch, as its approval was; a unit that has a branch, which an `in-progress`
  unit always has and an `approved` one has once its planning began, is cancelled on the default branch too, and its
  branch is not merged; that commit holds the unit's documents as they stand at the head of its branch, `spec.md`,
  `plan.md` when there is one, and `record.md` with the entry that sets `cancelled`, and nothing of its
  implementation (R6)
- [ ] In `roles/reviewer.md`, in "Where an outcome belongs", make "one that has not reached `implemented` is
  corrected in place" say "one that is not frozen yet is corrected in place", and in "Record that you reviewed" make
  "while the unit is not `implemented`, and under `## Amendments` once it is" say "while the unit is not frozen, and
  under `## Amendments` once it is". Search `roles/` and `extra-roles/` for `implemented`, `frozen`, `freeze` and
  `Amendments` and confirm that no other sentence says or implies that `implemented` alone freezes a unit or ends
  one (R11)
- [ ] In `README.md`, "check-changes" of "Commands": say that it rejects a changed `spec.md` or `plan.md` of a unit
  that is `implemented` or `cancelled` on the default branch, and the deletion of such a unit, and that an
  implemented plan with unticked tasks is rejected while a cancelled one's is not (R14)
- [ ] In `README.md`, "sandbox.sh" of "Commands": give a cancelled unit among the refusals of the paragraph on exit
  statuses, as "a unit given by a number that names no branch and that is cancelled on the default branch", and in
  the paragraph that says a number that no branch holds gets its branch cut, say that a unit cancelled there gets
  none (R12, R14)
- [ ] In `README.md`, "Adding a role": make "its four statuses" say "its five statuses". Search `README.md` for every
  other place that gives a number of statuses and make it five (R14)
- [ ] Check that no line of the files changed is longer than 120 characters, and that no em dash was added (R1 to
  R17)

## Verification

- [ ] `npm test` passes, with only the skips the host is known for
- [ ] `node scripts/check-changes.mjs` passes on the branch, after the commits; `npm run check-changes`, which runs the
  installed release's check, passes too
- [ ] Every requirement 1 to 17 has a task above that names it, and every task names one
- [ ] `git diff master -- SANDBOX.md CHANGELOG.md` is empty

## Commit Points

- [x] `feature-0074 Plan the cancellation of a unit`: this plan and its log entry in `record.md`
- [x] `feature-0074 Freeze a cancelled unit in the change check`: the tasks of "The change check"
- [ ] `feature-0074 Cut no branch for a cancelled unit`: the tasks of "The sandbox"
- [ ] `feature-0074 Test that orchestrate refuses a cancelled unit`: the task of "The orchestrator"
- [ ] `feature-0074 Give the status cancelled in the process`: the tasks of "The documents"
