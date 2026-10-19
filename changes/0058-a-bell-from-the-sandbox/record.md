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
- 2026-10-19T18:53:01Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's question whether
  every other key of `agentrite.json` is not required. The specifier agreed that the optional key went against the
  decision of unit 0054 to keep every key required, and that a misspelled key would go unnoticed; the human decided
  that `bell` is required. Changed `spec.md`: requirements 6 to 8 make `bell` required, and a start refuses a file
  that lacks it; requirements 1, 11, 13 and 14 follow; the decision on the first optional key is replaced by one on
  a required key, and one on the default the written file gives. The status is `draft`

## Amendments
