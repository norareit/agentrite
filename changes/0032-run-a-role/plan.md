# 0032 Run a role in a harness

## Approach

The entry point learns that a command parses its own arguments, and gets two commands. What `run` computes is in a
module of its own, as functions of plain values: the arguments, the unit, the prompt and the harness's argument
list. The entry point does what touches the project and the terminal: it lists `changes/`, reads the wrapper,
starts the harness and hands its status on.

**The harness's argument list**, for a role `R`, a model `M`, a prompt `P`. What is in square brackets is there
only when its option is given:

| Harness    | Mode        | Command and arguments                                                         |
|------------|-------------|-------------------------------------------------------------------------------|
| `claude`   | interactive | `claude --agent R [--model M] [--dangerously-skip-permissions] P [X...]`      |
| `claude`   | headless    | `claude --print --agent R [--model M] [--dangerously-skip-permissions] P [X...]` |
| `opencode` | interactive | `opencode --agent R [--model M] [--auto] --prompt P [X...]`                   |
| `opencode` | headless    | `opencode run --agent R [--model M] [--auto] P [X...]`                        |

`X...` is what the caller gave after a `--`, as written and in that order. It was added to each row after the
first implementation, on the human's word, as requirement 21.

The harness is started with `spawnSync` and `stdio: 'inherit'`, with the argument list as an array, so that no
shell reads the prompt.

**The wrapper check.** The wrapper's path and what the release renders come from `plannedFiles([harness])`, and
the wrapper is what `refresh` would leave when it equals `refreshedWrapper(existing, rendered)`. Both functions
exist.

**The usage of `run`**, for the human to read and correct before approving:

```text
usage: agentrite run <role> <harness> [--model <id>] [--headless] [--skip-permissions] <unit> [text...]
                     [-- <harness arguments...>]

  <role>              planner | implementer | reviewer
  <harness>           claude | opencode
  <unit>              a directory of changes/, by its name or by the four digits its name opens with
  [text...]           added to the prompt, after the unit
  --model <id>        the harness's own id of a model, such as claude-sonnet-5-5 or openai/gpt-6.1-sol.
                      Without it the harness decides: the role's wrapper may pin one
  --headless          run without a session: the harness works on the prompt and ends
  --skip-permissions  the harness asks no permission: --dangerously-skip-permissions for claude, which
                      bypasses every check, and --auto for opencode, which approves what is not denied.
                      Meant for the sandbox
  -- <harness arguments...>
                      given to the harness as written, after everything else it gets. The command reads
                      none of them
```

The form takes two lines since requirement 21, the second starting under `<role>`.

The roles and the harnesses in it are read from the kit's lists, not written out.

**What `agentrite roles` prints**: each role's name on a line of its own, its description under it, indented by
two spaces and wrapped at 120 characters with `wrapWords`, and an empty line between two roles.

**The usage of every command**, which `agentrite` alone prints:

```text
usage: agentrite init claude | opencode
       agentrite refresh claude | opencode
       agentrite roles [--json]
       agentrite run <role> <harness> [--model <id>] [--headless] [--skip-permissions] <unit> [text...]
                     [-- <harness arguments...>]
```

**What `agentrite roles --json` prints**, with two spaces of indentation and each description on one line:

```json
{
  "roles": [
    { "name": "planner", "description": "Writes the documents a change unit needs in changes/, ..." }
  ]
}
```

It is `JSON.stringify` of the object with an indentation of two, so each role's two keys are on lines of their
own, and a line break after it. The example above is shortened.

**Where the arguments are divided.** `parseArgs` of `node:util` reports the `--` as a token of its own. What
stands after it in the arguments is taken off before the rest is read, so that no word of it is taken for an
option, a position or text of the command.

## Files

- `scripts/agentrite-roles.mjs`: export the roles and the harnesses' names; write `mode: all` for OpenCode
- `scripts/agentrite-run.mjs`: new. The arguments of `run`, the unit, the prompt, the harness's argument list,
  the usage of `run` and the listing of the roles
- `scripts/agentrite.mjs`: a command takes the project root and its own arguments; the commands `roles` and
  `run`; the usage of every command
- `package.json`: `scripts/agentrite-run.mjs` in `files`
- `tests/agentrite-roles.test.mjs`: the OpenCode wrappers hold `mode: all`
- `tests/agentrite-refresh.test.mjs`: a wrapper with `mode: subagent` is refreshed; the stale wrapper the tests
  build is no longer made by replacing `mode: subagent`
- `tests/agentrite-init.test.mjs`: only where it holds the usage of every command
- `tests/agentrite-run.test.mjs`: new. The unit tests of `scripts/agentrite-run.mjs`, and the two commands run as
  commands, with a fake `claude` and a fake `opencode` on a `PATH` of the test's own
- `README.md`: the two commands, and the OpenCode wrappers' mode

## Tasks

The wrappers:

- [x] In `tests/agentrite-roles.test.mjs`, change the test of the OpenCode wrappers to expect `mode: all`, and
      see it fail. In `tests/agentrite-refresh.test.mjs`, add a test that a wrapper holding `mode: subagent` and a
      pinned model is reported as refreshed and comes out with `mode: all` and its model, and see it fail (R15,
      R16)
- [x] Write `mode: all` in `opencodeFile`. Repair the stale wrapper that `tests/agentrite-refresh.test.mjs`
      builds by replacing `mode: subagent`, so that it is still stale. The Claude Code fixture test passes
      unchanged (R15, R16)

A command parses its own arguments:

- [x] Change the commands of `scripts/agentrite.mjs` to take the project root and the arguments after the
      command's name, and move the parsing of the harnesses into `init` and `refresh`. No behavior changes: the
      suite passes as it is, the usage texts included (R14)

The roles:

- [x] In the new `tests/agentrite-run.test.mjs`, test the listing: the name of every role the kit has, in the kit's
      order, each description as the wrappers hold it once its lines are joined, no line over 120 characters. Test the
      command: it prints the listing and exits 0 in a directory that is no project, and with an argument it prints its
      usage on standard error and exits 2 (R1)
- [x] Export `ROLES` and the harnesses' names from `scripts/agentrite-roles.mjs`, write the listing in
      `scripts/agentrite-run.mjs` and the `roles` command in `scripts/agentrite.mjs`, and add the new file to
      `files` in `package.json` (R1, R18)

What `run` computes:

- [x] Test the arguments of `run`: the three positions; the options before, between and after them; text of
      several words; `--` before a word that opens with a dash; and each error of requirement 13 with what it
      names, and no argument at all with the usage alone (R2, R3, R12, R13)
- [x] Test the unit: the name, the name after `changes/`, a closing slash, the four digits, a `history-` name
      whose digits are given and do not match, no match, and digits that open two names (R4)
- [x] Test the prompt with and without text, and the harness's argument list for both harnesses in both modes,
      with and without a model and with and without `--skip-permissions`: each list is exactly the row of the
      table above. Test that every harness the kit has holds a row (R5, R6, R7, R8, R9)
- [x] Write those functions and the usage of `run` in `scripts/agentrite-run.mjs`, with `parseArgs` of
      `node:util` for the options, until the three tasks above pass (R2 to R9, R12, R13)

`run` as a command:

- [x] Test `agentrite run` as a command, in a project made in a temporary directory with the wrappers `refresh`
      writes, a unit, and a `PATH` that holds a fake `claude` and a fake `opencode` which print their arguments
      one to a line and exit with a status the test sets:
    - the arguments each fake got, for one run per harness and mode, and that the fake's output is the command's
      (R5 to R9)
    - the fake's status 0 and 7 are the command's, and a fake that ends itself with a signal gives a status
      other than 0 (R10)
    - a missing wrapper, a wrapper with `mode: subagent` and a wrapper with a key of the project's own each stop
      the run with exit 1, name the file and `npx agentrite refresh <harness>`, and start no fake. A wrapper
      with a pinned model does not stop it (R11)
    - a `PATH` without the harness gives exit 1 and names the command (R11)
    - no argument, an unknown role, an unknown harness, a missing unit and an unknown option print the usage of
      `run`, exit 2 and start no fake. A unit that `changes/` does not hold exits 1 and starts none (R4, R12,
      R13)
    - `agentrite` alone and with an unknown command print the four lines of the usage of every command and exit
      2 (R14)
- [x] Write the `run` command in `scripts/agentrite.mjs`: list `changes/`, resolve the unit, check the wrapper,
      start the harness, and exit as requirement 10 says (R2, R4, R10, R11)

The documents:

- [x] In `README.md`, add "Running a role" after "Updating a project to a newer kit", with what requirement 17
      lists, and name `roles` and `run` in the row of `scripts/` under "What is here". Where the wrappers are
      described, under "Installing it into a project", say that the OpenCode ones are written as both a primary
      agent and a subagent, because OpenCode takes only a primary agent on its command line. Nothing that is
      there is removed or reworded (R17)
- [x] In `README.md`, under "Installing it into a project", add `scripts/agentrite-run.mjs` to the files a
      project receives. Added while implementing: the sentence lists what `files` in `package.json` holds, and is
      false without the new file (R18)
- [x] Check with `git diff master --stat` that no file requirement 19 names has changed, and with
      `git status --short` that this repository's own wrappers have not (R19)

On the real harnesses, on the host, in a project made for it: pack the working copy, install the tarball in a
temporary directory, run `init claude opencode`, and make one unit there by hand. Each of these is one run, and
the record says what was seen. One that shows a requirement or the README to be wrong is recorded and stops the
unit for the human; it is not worked around.

- [x] `run reviewer opencode <unit> --headless`: OpenCode prints no line about falling back, and its answer shows
      that it read the reviewer's role file. The same for `run implementer claude <unit> --headless` (R5, R7, R15)
- [x] In a session of OpenCode in that project, the roles are still offered as subagents (R15)
- [x] With a model pinned in one wrapper of each harness and no `--model`, which model the run used; and with
      `--model`, that the run used that one (R6, R17)
- [x] One interactive run per harness: the session opens with the prompt, and when it is left the terminal is as
      it was and the command has ended. What an interrupt does in each, with and without `--headless` (R7, R10)

What the human added after the first implementation, which ends at `1ff7e9f`. Requirements 20 to 24:

- [x] In `tests/agentrite-run.test.mjs`, change the test that a `--` ends the options into tests of requirement
      21: what follows the `--` is returned apart, as written and in order, an option of the command's own name
      among it included; nothing of it is text; no `--` and a `--` with nothing after it give none. Add that a
      word before the `--` that opens with a dash is refused as an unknown option, that a quoted argument which
      holds such a word after another is text, and that a role, a harness or a unit missing before the `--` is
      named whatever follows it. See them fail (R21, R22, R23)
- [x] Change the tests of the harness's argument list: each row of the table with and without `X...`, which is
      last in all four, and the test that the harness gets nothing beyond the command's own arguments, which
      now holds when no `--` is given. Change the test of the usage of `run` to the text above. See them fail
      (R9, R21, R24)
- [x] Change `parseRunArgs`, `harnessCommand`, the form and the usage of `run` in `scripts/agentrite-run.mjs`
      until those pass (R2, R9, R21, R22, R23, R24)
- [x] Add to the tests of `run` as a command: a fake harness gets what follows the `--` after its prompt, in
      each harness and mode, an argument with a space in it as one argument. See it pass, or fail and repair
      the command (R21)
- [x] Test `roles --json`: the function that renders it gives a document that `JSON.parse` reads back as the
      roles the kit has, in order, each with its name and its description on one line; the command prints it
      on standard output with exit 0 in a directory that is no project; `roles` with another argument, and with
      `--json` and another, prints its usage on standard error and exits 2; `roles` alone prints the listing
      as before. See them fail (R1, R20, R24)
- [x] Write the rendering in `scripts/agentrite-run.mjs` and `--json` in the `roles` command of
      `scripts/agentrite.mjs`, with its form `usage: agentrite roles [--json]`. Change the test of the usage
      of every command in `tests/agentrite-init.test.mjs` to the text above (R1, R14, R20, R24)
- [x] In `README.md`, under "Running a role": `roles --json` with what it prints; the form of `run` with the
      `--`; in place of "The command gives the harness nothing else" and of the sentence that a `--` ends the
      options, what follows a `--`, where the harness gets it, that the command reads none of it, and how text
      holds a word that opens with a dash; and a session resumed in each harness as the example, with the
      commands the runs below showed to work (R17)

On the real harnesses, in the project the first runs were made in or one made the same way. Each is recorded
with what was seen, and one that shows requirement 21 or the README wrong stops the unit for the human:

- [ ] Claude Code, headless: a first run with `-- --session-id <a new uuid>` whose text gives the agent a word
      to remember, and a second with `-- --resume <that uuid>` whose text asks for the word. The second answers
      with it, and still as the role (R17, R21)
- [ ] OpenCode, headless: the same, with the session's id read from `opencode session list` after the first run
      and `-- --session <id>` on the second (R17, R21)
- [ ] Claude Code, headless, with an option that takes several values after the `--`, such as
      `-- --allowedTools Read`: the agent still answers the prompt, so the prompt was not taken for a value
      (R21)

## Verification
## Verification

- [x] `npm test` passes
- [x] `npm run check-changes` exits 0, run after the last commit
- [x] `npm pack --dry-run` lists `scripts/agentrite-run.mjs` and no file of `tests/` (R18)
- [x] No line of a changed or new file is over 120 characters, and none holds an em dash
- [ ] After the tasks the human added: `npm test` passes, `npm run check-changes` exits 0 after the last commit,
      and no line of a changed file is over 120 characters or holds an em dash

## Commit Points

- [x] `feature-0032 Plan a command that runs a role in a harness`: the three documents
- [x] `feature-0032 Write the OpenCode wrappers as primary agents and subagents`: the first two tasks
- [x] `feature-0032 Let each command parse its own arguments`: the refactoring, with no change of behavior
- [x] `feature-0032 List the roles`: the `roles` command and its tests
- [x] `feature-0032 Run a role in a harness`: `scripts/agentrite-run.mjs`, the `run` command and their tests
- [x] `feature-0032 Describe running a role`: the README
- [x] `feature-0032 Record the runs on the real harnesses`: the record
- [x] `feature-0032 Take arguments for the harness after --, and list the roles as JSON`: the documents as the
      human had them changed
- [x] `feature-0032 Pass on to the harness what follows --`: the tests and `scripts/agentrite-run.mjs`
- [x] `feature-0032 List the roles as JSON`: the tests, the rendering and the command
- [x] `feature-0032 Describe the harness's arguments and the JSON listing`: the README
- [ ] `feature-0032 Record the runs that resume a session`: the record
