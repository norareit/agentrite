---
kind: feature
status: in-progress
timestamp: 2026-10-04T15:49:32Z
---

# 0027 The sandbox's harness versions follow the host

## Log

- 2026-10-04T13:19:18Z [human] found in Norareit that the sandbox still had Claude Code 2.1.266 while the host had
  2.1.289, was told that a newer version arrives only through a kit release that bumps the pin, and decided: "I
  think the decision to pin them in the harness is wrong actually. New versions of OpenCode and Claude Code arrive
  almost daily. It makes no sense to have to bump the kit each time this happens. Two options: somehow read the
  version of the host and pass these along. OR at least verify that override and document it as the PREFERRED
  approach. We can still add the bumps in new version everytime (this should probably be added to 'creating the
  release' along with the release notes." The implementer of that session verified the override and proposed both
  options in layers: the project's override, then the host's version, then the kit's pin. The human said yes to
  handing that to a planner, as a starting point. The time of this entry is when the request reached the planner,
  not when each thing was said
- 2026-10-04T13:26:44Z [Claude Code, anthropic/claude-opus-5-5] took the planner role, in a worktree of this
  repository, and wrote `spec.md` and `plan.md` on the branch `feature-0027-harness-versions-follow-the-host`, made
  from `master` at `aa4b8b3`. A feature, because it has decisions. The number was given by the session that
  dispatched the planner: 0026 exists on a branch that is not on `master`, and 0028, the release skill that bumps
  the pins, is being planned at the same time. Planned under the process of release 2.3.0, read from the main
  checkout's `node_modules`, since a worktree has none. Read for it: the specs of 0015, 0021, 0022 and 0023, the
  boundary of `history-0039-sni-filtering-proxy`, the record of 0026, `container/`, both wrapper tests and the
  README. What the spec rests on is under "What was found while planning" there, gathered on Linux with Docker
  Engine 28.4.0 and Compose 2.39.2. In short:
  * The host's commands print `2.1.289 (Claude Code)` in 5 ms and `1.18.34` in about 280 ms, and both versions are
    on the npm registry
  * The override was built twice more with the kit's real Dockerfile, at 2.1.288 with 1.18.33 and at 2.1.289 with
    1.18.34, and both harnesses reported those versions from the image. The first build, whose versions this
    machine had not built, took 10.7 seconds, and the second, which the build cache held, 0.6 seconds
  * In a small Dockerfile of the kit's shape: a label set from a build argument is on the image and is read in 6 ms;
    the install step reruns when a version changes and not otherwise; going back to versions built before is a
    cached build; a project's value for a build argument wins over the base file's variable, for that argument alone
  * Every build resolves `docker.io/docker/dockerfile:1` at the registry, also when every layer is cached, which is
    why the spec does not build at every start
  The images built were `agentrite-0027-plan` and `agentrite-0027-real`. Both are removed, with the two untagged
  images the builds left. No container, volume or network was created, the ids of `ritenoar-agentrite-agent` and
  `ritenoar-agentrite-agent-dev` are what they were, and nothing was logged in to
- 2026-10-04T13:26:44Z [Claude Code, anthropic/claude-opus-5-5] as planner, what the spec decides and what it leaves
  to the human:
  * Settled in the spec, each open to the human's correction on approval: the wrapper rebuilds by itself when the
    image's versions differ from the wanted ones, known from two labels on the image; a rebuild that fails stops
    the start and does not fall back to the old image; a harness that is not on the wrapper's `PATH` is silent and
    gets the pin, and one that prints no version says so; the pins stay as the defaults of the two `ARG` lines in
    the Dockerfile, where 0028 is to bump them; the wrapper reads Compose's merged configuration with `node` again,
    as it did until 0017
  * What the kit promises is in the spec's boundary paragraph: the confinement for any version, and the checks of
    0015, 0022 and 0023 and the switched-off self-update for the pinned versions only
  * Not established: Docker Desktop for macOS; that today's host versions start, log in and answer a prompt in the
    sandbox with the kit's allowlist alone, which requirement 12 looks at as far as starting; that every version a
    host can have is on the npm registry; what a harness does with a home volume a newer version wrote; the
    implementer's override was repeated with a third Compose file, as theirs was, and not by editing a project's
    own file, which requirement 12 does
  * For the human, besides approval: the six items under "Beyond the request", of which the choice from the
    environment and the label for the kit's own version are the two the planner would take; and that after this
    unit this repository's own sandboxes run the host's versions, so nothing runs the pinned combination on this
    machine unless someone holds it, which bears on what 0028 checks when it bumps a pin
  * The README sentence that the versions are pinned in the Dockerfile is replaced, not kept, on the spec's
    authority. 0026 adds text to the same README section on another branch. The two do not contradict each other
  Status left at `draft` for the human's approval
- 2026-10-04T15:49:32Z [human] approved the spec and the plan as written, in the session that dispatched the
  implementer, with the words: "Implement feature 0027 as the @implementer". Nothing was said about the six items
  under "Beyond the request", and no decision the planner settled was corrected, so none of the six is in scope and
  the spec is built as it stands. Status `approved`. The time of this entry is when the words reached the
  implementer, not when they were said
- 2026-10-04T15:49:32Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role, in a worktree of its own
  at `/home/stef/projects/agentrite-0027`, because the main checkout is on the branch of 0029 with work in progress.
  Working under the process of release 2.3.0, read from the main checkout's `node_modules`. Status `in-progress`
- 2026-10-04T15:49:44Z [Claude Code, anthropic/claude-opus-5-5] as implementer, brought the branch up to date by
  merging `master` at `f3550e0` into it, as `ef45e25`, in the way 0019 and 0007 did, and not by a rebase, so that
  the planner's commit `569d56a` keeps the id the record and the dispatching session know it by. The merge brought
  task 0026 and had no conflict: 0026 changed `README.md` and its own record only. The suite reported 192 tests
  passing on the merged tree, before any change of this unit
- 2026-10-04T15:52:24Z [Claude Code, anthropic/claude-opus-5-5] as implementer, added `tests/wrapper-fixture.mjs` to
  the plan's files before writing it. The plan changes "the two fixtures" in the same way, and the `PATH` of the
  fixture's own with its fake `docker`, `claude` and `opencode` is one decision, so it is written once and both
  test files use it. It is not a test file, like `tests/entrypoint-function.mjs`, and `npm test` does not run it.
  With the two fixtures on it, and the wrapper unchanged, the suite reported 192 tests passing, as before. The
  fixtures also stopped handing the wrapper the environment of whoever runs the suite: it gets `HOME` and `PATH`
  and nothing else
- 2026-10-04T15:56:09Z [Claude Code, anthropic/claude-opus-5-5] as implementer, wrote the tests, then the labels,
  the two build arguments and the wrapper.
  * Before the change, `tests/harness-versions.test.mjs` had its first and last test passing and the two between
    failing, as the plan expects. Every test of `tests/agent-wrapper.test.mjs` that reaches Compose, old and new,
    and the three of the shim failed on the unchanged wrapper, 37 in all. That says less than it seems to: from
    that point the fake `docker` no longer answered `config --images` and recorded the two variables, so each of
    them failed for that alone, whatever else it holds
  * After the change the suite reported 221 tests, all passing
  * Five tests the plan did not list were added to it first: the version on the second line only and on standard
    error only, `opencode` named in the line, no input for the host's command, and a Dockerfile without a pin
  * The wrapper's line for a harness that is there and gives no version is the plan's, word for word, also when the
    command printed a version and exited non-zero, where "printed no version" is not exact
  * Not handled, and not in the spec: a project's file that gives one of the two arguments with an empty value or
    with none. The wrapper then wants the empty version, which no label equals, so it would build at every start.
    Not tried
  * The additions were not run under bash 3.2 at this point
- 2026-10-04T15:56:09Z [Claude Code, anthropic/claude-opus-5-5] as implementer: while this was being written the
  dispatching session passed on the human's word, "MOVE IT", to build the unit in the main checkout and not in a
  worktree. The command that would have stashed the open work, removed the worktree and switched the main checkout
  to this branch was refused by the session's permission system, as a whole, and nothing of it ran. The work
  therefore went on in the worktree at `/home/stef/projects/agentrite-0027`, with everything committed on the
  branch, so that the move is `git worktree remove` and `git switch`, and is the human's to make
- 2026-10-04T15:57:41Z [Claude Code, anthropic/claude-opus-5-5] as implementer, made the comments in `container/`
  true and wrote the README.
  * `npm pack --dry-run` lists 24 files, not the 23 the plan names. They are the same 24 paths `master` holds for
    what `files` in `package.json` lists, with `package.json` and `README.md`, compared by name. So the plan's
    count was off by one and the package holds the same files.
    `git diff master -- templates scripts agent agent-dev.sh package.json CHANGELOG.md` is empty
  * The README's examples use versions that are not the kit's pins, and the test that no shipped file but the
    Dockerfile holds a pin now reads `README.md` as well, which was added to the plan first. A README that showed
    the pins would be a second place to bump
  * Searched `container/`, `templates/`, the three shipped scripts, `process.md`, `roles/`, `README.md` and
    `CHANGELOG.md` for `pin` and both pinned numbers. What is left names the kit's pin as the third source, a model
    pinned in a role wrapper, or the release pinned by its URL. `CHANGELOG.md` is not touched: its sections say
    what earlier releases did
  * The suite reported 221 tests, all passing
- 2026-10-04T16:00:50Z [Claude Code, anthropic/claude-opus-5-5] as implementer, checked requirement 12 for real, all
  but its last item, on the tree of `13c770f`. Linux, Docker Engine 28.4.0, Compose 2.39.2, node 24.14.1, bash
  5.2.21. The host's `claude --version` prints `2.1.289 (Claude Code)` and `opencode --version` prints `1.18.34`.
  Each start was `AGENT_PROJECT_NAME=agentrite-0027-check container/agent.sh "$PWD" <command>` from the worktree,
  with no terminal and standard input from `/dev/null`. Seen, in this order:
  * A first start, with no image: it built, the entrypoint verified the firewall, and `claude --version` in the
    sandbox printed `2.1.289 (Claude Code)`. The image's labels were `2.1.289` and `1.18.34`. 10.3 seconds in all,
    with every layer but the last ones in the build cache from the planner's trials
  * A second start: no build step ran, the image id was the same, and `opencode --version` printed `1.18.34`
  * With a `claude` first on the `PATH` that prints `2.1.288 (Claude Code)`: the line
    `agent.sh: the image holds Claude Code 2.1.289 and 2.1.288 is wanted, from the host. Rebuilding.`, a build, and
    `claude --version` in the sandbox printed `2.1.288 (Claude Code)`
  * With one that prints `something else`: the line
    `agent.sh: 'claude --version' printed no version, so the sandbox gets the kit's Claude Code 2.1.266.`, then
    `agent.sh: the image holds Claude Code 2.1.288 and 2.1.266 is wanted, from the kit. Rebuilding.`, a build, and
    the sandbox printed `2.1.266 (Claude Code)`. The OpenCode label stayed `1.18.34` through both
  * With `CLAUDE_CODE_VERSION: 2.1.288` under `services.agent.build.args` in `agent/compose.project.yml`, not
    committed, and the host's real `claude` at 2.1.289: the line
    `agent.sh: the image holds Claude Code 2.1.266 and 2.1.288 is wanted, from the project's compose file.
    Rebuilding.`, a build, and the sandbox printed `2.1.288 (Claude Code)`. A start after it built nothing. The
    edit was reverted with `git checkout`, and `git status --short` was empty afterwards. Only Claude Code was held
    this way, not OpenCode and not both
  * An image built under the check's name by `master`'s own wrapper and Dockerfile, from a detached worktree of
    `master` at `f3550e0`, with `--rebuild`: it held `2.1.266 (Claude Code)` and neither label. The next start of
    this branch's wrapper printed `agent.sh: the image records no Claude Code version and 2.1.289 is wanted, from
    the host. Rebuilding.` and the same for OpenCode with `1.18.34`, built, and the sandbox printed `2.1.289
    (Claude Code)`. So `docker image inspect` prints an empty value and exits 0 for an image with neither label
  Not done: the last item of requirement 12, starting each harness on an empty home and naming the hosts the proxy
  refused. The one command that would have emptied the check's home volume, started both harnesses under a
  pseudo-terminal for 25 seconds each and read `/run/egress-proxy.log` was refused by the session's safety check,
  because it passed a script to a shell that the check could not read. It was not rerun in another form. This
  session cannot drive a terminal interface in any case, so by the spec this check is the human's. To make it:
  `./agent-dev.sh`, or the command above, on an empty home volume, start `claude` and then `opencode`, leave each,
  and run `grep 'not allowlisted' /run/egress-proxy.log` in the same shell. This repository's own `ALLOWLIST`
  adds `models.dev` and `api.openai.com` to the kit's, so the check here says nothing about the kit's allowlist
  alone. The plan's task for requirement 12 stays unticked for this
  Also not done: a build that fails for real, which only the suite's fake shows; a run of the wrapper under bash
  3.2, on which nothing was established beyond avoiding what the plan names; Docker Desktop for macOS
  Afterwards: the image `agentrite-0027-check`, the three untagged images the builds left, the volume
  `agentrite-0027-check_agent-home`, the network `agentrite-0027-check_default` and the worktree of `master` are
  removed. The lists of all images, volumes, networks and containers are what they were before the check, compared
  by id and name. `ritenoar-agentrite-agent` is still `143d91ec452a` and `ritenoar-agentrite-agent-dev` still
  `d11961d8abb8`. The build cache keeps the layers the builds made, which `docker builder prune` removes. Nothing
  was logged in to
- 2026-10-04T16:00:50Z [Claude Code, anthropic/claude-opus-5-5] as implementer, ran the suite on the tree of
  `13c770f`, on the host, which has both harnesses: 221 tests, 221 passing. The same with a `claude` and an
  `opencode` that print `nonsense` first on the `PATH`: 221 tests, 221 passing
- 2026-10-04T16:01:38Z [Claude Code, anthropic/claude-opus-5-5] as implementer, where the unit stands. The change
  check, run on
  the committed branch at `16962bb` as the released 2.3.0 script from the main checkout's `node_modules` with the
  worktree as its argument, since a worktree has no `node_modules`, exited 0 and printed nothing. No line of a file
  this branch changes against `master` is over 120 characters, and none holds an em dash. Nothing changed after
  the suite's run on `13c770f` but this record and ticks in the plan.
  Open, so the status stays `in-progress`: the last item of requirement 12, which is the human's; the review; and
  the move of the work to the main checkout, which the human asked for and the session's permissions refused.
  Three boxes in the plan are unticked for the first of these. For the human to decide besides: nothing in the
  spec had to be decided by the implementer, and none of the six items under "Beyond the request" was built
- 2026-10-04T16:17:31Z [OpenCode, openai/gpt-6.1-sol] as reviewer, full review of 0027 at
  `6aea4cb369e1d9399e02fa3c27b24c970f792fcb`, against the merge base with `master`,
  `f3550e03c5007bca0a01366a4574f9c0846915e1`. Returned S1 and P1. Complete findings saved in
  `.reviews/0027-harness-versions-follow-the-host/2026-10-04T16-15-37Z-opencode-review.md`.
  Ran `npm test`: 221 tests passing; `npm run check-changes`: exit 0; `npm pack --dry-run --json`: 24 entries;
  `git diff --check`: exit 0; and the wrapper's syntax check. Confirmed S1 with real Compose merging and simulated
  image labels and build/run calls. Could not independently verify the historical real build/start trials or
  cleanup, the empty-home interactive harness startup and refused-host list, Bash 3.2, Docker Desktop for macOS,
  or a real failed build. The detailed verification and recorded residual risks are in the findings file
- 2026-10-04T16:34:40Z [human] decided both findings of the review, after reading them, with the words: "Fix both
  review remarks then." So S1, which blocks, and P1, which does not, are accepted. The time of this entry is when
  the words reached the implementer
- 2026-10-04T16:34:40Z [Claude Code, anthropic/claude-opus-5-5] as implementer, resumed for the two findings. The
  entry of 16:01:38Z says the move to the main checkout was refused. Since then it was made: on the human's word,
  "Yes bring it back", the dispatching session removed the worktree and switched `/home/stef/projects/agentrite`
  to this branch at `6aea4cb`, after the implementer's report. The work goes on there, with its `node_modules`

## Amendments
