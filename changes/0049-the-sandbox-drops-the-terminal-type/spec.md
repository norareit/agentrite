# 0049 The sandbox drops the host's terminal type

## Context

OpenCode's colours are wrong in the sandbox and right on the host, in the same terminal. The human saw it in the
default Terminal app of macOS 15 and in tmux on Linux, and sent two screenshots from the Terminal app: OpenCode on
the host, which looks as its theme intends, and OpenCode in the sandbox, which does not.

A program in a terminal learns what the terminal can show from two environment variables: `TERM`, which names the
terminal, and `COLORTERM`, which a terminal that shows 24-bit colour may set to say so. The sandbox passes neither
from the host. Its commands get `TERM=xterm`, which Docker sets for a container it gives a terminal, and no
`COLORTERM`. That holds for the first command of a run and for a command of `--connect`.

OpenCode decides from those two how to send its colours. It sends 24-bit colour for a plain `xterm` and for a
`COLORTERM` of `truecolor`, and the 256-colour palette for a `TERM` that ends in `-256color` when `COLORTERM` says
nothing. So on a host whose terminal says `xterm-256color` and nothing more, as the Terminal app does, OpenCode sends
the palette on the host and 24-bit colour in the sandbox. A terminal that does not show 24-bit colour shows that
wrong.

Other programs in the sandbox read the same two variables, and are given the same wrong answer. Only OpenCode was
reported and checked.

## Observed behavior

In the sandbox, in the Terminal app of macOS 15.1.1, OpenCode 1.19.0 shows:

* The background of the session as the grey of the terminal's profile, where on the host it is the near black of
  OpenCode's theme
* The numbers of the lines of a diff on an olive background, and the text of the diff in a plain green, where the
  theme gives both a dark tint

A command in the sandbox prints `TERM=xterm`, no `COLORTERM`, and `8` for `tput colors`, where the shell on the host
that started it has `TERM=xterm-256color`.

The human reports the same in tmux on Linux, without a screenshot.

## Expected behavior

A command in the sandbox is told what the developer's terminal can show, as a command on the host in that terminal
is, and OpenCode in the sandbox looks as it does on the host.

## Steps to reproduce

On a macOS 15 host, in the Terminal app, in a project that installed the kit:

1. Run `opencode` on the host and see its colours
2. Run `./sandbox.sh --in-place`, and in the sandbox run `opencode`
3. Observe the grey background in place of the near black one, and once a diff is shown, the olive and green of
   its lines
4. In the sandbox, run `echo "$TERM [$COLORTERM]"; tput colors`, and observe `xterm []` and `8`

## Root cause

Docker gives a container that it gives a terminal `TERM=xterm`, unless it is told another. The wrapper starts a run
with `docker compose run`, from a service that asks for a terminal, and starts a command of `--connect` with
`docker exec --tty`. Neither passes `TERM` or `COLORTERM`: the run passes no variable of the host's terminal, and
`--connect` passes `HOME`, `USER`, `LOGNAME` and `PATH` alone.

What was reproduced, on the macOS host on `master` at `5dd13cd`, with Docker 24.0.7:

* In a run, started on a pseudo-terminal from a shell with `TERM=xterm-256color`, a command printed `TERM=[xterm]`,
  `COLORTERM=[]` and `8` for `tput colors`
* In a container of the sandbox's image, a command started with `docker exec --interactive --tty`, as `--connect`
  starts one, printed `TERM=[xterm]` and `COLORTERM=[]`
* OpenCode 1.19.0, started for seven seconds on a pseudo-terminal, sent its colours as follows. On the host, with
  `TERM_PROGRAM`, `TERM_PROGRAM_VERSION` and `COLORTERM` removed unless the row gives them:

  | `TERM`           | Other variables               | What OpenCode sent     |
  |------------------|-------------------------------|------------------------|
  | `xterm`          | None                          | 24-bit colour only     |
  | `xterm-256color` | None                          | The 256-colour palette |
  | `xterm`          | `TERM_PROGRAM=Apple_Terminal` | 24-bit colour only     |
  | `xterm-256color` | `TERM_PROGRAM=Apple_Terminal` | The 256-colour palette |
  | `xterm-256color` | `COLORTERM=truecolor`         | 24-bit colour only     |
  | `xterm`          | `COLORTERM=truecolor`         | 24-bit colour only     |
  | `tmux-256color`  | `TERM_PROGRAM=tmux`           | The 256-colour palette |

  In a run, the OpenCode of the image, which is 1.19.0 too, sent 24-bit colour only with `TERM=xterm` and the
  palette only with `TERM=xterm-256color`
* The image holds a description of `xterm`, `xterm-256color`, `tmux-256color` and `screen-256color`, and none of
  `xterm-direct`. In a run with `TERM=xterm-ghostty`, a name it holds no description of, `tput colors` printed
  `unknown terminal "xterm-ghostty"` and exited 3

What was not reproduced: how the Terminal app shows the 24-bit colour it is sent. That it shows it wrong is taken
from the human's screenshots, which show OpenCode right where it was sent the palette and wrong where it was sent
24-bit colour. Nor was tmux on Linux tried. There, the host's shell has a `TERM` of tmux's own, such as
`tmux-256color`, for which OpenCode sends the palette, and the sandbox replaces it with `xterm` as it does on macOS.
That this is what the human saw is likely and not shown.

## Fix

The wrapper passes the host's `TERM` and `COLORTERM` to the command, on a run and on `--connect`, as the shell that
started the wrapper has them. A command is then told what the developer's terminal says of itself, and OpenCode
chooses in the sandbox as it chooses on the host.

A `TERM` that names a terminal the image holds no description of is replaced with `xterm-256color`, because the
programs in the sandbox that look the name up would otherwise fail to start or fail to draw.

## Requirements

1. A command of a run, of a unit, of `--in-place` or of `--workdir`, has in its environment the `TERM` and the
   `COLORTERM` that the shell that started the wrapper has, when that `TERM` names a terminal the image holds a
   description of
2. A command of `--connect` has in its environment the `TERM` and the `COLORTERM` that the shell that started that
   `--connect` has, under the same condition. That is the shell of the `--connect`, not the one of the run
3. When that shell has no `COLORTERM`, the command has none either
4. When that shell's `TERM` names a terminal the image holds no description of, the command has
   `TERM=xterm-256color`, and the `COLORTERM` as requirement 3 says. The run or the command of `--connect` is not
   refused for it
5. When that shell has no `TERM`, the command has the `TERM` it has before this unit
6. The suite holds tests that fail when a run or a command of `--connect` is not given the host's `TERM` or
   `COLORTERM`, when a `COLORTERM` the host does not have is given, and when a `TERM` the image holds no
   description of reaches the command
7. In the Terminal app of macOS 15, OpenCode in the sandbox shows the colours it shows on the host: the background of
   its theme, and the tints of a diff. Shown by the human, and written in the unit's record with what was run
8. In tmux on Linux, OpenCode in the sandbox shows the colours it shows on the host in the same pane. Shown by the
   human, and written in the unit's record with what was run, or written there as not checked, with why
9. The table of the environment variables of `sandbox.sh` in `README.md` holds `TERM` and `COLORTERM`, and says what
   the sandbox does with each, the replacement of requirement 4 among it. It follows the rules that this
   repository's `AGENTS.md` gives for that document
10. `SANDBOX.md` says that a command in the sandbox is told the host's terminal type and colour support, and what it
    is told instead when the image holds no description of the host's terminal. Its list of what a command of
    `--connect` has as the first command has it names the two. It follows the rules that this repository's
    `AGENTS.md` gives for that document

## Decisions

* **The host's values are passed, and no value is fixed in the image.** The terminal is the developer's, and only
  the shell they run the wrapper from knows what it is. Rejected: setting `TERM=xterm-256color` in the image. It
  repairs the Terminal app and tmux, and makes a terminal that shows 24-bit colour, and says so with `COLORTERM`,
  get the palette, since `COLORTERM` would still be missing. Rejected as well: setting `COLORTERM=truecolor` in the
  image, which is what makes the Terminal app show OpenCode wrong
* **`TERM` and `COLORTERM`, and nothing else of the terminal.** They are what the programs that draw in a terminal
  read to learn what it shows. `TERM_PROGRAM` was tried and changed nothing of what OpenCode sends. See "Beyond the
  request"
* **An unknown `TERM` becomes `xterm-256color`.** A program that looks up a terminal the image holds no description
  of cannot use it: `tput` refuses with `unknown terminal`. The terminals that name themselves after their own
  program, as some recent ones do, would meet that where today they get `xterm`. `xterm-256color`
  is what most terminals emulate and what the image describes. Rejected: passing the name as it is, which breaks
  those programs. Rejected: falling back to `xterm`, as today, which is the cause of this bug for a terminal that
  shows the palette and not 24-bit colour. A terminal that shows 24-bit colour and says so with `COLORTERM` keeps
  it, since `COLORTERM` is passed beside the replacement
* **No `TERM` on the host keeps what the sandbox gives today.** A wrapper started without one is run by a script
  or a tool, not from a terminal a developer looks at, and nothing was reported of it
* **A command of `--connect` gets the values of its own shell.** It may be started from another terminal than the
  run, as `SANDBOX.md` describes, and draws in that one
* **The proof of what is seen is the human's.** What a terminal shows of what it is sent cannot be seen from the
  agent's shell, so requirements 7 and 8 are shown by the human in their own terminals. What the command is given
  is shown by the suite, under requirement 6
* **A bug, not a feature.** The sandbox loses what the developer's terminal says of itself, and a program that
  looks right on the host looks wrong in it. Nothing new is asked of the sandbox

## Non-goals

* The Terminal app's lack of 24-bit colour, which is the same on the host
* The configuration of tmux, such as whether it passes 24-bit colour on to the terminal it runs in
* OpenCode's theme, and its `"system"` theme
* Other variables that name or describe the terminal, such as `TERM_PROGRAM` and `TERM_PROGRAM_VERSION`
* A command that the sandbox runs without a terminal, which is told no terminal as before
* A section in `CHANGELOG.md`, which is written when a release is made

## Beyond the request

* **More terminal descriptions in the image, such as Debian's `ncurses-term`.** A terminal that names itself after
  its own program would keep its name in the sandbox, where it now gets `xterm-256color`. It costs some megabytes
  of image and a package to keep in the Dockerfile, and still leaves out a terminal newer than the list. Without
  it, such a terminal is drawn as an `xterm-256color`, which it emulates, and keeps 24-bit colour through
  `COLORTERM`
* **Passing `TERM_PROGRAM` and `TERM_PROGRAM_VERSION`.** Some programs use them to decide on features beyond
  colour, such as links or images in the terminal. It costs two more variables to pass and to describe. Without
  them, those programs take the terminal for a plain one of its `TERM`, as they do today
* **A notice when `TERM` is replaced.** It would tell the developer that their terminal's own name was not known.
  It costs a line on every start in such a terminal, for a replacement whose effect is mostly none. Without it,
  `echo $TERM` in the sandbox shows the replacement, and `SANDBOX.md` says why
