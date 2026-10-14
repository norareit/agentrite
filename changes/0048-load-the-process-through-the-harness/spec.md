# 0048 Load the process through the harness

## Context

An agent in a project that installed the kit gets the kit's `process.md` only by reading it on its own. The project's
`AGENTS.md`, as `init` writes it, calls the file "required reading" in a Markdown link, and each role file opens with
"Read process.md first". Both are instructions, and neither is a mechanism: a harness loads neither file by itself,
and a model reads it only when it decides to follow the instruction. A strong model does. A small local model, or a
long session after a compaction, is where it gets skipped, and nothing says so.

Both harnesses the kit supports have a way to load a file into every session that does not depend on the model:

* Claude Code expands a line `@<path>` in `CLAUDE.md` at launch, relative to the file that holds it. It skips one in
  a code span or a fenced block. `CLAUDE.md` as `init` writes it already imports `AGENTS.md` that way
* OpenCode loads every path in the `instructions` list of its configuration file, `opencode.json`, together with
  `AGENTS.md`. It does not expand a reference inside `AGENTS.md`. The kit writes no `opencode.json` today

This unit uses both for `process.md`. It is the first of three actions worked out in a conversation of the human with
an agent on 2026-10-13: this one, then a split of `process.md` that takes the roles out of it, then a project's own
roles and style rules in the place of the kit's. It is useful whatever becomes of the other two, and is done first
and for `process.md` alone.

The conversation listed what to test before specifying. The specifier tested it on 2026-10-14, with Claude Code
2.1.299 and OpenCode 1.19.0, in a scratch project holding a `process.md` under `node_modules/agentrite/` with a code
word in it, and asked each session for the code words in its context without reading a file:

| What was tested                                         | Claude Code               | OpenCode                  |
|---------------------------------------------------------|---------------------------|---------------------------|
| A session with the import or the `instructions` entry   | Loaded                    | Loaded                    |
| A session without it, with only the link in `AGENTS.md` | Not tested                | Not loaded                |
| A project subagent dispatched from such a session       | Loaded                    | Loaded                    |
| `opencode.json` under `.opencode/` instead of the root  | Does not apply            | Loaded                    |
| A comment in `opencode.json`                            | Does not apply            | Read without an error     |
| A target that is missing                                | Skipped, no message       | Skipped, no message       |
| A file the loaded one links to                          | Not loaded                | Not loaded                |

The subagent row was read from the subagent's own result: the tool result in Claude Code's stream output, and the
child session in OpenCode's export. The OpenCode sessions ran a local Gemma 4 31B, the Claude Code ones Haiku.

## Requirements

`CLAUDE.md`:

1. `CLAUDE.md` as `init` writes it holds a line that is exactly `@node_modules/agentrite/process.md`, before the
   line `@AGENTS.md`, and neither line is in a code span or a fenced block. A Claude Code session started in a
   project that `init` set up, after `npm ci`, has `process.md` in its context without reading it, and so has a
   subagent of one of the project's role wrappers that it dispatches
2. When `CLAUDE.md` exists, `init` leaves it as it is, as it does today, and its notice says that for Claude Code to
   read the instructions the file must hold both lines, `@node_modules/agentrite/process.md` and `@AGENTS.md`

`opencode.json`, at the project root, and only when `opencode` is among the harnesses that `init` works with:

3. When there is no `opencode.json`, `init` writes one, prints `wrote opencode.json`, and the file is exactly this,
   ending in one line break:

   ```json
   {
     "instructions": [
       "node_modules/agentrite/process.md"
     ]
   }
   ```

4. When `opencode.json` is a JSON object, `init` amends it as it amends `package.json`, keeping every other key,
   their order, the indentation and whether the file ends in a line break:
    * With no `instructions` key, it adds one that holds the one path above, and prints `changed opencode.json`
    * With `instructions` a list that does not hold the path, it adds the path at the end of the list, and prints
      `changed opencode.json`
    * With `instructions` a list that holds the path, it leaves the file as it is and prints
      `skipped opencode.json, which loads node_modules/agentrite/process.md`
5. When `opencode.json` is there and cannot be amended, because it cannot be read, is not JSON, is not a JSON object,
   or holds an `instructions` that is not a list, `init` leaves it as it is and prints
   `skipped opencode.json, which cannot be amended`. It writes and amends everything else as it would have, exits 0,
   and prints a notice among its other notices that says why the file was left, and that for OpenCode to read the
   kit's instructions its `instructions` list must hold `node_modules/agentrite/process.md`
6. What `init` refuses on, it refuses on before it writes anything, as today. Reading `opencode.json` is not among
   it: no state of that file makes `init` refuse
7. Without `opencode` among the harnesses, `init` does not read, write or amend `opencode.json`, and prints nothing
   about it
8. An OpenCode session started in a project that `init` set up with `opencode`, after `npm ci`, has `process.md` in
   its context without reading it, and so has a subagent of one of the project's role wrappers that it dispatches

What does not change:

9. `refresh` neither reads, writes nor creates `CLAUDE.md` or `opencode.json`
10. The project's `AGENTS.md` as `init` writes it still calls `process.md` required reading in a link, and each of
    the kit's role files still opens with the instruction to read `process.md` first

The documents:

11. `README.md` has a section of its own on how the kit's instructions reach an agent, under a heading that says so,
    in "Installing it into a project". A reader finds it from the README's headings, without having seen a notice
    of `init`. It holds, for each file, what that file must hold and which harness reads it:
    * `AGENTS.md`: the sections Development Guidelines, Roles and Changes in this project, read by both harnesses
    * `CLAUDE.md`: the lines `@node_modules/agentrite/process.md` and `@AGENTS.md`, each on a line of its own and
      outside a code span or a fenced block, read by Claude Code
    * `opencode.json` at the project root: `node_modules/agentrite/process.md` in its `instructions` list, read by
      OpenCode, and needed only with `opencode` among the harnesses

    And it says:
    * That `init` puts these in a file it writes, and in an `opencode.json` it can amend, and that for an
      `AGENTS.md` or a `CLAUDE.md` that exists, and an `opencode.json` it cannot amend, it only prints a notice,
      once, which is kept nowhere. The project then adds what is missing by hand
    * That nothing reports a file that lacks them: neither harness gives an error, and a session starts without the
      kit's instructions in its context, which it then reads only if the model follows the link in `AGENTS.md`
    * That `refresh` never adds them, and a project checks the three files against this section after an `init`
      that printed a notice
12. "agentrite init", the text of `README.md` on a file that exists, and "Updating a project to a newer kit" each
    point to that section
13. `README.md` says, in "agentrite init" and in "Installing it into a project", that `init` writes or amends
    `opencode.json` with `opencode`, and what it does with one that exists. Its table of the files `init` writes has
    a row for `opencode.json` and says in the row of `CLAUDE.md` that it imports `process.md` as well as
    `AGENTS.md`. "Updating a project to a newer kit" names `opencode.json` among the files `refresh` never touches

## Decisions

* **The harness loads `process.md`, and the instruction to read it stays.** A harness loads a file at the start of
  every session whatever the model, which is what the instruction cannot do. The instruction stays as the fallback
  for what the loading does not reach: a harness the kit has no loading for, a subagent that skips project
  instructions, and a session started before `npm ci`. A model that follows both reads the file twice, which costs
  little. Rejected: dropping the instruction once the file loads, which would leave those cases with nothing
* **`process.md` alone, and no role file.** Everything loaded is in every session. A session takes on one role at a
  time, and a wrapper is already a subagent's whole instruction and points straight at its role file. Loading all
  four would give every session three roles it is not in. The human set this scope in the conversation
* **A missing target is not checked.** Both harnesses skip an import whose file is missing, without a message, as the
  table above shows. The path is under `node_modules`, which a fresh clone has only after `npm ci`, as is so for the
  role files today, and the README says so for a fresh clone already. A session that starts before `npm ci` is
  where the instruction of `AGENTS.md` is left as the fallback, and a model that follows it fails to read the file
  and can say so. Rejected: a check in `init` or `agentrite run`, which would guard one of the many ways a session
  starts and say nothing in the others
* **`process.md` is loaded whole, above the size Claude Code aims at.** It is 220 lines, and Claude Code's
  documentation aims at under 200 per instruction file, for adherence and for context. It is required reading in
  every session already, so a session that follows its instructions gets no more text than before: the read moves
  to the start. The split of `process.md` that comes next makes it shorter. Rejected: waiting for the split, which
  would leave the loading undone for a reason that the split itself removes
* **`opencode.json` at the project root, and not under `.opencode/`.** OpenCode loads it from either, as the table
  above shows. The root is where OpenCode's documentation puts a project's configuration, and so where a project's
  own file most likely is. Amending that one avoids a second file whose `instructions` OpenCode would have to merge
  with the first, which was not tested
* **`init` amends `opencode.json`, and only notices on `CLAUDE.md`.** That is the split `init` follows today: it
  amends `package.json`, a JSON file whose keys it can add to without reading the rest, and leaves the Markdown files
  `AGENTS.md` and `CLAUDE.md` with a notice, since it cannot tell where in a project's own text a line belongs
* **An `opencode.json` that cannot be amended does not stop `init`.** The file is OpenCode's and not the kit's, and
  one that does not parse as JSON may be valid for OpenCode, which reads a comment in it, as the table above shows.
  Refusing would hold back everything else `init` writes over a file it only adds a line to. The notice says what to
  add by hand. Rejected: refusing as for `package.json`, which `init` cannot do without, since the change check is
  wired there
* **The written `opencode.json` holds `instructions` and nothing else.** That is the one key the kit needs. A
  `$schema` key would help an editor and is the project's to add
* **`refresh` does not take the two files over, and existing projects run `init`.** `refresh` rewrites whole the
  files that hold nothing but what the kit put there, and `CLAUDE.md` and `opencode.json` are the project's. `init`
  with no argument writes what is missing, which now includes the `opencode.json` entry, and prints the notice of
  `CLAUDE.md` that names the one line to add by hand. The release notes say so, when the release is made. Rejected:
  `refresh` amending both, which makes it touch the project's own files for a step each project takes once. The
  third action, in which a project names its own style file, may need the loading kept in step with a setting, and
  decides then how
* **What a project must hold is documented in one section, and not only in the notices.** The human asked for
  this while the spec was a draft. A notice is printed once, among the other lines of `init`, and is kept nowhere,
  so a reader who did not see it, or who set the project up before this unit, has nothing to go by. And a file
  that lacks a line fails without a word, as the table above shows for a missing target, so the reader cannot
  learn it from an error either. One section that lists every file and line is what a reader checks a project
  against. It holds `AGENTS.md` too, whose sections the notice of `init` already lists, so that the section is the
  whole of the wiring and not two thirds of it. Rejected: the facts spread over "agentrite init" and the text on
  existing files, which is where they were in the first draft, and which a reader looking for the wiring has to
  assemble
* **The line goes before `@AGENTS.md`.** The kit's instructions first and the project's after them, the order in
  which `AGENTS.md` describes the two

## Non-goals

* Loading the role files, the templates, or any file `process.md` links to
* Splitting `process.md`, taking the roles out of it, or dropping the status `planned`. Those are the second action
* A project's own style file or role files in the place of the kit's. That is the third action
* A harness other than Claude Code and OpenCode
* This repository's own `CLAUDE.md` and `opencode.json`. This repository installs the kit's release, and gets the
  loading by running `init` after it moves to the release that holds this unit, as any project does. Adding
  `opencode.json` to the table of `CONTRIBUTING.md` belongs to that change
* Any change to the sandbox, which runs the same harnesses on the same files
* The release notes, which are written when the release is made

## Beyond the request

* **An `opencode.jsonc`, or an `opencode.json` under `.opencode/`, that a project already has.** `init` could look
  for them and amend the one it finds. Cost: deciding which wins when there are two, and amending a file with
  comments in it, which `JSON.parse` cannot read. Without it, `init` writes `opencode.json` at the root beside it, a
  new tracked file that shows in the project's diff and that the project can fold into its own in a minute
* **A check that the imported file is there.** Covered under "Decisions": it would guard one way a session starts
  and say nothing in the others
