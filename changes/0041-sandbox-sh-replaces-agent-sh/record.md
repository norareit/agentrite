---
kind: feature
status: implemented
timestamp: 2026-10-08T22:50:00Z
---

# 0041 `sandbox.sh` replaces `agent.sh`

## Log

- 2026-10-08T19:58:16Z [human] in a session of Claude Code on the host, after the README was refactored in unit 0037,
  found `agent.sh` a weird name for what starts the sandbox's container, and named `sandbox` and `container` in its
  place. Was answered that `sandbox` fits, and that renaming `agent/compose.project.yml` and the Compose service makes
  every project change a file of its own, so that the scripts alone might be renamed. Refused that: "I want this to be a
  clean sweep. There's only a handful of projects already using the kit. Just make sure to add clear instructions in the
  release notes." Said that the release is made in the same session afterwards, and asked for the spec
- 2026-10-08T19:58:16Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the main session on the Linux host,
  on `master` at `1f840fa`. Read `process.md` and `roles/specifier.md` of the working copy, which are ahead of the
  installed release 4.2.0 by the entry format of unit 0040. Made the unit as a feature: a rename, and one that takes
  decisions on where it stops. Numbered 0041: the plain directories run from 0001 to 0040 without a gap, and 0042 and
  the `history-` directories do not count. Wrote `spec.md`. The human's are the name `sandbox`, the clean sweep and the
  instructions in the release notes. The specifier's, for the human to approve: that the account `agent`, its home and
  the home volume keep their names; that a project's Compose project and image names stay what its file says while this
  repository changes its own, which costs a login on each host; that this repository's own shim and compose file move in
  this unit, so that `./sandbox.sh` does not start here until the release; and the refusal of requirement 6, which the
  human did not ask for. Read for it: `container/agent.sh`, `container/compose.yml`, `container/unit-clone.sh`,
  `scripts/agentrite.mjs`, the two shims, both compose files of the project, and step 6 of `RELEASING.md`. Tried on the
  host: `docker compose config` with the kit's service renamed and this repository's file as it is, which merged without
  an error into two services. Not checked: what the script then does with an empty image name, and how far the suites
  can test requirements 6 and 7 without Docker, which is the planner's. Status left at `draft`
- 2026-10-08T20:24:52Z [human] approved the spec as it stands on `master` at `ab0d8bf`
- 2026-10-08T20:24:52Z [Claude Code, anthropic/claude-opus-5-5] in the main session on the Linux host, on `master` at
  `ab0d8bf`, set the status to `approved`
- 2026-10-08T20:30:19Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in the main session on the Linux host.
  Cut `feature-0041-sandbox-sh-replaces-agent-sh` from `master` at `c818fa2`, where `npm test` passes with 411 tests.
  Read `roles/planner.md` of the installed release 4.2.0, which is the working copy's, and `process.md` of the working
  copy, which is ahead of the release by the entry format of unit 0040 and the rule on one-character variables. Wrote
  `plan.md`: the rename of the code in one commit, then the refusal and the tests that hold an old name, then the four
  documents. The planner's, on how and not on what: the refusal of requirement 6 is made where the script reads the
  configuration Compose merges, so it covers a run and `--connect` and comes before a build, a clone and a container,
  and after the branch of a unit that has none is cut, as every refusal that follows that reading does. The fake
  `docker` of the suites is made to answer from the project's compose file, so that the test of requirement 7 does
  the four steps and nothing else. That test holds the two files of release 4.2.0 as strings, and no tracked file is
  named after an old name. The tests' own names derived from the old ones are renamed, and what plays the agent in
  them is kept. Tried on the host, with Compose v2.39.2: the kit's file with the service `sandbox` and this
  repository's file as it is merge into the services `agent` and `sandbox`, with exit 0 and no image for `sandbox`,
  so the refusal is made before the image name is used. Replaced the names in a copy of the tree: five lines pass 120
  characters, which the plan names. Not run: anything that builds or starts a container. The status is `planned`
- 2026-10-08T20:41:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, in the main session on the Linux
  host, on `feature-0041-sandbox-sh-replaces-agent-sh` at `baf1562`. Read `process.md`, `roles/implementer.md` and
  the three documents of the unit. Set the status to `in-progress`
- 2026-10-08T21:05:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, on the Linux host. Built the
  plan in three commits, `3d0a17e` (the rename), `3a3566a` (the refusal, and the tests of requirements 4 to 7) and
  `8d36947` (the four documents). Did the rename with `git mv` and a `sed` over the tracked files outside `changes/`,
  then read what `git grep` still held. Decisions of the work, not of the plan: the node block of
  `read_merged_configuration` prints `refused` alone or a first line `merged` before the four values, so that no line is
  empty; the fake `docker` finds the project's file as the argument after the last `-f`. Tables whose cell grew were
  aligned again by a script, and the diff shows no table changed besides those with a new name; the one cell reworded to
  stay under 120 characters is `SANDBOX_PROJECT_NAME`'s in `CONTRIBUTING.md`, "holds" to "has". Run: `npm test` on
  `8d36947` reported 421 tests, 421 passed, 0 failed (411 before, plus the 10 added). On the host, with Docker,
  `./sandbox-dev.sh --in-place true` exited 0 and `docker image ls` holds `ritenoar-agentrite-sandbox-dev`. In a scratch
  clone whose `sandbox/compose.project.yml` named the service `agent`, `./sandbox-dev.sh --in-place true` printed the
  refusal and exited 2 without a build. The grep of the plan's verification printed only the refusal, the tests of
  requirements 4 to 7 and `history-0036-install-the-agent-kit`. Not run: `./sandbox.sh`, which fails here until the
  release as the spec decides. The review is not started. The status stays `in-progress`
- 2026-10-08T20:55:07Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, reviewed unit 0041 in a full review on
  `feature-0041-sandbox-sh-replaces-agent-sh` at `e51b5f10665ea27e7da2c189d6d070c94a209b0a`, against merge base
  `c818fa225a3542b74b63f2a5b8ff0047881ee055`. Independently verified the branch, commit and clean tree. No previous
  review was present. Returned finding labels `C1` and `C2`. Saved the complete report at
  `.reviews/0041-sandbox-sh-replaces-agent-sh/2026-10-08T205243Z-opencode-e51b5f1-full.md`.
  Independently run: `npm test`, 421 tests passed and 0 failed; `npm run check-changes`, exit 0 from the installed
  kit; `./sandbox-dev.sh --in-place true`, exit 0 with real Docker. Inspected the image, shim equality, executable
  bits, shell syntax, names, documentation and history. Tested the exact committed merged-configuration reader
  with real Compose and legacy YAML on stdin, including the actual 4.2.0 template. Verified refusal, migrated names
  and the old limit-variable overrides. Not verified: historical test runs, test-writing order and intermediate
  failing runs. Not run: the scratch-checkout refusal run, which would require another checkout outside the allowed
  review writes; a real migrated external project, live unit/clone run or live connected session. Their wrapper
  paths were exercised by the suite with fake Docker; the real-Compose checks were isolated configuration checks.
  `./sandbox.sh` was not run, as the spec records its unavailability until the release. No implementation was edited
  and no commit was made
- 2026-10-08T21:30:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, on the Linux host, applied the
  two findings of the review at `e51b5f1`, which the human accepted by asking for them to be dealt with. C1: the two
  literals of `tests/sandbox-update.test.mjs` are now the contents of `git show v4.2.0:templates/project/agent.sh` and
  of the compose template of that tag, filled as the plan says, and the plan names the tag in place of `c818fa2`. The
  literals I took before were of `c818fa2`, which holds comment edits made after the release. C2: wrapped the
  implementer's entry of 20:41:00Z, with its text unchanged. Checked: no line of `record.md`, `plan.md` or the test
  passes 120 characters. `npm test` on the tree of this commit but for this entry: 421 tests, 421 passed, 0 failed
- 2026-10-08T22:04:01Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, reviewed unit 0041 in a delta review on
  `feature-0041-sandbox-sh-replaces-agent-sh` at `6689062777fc3e48537b2f4334cfc517948f33b8`, from delta base
  `e51b5f10665ea27e7da2c189d6d070c94a209b0a`. Checked prior finding labels `C1` and `C2`; returned no new labels.
  Saved the complete report at
  `.reviews/0041-sandbox-sh-replaces-agent-sh/2026-10-08T220228Z-opencode-6689062-delta.md`.
  Independently run on the reviewed committed tree: `npm test`, 421 passed and 0 failed; `npm run check-changes`,
  exit 0 from the installed kit. Checked published 4.2.0 tarball integrity, template and rendered-fixture equality,
  preservation of the wrapped entry's text, line lengths, JavaScript syntax and both diff ranges' whitespace.
  Independently verified HEAD and the clean index and tree before review writes. Not verified: historical test
  invocations and execution order, or earlier Docker startup, scratch-refusal, real-Compose and image claims.
  Not run: live Docker startup, a scratch-checkout refusal, real external migration, live unit/clone or connected
  sessions. The suite uses fake Docker for the wrapper paths. `./sandbox.sh` was not run: the installed target is
  unavailable until release, as the spec decides. No implementation was edited, no snapshots were updated and no
  commit was made
- 2026-10-08T22:21:49Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, reviewed unit 0041 in a delta review on
  `feature-0041-sandbox-sh-replaces-agent-sh` at `6689062777fc3e48537b2f4334cfc517948f33b8`, from delta base
  `6689062777fc3e48537b2f4334cfc517948f33b8`. The implementation/document delta is empty. The only pending change
  before review writes was the preceding review's own log entry, which is preserved unchanged. Returned labels:
  none; no new findings on spec conformance, plan fidelity or code quality. Saved the complete report at
  `.reviews/0041-sandbox-sh-replaces-agent-sh/2026-10-08T221934Z-opencode-6689062-delta.md`.
  Newly run: Git identity, history, index, full working-tree and delta diffs, and whitespace checks. HEAD equals
  the latest reviewed commit; the index is clean. No newly accepted finding followed the latest review.
  Historical evidence only: the latest report's `npm test`, 421 passed and 0 failed, and `npm run check-changes`,
  exit 0, plus its provenance, syntax and formatting checks. None of those checks was rerun in this session.
  Not newly verified: runtime behavior, historical test invocations or execution order, or the host's Docker state.
  Not run: live Docker startup, scratch-refusal, real external migration, live unit/clone or connected sessions,
  or `./sandbox.sh`, whose unavailability until release is a settled spec decision. No implementation was fixed,
  staged or committed, no snapshot was updated and no status transition was made
- 2026-10-08T22:50:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, on the Linux host, set the status
  to `implemented`. The human reported that the re-review returned no new findings. The two findings of the first
  review, C1 and C2, were applied and are logged above, and every task of `plan.md` is ticked. `npm test` on the tree
  before this commit: 421 tests, 421 passed, 0 failed

## Amendments
