---
kind: feature
status: implemented
timestamp: 2026-10-03T13:20:00Z
---

# 0017 A sandbox for a project that does not use Playwright

## Log

- 2026-10-03T11:40:32Z [human] asked why the kit's own repository would not need a sandbox, on reading in 0016 that
  it has none, and on hearing that the sandbox cannot be built for a project without Playwright asked for a unit
  that makes Playwright optional
- 2026-10-03T11:40:32Z [Claude Code, anthropic/claude-opus-5-5] took the planner role and wrote `spec.md` and
  `plan.md`. A feature: it reverses a decision of 0010, which refused the sandbox to a project without Playwright
  and named making it optional as out of scope, and it needs decisions on what selects the image and on what the
  wrapper checks. Read `container/Dockerfile`, `container/agent.sh`, `container/compose.yml`, the compose template,
  `init` in `scripts/agentrite.mjs` and the tests of both before planning. Checked the one thing the design rests
  on, with Docker 28.4.0 and buildx 0.27.0 on this host: a Dockerfile whose last stage is built
  `FROM base${PLAYWRIGHT_VERSION:+-with-browsers}` built from `base` with the argument absent and with it empty,
  without resolving the image of the unused stage, and failed on that image when given a version that does not
  exist. Not checked: the same on Docker Desktop for macOS, where the human's other machine builds, and on the
  older Docker Engine 24.0.7 that 0015 records for it. Read the spec of 0015 on its branch: it changes
  `container/compose.yml` and does not touch what this unit changes, apart from one comment in that file. Wrote
  0018 as a draft task that gives this repository its sandbox once a release holds this unit. Written on a branch
  from `master` at 5e079ea, which holds neither 0015 nor 0016
- 2026-10-03T11:47:15Z [human] read the draft and struck the check that the build argument and the lockfile agree, as
  too complicated and premature: a version passed means a browser, none passed means none
- 2026-10-03T11:47:15Z [Claude Code, anthropic/claude-opus-5-5] took the check out, still as planner on an unapproved
  draft. The wrapper now only loses the check 0010 gave it; it reads no lockfile and imports nothing from `scripts/`.
  The two requirements on the check became one, that the wrapper no longer refuses a configuration without the
  argument, and the requirements after it were renumbered, which no review or implementation had cited yet. The
  decision records what the planner first proposed and why the human struck it. The plan lost the fixture changes, the
  cases of the check and the task that tried the refusals for real
- 2026-10-03T12:00:00Z [human] approved the draft by asking the implementer to build it
- 2026-10-03T12:00:00Z [Claude Code, anthropic/claude-sonnet-5-5] took the implementer role, moved the status to
  in-progress and began the plan on branch `feature-0017-sandbox-without-playwright`
- 2026-10-03T12:40:00Z [Claude Code, anthropic/claude-sonnet-5-5] implemented the plan in four commits after the
  approval: `init`, the wrapper, the Dockerfile with the comment in `container/compose.yml`, and the README. Deviations
  and what was verified:
  * The test of the wrapper stopping with Compose's own error was kept. The wrapper still asks Compose for the image
    name, and under `pipefail` a configuration Compose refuses stops there with Compose's error. The fake `docker` in
    the test now fails that query instead of the removed `config --format json` one
  * The last stage's `FROM` is `base${PLAYWRIGHT_VERSION:+-with-browsers}`, as planned. No `ARG` is repeated in
    `base-with-browsers`, which does not use the version in any instruction
  * Without Playwright, on Docker 28.4.0 with the kit packed as 2.1.0 from this branch: `init claude opencode` wrote
    the compose file with no `build:` key, and `./agent.sh --rebuild` built it. The build log names no Playwright image
    (the only match for "playwright" in the log is the `ls` error below). The entrypoint's checks passed. `ls
    /opt/playwright` in the container failed with "No such file or directory". `claude --version` printed 2.1.266 and
    `opencode --version` printed 1.18.30, and `git status` in `/work` exited 0
  * With Playwright, same Docker, `playwright@1.59.1` in the scratch project: the build pulled
    `mcr.microsoft.com/playwright` and `/opt/playwright` held `chromium-1217`, `chromium_headless_shell-1217` and
    `ffmpeg-1011`, with no Firefox or WebKit. A script that launches Chromium through Playwright, sets content and
    closes it printed its text and exited 0. The 506 installed Debian packages with their versions, and the listing of
    `/opt/playwright`, are identical to those of an image built from the Dockerfile on `master` with the same build
    arguments and context
  * The scratch project's lockfile had to leave out the kit: with the kit installed from a local tarball the lockfile
    names a path that `npm ci` in the image cannot resolve. That is the same on `master` and not part of this unit. The
    kit was installed without saving it
  * The images, home volumes and networks of the two scratch projects and of the `master` image were removed
  * Not checked: Docker Desktop for macOS and Docker Engine 24.0.7, as the planner noted; a build with a version
    given to a project without Playwright; starting either harness interactively
  * `npm test` reported 175 passing and 0 failing, and `npm pack --dry-run` lists 22 files, on `1cc7200`

- 2026-10-03T12:18:44Z [OpenCode, openai/gpt-6.1-sol] reviewed 0017 at
  `88a2118740d44ca5cfa8d8ad490e896c2efba001`, a full review against merge base
  `5e079eaab64ba5f2166d5243c8f30f35bc01ebf1`. Resumed after interruption: the complete saved review covers the
  unchanged current commit; confirmed the tracked tree is unchanged and checked P1's source locations. Returned P1.
  Complete findings and verification results are saved in
  `.reviews/0017-sandbox-without-playwright/20261003T121255Z-opencode-openai-gpt-6.1-sol-full.md`. Not independently
  verified: consumer screenshot baselines, Docker Desktop for macOS, arm64, Docker Engine 24.0.7, interactive
  harness startup, the full packed-kit installation and project-root shim workflow, a version supplied to a project
  without Playwright, and the provenance or timing of the implementer's earlier checks and cleanup.

- 2026-10-03T13:05:00Z [Claude Code, anthropic/claude-sonnet-5-5] applied P1, which the reviewer rated nonblocking and
  I accepted as correct: the new wrapper tests all passed `--rebuild`, so the automatic build of a missing image
  without the argument was untested. The fake `docker` in `tests/agent-wrapper.test.mjs` can now fail `image inspect`,
  and two new tests run the wrapper without `--rebuild` for an absent and an empty `PLAYWRIGHT_VERSION`, asserting
  `build` then `run`. The plan already promised this case, so it is unchanged. Checked that the new tests fail when
  the image is made to exist. `npm test` reported 177 passing and 0 failing on the commit that follows this entry's
  parent; the status stays `in-progress` for the human to move

- 2026-10-03T12:29:17Z [OpenCode, openai/gpt-6.1-sol] reviewed `0017-sandbox-without-playwright` at
  `f04af969cc214a314d2152f53247aa46c725c183`, a delta from
  `88a2118740d44ca5cfa8d8ad490e896c2efba001`. Rechecked prior P1; returned no new findings. Complete findings and
  check results are saved in
  `.reviews/0017-sandbox-without-playwright/20261003T122710Z-opencode-openai-gpt-6.1-sol-delta.md`. This delta used fake
  Docker for wrapper invocation checks; real Docker/Compose runtime and packaging checks were not repeated because
  shipped files are unchanged. The negative-control result was independently reproduced, but its original timing
  and provenance could not be verified. Prior screenshot, platform, interactive-harness, installed-kit/shim,
  argument/lockfile-disagreement and historical cleanup/test-sequence limitations remain as in the saved full review,
  with no new evidence to reopen them. No Task/subagent tool was available; performed the review directly
- 2026-10-03T13:20:00Z [human] accepted the review outcome and asked for the unit to be marked implemented
- 2026-10-03T13:20:00Z [Claude Code, anthropic/claude-sonnet-5-5] set the status to implemented: every task in
  `plan.md` is ticked and the review returned no blocking finding

## Amendments
