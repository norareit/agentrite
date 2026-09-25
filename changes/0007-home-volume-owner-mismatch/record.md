---
kind: bug
status: draft
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

## Amendments
