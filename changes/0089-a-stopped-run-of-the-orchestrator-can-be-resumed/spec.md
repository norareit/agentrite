# 0089 A stopped run of the orchestrator can be resumed

## Context

`npx agentrite orchestrate` takes an approved unit through the steps of a definition and stops, with exit status 3,
when a step needs the human: an outcome of `needs-human` or `failed`, questions, proposed declines, a blocking finding
of a step with `stopWhen`, a repeat that ran out, a step past its time limit, a harness that failed, or a final
response without an outcome of the form. Once the human has done what the stop asked, nothing takes the run further.
The command refuses the unit, whose status is then `in-progress` or still `approved`, and the human starts each
remaining step by hand with `agentrite run`, keeping track of the rounds and the sessions the run held.

0065 left picking a stopped run up again for a later unit, and 0069 repeated that. The run of unit 0022 of
aloudrite-intellij on 2026-10-25 is a case: the implementer finished and gave a valid outcome, a later turn of its own
hid it, as 0088 describes, and the run stopped before the reviewer of round 1. The human was left to finish the loop
by hand. 0088 now asks such a step again for its outcome, in its own session, so a missing outcome stops a run only
when that ask again gives none either. Every other stop is as it was.

## Requirements

1. `npx agentrite orchestrate <unit> --resume` resumes the latest run of the unit on the variant of the branch checked
   out in the project root, the run that `npx agentrite runs` lists first among the runs of that unit and variant. A
   branch with no `--` resumes the runs with no variant
2. A resume reruns the step that stopped the run, in the round it stopped in, and goes on from there by the
   definition, as a run goes on after any step. The rerun step continues the session its role and harness held in
   the run, as a later step of the same role and harness in a run does. When the run holds no session for them, the
   step starts a new one. A run that stopped at an ask again of 0088 is resumed at the step of the definition that
   was asked: the rerun is that step, with its prompt as requirement 3 gives it, and not an ask again. The rerun, and
   every step after it, is asked again for a missing outcome as any step of a run is
3. `--prompt <text>` gives the human's words to the rerun step. Its prompt is then the step's own prompt from the
   definition, the human's words, and the request for the outcome, in that order. Without `--prompt` the human's
   words are replaced by a sentence that says the human resumed the run after it stopped at this step. `--prompt` is
   taken only with `--resume`
4. The step that stopped the run is judged again by what its rerun gives: its outcome, its time, its harness's exit.
   The steps after it run with the rounds and the sessions they would have had, had the step given that outcome the
   first time. A repeat whose `until` holds after the rerun ends, and the run goes on with the item after it; a repeat
   that ran out is not given rounds beyond those of the definition
5. A resume runs the definition the stopped run holds in its `definition.json`, and not the one `agentrite.json` names
   at the time of the resume
6. A resume is a run of its own, in a directory of its own under `.orchestrator/<unit-directory>/`, named as any run's
   is by the instant it started and its variant. Its `state.json` holds the key `resumes` with the name of the
   directory of the run it resumes; a run that does not resume another holds `resumes` as `null`. The step files of a
   resume carry numbers that go on from the run it resumes: the rerun step has the number that the step of the
   definition it reruns had in that run, which for a run that stopped at an ask again is the number of the step that
   was asked, and every step after it, an ask again among them, has the next number, as in a run. The directory of
   the stopped run is not changed
7. A resume that stops can itself be resumed, as any stopped run can
8. Beside the refusals of a run, `--resume` refuses, starts nothing, writes nothing and exits 1 when:
   * the unit has no run on the variant, naming the unit and the variant
   * the latest run has not ended, or ended with a status other than 3. It names the run, and its state as
     `npx agentrite runs` gives it
   * the latest run's `state.json` holds no `branch`, or a branch other than the one checked out. It names both
   * the latest run's `state.json` or `definition.json` cannot be read, or is not of the form the orchestrator writes,
     naming the file and what is wrong with it, as `npx agentrite runs` does
   * the unit's status is `implemented` or `cancelled`. It names the status. A resume takes a unit of the status
     `approved` or `in-progress`, and refuses any other as a run refuses a unit that is not `approved`
   * `--definition` is given with it. It says that a resume runs the definition of the run it resumes
9. `--prompt` without `--resume` is refused with the command's usage, and exits 2, as wrong arguments are
10. A resume prints, writes and ends as a run does: its step lines, its followed files with `--follow` and without
    it, its heartbeat, its end report and its exit status. The first line it prints, before the first step, names the
    run it resumes and the step it reruns
11. Tests cover each case of requirements 1 to 10: the run chosen; the rerun of a step that stopped for a missing
    outcome, for questions, for a blocking finding of `stopWhen` and for a repeat that ran out, each going on by the
    rerun's outcome, the missing outcome being one that the ask again of 0088 did not give either, and the rerun
    being of the step that was asked and numbered as it; the session continued; the prompt with and without
    `--prompt`; the definition of the stopped run; the new directory and its `resumes`; a resume resumed; and each
    refusal
12. "agentrite orchestrate", "The orchestrator" and "What .orchestrator holds" of `README.md` describe `--resume`,
    `--prompt`, what a resume reruns, its refusals and `resumes`. "Usage" of the command lists both options.
    `SANDBOX.md` gives the command of a resume in a unit run beside the command of a run

## Decisions

* **A resume reruns the step that stopped the run.** One rule covers every way a run stops. After questions or
  proposed declines, the step hears the human's answer in the session that asked, and gives an outcome without them.
  After a missing outcome, which stops a run only when the ask again of 0088 gave none either, the step runs again in
  its own session with its prompt and the human's words, which can say what kept it from giving one. After a blocking
  finding or a repeat that ran out, the human fixes or decides, and the reviewer reviews again, which is the check
  the human needs. After a time limit or a failed harness, the step tries again where it was. Rejected: a resume that
  goes on with the step after the one that stopped, which would take an outcome the orchestrator never read and could
  not judge; and a choice between the two on every resume, which puts a decision on the human that the rule
  answers
* **The human's words go to the step through `--prompt`.** The step needs the answer to its questions or the decision
  on its declines, and the human gives it in their own words, as `agentrite run --prompt` takes them. Without words
  the step is still told why it runs again
* **A resume is a run of its own that names the run it resumes.** The stopped run keeps its end, its files and its
  directory, so what it did stays readable, and `npx agentrite runs` and every reader of `.orchestrator/` go on
  judging an ended run by its end. Rejected: writing on in the stopped run's directory, which would remove an end a
  reader may have relied on, and give two files the same step number
* **The definition is the stopped run's.** The rounds and the step a resume goes on from are positions in that
  definition. A definition changed in between could move or remove them
* **Only the latest run of the unit and variant, and only one that stopped for the human.** An earlier run was
  followed by a later one that holds the unit's newer state. A run that ran to its end has nothing to resume, and one
  that has not ended may still be running, in another terminal or another container
* **The branch must be the run's.** A step's session and the tree it worked on belong to the branch the run was on
* **The numbers of a resume go on from the stopped run.** A step of the definition keeps its number in a run and in
  its resumes, so the human finds the files of a rerun under the number of the step it reruns, and the numbers stay
  bounded as in a run: a rerun of an ask again takes the number of the step that was asked, so resuming a resume does
  not push the numbers past the digits a run's files take. Rejected: the position of the step in the definition,
  which 0088 no longer gives a step, since an ask again takes a number of its own
* **0089 is built after 0088.** It relies on the ask again: what stops a run for a missing outcome, how a stopped ask
  again is rerun, and how steps are numbered. Built before it, a resume would number its steps by a rule 0088 then
  changes
* **A repeat gets no extra rounds.** The rounds are the definition's, as the human set them. A human who wants more
  resumes the stopped reviewer, which, when its review is clean, ends the repeat

## Non-goals

* Resuming a run that has not ended, as one whose command was ended by a signal and shows as stale
* Resuming a run other than the latest of its unit and variant, or a run from another branch
* Choosing another step to rerun, skipping a step, or giving a step's outcome by hand
* Changing a run's definition on resume, or giving a repeat more rounds
* Setting the unit's status, which stays the steps' and the human's as in a run

## Beyond the request

1. **`resumes` in `npx agentrite runs`.** The text line and `--json` could show which run a resume resumes. It costs a
   column or a key and their tests. Without it the human reads `resumes` in the resume's `state.json`
2. **Resuming a stale run.** A run ended by Ctrl-C, or whose container stopped, shows as stale and has no end, and
   could be resumed at the step it was at. It costs telling a run that died from one that still runs elsewhere, which
   the heartbeat can only guess at by the clock. Without it the human starts the remaining steps by hand, as today
3. **`--resume <run>` for a run that is not the latest.** It costs a way to name a run and a check that the later runs
   did not move the unit on. Without it only the latest run can be resumed, which is the one the human just saw stop
