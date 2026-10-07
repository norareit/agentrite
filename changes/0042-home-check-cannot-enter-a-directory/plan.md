# 0042 The home check cannot enter a directory only the agent may enter

## Approach

Written against `bugfix-0042-home-check-cannot-enter-a-directory`, cut from `master` at `a41ca27`, on which
`npm test` passes with 363 tests.

`check_log_directory_owners` in `container/entrypoint.sh` reads the owner of `.claude`, `.local` and `.local/share`
with `stat -c %u`, as the container's root. It is made to read each through
`setpriv --reuid=agent --regid=agent --init-groups --`, the call the entrypoint ends in when it becomes the agent,
so that the directory is entered as the agent enters it. A read that fails is caught at the assignment and becomes a
refusal of the entrypoint's own, which holds what the failed command said and ends in the recovery. The comparison
of the owner with the agent's uid, and the refusal it gives, are left to the letter.

The suite cannot be root without capabilities, and has no account named `agent`. So it puts a stand-in for `setpriv`
first on the `PATH` of the guard's script: it records its arguments and runs what follows `--`. A test then shows
that each of the three directories was read through it, with the user switch asked for, which fails on the tree as
it is. A directory that cannot be examined is made for real: the suite's user closes `.local` to itself, and the
read of `.local/share` fails as it would for anyone.

The fault itself and its absence are shown on a real Docker, through the wrapper, under a Compose project of its
own, `ritenoar-agentrite-0042-trial`, and with `XDG_DATA_HOME` set to a directory of the scratch directory, so that
no home volume and no log directory of the human's is touched. The fault is shown first, on the tree before the fix.
No harness is started and nobody logs in.

## Files

- `container/entrypoint.sh`: the read as the agent, the refusal of a directory that cannot be examined, the comment
- `tests/entrypoint-home-owner.test.mjs`: the stand-in for `setpriv`, and the new tests
- `README.md`: one sentence under "The harness logs", on who examines the directories
- `changes/0042-home-check-cannot-enter-a-directory/record.md`: the log, the runs on a real Docker among it

`CHANGELOG.md` is not touched: a release writes it. The base compose file is not touched (R4).

## Tasks

- [x] Show the fault on a real Docker, on the tree as it is. With `trial() { XDG_DATA_HOME=<scratch>
  AGENT_PROJECT_NAME=ritenoar-agentrite-0042-trial container/agent.sh "$PWD" --rebuild "$@"; }`: `trial --in-place
  true` makes the home volume, `trial --in-place chmod 700 /home/agent/.local` closes the directory as the agent,
  and a third start must end in the line of `stat` that the spec gives. Log what each printed (R6)
- [x] In `tests/entrypoint-home-owner.test.mjs`, give `runGuard` a stand-in for `setpriv` on the `PATH` of the
  guard's script, which appends its arguments to a file and runs what follows `--`, and return what it recorded.
  Add, failing: `check_log_directory_owners` reads each of `.claude`, `.local` and `.local/share` through
  `setpriv --reuid=agent --regid=agent --init-groups -- stat -c %u <directory>`, in that order, and `check_home_owner`
  is left reading the top without it (R5)
- [x] Add, failing: with `.local` closed to its owner, the guard exits 1, its message opens with `[entrypoint]
  FATAL: <home>/.local/share could not be examined as the agent`, holds what `stat` said, ends in the recovery, and
  its last line is the recovery's `docker volume rm` line and not a tool's error (R3, R5)
- [x] In `container/entrypoint.sh`, read the owner through `setpriv` as above, and at a read that fails `die` with
  that message. Leave the comparison and its refusal as they are. Both new tests pass, and the two tests of the
  check that were there pass with their assertions unchanged (R1, R2, R3, R4)
- [x] Correct the comment above `check_log_directory_owners`: who reads the directories and why not root, and what
  a directory that cannot be read gets. Add to the README's "The harness logs", where it describes the refusal, that
  the directories are examined as the agent, so that one only the agent may enter passes. The refusal quoted there
  is unchanged, which the task checks against the entrypoint (R7)
- [x] Show requirement 1 on a real Docker, on the volume of the first task: the same third start now runs its
  command, `bash -c 'ls -ldn ~/.claude ~/.local ~/.local/share; echo started'`, which prints `.local` as
  `drwx------` and `started`, and exits 0 (R1, R6)
- [x] Show requirement 2 on a real Docker. Remove `.claude` from the trial's volume, in a container of the image
  with the entrypoint replaced and the user the developer's, and no log mounts. A start through `trial` then has
  Docker make `.claude` as root, and must be refused before the firewall is installed, with the refusal of 4.1.0
  naming `/home/agent/.claude`, uid 0 and the agent's uid. Log it whole (R2, R6)
- [x] Log the runs in `record.md`, and remove the trial: its volume, network, image and scratch directory

## Verification

- [x] `npm test` passes on the final tree, on the host
- [x] `npm run check-changes` passes on the committed branch
- [x] Every line of the changed files is within 120 characters, and no changed text holds an em dash
- [x] `git diff master -- container/compose.yml` is empty (R4)

## Commit Points

- [x] `bugfix-0042 Plan the home check as the agent`: this plan and the record's entries, by the planner
- [x] `bugfix-0042 Examine the directories above the log mounts as the agent`: the tests, the entrypoint and the
  README
- [x] `bugfix-0042 Record the runs on a real Docker`: the record
