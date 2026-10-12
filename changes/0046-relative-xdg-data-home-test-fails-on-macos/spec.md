# 0046 The test of a relative `XDG_DATA_HOME` fails on macOS

## Context

One test of the suite fails on a macOS host and passes on a Linux one: "the wrapper mounts a relative XDG_DATA_HOME
as the absolute path it names from its working directory", in the tests of the sandbox's wrapper. Every other test
passes on both.

The failure is in the test, not in the wrapper. The wrapper gives Docker an absolute path to the right directory.
The test expects that path spelled another way, and the two spellings differ only where the temporary directory is
reached through a symbolic link, which is the case on macOS.

It matters because a release is made on the host, and step 1 of `RELEASING.md` stops a release whose suite does not
pass. On a macOS host no release can be made while this test fails, and `npm publish` runs the suite as well.

The test came with unit 0035, which moved the harnesses' logs to the host, and has been in every release since
4.1.0. It is no leftover of the releases 4.0.0 or 6.0.0.

The same run on macOS skips seventeen tests, which a Linux host runs. Each says why it is skipped, and none says
what to do about it:

| Tests | What they test                                      | Why a macOS host skips them                          |
|-------|-----------------------------------------------------|------------------------------------------------------|
| 10    | The entrypoint's reading of the two allowlists      | It needs bash 4 or newer, and macOS has bash 3.2     |
| 6     | The entrypoint's check of who owns the agent's home | It needs GNU `stat`, and macOS has BSD's             |
| 1     | That `--connect` gives the command a terminal       | The test needs `script` of util-linux, not BSD's     |

They have been skipped on macOS since they were written, in units 0010, 0007 and 0034. The sixteen of the first
two rows test the entrypoint, which runs in the Linux container and nowhere else. The whole suite runs on a macOS
host in the sandbox, which is Linux: `./sandbox.sh --in-place npm test`, run on the macOS host on `master` at
`6710873`, reports 495 tests, 495 passing, none skipped and none failing. The human asked that the skipped tests
say so.

## Observed behavior

On a macOS host, `npm test` reports one failing test, with an assertion that two lists of Docker calls differ. They
differ in the two `--volume` arguments of the log directories and in nothing else. The wrapper gave:

```
--volume /private/var/folders/.../T/sandbox-wrapper-XXXXXX/data/agentrite/project/.claude/projects:...
```

and the test expected:

```
--volume /var/folders/.../T/sandbox-wrapper-XXXXXX/data/agentrite/project/.claude/projects:...
```

On macOS `/var` is a symbolic link to `/private/var`, so both name one directory.

## Expected behavior

The test passes on a macOS host and on a Linux host, and still shows what it is there for: that a relative
`XDG_DATA_HOME` reaches Docker as an absolute path, which names the directory of that name under the directory the
wrapper was started in.

## Steps to reproduce

On a macOS host, from the repository root, with the kit installed:

1. Run `node --test --test-name-pattern="relative XDG_DATA_HOME" tests/sandbox-wrapper.test.mjs`
2. Observe that the one test fails with the two paths above

Reproduced on macOS 15.1.1 with node 26.9.0 and bash 3.2.57, on `master` at `8c5f0da` and on the tag `v4.1.0`.

## Root cause

The test makes its directories under the temporary directory as node names it, which on macOS is a path under
`/var`. It starts the wrapper in one of them, with `XDG_DATA_HOME=data` and an environment that holds `HOME` and
`PATH` and nothing else, and then expects the log directory at that same unresolved path with `data` appended.

The wrapper makes the log directory, enters it and takes its path from the shell, because Docker reads a source
that is not absolute as the name of a volume. A shell that is started without `PWD` in its environment, or with a
`PWD` that does not name the directory it is in, asks the system where it is, and the system answers with the path
without symbolic links, which is under `/private/var`. A relative path that the shell then enters is reported
relative to that.

So the wrapper reports the directory as the system names it, and the test expects it as node named the temporary
directory. On Linux the temporary directory is `/tmp`, which is no symbolic link, and the two are the same.

Shown on the macOS host, with a shell started by node in a directory under the temporary directory, running `pwd`,
then `cd data` and `pwd`:

| `PWD` in the environment          | What the shell printed                     |
|-----------------------------------|--------------------------------------------|
| Not set, as in the test           | The path under `/private/var`, both times  |
| Set to another directory          | The path under `/private/var`, both times  |
| Set to the directory it is in     | The path under `/var`, both times          |

The tests that give an absolute `XDG_DATA_HOME` pass on macOS, because the shell reports a directory it entered by
an absolute path as that path was written.

## Fix

The test expects the log directory under the working directory as the system names it, with symbolic links
resolved, where it now expects it under the path node gave for the temporary directory. The wrapper does not
change.

## Requirements

1. On a macOS host whose temporary directory is reached through a symbolic link, the test "the wrapper mounts a
   relative XDG_DATA_HOME as the absolute path it names from its working directory" passes
2. That test still fails when the wrapper passes Docker a source for a log directory that is not absolute, or one
   that names another directory than `data/agentrite/<name of the project root>` under the directory the wrapper
   was started in
3. On a Linux host the suite passes as it does before this unit: no test that passes there fails after it
4. The wrapper, and what it passes to Docker for any `XDG_DATA_HOME`, are what they are before this unit
5. Requirement 1 is shown on a macOS host, with what was run and what it printed in the unit's record: the one
   test by its name, and `npm test` with no failing test
6. Every test that the suite skips because the host lacks what the test needs gives a reason that says two things:
   what the host lacks, as it says now, and that the whole suite runs in the sandbox, with the command
   `./sandbox.sh --in-place npm test`. That holds for each of the three reasons the suite skips for today: a bash
   older than 4, a host that is not Linux, and no `script` of util-linux
7. On a Linux host that runs all three kinds today, none of them is skipped after this unit, and a macOS host skips
   the same seventeen tests as before it and no other
8. "The kit's own tests" of `CONTRIBUTING.md` says that a host other than Linux skips tests, which ones by what
   they need, that the reason of each names the command, and that `./sandbox.sh --in-place npm test` runs the
   whole suite. It follows the rules that this repository's `AGENTS.md` gives for that document
9. Requirement 6 is shown on a macOS host, in the unit's record: the reason one test of each of the three kinds
   printed, and what `./sandbox.sh --in-place npm test` reported

## Decisions

* **The test changes and the wrapper does not.** The wrapper does what it is there to do: Docker gets an absolute
  path, and the path names the right directory. Which of two spellings of one directory it gives is nothing a
  developer or Docker sees a difference in. Rejected: having the wrapper always report the path without symbolic
  links. That would change what is mounted for a developer whose `XDG_DATA_HOME` is an absolute path through a
  symbolic link, who gets the path as they wrote it today, and it would be a change to the sandbox made to satisfy
  a test
* **The test expects the path as the system names it, and is not given a `PWD`.** A wrapper started with `PWD` set
  to its directory reports the unresolved path, so setting `PWD` in the test would make it pass too. But the test
  would then pass by giving the wrapper an environment made to fit the expectation. Resolving the expected path
  says what is true: the wrapper reports where it is as the system has it
* **The proof is a run on macOS.** The suite on Linux cannot show the failure or its repair, since the two paths
  are the same there. So the record holds what a macOS host printed, as requirement 5 says
* **The skipped tests stay skipped on a host that cannot run them, and say where they run.** On the human's word.
  Sixteen of them run the container's entrypoint with the tools of whatever host runs the suite, and the entrypoint
  is written for the bash and the GNU tools of the image. Rejected: making them run on macOS. That means writing
  the entrypoint for tools it never meets, or asking every developer on macOS to install others, for code that
  runs in the container alone. The sandbox is the Linux a macOS host already has, and it runs them all
* **The command is `./sandbox.sh --in-place npm test`.** It mounts the working tree as it is, so the tests that run
  are the ones being worked on, and it is the command that was tried. `./sandbox-dev.sh --in-place npm test` runs
  them in the working copy's sandbox, and is for work on the sandbox itself, which `CONTRIBUTING.md` already says
* **The reason names the command, and not macOS.** A test is skipped for what the host lacks, and a macOS host with
  a newer bash on its `PATH` runs the ten of the first kind today. What to do is the same whichever host it is
* **A bug, although no behavior of the kit is wrong.** The suite is part of what a release checks, and a suite that
  fails on a supported host for a reason that is not a fault of the kit is a fault of the suite

## Non-goals

* A change to the wrapper, to what the sandbox mounts or to `SANDBOX.md`
* Making a test that is skipped on macOS run there. See "Beyond the request" for the one of `--connect`
* A change to the entrypoint, or to when a test is skipped
* Running the suite on macOS automatically, in CI or otherwise
* A section in `CHANGELOG.md`, which is written when a release is made

## Beyond the request

* **Resolving the temporary directory once, for every test that makes one.** Sixteen places in the suite make a
  directory under the temporary directory, and only this test compares such a path with one a command worked out
  from its working directory. It would cost a change to each of those places, or a helper they share, for a
  failure none of them has. Without it, a later test of the same shape fails on macOS the first time the suite is
  run there, with both paths in the assertion
* **Running the `--connect` test on macOS, with BSD's `script`.** Unlike the other sixteen it tests the wrapper,
  which runs on the host, and macOS is a host the kit supports. It would cost a second way to start a command on a
  terminal in the test, since the two `script` commands take different arguments. Without it, that `--connect`
  gives a terminal is shown on Linux alone, and on macOS by the run in the sandbox, which is Linux too
* **One line at the end of `npm test` that says tests were skipped and names the command.** node's runner prints
  each reason on the line of its test and ends with a count, `skipped 17`. A line of the suite's own would cost a
  reporter, or a script around the runner, for a suite that today is one `node --test`. Without it, a reader who
  sees the count finds the command on any skipped test's line
