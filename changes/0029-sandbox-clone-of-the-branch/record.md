---
kind: feature
status: implemented
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
  up to and including the comments of `container/compose.yml`. Each set of tests was written first and seen
  failing: 4 of the 5 for the required choice, all 14 of resolving and starting, and all 15 of landing. `npm test`
  on the tree of this commit reported 282 tests, 282 passing. Nothing was run against Docker yet. Added to the
  plan as the work showed it:
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
- 2026-10-04T22:53:42Z [Claude Code, anthropic/claude-opus-5-5] as implementer, ran the plan's verification on
  `cf4bcfd`: `npm test` reported 282 tests, 282 passing; `npm run check-changes` exited 0; no file changed since
  `master` holds an em dash, and none a line over 120 characters but this record, whose long lines the commits after it
  rewrap; the search for `git -C "$clone"` and `cd "$clone"` in `container/agent.sh` and `container/unit-clone.sh` found
  nothing; and `git status --short` showed only the untracked tarball. The commits after it change `plan.md` and
  `record.md` only. Every task is ticked. The status stays `in-progress`: the unit has not been reviewed
- 2026-10-04T23:06:17Z [OpenCode, openai/gpt-6.1-sol] reviewed unit 0029 at
  `4da86cd5dade4561c3132a8744e0af776733ff35`, a full review against merge base
  `897a5fc9f81a027ad66162904e8493764c435fd2`. Returned labels `S1`, `S2`, `P1` and `C1`. Complete findings saved in
  `.reviews/0029-sandbox-clone-of-the-branch/2026-10-04T230322Z-opencode-gpt-6.1-sol-full-4da86cd.md`.
  Could not independently verify the historical real-Docker runs or their cleanup, or the historical red-test runs
  and test-writing order. Did not replay real-Docker behavior, Docker Desktop for macOS, interactive terminal
  interruption, stopped-container recovery or same-moment starts. The saved review names the checks run and their
  results, including the three targeted reproductions with real git and a Docker stand-in
- 2026-10-04T23:10:55Z [Claude Code, anthropic/claude-opus-5-5] as implementer, on the human's request to see to the
  review's findings, read the review of `4da86cd` and accepted all four. None is declined, so none waits for a decision.
  The work was added to the plan first. The four tests were written before the corrections and seen failing, 4 of
  4, with the 282 others passing; after the corrections `npm test` reported 286 tests, 286 passing, on the tree of
  this commit. Nothing of it was run against Docker. The outcomes:
  * S1, accepted and corrected. The merge of a checked-out branch takes `--no-overwrite-ignore`, so a commit that
    adds a file where the host has an ignored one is not fast-forwarded: the host's file keeps its content, and
    the commits wait at `sandbox/<branch>` with the merge named, as for a branch that moved. The test is the
    reviewer's case, with an ignored `.env`. A branch that is not checked out has no working tree to overwrite
  * S2, accepted and corrected. The wrapper tells a `docker ps` that failed from one that found nothing. Before
    the run it then starts nothing and exits 2. After the run it fetches and removes nothing, says that the
    container may still be running and where the clone is, and exits non-zero. Two tests, on a stand-in whose `ps`
    fails; no real daemon was made to fail
  * C1, accepted and corrected. A clone that holds nothing the host lacks is moved aside before it is removed, to
    `.discarded-<branch>` beside it, a name no branch can have, and a removal that fails is said, with where the
    remains are, and makes the wrapper exit non-zero. The next run then finds no directory to take for a clone.
    The test is the reviewer's case, a directory of mode 555 under an ignored `node_modules`, and has a second run
    make a new clone. Not corrected, and for the human to weigh: the wrapper does not change the permissions of
    such a directory to get it removed, so a tool that leaves read-only directories among ignored files makes
    every removal fail until the remains are removed by hand
  * P1, accepted and corrected in the plan: the README task now says that "Working on a clone" follows "Starting
    it" and comes before "Another working directory", which is where it was put and what the first plan meant by
    "after it", before the revision put two bullets in between
  The README's "Working on a clone" gained the three cases. The plan's commit points for the findings were one for
  each, and are one for all: the corrections share the fixture and the two shell files. While seeing the tests
  fail, the failing test of C1 left a temporary directory it could not remove, `/tmp/agent-unit-run-jsQ1pm`, which
  was removed by hand. The status stays `in-progress`
- 2026-10-04T23:13:06Z [human] on what the correction of C1 left open, that the wrapper does not make a read-only
  directory writable to get a clone removed: "C1 feels like something to fix when we run into it". Decided: it
  stays as it is. A removal that fails is reported and its remains are removed by hand
- 2026-10-04T23:19:55Z [OpenCode, openai/gpt-6.1-sol] reviewed unit 0029 at
  `3bed96cde99ce05b4f816134a49b3a3b8db9afec`, a delta review from
  `4da86cd5dade4561c3132a8744e0af776733ff35`. Examined the previous labels `S1`, `S2`, `C1` and `P1` and returned
  no new finding labels. Complete findings saved in
  `.reviews/0029-sandbox-clone-of-the-branch/2026-10-04T231754Z-opencode-gpt-6.1-sol-delta-3bed96c.md`.
  Did not run the delta on live Docker or induce a real daemon failure. Could not independently verify the
  historical real-Docker runs and cleanup, historical red-test runs or test-writing order. Evidence is the
  current suite, focused regressions and independent checks with real git and the Docker stand-in, whose
  results and verification limits are in the saved review. Unchanged behavior was not re-reviewed
- 2026-10-04T23:22:52Z [Claude Code, anthropic/claude-opus-5-5] as implementer, closed the unit. The delta review of
  `3bed96c` found S1, S2, C1 and P1 corrected and returned no new finding, and the human had decided what C1 left
  open, so no blocking finding is undecided. Every task in `plan.md` is ticked. On `e89301c`, `npm test` reported 286
  tests, 286 passing, and `npm run check-changes` exited 0; this commit changes this record only. Still not tried, as
  the entries above say: Docker Desktop for macOS, an interactive terminal and an interrupt typed into one, a stopped
  container left by a crash, two starts in the same moment, and the corrections of S1, S2 and C1 on a real Docker. The
  branch is not merged into `master` and not pushed. Status `implemented`

## Amendments
