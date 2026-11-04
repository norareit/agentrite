# 0095 A project uses the sandbox alone

## Approach

The work falls into four parts, built in this order so that each leaves a tree that passes the suite: the key, the
image and Compose file, the wrapper, and then `init` and `refresh` with the shim. The documents come last.

**The key.** `process` joins `KEYS` in `scripts/agentrite-settings.mjs`, right after `harnesses`, as a boolean judged
as `sandbox` is. It is therefore required and judged by every command that reads the whole file through
`parseSettings`, and it is named in `MUST_HOLD_OBJECT`, which is built from `KEYS`. After the keys are judged,
`parseSettings` refuses `process` and `sandbox` both `false` with a message of its own that names both keys and says
that a project without the process has the sandbox. The CLI prints that message as `agentrite: ...` and exits 1, as it
does for every other key at fault. `parseBell` does not change, so a start of the sandbox that cuts no branch is not
refused for a missing `process`. `settingsText` writes the key after `harnesses`.

**How the mode reaches the wrapper.** The shim passes `--sandbox-only` as the wrapper's first argument, before the
project root:

```sh
exec "$here/node_modules/agentrite/container/sandbox.sh" --sandbox-only "$here" "$@"
```

The wrapper takes the mode when its first argument is exactly `--sandbox-only` and shifts it off before it judges the
project root. Every shim so far passes the root first, which the shim makes absolute, so it never reads as the mode,
and such a shim runs the wrapper as today. A developer who types `./sandbox.sh --sandbox-only` in a project with the
process reaches the wrapper with it after the root, where it is an unknown option and refused as one. There is one
shim template, `templates/project/sandbox.sh`, whose `exec` line holds the placeholder `{{mode}}` right before
`"$here"`. It is filled with an empty string for a project with the process, which gives the shim of today byte for
byte, and with `--sandbox-only ` for a sandbox-only project.

**No hook in the container.** The hooks directory moves out of `container/compose.yml` into the wrapper, by the one
mechanism the file already uses for what the wrapper decides: `GIT_CONFIG_VALUE_1` becomes
`${SANDBOX_GIT_HOOKS_PATH:?run the sandbox through the project's sandbox.sh}`. The wrapper exports
`SANDBOX_GIT_HOOKS_PATH` right after it reads the mode, before any Compose call, `config` of `--connect` among them:
`/usr/local/lib/agentrite/hooks` with the process and `/usr/local/lib/agentrite/no-hooks` without. The Dockerfile
makes `/usr/local/lib/agentrite/no-hooks` as an empty directory owned by root. Overriding the entry with an `--env` of
`docker compose run` was rejected: it would write over entry 1 of a project that sets its own `GIT_CONFIG_*` in
`sandbox/compose.project.yml`, which the compose file says overrides both of the kit's entries. A connected process
inherits the run's environment, so `--connect` needs nothing of its own.

**The wrapper in the sandbox-only mode.** The mode changes six things and nothing else:

* the forms it lists, and the words of its refusals of arguments, name a branch and no unit, unit number or variant.
  The texts that differ by mode are set once, right after the mode is read, and the code that prints them uses them
  without asking the mode again
* `--variant`, in every form that is read today, before the branch and right after it, is refused with 2 before
  anything is read, and before the check that it was given twice and the check of the variant's name
* the branch is found by a new function `resolve_branch` of `container/unit-clone.sh`. A local branch of that exact
  name is printed. Otherwise a name git does not take as a branch's is refused, naming the name, with 1. Otherwise
  the default branch is read with the reader, as `resolve_unit_branch` reads it today, and the new `cut_branch` cuts
  the branch from the head of the local default branch and says on standard error what it cut, from which branch and
  at which commit. A missing local default branch is refused with the message `cut_unit_branch` gives today. A name
  is a branch's when `git check-ref-format "refs/heads/<name>"` and `git check-ref-format --branch <name>` both take
  it, the second refusing `HEAD` and a name that opens with `-`, and the first refusing `@{` that the second would
  expand. Nothing of `changes/` is read and no number is matched
* `--connect` finds the local branch of that exact name only, and a name that is none is refused with a message that
  calls it a branch, as it is refused today
* the clone run mounts neither `.reviews` nor `.orchestrator`, and makes neither directory in the root or the clone
* `SANDBOX_GIT_HOOKS_PATH` is the directory without the hook

**`init` and `refresh`.** `parseInit` takes `--sandbox-only`, by an exact match like the other options, and refuses it
together with `--no-sandbox` by a thrown message with the usage, which the CLI prints and exits 2 with.
`settingsToWrite` writes `process` from it, and with it `sandbox` as `true` and `orchestrator` as `false`. In a
sandbox-only project, which `settings.process` false says whether the settings came from the file or from the
arguments, `init` plans `agentrite.json`, the sandbox's shim and compose file and `.dockerignore`, and nothing else: it
calls neither `readRoles` nor `hookPath`, does not touch `package.json`'s scripts or `opencode.json`, and collects no
notice. `refresh` in a sandbox-only project writes the shim alone, and calls neither `readRoles`, `refreshHook`,
`removeStaleWrappers` nor `instructionNotices`. Both still read the whole file through `readSettings`, so its paths
are checked as today, and nothing reads the content of the role files or the standards.

## Files

- `scripts/agentrite-settings.mjs`: the key `process` in `KEYS` and in the `Settings` type, the refusal of `process`
  and `sandbox` both `false` in `parseSettings`, and the key in `settingsText`
- `scripts/agentrite.mjs`: `--sandbox-only` in `parseInit` and `INIT_FORM`, `settingsToWrite`, the shim's mode in
  `shimFile`, `kitOwnedFiles`, `sandboxFiles` and `plannedProjectFiles`, and the sandbox-only paths of `init` and
  `refresh`
- `templates/project/agentrite.json`: `"process": true` after `harnesses`
- `templates/project/sandbox.sh`: the placeholder `{{mode}}` in the `exec` line, and a comment line that says what the
  wrapper's first argument `--sandbox-only` is for
- `agentrite.json`: `"process": true` after `harnesses`
- `container/compose.yml`: `GIT_CONFIG_VALUE_1` from `SANDBOX_GIT_HOOKS_PATH`, and its comment
- `container/Dockerfile`: the empty directory `/usr/local/lib/agentrite/no-hooks`, and the comment above the hook's
  `COPY`
- `container/sandbox.sh`: the mode, `SANDBOX_GIT_HOOKS_PATH`, the forms and words of the mode, the refusal of
  `--variant`, the branch of the mode, the mounts of a clone run, and the comments at the top, the usage among them
- `container/unit-clone.sh`: `resolve_branch`, `cut_branch` and `is_branch_name`, `find_branch` for the exact lookup
  that both `resolve_branch` and `--connect` make, `say_no_default_branch` for the message `cut_branch` shares with
  `cut_unit_branch`, and its opening comment
- `tests/installed-kit.mjs`: `kitSettingsText` takes `process`, `true` unless it is given
- `tests/agentrite-settings.test.mjs`, `tests/agentrite-config.test.mjs`, `tests/agentrite-init.test.mjs`,
  `tests/agentrite-refresh.test.mjs`: the key, `init --sandbox-only` and `refresh` in a sandbox-only project
- `tests/sandbox-only.test.mjs`: new, the wrapper in the sandbox-only mode on the fake host of
  `tests/wrapper-fixture.mjs`
- `tests/sandbox-only-setup.test.mjs`: new, end to end: `init --sandbox-only`, then the shim it wrote started on a new
  branch name
- `tests/sandbox-unit-run.test.mjs`, `tests/sandbox-wrapper.test.mjs`: a run of the wrapper as an old shim starts it
  exports the hooks directory with the hook
- `tests/sandbox-commit-msg.test.mjs`: the test of the hooks directory reads it from the wrapper and the compose file
  together, and a test with Docker that a commit in the container with the sandbox-only directory is not checked
- `tests/sandbox-git-environment.test.mjs`: the files of this unit that start `init` or `refresh`, and the value the
  sandbox sets for `GIT_CONFIG_VALUE_1` in a project with the process
- `tests/settings-update.test.mjs`, `tests/sandbox-update.test.mjs`: the shim compared with the template filled for a
  project with the process, and `process` where they write the file
- Every other test that writes an `agentrite.json` by hand: `"process": true` after `harnesses`. Candidates found by
  `grep -ln '"harnesses"\|harnesses:' tests/*.mjs` are `agentrite-approve`, `agentrite-config`,
  `agentrite-definition`, `agentrite-instructions`, `agentrite-orchestrate` and `check-changes`
- `COMMANDS.md`: the table at the top, "agentrite init", "agentrite refresh" and "sandbox.sh"
- `SETUP.md`: "Installing it into a project", "Git hooks", "The project's settings" and "Updating a project to a
  newer kit"
- `SANDBOX.md`: a new section on running on a branch in a sandbox-only project, "Commit messages" and "Where things
  are kept on the host"
- `README.md`: the line of `SETUP.md` in "The documents"

## Tasks

### The key

- [x] In `tests/agentrite-settings.test.mjs`, add tests: a file without `process` is refused naming the file, the
  key, that it is missing, and `true or false`; `"process": "true"` and `"process": 1` are refused naming what they
  hold; `process` and `sandbox` both `false` is refused with a message that names both keys and says a project
  without the process has the sandbox; `process` false with `sandbox` true is taken; `settingsText` writes `process`
  right after `harnesses`; `parseBell` takes a file without `process`; `readSettings` judges the paths of `standards`,
  `orchestrator` and `roles` in a file whose `process` is `false` as it does with `true`. (R1, R2, R3, R5)
- [x] In `tests/agentrite-config.test.mjs`, add a test that `config` writes `"process": true` right after
  `harnesses`, and one that the template `templates/project/agentrite.json` holds it there. (R4, R5)
- [x] Add a test of the CLI, in `tests/agentrite-settings.test.mjs` or beside the other tests that start the command,
  that `npx agentrite roles` on a file with `process` and `sandbox` both `false` prints the message, writes nothing and
  exits 1. (R2)
- [x] Add `process` to `KEYS` after `harnesses` and to the `Settings` type, return it from `parseSettings`, refuse the
  pair there after the keys are judged, and write it in `settingsText`. (R1, R2, R5)
- [x] Add `"process": true` after `harnesses` to `templates/project/agentrite.json` and to `agentrite.json`. (R4, R5)
- [x] Give `kitSettingsText` in `tests/installed-kit.mjs` the parameter `process`, `true` unless given, and add
  `"process": true` after `harnesses` to every `agentrite.json` a test writes by hand, in the files named under
  "Files". Run `npm test` and fix every test still failing for the missing key. (R1)

### The image and the Compose file

- [x] In `tests/sandbox-commit-msg.test.mjs`, change the test of the hooks directory: the compose file gives
  `safe.directory` and then `core.hooksPath` from `${SANDBOX_GIT_HOOKS_PATH:?...}`, and the wrapper's value for a
  project with the process is the directory the Dockerfile copies the hook to. Add a test that the last stage of the
  Dockerfile makes `/usr/local/lib/agentrite/no-hooks`, copies nothing into it, and that the wrapper's sandbox-only
  value is that directory. Add a test with Docker, skipped as the file's others are without Docker, in which a
  commit in a container with `SANDBOX_GIT_HOOKS_PATH` set to the sandbox-only directory is made with a message that
  carries a `Co-Authored-By` trailer, and one in which a `commit-msg` hook in the repository's `.git/hooks` that
  fails is not run. (R21, R24)
- [x] In `container/compose.yml`, set `GIT_CONFIG_VALUE_1` from `SANDBOX_GIT_HOOKS_PATH` with the `:?` message the
  other variables of the wrapper have, and rewrite the comment above it to say that the wrapper names the directory:
  the image's with the hook with the process, and the image's empty one without. (R21, R24)
- [x] In `container/Dockerfile`, make `/usr/local/lib/agentrite/no-hooks` in the `RUN` after the hook's `COPY`, and
  say in the comment above that it is the hooks directory of a sandbox-only project, which holds no hook. (R21)
- [x] In `container/sandbox.sh`, export `SANDBOX_GIT_HOOKS_PATH` as `/usr/local/lib/agentrite/hooks` before the
  first Compose call, so that the tree passes with the process alone. (R24)
- [x] In `tests/sandbox-git-environment.test.mjs`, set `GIT_CONFIG_VALUE_1` to `/usr/local/lib/agentrite/hooks`, the
  value the wrapper sets with the process, rather than the compose file's entry, which is now a variable. (R34)

### The wrapper

- [x] Create `tests/sandbox-only.test.mjs`, with a `setUp` like that of `tests/sandbox-unit-run.test.mjs` whose `run`
  starts the wrapper with `--sandbox-only` and the project root, and whose `agentrite.json` has `process` false. It
  holds the tests of the next three tasks. Every process it starts has an environment from
  `withoutGitEnvironmentConfiguration`. (R32)
- [x] Add tests of the branch: a local branch of the exact name is run on a clone, and the recorded Compose run mounts
  the clone at `/work` and neither `.reviews` nor `.orchestrator`, and neither directory exists in the root or the
  clone afterwards; a new name is cut from the head of the local default branch, the one `agentrite.json` names and
  not a branch `master`, and standard error names the branch, the default branch and the short commit; a name of
  digits that a branch name holds, as `0010` beside `feature-0010-init`, is cut as a branch `0010` and matches
  nothing; a project with no `changes/` cuts as one with it; a name of digits that `changes/` on the default branch
  holds is cut under that name, not after the unit's kind; a missing local default branch is refused with 1 and cuts
  nothing; each of `-x` given after `--`, `HEAD`, `a..b`, `x.lock`, `@{-1}` and `has space` is refused with 1 by a
  message that names it, cuts nothing and starts nothing; a run on the branch is fetched back as `sandbox/<branch>`
  and fast-forwards the host's branch, is resumed when its clone is kept, and its container is named after the
  Compose project and the branch. (R13, R14, R15, R16, R17)
- [x] Add tests of the arguments and messages: `--variant NAME`, `--variant=NAME`, before the branch, right after it
  and given twice, each refused with 2, by a message that says variants belong to the change process, and with
  nothing read, built or cut, as the tests of a refused start in `tests/sandbox-unit-run.test.mjs` find; the forms
  listed with a refusal of arguments and when nothing to mount was given name `BRANCH` and none of `UNIT`, `unit`,
  `ID` or `--variant`; `--connect BRANCH` runs the command in the container of that branch's run; `--connect` with a
  name that is no local branch, a number among them, is refused with 1, by a message that calls it a branch and
  names no unit, and cuts nothing; `--connect` with no name is refused by a message that names a branch; `--in-place`
  and `--workdir` run as with the process; every recorded Compose call carries
  `SANDBOX_GIT_HOOKS_PATH=/usr/local/lib/agentrite/no-hooks`; and a check over the standard error of every refusal in
  the file that it holds no word `unit`. (R18, R19, R20, R21, R22)
- [x] Add a test to `tests/sandbox-unit-run.test.mjs` that a run started as a shim of today starts it, with the
  project root first and no mode, finds a unit by its number and cuts its branch from `changes/` as before, mounts
  `.reviews` and `.orchestrator`, and carries `SANDBOX_GIT_HOOKS_PATH=/usr/local/lib/agentrite/hooks` on its Compose
  calls. Add one to `tests/sandbox-wrapper.test.mjs` that `--sandbox-only` given after the project root is refused as
  an unknown option, with 2. Add the test of `tests/sandbox-commit-msg.test.mjs` that the wrapper's sandbox-only value
  of the hooks directory is `/usr/local/lib/agentrite/no-hooks`, moved here from "The image and the Compose file".
  (R12, R21, R24)
- [x] In `container/unit-clone.sh`, add `is_branch_name`, `cut_branch` and `resolve_branch` as the approach
  describes, the two that print a branch failing with 1 for a refusal of the name or the missing default branch, and
  say in the file's opening comment that it also holds the git work of a run on a branch of a sandbox-only project.
  `cut_branch` takes the message for the missing default branch from one place shared with `cut_unit_branch`, so the
  two cannot drift. (R13, R14, R15)
- [x] In `container/sandbox.sh`, read the mode from the first argument and shift it off before the project root is
  judged; set `SANDBOX_GIT_HOOKS_PATH` by the mode; set the texts that differ by mode, the forms of `list_forms`, the
  word for what the first argument names in the refusals of `--connect` and of an option that opens with `-`, and
  the message of a `--connect` name that is no branch; refuse `--variant` in the mode at the place the approach names;
  call `resolve_branch` for a run and the exact lookup for `--connect` in the mode, and the unit functions otherwise;
  leave out the two mounts and the `mkdir` of `.reviews` and `.orchestrator` in the mode. Rewrite the comments at the
  top: the two ways to run name the run on a branch of a sandbox-only project, and the usage lists the sandbox-only
  forms. Keep every path of a project with the process as it is. (R12, R13, R14, R15, R16, R17, R18, R19, R20, R21,
  R22, R23, R24)
- [x] Run `npm test` and fix what fails, the tests of `bell`, the harness versions, the image builds, the status line,
  the logs and `cleanupPeriodDays` among them, which run with the process and hold the rest of the wrapper as it is.
  (R23, R24)

### `init`, `refresh` and the shim

- [ ] In `tests/agentrite-init.test.mjs`, add tests: `init --sandbox-only claude` writes `agentrite.json` with
  `process` false, `sandbox` true, `orchestrator` false and the other keys as without the option, `sandbox.sh` as the
  sandbox-only shim, executable, `sandbox/compose.project.yml` and `.dockerignore`, prints a line for each, the file's
  content and the notice on the default branch, and writes no role wrapper, no `.agentrite/instructions.md`, no
  `AGENTS.md`, no `CLAUDE.md`, no `opencode.json`, no `check-changes` script and no hook, and prints nothing of any of
  them; with `opencode` too, nothing of `opencode.json`; an `AGENTS.md`, `CLAUDE.md`, `opencode.json` and hook that
  exist are left byte for byte and named in no line or notice; `--sandbox-only` before, between and after the
  harnesses, and given twice, writes the same file; `--sandbox-only=1` is refused as an unknown harness; with
  `--no-sandbox`, in either order, it is refused with a message that a sandbox-only project has the sandbox, the
  usage, nothing written and 2; with `--no-orchestrator` it writes what it writes alone; with no harness it prints
  the usage and exits 2; in a project with an `agentrite.json` it is refused as other arguments are; `init` with no
  argument in a project whose file has `process` false writes what `--sandbox-only` writes and reads no role file,
  which a test proves with role files the file names that hold no description; without the option `init` writes
  `process` true and the shim of today. Every process started gets `withoutGitEnvironmentConfiguration`. (R6, R7, R8,
  R9, R10, R12, R3, R32)
- [ ] In `tests/agentrite-refresh.test.mjs`, add tests: in a sandbox-only project `refresh` writes `sandbox.sh` as the
  sandbox-only shim, or reports it up to date, and prints no other line and no notice, leaves role wrappers, a stale
  wrapper, the list, a hook of the kit's and a missing `CLAUDE.md` as they are, and reads no role file; switching
  `process` from true to false and running `refresh` rewrites the shim to the sandbox-only one; switching back and
  running `init` with no argument writes the missing files of the process, and `refresh` then writes the shim of
  today. (R11, R12, R25, R3, R32)
- [ ] Put the placeholder `{{mode}}` in the `exec` line of `templates/project/sandbox.sh`, and a comment line that
  says that a sandbox-only project's shim passes `--sandbox-only` to the wrapper. Fill it in `shimFile` from whether
  the project has the process, and pass that through `kitOwnedFiles`, `sandboxFiles`, `projectFiles` and
  `plannedProjectFiles`. Change `tests/settings-update.test.mjs` and `tests/sandbox-update.test.mjs` to compare a
  shim with the template filled for a project with the process. (R12)
- [ ] Add `--sandbox-only` to `parseInit`, its refusal with `--no-sandbox`, and `INIT_FORM` as
  `agentrite init [--sandbox-only] [--no-sandbox] [--no-orchestrator] [--default-branch <name>] ...`; write
  `process`, `sandbox` and `orchestrator` from it in `settingsToWrite`. (R6, R7, R8, R9)
- [ ] Split `init` so that the process's part, `readRoles`, the process's files, `package.json`, `opencode.json`, the
  hook and their notices, runs only when `settings.process` is true, and the rest, the settings file, the sandbox's
  files and `.dockerignore`, the printed file and the notice on the default branch, runs in both. Do the same in
  `refresh`, so that in a sandbox-only project it writes the shim alone. Update the doc comments of both. (R3, R10,
  R11)
- [ ] Create `tests/sandbox-only-setup.test.mjs`, end to end: a git repository with a `package.json` and the kit
  installed under its ignored `node_modules` as the wrapper tests install it, `init --sandbox-only claude` run in it
  and its result committed, then the written `./sandbox.sh` started on the fake host of `tests/wrapper-fixture.mjs`
  with a new branch name and a command. It asserts the branch is cut from the default branch, the run is a clone run
  without `.reviews` and `.orchestrator`, no `.reviews` or `.orchestrator` is in the root, and the Compose calls carry
  the sandbox-only hooks directory. Every process gets `withoutGitEnvironmentConfiguration`. Add the file to `FILES`
  in `tests/sandbox-git-environment.test.mjs`. (R10, R12, R13, R17, R21, R32, R33)
- [ ] Run `npm test` and fix what fails. (R32, R33, R34)

### The documents

- [ ] `COMMANDS.md`: in the table at the top, add `[--sandbox-only]` to the synopsis of `init` and a row for each of
  the sandbox-only forms of `./sandbox.sh`, `BRANCH`, `--in-place`, `--workdir` and `--connect BRANCH`. In "agentrite
  init", describe `--sandbox-only`, where it may stand, that it is refused with `--no-sandbox` and taken with
  `--no-orchestrator`, what it writes in `agentrite.json`, and what `init` writes and leaves out in a sandbox-only
  project, with or without the option. In "agentrite refresh", what it writes in a sandbox-only project. In
  "sandbox.sh", the forms in a sandbox-only project, `BRANCH` and `--connect BRANCH` in the table of arguments, that
  `--variant` is refused there with 2, the refusal of a name that is no branch's with 1, and the refusal of
  `--sandbox-only` typed by the developer as an unknown option. (R26, R27)
- [ ] `SETUP.md`: in "Installing it into a project", the sandbox-only setup with `init --sandbox-only`, and the files
  table saying which files a sandbox-only project gets; in "Git hooks", that a sandbox-only project gets none; in
  "The project's settings", `process` in the table and the rules, that both `false` is refused, and that after a
  change `refresh` is run, and `init` with no argument first when switching to the process, the files of the other
  mode being removed by hand; in "Updating a project to a newer kit", the paragraph that a project whose file lacks
  `process` adds `"process": true` after `harnesses` before any command that reads the file runs again, as the
  paragraphs on `orchestrator` and `bell` say. (R25, R28)
- [ ] `SANDBOX.md`: a section on running on a branch in a sandbox-only project, after "Running a unit", with the forms,
  the cut from the default branch, `--connect` and that variants are not there, and a pointer to "Getting the work
  back", which holds for it; in "Commit messages", that a sandbox-only project's commits are not checked and no hook
  of a mounted repository runs; in "Where things are kept on the host", that a sandbox-only project's root gets no
  `.reviews` or `.orchestrator`. The reader's refusals with a message that names why and what to do are not added to
  "When something goes wrong". (R29)
- [ ] `README.md`: the line of `SETUP.md` in "The documents" says that a project can set up the sandbox alone, and
  nothing else of the README changes. (R30)
- [ ] Check that this unit adds or renames no file or directory at the root of the repository and changes the package
  by none, so that neither "What is here" nor the table of `CONTRIBUTING.md` changes, and log that in `record.md`.
  (R31)

## Verification

- [ ] `npm test` passes on the host, the tests that need Docker among them
- [ ] `node --test tests/sandbox-git-environment.test.mjs` passes, and so the files it runs pass with the sandbox's git
  environment configuration
- [ ] `npm run check-changes` passes
- [ ] Every changed line is within 120 characters, Markdown table rows apart
- [ ] The trace holds both ways: each of R1 to R34 is named by a task above, and each task names a requirement

## Commit Points

- [x] `feature-0095 Plan the unit`: this plan and its log entry
- [x] `feature-0095 Add the key process to agentrite.json`: the tasks under "The key"
- [x] `feature-0095 Have the wrapper name the hooks directory`: the tasks under "The image and the Compose file"
- [x] `feature-0095 Run the sandbox on a branch in a sandbox-only project`: the tasks under "The wrapper"
- [ ] `feature-0095 Set up a sandbox-only project with init and refresh`: the tasks under "`init`, `refresh` and the
  shim"
- [ ] `feature-0095 Describe the sandbox-only setup`: the tasks under "The documents"
