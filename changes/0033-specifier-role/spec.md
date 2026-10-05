# 0033 Specifying apart from planning

## Context

One role, the planner, writes both documents of a unit before anyone approves it: `spec.md`, which says what
should be true, and `plan.md`, which says how the work will be done, with the files it touches and its tasks in
order. The human approves the two together, and the implementer starts from there.

A spec and a plan do not age alike. A spec says what should be true, and a well made one still says it when three
other units have been built in the meantime. A plan names files, functions and an order of work in the tree as it
was on the day it was written, and each unit built before it can make it wrong. So a human who wants to describe
several features ahead cannot: either each one's plan is written early and is stale by the time its turn comes, or
the human waits with the next spec until the one before is built.

The human also plans an orchestrator that takes a unit from its plan through implementation and review, and comes
back when it is done. For that, what the human gives is the spec, and the plan has to be something an agent
writes right before the work, with nobody reading it first.

### What the human asked for

On 2026-10-05: "Act as the @planner and create a new change where we split the planner into two parts: a speccer
and a planner (im a bit unsure about the term speccer...). The idea is that the human can generate several specs
without needing plans or implementations. But if several features exist at the same time and a plan is made for
all of them, by the time the first few are implemented the plan of the rest might no longer be correct. While the
spec should most often stay intact if it is well made. Right?! Eventually the human can then focus on creating
specs, and have the orchestrator create a plan, implement it, review it and come back to the human when everything
is done."

Asked by the planner, the human chose:

* **`specifier`** as the name of the role that writes the spec, over `speccer`, `spec-writer` and `analyst`
* **No human reads the plan before the work, and a new status `planned`** says that a unit has been planned,
  over no new status and over a second approval
* **An approved spec waits on `master`.** To the planner's proposal that the specifier works on a branch that is
  merged once the spec is approved, and that the unit's branch is cut later by whoever starts the planner, the
  human answered: "What about creating it on master, committing it and THEN creating a branch? Best of both
  worlds?"

Of that last answer the planner's draft took the first half and not the second, and cut the branch when planning
starts, by hand. The human: "The problem with the cutting branch when planning starts is that that requires ME to
create the branch, before I launch the agent.sh... That's kinda awkward. Maybe there should be an option to bake
this into agent.sh? Like "git branch -c"?" So a fourth thing is the human's: `./agent.sh` cuts the unit's branch.

Everything else in this spec is the planner's, and has not been read by the human yet.

### What was found while planning

On `master` at `9f03a06`, and read again at `39251d6`, which holds 0032. What 0032 changed is in the last bullets.

* The planner's role file has six sections. "Choosing the kind", "Writing a task record" and "Writing the spec"
  are about what should be true. "Writing the plan" is about how. "Handing over" and the opening are about both
* `process.md` names the planner in three places, and says "Three roles". It says: "Work on a branch, never
  directly on `master`. Commit the change documents first, then the implementation. Work committed straight to
  `master` skips the freeze check entirely."
* The statuses are `draft`, `approved`, `in-progress` and `implemented`. Only `implemented` is read by the change
  check, and nothing else in the kit reads a status
* The implementer's role file says of a spec that the work contradicts: "the unit goes back to planning and to
  the human". The reviewer's says to read the planner's and the implementer's files, as "the instructions the
  work was produced under"
* The roles, their order and the descriptions their wrappers hold are a list in `scripts/agentrite-roles.mjs`.
  `init` and `refresh` write one wrapper per role and harness, and `refresh` writes a wrapper that is missing
* A project's `AGENTS.md` is written by `init` from a template that links the three role files, and is the
  project's own afterwards: `refresh` never touches it. `process.md` links the role files too, and each wrapper
  points at its role file directly
* `./agent.sh <unit>` runs the sandbox on a clone of the unit's branch, and refuses a unit for which no local
  branch exists: "names no local branch, by its name or as a unit's number". It makes no branch. The README says:
  "Planning is done on the host: the planner makes the unit's branch and commits its documents there. The sandbox
  is for the implementer and the reviewer"
* A unit's number is the highest in `changes/` plus one. Two units planned on two branches at the same time take
  the same number: 0032 and this unit would have, had the planner not counted the branch of 0032 by hand
* 0032, "Run a role in a harness", is implemented and on `master`. It was a draft on its own branch when this
  spec was first written, and this unit's branch has been rebased onto it since
* 0032 added `agentrite roles`, `agentrite roles --json` and `agentrite run <role> <harness> <unit>`. All three
  read the roles from the list in `scripts/agentrite-roles.mjs`, so a fourth role appears in each without a
  change to them. Two places hold the roles written out: the test of the usage of `run`, and the README's
  example of the JSON, which shows the planner with its present description
* `agentrite run` takes a unit that has a directory in `changes/`, and refuses without one. 0032 left out, as a
  non-goal, running the planner for a unit that has no directory yet. After this unit the role that starts from
  a request is the specifier
* `agentrite run` refuses a role whose wrapper is not the file `refresh` would leave. This unit changes two
  descriptions and adds a wrapper, so in a project that updates, `run` refuses the planner and the implementer
  until `refresh` is run, and names `refresh` when it does
* The OpenCode wrappers are written with `mode: all` since 0032. Nothing in this unit depends on the mode

**Not established.**

* That an agent writes a usable plan from a spec alone, with no human reading the plan. Every plan so far was
  read and corrected by the human before the work began
* How often a spec that waited is still right when its turn comes. The human expects: most often

## Requirements

The roles:

1. There are four roles, in this order: the specifier, the planner, the implementer and the reviewer. Each has a
   role file in `roles/`, and `process.md` names the four and links each file
2. The specifier's role file holds what the planner's holds today on choosing the kind, writing a task record
   and writing the spec, the bug spec included, with its meaning and its strength. Its input is the request, and
   the unit directory when the unit exists. Its output is `spec.md` for a feature or a bug, and `record.md`. It
   writes no `plan.md`, and it leaves the status at `draft`: approval is the human's
3. The planner's role file holds what it holds today on writing the plan, with its meaning and its strength. Its
   input is the unit directory of a unit whose status is `approved`. Its output is `plan.md` where the unit gets
   one, a log entry in `record.md`, and the status `planned`. It also says:
    * The planner reads `spec.md` and `record.md` in full, and writes the plan against the tree as it is on the
      unit's branch
    * The planner never changes `spec.md`, and the plan decides nothing about what should be true. Where the spec
      is unclear, contradicts itself, leaves open something the plan needs, or no longer fits the tree, the
      planner stops, logs what it found in `record.md`, and the unit goes back to the specifier and to the human
    * For a bug, the planner judges by the work whether the fix needs a plan, as `process.md` sets the
      threshold. Where it needs none, the planner writes no `plan.md`, logs that, and still sets `planned`
4. Nothing the planner's role file says today is lost: every sentence of it is in the specifier's file, in the
   planner's, or in both where it is about both
5. The implementer's role file says that it builds a planned unit: a feature or a bug whose status is `planned`,
   or a task whose status is `approved`. Given a feature or a bug that is `approved` and not yet `planned`, the
   implementer stops and says that the unit has not been planned. Where the work needs something the spec does
   not cover, or contradicts it, the unit goes back to the specifier and to the human
6. The reviewer's role file names the three files the work was produced under: the specifier's, the planner's
   and the implementer's. Nothing else of it changes

The process:

7. The statuses are `draft`, `approved`, `planned`, `in-progress` and `implemented`, in that order, in
   `process.md` and in the record template. `approved` says that the human approved what the specifier wrote.
   `planned` says that the planner is done with the unit: its plan is written, or the planner logged that it
   needs none. A task goes from `approved` to `in-progress`, and is never `planned`
8. `process.md` says when each document is written. The spec is written when the human wants the unit described,
   and any number of units may be `draft` or `approved` at one time. The plan is written when the unit is next
   to be built and not before, and nobody approves it: once the unit is `planned`, the implementer may begin
9. `process.md` says where each is committed:
    * What the specifier writes, and the approval, are committed on `master`: a unit's `spec.md` and `record.md`
      while its status is `draft` or `approved`. Such a commit holds nothing but that unit's own documents
    * Everything after the approval is done on the unit's branch and never on `master`: the plan, the
      implementation, the record's further entries, and a correction of the spec. The branch is cut from the head
      of `master` when the planner starts, or the implementer for a task, and not earlier. Its name is the
      prefix of the unit's commits and its directory name, as `feature-0033-specifier-role`, with `bugfix` for a
      bug and `task` for a task. `process.md` says that a unit run of the sandbox cuts it, and that a role run
      on the host cuts it itself
    * The sentence that work committed straight to `master` skips the freeze check stays, and says that this
      holds for the specifier's commits too
10. What `process.md` says of each kind still holds: a feature has a spec and a plan before it is implemented, a
    bug has a spec and gets a plan only above the threshold, and a task may have only a record
11. The spec template says "specifier" where it says "planner"

The wrappers:

12. `init`, `refresh` and `agentrite-roles` write four wrappers per harness, the specifier's first. `refresh` in
    a project that has three reports the specifier's as written and the planner's and the implementer's as
    refreshed, and keeps a pinned model as before
13. The wrappers' descriptions are these, and the reviewer's is unchanged:
    * specifier: "Writes what a change unit must make true: the spec of a feature or a bug, or the record of a
      task, in changes/. Use before anything is planned or implemented. Dispatch it with the request, and with
      the unit directory when the unit exists already."
    * planner: "Writes the plan of an approved change unit, against the tree the unit will be built on. Use once
      the human has approved the unit's spec and the unit is next to be built, not before. Dispatch it with the
      unit directory."
    * implementer: "Builds a planned change unit and keeps its documents true. Use once the unit is planned, or
      approved where it is a task, which has no plan. Dispatch it with the unit directory."
14. The template of a project's `AGENTS.md` names four roles and links the four files

The documents:

15. The README says, where it describes a unit run of the sandbox, that specifying is done on the host, on
    `master`, that a unit run is for the planner, the implementer and the reviewer, and that the first unit run of a
    unit cuts its branch from `master`, with what the wrapper prints then and what it refuses. Where it lists what
    `roles/` holds, it names the four. Where it shows the JSON of `agentrite roles --json`, the role shown is
    the first the kit has, the specifier, with its description. Where it describes `agentrite run`, it says
    that the command takes a unit that exists, so the specifier of a new unit is started in a session
16. `scripts/check-changes.mjs`, `CHANGELOG.md`, `RELEASING.md`, `AGENTS.md` and this repository's own wrappers
    under `.claude/agents/` and `.opencode/agents/` are unchanged, and the change check passes and refuses what
    it did. Of `container/`, only the wrapper and the script that holds its git work change

The sandbox:

17. `./agent.sh <unit>`, given digits that no local branch holds, looks at `changes/` as `master` holds it. When
    one directory there opens with those digits and a dash, the wrapper cuts a local branch from the head of
    `master` and goes on as it does for a unit whose branch was there. The branch is named as requirement 9
    says, with the prefix taken from the `kind` in the unit's record as `master` holds it
18. The wrapper says on standard error that it cut the branch, with the branch's name, the commit and the unit's
    directory. It cuts the branch before it builds an image or starts a container
19. The wrapper cuts nothing, says why on standard error and exits 2, before it builds or starts anything, when:
    * `master` holds no directory in `changes/` that opens with the digits. It says so, and no longer says that
      a unit's branch is made on the host
    * the unit's record on `master` cannot be read, or names no kind the kit has. It names the record
    * there is no local branch `master`
20. Cutting the branch changes nothing else of the host's repository: the branch that is checked out, the
    working tree and the index are as they were, and no branch that exists is moved. A unit given by a branch's
    name that does not exist is refused as today, and a unit whose branch exists is run as today

The commands of 0032:

21. `agentrite roles` and `agentrite roles --json` list four roles, the specifier first, each with the
    description of requirement 13, and the usage of `agentrite run` names the four
22. `agentrite run specifier <harness> <unit>` starts the harness as the specifier for a unit that has a
    directory, as it does for the other roles. Nothing else of `run`, of `roles` or of their usage changes

## Decisions

* **Two roles where there was one. The human's.** The spec and the plan are written at different times, by
  sessions that need not be the same one, and one of them with nobody reading the result. That is two
  instructions
* **`specifier`. The human's.** It is a word, and it reads beside the other three
* **The role that writes the plan keeps the name `planner`. The human's.** A wrapper named `planner` in a
  project then changes what it does and not its name. Whoever dispatched the planner for a spec gets, after the
  update, a role that says it needs an approved unit
* **Nobody approves the plan. The human's.** It is what lets an agent go from an approved spec to finished work.
  It moves weight onto the spec, where a rule already stands: decide in the spec anything that approving the
  unit is meant to approve. The cost is named under "Not established": so far every plan was read first. The
  reviewer still judges the work against the plan, and the plan against the spec
* **A status `planned`. The human's.** A human, and later a script, sees which approved units have been planned
  without opening them
* **`planned` says that planning is done, plan or no plan. The planner's.** A bug below the threshold has no
  `plan.md`. Were `planned` to mean "has a plan", such a bug would go from `approved` to `in-progress`, and
  whoever starts the implementer would have to judge the threshold first. This way a feature and a bug take one
  path, and the planner, which reads the tree anyway, makes the judgment. It costs a dispatch of the planner for
  a one-line fix, which ends in one log entry
* **A task is never `planned`. The planner's.** It has no spec and no plan, so there is nothing to plan from
* **The planner stops where the spec fails, and does not repair it. The planner's.** It is the rule the
  implementer already has, for the same reason: the approval is of the spec, and a spec changed by whoever came
  next was never approved. It is also where a spec that waited too long is found
* **What the specifier writes is committed on `master`. The human's.** Approved specs are then in one place: the
  human sees what waits, a script can list it, and a unit's number is taken when its spec is committed, so two
  units no longer take one number. The human's form is simpler than the planner's proposal, which had the
  specifier on a branch and a merge at approval. It makes an exception to "never directly on `master`", which is
  fenced: only the unit's own documents, and only up to the approval. The freeze check does not see `master`, so
  a specifier's commit that also changed a frozen unit would pass unseen. Nothing checks the fence
* **The unit's branch is cut when planning starts, not when the spec is committed. The planner's, against the
  second half of the human's answer.** The human proposed to cut the branch right after the commit, so that
  `./agent.sh` finds it. Such a branch is as old as the spec. By the time the unit's turn comes `master` has
  moved, the branch has not, and a planner run on it plans against the old tree, which is the very thing this
  unit is for. Nothing would say so: the run works. The human then asked that
  `./agent.sh` cut the branch, which gives what the early branch was for, a run that needs no step by hand, and
  cuts it from the `master` of the day the run is made
* **`./agent.sh` cuts the branch. The human's.** The planner's draft left it to whoever starts the run, as one
  `git branch` before `./agent.sh`. The human found that awkward, and it is: the wrapper already finds the
  unit's branch from its number, and the one command it would refuse is the one that begins every unit. On the
  host, where no wrapper is run, the role cuts the branch itself
* **No option: a unit with no branch is cut one. The planner's, where the human said "maybe an option".** With
  an option, the first run of a unit is spelled differently from every later one, and a script has to know
  which this is. Without one, `./agent.sh 0033` is the command at every stage. What the wrapper does unasked is
  small and said aloud: one new branch at the head of `master`, which moves nothing and is removed with one
  command. It cuts only where `master` holds the unit, so a mistyped number is still refused
* **The wrapper reads the kind and not the status. The planner's.** It needs the kind for the name. Whether a
  unit may be planned is the planner's to say, which reads the status first and stops at a `draft`. A wrapper
  that refused a status would hold a second copy of the process
* **The branch is cut from the local `master`, and only local branches are seen. The planner's.** It is what the
  wrapper does today, which asks no remote anything. A `master` that is behind its remote gives a branch that
  is behind too, as a `git branch` by hand would
* **The prefixes are those of the commits: `feature`, `bugfix`, `task`.** They are what the branches were named
  with so far, and `process.md` has them already for commit messages
* **After the approval, the spec changes only on the unit's branch.** A unit then has one place where its
  documents change at any time, and `master` never holds a spec that differs from the one being built
* **The descriptions are in this spec.** They are what a harness reads to decide which role to dispatch, so they
  are part of what is approved
* **A project's own `AGENTS.md` is not touched.** It is the project's. A project that updates keeps its three
  links and gets the fourth role through `process.md` and through the wrapper `refresh` writes. That an update
  asks for a `refresh`, and what to do with a unit that was approved together with its plan, are for the release
  notes, which are the release's
* **This repository's own wrappers stay as they are.** They are written by the released kit it depends on, and
  move with the release that holds this unit
* **This unit is made under the process as it is on `master`.** It has its plan now, on its own branch, and is
  approved whole. So is 0032
* **0032 was built first, and this unit was read against it before the work. The human's order.** Both units
  change the list of roles. 0032's first requirement was reworded while it was a draft, so that it names no
  number and no order of roles, and its commands read the list. What this unit owes 0032 is therefore small:
  requirements 21 and 22, a line of one test, and an example in the README. Reading a unit against the tree
  that holds the one before it is the practice this unit makes a rule
* **`agentrite run` still takes a unit that exists. The planner's.** The specifier is the one role whose work
  can begin with no unit, and `run specifier` with no unit is the first thing someone will try. It stays
  refused, with the usage: the human specifies in a session, which is where the questions of specifying are
  asked and answered, and an orchestrator starts at the planner, which always has a unit. It is under "Beyond
  the request"

## Non-goals

* The orchestrator
* A check that a plan was written against the head of `master`, or that it is fresh
* A check of what a commit on `master` holds
* A change to the sandbox beyond the cutting of the branch: the image, the firewall and the clone are as they are
* An option of `./agent.sh` that cuts or names a branch
* Bringing a branch that exists up to date with `master`
* A change to the change check, or to the freeze
* A way back for a status. What happens to the status of a unit that goes back to the specifier is left as it is
  today, which is unsaid
* Running the specifier with `agentrite run` for a unit that has no directory yet
* Rewriting units that exist, their statuses and their role names among them
* A change to what a spec or a plan holds

## Beyond the request

* **A branch with nothing of its own is brought to the head of `master`.** A run that cut the branch and
  committed nothing, such as a planner that stopped at the spec, leaves a branch that stays where it was cut.
  When `master` has moved by the next run, that run plans on the older tree and nothing says so. The wrapper
  could move such a branch before it clones. It costs moving a branch that may be checked out on the host, and
  the care the wrapper already takes when it fast-forwards one. Without it, the branch is removed by hand after
  such a run, or the stale tree is found by the planner where it reads the spec against the tree
* **The plan records the commit it was written against.** A later reader, and a check, could then see how far
  the tree moved between the plan and the work. It costs a field in the record and a rule for when a plan is too
  old. Without it, `git log` on the unit's branch shows where it was cut
* **The change check reads commits on `master`.** It would hold the fence around the specifier's commits. It
  costs a second mode of the check, which today compares a branch with `master`. Without it, a commit on `master`
  that holds more than a unit's own documents is seen by whoever reads the log, as today
* **A status for a unit that went back to the specifier.** Without it, the record's log says where the unit is
* **`agentrite run specifier` for a unit that does not exist yet.** 0032 listed the same for the planner. It
  would cost a second form of the command, with no unit and the request as its prompt, and a specifier that
  makes the unit's directory itself, as it does in a session. Without it, a new unit is specified from a
  session started by hand, and `run specifier` serves a unit that is being continued
