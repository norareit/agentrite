---
kind: feature
status: draft
timestamp: 2026-10-03T11:40:32Z
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

## Amendments
