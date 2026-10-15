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
- 2026-10-14T22:20:38Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, rebased the branch onto
  `master` at `51f8877`, which holds unit 0051 and with it a sandbox that starts on Docker 29, on the human's
  request. No conflict. The six commits of the unit are now `233a53b` to `534d0cc`; the entries above name the
  commits they were written on, `e739b04` and `917f3fe` among them, which the branch no longer holds. On
  `534d0cc`: `npm test` on the macOS host reports 568 tests, 551 passing, 17 skipped, the same seventeen, and none
  failing, and `npm run check-changes` exits 0.
  The checks that were blocked, run on `534d0cc` with the working copy's sandbox, each on a pseudo-terminal from
  `script -q /dev/null`, with a command that prints `[${TERM-unset}] [${COLORTERM-none}]`:
  `./sandbox-dev.sh --in-place` from a shell with `TERM=xterm-256color` and no `COLORTERM` printed
  `[xterm-256color] [none]`; with `TERM=xterm-256color COLORTERM=truecolor`, `[xterm-256color] [truecolor]`; with
  `TERM=xterm-ghostty COLORTERM=truecolor`, `[xterm-256color] [truecolor]`; with neither, `[xterm] [none]`, as
  before the unit. With `./sandbox-dev.sh 0049 sleep 150` under way, `./sandbox-dev.sh --connect 0049` from a
  shell with `TERM=xterm-ghostty` and no `COLORTERM` printed `[xterm-256color] [none]` as `agent`, and from one
  with `TERM=tmux-256color COLORTERM=truecolor`, `[tmux-256color] [truecolor]` as `agent`.
  `./sandbox-dev.sh --in-place npm test` reports 568 tests, 568 passing, none skipped or failing, on Linux. It
  stands in the plan in place of `./sandbox.sh --in-place npm test`: the installed release does not start on
  Docker 29 until a release holds unit 0051.
  R7: the human ran `./sandbox-dev.sh --in-place opencode` in the Terminal app of macOS 15, beside `opencode` on the
  host, and saw OpenCode in the sandbox as on the host: the near black background of its theme, and the dark tints
  of a diff where the olive and the green were. Written as the human reported it
- 2026-10-14T22:35:57Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, reviewed unit 0049 at
  `f00e3347ed1fa9a07d38a564d3897474722bdc05` in a full review against merge base
  `51f8877c12a00a21cc5c53b00f4d4b32301a168b`. Returned `S1` and `S2`. Saved the complete findings in
  `.reviews/0049-the-sandbox-drops-the-terminal-type/2026-10-14-223432-full-f00e334.md`.
  Independently ran `npm test`: 568 tests, 551 passing, 17 expected skips; the Linux suite through
  `./sandbox-dev.sh --in-place npm test`: all 568 passing; and `npm run check-changes`: exit 0. Ran the live
  connection-environment and retained-image checks described in the findings. R7 was not independently observed;
  R8 remains unchecked as already recorded. Historical red-test ordering and a normal old-image run past its
  pre-existing IPv6 failure could not be verified
- 2026-10-15T16:27:33Z [human] decided the two blocking findings of the review. S1 is accepted: a command of `--connect`
  is to have no `TERM` or `COLORTERM` that its own shell lacks, and the `TERM` it had before the unit when its shell has
  none. S2 is declined: an image built before this unit holds no `known-terminal.sh`, and the wrapper does not build it
  again by itself, as it does not for any change to what goes into the image. The release that holds this unit needs a
  rebuild of the image, `./sandbox.sh --in-place --rebuild true`, which its release notes name under "Worth knowing when
  you update", as those of 0041 and 0042 did
- 2026-10-15T16:27:33Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, added the tasks of S1 to the plan.
  Docker keeps the `--env` of a `run` in the container's settings, and a `docker exec` that gives no value of its own
  inherits it; it cannot remove one. Shown with containers of the image built from `f00e334`: one started with
  `TERM=tmux-256color` and `COLORTERM=truecolor` gave `docker exec` with nothing passed `[tmux-256color] [truecolor]`,
  with a terminal and without one, and with `--env TERM= --env COLORTERM=` gave `[] []`; one started as before the unit
  gave `docker exec` `[xterm] [unset]` with a terminal and `[unset] [unset]` without one. The status stays `in-progress`
- 2026-10-15T16:35:55Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, applied S1 on `18ff857`: `--connect`
  gives the command `--env TERM=<value> --env COLORTERM=<value>` in every call, the value of its own shell or empty for
  one it lacks, and `TERM=xterm` for a `TERM` it lacks on a terminal; `known-terminal.sh` removes an empty `TERM` and an
  empty `COLORTERM`; a run gives as before. Checked with the working copy's sandbox, on `18ff857`: `./sandbox-dev.sh
  0049 sleep 180` started from a shell with `TERM=tmux-256color COLORTERM=truecolor`, whose container `docker inspect`
  showed with `TERM=tmux-256color` and `COLORTERM=truecolor` in its settings, and `./sandbox-dev.sh --connect 0049` with
  a command that prints its environment's `TERM` and `COLORTERM` as JSON, on a pseudo-terminal from `script -q
  /dev/null` unless said: from `TERM=xterm-256color` and no `COLORTERM`, `{"TERM":"xterm-256color","COLORTERM":null}`;
  from neither, `{"TERM":"xterm","COLORTERM":null}`; from `TERM=xterm-ghostty` and no `COLORTERM`,
  `{"TERM":"xterm-256color","COLORTERM":null}`; from `TERM=xterm-256color` and an empty `COLORTERM`,
  `{"TERM":"xterm-256color","COLORTERM":null}`; from `TERM=xterm-256color COLORTERM=24bit`,
  `{"TERM":"xterm-256color","COLORTERM":"24bit"}`; and from neither without a terminal,
  `{"TERM":null,"COLORTERM":null}`. The run ended with exit 0 and left no clone and no `sandbox/` ref. On `18ff857`:
  `npm test` on the macOS host reports 572 tests, 555 passing, 17 skipped, the same seventeen, and none failing;
  `./sandbox-dev.sh --in-place npm test` reports 572 tests, 572 passing, none skipped or failing, on Linux, the test of
  `--connect` on a terminal among them; `npm run check-changes` exits 0. The status stays `in-progress` until S1 is
  reviewed
