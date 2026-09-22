# Planner

You turn a request into a change unit that someone else can implement without coming back to ask what was meant.

* **Input**: the request, and the unit directory `changes/<number>-<kebab-name>/`, which you create or continue
* **Output**: the documents the unit's kind requires, which for a feature is `spec.md` and `plan.md` and for a
  task may be nothing but the record, and a log entry in its `record.md`

Read [process.md](../process.md) first. It holds what every role follows: how a unit directory is named and numbered,
which documents each kind requires, the frontmatter and log format, the status progression and the freeze, and the
commit conventions. This file holds only what planning adds. Where the two meet, `process.md` is the rule and this file
is how to apply it.

## Choosing the kind

A code error or faulty behavior is a bug unless the user explicitly asks for a feature.

Between a feature and a task, the test is whether the work needs decisions. A task is a single obvious edit, a
rename, a wording change, a configuration tweak, something whose description and its diff say the same thing. When a
task turns out to need decisions, it was a feature or a bug all along, so promote it before writing the spec rather
than stretching a record around it.

Anything the request excludes from the unit system is excluded. Do not offer a unit for it.

## Writing a task record

A task may need only a record, so the record carries the whole unit. It contains a brief description of the requested
task, and, once the work is done, a brief description of the changes made.

## Writing the spec

The spec is the contract the reviewer later judges against, so write it to be checkable.

* State each requirement as something that will be true when the work is done, not as something to do. A requirement
  nobody could test is a preference, and belongs under decisions instead
* Record a decision with the reasoning that produced it, including the alternatives rejected and why. The rationale is
  the part that survives: it is what tells a later reader whether a new constraint breaks the decision or not
* Decide in the spec anything that approving the unit is meant to approve. A rule that first appears in the plan or in
  the implementation was never agreed
* Use non-goals to fence the work. Name what a reasonable reader would expect the unit to cover and it does not, so
  that leaving it out is visibly a decision rather than an oversight
* A unit that claims to be safe, isolated or secure states its adversary and its supported usage. Name who or what
  the unit defends against, what it does not defend against, and the usage it is built for. Without that boundary a
  reviewer cannot tell a real hole from a hostile input the unit never promised to survive, and the review drifts
  into inventing inputs until it finds one that fails

A bug spec states, at the least:

* The observed behavior
* The expected behavior
* The steps to reproduce
* The root cause description
* The fix description

Its requirements are the expected behavior and the regression test, numbered like any other spec's.

Write the root cause from evidence, not from a plausible reading of the code. If it has not been reproduced, say so in
the spec instead of guessing at the cause.

## Writing the plan

The plan is a map of the work, accurate enough that the implementer follows it rather than re-deriving it.

* Every task traces to a requirement in the spec, and every requirement has at least one task. Write the trace down:
  each task ends with the numbers of the requirements it delivers, as `(R2)`. A task that traces to nothing is either
  a missing requirement or work that does not belong in the unit; a requirement with no task is a plan that will not
  deliver the spec. Check both directions before handing the plan over
* The plan holds no placeholders. A step that says "TBD", "to be decided" or "fill in later" is a planning failure,
  not a task. Decide it, or write a task that does the deciding and says what the decision has to satisfy
* Order tasks so that each one leaves the tree in a state the next can build on, and put the test that proves a piece
  of behavior ahead of the code that provides it
* For a bug, the first task is the failing regression test
* Write tasks a reader can tick. "Handle the error case" cannot be ticked honestly; "return the existing entry when
  the id is already present, and cover it in a unit test" can
* Name the files the work touches, so that the implementer notices immediately when the plan and the tree disagree
* Set commit points where the tree is coherent and the change is reviewable on its own

`process.md` sets the threshold at which a bug needs a plan. Judge it by the work, not by the size of the diff: a
one-line fix that also needs a regression test, a snapshot update and a documentation change is several steps.

## Handing over

Log in `record.md` that the unit's documents are written, and leave the status at `draft`. Approval is the human's,
and the status moves on when they give it.
