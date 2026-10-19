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
- 2026-10-19T18:44:10Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's answer that a bell
  set once per home volume, and so once per project, is not easy enough, and that OpenCode is to ring as well. Read
  the human's OpenCode plugin `~/.config/opencode/plugins/ring-bell.js` and OpenCode's documentation of plugins of
  2026-10-19, which names the events `session.idle` and `permission.asked` and no bell of OpenCode's own, how
  `container/sandbox.sh` mounts the status line and reads `agentrite.json`, and how
  `scripts/agentrite-settings.mjs` judges that file. Offered three ways; the human chose a bell that is on by
  default, and a setting in `agentrite.json` rather than a variable of the environment to turn it off. Rewrote
  `spec.md`: the kit rings in the sandbox for both harnesses at the moments of the human's own hooks and plugin, a
  project turns it off with the optional key `bell`, which a start reads alone, and `init` and `config` write it.
  Removed the decision that the kit sets no bell, and the non-goal of OpenCode. The status is `draft`

## Amendments
