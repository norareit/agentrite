---
kind: feature
status: in-progress
timestamp: 2026-10-04T20:13:06Z
---

# 0030 The kit names no harness version

## Log

- 2026-10-04T20:13:06Z [human] having been shown what the bump of the kit's pinned harness versions and its check had
  become in unit 0028, and that since 0027 a pin is only what a host without the harness gets, said: "Regarding the pins
  we really need to take a few steps back, because this feels like something is getting very complicated while it should
  be easy." and then: "Mmm I have a hard time finding a good solution. Because no check doesn't feel right either. Maybe
  it just doesn't make sense anymore to have a kit version? Maybe we only need : host version OR pinned version in
  compose.project.yml". The main session laid out three answers to what a sandbox gets when the project holds no version
  and the host does not have that harness: the latest from npm at build time, the Dockerfile's default becoming
  `latest`; that harness left out of the image; or a stop with a message. It recommended the first, and said this takes
  a new unit because 0027 is frozen. The human: "Yes, Go ahead". The human's are that the kit has no version of its own,
  and the go-ahead. The latest as the fallback is the main session's recommendation, which the go-ahead covers. The time
  of this entry is when the words reached the planner, through the dispatching session
- 2026-10-04T20:13:06Z [Claude Code, anthropic/claude-opus-5-5] took the planner role, in the main checkout, and wrote
  `spec.md` and `plan.md` on the branch `feature-0030-no-kit-harness-versions`, made from `master` at `94099e9`. A
  feature, because it has decisions. The number was given by the dispatching session: 0028 and 0029 are on branches that
  are not on `master`. Planned under the process of release 2.3.0, read from `node_modules`. Read: `container/agent.sh`,
  `container/Dockerfile`, `container/compose.yml`, the README's "The harness versions" and its other mentions of a pin,
  `tests/harness-versions.test.mjs`, `tests/agent-wrapper.test.mjs`, `tests/wrapper-fixture.mjs`, and 0027's spec and
  record.
  Tried, on Linux with Docker Engine 28.4.0, Compose 2.39.2, node 24.14.1, npm 11.11.0, Claude Code 2.1.289 and
  OpenCode 1.18.34 on the host, in a scratch project holding a copy of `container/` with both defaults in the
  Dockerfile set to `latest`, under the Compose project `ritenoar-agentrite-agent-trial0030`, with a `claude`
  and an `opencode` first on the `PATH` that exit 1:
  * A first start built, installed both packages at `latest`, and the sandbox printed `2.1.289 (Claude Code)`
    and `1.18.34`. 21 seconds in all. The wrapper printed today's line for a command with no version, ending "the
    kit's Claude Code latest."
  * Both labels of the image say `latest`
  * A second start built nothing
  * A start with `--rebuild` ran the build, every step of it `CACHED`, the install among them, and the image's
    id was the same before and after, `c03813dd8450`
  * `npm view @anthropic-ai/claude-code version` took 0.26 seconds and `npm view opencode-ai version` 0.34
  * `npm view opencode-ai version --registry http://127.0.0.1:9/` exited 1 after 70 seconds, and with
    `--fetch-retries=0` after 0.11 seconds
  * `npm view opencode-ai version --registry http://10.255.255.1/ --fetch-retries=0 --fetch-timeout=5000` failed
    with `ETIMEDOUT` after 2 minutes and 15 seconds
  * `npm view 'opencode-ai@' version` printed the latest, as with `@latest`
  Afterwards the trial's volume, network and image were removed. The lists of all images, volumes, networks and
  containers, taken before and after, are the same, compared with `diff`. `ritenoar-agentrite-agent` is still
  `143d91ec452a` and `ritenoar-agentrite-agent-dev` still `d11961d8abb8`. Nothing was logged in to, and no
  tracked file was changed for the trial.
  What the trial changed in the proposal: `latest` is not handed to the build. The wrapper asks the registry on
  the host and hands the build an exact version, so that the label, the comparison and Docker's cache work as
  they do for the host's version.
  Decided by the planner, each with its reason in the spec: the exact version in place of `latest`; that the
  registry is asked only at a build, so a sandbox keeps its version until `--rebuild`; no default in the
  Dockerfile; one line when the latest is taken; a stop when it cannot be found; that the README names no version
  as checked and promises the four version-dependent things for none; that an image of an earlier release is left
  as it is; that the unit does not supersede 0027 and adds an amendment to its record; and that 0028 should reach
  `master` first.
  Not established: anything about the wrapper as the unit describes it, which the plan checks for real; that an
  exact version from the registry installs afresh, which is taken from 0027's record; macOS; and the wrapper
  without `npm` on the `PATH`.
  For the human to decide, besides approval: which of the three answers it is, the latest, the harness left out,
  or a stop, with the costs in the spec; whether a sandbox on a host without a harness keeps its version until
  `--rebuild` or follows the registry at every start; whether the README should name the versions the kit was
  last seen working with; the wrapper's three lines in the plan; the order of 0028 and this unit; and what under
  "Beyond the request" is taken. Status left at `draft` for the human's approval
- 2026-10-04T21:19:19Z [human] approved the spec and the plan as written at `ec0aa5b`, in the main session, in these
  words: "Okay. Go ahead and implement 0030 as the @implementer". The time of this entry is when the words reached
  the implementer, through the dispatching session. Status `draft` to `approved`.
  The dispatching session reports that the human was shown, twice, what the planner left for them to decide, in
  this form: the fallback when neither the project nor the host gives a version (the latest from the npm registry,
  as planned, or the harness left out, or a stop with a message); when the registry is asked (only when a build is
  due, as planned, or at every start); the order of 0028 and this unit; and a time limit on the registry call,
  which is under "Beyond the request" and which the main session said it would take. The human answered none of
  them one by one and gave the approval above. So the unit is built as the spec has it, with the planned answers,
  and nothing under "Beyond the request" is in scope. The time limit on the question to the registry was
  recommended by the main session and not taken up by the human: it is not built, and it is theirs to add later.
  The order is settled by events: 0028 is implemented and on `master`
- 2026-10-04T21:19:19Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role, in the main checkout and not
  in a worktree, as the human wants it. Status `approved` to `in-progress`. Read the process of release 2.3.0 from
  `node_modules`, `roles/implementer.md`, the README, and this unit's three documents.
  The branch was brought up to date before any work, by a merge as the plan says: `master` at `32004d6`, which
  holds 0028, merged into the branch at `ec0aa5b`, as `8abd2a0`, with no conflict. It was the first of the plan's
  two cases: `tests/harness-versions.test.mjs` no longer reads `README.md`, and `tests/wrapper-fixture.mjs` has the
  fake host's versions `99.1.0` and `98.2.0`. `npm test` on `8abd2a0`: 230 tests, 230 passing, exit 0.
  The plan against what `master` now holds: its steps stand. `RELEASING.md`, the release skill and `AGENTS.md`
  name no harness version and no pin, checked with `grep`, and are not touched by this unit

## Amendments
