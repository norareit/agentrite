---
kind: bug
status: in-progress
timestamp: 2026-09-25T01:02:43Z
---

# 0007 Agent's home volume owned by another uid

## Log

- 2026-09-25T01:02:43Z [human] asked for the sandbox faults found during Norareit's `0040-sandbox-firewall-dns` to be
  created as bug units in this repository
- 2026-09-25T01:02:43Z [Claude Code, anthropic/claude-opus-5-5] observed it on macOS with Docker Desktop, Docker
  Engine 24.0.7, with Norareit on kit 1.0.2: the agent is uid 501, `/home/agent` and its contents are `1000:1000`,
  `touch /home/agent/probe` is denied, and `npm ci` fails with `EACCES` on `/home/agent/.npm`. `docker volume
  inspect` gives the volume's creation as 2026-09-22T12:14:01Z, by Compose project `norareit-agent`. The container's
  capabilities are `NET_ADMIN`, `SETUID` and `SETGID`. How an image built for uid 1000 came to fill the volume is not
  known; reproducing the mismatch from an empty volume was not tried
- 2026-09-25T01:02:43Z [Claude Code, anthropic/claude-opus-5-5] took the planner role. `spec.md` written, status
  `draft`; a single-commit fix, so no `plan.md`. Three requirements, four decisions and three non-goals. Norareit's
  `norareit-agent_agent-home` volume is left as it is, since requirement 1 is checked against it
- 2026-09-25T23:00:00Z [opencode, ollama/qwen3.8:27b-128k] took the implementer role, status `in-progress`. The spec
  names no test location for a regression, and the decisions say the check is manual; a unit test of the guard is the
  automated half of that, so it is added at `tests/entrypoint-home-owner.test.mjs`. Norareit's mismatched volume is
  on the Mac where the bug was found, not on this machine; requirement 1 is checked here against a real named volume
  whose `/home/agent` is owned by uid 1000 while the agent is uid 501, and requirement 2 against a real volume the
  agent owns, running the guard against real named volumes in Docker
- 2026-09-25T23:05:00Z [opencode, ollama/qwen3.8:27b-128k] implemented the fix. `container/entrypoint.sh` gains a
  `check_home_owner` guard that the entrypoint runs, as root, before it drops to the agent and before the firewall,
  comparing the owner of `/home/agent` with the agent's uid and `die`ing with both uids and the recovery when they
  differ. `README.md` gains a "The home volume" subsection in "Running the sandbox" stating what the message means
  and how to recover. The regression test is written before the guard and confirmed to fail against the pre-fix
  `entrypoint.sh` (`check_home_owner is not defined in entrypoint.sh`) before it was added
- 2026-09-25T23:07:00Z [opencode, ollama/qwen3.8:27b-128k] verified. Regression test: the mismatched case fails
  against the pre-fix entrypoint and both cases pass against the fix, `npm test` 69 pass / 0 fail. Requirements,
  against real Docker named volumes on this machine (image agent uid 501): requirement 1, a volume whose `/home/agent`
  is `1000:1000`, the guard dies, exit 1, naming uid 1000 and uid 501 and the `docker volume rm <project>_agent-home`
  recovery; requirement 2, a fresh volume owned by the agent, the guard passes, exit 0, and the volume is left owned
  by uid 501. Not verified: a mismatched home created by Norareit's real volume, which is on the Mac where the bug
  was found, not this machine; the guard is the identical function in both cases
- 2026-09-25T23:08:00Z [opencode, ollama/qwen3.8:27b-128k] a pre-existing local edit to `package.json` and
  `package-lock.json` (a version bump) on `master` was stashed as `stash@{0}` while on this branch and is not part of
  this unit; it is not restored or committed here

## Amendments
