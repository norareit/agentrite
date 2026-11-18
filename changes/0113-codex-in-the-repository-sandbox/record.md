---
kind: task
status: draft
timestamp: 2026-11-18T16:32:36Z
---

# 0113 Codex in the repository's sandbox

## Task

This repository's `agentrite.json` names the harnesses `claude` and `opencode`, so the image of its sandbox holds
Claude Code and OpenCode alone, although the kit supports Codex as well. The repository is to use Codex too, so that
its sandbox holds all three harnesses of the kit, and work on the kit, such as unit 0110, can run Codex there.

* `harnesses` of the root's `agentrite.json` is `["claude", "opencode", "codex"]`, in the order of the kit's list of
  its harnesses
* The files the installed release's `refresh` writes for Codex at the root, run as `npm run kit -- refresh`, are
  committed: `.codex/config.toml` and the role wrappers in `.codex/agents/`. A second refresh then finds every file
  it writes up to date, as the test of the repository's own files checks
* "What the repository holds besides the package" of `CONTRIBUTING.md` lists `.codex/`, as it lists `.claude/` and
  `.opencode/`
* "The kit's own copy of the kit" of `CONTRIBUTING.md` says that the root's `agentrite.json` is the installed
  release's default file with the repository's own roles added. It also says that its `harnesses` adds `codex` to
  the default
* `api.openai.com` stays in the `ALLOWLIST` of `sandbox/compose.project.yml`, since OpenCode's reviewer needs it
  whatever Codex does. The kit admits Codex's own hosts itself

After the task, the human logs Codex in once in the sandbox, which no agent can do for them.

## Log

- 2026-11-18T16:32:36Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `e85001c`, on the human's request that this repository's sandbox hold Codex, which came up while
  deciding where unit 0110 is built. Numbered 0113: the highest number in `changes/`, on every local branch, is 0112.
  Read "The kit's own copy of the kit" and "Adding a harness" of `CONTRIBUTING.md`, "Another set of harnesses" of
  `SANDBOX.md`, the installed release's `scripts/harnesses/codex.mjs` and its default `agentrite.json`, and
  `tests/repository-own-files.test.mjs`. Wrote this record. The status is `draft`

## Amendments
