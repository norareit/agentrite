---
kind: bug
status: approved
timestamp: 2026-10-14T12:22:07Z
---

# 0049 The sandbox drops the host's terminal type

## Log

- 2026-10-14T12:22:07Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the macOS host,
  on `master` at `5dd13cd`, on the human's request for a bug unit for OpenCode's colours in the sandbox, which they
  saw in the Terminal app of macOS and in tmux on Linux, with two screenshots from the Terminal app. Made the unit
  as a bug. Numbered 0049: the plain directories run from 0001 to 0048, and `origin` holds no unit past 0048.
  Read the role file and `process.md` as installed under `node_modules/agentrite`. Read besides: the parts of the
  wrapper that start a run and a command of `--connect`, the base compose file, the table of `sandbox.sh` in
  `README.md` and the section of `--connect` in `SANDBOX.md`.
  Reproduced on macOS 15.1.1 with Docker 24.0.7 and OpenCode 1.19.0, as the spec's "Root cause" gives: the
  `TERM=xterm` and missing `COLORTERM` of a run and of `docker exec --tty`, what OpenCode sends for each `TERM`
  and `COLORTERM` on the host and in a run, the image's terminal descriptions, and `tput` on an unknown `TERM`.
  Not reproduced: how the Terminal app shows 24-bit colour, which is taken from the screenshots, and anything on
  tmux on Linux. Wrote `spec.md`. The status is `draft`
- 2026-10-14T20:43:46Z [human] approved the spec. The status is `approved`
