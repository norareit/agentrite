---
kind: feature
status: in-progress
timestamp: 2026-11-06T10:15:15Z
---

# 0097 The sandbox takes its harnesses from their modules

## Log

- 2026-11-06T10:15:15Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `5315af1`, on the
  human's request to model the sandbox's knowledge of each harness as well as 0091 modelled the code's, before Codex
  is added as a third harness. Numbered 0097: the highest number in `changes/`, on every branch, is 0096. Read
  `container/Dockerfile`, `container/compose.yml`, `container/sandbox.sh`, `container/entrypoint.sh`,
  `container/bell/`, `container/claude-managed-settings.json`, `templates/project/sandbox/compose.project.yml`,
  `scripts/agentrite-harness.mjs` and "Adding a harness" of `CONTRIBUTING.md`. Wrote `spec.md`. The status is `draft`
- 2026-11-06T10:37:02Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master`, on the human's decisions
  to take `BTR1`, which became requirement 18: the image, the allowlist and a run hold only the harnesses the
  project's `harnesses` setting names, and a change of the setting makes a build due. Requirements 4, 5, 7, 9, 10,
  13, 16 and 17 now speak of the project's harnesses, a decision says why, the threat model covers the setting, and
  the non-goal that excluded it is narrowed. `BTR2` is declined, which the spec now marks. The status is `draft`
- 2026-11-06T10:49:22Z [human] approved the spec. The status is `approved`
- 2026-11-06T10:53:43Z [Codex, openai/gpt-6] as the spec-reviewer, on the human's explicit exception to the
  draft-only restriction, fully reviewed `spec.md` and `record.md` at `d4e2314892c6c979a0f71e13066e550aa555dafc`.
  Returned F1 and F2, saved in
  `.reviews/0097-the-sandbox-takes-its-harnesses-from-their-modules/spec-review-2026-11-06T105343Z.md`.
  Live harness behavior and Docker execution were not checked. The status stays `approved`.
- 2026-11-06T10:57:51Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` and not on the unit's
  branch, on the human's decision to correct the approved spec as if it were not yet approved, settled the findings of
  `.reviews/0097-the-sandbox-takes-its-harnesses-from-their-modules/spec-review-2026-11-06T105343Z.md`. F1 is
  accepted: the non-goal on the egress proxy now allows the hosts of the project's harnesses alone, of requirements 7
  and 18, besides the probe, which is the only reading under which requirement 18 can hold. F2 is accepted with the
  human's choice: a start judges `bell` and `harnesses` alone, which requirement 18 and a new decision now say. The
  human approved both changes, so the status stays `approved`
- 2026-11-06T11:08:42Z [Claude Code, anthropic/claude-opus-5-5] as the planner, cut the unit's branch from `master` at
  `1486bf6` and wrote `plan.md` against it. Two readings of requirement 16 that the plan builds: the image gains the
  one file `/usr/local/lib/agentrite/log-directories`, since a variable of the compose file would be in the
  command's environment; and Claude Code's hooks are no longer also found at
  `/etc/agentrite/bell/claude-managed-settings.json`, which nothing reads, since requirement 3 moves them out of the
  directory mounted there. The status stays `approved`
- 2026-11-06T11:34:58Z [Claude Code, anthropic/claude-opus-5-5] as the planner, on the human's acceptance of both
  readings of requirement 16 in the entry above, which the plan keeps as written. The status stays `approved`
- 2026-11-06T11:35:52Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, began the work on the unit's
  branch at `e532a0d`. The status is `in-progress`
- 2026-11-06T11:52:10Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, split the first task of
  `plan.md`: `parseBell`, `readBell` and the `bell` form of `scripts/agentrite-settings.mjs` are removed in the commit
  that changes the wrapper rather than in the first, since the wrapper runs the `bell` form until then and the suite,
  green on `456e229` with 1447 tests passed, fails 249 tests when the form is removed first. The status stays
  `in-progress`
- 2026-11-06T12:31:40Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, split the task of the cleanup
  period's reader in `plan.md` the same way and for the same reason: `readCleanupPeriod` and the command line of
  `scripts/agentrite-cleanup-period.mjs` go in the commit that changes the wrapper. The helper refuses an empty field
  besides one that holds a tab or a line break, since the wrapper's `read` with a tab for its separator joins two
  tabs into one and would take the next field for the empty one. `npm test` passes on the tree of the commit that
  gives each module what the sandbox knows of it, with 1501 tests. The status stays `in-progress`
- 2026-11-06T12:41:21Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, took the harnesses of the sandbox
  from their modules in `48d3b43` and described it in `07eb9a2`. Three readings the plan left open, each the only one
  found to work: the wrapper reads the kit's `KIT_ALLOWLIST` block from `container/compose.yml` to tell a project's
  file that sets that list, since a value that merely holds the kit's variable would otherwise pass; the inline
  script of `read_merged_configuration` ends the versions with a marker line, since the shell's command substitution
  drops a last empty line and would leave a project's empty version unread; and the setups of the tests that
  install the wrapper copy `container/compose.yml` beside it, which every installed kit holds. The repository's own
  `sandbox/compose.project.yml` gets the comment of the template, whose list of the kit's hosts was no longer true.
  While the sandbox's tests were first run, the fake `docker` of `containerHost` in `tests/wrapper-fixture.mjs`
  looped without end on a `compose build`, which no test had asked it before, and left processes at full CPU on the
  developer's host for about an hour until they were killed. The fake now ends a Compose call that is no run, its
  loops stop at the end of the arguments, and its projects' images record their one harness. The status stays
  `in-progress`
- 2026-11-06T12:41:21Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, verified on `07eb9a2`: `node
  --test --test-timeout=60000 tests/*.test.mjs`, the files of `npm test`, passed 1548 tests with none failed or
  cancelled, Docker reachable so the tests that build images ran; `npm run check-changes` passed; `./sandbox-dev.sh
  --in-place` built the image and started, the entrypoint's self-check passed with `registry.npmjs.org` as its
  probe, `docker image inspect` showed `com.ritenoar.agentrite.harnesses` as `claude@2.1.319 opencode@1.19.3`, and in
  the container `claude --version` and `opencode --version` printed those versions, `env` held
  `DISABLE_AUTOUPDATER=1`, `DISABLE_UPDATES=1` and `OPENCODE_CONFIG=/etc/opencode/opencode.json`, and
  `/usr/local/lib/agentrite/log-directories` listed `.claude/projects` and `.local/share/opencode`; the `git grep` of
  the plan showed only comments that name a harness as an example and the recovery message. Not checked: a project
  of one harness and a change of `harnesses` against a real image, a host without npm or with bash 3.2, and
  shellcheck, which the host lacks. The unit is handed over for review. The status stays `in-progress`
- 2026-11-06T12:47:00Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, fully reviewed unit 0097 at
  `68362af35476a3a22f5c79897797e5e94e0958b8`, against merge base `1486bf6`. Returned P1 and C1, saved in
  `.reviews/0097-the-sandbox-takes-its-harnesses-from-their-modules/review-2026-11-06T124601Z.md`. Independently ran
  `npm test`: 1548 passed, none failed, cancelled or skipped, with Docker reachable; `npm run check-changes` and
  `git diff --check master...HEAD` passed. Not repeated: the live dev-sandbox smoke run, real single-harness builds
  or transitions against an existing home volume, a host without npm, bash 3.2, or shellcheck. The status stays
  `in-progress`
- 2026-11-06T12:52:39Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, applied the findings of
  `.reviews/0097-the-sandbox-takes-its-harnesses-from-their-modules/review-2026-11-06T124601Z.md`. P1 is applied in
  `cd702fc`: the helper's tests take every subset of `HARNESSES`, `claude` alone among them, and a test holds that they
  are the 2^n - 1 subsets of one or more. C1 is applied in `6543967`: "sandbox.sh" of `COMMANDS.md` says that a start
  reads and judges `harnesses` with `bell`, holds only the named harnesses and builds again after a change of the
  list, and names the refusals of a version of another shape and of the kit's build arguments and `KIT_ALLOWLIST`;
  `SETUP.md` and `SANDBOX.md` no longer say that such a start reads or judges `bell` alone. `node --test
  --test-timeout=60000 tests/*.test.mjs` passed 1552 tests on `6543967`, none failed, cancelled or skipped. The status
  stays `in-progress`
- 2026-11-06T12:59:38Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, reviewed unit 0097 at
  `d09943dfd3a5d4a2de3f084c62ed1a8cbdf91bf9` as a delta from `68362af35476a3a22f5c79897797e5e94e0958b8`.
  Verified the corrections to P1 and C1 and returned no new findings, saved in
  `.reviews/0097-the-sandbox-takes-its-harnesses-from-their-modules/review-2026-11-06T125938Z.md`. Independently ran
  `npm test`: 1552 passed, none failed, cancelled or skipped, with Docker reachable; `npm run check-changes` and
  `git diff --check 68362af..HEAD` passed. The first review's limits on live sandbox and platform verification remain.
  The status stays `in-progress`

## Amendments
