# 0035 Shared agent kit

## Approach

Build the kit repository first, from the merged best of the two existing role copies, and apply the role and process
corrections there so they are written once. Push it to Bitbucket, because `git subtree add` needs a remote with at
least one commit. Then vendor it here, delete the originals, and repoint the eight places that name them.

The kit is a second repository, so the work spans two trees. Tasks below say which. Commits in
`~/projects/agent-kit` are named in `record.md` by their message, since they are not reachable from this history.

Two sequencing rules matter. The kit's content is moved rather than rewritten, so each move is verified by the thing
that already tested it: the ported `check-changes` tests must pass unchanged before anything else touches that
script, and the sandbox suites must pass from the kit's container files before the project's originals are deleted.
And `changes/0033-agent-sandbox-container/` is frozen: this unit moves files that unit created, and edits neither its
`spec.md` nor its `plan.md`.

## Files

In `~/projects/agent-kit`, all new:

- `README.md`: what the kit is, how to vendor it into a project, how to pull an update, how to push one back
- `roles/planner.md`, `roles/implementer.md`, `roles/reviewer.md`: merged from both projects, then corrected
- `process.md`: the changes process and the code standards, lifted from this project's `AGENTS.md`
- `templates/changes/record.md`, `spec.md`, `plan.md`: from `changes/_templates/`
- `scripts/check-changes.mjs`: ported from `src/check-changes.ts`
- `tests/check-changes.test.mjs`: ported from `tests/unit/check-changes.test.ts`
- `package.json`: one `test` script running node's built-in runner, no dependencies
- `.gitignore`: the editor directory and `node_modules`, so neither reaches a project through the subtree
- `container/Dockerfile`, `container/entrypoint.sh`, `container/compose.yml`, `container/agent.sh`: from `agent/`
  and `agent.sh`, with the project-specific settings taken out of the Compose file

In this project:

- `agent-kit/`: new, the subtree
- `roles/`, `changes/_templates/`, `agent/Dockerfile`, `agent/entrypoint.sh`, `agent/compose.yml`,
  `src/check-changes.ts`, `tests/unit/check-changes.test.ts`: deleted, now in the kit
- `agent/compose.project.yml`: new, the Compose project name, the image name, the allowlist, the resource limits
  and the `PLAYWRIGHT_VERSION` build argument
- `agent.sh`: shrinks to a shim that execs the kit's wrapper
- `AGENTS.md`: keeps the project-specific sections, links to `agent-kit/process.md` and the kit's roles
- `.claude/agents/planner.md`, `implementer.md`, `reviewer.md`: one path each
- `opencode.json`: the three `{file:./roles/...}` prompts become `{file:./agent-kit/roles/...}`
- `package.json`: `check:changes` runs the kit's script
- `tests/unit/roles.test.ts`: new paths, plus the stale-reference check
- `README.md`: the sandbox section, a new note on updating the kit, and the maintenance guidance that said shared
  instructions belong in `AGENTS.md`
- `CLAUDE.md`: the same maintenance guidance, which named AGENTS files as the home of all instructions
- `.dockerignore`: its rules confirmed still correct for the build context, and its opening comment repointed at the
  Dockerfile's new path

## Tasks

Kit repository:

- [x] Initialize `~/projects/agent-kit` on `master` with the Bitbucket remote, and confirm the remote is empty (R1)
- [x] Copy in the three role files, taking finrite's wording where the two copies differ, and rewrite every
      project anecdote as a general rule. Diff both sources afterwards and account for every difference (R2, R4)
- [x] Move the changes process and the code standards out of this project's `AGENTS.md` into `process.md`, keeping
      the wording and the requirement strength, and leaving the project-specific sections behind (R2, R3)
- [x] Copy `changes/_templates/` to `templates/changes/` (R3)
- [x] Add the reviewer rule that a limitation recorded as a spec decision or in the record is reported once as a
      residual risk and never blocks, including against a process rule (R5)
- [x] Define in `roles/reviewer.md` what blocks: a spec requirement false under supported usage and the stated
      threat model, or a process rule broken with no recorded exception. Everything else reports without blocking
      (R6)
- [x] Make a re-review a delta review by default in `roles/reviewer.md`: verify the accepted findings, review the
      diff since the last reviewed commit, and say that a full re-review is the human's to ask for (R7)
- [x] Require in `roles/planner.md` that a unit making a safety or security claim states its adversary and its
      supported usage (R8)
- [x] Require in `roles/implementer.md` that a document claims only what was verified, and add the proposed-decline
      answer to a finding, which only the human turns into a decision (R9)
- [x] Change the gate in `process.md` to the human having decided every blocking finding (R10)
- [x] Port `src/check-changes.ts` to `scripts/check-changes.mjs` as dependency-free ESM, and its tests to
      `tests/check-changes.test.mjs`, changing the tests only where the import and the invocation path require it
      (R3, R15)
- [x] Add the kit's `package.json` with `node --test tests/*.test.mjs` and no dependencies, and confirm the ported
      tests pass before anything else changes the script (R3, R15)
- [x] Move `agent/Dockerfile`, `agent/entrypoint.sh`, `agent/compose.yml` and `agent.sh` into `container/`, keeping
      the harness version pins in the Dockerfile, and check whether the build context can be the kit directory or
      must stay the project root (R3, R14)
- [x] Take the Compose project name, the image name, the allowlist, the resource limits and the Playwright version
      out of `container/compose.yml`, leaving a base that a project layers over, and have `container/agent.sh` pass
      both files to Compose with `--project-directory` set to the project root, the project's file at a documented
      path (R14)
- [x] Add the kit's `.gitignore`, so that the editor directory does not travel into every project that vendors it
      (R11)
- [x] Write the kit's `README.md`: vendoring, `git subtree pull`, `git subtree push`, and that these are host
      commands (R18)
- [x] Push `master` to Bitbucket (R1)

This project:

- [x] Vendor the kit: `git subtree add --prefix agent-kit <remote> master --squash` (R11)
- [x] Repoint the harness wrappers: the three files under `.claude/agents/` and the three prompts in
      `opencode.json` (R13)
- [x] Point `check:changes` in `package.json` at `agent-kit/scripts/check-changes.mjs`, and confirm `npm test`
      still runs it (R15)
- [x] Write `agent/compose.project.yml` with the Compose project name, the image name, the allowlist, the resource
      limits and the Playwright version, and reduce `agent.sh` to a shim that execs the kit's wrapper (R14)
- [x] Extend `tests/unit/roles.test.ts` to resolve the role references at their kit paths and to fail on any
      reference to a moved file, then see it fail before the references are updated (R16)
- [x] Rewrite `AGENTS.md` to keep only the project-specific sections and link to `agent-kit/process.md` and the
      kit's roles, with nothing stated in both places (R12)
- [x] Delete `roles/`, `changes/_templates/`, `agent/Dockerfile`, `agent/entrypoint.sh`, `agent/compose.yml`,
      `src/check-changes.ts` and `tests/unit/check-changes.test.ts` (R3, R11)
- [x] Update `README.md`: the sandbox section for the split configuration, and a new note that kit updates are a
      host task (R18)

## Verification

- [x] `grep -ril 'norareit\|nora reit\|ritenoar' ~/projects/agent-kit --exclude=README.md` returns nothing (R2)
- [x] The kit's own suite passes: `npm test` in `~/projects/agent-kit` (R3)
- [x] `npm run test:unit` and `PORT=3100 npm test` pass on the host, the unit count lower only by the
      `check-changes` tests that moved to the kit (R17)
- [x] `npm run check:changes` still rejects an edited frozen `spec.md`, a deleted implemented unit and an
      implemented unit with an unticked task, checked by temporary local edits that are then reverted (R15)
- [x] `./agent.sh` from the repository root builds and starts the container, the firewall self-check passes, the
      canary is blocked, and the agent lands as uid 1000 with an empty capability set (R14)
- [x] Inside the sandbox on the migrated tree: `npm ci`, `npm run build`, `npm run test:unit` and
      `PORT=3100 npm test` all pass (R17)
- [x] `tests/unit/roles.test.ts` fails when a role reference is pointed back at the old `roles/` path, and passes
      on the migrated tree (R16)
- [x] Claude Code lists the three subagents and OpenCode resolves the three role prompts (R13)
- [x] A round trip: change a word in `agent-kit/roles/planner.md`, `git subtree push` it, pull it into a scratch
      clone, and confirm it arrives (R11)
- [x] `git subtree pull --prefix agent-kit <remote> master --squash` runs clean on an unchanged kit (R11)
- [x] `npm run check:changes` passes on the branch, and `changes/0033-agent-sandbox-container/spec.md` and
      `plan.md` are untouched by this branch's diff

## Commit Points

Reordered from the plan as written, and the last two merged, so that every commit leaves a tree whose own suite
passes. The stale-reference test requirement 16 asks for reads `AGENTS.md`, `README.md` and
`agent/compose.project.yml` together, so the documentation commit cannot be separated from the one that moves the
roles, and both have to follow the sandbox split. The kit's README is committed in the kit repository and arrives
here inside the subtree.

- [x] `feature-0035 Add the spec and plan for the shared agent kit`
- [x] `feature-0035 Record the kit build and amend the plan's Compose split` (the documents, before the code that
      follows them)
- [x] `feature-0035 Vendor the agent kit as a subtree` (the subtree add on its own, so its squashed import is
      reviewable apart from the migration)
- [x] `feature-0035 Split the sandbox between the kit and this project` (`compose.project.yml`, the shim, the
      deleted container files)
- [x] `feature-0035 Run the change check from the kit` (`package.json`, the deleted script and its tests)
- [x] `feature-0035 Move the roles and templates to the kit and document the split` (deletions, wrappers,
      `AGENTS.md`, the roles test, `README.md`)
- [x] `feature-0035 Point the Docker build context notes at the kit` (`.dockerignore` and the roles test, added
      during implementation; `record.md` logs why)
- [x] `feature-0035 Tick the plan and record the verification run`
- [x] `feature-0035 Record the sandbox verification on the migrated tree`
- [x] `feature-0035 Apply the first review's findings` (the kit Dockerfile comment, `AGENTS.md`, `README.md`,
      `CLAUDE.md`, and these documents)
- [x] `feature-0035 Record the review outcomes and the final suite run`

The entries above the sandbox split are the plan's own commit points. The ones below it are the record-keeping and
review-response commits the work actually needed, listed here so that this stays a true map of the branch.
