---
kind: feature
status: in-progress
timestamp: 2026-09-27T22:45:28Z
---

# 0010 A command that sets up the kit in a project

## Log

- 2026-09-27T22:45:28Z [human] asked for a command, like `agent-kit-roles`, that sets up everything the kit needs in
  a project, with the README describing it. Raised that a project should own its `agent/compose.project.yml` once it
  is written, while a kit release may still need something in it
- 2026-09-27T22:45:28Z [Claude Code, anthropic/claude-opus-5-5] took the planner role and wrote `spec.md` and
  `plan.md`. A feature: the generated files, what happens to existing ones, and how a later release reaches a project
  all need decisions. The concern about releases is answered by keeping what every project needs in the kit, and
  having the wrapper check what only the project can supply. Making Playwright optional in the image is left as a
  non-goal. Status left at `draft` for approval
- 2026-09-27T22:53:11Z [human] asked for `AGENTS.md` and `CLAUDE.md` to be written always, whatever the
  harnesses, and, when `AGENTS.md` exists, for `init` to state clearly which of its sections, as in Norareit's, must
  be pasted into it
- 2026-09-27T22:53:11Z [Claude Code, anthropic/claude-opus-5-5] rewrote requirements 3 and 4 and added requirement 5
  for the notices, renumbering the rest, and added the decision and the plan tasks that go with them. Status left at
  `draft`
- 2026-09-27T22:55:11Z [human] agreed that what a project gets should live in template files in the kit rather
  than in the script
- 2026-09-27T22:55:11Z [Claude Code, anthropic/claude-opus-5-5] added requirement 15 for `templates/project/`, with
  the notice's sections cut from the `AGENTS.md` template, renumbered the README and test requirements to 16 and 17,
  and added the decision, the template task and the checks that go with it. Status left at `draft`
- 2026-09-30T10:05:36Z [human] approved `spec.md` and `plan.md` as they stand at `1f9c89e`, and asked for the unit to
  be implemented. Status `approved`
- 2026-09-30T10:05:36Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role. Status `in-progress`
- 2026-09-30T10:12:00Z [Claude Code, anthropic/claude-opus-5-5] added a task and two files to `plan.md`: the
  allowlist test cuts `parse_allowlist` out of the shipped entrypoint exactly as the home-owner test cuts
  `check_home_owner`, so that extraction moves into a shared test helper rather than being written twice
- 2026-09-30T10:37:22Z [human] decided the kit supports npm projects only for now. pnpm, Yarn and Bun keep no
  `package-lock.json`, and the image build installs from it, so `init` and the sandbox both assume npm. A project
  without a `package-lock.json` gets what requirement 8 describes. Other package managers are taken on when a project
  needs one
- 2026-09-30T10:37:22Z [Claude Code, anthropic/claude-opus-5-5] raised a case the spec leaves open: a `package.json`
  with no `name`, from which requirement 7 cannot derive the Compose names. `npm install` in a directory without a
  `package.json` is expected to write one like that; not checked here. Proposed, for the human to confirm: `init`
  validates `package.json` before writing anything, and stops with an error naming the file, exiting non-zero, when it
  is unreadable or has no `name`. That is an exit requirement 14 does not list
- 2026-09-30T10:41:19Z [Claude Code, anthropic/claude-opus-5-5] implemented `init` with the proposal above for a
  `package.json` without a `name`: it is refused before anything is written, with exit 1, and a test pins that. It stays
  a proposal until the human decides it. `scripts/agent-kit.mjs` repeats `isMain` from `agent-kit-roles.mjs` rather than
  sharing it, because sharing would change `agent-kit-roles.mjs`, which the spec's decisions leave as it is. A later
  unit could move it into a module both import
- 2026-09-30T10:46:00Z [Claude Code, anthropic/claude-opus-5-5] added a task to `plan.md` for a flaw the verification
  run found in the R12 check: when Compose refused the project's file, for example with `args:` left empty, the wrapper
  still piped Compose's empty output into `node`, which printed a JSON stack trace under Compose's error. The
  configuration is now captured before it is read. The regression test failed before the fix and passes after it
- 2026-09-30T10:46:46Z [Claude Code, anthropic/claude-opus-5-5] ran the verification on `14d0976`. `node --test
  tests/*.test.mjs` in the `node:22` image (Node 22.23.3, bash 5.2) passed 132 of 132 with none skipped. `npm test` on
  the macOS host (Node 22.9.0, bash 3.2) passed 115, skipped 12 and failed 1: the skips are the allowlist and home-owner
  tests, which need bash 4 and GNU `stat`, and the failure is `tests/record-name.test.mjs`, which imports a `.ts` file
  that Node 22.9 cannot load and which failed the same way on `0f10ffc`, before the unit's code changes; this unit does
  not touch it or `infra/`. `npm pack --dry-run` lists `scripts/agent-kit.mjs` and the four files in
  `templates/project/`. In a scratch project with `playwright@1.59.1`, `npx agent-kit init claude` from the packed kit
  wrote every file and exited 0, and its `ALLOWLIST` held comments only. For the build, the kit was unpacked into
  `node_modules` rather than kept in the lockfile, because the image's `npm ci` cannot reach a local tarball path, which
  a project installing by URL never has. `./agent.sh true` then built the image, the entrypoint verified the firewall
  with only the kit's hosts listed, and `true` ran as the agent, exit 0. Against real Compose, a project file without
  `PLAYWRIGHT_VERSION` stopped with the kit's message, exit 2. `npm run check-changes` passed. Not checked: OpenCode in
  the sandbox, and `init` run through pnpm, Yarn or Bun
- 2026-09-30T10:46:46Z [Claude Code, anthropic/claude-opus-5-5] every task in `plan.md` is ticked. The unit is ready for
  review, and stays `in-progress` until the review's findings are decided. Open for the human: the proposal above on a
  `package.json` without a `name`
- 2026-09-30T10:50:23Z [Claude Code, anthropic/claude-opus-5-5] reran `npm test` on the macOS host on `bd70e9e` with
  Node 26.9.0, switched to with nvm at the human's request: 132 tests, 120 passed, 12 skipped, none failed, exit 0. The
  `tests/record-name.test.mjs` failure logged above is Node 22.9's alone. The 12 skips are the same bash 4 and GNU
  `stat` ones, which pass in the Linux container
