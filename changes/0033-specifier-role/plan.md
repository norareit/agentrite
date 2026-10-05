# 0033 Specifying apart from planning

## Approach

The work is mostly text, and one change to the sandbox's wrapper. The planner's role file is divided over two files,
`process.md` and three smaller files follow, and the list of roles in `scripts/agentrite-roles.mjs` gets a fourth
entry and two new descriptions. The commands 0032 added, `roles` and `run`, read that list too. The scripts need no
new logic: `init`, `refresh` and `agentrite-roles` already write one wrapper for each role in the list. The tests that
count the roles or hold a description change first.

**Where each section of today's `roles/planner.md` goes.** Text is moved as it is written. It is reworded only
where it names the role, or names both documents and now holds one.

| Today's section         | Goes to                                                                          |
|-------------------------|----------------------------------------------------------------------------------|
| The opening, two bullets | Both files, each with its own input and output, as requirements 2 and 3 give    |
| "Read process.md first" | Both files, each naming what it adds: specifying, planning                       |
| "Choosing the kind"     | `roles/specifier.md`, unchanged                                                  |
| "Writing a task record" | `roles/specifier.md`, unchanged                                                  |
| "Writing the spec"      | `roles/specifier.md`, unchanged, with the bug spec and the root cause paragraph  |
| "Writing the plan"      | `roles/planner.md`, unchanged, with the paragraph on the threshold for a bug     |
| "Handing over"          | Both files: the specifier leaves `draft`, the planner sets `planned`             |

`roles/planner.md` gets one new section, "Before starting", ahead of "Writing the plan", which holds the three
bullets of requirement 3 and says that the planner works on the unit's branch, which it cuts from the head of
`master` when there is none and it is on the host.

`roles/specifier.md` says in "Handing over" that its documents are committed on `master`, and that it writes no
plan.

**`process.md`.** Four places change, and nothing else:

* The bullet on `spec.md` under "Changes": "the planner left out" becomes "the specifier left out"
* The paragraph on the status: the five statuses, and what `approved` and `planned` say, as requirement 7 gives
  them. The sentences on `implemented`, on the freeze and on amendments stay as they are
* The paragraph that opens "Work on a branch": replaced by what requirements 8 and 9 say, in two paragraphs, one
  on when each document is written and one on where each is committed. The sentence on the freeze check stays,
  with the specifier's commits named
* "Roles": four roles, what each does in one clause, four links, "none of the four roles". The paragraph on
  reading the file at the point the role is taken on names specifying first

"Features", "Bugs" and "Tasks" are read against requirement 10 and are expected to need no change.

**The wrapper.** `resolve_unit_branch` in `container/unit-clone.sh` is where a unit's digits become a branch, and
where the refusal of today is printed. Finding the unit on `master` and cutting its branch is a function of its
own beside it, which `resolve_unit_branch` calls where it would refuse digits that no branch holds. It reads
`master` with `git ls-tree` and `git show`, never the working tree, so that what is checked out does not matter,
and makes the branch with `git branch <name> master`, which checks nothing out. What it prints goes to standard
error, because the function's standard output is the branch's name.

What it prints when it cuts:

```text
agent.sh: cut feature-0033-specifier-role from master at 9f03a06, for changes/0033-specifier-role.
```

And where `master` holds no such unit, in place of today's second line:

```text
agent.sh: '0034' names no local branch, by its name or as a unit's number.
master holds no unit of that number in changes/, so there is no branch to cut.
```

**The README.** Under "Working on a clone", the paragraph that opens "Planning is done on the host" becomes:

```markdown
Specifying is done on the host, on `master`: the specifier commits the unit's spec and record there, and the human
approves them there. The sandbox is for the planner, the implementer and the reviewer, and a unit run gives them a
copy of the unit's branch to work on, not the developer's checkout. The first unit run of a unit finds no branch
and cuts one from `master`, named after the unit's kind and its directory, so that the plan is written against
what `master` holds by then. It says that it did, and it refuses a number for which `master` holds no unit:
```

The two examples of `./agent.sh` that follow it stay. The row of `roles/` under "What is here" names the four.

Under "Running a role", which 0032 added, two things change. The example of the JSON shows the first role, so
its `name` becomes `specifier` and its shortened description the opening words of the specifier's. And after the
sentence that says what a unit may be given as, one sentence is added: the command takes a unit that has a
directory, so the specifier of a unit that does not exist yet is started in a session of the harness, not with
`run`.

## Files

- `roles/specifier.md`: new
- `roles/planner.md`: the plan only, and "Before starting"
- `roles/implementer.md`: what it builds, when it stops, and where a unit goes back to
- `roles/reviewer.md`: the three files it reads
- `process.md`: the four places above
- `templates/changes/record.md`: the five statuses
- `templates/changes/spec.md`: "specifier"
- `templates/project/AGENTS.md`: four roles, four links
- `scripts/agentrite-roles.mjs`: the fourth role, and the descriptions of requirement 13
- `tests/fixtures/claude-agents/`: `specifier.md` new, `planner.md` and `implementer.md` with their descriptions
- `tests/agentrite-roles.test.mjs`, `tests/agentrite-init.test.mjs`, `tests/agentrite-refresh.test.mjs`: the
  lists of roles, the counts of files, and the descriptions they hold
- `container/unit-clone.sh`: the function that finds a unit on `master` and cuts its branch, and the refusals
- `container/agent.sh`: the comment and the usage that say what a unit may be given as
- `tests/agent-unit-run.test.mjs`: the cutting of the branch and what it refuses
- `tests/agentrite-run.test.mjs`: the line of the usage of `run` that names the roles, and a run of the specifier
- `README.md`: the four places above

## Tasks

The wrappers:

- [x] In `tests/fixtures/claude-agents/`, add `specifier.md` and change the descriptions in `planner.md` and
      `implementer.md` to those of requirement 13, wrapped as the command wraps them. In
      `tests/agentrite-roles.test.mjs`, make every list of roles the four in order, every count of files four
      per harness, and the descriptions it holds the new ones. In `tests/agentrite-run.test.mjs`, which 0032
      added, make the line of the usage of `run` that names the roles hold the four, and add that
      `run specifier` starts each fake harness with `--agent specifier` in a project that has the wrapper. The
      tests of `roles` and of `roles --json` there read the kit's list and are expected to need no change. See
      the tests fail (R12, R13, R21, R22)
- [x] In `tests/agentrite-init.test.mjs`, expect four role links in `AGENTS.md`, and the specifier's wrapper
      among what `init` writes. In `tests/agentrite-refresh.test.mjs`, expect nine files where it expects seven,
      and add a test that a project with the three wrappers of an earlier release gets the specifier's reported
      as written, the planner's and the implementer's as refreshed, the reviewer's as up to date, and keeps a
      model pinned in its planner wrapper. See them fail (R12, R14)
- [x] In `scripts/agentrite-roles.mjs`, add the specifier as the first role and write the three descriptions of
      requirement 13. In `templates/project/AGENTS.md`, name four roles and link the four files. The suite
      passes, the tests of `roles`, `roles --json` and `run` among it (R12, R13, R14, R21, R22)

The role files:

- [x] Write `roles/specifier.md` and rewrite `roles/planner.md` by the table above, moving text as it is written
      (R2, R3)
- [x] Account for today's `roles/planner.md`: go through `git show master:roles/planner.md` sentence by sentence
      and find each in one of the two files. Log in `record.md` that it was done, and every sentence that was
      reworded, with its old and its new wording (R4)
- [x] In `roles/implementer.md`: the opening says a planned unit; "Before starting" says which status a feature,
      a bug and a task is started from, and that a feature or a bug that is `approved` and not `planned` stops
      the implementer; "the unit goes back to planning and to the human" becomes "to the specifier and to the
      human". Nothing else changes (R5)
- [x] In `roles/reviewer.md`, the sentence that names `planner.md` and `implementer.md` names `specifier.md`
      first, and "Those two" becomes "Those three". Nothing else changes (R6)

The process:

- [x] Change the four places of `process.md` as the approach gives them, and read "Features", "Bugs" and
      "Tasks" against requirement 10. A sentence there that no longer holds is changed and logged in `record.md`
      (R1, R7, R8, R9, R10)
- [x] In `templates/changes/record.md`, the status line holds the five statuses in order. In
      `templates/changes/spec.md`, "What the planner would add" becomes "What the specifier would add" (R7, R11)

The sandbox:

- [x] In `tests/agent-unit-run.test.mjs`, with a repository whose `master` holds a unit and no branch for it, test
      that the wrapper given the unit's digits:
    - cuts `feature-<directory>` at the head of `master`, prints the line above with that commit, and mounts a
      clone of that branch. The same with `bugfix` for a record of kind `bug` and `task` for one of kind `task`
      (R17, R18)
    - cuts the branch although another branch is checked out and the working tree holds an uncommitted change,
      and leaves the checked out branch, the tree, the index and every other branch as they were (R20)
    - cuts no branch and exits 2, before the fake Docker is asked to build or run, for digits `master` holds no
      unit of, for a record with no `kind` and with one the kit does not have, and in a repository with no
      branch `master`. Each names what requirement 19 says it names (R19)
    - runs a unit whose branch exists as before, and cuts nothing for a branch's name that does not exist (R20)

  See them fail
- [x] Write the function in `container/unit-clone.sh` and call it from `resolve_unit_branch`. Change the comment
      over `resolve_unit_branch`, and the comment and the usage of `container/agent.sh` where they say what a
      unit may be given as, to say what happens to a unit with no branch (R17, R18, R19, R20)

The documents:

- [ ] Change the four places of `README.md` as the approach gives them. Search the README for "planner", "plan"
      and "three roles", and log in `record.md` each further place that needed a change and what it became
      (R15)
- [ ] Check with `git diff master --stat` that no file requirement 16 names has changed, and run the change
      check's own tests (R16)

## Verification

- [ ] `npm test` passes
- [ ] `npm run check-changes` exits 0, run after the last commit
- [ ] `npm pack --dry-run` lists `roles/specifier.md`
- [ ] In a temporary directory, `init claude opencode` from the working copy writes eight wrappers, and each
      points at a role file that the package holds
- [ ] No line of a changed or new file is over 120 characters, and none holds an em dash
- [ ] Every link between `process.md` and the four role files resolves

## Commit Points

- [x] `feature-0033 Plan a specifier role apart from the planner`: the three documents
- [x] `feature-0033 Read the documents against the tree that holds 0032`: the three documents again
- [x] `feature-0033 Write a wrapper for the specifier`: the tests, the fixtures, the list of roles and the
      project template
- [x] `feature-0033 Divide the planner's role file`: the four role files, with the accounting logged
- [x] `feature-0033 Specify on master and plan before the work`: `process.md` and the two change templates
- [x] `feature-0033 Cut a unit's branch from master on its first run`: the wrapper and its tests
- [ ] `feature-0033 Describe specifying and the unit's branch`: the README
