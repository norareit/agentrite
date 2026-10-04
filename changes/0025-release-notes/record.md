---
kind: feature
status: implemented
timestamp: 2026-10-04T12:36:47Z
---

# 0025 Release notes with every release

## Log

- 2026-10-04T11:19:40Z [human] after release 2.3.0, in the session that made it, on reading a summary the
  implementer had written by hand of what the release changes for a project, asked: "Wouldn't it be worth adding a
  release notes with each version with AT LEAST that 'worth telling' part in it?" In the discussion that followed
  the human decided three things, which the spec records as the human's: the rule goes in this repository's
  `AGENTS.md` and not in `process.md` ("This should NOT go into process.md. It's specific for this project. SO it
  goes into AGENTS.md."); the notes are written at release time by an agent that summarises the changes between
  versions, not by each unit ("Isn't it easier to just let an LLM summerise the changes between version? That can
  make it more coherent AND it makes for easy knowing which version it is for. Because RIGHT NOW a new change can't
  know if it's going into 2.3.1, 2.4.0 or 3.0.0"); and 2.3.0 is backfilled ("hand this to a planner as a unit, with
  2.3.0 backfilled from the summary above"). The human also said yes to the shape the implementer proposed, as a
  starting point. The time of this entry is when the request reached the planner, not when each thing was said
- 2026-10-04T11:19:40Z [Claude Code, anthropic/claude-opus-5-5] took the planner role, in a worktree of this
  repository, and wrote `spec.md` and `plan.md` on the branch `feature-0025-release-notes`, made from `master` at
  `b1ca65b`, which is `v2.3.0`. A feature, because it has decisions. The number was given by the session that
  dispatched the planner: 0024 exists on a branch that is not on `master` yet. Planned under the process of release
  2.3.0, read from the main checkout's `node_modules`, since a worktree has none. What the spec rests on, with npm
  11.11.0 and node 24.14.1:
  * `npm pack --dry-run` with an empty `CHANGELOG.md` at the root listed the same 23 files as without it, so the
    file has to be in `files`. The empty file was removed again
  * The statuses in the records at `v2.0.0`, `v2.1.0`, `v2.2.0`, `v2.2.1` and `v2.3.0`, from `git grep '^status:'
    <tag> -- 'changes/*/record.md'`. Between `v2.2.1` and `v2.3.0`: 0015, 0016, 0018, 0019, 0021, 0022 and 0023
  * `git diff v2.2.1 v2.3.0` over the shipped files, read whole, against the implementer's summary. The summary
    holds, with the corrections the spec lists: the start-up check does cover the kit's own hosts, by
    `container/entrypoint.sh`; the changed comment in `templates/project/agent/compose.project.yml` was missing;
    the README sections on `./agent-dev.sh` do ship; and what 0023 says of `chatgpt.com` was missing
  * `deploy.sh`, `tests/deploy.test.mjs` and the README's "Releasing", read. `npm test` passed, 188 tests
  * `scripts/check-changes.mjs`, read: it looks at nothing outside `changes/`

  Where the spec keeps the proposed shape and where it changes it is in its decisions. The changes: the section is
  drafted under the version the agent proposes, not under "Unreleased"; the notes are a commit of their own ahead
  of `npm version`, which refuses a working tree that is not clean; a closing line in each section names the units
  that changed this repository only; and the check in `deploy.sh` goes first in the script. Decided by the planner
  where nothing was discussed: no script gathers the inputs, a release has no unit in `changes/`, only 2.3.0 is
  backfilled, and `check-changes` and the freeze are unchanged.

  Not established: that `npm version` refuses a working tree that is not clean, which is from npm's documentation
  and is a task of the plan to try; that a blocked host keeps the sandbox from starting, which was read and not run;
  and anything about a real run of `./deploy.sh`, which needs the AWS account.

  For the human to decide, besides approval: the text of the 2.3.0 section and of the rule, both in the plan's
  approach; whether releases before 2.3.0 are backfilled too; whether `npm version` should also refuse a missing
  section; and whether committing the notes on `master` with no unit is acceptable. Status left at `draft` for the
  human's approval
- 2026-10-04T11:31:30Z [human] after the planner's report was put to them, with its questions on backfilling earlier
  releases, on a check in `npm version`, on committing the notes on `master` and on the other things left out,
  asked for the unit to be implemented. The human answered none of those questions separately, and did not say
  whether the texts in the plan's Approach had been read
- 2026-10-04T11:31:30Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role, in a session on the host,
  on Linux. Took the human's request as the approval of the spec and the plan as they are written, with everything
  under "Beyond the request" left out and the changelog and the rule in the wording the plan gives, as the human
  let the same reading stand for 0021, 0022 and 0023. That reading is the implementer's, and the human is told of
  it. The work is done in the planner's worktree, because the main checkout holds another branch,
  `task-0026-document-running-the-sandbox`, which is not this session's. The branch was first rebased onto
  `master` at `ab02eae`, which now holds 0024, without conflict, and `npm ci` installed release 2.3.0 there. The
  planner's commit is `b8e5b01` since. This record had no `## Amendments` heading, which the template has, and
  gets it with this entry
- 2026-10-04T11:34:59Z [Claude Code, anthropic/claude-opus-5-5] implemented the plan, in the commits from `e780081`
  to `b0dbc60`. Every task of the plan is ticked. The unit stays in-progress, since no review has been made. What was
  verified:
  * With the two fixture files alone, the suite reported 188 passing and 0 failing. The three refusal tests then
    failed before `deploy.sh` had the check, and the test of `files` failed before `package.json` listed the
    changelog. All pass after
  * The 2.3.0 section, before it was committed, against the repository: the units whose status differs between
    `v2.2.1` and `v2.3.0` are 0015, 0016, 0018, 0019, 0021, 0022 and 0023, each on a line of the section; the diff
    of the shipped files between the tags is the nine files the section's lines cover; the shipped paths hold 22
    files at `v2.2.1` and 23 at `v2.3.0`; the entrypoint parses both allowlists into one and stops with
    `allowlisted host <host> is not reachable` after three attempts; the Dockerfile installs `jq` and `git`; and
    the change check does not mention the "Beyond the request" section. The section is the plan's text unchanged.
    The human had not said whether that text was read
  * `npm version patch`, npm 11.11.0, in a scratch git repository with one commit and an uncommitted change:
    it printed `npm error Git working directory not clean.`, exited 1, and changed neither `package.json` nor
    the tags. The README's reason for a separate notes commit stands
  * The trial of the rule. A fresh agent session, given a throwaway worktree at `f7c0a15` and told only to read
    `AGENTS.md` and the README and to write the release notes for the next release, wrote a `## 2.3.1` section at
    the top of `CHANGELOG.md`, above 2.3.0, in the two parts, with a unit number on every line and a closing "Not
    in the package:" line. It found the tag `v2.3.0` and, by status, the one unit implemented since, 0024. It
    proposed patch, with its reason, and committed nothing and ran neither `npm version` nor `./deploy.sh`.
    Nothing from it is committed, and the worktree is removed
  * The trial showed two gaps in the rule's wording, changed in `b0dbc60`, in `AGENTS.md` and in the plan's Approach
    alike. The shipped diff held changes of this unit, which is not implemented, and the rule spoke only of a
    change with no unit: it now says to name such a change to the human, whose decision it is whether the release
    waits. And a task has no spec, where the rule said to read the spec and the record of each: it now says the
    documents each has. The agent's other remarks changed nothing: it wrote two lines under worth knowing where
    "Nothing." might have done, it counted the package's files from the tracked files because the rule names no
    command for that, and it could not tell its branch, the worktree being detached
  * On the host, on the tree of the commit that holds this entry, with this entry already written: `npm test`
    reported 192 passing and 0 failing. `npm pack --dry-run` lists 24 files, `CHANGELOG.md` among them.
    `git diff master -- process.md roles templates scripts container` is empty (R6). `bash -n deploy.sh` passes.
    No line of a file changed against `master` is over 120 characters and none holds an em dash.
    `npm run check-changes` exited 0 on that commit
  * Not run: `./deploy.sh` itself, which needs the AWS account and a release. Its first real use is the next
    release, the human's. The refusal is held by the suite's stubs only
- 2026-10-04T12:19:39Z [OpenCode, openai/gpt-6.1-sol] as reviewer, performed the first full review of
  `0025-release-notes` at commit `ea70ee9c7c931606e5552699308f9b1a80c0bba2`, against the merge base with master,
  `ab02eae43f4385b1cc035efc242e0ad25cb719bb`. No previous review was found; no delta base applies. Returned no
  finding labels on spec conformance, plan fidelity or code quality. Complete findings and verification evidence:
  `.reviews/0025-release-notes/2026-10-04T121732Z-full-ea70ee9-opencode.md`. Independently ran `npm test` twice,
  each with 192 passing and none failing or skipped, the targeted deploy/changelog tests with nine passing,
  `npm run check-changes`, packaging with 24 files including the changelog, shell syntax, the infrastructure type
  check, whitespace and scope checks. Cross-checked the backfill against the two tags, and reproduced the new tests'
  expected failures against historical content without editing reviewed files. Could not independently reconstruct
  the original test-first chronology, fixture-only suite run, removed fresh-agent trial, scratch `npm version`
  trial or human-only conversations. Checked npm's dirty-tree guard in memory, not through a real version command.
  No real AWS release, consuming-project install, live blocked-network sandbox, authentication, interactive status
  line or macOS check was performed, and `npm ci` was not rerun. The Task/subagent tool was unavailable, so the review
  was performed directly under the reviewer role
- 2026-10-04T12:36:47Z [human] on the review coming back with no findings, asked for the unit to be marked
  implemented. The human raised nothing against the implementer's reading of 11:31:30Z, that the request to
  implement was the approval of the spec and the plan as written
- 2026-10-04T12:36:47Z [Claude Code, anthropic/claude-opus-5-5] set the status to implemented: every task in `plan.md`
  is ticked, and the review returned no findings, so there is none to decide. The review ran in the worktree, so
  its findings file was written there, and is copied to `.reviews/0025-release-notes/` of the main checkout, since
  the worktree is removed once the branch is merged. `npm test` was run on the tree of the commit that holds this
  entry, with this entry already written, and reported 192 passing and 0 failing. `npm run check-changes` exited 0
  on that commit

## Amendments
