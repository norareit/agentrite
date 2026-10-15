# 0049 The sandbox drops the host's terminal type

## Approach

Two pieces, one on each side of Docker.

**The wrapper passes the two variables.** `container/sandbox.sh` builds one array of flags from its own environment,
before the block of `--connect`: `--env TERM=<value>` when `TERM` is in the wrapper's environment and not empty,
and `--env COLORTERM=<value>` when `COLORTERM` is. With neither, the array is empty and every call is the one it is
today, which is what keeps requirement 5 and every existing test as they are. Whether a variable is in the
environment is asked of `declare -p`, which marks an exported one with `-x`: bash gives a shell started without
`TERM` an unexported `TERM=dumb` of its own, so a value alone does not say that the host has one.

The array goes into the three calls that start a command:

* The `docker exec` of `--connect`, after its `--env PATH=...`
* The `compose run` of `--in-place` and `--workdir`, after `--rm`
* The `compose run` of a unit run, after `--name <container>`

A variable given to `run` or `exec` with `--env` stands above the `TERM=xterm` that Docker sets for a container with
a terminal, so nothing else is needed for a known `TERM`. The flags carry the value, `TERM=<value>`, and not the bare
name: the recorded calls of the stand-in `docker` then show what was passed, and Compose's reading of a bare name is
not relied on.

**The image replaces a `TERM` it holds no description of.** Only the image knows which descriptions it holds, so this
happens in the container, in one place that both paths go through: a new POSIX `sh` script,
`container/known-terminal.sh`, installed at `/usr/local/bin/known-terminal.sh`. It is

```sh
if [ -n "${TERM:-}" ] && ! infocmp "$TERM" >/dev/null 2>&1; then
  TERM=xterm-256color
  export TERM
fi
exec "$@"
```

with a header comment that says why, in the manner of the other files of `container/`. `infocmp` is of
`ncurses-bin`, which Debian installs in every image, and it exits non-zero for a name it has no description of; the
spec's "Root cause" ran it in the image. `COLORTERM` is not touched, so a terminal that says it shows 24-bit colour
keeps saying so beside the replacement.

* The entrypoint's last line becomes `exec setpriv --reuid=agent --regid=agent --init-groups --
  /usr/local/bin/known-terminal.sh "$@"`, so the check runs as the agent, after the drop, as the command does
* `--connect` runs `docker exec ... <container> /usr/local/bin/known-terminal.sh <command>`, with `bash` as the
  command when none is given, as today
* The Dockerfile copies the script beside the entrypoint and makes it executable

The script is POSIX `sh` and not bash, so its tests run on a macOS host with bash 3.2 and need no skip. They run it
with a stand-in `infocmp` on the PATH that knows the names a test gives it.

The test that holds `--connect` against what the first command gets reads the script's path from the entrypoint's
`exec` line, and a new test holds that the Dockerfile installs `container/known-terminal.sh` at that path.

## Files

- `container/sandbox.sh`: the array of terminal flags and its comment; the flags in the three calls; the script in
  front of the command of `--connect`; the header comment and the comment of `--connect`, which list what a command
  is given
- `container/known-terminal.sh`: new, executable, as above
- `container/entrypoint.sh`: the last line runs the command through the script; the comment above it says so
- `container/Dockerfile`: copies the script to `/usr/local/bin/known-terminal.sh` and makes it executable, in the
  instructions that install the entrypoint, and says why in the comment there
- `tests/sandbox-wrapper.test.mjs`: tests of `--in-place` and `--workdir` with the host's variables
- `tests/sandbox-unit-run.test.mjs`: tests of a unit run and of `--connect` with the host's variables; `connectCall`
  and the test of what the first command gets take the script into account
- `tests/known-terminal.test.mjs`: new, the script's own tests and the Dockerfile's install of it
- `tests/sandbox-dev.test.mjs`: the call of `--connect` that the dev shim's test expects runs the command through the
  script. Added during the work: the plan missed that this test holds the call too
- `README.md`: two rows in the table of the environment variables of `sandbox.sh`
- `SANDBOX.md`: a paragraph in "Running a unit", and the bullet of `--connect` that lists what the command has as the
  first command has it
- `changes/0049-the-sandbox-drops-the-terminal-type/record.md`: the log of the work and the verification

No file is added at the root of the repository and nothing changes in the package's list of files, `container/`
being in it whole, so neither table of "What is here" changes.

## Tasks

### The wrapper passes `TERM` and `COLORTERM`

- [x] In `tests/sandbox-wrapper.test.mjs`, give `runCommand` a way to put the terminal flags after `--rm`, as a
  string that defaults to empty, so that every existing caller is unchanged. Add tests, each run with `runWith` and
  the variables in `env`: `--in-place` with `TERM=xterm-256color` and `COLORTERM=truecolor` records `run --rm --env
  TERM=xterm-256color --env COLORTERM=truecolor --volume ...`; `--workdir` with the same records the same flags; a
  host with `TERM=xterm-256color` and no `COLORTERM` records only the `TERM` flag; a host with an empty `COLORTERM`
  records no `COLORTERM` flag; a host with `COLORTERM=truecolor` and no `TERM` records only the `COLORTERM` flag.
  Run them and see them fail (R1, R3, R5, R6)
- [x] In `tests/sandbox-unit-run.test.mjs`, give `unitRun` and `connectCall` the same way to take the terminal flags:
  after `--name <container>` in the unit run's `run`, and after `--env PATH=...` in the `exec`. `run` there already
  takes `env`. Add tests: a unit run with `TERM=xterm-256color` and `COLORTERM=truecolor` records both flags; a
  `--connect` with the same records both; a `--connect` with `TERM=tmux-256color` and no `COLORTERM` records only the
  `TERM` flag. Run them and see them fail (R1, R2, R3, R6)
- [x] In `container/sandbox.sh`, build the array of flags before the block of `--connect`, with a comment that says
  what it is for and that a variable that is not set, or is empty, is not passed, so the command keeps what Docker
  gives it. Put the array in the three calls where the tests above expect it, with `${array[@]+"${array[@]}"}` as the
  file does for its other arrays, since bash 3.2 on macOS fails on an empty array under `set -u`. Update the header
  comment, which says what the wrapper adds to a run and gives a command of `--connect`, and the comment of
  `--connect`, which lists `HOME`, `USER`, `LOGNAME` and `PATH`. Run `npm test`: the new tests pass, and every
  existing test passes unchanged (R1, R2, R3, R5)
- [x] In `README.md`, add `TERM` and `COLORTERM` to the table of the environment variables of `sandbox.sh`, after
  `SANDBOX_CPUS`. `TERM` says that it is the terminal type the command is told; `COLORTERM` says that it is passed
  to the command as it is. Each row fits the table's widths and the 120-character line, which leaves 90 characters
  for the text. What the image does with a `TERM` it does not describe is added with the second group of tasks,
  which makes it true (R9)
- [x] In `SANDBOX.md`, in "Running a unit" before its last line, which points to "When something goes wrong", add a
  paragraph: every command in the sandbox, of a unit run, of `--in-place`, of `--workdir` and of `--connect`, has
  the `TERM` and the `COLORTERM` of the terminal the wrapper was run from, so a harness draws in the colours it
  draws in on the host. The `TERM` the image holds no description of is added with the second group of tasks. In
  "Two agents on one unit", the bullet that lists `HOME`, `USER`, `LOGNAME` and `PATH`
  adds that `TERM` and `COLORTERM` are those of the terminal `--connect` was run from, and not the first command's
  (R10)

### A `TERM` the image does not describe becomes `xterm-256color`

- [x] Write `tests/known-terminal.test.mjs`. Each test makes a temporary directory with the suite's helper, puts in it a
  stand-in `infocmp`, `sh` with builtins alone, that exits 0 for the names the test gives and 1 for any other, and runs
  `container/known-terminal.sh` with that directory as the whole PATH and an environment the test gives, with node as
  the command, which prints `TERM`, `COLORTERM` and its arguments as its environment holds them, each told apart from
  not set. The stand-in knows `dumb`, as the image does, since bash, which is `/bin/sh` on macOS, gives itself a
  `TERM=dumb` when the environment holds none. Tests: a `TERM` the stand-in knows reaches the command unchanged; one it
  does not know reaches it as `xterm-256color`, with `COLORTERM=truecolor` beside it unchanged; with no `TERM`, the
  command has none; with no `COLORTERM`, the command has none; the arguments reach the command as they were given, one
  with a space among them; the script exits with the status of the command. A last test reads `container/Dockerfile` and
  `container/entrypoint.sh` and holds that the Dockerfile copies `known-terminal.sh` of the kit's container directory to
  the path the entrypoint's last line runs the command through. Run them and see them fail (R4, R6)
- [x] In `tests/sandbox-unit-run.test.mjs`, have `firstCommandGets` read the path the entrypoint's `exec setpriv`
  line runs the command through, and have the test of what the first command gets expect `--connect` to run
  `<container> <that path> <default command>`. Have `connectCall` put `/usr/local/bin/known-terminal.sh` before the
  command, so that every test of `--connect` expects it. Run them and see them fail (R2, R4, R6)
- [x] Write `container/known-terminal.sh` as the approach gives it, executable in git (R4)
- [x] In `container/entrypoint.sh`, run the command through the script on the last line, and say in the comment
  above it why: the image knows which terminal descriptions it holds, and the wrapper does not (R4)
- [x] In `container/Dockerfile`, copy the script to `/usr/local/bin/known-terminal.sh` and make it executable,
  beside the entrypoint's `COPY` and `chmod` (R4)
- [x] In `README.md`, add to the row of `TERM` that one the image holds no description of is told as
  `xterm-256color`. In `SANDBOX.md`, add to the paragraph of "Running a unit" that such a `TERM` is
  `xterm-256color` in the sandbox, with the host's `COLORTERM` beside it. Moved here from the first group, so that
  no commit describes what it does not do (R9, R10)
- [x] In `container/sandbox.sh`, put `/usr/local/bin/known-terminal.sh` before the command of `--connect`, and say in
  the comment of `--connect` that it is what the entrypoint runs the first command through. In
  `tests/sandbox-dev.test.mjs`, expect the dev shim's `--connect` to run the command through it too. Run `npm test`:
  all pass (R2, R4)

### Shown in the sandbox and in the human's terminals

- [x] On the host, with Docker, run the working copy's sandbox on a terminal and print what a command is given, with
  `script -q /dev/null` on macOS or `script -qec` of util-linux to give it one. Each case written in `record.md` with
  what was run and what it printed (R1, R2, R3, R4, R5):
    - `TERM=xterm-256color`, no `COLORTERM`: `./sandbox-dev.sh --in-place sh -c 'echo "[$TERM] [${COLORTERM-none}]"'`
      prints `[xterm-256color] [none]`
    - `TERM=xterm-256color COLORTERM=truecolor`: prints `[xterm-256color] [truecolor]`
    - `TERM=xterm-ghostty COLORTERM=truecolor`: prints `[xterm-256color] [truecolor]`
    - `TERM` removed with `env -u TERM`: prints `[xterm] [none]`, as before the unit
    - With a unit run of the working copy's sandbox under way, `./sandbox-dev.sh --connect <unit> sh -c ...` from a
      shell with `TERM=xterm-ghostty` and no `COLORTERM` prints `[xterm-256color] [none]`
- [x] Ask the human to run OpenCode with `./sandbox-dev.sh --in-place opencode` in the Terminal app of macOS 15, beside
  `opencode` on the host, and to compare the background and the tints of a diff. Write what they ran and saw in
  `record.md` (R7)
- [x] Ask the human to do the same in a tmux pane on Linux. Write what they ran and saw in `record.md`, or that it was
  not checked and why (R8)

### Review finding S1: a command of `--connect` inherits the run's terminal

Added after the review. `--connect` gives the command both variables in every call, since a `docker exec` that
gives none inherits the run's: the value of its own shell, or an empty one for a variable its shell lacks. The one
exception is a `TERM` its shell lacks while it has a terminal, which is `xterm`, as Docker gives a command on a
terminal that has no `TERM` from anywhere else, and as the command had before the unit. `known-terminal.sh` removes
an empty `TERM` and an empty `COLORTERM` before it looks the `TERM` up. A run is unchanged: its container starts
with nothing but what the wrapper gives it.

- [x] In `tests/known-terminal.test.mjs`, add tests: an empty `TERM` and an empty `COLORTERM` reach the command as
  not set; an empty `COLORTERM` beside a `TERM` that is replaced reaches the command as not set. Run them and see
  them fail (R3, R5, R6)
- [x] In `tests/sandbox-unit-run.test.mjs`, have `connectCall` always give `--env TERM=<value> --env
  COLORTERM=<value>` after `--env PATH=...`, with `TERM` empty by default, or `xterm` with a terminal, and
  `COLORTERM` empty by default. Add tests: a `--connect` from a shell with `TERM` and no `COLORTERM` gives
  `COLORTERM` empty; one from a shell with an empty `COLORTERM` gives it empty; one from a shell with neither gives
  both empty. In `tests/sandbox-dev.test.mjs`, expect the two empty values on the dev shim's `--connect`. Run them
  and see them fail (R2, R3, R5, R6)
- [x] In `container/known-terminal.sh`, remove an empty `TERM` and an empty `COLORTERM`, and say why in its header
  (R3, R5)
- [x] In `container/sandbox.sh`, give the `docker exec` of `--connect` the two values as above in place of the run's
  flags, with a comment that says why, and keep the run's flags for the two `compose run` calls alone. Run
  `npm test`: all pass (R2, R3, R5)
- [x] In `SANDBOX.md`, say in the paragraph of "Running a unit" that a command run from a shell without a `TERM` has
  `xterm` on a terminal and none without one, and in the bullet of `--connect` that a variable its shell lacks, the
  command lacks too, whatever the first command has (R10)
- [ ] With the working copy's sandbox, start a unit run from a shell with `TERM=tmux-256color COLORTERM=truecolor`,
  and connect to it from shells with: `TERM=xterm-256color` and no `COLORTERM`; neither; `TERM=xterm-ghostty` and no
  `COLORTERM`; `TERM=xterm-256color` and an empty `COLORTERM`. Each connected command prints its `TERM` and
  `COLORTERM` as its environment holds them, and none has a `COLORTERM`, and the second has `TERM=xterm`. Written in
  `record.md` (R2, R3, R4, R5)

## Verification

- [x] `npm test` passes on the macOS host, with no test skipped that was not skipped before
- [x] `./sandbox-dev.sh --in-place npm test` passes, which runs the suite on Linux. In place of
  `./sandbox.sh --in-place npm test`, whose installed release does not start on Docker 29 until a release holds
  unit 0051
- [x] `npm run check-changes` passes
- [x] No line of a changed file is longer than 120 characters, and no changed text holds an em dash
- [x] `git diff master --stat` names no file outside those of "Files"

## Commit Points

- [x] `bugfix-0049 Plan the passing of the host's terminal type`: `plan.md` and `record.md`
- [x] `bugfix-0049 Pass the host's TERM and COLORTERM to the sandbox's commands`: the first group of tasks
- [x] `bugfix-0049 Tell a command xterm-256color for a TERM the image does not describe`: the second group
- [x] `bugfix-0049 Record the checks in the sandbox and in the human's terminals`: `record.md`
- [ ] `bugfix-0049 Give a connected command no terminal variable its own shell lacks`: the tasks of S1
