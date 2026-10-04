---
kind: feature
status: draft
timestamp: 2026-10-04T11:19:40Z
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
