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
- 2026-10-04T22:44:03Z [human] approved the spec and the plan as revised at `1eaca00`, the planner's two new
  decisions among them, and asked for the unit to be implemented. Status `approved`
- 2026-10-04T22:44:03Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role, in the main checkout on the
  unit's branch, which holds `master` at `897a5fc`. Status `in-progress`
- 2026-10-04T22:50:10Z [Claude Code, anthropic/claude-opus-5-5] as implementer, built the wrapper's part of the plan,
  up to and including the comments of `container/compose.yml`. Each set of tests was written first and seen failing: 4 of
  the 5 for the required choice, all 14 of resolving and starting, and all 15 of landing. `npm test` on the tree of
  this commit reported 282 tests, 282 passing. Nothing was run against Docker yet. Added to the plan as the work
  showed it:
  * `chmod` among the fixture's linked commands, for the agent script that writes hooks
  * The three signals are trapped by a handler that does nothing, not ignored: a child inherits an ignored signal,
    so `docker compose run` would have started with them ignored. The wrapper does not act on them either way,
    which is what the spec's "The wrapper sees the container out" asks. The trap stays through the landing. A test
    has the agent send the three signals to the wrapper, and it failed with the trap taken out
  * The fetch from the clone takes `--no-tags` and `--no-recurse-submodules`. A fetch follows tags that point into
    what it fetches, which would have put a tag the agent made into the host's repository, against requirement
    16. The test of the host's other refs has the agent make a tag and a second branch
  * A test that a run which left nothing removes its clone and says nothing
  Three things the reviewer may want to know:
  * A unit that names no branch gets the three forms after the message of requirement 3, as the decision "A
    positional unit, and no default" says of `./agent.sh claude`. An ID that names several branches gets the list
    only
  * `--in-place` and `--workdir` given together: the later one decides. The spec does not say
  * The clone's tree is compared with the fetched commit, as requirement 12 says. A change the agent staged and
    then took out of the working tree again is in the clone's index only and is not seen. Not tested
- 2026-10-04T22:53:28Z [Claude Code, anthropic/claude-opus-5-5] as implementer, wrote the README's part at `1c962bf` and
  then checked the behavior for real, on the Linux host, with Docker Engine 28.4.0, Compose 2.39.2 and git 2.43.0,
  through `./agent-dev.sh`, on two throwaway branches made from `1c962bf`, `try-0029-a` and `try-0029-b`. The
  commands were run from the agent's shell, which has no terminal, with their input closed. What was seen:
  * `./agent-dev.sh try-0029-a sh -c 'echo x > f && git add f && git commit -m try'` exited 0 and said
    "try-0029-a is now at 1101401". The host's branch was at that commit, `git branch -r` showed no `sandbox/` ref,
    and the clone's directory was gone
  * The same with `echo y > g` and no commit: the wrapper said the clone was kept, where, and named `g`.
    `./agent-dev.sh try-0029-a ls` said it resumed the clone and listed `f` and `g`
  * With a run for `try-0029-b` under way, a commit followed by `sleep 300`, a second
    `./agent-dev.sh try-0029-b ls` exited 2 and named the container `ritenoar-agentrite-agent-dev-try-0029-b`. A
    background run stood in for the plan's "shell left open in one terminal"
  * During that run, `./agent-dev.sh try-0029-a sh -c 'echo side by side'` ran and printed its line, and the
    other container was still running afterwards
  * `touch /work/.reviews/seen-0029` inside a run: the file was in the host's `.reviews`, owned by the developer
  * `docker kill` of that running container, after its commit: the wrapper exited 137 and said "try-0029-b is now
    at cce77fa", and the host's branch was at that commit, "killed"
  * In a new clone of `try-0029-b`, `npm ci` exited 0 and `npm run check-changes` exited 0. The clone, which then
    held a `node_modules`, was removed after the run
  Removed afterwards: both branches, the kept clone of `try-0029-a`, the two files written to `.reviews`, and the
  two empty directories the wrapper had left above the clones. `git status --short` showed only the untracked
  `ritenoar-agent-kit-1.0.3.tgz` that was there before, no container of either branch was left, and
  `~/.local/state/agentrite` was gone.
  Not tried: Docker Desktop for macOS; an interactive shell on a terminal, and an interrupt typed into one, which
  the suite covers only by signals sent to the wrapper; a stopped container left under the name by a crash; and
  two starts for one branch within the same moment.
  One thing seen that the documents do not say: the wrapper removes a clone and leaves the directories above it,
  `agentrite/<Compose project>`, empty

## Amendments
