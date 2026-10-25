# 0087 A repeat can run until no findings

## Context

The `until` of a repeat in an orchestrator definition takes one value, `"no-blocking-findings"`. With it, the repeat
ends as soon as the outcome of the last step of a round has no blocking finding, and the run goes on with the item
after the repeat. The kit's default definition uses it for its rounds of the implementer and the reviewer.

In the orchestrator run of unit 0084, the review of the first round returned one finding, P1, which did not block. The
repeat ended after that first round of three, and P1 never reached an implementer. The human wants the rounds a
repeat allows to be used to fix non-blocking findings too. The only other choice today is a repeat without `until`,
which runs every round, also after a review that returned no findings at all.

## Requirements

The definition:

1. `until` of a repeat takes `"no-findings"` as well as `"no-blocking-findings"`. A definition whose `until` holds any
   other value is refused before anything runs, as today, and the message names both values as what it must hold
2. `"no-blocking-findings"` behaves exactly as before this unit, in the repeat, in how the run ends, in the exit status
   and in the end report

The repeat with `until: "no-findings"`:

3. The repeat ends when the outcome of the last step of a round holds no findings, blocking or not, and the run goes
   on with the item after the repeat
4. When that outcome still holds a blocking finding after the last round, the repeat ran out and the run stops, with
   the same line in the end report, the same list of the blocking findings still open, and exit status 3, as a
   repeat with `"no-blocking-findings"` that ran out
5. When that outcome holds findings after the last round and none of them is blocking, the run does not stop. It goes
   on with the item after the repeat, and a run that then runs every item to its end exits 0
6. In the case of requirement 5, the end report holds a line of its own that reads
   `Non-blocking findings still open after step <number>:`, with the number of the step whose outcome holds them,
   followed by each of those findings on a line of its own, with its id and its summary, in the form of the list of
   the blocking findings still open. The line and
   its list stand in the end report however the run ends after the repeat, and for each repeat that ended so, in the
   order they ran

The kit's default and the documents:

7. The kit's default definition, `orchestrator.json`, holds `"until": "no-findings"` in its repeat, and is otherwise
   unchanged
8. "The definition" of `README.md` describes both values of `until`, and its prose before the default's JSON says
   that a review with no findings ends the repeat, that a third review with a blocking finding stops the run, and
   that a third review with only non-blocking findings lets the run end with those findings listed. The JSON there
   is the default as it ships
9. "How a run ends" of `README.md` says that the end report lists the non-blocking findings still open of a repeat
   that ended as requirement 5 gives, where in the report they stand, and that such a repeat stops no run

Tests:

10. Unit tests cover requirements 1 to 6: the validation of the definition, for both values and for one it refuses,
    and the logic of the repeat with fake steps, for each of the two values, an outcome with no findings, one with
    only non-blocking findings, and one with a blocking finding, in a round before the last and in the last
11. A test of the command, with the fake harness of the existing tests of `agentrite orchestrate`, runs a definition
    whose repeat with `"no-findings"` ends its last round with only non-blocking findings, and shows that the command
    exits 0 and that its end report holds the line and the findings of requirement 6

## Decisions

* **A repeat that runs out with only non-blocking findings ends the run normally.** A non-blocking finding does not
  hold up `implemented`, so stopping the run would ask the human for something the process does not need of them.
  Stopping as for a blocking finding was rejected for that reason. Listing the findings in the end report keeps them
  visible to the human, who may still take them up
* **The open findings have a line of their own in the end report, and are not put in `afterwards`.** `afterwards`
  holds the items a step gave for after the run, grouped by step. A finding is a different kind of thing, and mixing
  the two would make neither list mean one thing
* **The line names the step.** Items may follow the repeat, so the step whose outcome holds the findings is not always
  the last step of the run, and the end report otherwise takes nothing from an earlier step but `afterwards`. Naming
  the step says where the findings come from, and keeps apart two repeats whose reviews both name a finding `P1`
* **A new value of `until`, and not a new key.** `until` already says when a repeat ends, and this is another answer
  to that question. A separate key, such as `fixNonBlocking`, was rejected: it would say the same thing in a second
  place, and leave combinations of the two keys to define
* **The kit's default changes too.** This repository runs the installed release's definition, so the change reaches
  it through a later release and the unit that depends on that release. A definition copied into this repository
  alone was rejected: it would leave every other project on today's behavior without their choosing it
* **The default implementer's prompt is left as it is.** From round 2 it already has the implementer accept the
  findings it agrees with and propose declining the rest, which covers non-blocking findings as well as blocking ones

## Non-goals

* What makes a finding blocking, and the reviewer role
* Running the orchestrator again on a unit whose status is past `approved`
* `CHANGELOG.md`, which is written when a release is made
* The `stopWhen` key of a step, which keeps its one value, `"blocking-findings"`

## Beyond the request

1. A `--until` option of `agentrite orchestrate` that overrides the `until` of the definition for one run. It would
   cost one more option, its tests and its entry in `README.md`. Without it, a run with another `until` uses
   `--definition` with a copied definition, which already works
