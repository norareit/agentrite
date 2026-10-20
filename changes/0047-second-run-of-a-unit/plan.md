# 0047 A second run of a unit

## Approach

A variant is a unit run of the branch `<unit's branch>--<name>`. The lock, the clone, the bringing back and
`--connect` are already made per branch in `container/sandbox.sh` and `container/unit-clone.sh`, so the wrapper only
has to take the option, resolve the variant's branch, and from there run the branch as it runs any unit's. Nothing
after the resolution of `branch` in `container/sandbox.sh` changes, apart from the commands its messages name.

The work in the wrapper, in the order the wrapper does it:

1. **Taking the option.** `--variant <name>` and `--variant=<name>` are taken in the options loop, before the unit,
   as every other option is, and once more as the first argument after the unit, which is where the spec's forms
   put it (`./sandbox.sh 0069 --variant opus claude`, `./sandbox.sh --connect 0069 --variant opus`). Only the first
   argument after the unit is looked at, so a command whose own arguments hold `--variant` is passed on as it is.
   A second `--variant`, in either place, is refused. `--variant` with no word after it is refused as
   `--workdir` without a directory is
2. **Refusing early.** Right after the options are read, in the block where `--connect` refuses run options and
   before any directory, `agentrite.json`, Docker or npm is read: `--variant` with `--in-place` or `--workdir` is
   refused, naming the option and that it has no unit; a name not of the form
   `^[a-z0-9]+(-[a-z0-9]+)*$`, matched under `LC_ALL=C` as `is_version` is, is refused with a message that names the
   name and the form. Taking the variant after the unit happens in the same early place, before `bell` is read: the
   unit is `$1` there already, since `--in-place` and `--workdir` are known by then
3. **Resolving the branch.** In `container/unit-clone.sh`:
    * `find_unit_branch` leaves out of the number lookup every branch whose name holds `--`. The lookup by exact
      name is left as it is, so a variant's branch is still named by its full name (R12, R13)
    * A new `resolve_variant_branch root unit_branch name` prints `<unit_branch>--<name>` when that local branch
      exists, and otherwise cuts it with `git branch --quiet --no-track` from `refs/heads/<unit_branch>` and says on
      standard error `sandbox.sh: cut <variant> from <unit_branch> at <short commit>.`, as `cut_unit_branch` says
      what it cut. It fails with 3 when the cut fails, saying so
    * A new `find_variant_branch root unit_branch name` prints the variant's branch when it exists, and fails with
      1 and says nothing otherwise, for `--connect`, which cuts nothing
    * In `container/sandbox.sh`, after the unit's branch is found or cut as today: a unit branch whose name holds `--`
      given together with `--variant` is refused, naming the branch, that it is a variant's, and that it is run by
      its name without `--variant`. Otherwise, with `--variant`, `branch` becomes the variant's, from
      `resolve_variant_branch` for a run and from `find_variant_branch` for `--connect`, where a variant with no
      branch is refused as a unit with no branch is: there is no run to connect to, and the message names the
      command that starts one
4. **The messages that name a command.** The lock refusal names `sandbox.sh --connect <unit> [COMMAND...]` and
   `--connect` with no running container names `sandbox.sh <unit>`. Both name `--variant <name>` after the unit when
   it was given, so that the command they name is the one for the same branch. A variable `unit_given`, the unit
   as given followed by ` --variant <name>` when there is one, carries it
5. **The forms.** The usage in the header of `container/sandbox.sh` and `mount_forms` show `[--variant NAME]` after
   `UNIT` in the unit form and in the `--connect` form, with one line on what it is

The branch-holds-`--` test is one function, `is_variant_branch`, in `container/unit-clone.sh`, used by
`find_unit_branch` and by the refusal of step 3, so that the mark is decided in one place.

Requirements 7 to 11 hold by construction, since the container's name, the clone's path, `refuse_unlanded` and
`land_clone` all take the branch, and `docker ps --filter name=^/<name>$` is anchored. They are proven with Docker in a
new test file, on a new fixture: a host whose `docker` answers the image questions as `fakeHost`'s does, so that
nothing is built, and passes `ps`, `rm` and `exec` to the real Docker, and turns the wrapper's
`compose ... run --rm --name <name> ... sandbox <command>` into a real `docker run --rm --name <name>` of the image
the kit's `container/Dockerfile` builds on (its `FROM ... AS base`, as `tests/sandbox-signal.test.mjs` takes it),
with the call's `--volume` flags, `--workdir /work`, `--user <uid>:<gid>` of the suite and a `HOME` in `/tmp`, so
that the command commits in the clone as the developer would and the files it writes are the developer's. A run's
command waits for a file the test writes before it exits, which holds two containers running at once.

The kit's documents say what requirements 15 to 18 say: `process.md` where it says that a review's findings are
saved in `.reviews/<unit-directory>/` and in its rules on an entry of `record.md`, `roles/reviewer.md` where it says
how the file is named and in "Re-reviewing a unit", and `roles/implementer.md` in "Review findings". The pointer
files under `.claude/agents` and `.opencode/agents` hold no instruction and do not change.

## Files

- `container/unit-clone.sh`: `is_variant_branch`; `find_unit_branch` skips variants' branches in the number lookup;
  `resolve_variant_branch`; `find_variant_branch`
- `sandbox-dev.sh`, `tests/sandbox-dev.test.mjs`, `CONTRIBUTING.md`: the dev shim steps over the option
- `container/sandbox.sh`: the option, its early refusals, the variant's branch in place of the unit's, the commands
  its messages name, the usage in its header and `mount_forms`
- `tests/sandbox-unit-run.test.mjs`: the tests without Docker of requirements 1 to 6 and 12 to 14
- `tests/wrapper-fixture.mjs`: the new fixture `containerHost`
- `tests/sandbox-variant.test.mjs`: new, the tests with Docker of requirements 7 to 11
- `SANDBOX.md`: the new section after "Two agents on one unit", the line on several runs in "Running a unit", the
  clone in "Where things are kept on the host"
- `README.md`: the forms and the table of options of "sandbox.sh", the list of `SANDBOX.md` sections it points to,
  and the line on `--connect` in "The sandbox"
- `process.md`: the variant's reviews and the variant named in a record's entry
- `roles/reviewer.md`: the name of a variant's review file, and which earlier reviews a re-review reads
- `roles/implementer.md`: which reviews' findings an implementer takes

## Tasks

The wrapper, tests first:

- [ ] In `tests/sandbox-unit-run.test.mjs`, add tests on the fake host for the option and its refusals, each
  asserting status 2, the message, no Docker or npm call, no branch made (`git for-each-ref` unchanged) and no state
  directory: a name of each wrong form (`Opus`, `opus--x`, `-opus`, `opus-`, `op_us`, `opus.1`, an empty name of
  `--variant=`), naming the name and the form; `--variant` with `--in-place` and with `--workdir`, naming the option;
  `--variant` given twice, before and after the unit and both after; `--variant` with no name. (R1, R3, R4)
- [ ] Add tests on the fake host that `./sandbox.sh task-0026-doc --variant opus echo hi`,
  `./sandbox.sh 0026 --variant=opus echo hi` and `./sandbox.sh --variant opus 0026 echo hi` cut
  `task-0026-doc--opus` at the commit of `task-0026-doc`, say
  `sandbox.sh: cut task-0026-doc--opus from task-0026-doc at <commit>.` before any `docker` call is recorded, leave
  every other branch and the checked-out branch as they were, and make the unit-run calls with the container
  `project-sandbox-task-0026-doc--opus` and the clone `<state>/agentrite/project-sandbox/task-0026-doc--opus`, with
  `echo hi` as the command. A run without `--variant` makes exactly the calls it makes today, which the existing
  tests hold. (R1, R2, R5, R7)
- [ ] Add a test that a variant's branch that exists, and is behind and apart from a unit's branch that has moved on
  since, is run as it is: no branch is cut, nothing is said of a cut, and the clone is at the variant's commit, not
  the unit's. (R6)
- [ ] Add a test that `--variant opus` for the unit `0031` of the fixture's cut tests, which has no branch, cuts
  `feature-0031-cut-me` from `master` and then `feature-0031-cut-me--opus` from it, says both in that order, and runs
  the variant's branch; and one that a build that fails after that leaves both branches cut, as for a unit's
  branch. (R5)
- [ ] Add tests of the lookup: with `task-0026-doc--opus` and `task-0026-doc--gpt-6-1` beside `task-0026-doc`,
  `0026` runs `task-0026-doc`; a number that only a variant's branch holds, as `task-0099-x--opus` alone, names no
  branch and is handled as a number with no branch is today (the unit is looked for on `master`); a variant's
  branch given by its full name runs that branch and cuts nothing; that name together with `--variant` is refused,
  naming the branch, and nothing is cut or called. (R12, R13)
- [ ] Add `--connect` tests: `--connect 0026 --variant opus [COMMAND...]` and `--connect task-0026-doc--opus` exec in
  `project-sandbox-task-0026-doc--opus` with the call the existing `--connect` tests expect; `--connect 0026` with
  variants' branches present execs in `project-sandbox-task-0026-doc`; `--connect 0026 --variant nobranch` is
  refused, cuts nothing and names `sandbox.sh 0026 --variant nobranch`; while no variant's container runs,
  `--connect 0026 --variant opus` names `sandbox.sh 0026 --variant opus`; `--connect` with `--variant` and
  `--in-place` is refused. (R14)
- [ ] Add a test that a run of a variant whose container is running is refused as a unit's is, and that its message
  names `'sandbox.sh --connect 0026 --variant opus [COMMAND...]'` and the variant's container. (R10)
- [ ] Add a test that the forms the wrapper lists when nothing to mount is given show `--variant NAME`. (R1)
- [ ] In `container/unit-clone.sh`, add `is_variant_branch`, make `find_unit_branch` drop branches it holds true
  for from the number lookup, and add `resolve_variant_branch` and `find_variant_branch` as the approach says, with
  a comment above each in the file's manner. (R2, R5, R6, R12, R13, R14)
- [ ] In `container/sandbox.sh`, take `--variant` before and after the unit, refuse as step 2 of the approach says,
  resolve the variant's branch as step 3 says, carry `unit_given` into the two messages of step 4, and update the
  usage in the header and `mount_forms`. Run `npm test` until the new tests and every existing one pass. (R1 to R6,
  R10, R12 to R14)
- [ ] `sandbox-dev.sh` reads the wrapper's options to tell `--connect` from a run, and says that an option the
  wrapper gains that takes a value is added there. In `tests/sandbox-dev.test.mjs`, add tests that
  `./sandbox-dev.sh --variant opus --connect 0026` and `./sandbox-dev.sh --variant=opus --connect 0026` pass no
  `--rebuild`, and that `./sandbox-dev.sh --variant opus 0026` passes it; then in `sandbox-dev.sh` step over
  `--variant` and its name by two, and over `--variant=<name>` by one. In "sandbox-dev.sh" of `CONTRIBUTING.md`,
  show `[--variant NAME]` in its unit form and its `--connect` form. (R1, R14)

Running variants, with Docker:

- [ ] In `tests/wrapper-fixture.mjs`, add `containerHost(base, recorded)`: the `bin` of `hostBin`, with a `docker`
  that answers `config --format json` as `configAnswer` does and `image inspect` from an `imageLabels` file as
  `fakeHost`'s does, records every call as `fakeHost`'s does, passes `ps`, `rm` and `exec` to the real `docker` with
  the suite's `DOCKER_CONFIG` and `DOCKER_HOST` as `dockerHost` does, and turns a `compose ... run` into a real
  `docker run --rm --name <name>` of an image it is given, with the call's `--volume` flags, `--workdir /work`,
  `--user` of the suite's uid and gid, `--env HOME=/tmp` and the call's command. Document it above the function as
  `fakeHost` and `dockerHost` are documented. (R22)
- [ ] Add `tests/sandbox-variant.test.mjs`, skipped with the message of the other Docker tests where `docker info`
  fails, on a project set up as `setUp` of `tests/sandbox-unit-run.test.mjs` sets one up, with the image of the
  `FROM ... AS base` of `container/Dockerfile`, and every container it names removed with `docker rm -f` after each
  test. A run's command commits a file named after its run in `/work` with `git -c user.name=... -c
  user.email=... commit`, and then waits until a file the test writes in the base directory is there. Tests:
    * the unit run of `task-0026-doc` and the variants `opus` and `gpt-6-1` are started together, all three
      containers are running at once (real `docker ps`), each in its own clone; once released, each branch holds
      its own run's commit alone, and `sandbox/<branch>` and the clone of each are gone (R7, R8, R9, R11)
    * a variant started while the unit run's container is running, and started while none is, both run and land
      (R8)
    * a variant that ends while the unit run still runs leaves the unit run's container running and its clone and
      branch as they were, and the unit run then lands its own commit on `task-0026-doc` alone (R8, R9)
    * a second run of a variant whose container is running is refused, and the first runs on and lands (R10)
    * `--connect 0026 --variant opus` runs its command in the variant's container and not in the unit's, shown by
      a file it writes in `/work` that appears in the variant's clone alone (R7, R14)
- [ ] Run `npm test` on a host with Docker, and log in `record.md` whether the new file ran or was skipped. (R22)

The kit's process and roles:

- [ ] In `process.md`, where it says that a review's findings are saved in `.reviews/<unit-directory>/`, say: a
  review of a variant, a unit run of a branch whose name holds `--`, is saved in a file whose name ends in
  `--<name>.md` with the variant's name, which is what follows the last `--` of the branch's name; a review of the
  unit's branch in a file whose name holds no `--`; and a role on a variant takes findings only from its own
  variant's files, and a role on the unit's branch only from files without `--`. This holds on the host as in the
  sandbox. In the rules on an entry of `record.md`, add that an agent's entry made on a variant's branch names the
  variant in its text, as "on the variant `opus`", and one made on the unit's branch names none. (R15, R16, R17,
  R18, R19)
- [ ] In `roles/reviewer.md`, where it says to save the findings in a file whose name tells it apart, add that the
  name ends in `--<name>.md` on a variant's branch and holds no `--` on the unit's, as `process.md` says; in
  "Re-reviewing a unit", that the last review is looked for only among the files of the same run; and in "Record
  that you reviewed", that the entry names the variant as `process.md` says. (R15, R16, R18, R19)
- [ ] In `roles/implementer.md`, in "Review findings", add that the findings taken are only those of the files of
  `.reviews/<unit-directory>/` of its own run, as `process.md` says, and that it reads its variant from its branch.
  (R16, R17, R19)
- [ ] Run `npm test`, whose tests of the package's documents read these files. (R19)

The documents:

- [ ] In `SANDBOX.md`, add the section "Two implementations of one unit" after "Two agents on one unit", saying what
  requirement 20 lists: what a variant is for, with two variants of one unit started in two terminals as
  `./sandbox.sh 0029 --variant opus npx agentrite run implementer claude 0029 --model <id>` and the same with
  `--variant` and `--model` of another; the option, that it is optional, the form of a name and the branch's name;
  that the branch is cut from the host's branch of the unit as it is at the start, so commits of a unit run that are
  not yet brought back are not in it, and that a unit with no branch has it cut first; that its commits come back to
  the variant's branch alone, and that a variant is named afterwards by its unit and `--variant`, or by its branch's
  full name, while a number names the unit's branch alone; `--connect` with `--variant`; that the reviews are kept
  apart by their file's name; and comparing with `git diff <unit's branch> <variant's branch>` or of two variants,
  taking one by `git merge` of its branch into the unit's branch or `git branch --force <unit's branch> <variant's
  branch>` with the unit's branch not checked out, and deleting one not taken with `git branch --delete --force` and
  its clone with `rm -rf` when one was kept. Use the `agentrite run` form that "Running a role" of `README.md`
  gives, checked against `scripts/agentrite-run.mjs`. (R20)
- [ ] In "Running a unit" of `SANDBOX.md`, in the list of several runs, add that a unit's variants run beside it and
  beside each other, pointing to the new section; in "Where things are kept on the host", say under "The clone of a
  unit run" that a variant's clone is kept as a unit run's is, at its branch's name. (R20, R21)
- [ ] In `README.md`, show `[--variant NAME]` in the unit form and the `--connect` form of "sandbox.sh", add
  `--variant NAME` to its table of options, name the new section among the `SANDBOX.md` sections the section points
  to, and in "The sandbox" add a line on a variant beside the one on `--connect`. Keep every line within 120
  characters and every table line of `SANDBOX.md` within it. (R21)
- [ ] Run `npm test` and `npm run check-changes`, after committing. (R22)

## Verification

- [ ] `npm test` passes on the host, with `tests/sandbox-variant.test.mjs` run and not skipped, since the host has
  Docker
- [ ] `./sandbox.sh --in-place npm test` passes, with the Docker tests skipped there
- [ ] `npm run check-changes` passes on the committed branch
- [ ] By hand on the host, with the working copy's wrapper: `./sandbox-dev.sh 0047 --variant try echo hi` cuts
  `feature-0047-second-run-of-a-unit--try`, runs and lands; `git branch --list '*--try'` shows it; it is then deleted
  with `git branch --delete --force`
- [ ] Each requirement R1 to R22 has a task above whose trace names it

## Commit Points

- [ ] `feature-0047 Plan the variants of a unit`: `plan.md` and the record's entry
- [ ] `feature-0047 Run a variant of a unit`: `container/unit-clone.sh`, `container/sandbox.sh`, `sandbox-dev.sh`,
  `CONTRIBUTING.md` and their tests in `tests/sandbox-unit-run.test.mjs` and `tests/sandbox-dev.test.mjs`
- [ ] `feature-0047 Test variants that run side by side`: `tests/wrapper-fixture.mjs` and
  `tests/sandbox-variant.test.mjs`
- [ ] `feature-0047 Keep the reviews of each variant apart`: `process.md`, `roles/reviewer.md`,
  `roles/implementer.md`
- [ ] `feature-0047 Document variants`: `SANDBOX.md`, `README.md`, and the record's entries of the work
