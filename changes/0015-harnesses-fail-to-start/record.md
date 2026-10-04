---
kind: bug
status: in-progress
timestamp: 2026-10-04T00:01:00Z
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
- 2026-10-03T23:38:33Z [human] approved the spec and the plan as rewritten, and asked for the branch to be pushed
- 2026-10-03T23:38:33Z [Claude Code, anthropic/claude-opus-5-5] set the status to `approved`. The rewritten documents,
  which the entry before describes as uncommitted, are committed in `fc0c775`, and the branch is pushed with this
  entry. Nothing is implemented yet
- 2026-10-03T23:41:00Z [human] asked, in a session in this repository on Linux, for the rewritten unit to be pulled and
  implemented
- 2026-10-03T23:41:00Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role and moved the status to
  in-progress
- 2026-10-03T23:45:26Z [Claude Code, anthropic/claude-opus-5-5] implemented the plan's four tasks in two commits,
  `3ec078a` with the regression test and the fix and `ae51d7c` with the README and the template. The unit stays
  in-progress: the plan's last verification task is the human's and is open, and no review has been made. What was
  verified:
  * `tests/compose-allowlist.test.mjs` failed on the tree before the fix, naming `platform.claude.com` and
    `models.opencode.ai` as the two hosts missing from `KIT_ALLOWLIST`, and passes after it
  * On the host, on `ae51d7c`: `npm test` reported 179 passing and 0 failing. `npm pack --dry-run` lists 22 files,
    the same list as in an export of `master`. No line of a file changed against `master` is over 120 characters
    and none holds an em dash. `npm run check-changes` exited 0 on the commit that holds this entry
  * The real run, on Linux with Docker Engine 28.4.0 and Compose 2.39.2, with the working copy's
    `container/compose.yml`, this repository's `agent/compose.project.yml` and its existing image, which was not
    rebuilt and holds Claude Code 2.1.266 and OpenCode 1.18.30. A third Compose file, outside the repository, gave
    the run a new and empty home volume, removed afterwards. The container was started detached, and each harness
    was started in it with `docker exec` as the `agent` user on a pseudo-terminal, not from the shell `agent.sh`
    opens. `claude` reached its first-run screen, "Let's get started", with the choice of text style (R1).
    `opencode` reached its prompt, "Ask anything". After both, `grep 'not allowlisted' /run/egress-proxy.log`
    showed two lines, `example.com`, which is the start-up check's canary, and `raw.githubusercontent.com`, and the
    log holds `allowed platform.claude.com` and `allowed models.opencode.ai` once each after start-up (R2). Each
    harness ran for 25 to 30 seconds and was then interrupted
  * Seen in that run and not asked for: OpenCode, holding no copy of its catalog, fetched one. The new home volume
    held a `models.json` of 5,312,495 bytes under `.cache/opencode` afterwards. That is one case of what the spec
    lists as not established, the fetch with no copy held and the host admitted
  * Not checked: the plan's human task, a login to Claude Code and a prompt in each harness; Docker Desktop for
    macOS, where the bug was found; an image rebuilt on this branch, since the fix changes no file the image holds
- 2026-10-03T23:45:26Z [Claude Code, anthropic/claude-opus-5-5] two things noticed and left alone, as outside the plan:
  * The proxy's log of the real run holds 88 lines `refused: the connection closed before its ClientHello was
    complete`, all but one of them among OpenCode's connections to `registry.npmjs.org`, of which 35 were allowed.
    What closes those connections was not looked into, and nothing was seen to fail
  * This repository's own `agent/compose.project.yml` carries the same comment listing the kit's hosts as the
    template, and still admits `models.dev` for OpenCode. `init` wrote it once and `refresh` does not touch it, and
    the plan does not name it, so it is unchanged
- 2026-10-03T23:59:12Z [OpenCode, openai/gpt-6.1-sol] as reviewer, made a full review of unit 0015 at commit
  `e4e3cbfd59c4e32ac359f87f99d081855bad7f81`, against merge base `58430fa51fd239f61caeae9a165b61caac447783`.
  Returned C1. Complete findings and verification evidence are saved in
  `.reviews/0015-harnesses-fail-to-start/2026-10-03T235734Z-full-e4e3cbf-opencode.md`.
  Could not verify the human login-and-prompt task, behavior with a saved login, Docker Desktop on macOS, a rebuilt
  image, or the chronology of the implementer's original uncommitted regression-test run
- 2026-10-04T00:01:00Z [human] asked the implementer to check the review's remarks
- 2026-10-04T00:01:00Z [Claude Code, anthropic/claude-opus-5-5] as implementer, read the review. It returned one
  finding, C1, which does not block. C1 is right and is applied in `43f56a6`: the helper in
  `tests/compose-allowlist.test.mjs` now skips a whitespace-only line before it looks for the end of the block, so
  an empty line among the hosts of `KIT_ALLOWLIST` no longer cuts the list short. A second test holds that, on a
  block written in the test itself. It failed before the correction, returning the one host above the empty line,
  and passes after it. No file outside the test changed. On `43f56a6`, `npm test` reported 180 passing and 0 failing,
  and no line of the test is over 120 characters. `npm run check-changes` exited 0 on the commit that holds this
  entry. The sandbox was not run again, since nothing it uses changed. The human has not said whether C1 is
  accepted; it was applied on the implementer's agreement with it. The plan's human task is still open, so the
  status stays in-progress

## Amendments
