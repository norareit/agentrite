---
kind: bug
status: implemented
timestamp: 2026-09-25T01:02:43Z
---

# 0006 Git refuses the sandbox's working directory

## Log

- 2026-09-25T01:02:43Z [human] asked for the sandbox faults found during Norareit's `0040-sandbox-firewall-dns` to be
  created as bug units in this repository
- 2026-09-25T01:02:43Z [Claude Code, anthropic/claude-opus-5-5] reproduced it on macOS with Docker Desktop, Docker
  Engine 24.0.7, with Norareit on kit 1.0.2: as the agent, uid 501, `git -C /work rev-parse` fails with "detected
  dubious ownership"; `stat` shows `/work` as `0:0` and its contents as `501:20`; a plain `alpine` container sees
  every bind mount root tried as `0:0`. Earlier, during 0040, the same git commands succeeded once `safe.directory`
  was set to `/work` through `GIT_CONFIG_*`, and now the image's git 2.39.5 accepts `/work` with `safe.directory`
  set to `*` both through `GIT_CONFIG_*` and through `-c`. Not checked: Linux Docker Engine. Not explained:
  Norareit's 0040 review reports its end-to-end suite, change check included, passing in the sandbox as uid 501;
  the review does not say how
- 2026-09-25T01:02:43Z [Claude Code, anthropic/claude-opus-5-5] took the planner role. `spec.md` written, status
  `draft`; a single-commit fix, so no `plan.md`. Four requirements, three decisions and two non-goals
- 2026-10-02T10:15:40Z [human] asked for the bugfix to be implemented as the spec stands. No separate approval was
  given: the request to implement the drafted unit is recorded here as its approval
- 2026-10-02T10:15:40Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role and moved the status to
  `in-progress`. The branch is one commit ahead of `1f59e6a` and has not been brought up to `master`, which has since
  changed `container/compose.yml` in the same `environment` block, in lines this fix does not touch
- 2026-10-02T10:15:40Z [Claude Code, anthropic/claude-opus-5-5] confirmed the failing case before the fix, on macOS
  with Docker Desktop, Docker Engine 24.0.7, with Norareit as the project and its existing `norareit-agent` image.
  The image was built from kit 1.0.3, whose installed `container/` directory `diff -q` reports as identical to this
  branch's. Compose was run as the wrapper runs it, but with this repository's unchanged `container/compose.yml` as
  the base file. As the agent, uid 501, `stat` showed `/work` as `0:0` and `/work/.git` as `501:20`, no `GIT_CONFIG_*`
  variable was set, and `git -C /work status` exited 128 with "detected dubious ownership in repository at '/work'"
- 2026-10-02T10:16:45Z [Claude Code, anthropic/claude-opus-5-5] in 1a18523, set `GIT_CONFIG_COUNT`,
  `GIT_CONFIG_KEY_0` and `GIT_CONFIG_VALUE_0` in the `environment` block of `container/compose.yml`, giving
  `safe.directory` the value `*`, with the comment requirement 4 asks for
- 2026-10-02T10:16:45Z [Claude Code, anthropic/claude-opus-5-5] checked the requirements by hand on the same machine,
  with the same command as the failing case and the `container/compose.yml` of 1a18523 as the base file, and this
  repository also mounted at `/mnt/agent-kit` as `agent.sh --mount` would mount it. As the agent, uid 501, with
  `/work` and `/mnt/agent-kit` both still `0:0`: the three variables were in the environment; `git -C /work status`
  and `git -C /work rev-parse --short HEAD` exited 0 (requirement 1); `git -C /mnt/agent-kit status` exited 0
  (requirement 2); and Norareit's `npm run check:changes`, on its `master`, exited 0 with no setup of its own
  (requirement 3). Not checked: the sandbox started through a project's `./agent.sh`, which runs the installed
  release and so cannot carry the fix until one is made; an image built from this tree, since the fix changes
  nothing the image holds; a read-only `--mount`; Linux Docker Engine; and a project that sets `GIT_CONFIG_COUNT`
  itself
- 2026-10-02T10:16:45Z [Claude Code, anthropic/claude-opus-5-5] ran `npm test` and `node scripts/check-changes.mjs`
  on 1a18523: 67 tests passed, 0 failed, and the check exited 0. No test was added, as the spec decides the
  regression check is manual. No review has been run, so the status stays `in-progress`
- 2026-10-02T10:29:58Z [OpenCode, openai/gpt-6.1-sol] fully reviewed unit `0006-workdir-dubious-ownership` at commit
  `ae3c42853771b01eb329272595c6b06e9ef4adbf`, against merge base `1f59e6adb3444b69e7a61a12e2f813a54ec544ce`.
  Returned finding C1; complete findings and verification details are in
  `.reviews/0006-workdir-dubious-ownership/2026-10-02T102717Z-gpt-6-1-sol-full.md`. Independently ran all 67 tests
  successfully with Node 26.9.0, the change check and the diff whitespace check. The initial Node 22.9.0 test run
  could not load an existing TypeScript import. On Docker Desktop with Engine 24.0.7, using the reviewed Compose
  file and the existing arm64 image, confirmed Git's ownership failure without the setting and successful status
  and revision lookup with it in `/work` and an extra mount, successful status in a read-only mount, and both
  repositories' change checks passing as uid 501. Not verified: Linux Docker Engine, the release-installed wrapper
  carrying this fix, a newly rebuilt image, or a project-supplied `GIT_CONFIG_COUNT` override.

## Amendments
