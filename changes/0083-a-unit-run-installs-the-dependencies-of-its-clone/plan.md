# 0083 A unit run installs the dependencies of its clone

## Approach

The install is a script of the image that the wrapper puts before the command of a unit run whose clone it has just
made. The entrypoint runs the command through `known-terminal.sh` as the agent once the firewall is verified, so the
script runs there and then, as any command of the human does, with the home volume's npm cache (R4). Nothing of the
entrypoint, of `compose.yml` or of the mounts changes (R8).

**The script.** A new `container/install-dependencies.sh`, POSIX `sh` as `known-terminal.sh` is, so that its tests run
on any host. It is given the command to run, always at least one word, and:

1. prints on standard error the one line `install-dependencies.sh: the clone is new, so its dependencies are
   installed with npm ci` (R5)
2. runs `npm ci >&2` in its working directory, `/work`, so that npm's standard output reaches standard error too (R5)
3. exits with npm's status when that is not 0, and runs nothing more (R6)
4. `exec "$@"` otherwise (R1)

`container/Dockerfile` copies it to `/usr/local/bin/install-dependencies.sh` beside `known-terminal.sh`, and makes it
executable in the same `RUN chmod`. The image records the kit's version, so an image of an earlier kit is built again
at the first start after an update, as for every file of the image.

**Two refactorings first, in a commit of their own, which change no behavior.**

* `container/unit-clone.sh` gets `clone_is_new <clone>`: whether no earlier run left a clone at the path, which
  `refuse_unlanded` and `prepare_clone` each test as `[ -e "$clone" ]` today. Both call it, and the wrapper becomes
  its third caller
* `container/sandbox.sh` gets `default_command=bash` near the top of the run's code, with a comment that it is the
  `CMD` of `container/Dockerfile`, which a test holds it against. `--connect`'s `[ $# -gt 0 ] || set -- bash` uses
  it, and the install becomes its second user

**The wrapper.** In `container/sandbox.sh`, directly before `prepare_clone`, `new_clone` is `1` when `clone_is_new`
holds and `0` otherwise. After `prepare_clone`, when `new_clone` is `1` and `$clone/package-lock.json` is a regular
file, the command becomes `/usr/local/bin/install-dependencies.sh` followed by the command, or by `$default_command`
when none was given (R1, R2, R3). A resumed clone, `--in-place` and `--workdir`, which end in their own `exec` before
this point, and `--connect`, which ends earlier still, are left as they are (R3). The run's status is already the
container's, which is npm's when the install fails, and the work is brought back after it as after any run (R6). The
comment at the head of the file says, in its paragraph on a unit run, that a new clone that holds a
`package-lock.json` has its dependencies installed with `npm ci` in the container before the command. A command that
opens with `npm ci` is passed on as any command is (R7).

**The stand-in of real containers.** `containerHost` of `tests/wrapper-fixture.mjs` runs an image that is not the
kit's, as it leaves out `known-terminal.sh` today. It gains, in every `run`, a read-only volume of the working tree's
`container/install-dependencies.sh` at `/usr/local/bin/install-dependencies.sh`, so that a test of real containers
runs the real script with the real `npm` of the image the kit builds on. Its comment says so.

**The documents.** `SANDBOX.md` and `README.md` change by R9 to R12, and "Exit statuses" of `README.md` too: its
bullet on `./sandbox.sh` says that a unit run passes on the status of an install that failed, which R6 and the rule
of `AGENTS.md` on that section need. The bullet of "Commit messages" of `SANDBOX.md` that names "a unit run's clone
before `npm ci`" stays: it does not tell the reader to run it, and it holds of a resumed clone. "Where things are kept
on the host" does not change, since the install keeps nothing new on the host. No file is added at the root of the
repository and `container/` ships as a whole, so neither table changes.

## Files

- `container/install-dependencies.sh`: new, the script
- `container/Dockerfile`: the `COPY` of the script, its `chmod`, and the comment above them
- `container/unit-clone.sh`: `clone_is_new`, called by `refuse_unlanded` and `prepare_clone`
- `container/sandbox.sh`: `default_command`, the install before a new clone's command, and the head comment
- `tests/dockerfile-executables.mjs`: new, the paths the `RUN chmod` of `container/Dockerfile` makes executable,
  read across its continued lines, for the two tests below
- `tests/known-terminal.test.mjs` and `tests/sandbox-commit-msg.test.mjs`: their tests of the `chmod` read the paths
  with `tests/dockerfile-executables.mjs`
- `tests/install-dependencies.test.mjs`: new, the tests of the script on the host and of its place in the image
- `tests/sandbox-unit-run.test.mjs`: the tests of the wrapper with a fake Docker
- `tests/sandbox-install.test.mjs`: new, the tests of real containers, skipped without Docker
- `tests/wrapper-fixture.mjs`: the volume of the script in `containerHost`
- `SANDBOX.md`: "Running a unit", "Two implementations of one unit" and "When something goes wrong"
- `README.md`: "sandbox.sh", "Exit statuses", "Running a role" and "The orchestrator"
- `changes/0083-a-unit-run-installs-the-dependencies-of-its-clone/record.md`: the log of the work

## Tasks

- [x] Add `clone_is_new` to `container/unit-clone.sh` and call it from `refuse_unlanded` and `prepare_clone`, and add
  `default_command` to `container/sandbox.sh` and use it in `--connect`, as the approach gives them. `npm test` passes
  unchanged (R8)
- [x] Add the new `tests/install-dependencies.test.mjs`, which runs the script with `sh` on the host in a temporary
  directory, with a PATH of a stand-in `npm` that records its arguments and its working directory, prints `npm out`
  on standard output and `npm err` on standard error, and exits with the status a file gives, 0 when there is none:
  with `npm ci` succeeding and the command `node -e` printing `command out`, standard output is `command out` alone,
  standard error is the script's line, then `npm out` and `npm err`, npm was called once with `ci` in that directory,
  and the status is the command's, 3 for a command that exits 3; with npm exiting 7 the status is 7, the command
  wrote nothing and is not started, as a marker file it would write shows; and arguments with spaces and quotes reach
  the command as given. Add the test that `container/Dockerfile` copies the script to
  `/usr/local/bin/install-dependencies.sh` and makes it executable, as `tests/known-terminal.test.mjs` tests its own
  `COPY` (R1, R5, R6, R13)
- [x] The `RUN chmod` of `container/Dockerfile` no longer fits one line with the script beside the others, so it
  continues on a second. Add `tests/dockerfile-executables.mjs`, which reads the paths it makes executable across
  its continued lines, and read them with it in the test of the `COPY` of the script, in that of `known-terminal.sh`
  in `tests/known-terminal.test.mjs` and in that of the hook in `tests/sandbox-commit-msg.test.mjs`, whose own
  readings take the first line alone (R13)
- [x] Write `container/install-dependencies.sh`, executable, and its `COPY` and `chmod` in `container/Dockerfile`, as
  the approach gives them, until the tests above pass (R1, R4, R5, R6)
- [x] Add to `tests/sandbox-unit-run.test.mjs`, with a `package-lock.json` committed on the unit's branch: a new
  clone of the unit's branch runs `sandbox /usr/local/bin/install-dependencies.sh echo hi`, the calls otherwise as
  `unitRun` gives them; one with no command runs `sandbox /usr/local/bin/install-dependencies.sh bash`, `bash` held
  against the `CMD` of `container/Dockerfile` by the `defaultCommand` that `firstCommandGets` reads; a new clone of a
  variant's branch does the same; a run that resumes a clone, the lockfile committed, runs `sandbox echo hi`; a
  command `npm ci` given by the human follows the script as given, as `sandbox
  /usr/local/bin/install-dependencies.sh npm ci`; and a `package-lock.json` that is a directory installs nothing. Add,
  without a lockfile, that a new clone runs `sandbox echo hi` and its standard error holds no line of an install; and
  with a `package-lock.json` in the project root, that `--in-place` and `--workdir` run the command alone and that
  `--connect` makes the one call `connectCall` gives (R1, R2, R3, R7, R8, R13)
- [x] Add the install to `container/sandbox.sh` as the approach gives it, and its paragraph of the head comment,
  until the tests above pass (R1, R2, R3, R7, R8)
- [x] Add the volume of the script to `containerHost` in `tests/wrapper-fixture.mjs`, and its comment (R13)
- [x] Add the new `tests/sandbox-install.test.mjs`, skipped where `docker info` fails, as
  `tests/sandbox-orchestrator-mount.test.mjs` skips, on `containerProject` with a Compose project named after the
  process and the container removed after each test. On the unit's branch it commits a `package.json` of the package
  `p` with the dependency `local` as `file:local`, the package `local/package.json`, the `package-lock.json` that
  `npm install` writes for them, and an `.npmrc` of `audit=false` and `fund=false`, so that the install needs no
  registry. A unit run of `sh -c 'test -L node_modules/local && echo installed'` exits 0 with standard output
  `installed` alone, and standard error holding the script's line and then npm's `added 1 package`; the same with a
  `preinstall` script of `exit 7` exits 7, prints nothing on standard output, and has standard error that holds the
  script's line and not the command's; and a second run of a clone that the first left, kept by a file that is not
  committed, prints no line of an install (R1, R3, R4, R5, R6, R13)
- [x] Change "Running a unit" of `SANDBOX.md`: the bullet on what the clone holds says that a new clone that holds a
  `package-lock.json` has its dependencies installed with `npm ci` in the container, as the agent and after the
  firewall, before the command or the shell starts; that the line of the install and what npm prints are on standard
  error and the command's standard output is its own; that an install that fails starts no command, the work is
  brought back and the wrapper exits with npm's status; that a clone without a `package-lock.json` is not installed;
  and that a resumed clone, `--in-place`, `--workdir` and `--connect` do not install. It no longer says that the
  first command in a new clone is `npm ci`. The two examples of the orchestrator become `./sandbox.sh 0029 npx
  agentrite orchestrate 0029 --skip-permissions` and the same with `--follow`, and the sentence before them and the
  one on the shell of a unit run no longer say "after `npm ci`" (R9, R10)
- [x] Change "Two implementations of one unit" of `SANDBOX.md`: the two examples become `./sandbox.sh 0029 --variant
  opus npx agentrite run implementer claude 0029 --model <id>` and its OpenCode line, and the sentence after them
  says that each new clone has its dependencies installed before its command, as "Running a unit" says (R10)
- [x] Add to "When something goes wrong" of `SANDBOX.md` an entry, beside the one on `agentrite.json` refused: what
  is seen, the line of the install followed by npm's error, no command started, and the wrapper exiting with npm's
  status; why, `npm ci` failed in the new clone, as for a `package-lock.json` out of step with `package.json`, a
  registry the allowlist does not admit, or an install script that failed; and what to do, correct what npm names on
  the branch and run again, which makes a new clone when the failed run's was removed, or run `npm ci` in the shell of
  a clone that was kept. Change the entry on `agentrite.json` refused: a unit run's new clone is installed before the
  command, and the case is left for a resumed clone, a new checkout, and a clone whose install failed (R11)
- [x] Change `README.md`: in "sandbox.sh", the paragraph on statuses says that a unit run whose install of a new
  clone failed passes on npm's status; in "Exit statuses", the bullet on `./sandbox.sh` says that a unit run passes
  on the status of the install of a new clone too, once that started; in "Running a role", `npx agentrite` is there
  in a unit run's clone, whose dependencies the run installs before the command, like the role files; and in "The
  orchestrator", the example becomes `./sandbox.sh 0029 npx agentrite orchestrate 0029 --skip-permissions` and the
  sentence before it no longer says "after `npm ci` in the clone". Its sentences on `npm ci` on the host, in a new
  checkout, and with `--in-place` and `--workdir` stay as they are (R10, R12)

## Verification

- [ ] `npm test` passes, on a host with Docker, where `tests/sandbox-install.test.mjs` runs
- [ ] `./sandbox-dev.sh <a unit with a branch> npx agentrite units` on a host with Docker shows the line of the
  install and npm's output on standard error, and the units on standard output
- [ ] `grep -n "npm ci" README.md SANDBOX.md` shows no example of a unit run that opens with `npm ci`, and no sentence
  that tells the reader to run it in a new clone before a command
- [ ] `npm run check-changes` passes, after the commits
- [ ] Every line of the changed files fits 120 characters, checked before each commit
- [ ] Every requirement 1 to 13 is traced by a task above, and every task traces to one

## Commit Points

- [x] `feature-0083 Name the new clone and the default command once`: the first task
- [x] `feature-0083 Add the script that installs a new clone`: the second to fourth tasks
- [x] `feature-0083 Install the dependencies of a unit run's new clone`: the fifth to eighth tasks
- [x] `feature-0083 Document the install of a new clone`: the tasks of `SANDBOX.md` and `README.md`
