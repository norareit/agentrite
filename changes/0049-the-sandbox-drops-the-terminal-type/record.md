---
kind: bug
status: in-progress
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
- 2026-10-14T20:46:11Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the macOS host, cut
  `bugfix-0049-the-sandbox-drops-the-terminal-type` from `master` at `1a7baac`, which holds unit 0050, and wrote
  `plan.md` against it. A plan, since the fix is two pieces with tests and documents: the wrapper passes the host's
  `TERM` and `COLORTERM`, and a script in the image replaces a `TERM` it holds no description of, which the
  entrypoint and `--connect` both run the command through. Every requirement has a task and every task traces to
  one. The status is `planned`
- 2026-10-14T20:57:49Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the macOS host,
  began on `e739b04`. The status is `in-progress`
- 2026-10-14T21:06:31Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, extended the plan's
  approach: the wrapper first passed `TERM` whenever its value was not empty, and 78 tests failed, each with a
  `--env TERM=dumb` that no test had asked for. Bash gives a shell started without `TERM` an unexported
  `TERM=dumb` of its own, shown with `env -i bash -c 'declare -p TERM'`, which printed `declare -- TERM="dumb"`
  with bash 3.2.57 on the macOS host and with bash 5.2.15 in the image. So the wrapper asks `declare -p` whether
  each variable is exported, and passes it only then. Written into the plan's approach
- 2026-10-14T21:09:19Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, moved the sentences of
  `README.md` and `SANDBOX.md` on a `TERM` the image does not describe from the first group of tasks to a new
  task of the second, which makes them true, so that no commit describes what it does not do. Written into the plan
- 2026-10-14T21:20:20Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, extended the plan twice
  in the second group. `tests/sandbox-dev.test.mjs` holds the call of `--connect` too, which the plan did not name,
  and failed once the call ran the command through the script; it now expects the script. The tests of the script
  print with node and not with `sh`, and their stand-in `infocmp` knows `dumb`: `/bin/sh` of macOS is bash, which
  gave the test with no `TERM` a `TERM=dumb` of its own. In the image, `/bin/sh` is dash, which gives none, and
  `infocmp dumb` succeeds there: `docker run` of the image printed `/bin/sh -> dash`, `[unset]` for
  `${TERM-unset}` and `has dumb`, and `ncurses-base` and `ncurses-bin` are Essential in it. Written into the plan
- 2026-10-14T21:25:06Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, on `917f3fe` on the
  macOS host: `npm test` reports 563 tests, 546 passing, 17 skipped, the same seventeen as before the unit, and none
  failing; `npm run check-changes` exits 0.
  Blocked: the checks of the last group of tasks need a sandbox that starts, and none does on this host. Docker was
  updated here during the day, from 24.0.7 to 29.8.2, and since then the entrypoint stops at the local model
  server with `iptables v1.8.9 (nf_tables): host/network 'fdc4:f303:9324::254' not found`, because
  `getent hosts host.docker.internal` in a container on the Compose network now prints `fdc4:f303:9324::254`, an
  IPv6 address, which the entrypoint hands to `iptables`. The installed release's `./sandbox.sh --in-place` stops
  in the same way, so it is not of this unit, and it is left to a unit of its own.
  Checked instead, without the entrypoint, in the image that `./sandbox-dev.sh` built from `917f3fe`, each on a
  pseudo-terminal with `docker run -t`: with no `--env TERM` a command has `TERM=xterm`, and with
  `--env TERM=xterm-256color` it has `xterm-256color`, so a TERM the wrapper passes stands above Docker's. The
  image holds `/usr/local/bin/known-terminal.sh`, executable. Run as the agent through it, with `TERM` and
  `COLORTERM` as given, a command printed: `xterm-256color` and none gave `[xterm-256color] [none] colors=256`;
  `xterm-256color` and `truecolor` gave `[xterm-256color] [truecolor] colors=256`; `tmux-256color` and none gave
  `[tmux-256color] [none] colors=256`; `xterm-ghostty` and `truecolor` gave `[xterm-256color] [truecolor]
  colors=256`; `xterm-ghostty` and none gave `[xterm-256color] [none] colors=256`; and with neither and no
  terminal, `[unset] [none]`.
  Not checked: a run or a `--connect` through the wrapper end to end, OpenCode in the Terminal app (R7), and tmux on
  Linux (R8), which the human has said cannot be checked in the coming days for want of a Linux machine. The tasks
  of the last group stay open, and the status stays `in-progress`
