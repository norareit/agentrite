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

## Amendments
