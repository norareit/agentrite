---
kind: bug
status: draft
timestamp: 2026-10-02T21:19:59Z
---

# 0015 Neither harness starts in a new sandbox

## Log

- 2026-10-02T21:19:59Z [human] reported, from a session in Norareit on the MacBook, that after the move to kit 2.1.0
  `./agent.sh` starts but `opencode` fails to load its OpenTUI library from `/tmp` and `claude` fails to connect to
  `platform.claude.com`, and that this needs fixing
- 2026-10-02T21:19:59Z [human] on hearing that the proxy had also refused `models.opencode.ai` and
  `raw.githubusercontent.com` at start-up, asked for both to be allowlisted as well
- 2026-10-02T21:19:59Z [Claude Code, anthropic/claude-opus-5-5] took the planner role, in the Norareit session that
  diagnosed the report, and wrote `spec.md` and `plan.md`. A bug, with a plan because the fix comes with a
  regression test, a README change and a check in a real sandbox. The root cause is from evidence gathered in
  Norareit's sandbox: the mount options, an execution probe in `/tmp` and in the home, the proxy's log, and a run
  with the candidate fix applied through an extra Compose file, which changed no file in either repository. Three
  things are not established and the spec says so: what the two further hosts serve, whether a login needs another
  host, and whether a logged-in Claude Code contacts `platform.claude.com`. One decision departs from where 0010
  put a harness host and wants the human's eye: all three hosts go in `KIT_ALLOWLIST` rather than in what `init`
  writes for a harness, because only that reaches existing projects. The unit number is the highest existing, 0014,
  plus one; the `history-` directories keep Norareit's numbers and were not counted. The documents are uncommitted
  on the branch `bugfix-0015-harnesses-fail-to-start`, since the session was not asked to commit. Status left at
  `draft` for the human's approval
- 2026-10-02T21:25:21Z [human] held `raw.githubusercontent.com` back: it is to be admitted only once it is known to
  be necessary, and asked what it is for. Confirmed `models.opencode.ai` as OpenCode's model catalog, which is needed
- 2026-10-02T21:25:21Z [Claude Code, anthropic/claude-opus-5-5] as planner, looked the host up in both installed
  binaries and on the web, and changed the draft: `raw.githubusercontent.com` is not admitted. Claude Code fetches
  its release notes from it, and OpenCode its syntax highlighting queries, with the grammars on `github.com`.
  Neither harness needs it to start. `spec.md` holds the evidence and the decision, requirement 2 now excludes the
  host, requirement 4 expects its refusal, and `plan.md` follows. Status still `draft`

## Amendments
