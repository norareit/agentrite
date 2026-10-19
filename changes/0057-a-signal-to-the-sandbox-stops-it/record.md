---
kind: bug
status: in-progress
timestamp: 2026-10-19T14:45:48Z
---

# 0057 A signal to the sandbox stops it

## Log

- 2026-10-19T14:45:48Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `170527e`, on the human's request to log the bug that stopped the sandbox twice during a login of
  Claude Code, after `./sandbox.sh 0056`. Made the unit as a bug. Numbered 0057: the highest number in `changes/` is
  0056. The session had read `roles/specifier.md` of the working tree earlier, for unit 0056. Reproduced the
  message on the human's host with the image `ritenoar-agentrite-sandbox:latest` and a Compose file of the kit's
  settings of `init`, `cap_drop` and `cap_add`, dropping to another user with `setpriv`: `SIGWINCH` and `SIGINT`
  sent to `docker compose run`, and `SIGWINCH` sent with `docker kill`, each stopped the container, and with `KILL`
  added it went on running. Read `container/compose.yml`, the drop in `container/entrypoint.sh`, the forms of
  `container/sandbox.sh`, and "Logging in", "Where things are kept on the host" and "What the sandbox defends
  against" of `SANDBOX.md`, and looked into the home volume of the running sandbox, which holds no saved login.
  Left the human's running sandbox as it was. Wrote `spec.md`. What sent the signal during the login is not
  established, and the spec says so. The status is `draft`
- 2026-10-19T14:48:46Z [human] approved the spec. The status is `approved`
- 2026-10-19T14:50:46Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host. Read
  `roles/planner.md` of the installed release. Cut `bugfix-0057-a-signal-to-the-sandbox-stops-it` from `master` at
  `6d8f3fd`. The fix needs a plan: a regression test, the change to `container/compose.yml`, four comments that
  become false with it and two documents. Wrote `plan.md`. The suite holds no test that needs Docker yet, so
  requirement 4's skip "as the suite's other tests that need Docker are" has no pattern to follow; the plan skips it
  where `docker info` fails, with a reason of its own, since the reason of `tests/skip-reason.mjs` sends the reader
  to the sandbox, whose image holds no Docker. It adds the skip to the list in "The kit's own tests" of
  `CONTRIBUTING.md`, which says what each skipped test needs. The status stays `approved`
- 2026-10-19T14:52:29Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, in a session on the Linux host,
  on `bugfix-0057-a-signal-to-the-sandbox-stops-it`. Read `roles/implementer.md`, `spec.md`, `plan.md` and this
  record. The unit has a plan, so it may be built. The status is `in-progress`
- 2026-10-19T14:52:45Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, wrote
  `tests/sandbox-signal.test.mjs` and ran `node --test tests/sandbox-signal.test.mjs` on the host on the tree before
  the fix. It failed at the assertion "SIGWINCH leaves the container running", with the container stopped
- 2026-10-19T14:56:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, added `KILL` to `cap_add` in
  `container/compose.yml`, made true the four comments the plan names, and changed `SANDBOX.md` and `CONTRIBUTING.md`
  as the plan says. Nothing in the rest of "What the sandbox defends against" names the capabilities. On the host,
  `node --test tests/sandbox-signal.test.mjs` passed after the fix, and `npm test` reported 654 tests, 654 passed, 0
  failed, 0 skipped. Not yet run: the sandbox run of `./sandbox.sh --in-place npm test`, and the checks under
  "Verification" that start the sandbox in a terminal, which need the human's terminal
- 2026-10-19T14:57:37Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, performed a full review of unit 0057 at
  `ee005a661c33c1c7c7ee3d697e9d918623389669`, against merge base `6d8f3fdd046744a41379dfc0a73f87d557ed378a`.
  Returned P1 and P2. Saved the complete findings in
  `.reviews/0057-a-signal-to-the-sandbox-stops-it/review-20261019T145641Z-ee005a6.md`. Reran `npm test`: 654 passed,
  0 failed, 0 skipped; `npm run check-changes` and `git diff --check master...HEAD` passed. Verified the regression's
  Docker-unavailable skip and independently reproduced the fatal forwarding error without KILL, survival of
  SIGWINCH and exit 143 after SIGTERM with KILL, and zero capability sets with NoNewPrivs 1 in a non-root exec.
  Could not verify the full sandbox-suite run, terminal resizing and Compose-process signals in each wrapper mode,
  signals through the complete sandbox entrypoint, or capabilities through an actual sandbox run and its --connect
- 2026-10-19T15:05:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, accepted both findings of the
  review of `ee005a6` and applied them. P1: `./sandbox.sh` runs the installed release's `compose.yml`, which has no
  `KILL` (checked: `grep KILL node_modules/agentrite/container/compose.yml` finds nothing), so the checks of
  "Verification" that start a sandbox now use `./sandbox-dev.sh`, which runs the working copy's; the plan's text
  changed, no check was run. P2: ticked the host `npm test` and `npm run check-changes` checks, which passed on
  `ee005a6`, and the two commit points that exist, `1f2c071` and `ee005a6`. The checks that start a sandbox, and the
  commit point `Record the checks on the host`, stay open
- 2026-10-19T15:21:07Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, logged the checks the human ran
  on the host with `./sandbox-dev.sh`, which runs the working copy's `compose.yml`, as the human reported them.
  R3: in `./sandbox-dev.sh 0057 bash` the shell showed `CapPrm`, `CapEff` and `CapAmb` all
  0000000000000000 and `NoNewPrivs: 1`, and `./sandbox-dev.sh --connect 0057 grep ...` showed the same. R1: in that
  run `kill -WINCH` to the `docker compose run` process and a resize of the window printed nothing in the terminal,
  and `tput cols` went from 191 to 223. In `--in-place` and in `--workdir` the human reported that the same
  `kill -WINCH` and resize printed nothing; the widths of `tput cols` were not reported for these two. R2:
  `docker kill -s WINCH` left the container listed by `docker ps` and printed nothing in the terminal. A
  `docker kill -s TERM` of the `bash` run printed nothing and left the shell running, since an interactive bash
  ignores SIGTERM, so it did not show the end of a command; with `./sandbox-dev.sh --in-place sleep 300`,
  `docker kill -s TERM` ended the run at once, with nothing printed. `./sandbox-dev.sh --in-place npm test`
  reported 654 tests, 653 passed, 0 failed, 1 skipped; the pasted tail does not name the skipped test, so that it is
  `tests/sandbox-signal.test.mjs` is not checked. The box for that run in `plan.md` stays open, and so does the commit
  point of the checks
