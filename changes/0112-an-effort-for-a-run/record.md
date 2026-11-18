---
kind: feature
status: implemented
timestamp: 2026-11-18T15:19:51Z
---

# 0112 Give a run of a harness an effort

## Log

- 2026-11-18T15:19:51Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `26438ef`, on the human's request for a feature unit that adds an optional effort to a run, and that
  makes how a harness takes it part of what adding a harness takes. Numbered 0112: the highest number in `changes/`,
  on every local branch, is 0111. Read the section of `agentrite run` of `COMMANDS.md`, "The definition" and "How a
  run ends" of `ORCHESTRATOR.md`, "Adding a harness" of `CONTRIBUTING.md`, `harnessCommand` of
  `scripts/agentrite-run.mjs`, the harness contract and the three modules of `scripts/harnesses/`, and the help of
  the installed `claude`, `opencode run` and `codex` for their options of an effort. Wrote `spec.md`. The status is
  `draft`
- 2026-11-18T16:18:33Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `8523b8e`, on the
  human's decisions on the spec: R4 now refuses `--effort` without `--model`, since a level is meant for a known
  model, with the decision that says why. The human took BTR1 with levels of their own, `medium` for the planner on
  Opus and the implementer on Sonnet and `high` for the reviewer on GPT Sol, which is now R14, with its decision, its
  place in R13 and its test in R15, and the non-goal it contradicted removed. The human declined BTR2. The status is
  `draft`
- 2026-11-18T16:20:55Z [human] approved the spec. The status is `approved`
- 2026-11-18T21:46:01Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a step of the orchestrator, on
  `feature-0112-an-effort-for-a-run` at `43e0279`, wrote `plan.md`: a member `start.effort` of the harness contract
  in each module, `--effort` of `agentrite run`, `effort` of a step, its place in the lines, the end report and
  `agentrite runs --json`, the efforts of the default definition, and the documents, in three commits. Every
  requirement has a task. The status is `approved`
- 2026-11-18T22:00:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, in a step of the orchestrator, on
  `feature-0112-an-effort-for-a-run`, began the work. The status is `in-progress`
- 2026-11-18T22:40:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, on
  `feature-0112-an-effort-for-a-run`, built every task of `plan.md` in the three planned commits, `425ea6c`, `8108dda`
  and `af96363`. Two readings that the spec leaves one way: `--effort` without `--model` exits 2 with the usage, as
  every other refusal of the arguments of `run` does, where the plan's task wrote exit 1, and the example block of
  `ORCHESTRATOR.md` is in the second commit with `orchestrator.json`, since a test of the package documents compares
  the two. In the tests of the orchestrator and of `agentrite runs`, the default definition without its efforts stands
  in for the tests of a step with no effort, and the kit's own file for the tests of an effort. `npm test` reported 1911
  passing and 0 failing on the tree of `af96363`, which differs from the one tested only by the ticks of `plan.md`, and
  `npm run check-changes` passed on the committed branch. Not checked: the three harnesses themselves, which take the
  arguments of R2 only as the unit tests and the fake harnesses show. The status is `in-progress`
- 2026-11-18T22:08:36Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, fully reviewed unit 0112 at `3c014ef`
  against merge base `43e0279` with `origin/master`. No findings on spec conformance, plan fidelity or code quality.
  Saved the review in `.reviews/0112-an-effort-for-a-run/review-2026-11-18T220836Z.md`. Independently ran `npm test`:
  1911 passing, 0 failing, 34 Docker-dependent tests skipped; `npm run check-changes` passed. Live model sessions in
  the three harnesses and the Docker-dependent tests were not verified. The status remains `in-progress`
- 2026-11-18T23:54:14Z [Claude Code, anthropic/claude-opus-5-5] on the human's request, with every task of `plan.md`
  ticked and the review of `3c014ef` without findings, set the unit to implemented. The status is `implemented`

## Amendments
