# 0068 A round of the orchestrator leaves the record wrong

## Context

Unit 0065 gave the kit an orchestrator, whose default definition runs the planner and then at most three rounds of
the implementer followed by the reviewer. Its checks by hand reached only a first round. A later check by hand,
recorded as an amendment in the record of 0065, forced a second round, and the run itself worked: the implementer of
round 2 found the review, applied it, and the review of round 2 had no finding. The record that the roles left was
wrong in two ways, and the second of them is older than the orchestrator: the human has met it after reviews run by
hand for a long time, and the records of units 0030 and 0034 show the implementer committing a reviewer's entry
later.

## The bug

**Observed.** In the check by hand of the amendment of 0065, on the kit of `c54f92b`:

* the implementer of round 2 wrote in `record.md` that the human accepted the findings `S1` and `P1`, which no human
  saw, and set the status `implemented` before the review of round 2 ran. That review's entry then went under
  `## Amendments`, as the entry of a review of a frozen unit does
* after the run, `record.md` held the reviewer's entry of round 2 uncommitted. The entry of round 1 was committed by
  the implementer of round 2, together with its own

**Expected.** A step of a run of the orchestrator records a finding that its prompt accepts as accepted by the run's
definition, and leaves the status at `in-progress` at the latest, so that the human sets `implemented` after the
run and after its last review. The reviewer commits its own record entry, so that a review leaves the working tree as
it found it, in a run of the orchestrator and by hand.

**Steps to reproduce.** Run the default definition of the orchestrator on an approved feature, changed only in that
the implementer's prompt also tells it to break one requirement in round 1, so that the review of round 1 returns a
blocking finding and a second round runs, as the amendment of 0065 describes. Reproduced once. The uncommitted entry
of the reviewer is reproduced by any review, by hand or in a run.

**Root cause.** Inferred from the run's record and outcomes and from the kit's text. The prompt of the default
definition's implementer says that from round 2 the human accepts the review's findings the implementer agrees with,
and the implementer recorded it as said. Nothing tells a step that a review follows it in the run: the implementer's
role file has it set `implemented` once the human decided every blocking finding and every task is ticked, which the
prompt made true in the implementer's reading after it applied the findings of round 1. The reviewer's role file says
that it makes no commit, so its entry is left for whoever commits next, and after the last review of a run nobody
does.

**Fix.** The default definition's implementer prompt says that the definition accepts the findings, not the human.
The request the command adds to the prompt of every step says that a finding the step's prompt accepts is recorded as
accepted by the orchestrator's definition, and that a step sets no status later than `in-progress`. The reviewer's
role file has it commit its entry as its last act, in a commit that holds nothing else.

## Requirements

1. The implementer's `prompt` in the kit's default definition is
   `From round 2, this definition accepts review findings you agree with. Propose declining others.`, and the
   definition is otherwise as requirement 4 of 0065 gives it. The README shows it so
2. The request that the command adds to the prompt of every step, besides what requirement 15 of 0065 has it say,
   says:
    * that a finding the step's prompt accepts is recorded in `record.md` as accepted by the orchestrator's
      definition, and not as a decision of the human
    * that the step sets the unit's status to no status later than `in-progress`, since the human sets
      `implemented` after the run
3. The README's section on the orchestrator says what requirement 2 has the request say, and that the human sets
   `implemented` after a run
4. The reviewer's role file has the reviewer commit its record entry as its last act, on the branch it reviewed, in
   a commit that holds that entry and nothing else, with the prefix of the unit's commits. Its rule that it changes
   nothing under review allows that one commit and no other, and its description says so
5. When `record.md` holds uncommitted changes besides the reviewer's entry, the reviewer commits nothing, and says
   in its response that its entry is left uncommitted and why
6. The suite holds a test that the kit's default definition holds the prompt of requirement 1, and a test that the
   request of every step says what requirement 2 gives, each failing on the tree this unit is cut from
7. A check by hand repeats the run of the amendment of 0065, with the new default definition changed only as that
   run's was. It ends with the status `in-progress`, with no entry that says that the human accepted a finding, with
   the entries of both reviews under `## Log` and committed, and with no uncommitted change to `record.md`

## Decisions

* **The kind is bug.** The default definition and the reviewer's role file leave a record that claims a decision no
  human made, a status set too early and an entry nobody commits, by following the kit's own text. The human did not
  ask for a feature
* **The status rule is in the request the command adds, and not in the implementer's role file.** The human chose to
  fix the prompt and not the implementer's role. The request reaches every step of every definition, so a definition
  of a project's own gets the rule too, and the role file stays as it is for the work done by hand, where the human
  decides each finding and the implementer sets `implemented` after it. Rejected: a sentence in the default prompt
  alone, which would not fit the line limit of the file the definition ships in, and would leave other definitions
  without it
* **The acceptance is named as the definition's, in the prompt and in the request.** A definition that accepts the
  findings on the human's behalf is a standing decision the human made by choosing the definition, and the record
  says so rather than naming a decision in the moment. The prompt fits the line limit of `orchestrator.json`, as 0065
  required of the prompt it replaces
* **The reviewer commits its entry itself.** It is the one who wrote it, and the human decided the fix belongs in the
  reviewer's role file. Rejected: the command committing it, which requirement 22 of 0065 rules out for a run, and
  which would leave a review by hand as it is; and the implementer committing it, which leaves the last review of
  every run uncommitted, as observed
* **The commit holds the entry alone.** The reviewer changes nothing under review, and a commit that took more would
  commit what it was judging. The findings file is under the ignored `.reviews/` and is not committed
* **A record changed by another is left uncommitted.** The human took it into the unit from "Beyond the request". A
  reviewer that finds lines of another uncommitted in `record.md` cannot commit its entry without them, and committing
  them would put another's work under the reviewer's commit. Saying so leaves the human to commit both
* **The spec of 0065 stays as it is.** It is frozen, and this unit changes its requirement 4 and adds to its
  requirement 15 by the requirements above, as a bug of an implemented feature does

## Non-goals

* A change to the implementer's role file
* The human's acceptance of findings in a session by hand, which stays as it is
* The timestamps of the entries in the check by hand, which followed an approval written with a later time than the
  real one, and are not taken for a fault of the roles
* The spec reviewer of unit 0067, which commits its own entry on the default branch by its own spec

## Beyond the request

None
