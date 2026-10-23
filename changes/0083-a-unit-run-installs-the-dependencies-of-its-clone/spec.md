# 0083 A unit run installs the dependencies of its clone

## Context

A unit run of the sandbox, `./sandbox.sh <unit> [COMMAND...]`, mounts a clone of the unit's branch at `/work`. The
wrapper makes the clone before the container starts, and it holds what is committed and nothing else, so it has no
`node_modules`. Without `node_modules` the kit's role files are not found, the suite does not run, and every command
that reads `agentrite.json` refuses it, since the files it names under `node_modules` are not there. When the
container exits, the wrapper brings the work back and removes the clone when nothing in it would be lost, and an
ignored `node_modules` is not something lost, so the next unit run of the branch gets a new clone without it.

So every unit run starts with `npm ci`, typed by the human: `./sandbox.sh 0029 sh -c 'npm ci && npx agentrite
orchestrate 0029 --skip-permissions'`, or `npm ci` as the first command of a shell. `SANDBOX.md` and `README.md` give
it in each of their examples of a unit run. The human expected to install once and found they install at each run,
and typing it is a step nobody skips on purpose.

A clone that an earlier run left, because it held work the host did not, is resumed by the next run as it is, with
the `node_modules` it had. `--in-place` and `--workdir` mount a directory of the host as it is, and share its
`node_modules` with the host. `--connect` runs a command in the container of a unit run under way. The npm registry
is among the hosts the sandbox admits itself, and the npm cache is in the home volume, which outlives a container.

## Requirements

When it installs:

1. A unit run whose clone the wrapper made in that run, of the unit's branch or of a variant's, installs the
   dependencies in the clone with `npm ci` in `/work`, before the command it was given starts, or the interactive
   shell when it was given none
2. It installs only when the clone holds a `package-lock.json` at its root. A clone without one is not installed, and
   nothing is printed of an install
3. A unit run that resumes a clone an earlier run left does not install, and neither does a run with `--in-place`, a
   run with `--workdir`, or a command of `--connect`

How it installs:

4. `npm ci` runs inside the container, as the agent, after the firewall is in place and verified, as any command of
   the human does there, and with the npm cache of the home volume
5. Before it starts, the wrapper's output says on standard error that the dependencies of the clone are being
   installed with `npm ci`. What npm prints, on its standard output and on its standard error alike, reaches the
   wrapper's standard error, so that the standard output of a unit run is that of the command alone
6. When `npm ci` fails, the command is not started. The container exits with npm's exit status, the wrapper brings the
   work back as after any run, and it exits with that status, as it passes on a command's status

What does not change:

7. A command that starts with `npm ci` itself, as the examples did before this unit, still runs, and installs again
8. Nothing else of a unit run changes: the clone, the mounts, the firewall, the bringing back of the work, and the
   exit statuses of the wrapper other than that of requirement 6

The documents:

9. "Running a unit" of `SANDBOX.md` says that a new clone has its dependencies installed with `npm ci` before the
   command starts, when it holds a `package-lock.json`, what is printed of it, what happens when it fails, and that a
   resumed clone, `--in-place`, `--workdir` and `--connect` do not install. It no longer says that the first command
   in a new clone is `npm ci`
10. Every example of a unit run in `SANDBOX.md` and `README.md` that starts with `npm ci` no longer does, as
    `./sandbox.sh 0029 npx agentrite orchestrate 0029 --skip-permissions`, and every sentence that tells the reader to
    run `npm ci` in a unit run's clone before a command says that the clone has it installed. What they say of
    `npm ci` on the host, in a new checkout, and with `--in-place` and `--workdir` is unchanged
11. "When something goes wrong" of `SANDBOX.md` has an entry for an install that fails: what is seen, why, and what
    to do. Its entry for `agentrite.json` refused for a path under `node_modules` says that a unit run's new clone is
    installed before the command, and that the case is left for a resumed clone, a new checkout, and a clone whose
    install failed
12. "sandbox.sh" of "Commands" of `README.md` says that the wrapper passes on the status of an install that failed,
    by requirement 6

Tests:

13. Tests of the wrapper show that a unit run of a new clone with a `package-lock.json` installs before the command,
    with the line before it and npm's output on standard error and only the command's on standard output; that a new
    clone without one does not install; that a resumed clone, `--in-place`, `--workdir` and `--connect` do not
    install; and that an install that fails starts no command and gives npm's status as the wrapper's. Tests that need
    Docker may be skipped where Docker is not, as the other tests of the sandbox are

## Decisions

* **The sandbox installs, rather than keeping `node_modules`.** The human chose it among three ways. A Docker volume
  of `node_modules` reused while `package-lock.json` is unchanged would save the install as well as the typing, but
  what an agent that was misled writes into it would reach the next unit run, which a new clone keeps apart today.
  Keeping the clone between runs was dropped too: the host's branch is the source of the work, and a kept clone is not
  updated from it. An install at each run costs what the human already pays, and the npm cache makes it quick
* **Only a new clone.** A new clone is the one case that never has `node_modules`. A resumed clone has what its earlier
  run left, which is the developer's own work as it was, and is used as it is, as "Getting the work back" says of it.
  A directory of the host, with `--in-place` and `--workdir`, shares its `node_modules` with the host, and an install
  there would change the host's
* **Only with a `package-lock.json`.** The kit assumes npm, and `npm ci` refuses without a lockfile. A project without
  one would see every unit run fail on an install it never asked for
* **`npm ci` and not `npm install`.** It installs exactly what the lockfile records and changes no tracked file, so the
  clone holds no change that would keep it from being removed, and it is the command the examples gave
* **Inside the container, as the agent.** The install runs the project's install scripts, which are the project's code
  and are run in the sandbox for the reason every command of the agent is. The wrapper on the host never runs them
* **npm's output on standard error.** A command of a unit run may print what a script reads, as
  `npx agentrite runs --json` does, and an install before it must not mix into that
* **A failed install stops the run.** A command without its dependencies fails anyway, and less clearly: the kit's
  commands would refuse `agentrite.json` for paths under `node_modules`. npm's own message says what failed
* **No option to skip the install.** Nothing asks for one yet. A shell to look around in a clone costs one install,
  and item 1 of "Beyond the request" gives the option

## Non-goals

* Keeping `node_modules` between unit runs, in a volume or in the clone
* Installing in a resumed clone, a directory of the host, or a run of `--connect`
* Installing with another package manager than npm, or with options of `npm ci` other than its default ones
* An option that skips the install, or one that gives other options to `npm ci`
* Installing on the host, as for `./sandbox.sh` in a new checkout, which runs from the project's `node_modules`
* Changing `CHANGELOG.md`, which is written when a release is made

## Beyond the request

1. **An option that skips the install.** `./sandbox.sh <unit> --no-install [COMMAND...]` would start the command on a
   new clone without installing, for a quick look into a clone. It costs an option of the wrapper, its place in the
   usage, `README.md` and `SANDBOX.md`, and tests. Without it, such a run takes the time of one install
2. **Installing a resumed clone that has no `node_modules`.** A clone kept after a run whose install failed, or whose
   command removed `node_modules`, would be installed when it is resumed. It costs a check of the clone and tests.
   Without it, the human runs `npm ci` in such a clone, as before this unit, which the entry of requirement 11 says
