---
kind: bug
status: approved
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
