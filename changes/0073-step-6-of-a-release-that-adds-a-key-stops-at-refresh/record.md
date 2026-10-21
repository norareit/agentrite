---
kind: bug
status: in-progress
timestamp: 2026-10-21T20:47:18Z
---

# 0073 Step 6 of a release that adds a key stops at refresh

## Log

- 2026-10-21T20:47:18Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `beb0347`, on the human's request after step 6 of the release of 8.0.0 stopped at `refresh`, as it stopped
  after 7.2.0. Made the unit as a bug. Numbered 0073: the highest number in `changes/` is 0072. Read step 6 of
  `RELEASING.md`, the decisions of unit 0055, which gave the step its five commands and the settling of the
  instructions, the record of task 0062, and "Updating a project to a newer kit" of `README.md`. The observed run is the
  one task 0072 records. Did not run the new order, which requirement 5 asks of the implementer. Wrote `spec.md`. The
  status is `draft`
- 2026-10-21T23:11:52Z [human] approved the spec. The status is `approved`
- 2026-10-21T23:19:26Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, cut
  `bugfix-0073-step-6-of-a-release-that-adds-a-key-stops-at-refresh` from `master` at `12f7195` and wrote `plan.md`
  against it. The fix takes more than a couple of steps: the failure seen in a clone at `v8.0.0`, the reordering of
  step 6, and the dry run of the new order in that clone, each with what it printed logged. Case 1 of step 6 says
  the five commands and the commit "below" do what an instruction it takes as done asks; with the install now above
  the instructions, the plan rewords that to the commands of the step, each at its place, as requirement 2 gives.
  The status is `approved`
- 2026-10-21T23:23:55Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host,
  on the unit's branch at `26cb1d4`, began the work. The status is `in-progress`
- 2026-10-21T23:25:42Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, saw the failure before the fix.
  Cloned this repository into the scratchpad, outside it, and in the clone ran `git switch -C master v8.0.0`, at
  `3301f72`, and `npm ci`, which installed 7.3.0. The devDependency `agentrite` was `7.3.0` and `agentrite.json`
  had no `orchestrator`. `npm install --save-dev --save-exact agentrite@8.0.0` exited 0. `npm run kit -- refresh`
  printed `agentrite: agentrite.json: orchestrator is missing.`, followed by a sentence on what the key must hold,
  and exited 1, writing no file. Put the clone back with `git restore .` and `npm ci`, which exited 0, after which
  `git status --short` was empty and 7.3.0 was installed
- 2026-10-21T23:25:43Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, reordered step 6 of
  `RELEASING.md` and committed it as `96d0545`. `git diff master -- RELEASING.md` changes nothing outside step 6,
  and a comparison of the sorted lines before and after shows only the new sentences, the split of the command
  block and the rewording of case 1. `npm test` passed on that tree: 934 tests, 0 failed
- 2026-10-21T23:25:44Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, made the dry run of step 6 as
  `96d0545` gives it, in the same clone, on `master` at `3301f72` with 7.3.0 installed, for 8.0.0. The branch was
  `master` and `git status --short` empty. `npm view agentrite@8.0.0 version --prefer-online` printed `8.0.0`, and
  the install exited 0. The instructions of "Worth knowing when you update" of 8.0.0 were settled in their order:
  the line `"orchestrator": "node_modules/agentrite/orchestrator.json",` was added after `standards` in
  `agentrite.json` by case 3, and reading the file showed it there; `npx agentrite refresh`, with committing what it
  wrote, was taken as done by case 1; the other six bullets, on the status of the refusals of `./sandbox.sh`, the
  `.orchestrator` directory, the reviewer's own commit, branches of variants, how the orchestrator was checked and
  that no rebuild is needed, inform and ask nothing of a project. Then `npm run kit -- refresh` exited 0 and
  reported `.claude/agents/reviewer.md` and `.opencode/agents/reviewer.md` refreshed and its ten other files up to
  date; `npm test` exited 0 with 934 tests passed and 0 failed; `npm run check-changes` exited 0 and printed nothing
  past npm's header. The start of the sandbox was left out, as requirement 5 permits. `git status --short` held
  `package.json`, `package-lock.json`, `agentrite.json` and the two refreshed wrappers, and nothing else, and
  `git diff package.json` showed the one version, `7.3.0` to `8.0.0`. Committed them in the clone as
  `Depend on AgentRite 8.0.0` with the body the step asks for, but for the line on the sandbox, which says it was
  left out, pushed nothing, and removed the clone

## Amendments
