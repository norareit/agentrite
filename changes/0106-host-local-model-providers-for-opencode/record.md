---
kind: feature
status: draft
timestamp: 2026-11-10T11:54:10Z
---

# 0106 OpenCode in the sandbox is given the host's local model providers

## Log

- 2026-11-10T11:54:10Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `718bc87`, on the
  human's request to have OpenCode in the sandbox use the local model provider of the host's OpenCode configuration.
  The human decided that only the local providers cross, of each the keys the spec names, that OpenCode alone is
  covered, and that what else a developer wants in the sandbox, an API key among it, they set in the home volume.
  Read "The local model server", "What the sandbox defends against" and "Where things are kept on the host" of
  `SANDBOX.md`, the sandbox members of `scripts/harnesses/opencode.mjs` and `scripts/harnesses/claude.mjs`, the host
  reader of `scripts/agentrite-sandbox.mjs`, and the precedence and file names of OpenCode's configuration in its
  documentation at https://opencode.ai/docs/config/. Wrote `spec.md`. The status is `draft`

## Amendments
