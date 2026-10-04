---
kind: feature
status: draft
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

## Amendments
