---
kind: feature
status: draft
timestamp: 2026-11-02T21:36:55Z
---

# 0091 One contract per harness

## Log

- 2026-11-02T21:36:55Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `40d502b`, on the
  human's request for a way to know every feature a harness must support before another harness is added, with the
  fix they chose: one module per harness implementing one contract, with a test that each harness implements all of
  it, and a checklist in `CONTRIBUTING.md` for what code cannot enforce. The human declined a script that runs the
  real harnesses, which is a non-goal. Numbered 0091: the highest number in `changes/`, on every branch, is 0090.
  Read `HARNESSES` of `scripts/agentrite-roles.mjs`, `STARTS` and `runUsage` of `scripts/agentrite-run.mjs`,
  `HEADLESS` of `scripts/agentrite-headless.mjs`, `scripts/agentrite-instructions.mjs`, the harness branches of
  `init` and `refresh` in `scripts/agentrite.mjs`, the spec of 0090, and searched the tree for `claude` and
  `opencode` for the places outside code. Wrote `spec.md`. The status is `draft`
- 2026-11-04T14:14:51Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `f271638`, on the
  human's request to bring the spec up to date with unit 0094, which split the README and added `diagrams/`. Searched
  `README.md`, `COMMANDS.md`, `ORCHESTRATOR.md`, `SETUP.md`, `SANDBOX.md`, `CONTRIBUTING.md` and `diagrams/` for
  `claude` and `opencode`, ignoring case: all five documents and the components diagram name the harnesses. The context
  names them, and the checklist of requirement 7 names the four documents beside `SANDBOX.md` and has an entry for the
  components diagram. The status is `draft`
- 2026-11-04T14:18:25Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master`, on the human's decision
  to take `BTR1`, which became requirement 10: the harness modules are in a directory of their own, and a test compares
  its files with the list of the harnesses. A decision says why the modules are found by their directory, and
  requirement 7 names the test of requirement 10 beside that of requirement 4. `BTR2` to `BTR4` are undecided. The
  status is `draft`
