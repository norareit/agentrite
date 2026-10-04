---
kind: feature
status: in-progress
timestamp: 2026-10-04T15:31:37Z
---

# 0029 The sandbox works on a clone of the unit's branch

## Log

- 2026-10-04T15:31:37Z [human] taking stock of what the sandbox delivers before writing about it, asked that the
  directory mounted at `/work` no longer be the checked-out repository but a newly checked-out copy, made before the
  container starts and cleaned up afterwards. Decided in the same conversation: a run names its unit by ID or branch or
  says `--in-place`, and one of the two is required; two runs never work on one branch; an ID that names several
  branches is asked about, not guessed; planning is done on the host and the sandbox is for implementing and reviewing;
  the host's `.reviews` is mounted into the clone; commits land under `sandbox/<branch>` and the host's branch is
  fast-forwarded when it can be. Asked for the unit to be planned with those decisions
- 2026-10-04T15:31:37Z [Claude Code, anthropic/claude-opus-5-5] took the planner role and wrote `spec.md` and `plan.md`,
  on the branch `feature-0029-sandbox-clone-of-the-branch`, made from `master` at `f3550e0`. The number is 0029 because
  0027 and 0028 are taken by units on branches of their own that `master` does not hold yet. A feature and not a task:
  it needs decisions. What the spec rests on was tried first, in scratch repositories and a scratch Compose project that
  were removed afterwards, and is in the spec under "What was found while planning". Three things in the spec were not
  decided by the human and are the planner's, for the human to approve or change: the host's branch is fast-forwarded
  also when it is not checked out; a run on a new clone is refused while `sandbox/<branch>` holds commits the host's
  branch lacks; and `--workdir` counts as a choice beside `--in-place`. The status stays `draft`
- 2026-10-04T15:45:23Z [Claude Code, anthropic/claude-opus-5-5] the human asked whether 0027 and 0028, both still
  `draft` on branches of their own, interfere. Read both. Neither conflicts in design, and the order 0027, 0028, 0029 is
  safe. The plan here was written against `master` without them, so when they have landed this branch is rebased and the
  plan is revised before it is approved: 0027 changes `container/agent.sh` and the fixture in
  `tests/agent-wrapper.test.mjs` that this plan moves and extends, and its queries of the image join the ones the
  stand-in `docker` answers; 0028 adds `RELEASING.md`, whose check runs the working copy's sandbox with a command and so
  needs `--in-place` once this unit requires a choice, which puts that file in this plan's list
- 2026-10-04T22:41:04Z [Claude Code, anthropic/claude-opus-5-5] as planner, on the human's word, checked the spec and
  the plan against `master`, which by then held 0027, 0028 and 0030, all `implemented`, and revised both. The branch
  was rebased onto `master` at `897a5fc`, without conflict, as the entry above foresaw; the log names no commit of
  this unit, so no id in it went stale. The suite reported 248 tests passing on the rebased tree. The status stays
  `draft`.
  One thing the entry above says no longer holds: 0028 withdrew the bump of the harness versions and its check, so
  `RELEASING.md` runs no sandbox and is not in the plan's files. 0030, which that entry does not know, took the
  pins out of the Dockerfile and gave the fixture a stand-in `npm`.
  In the spec, with no requirement added or removed: the context says what the wrapper does before a run since
  0027 and 0030; requirements 1 and 3 to 6 say that a refusal comes before the build and the registry and that
  the clone is made after the build; two decisions are new, "The sandbox is configured from the host's checkout,
  not from the clone", which is also named under "The boundary", and "Refusals come before the build, and the
  clone after it"; and "A positional unit, and no default" names `./agent.sh --rebuild` among the commands that
  stop working, which 0030's README gives as the way to a newer harness. The two new decisions are the planner's,
  for the human to approve or change.
  In the plan: the stand-in `docker` is extended in `tests/wrapper-fixture.mjs`, which 0027 added, and the task
  that moved `setUp` to a file of its own is removed, because that fixture already is the shared part; the
  fixture's `PATH` is its own `bin`, so the commands the unit run needs are linked into it, and the tests' home
  gets a git identity, both tried with a `PATH` of that kind; the Compose project's name is read from the JSON
  configuration the wrapper already asks for; a fourth function, `refuse_unlanded`, carries requirement 5 so that
  it can run before the build; the wrapper sources `container/unit-clone.sh` only for a unit run; `--in-place`
  goes on every existing run that gets past the first three refusals, not only on those with a command; the
  comments of `container/compose.yml` and five more commands in the README are in the tasks, three of which the
  first plan had missed and two of which 0027 and 0030 added
- 2026-10-04T22:44:03Z [human] approved the spec and the plan as revised at `1eaca00`, the planner's two new decisions among
  them, and asked for the unit to be implemented. Status `approved`
- 2026-10-04T22:44:03Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role, in the main checkout on the unit's
  branch, which holds `master` at `897a5fc`. Status `in-progress`

## Amendments
