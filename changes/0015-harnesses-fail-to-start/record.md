---
kind: bug
status: draft
timestamp: 2026-10-03T23:37:11Z
---

# 0015 The sandbox refuses two hosts its harnesses need

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
- 2026-10-02T21:49:12Z [human] asked for the branch to be pushed
- 2026-10-02T21:49:12Z [Claude Code, anthropic/claude-opus-5-5] committed the three documents in `6ed08f9`, which the
  21:19:59Z entry describes as uncommitted, and pushed `bugfix-0015-harnesses-fail-to-start` to `origin`. The change
  check reported nothing on that commit. Status still `draft`
- 2026-10-03T23:37:11Z [human] said that the kit had changed much since this draft, through 0020, and asked the
  planner to check whether the original failure is still there and what the later units mean for this one. On
  hearing that OpenCode fetches its model catalog from `models.opencode.ai`, which the human's harness telemetry
  reads, said that the host is definitely to be allowlisted, and asked for the spec and the plan to be changed
- 2026-10-03T23:37:11Z [Claude Code, anthropic/claude-opus-5-5] took the planner role again, in a Norareit session, and
  rewrote `spec.md` and `plan.md`. The unit keeps its number and directory, and its title is now "The sandbox
  refuses two hosts its harnesses need". Checked before writing, on macOS with Docker Desktop, Docker Engine 24.0.7
  and Compose 2.23.3:
  * Norareit as it stands, on kit 2.1.0: both failures as first reported
  * Norareit's image under the base Compose file of 2.2.1: OpenCode starts, Claude Code fails as before, and the
    proxy refuses `platform.claude.com` and `models.opencode.ai`
  * The same with both hosts added to the kit's list through an extra Compose file: both harnesses start, and the
    proxy refuses nothing but the start-up check's canary
  * In the OpenCode binary, the code that fetches the catalog, and in Norareit's home volume, a copy of it
  What changed in the documents, and why:
  * The `/tmp` half is gone. 0020 fixed it, in release 2.2.1
  * The spec names no source or test file, which `process.md` asks and 0020's review found there
  * The spec has the "Beyond the request" section 0019 added, holding three things the request does not need:
    taking `models.dev` out of what `init` writes, the test that `raw.githubusercontent.com` stays off the kit's
    list, which the earlier draft had as a requirement, and finding out what makes OpenCode fetch a new catalog
  * The real run is in this repository's own sandbox, which 0018 gave it, and no longer in Norareit
  * The generated project Compose file's comment is one more place that lists the kit's hosts
  Not established, and the spec says so: whether a login needs a further host, whether a logged-in Claude Code
  contacts `platform.claude.com`, and what makes OpenCode fetch a new catalog, since with the host admitted and a
  copy two days old it did not. The runs used an image built from kit 2.1.0, not one built from 2.2.1. The commit
  the 21:49:12Z entry names as `6ed08f9` is `a139507` since the history was rewritten for the repository's new
  name. These changes are uncommitted, since the session was not asked to commit. Status still `draft`

## Amendments
