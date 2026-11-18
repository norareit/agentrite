---
kind: task
status: implemented
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
- 2026-11-18T16:33:42Z [human] approved the record. The status is `approved`
- 2026-11-18T16:38:13Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host,
  began the work on `master` at `a231c6b`, and not on a branch of the task, as the human asked. The status is
  `in-progress`
- 2026-11-18T16:39:28Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host,
  committed the work in `4c5296a`. `harnesses` of `agentrite.json` names `codex` after the two. The installed
  release's `refresh` wrote the six wrappers in `.codex/agents/` and does not write a missing `.codex/config.toml`,
  which `init` writes. Rather than run `init` over the whole root, the file was written by the installed release's
  `instructions.init` of its Codex module, the text `init` writes for a missing file. "What the repository holds
  besides the package" lists `.codex/`, "The kit's own copy of the kit" says that `harnesses` adds `codex` to the
  default, and "Adding a harness" names `.codex/` among the repository's own files. `npm test` passes, 1907 tests,
  on `4c5296a`, and `npm run kit -- refresh` there prints `up to date` for every file it writes. The image of the
  sandbox, which the wrapper builds again at its next start, and a run of Codex in it were not tried. The status
  stays `in-progress`
- 2026-11-18T16:41:44Z [human] reviewed the work in `4c5296a` and approved it, with no findings
- 2026-11-18T16:41:44Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, set the status on the human's approval of the
  work. The status is `implemented`

## Amendments
