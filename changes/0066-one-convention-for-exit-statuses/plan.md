# 0066 One convention for exit statuses

## Approach

The convention is the one `npx agentrite` follows already, so the work is in three places: `container/sandbox.sh`,
which moves every refusal that is not about its arguments from 2 to 1; the change check, which gains a refusal of a
second argument; and the documents, which define the statuses once in `README.md` and point to them from every
command.

`container/sandbox.sh` exits 2 at 28 places today. Each keeps 2 or becomes 1 by requirements 4 and 5:

| Line today | Refusal                                                                | Status |
|------------|------------------------------------------------------------------------|--------|
| 106        | the first argument is not the project root                             | 1      |
| 118        | `sandbox/compose.project.yml` not found                                | 1      |
| 129        | the kit is not inside the project root                                 | 1      |
| 162        | `--workdir` without its directory                                      | 2      |
| 175, 236   | `--variant` without its name                                           | 2      |
| 184        | `--mount` without its path                                             | 2      |
| 211        | `--connect` with an option of a run                                    | 2      |
| 216        | `--connect` with no unit                                               | 2      |
| 254        | `--variant` given twice                                                | 2      |
| 262        | `--variant` with `--in-place` or `--workdir`                           | 2      |
| 269        | a variant's name not of the form it takes                              | 2      |
| 304        | no unit, `--in-place` or `--workdir`                                   | 2      |
| 315        | `agentrite.json` at fault, as the reader of `bell` says                | 1      |
| 341        | `--connect` to a unit that names no branch                             | 1      |
| 348        | a unit that names no branch, or one the default branch cannot cut      | 1      |
| 356        | `--variant` with a unit given by a variant's branch                    | 2      |
| 368        | the variant's branch cannot be found or cut                            | 1      |
| 416        | run as root                                                            | 1      |
| 552        | the project's compose file configures a service `agent`               | 1      |
| 603        | the project's `sandbox/Dockerfile` changes how the image starts        | 1      |
| 664, 668   | `--connect` with no run under way, or Docker cannot be asked           | 1      |
| 713, 717   | a run under way for the branch, or Docker cannot be asked              | 1      |
| 719        | a clone not yet brought back                                           | 1      |
| 803, 810   | the latest published version of a harness cannot be found              | 1      |

The internal return statuses of `unit_container_running` and of the functions of `container/unit-clone.sh` stay as
they are: they are not exit statuses, and only the `exit` that follows them changes.

An option it does not take is one of the refusals requirement 5 keeps at 2, and requirement 9 asks for a test of it.
Today `container/sandbox.sh` has no such refusal: its option loop stops at the first word it does not know, so
`./sandbox.sh --frobnicate` takes `--frobnicate` for the unit and refuses it as a unit that names no branch, which
requirement 4 makes 1, and `./sandbox.sh --in-place --frobnicate` runs `--frobnicate` in the container. The loop
therefore refuses, with 2, a word that opens with `-` where an option stands, before `--`, names it, says that a unit
or a command that opens with `-` goes after `--`, and prints the forms `mount_forms` prints. That is what the
`--` row of "Commands" of `README.md` says already: `--` ends the options, so that what follows is the unit or the
command. A command's own options after the unit, or after `--in-place COMMAND`, are past the loop and are passed on
as they are, as today. `sandbox-dev.sh` passes such a word on, and `container/sandbox.sh` refuses it.

`mount_forms` is defined after the option loop today, so it is moved above it, unchanged, in a commit of its own
before the refusal uses it.

`sandbox-dev.sh` execs the working copy's `container/sandbox.sh`, so it follows requirements 4 and 5 by that alone.
A test shows it.

The change check reads `process.argv[2]` and ignores the rest. Its entry point refuses more than one argument, as
`scripts/agentrite-settings.mjs` refuses arguments it does not take: a line that says it takes one argument, the
repository root, then its usage, `usage: node check-changes.mjs [<repository root>]`, on standard error, and exit 2,
before anything is read.

`README.md` gets a section `## Exit statuses` right after `## Commands` and before `## Running a role`, so that it
sits beside the commands that link it. Each section under "Commands" ends its prose with the statuses it exits with
and a link to `#exit-statuses`.

## Files

- `container/sandbox.sh`: `mount_forms` moved above the option loop; a word that opens with `-` where an option
  stands refused with 2; every refusal of the table above that is marked 1 exits 1; the comment above
  `refuse_changed_start` says it refuses with 1
- `scripts/check-changes.mjs`: the entry point refuses more than one argument with its usage and 2
- `tests/check-changes.test.mjs`: the change check given two arguments
- `tests/sandbox-wrapper.test.mjs`: an option it does not take; the expectations that become 1
- `tests/sandbox-unit-run.test.mjs`: the expectations that become 1; `assertNothingRan` takes the status it expects
- `tests/sandbox-update.test.mjs`, `tests/sandbox-variant.test.mjs`, `tests/sandbox-project-dockerfile.test.mjs`,
  `tests/settings-update.test.mjs`: the expectations that become 1
- `tests/sandbox-dev.test.mjs`: a refusal through `./sandbox-dev.sh` exits 1
- `README.md`: the section "Exit statuses"; the statuses in each section of "Commands"; the statements of a status
  the kit chooses that say "non-zero", "a status other than 0" or 2 for what is now 1
- `SANDBOX.md`: the entry of "When something goes wrong" on `--connect`, which says it exits with 2
- `CONTRIBUTING.md`: the section `sandbox-dev.sh` of "Commands" says it exits as `./sandbox.sh` does
- `AGENTS.md`: a section that every command of the kit and of this repository follows "Exit statuses"

## Tasks

The refactoring:

- [x] Move the definition of `mount_forms` in `container/sandbox.sh`, with its comment, to just above the option
  loop, unchanged, and leave the comment on what to mount at `/work` with the check that follows it. Run the sandbox
  suites, which pass unchanged (R5)

The change check:

- [x] Add to `tests/check-changes.test.mjs` a test that runs the change check with two arguments in a directory that
  is no git repository, so that a check that ran would fail with 1, and asserts status 2, nothing on standard output,
  and standard error that says it takes one argument, the repository root, and holds its usage line. It fails
  before the next task (R7, R9)
- [x] In the entry point of `scripts/check-changes.mjs`, refuse more than one argument before `run` is called: print
  the line and the usage on standard error and exit 2. Leave `run` and the statuses 0 and 1 as they are (R7)

`./sandbox.sh`:

- [x] Add to `tests/sandbox-wrapper.test.mjs` a test that `--frobnicate` given where an option stands is refused
  with status 2, naming `--frobnicate` and `--`, listing the forms, and asking Docker and npm nothing: given alone,
  after `--rebuild`, after `--in-place` and after `--connect`. Add one that `--in-place -- --frobnicate` runs
  `--frobnicate` as the command, as today. The first fails before the refusal is added (R5, R9)
- [x] In the option loop of `container/sandbox.sh`, refuse a word that opens with `-` and is none of the options,
  where the loop reads it, with the message the approach gives, the forms from `mount_forms`, and exit 2 (R5)
- [x] Change to 1 the expected status of every test that expects 2 for a refusal the table marks 1. By file and test
  as the tests are named today (R4, R9):
    - `tests/sandbox-wrapper.test.mjs`: "the wrapper refuses to run without a project root, naming the shim", "the
      wrapper refuses a project root that is not a directory", "the wrapper refuses a kit outside the project root,
      which the build cannot reach", "the wrapper refuses a project whose service is still agent, given ...", "the
      wrapper stops, and builds and runs nothing, when the latest is needed and ...", "the wrapper says nothing of
      the latest of one harness when that of the other cannot be found", and "a start with ... and a bell at fault
      is refused with the reader's message, asking nothing", which is the test of an `agentrite.json` at fault
    - `tests/sandbox-unit-run.test.mjs`: "the wrapper lists the branches an ID names when there are several, and
      starts nothing", "the wrapper says that ... names no branch and that a number gets one cut, and starts
      nothing", which is the test of a unit that names no branch, "the wrapper cuts no branch for ..., says why, and
      starts nothing", "the wrapper names the default branch in what it says of a unit the branch does not hold",
      "the wrapper refuses a second run of ... while its container is running, and names --connect", "the wrapper
      refuses a new clone while sandbox/<branch> holds commits the branch lacks, before it builds", "the wrapper
      starts nothing when Docker cannot say whether the container is running", "--connect is refused as root, like
      a run", "the wrapper refuses a project whose service is still agent, given ...", "a number that only a variant
      branch holds names no branch" and "a second run of a variant whose container is running is refused, and
      names the variant"
    - `tests/sandbox-unit-run.test.mjs`: `assertNothingRan` takes the status it expects as an argument. The tests
      of `--connect` with no unit, and with an option of a run, given with a directory that is there or not, and
      with `--variant` and `--in-place`, pass 2. Those of `--connect` to a unit that names no branch, to `0010`,
      which names several, while no container of the run is running, when Docker cannot say whether it is, to a
      variant that has no branch and to a variant whose container is not running pass 1
    - `tests/sandbox-update.test.mjs`: the missing `sandbox/compose.project.yml` and the service still named
      `agent`, in "a project of the release before starts its sandbox after the four steps, and its names stay"
    - `tests/sandbox-variant.test.mjs`: "a second run of a variant whose container is running is refused, and the
      first runs on"
    - `tests/sandbox-project-dockerfile.test.mjs`: "an image whose project's file sets ... is refused at every start
      until the file drops it" and "a unit run of an image whose project's file sets ENTRYPOINT is refused before
      its clone is made"
    - `tests/settings-update.test.mjs`: the unit run refused for a missing `agentrite.json` in "a project with the
      wrappers, the sandbox and no agentrite.json gets one in the four steps"
- [x] Leave at 2 the tests of the refusals the table marks 2, among them "the wrapper refuses ..., names the forms,
  and asks Docker and npm nothing" of `tests/sandbox-wrapper.test.mjs`, "the forms the wrapper lists say the default
  branch, and are printed without reading the file", "the forms the wrapper lists when nothing to mount is given
  show --variant NAME", `assertVariantRefused` and its tests, among them "--variant given ... is refused", which is
  the test of `--variant` given twice, in `tests/sandbox-unit-run.test.mjs`, and "the shim adds no --rebuild to a
  --connect that follows another option and its directory" of `tests/sandbox-dev.test.mjs`. Run the sandbox suites,
  which fail now for every test changed to 1 (R5, R9)
- [x] In `container/sandbox.sh`, change to `exit 1` every `exit 2` the table marks 1, and the comment above
  `refuse_changed_start` to say it refuses with 1. Leave the return statuses of the functions as they are. Run the
  sandbox suites, which pass (R4)
- [x] Add to `tests/sandbox-dev.test.mjs` a test that `./sandbox-dev.sh --in-place echo hi` in a checkout whose
  `agentrite.json` is `{}` exits 1, with the reader's message, and calls Docker for nothing (R6)

The documents:

- [x] Add `## Exit statuses` to `README.md`, after `## Commands` and before `## Running a role`. It defines `0`, `1`,
  `2`, `3` and above, and a status passed on, as requirement 1 words them, and says that a caller cannot tell a
  status passed on from the command's own. It names the commands that pass a status on and from when: `npx agentrite
  run` once the harness started, `./sandbox.sh` with a unit, `--in-place` or `--workdir` once the command, or the
  shell, in the container started, and `./sandbox.sh --connect` once the connected command started, and that before
  that their own statuses hold. It says that `./sandbox.sh` of a unit exits 1 when the command exited 0 and the work
  was not brought back, and that `npx agentrite run` exits 1 when a signal ended the harness (R1, R2)
- [x] In each section of "Commands" of `README.md`, `agentrite init`, `agentrite config`, `agentrite refresh`,
  `agentrite roles`, `agentrite run`, `check-changes` and `sandbox.sh`, say which statuses it exits with, by the
  meanings of "Exit statuses", and link that section. No command has a status of its own of 3 and above, so none is
  named. `check-changes` says 0, 1 for units at fault or a check that failed, and 2 for more than one argument, and
  its argument table says it takes one. `sandbox.sh` says 1 and 2 for its own refusals, the status passed on, and
  that a word that opens with `-` where an option stands is refused and that a unit or a command that opens with
  `-` goes after `--` (R3, R5, R7)
- [x] Name the status the convention gives where `README.md` says otherwise of one the kit chooses: in
  "check-changes", "exits non-zero" becomes 1; in "Running a role", "a status other than 0 when a signal ended the
  harness" becomes 1; in "The project's settings", "exits with a status other than 0" becomes 1 and the start of
  `./sandbox.sh` with a file at fault "exits 2" becomes 1; in "Updating a project to a newer kit", "the command
  exits non-zero" becomes 1 (R3)
- [x] In "When something goes wrong" of `SANDBOX.md`, the entry headed "`--connect` runs nothing, says why and exits
  with 2" says that it exits with 1, or with 2 for an option of a run, and each of its cases names its status: 1
  for a unit that names no local branch and for Docker that cannot be asked, 2 for an option of a run (R3)
- [x] In "Commands" of `CONTRIBUTING.md`, the section `sandbox-dev.sh` says that it exits as `./sandbox.sh` does,
  by "Exit statuses" of `README.md` (R6)
- [x] Add to `AGENTS.md` a section `## Exit statuses`, after "The kit's command", that says that every command of
  the kit and every command of this repository's own follows "Exit statuses" of `README.md`, and that a unit that
  adds a command, or a status of one, does so by that section (R8)
- [x] Search `README.md`, `SANDBOX.md` and `CONTRIBUTING.md` for "non-zero", "other than 0", "exits 2", "exits with
  2" and "status 2", and confirm that each that is left is a status that the convention gives as it is said (R3)

The review's findings S1 and S2:

- [x] Add to `tests/wrapper-fixture.mjs` `assertFormsListed`, which asserts that standard error lists the four forms
  of the wrapper, and use it for the forms in `tests/sandbox-wrapper.test.mjs`. Have `assertVariantRefused`, and
  `assertNothingRan` given 2, of `tests/sandbox-unit-run.test.mjs` assert it too, and add to
  `tests/sandbox-wrapper.test.mjs` a test that `--workdir` and `--mount` given with no value are refused with 2 and
  the forms, asking Docker and npm nothing. They fail before the next task (S1, R1, R5, R9)
- [x] In `container/sandbox.sh`, split the lines of the forms out of `mount_forms` into `list_forms`, and add
  `refuse_arguments`, which prints the lines it is given, `The forms it takes:` and the forms, and exits 2. Every
  refusal with 2 uses it, but the one of nothing to mount, which keeps `mount_forms`. Run the sandbox suites, which
  pass (S1, R1, R5)
- [ ] In "Exit statuses" of `README.md`, and in the section `sandbox.sh` of "Commands", say that a Docker command the
  wrapper runs before the command starts, as Compose reading the configuration or the build, that fails ends it with
  Docker's status, which it passes on (S2, R1, R2)

## Verification

- [x] `npm test` passes
- [x] `npm run check-changes` passes, on the committed work
- [x] No line that the unit adds or changes is longer than 120 characters
- [x] Every requirement, 1 to 9, has a task, and every task names the requirements it delivers

## Commit Points

- [x] `feature-0066 Plan the unit`: `plan.md` and the planner's entry in `record.md`
- [x] `feature-0066 Define mount_forms before the option loop`: the refactoring task, which changes no behavior
- [x] `feature-0066 Refuse a second argument to the change check`: the two tasks of the change check
- [x] `feature-0066 Exit 1 for every refusal of the sandbox but its arguments`: the tasks of `./sandbox.sh`,
  `sandbox-dev.sh`'s test among them
- [x] `feature-0066 Define the exit statuses once`: the tasks of the documents
- [x] `feature-0066 Record the verification`: the ticks of "Verification" and the entry in `record.md` that says
  what was run on the committed work
- [x] `feature-0066 Print the forms with every refusal of the sandbox's arguments`: the first two tasks of the
  review's findings, with the outcome of S1 in `record.md`
- [ ] `feature-0066 Say that the sandbox passes on a status of Docker before the start`: the last task of the
  review's findings, with the outcome of S2 in `record.md`
