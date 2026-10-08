# 0038 `--no-sandbox` replaces `agentrite-roles`

## Approach

`scripts/agentrite-roles.mjs` stays as the module that renders the role wrappers, because `agentrite.mjs` and
`agentrite-run.mjs` import `ROLES`, `HARNESS_NAMES`, `plannedFiles` and `wrapWords` from it, and the wrappers must stay
byte for byte what they are (R3). What goes from it is what makes it a command: its shebang, its entry point guard and
the code under it, and `parseHarnesses` with the usage text that names `agentrite-roles`. The file keeps its name:
renaming it would touch five test files and the imports of two scripts, for nothing the spec asks.

`parseHarnesses` moves into `scripts/agentrite.mjs`, without the usage text. The parser of `init` and `refresh` takes
`--no-sandbox` out of the arguments wherever it stands, by an exact match, and gives the rest to `parseHarnesses`, so an
argument such as `--no-sandbox=1` is still reported as an unknown harness. It returns `{ harnesses, sandbox }`, where
`sandbox` is `false` only when the option was given, and repeating it changes nothing. Both commands build their usage
from one function, which is the only place the line `usage: agentrite <command> [--no-sandbox] claude | opencode` is
written. `roles` and `run` keep their own parsers, which never see the option (R5).

`projectFiles` is split into the files that carry the process and the files that carry the sandbox, and keeps its
signature and its order for the whole (R9). `init` gets the first group alone when the option is given. In that case it
does not require a `name` in `package.json`, does not read `package-lock.json`, and does not run the `.dockerignore`
step, and prints nothing for the three files of the sandbox (R6, R7). `refresh` leaves the shim out of the files it
visits when the option is given, so a symbolic link or a directory at `agent.sh` is never looked at (R8). Without the
option nothing changes (R9, R10: `init` already skips what exists and writes what is missing).

The pointer `agentrite-roles` gets a script of its own, since the two pointers no longer say the same thing (R4).
Version `2.0.0`, as the command it pointed to is gone.

## Files

- `scripts/agentrite-roles.mjs`: remove the shebang, `usage`, `parseHarnesses`, `isMain` and the entry point block, and
  the imports only they used. Keep `ROLES`, `HARNESS_NAMES`, `plannedFiles`, `wrapWords` as they are
- `scripts/agentrite.mjs`: `parseHarnesses` moved in; the parser and the form of `init` and `refresh`; `projectFiles`
  split; `kitOwnedFiles`, `readPackageJson`, `init` and `refresh` take the option; `forCommand` and
  `formWithHarnesses` go, as the usage is now built here
- `package.json`: remove the `agentrite-roles` entry from `bin`. `files` keeps `scripts/agentrite-roles.mjs`
- `package-lock.json`: remove the `agentrite-roles` entry from `bin` of the root package. The entry of
  `node_modules/@ritenoar/agentrite` is the installed release 4.2.0's and is left as it is
- `pointers/agentrite-roles/pointer.mjs`, `package.json`, `README.md`: the reworded pointer, version `2.0.0`
- `README.md`: "What is here" row of `scripts/`; the `agentrite init` and `agentrite refresh` sections of "Commands";
  the whole `agentrite-roles` section removed; the line in "Installing it into a project" that names the command;
  the installing and updating text where it says what `init` and `refresh` write or never write
- `CONTRIBUTING.md`: the row of `pointers/`
- `tests/agentrite-roles.test.mjs`, `tests/agentrite-init.test.mjs`, `tests/agentrite-refresh.test.mjs`,
  `tests/pointers.test.mjs`: as the tasks say. `tests/agentrite-run.test.mjs` imports from the module, and its test of
  the usage of every command changes to the new lines of `init` and `refresh`
- `changes/0038-no-sandbox-replaces-agentrite-roles/record.md`: the log of the work

Checked against the tree on `master` at `1916d7e`: no other file outside `changes/` names `agentrite-roles` as a command
(`AGENTS.md`, `SANDBOX.md`, `RELEASING.md`, `CHANGELOG.md`, `templates/` and `container/` do not name it at all).
`CHANGELOG.md` is not touched by this unit. The documents of units 0011 to 0037 that name it are earlier records, which
are left. Unit 0037 is implemented, so the README names the command only in the places listed above.

## Tasks

- [x] Tests first, in `tests/agentrite-init.test.mjs`: unit tests of `parseArgs` for the option. It is accepted before,
  between and after the harnesses, for `init` and for `refresh`; repeated, it counts once; `--no-sandbox` alone, or an
  unknown harness with it, gives the usage; `--no-sandbox=1` is an unknown harness; `roles` and `run` print for it what
  they print for any argument they do not take. Update the tests that compare the parsed arguments and the usage of
  every command to the new shape and to `usage: agentrite init [--no-sandbox] claude | opencode`, and the test of the
  name `agentrite-roles` never being printed (R2, R5, R12)
- [x] Tests first, end to end in `tests/agentrite-init.test.mjs`: in a project with the sandbox's files and in one with
  none, `init --no-sandbox` prints the same lines for the wrappers, `AGENTS.md`, `CLAUDE.md` and `package.json` as
  `init` and none for the three files; leaves an existing one of the three byte for byte and untouched in mode; runs
  with a `package.json` that has no `name`, with no `package-lock.json` and with an unreadable `package-lock.json`;
  refuses, writing nothing, with no `package.json` and with one that is not JSON; and a later `init` without the option
  writes the three files and skips the rest (R6, R7, R10, R12)
- [x] Tests first, end to end in `tests/agentrite-refresh.test.mjs`: `refresh --no-sandbox` refreshes the wrappers of
  the harnesses given and keeps a pinned model, prints no line for `agent.sh`, leaves a stale `agent.sh` and a missing
  one as they are, and an `agent.sh` that is a symbolic link or a directory changes neither the output nor the exit
  status 0; `refresh` without the option still writes a missing `agent.sh` (R8, R9, R12)
- [x] Test in `tests/agentrite-roles.test.mjs` and `tests/pointers.test.mjs`, and the removal of the ones that go:
  remove the tests of `parseHarnesses` and of the command run alone (lines from `const script` to the end), keeping
  those of `wrapWords` and `plannedFiles`. Add one that the module run by itself prints nothing and writes nothing, one
  that `package.json` `bin` holds only `agentrite`, and one that no file under `scripts/` has a shebang but those of the
  commands the package has. In `pointers.test.mjs` replace "the two pointers run the same script" with tests that the
  `agentrite-roles` pointer has a version above `1.0.0`, exits 1, prints that AgentRite has no command of that name any
  more, names `agentrite init` and `agentrite refresh` and `--no-sandbox`, and ends with the address of the kit, and
  that the `agentrite` pointer's `pointer.mjs` and `package.json` are the ones on `master` (R1, R4, R12)
- [x] Move `parseHarnesses` into `scripts/agentrite.mjs`, with the option parsing and the one usage function, and
  remove the command from `scripts/agentrite-roles.mjs`, `package.json` and the root `bin` of `package-lock.json` (R1,
  R2, R5)
- [x] Split `projectFiles` into the files that carry the process and the files that carry the sandbox, and make `init`
  take the option as the Approach says: `readPackageJson` asks for a `name` only when the sandbox is wanted, and no
  lockfile or `.dockerignore` is read or written without it (R6, R7, R9, R10)
- [x] Make `refresh` leave the shim out of what it visits when the option is given (R8, R9)
- [x] Reword the `agentrite-roles` pointer: `pointer.mjs` with its own message, `package.json` at `2.0.0` with a
  description that matches, `README.md` saying the same as the message. The `agentrite` pointer is not touched (R4)
- [x] `README.md`: add `--no-sandbox` to the table and the form of `agentrite init` and `agentrite refresh`, saying
  which files it leaves out (`agent.sh`, `agent/compose.project.yml` and `.dockerignore` for `init`, `agent.sh` for
  `refresh`), that `init` then needs no `name` and reads no lockfile, and that `refresh` without it writes an `agent.sh`
  that is missing. Remove the `### agentrite-roles` section, change the "What is here" row of `scripts/` and the line
  that says the wrappers are the ones `agentrite-roles` writes to name `init`, and say in the installing and updating
  sections how a project without the sandbox runs both. Wrap at 120 (R11)
- [x] `CONTRIBUTING.md`: the row of `pointers/` names the two names without calling the second a command of the kit
  (R11)
- [x] `grep -rn agentrite-roles` over the tree except `changes/`, `node_modules/` and the earlier sections of
  `CHANGELOG.md` finds only the module `scripts/agentrite-roles.mjs` and its imports, the pointer, the `files` entry and
  the tests of those (R1, R2, R11)

## Verification

- [x] `npm test` passes
- [x] `npm run check-changes` passes after the work is committed
- [x] In a scratch project: `agentrite init --no-sandbox claude` writes the wrappers, `AGENTS.md` and `CLAUDE.md`,
  amends `package.json`, and prints no line for the three files of the sandbox; `agentrite refresh claude --no-sandbox`
  prints no line for `agent.sh`; `node_modules/.bin` of an installed build holds no `agentrite-roles`
- [x] No command of the kit prints the name `agentrite-roles`: run each with no argument and with a bad one

## Commit Points

- [x] The plan and the record: `feature-0038 Plan the unit`
- [x] Tests for the option and for the removal, failing: `feature-0038 Test --no-sandbox and the removal of
  agentrite-roles`
- [x] The code of `init`, `refresh` and the removal of the command, tests passing: `feature-0038 Replace
  agentrite-roles by --no-sandbox`
- [x] The pointer: `feature-0038 Reword the agentrite-roles pointer`
- [x] The documents: `feature-0038 Describe --no-sandbox and drop agentrite-roles from the documents`
- [ ] Ticked plan and status: `feature-0038 Mark the unit implemented`, by the implementer after the review
