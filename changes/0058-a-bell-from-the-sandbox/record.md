---
kind: feature
status: draft
timestamp: 2026-10-19T15:47:39Z
---

# 0058 A bell from the sandbox

## Log

- 2026-10-19T15:47:39Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `8deabdd`, on the human's request to specify a scratch note: whether the bell they have Claude Code
  ring for tmux works inside the sandbox, and how it can be made to. Made the unit as a feature. Numbered 0058: the
  highest number in `changes/` is 0057. Read the hooks of the host's `~/.claude/settings.json` and the script
  `~/.local/bin/ring-bell`, `container/claude-managed-settings.json`, and "The status line" and "Where things are
  kept on the host" of `SANDBOX.md`, and Claude Code's documentation of the bell. Showed on the host that a bell
  written to `/dev/tty` by a process of another user than root, in a container of the sandbox's image and settings
  started with `docker compose run`, comes out on the host's side unchanged. Did not check Claude Code's own bell
  or a hook inside a sandbox, which needs a logged-in session; requirement 4 has the implementer check it. Wrote
  `spec.md`. The status is `draft`

## Amendments
