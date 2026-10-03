---
kind: bug
status: implemented
timestamp: 2026-10-03T13:21:26Z
---

# 0020 The sandbox refuses to run anything from `/tmp`

## Log

- 2026-10-03T12:49:57Z [human] on hearing that this repository's suite fails in its new sandbox because `/tmp` is
  mounted `noexec`, said that using `/tmp` is not special, that no project adopting the kit should have to change
  its code to run its tests in the container, and asked for the fix in the kit, as bug 0020, on which 0018 depends
- 2026-10-03T12:49:57Z [Claude Code, anthropic/claude-opus-5-5] took the planner role and wrote `spec.md` and
  `plan.md`. A bug, with a plan, since the fix comes with a regression test, a comment, a README paragraph and a
  real run. The number is the human's: the rule gives 0019, the highest directory on this branch being 0018, and a
  local branch `task-0019-beyond-the-request` already uses that number. Checked before writing, on Linux with
  Docker Engine 28.4.0 and Compose 2.39.2, in this repository's sandbox built from kit 2.2.0: the mount options of
  `/tmp`, `/run`, `/dev/shm`, `/work` and `/home/agent`, and whether a script written to each runs, which are the
  table in the spec; and that with `/tmp:exec` in a copy of the installed compose file, `/tmp` is mounted
  `rw,nosuid,nodev,relatime` and `npm test` in the sandbox reports 177 passing and 0 failing, against 162 and 15
  without it. Not checked: Docker Desktop for macOS and Docker Engine 24.0.7. That Docker adds `noexec` to every
  tmpfs given this way is what was observed here and what reports in Docker's issue tracker say; the engine's
  source was not read. Written on the branch `feature-0017-sandbox-without-playwright`, which holds 0017, the 2.2.0
  release commit and 0018, none of which `master` holds yet
- 2026-10-03T12:53:39Z [human] approved the spec and the plan and asked for the implementation
- 2026-10-03T12:53:39Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role and moved the status to
  in-progress
- 2026-10-03T12:54:15Z [Claude Code, anthropic/claude-opus-5-5] implemented the plan in three commits: the
  regression test with the fix, the README, and this record. What was verified:
  * `tests/compose-tmpfs.test.mjs` failed on the tree before the fix, with `/tmp` where `/tmp:exec` was expected,
    and passes after it
  * The real run, on Linux with Docker Engine 28.4.0 and Compose 2.39.2, used the working copy's
    `container/compose.yml` with this repository's `agent/compose.project.yml` and the image built for 0018, which
    are in the working tree and not committed. The probe of the spec's steps printed `ran` and exited 0. The mount
    options of `/tmp` were `rw,nosuid,nodev,relatime,inode64`, with no `noexec`. Those of `/` opened with `ro`.
    `npm test` in the sandbox exited 0, with 178 passing and 0 failing
  * On the host, on `61da397`: `npm test` reported 178 passing and 0 failing, and `npm pack --dry-run` lists 22
    files
  * Not checked: Docker Desktop for macOS and Docker Engine 24.0.7, which the spec names as non-goals; the image
    was not rebuilt, since the fix changes no file the image holds

- 2026-10-03T13:02:16Z [OpenCode, openai/gpt-6.1-sol] took the reviewer role and completed a full review of
  0020 on `8a142fae799e3950f7d77ab9dbe82408f4c5a945`, against the merge base with `master`. Returned P1;
  complete findings are in `.reviews/0020-sandbox-tmp-noexec/2026-10-03T130024Z-full-8a142fa.md`. Independently
  ran `npm test` on the host and in the sandbox, each with 178 passing and 0 failing; reproduced the regression
  failure with the pre-fix Compose content; checked the real executable probe and mount options with the working
  copy's Compose file on Docker Engine 28.4.0 and Compose 2.39.2; and ran `npm pack --dry-run` (22 files),
  `npm run check-changes` and `git diff --check master...HEAD`, all exiting 0. Could not independently verify
  the original test-first execution order. Docker Desktop for macOS and Docker Engine 24.0.7 were not checked
- 2026-10-03T13:19:11Z [human] accepted P1 and asked for the spec to be changed
- 2026-10-03T13:19:11Z [Claude Code, anthropic/claude-opus-5-5] applied P1, as planner for this one edit, the unit not
  being frozen: `spec.md` no longer names source or test files. The context, the root cause, the fix description and R3
  say "the kit's base Compose file", and the observed behavior names the failing tests by what they test. No
  requirement, decision, command or piece of evidence changed in meaning, and the plan, which already names every file,
  is unchanged. No code or test changed, so the suites were not rerun for this edit
- 2026-10-03T13:21:26Z [human] asked for the unit to be marked implemented
- 2026-10-03T13:21:26Z [Claude Code, anthropic/claude-opus-5-5] set the status to implemented: every task in
  `plan.md` is ticked, and P1, the one finding the review returned, was accepted and applied

## Amendments
