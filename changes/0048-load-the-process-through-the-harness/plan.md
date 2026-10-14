# 0048 Load the process through the harness

## Approach

One new module, `scripts/agentrite-instructions.mjs`, is the one place that knows whether a project's `CLAUDE.md`
and `opencode.json` load the kit's `process.md`: the path, the two lines, the rule each file is judged by, the
`opencode.json` that `init` writes or amends, and the notices of both commands (R10). `scripts/agentrite.mjs`
imports it for `init` and `refresh`, and keeps only the order of the work and what is printed when.

The module is split as `process.md` asks. `readProjectFile(root, path)` is its one function that touches the file
system, and everything else takes what it returned and returns data:

* `readProjectFile(root, path)` returns `{ found: false }` when nothing is at the path by `lstat`, `{ found: true,
  text }` when it reads, and `{ found: true, error }`, with the error's message, when something is there and cannot
  be read: a directory, a dangling symbolic link, a file it may not read
* `claudeLacks(read)` returns the lines of `CLAUDE_LINES` that the file lacks, in their order, and `[]` for a file
  that loads the instructions. A file that is missing or cannot be read lacks both
* `opencodeVerdict(read)` returns `{ loads: true }`, or `{ loads: false, problem, content }`, where `problem` is a
  phrase that says what is wrong and `content` is the text to write, or `undefined` for a file that cannot be
  amended
* the notice functions, one for each command and file, take the lines lacked or the problem

What this plan decides, each because the spec leaves the how open:

* **Amending `opencode.json` and `package.json` is one piece of code.** R4 asks for `opencode.json` to be amended
  as `package.json` is, and that is the same decision: the text of a JSON value laid out as an original is, with
  its indentation and whether it ends in a line break. It moves out of `withCheckChangesScript` into a function of
  its own, `formattedLike(original, value)`, in a new module `scripts/agentrite-json.mjs`, which both
  `scripts/agentrite.mjs` and `scripts/agentrite-instructions.mjs` import. The move is a commit of its own that
  changes no behavior. The indentation is the first run of spaces or tabs that opens a line before a `"`, two
  spaces when there is none, as today
* **The `opencode.json` that `init` writes is `formattedLike('{}\n', { instructions: [PROCESS_PATH] })`,** which is
  byte for byte the file of R3, and a unit test holds that. There is no template for it: the path is in the code
  anyway, for the judging, and is stated once
* **The phrases of `problem`,** for `opencode.json`, in the order they are judged:
    * nothing at the path: `it is missing`, with `content` the new file
    * cannot be read: `it cannot be read: <message>`
    * not JSON, and its text holds `"node_modules/agentrite/process.md"` with the quotes: `{ loads: true }`
    * not JSON otherwise: `it is not JSON: <message>`
    * JSON that is not an object, `null` and a list among it: `it is not a JSON object`
    * no `instructions` key: `it has no instructions list`, with `content` amended
    * `instructions` that is not a list: `its instructions is not a list`
    * a list that does not hold the path: `its instructions list does not hold node_modules/agentrite/process.md`,
      with `content` amended
    * a list that holds it: `{ loads: true }`
* **A `CLAUDE.md` line is counted as R2 says, and nothing else:** the text is split at `\n`, one `\r` at the end of
  a line is dropped, and a line counts when it then equals `@node_modules/agentrite/process.md` or `@AGENTS.md`.
  A `CLAUDE.md` that is there and cannot be read lacks both lines, and so gets the notice of `init` and of
  `refresh` that names both. The spec says nothing of such a file. Claude Code cannot read it either, so it is
  judged as one that holds nothing
* **What `init` does with what is at the path of `opencode.json`.** Nothing there: it writes the file with the flag
  `wx`. Something there: it reads it, and writes `content` over it when the verdict has one. A symbolic link to a
  JSON file is read and amended through, as `package.json` is today. A dangling one, or a directory, cannot be
  read and is left with the notice
* **Where `init` prints the line of `opencode.json`:** after the line of `package.json` and before the line of
  `.dockerignore`. Its notice comes after those of `AGENTS.md` and `CLAUDE.md`, so before the content of
  `agentrite.json` that a first `init` prints
* **When `init` reads `opencode.json`:** after the other files are written, where `package.json` is amended. It is
  never among what `init` refuses on (R6), so nothing needs it before the first write
* **The order of `refresh`'s notices:** after every line of the files it refreshed, `CLAUDE.md` first and then
  `opencode.json`, each after an empty line, as `init` prints its notices. They go to standard output, and the
  exit status stays what the files gave
* **The heading of the README section is `### How the kit's instructions reach an agent`,** under "Installing it
  into a project" and before "On a fresh clone". Every notice ends by pointing to it as
  `See "How the kit's instructions reach an agent" in node_modules/agentrite/README.md.`, which is where a project
  has the README after `npm ci`
* **The `CLAUDE.md` template's prose follows its lines.** It says today that the file is a bridge that imports
  `AGENTS.md`. It will say that it imports the kit's `process.md` and `AGENTS.md`, and the list of where
  instructions live stays

The notices, as the module returns them. `<lines>` stands for the lines lacked, one to a line, and `<problem>` for
the phrase above. No fixed line is over 120 characters:

`init`, for a `CLAUDE.md` that exists and lacks a line, with `claude` among the harnesses (R2):

```
CLAUDE.md exists and was left as it is. It lacks the lines below, and Claude Code does not read the kit's
instructions without them. Add each on a line of its own, outside a code span or a fenced block:

<lines>

See "How the kit's instructions reach an agent" in node_modules/agentrite/README.md.
```

`init`, for an `opencode.json` it cannot amend, with `opencode` among the harnesses (R5):

```
opencode.json was left as it is, because <problem>.
For OpenCode to read the kit's instructions, its instructions list must hold node_modules/agentrite/process.md.
Add it by hand. See "How the kit's instructions reach an agent" in node_modules/agentrite/README.md.
```

`refresh`, for a `CLAUDE.md` that is missing or lacks a line, with `claude` among the harnesses. `<problem>` is
`it is missing` or `it lacks the lines below` (R9):

```
CLAUDE.md does not load the kit's instructions, because <problem>. Claude Code does not read
them without these lines, each on a line of its own and outside a code span or a fenced block, and refresh does
not add them:

<lines>

See "How the kit's instructions reach an agent" in node_modules/agentrite/README.md.
```

`refresh`, for an `opencode.json` that does not load the path, with `opencode` among the harnesses (R9). The line
breaks before "because", added while implementing: on one line, the problem of a list that lacks the path makes it
133 characters, over the limit task 2 holds the notices to:

```
opencode.json does not load the kit's instructions,
because <problem>.
OpenCode does not read them without node_modules/agentrite/process.md in its instructions list, and refresh
does not add it. See "How the kit's instructions reach an agent" in node_modules/agentrite/README.md.
```

What the tree holds that the work must fit:

* The suite is 500 tests in `tests/*.test.mjs`, run by `npm test`, and all pass on `f43b190`
* Several tests of `refresh` assert every line it prints, in projects with no `CLAUDE.md` and no `opencode.json`,
  which will get notices from this unit: in `tests/agentrite-refresh.test.mjs` the tests "stale wrappers and a
  stale shim are refreshed", "a project with none of the files gets all nine", "refresh does for each value of the
  two settings", "the repository own agentrite.json, wrappers and sandbox.sh are up to date" and "refresh with
  sandbox false refreshes the wrappers", and in `tests/settings-update.test.mjs` the two that compare
  `refreshed.stdout`, and, found while implementing, "a project with the three wrappers of the release before gets
  the fourth" in `tests/agentrite-refresh.test.mjs` and "refresh runs on the file config wrote" in
  `tests/agentrite-config.test.mjs`. Task 7 has them compare the lines before the first empty line, as `linesOf`
  of the `init` tests does, and assert the notices on their own
* The tests of `init` that use `CLAUDE_NOTICE` take the notice function instead, and those that compare every line
  `init` prints for `opencode` gain the line of `opencode.json`: "init with no argument takes the harnesses and the
  sandbox from the file" compares two runs that both get it
* This repository's own `CLAUDE.md` has no line `@node_modules/agentrite/process.md` and the root has no
  `opencode.json`, and both stay so (Non-goals). `node scripts/agentrite.mjs refresh` at the root will print both
  notices after this unit, which is right, and the test of the repository's own files compares only the lines
* The working tree held, before planning, an uncommitted edit of `README.md` that is not this unit's: "instp-alled"
  for "installed" in the opening of "Commands". It is not committed by this unit, and the implementer leaves it to
  the human, who made it or knows of it

## Files

- `scripts/agentrite-json.mjs`: new. `formattedLike(original, value)`
- `scripts/agentrite-instructions.mjs`: new. The judging of `CLAUDE.md` and `opencode.json`, the file `init`
  writes, and the notices
- `scripts/agentrite.mjs`: `withCheckChangesScript` uses `formattedLike`. `init` writes or amends `opencode.json`
  and notices `CLAUDE.md` by the new rule. `refresh` reads both and notices. `CLAUDE_NOTICE` goes
- `templates/project/CLAUDE.md`: the line `@node_modules/agentrite/process.md` before `@AGENTS.md`, and its prose
- `package.json`: `files` gains `scripts/agentrite-json.mjs` and `scripts/agentrite-instructions.mjs`
- `README.md`: the new section, and "agentrite init", "agentrite refresh", "Installing it into a project" and
  "Updating a project to a newer kit"
- `tests/agentrite-json.test.mjs`: new
- `tests/agentrite-instructions.test.mjs`: new
- `tests/agentrite-init.test.mjs`, `tests/agentrite-refresh.test.mjs`, `tests/settings-update.test.mjs`,
  `tests/package-documents.test.mjs`: changed
- `tests/agentrite-config.test.mjs`: changed, added while implementing, for its one test that compares every line
  `refresh` prints

## Tasks

The JSON layout, as a refactoring:

- [x] 1. Write `tests/agentrite-json.test.mjs` for `formattedLike`: two-space and tab indentation kept, a
  trailing line break kept and its absence kept, key order as the value gives it, and an original with no
  indented line laid out with two spaces. Add `scripts/agentrite-json.mjs` with `formattedLike` until it passes,
  and have `withCheckChangesScript` use it. The tests of `package.json` in `tests/agentrite-init.test.mjs` pass
  unchanged. Add the module to `files` in `package.json` and to the list in `tests/package-documents.test.mjs`
  (R4, R10)

The module that judges:

- [x] 2. Write `tests/agentrite-instructions.test.mjs`, failing (R2, R3, R4, R5, R9, R10):
    * `claudeLacks`: a text with both lines lacks none, in LF and in CRLF. Each line missing, alone and both. A line
      with a space after it, one indented, one inside a longer line and `@AGENTS.md` alone all lack what they do
      not hold exactly. `{ found: false }` and `{ found: true, error }` lack both. The lines lacked come in the
      order `@node_modules/agentrite/process.md`, `@AGENTS.md`
    * `opencodeVerdict`, one case per phrase of the Approach, with the `problem` and the `content` it gives.
      `{ found: false }` gives `content` byte for byte the file of R3. An object with no `instructions` and other
      keys, indented with a tab and with no final line break, gives those keys in their order, the tab and no line
      break, and `instructions` last holding the path. A list `["a.md"]` gives `["a.md", "<path>"]`. A list that
      holds the path, and a text that is not JSON with a comment and the path in quotes, load. The path without
      quotes in a text that is not JSON does not. `[]`, `null`, `"x"` and `{ "instructions": "x" }` give the
      phrases of their case and no `content`
    * each notice holds what the Approach gives it, the lines or the problem it was given, the pointer to the
      section, and no line over 120 characters for the fixed text and the problems that hold no error message.
      The notice of `init` for `opencode.json` and both notices of `refresh` name
      `node_modules/agentrite/process.md`. Both notices of `refresh` say that `refresh` does not add it. No notice
      holds an em dash
    * `readProjectFile` in a temporary directory: a file, nothing, a directory, and a dangling symbolic link
- [x] 3. Write `scripts/agentrite-instructions.mjs` until task 2 passes. It exports `PROCESS_PATH`,
  `CLAUDE_LINES`, `OPENCODE_FILE`, `readProjectFile`, `claudeLacks`, `opencodeVerdict` and the four notice
  functions, and imports `formattedLike`. No shebang. Add it to `files` in `package.json` and to the list in
  `tests/package-documents.test.mjs` (R3, R4, R5, R10)

The `CLAUDE.md` that `init` writes:

- [x] 4. In `tests/agentrite-init.test.mjs`, extend "CLAUDE.md is planned for every harness list", failing: the
  planned `CLAUDE.md` holds a line that is exactly `@node_modules/agentrite/process.md` before the line
  `@AGENTS.md`, neither in a fenced block (no line opening with three backticks before either) nor in a code span,
  and `claudeLacks` of it lacks none. Then add the line to `templates/project/CLAUDE.md`, under
  "Repository Instructions" and above `@AGENTS.md`, and say in its opening that it imports the kit's `process.md`
  and `AGENTS.md` into Claude Code (R1)

`init`:

- [x] 5. Write the tests of `init`, failing, in `tests/agentrite-init.test.mjs` (R2, R3, R4, R5, R6, R7):
    * `init opencode` in a fresh project: `opencode.json` byte for byte the file of R3, and the line
      `wrote opencode.json` after the line of `package.json`. The same for `init claude opencode`, also with
      `--no-sandbox`. "a fresh project gets every file" gains it
    * an `opencode.json` that is an object without `instructions`, and one whose list lacks the path: the file as
      `opencodeVerdict` amends it, `changed opencode.json`, and no notice of it
    * one whose list holds the path, and one that is not JSON with a comment and the path in quotes: byte for byte
      as it was, `skipped opencode.json, which loads node_modules/agentrite/process.md`, and no notice of it
    * one that is not JSON, a JSON list, `null`, one whose `instructions` is a string, and a directory at the path:
      as it was, `skipped opencode.json, which cannot be amended`, the notice of the problem among the notices,
      every other file written as in a project without it, and exit 0
    * one that is not JSON, in a project whose `package.json` has no `name`: `init` refuses for the name as today
      and has written nothing, `opencode.json` among it. In one with a name, the not-JSON `opencode.json` does not
      stop `init` from writing `agentrite.json` and the rest (R6)
    * `init claude`, with each kind of `opencode.json` above at the path and with none: the path is as it was, and
      no line holds `opencode.json`
    * `CLAUDE.md` that exists, for `init claude`: `our own\n` gets the notice naming both lines, one holding only
      `@AGENTS.md` gets it naming only `@node_modules/agentrite/process.md`, one holding both, in LF and in CRLF,
      gets no notice of `CLAUDE.md`. Each is printed as `skipped CLAUDE.md, which exists` as today
    * `CLAUDE.md` that exists and lacks both lines, for `init opencode`: the skipped line and no notice of it
    * the tests that use `CLAUDE_NOTICE` use the notice function with both lines, and "init with no argument takes
      the harnesses and the sandbox from the file" passes with the line of `opencode.json` in both runs
- [x] 6. In `scripts/agentrite.mjs`, make `init` pass task 5 (R2, R3, R4, R5, R6, R7):
    * the notice of a `CLAUDE.md` that exists is pushed only with `claude` among the harnesses, and only when
      `claudeLacks(readProjectFile(root, 'CLAUDE.md'))` lacks a line. `CLAUDE_NOTICE` is removed
    * with `opencode` among the harnesses, after `package.json`: `readProjectFile` and `opencodeVerdict`. Loads:
      print the skipped line of R4. A `content`: write it, with `wx` when nothing was there, and print `wrote` or
      `changed`. No `content`: print `skipped opencode.json, which cannot be amended` and push the notice
    * without `opencode`, nothing of the above runs

`refresh`:

- [x] 7. Write the tests of `refresh`, failing, in `tests/agentrite-refresh.test.mjs`, and change the tests the
  Approach names to compare the lines before the first empty line (R9):
    * with `claude`: a missing `CLAUDE.md`, one holding only `@AGENTS.md`, and one holding neither each get the
      notice with the lines lacked, after every line of the files. One with both lines, LF or CRLF, gets none
    * with `opencode`: a missing `opencode.json`, one with no `instructions`, one whose list lacks the path, one
      that is not JSON, and a directory at the path each get the notice with their problem. One that loads the
      path, also by the text of one with a comment, gets none
    * with one harness only, nothing is said of the other's file, whatever is at its path
    * after every run, `CLAUDE.md` and `opencode.json` are byte for byte what they were, and a missing one is still
      missing. The lines `refresh` prints for the wrappers and `sandbox.sh`, and its exit status, are the same as
      in the same project with both files loading the instructions. That holds also with a symbolic link at a
      wrapper's path, where the status is 1
    * in `tests/settings-update.test.mjs`, the two comparisons of `refreshed.stdout` compare its lines, and the
      first holds that both notices are printed, since its project is one set up before this unit
- [x] 8. In `scripts/agentrite.mjs`, after the loop over the files, have `refresh` read `CLAUDE.md` with `claude`
  and `opencode.json` with `opencode` among the harnesses, and print each notice the module gives for a file that
  does not load the instructions, each after an empty line. It writes neither file, and the status is the one
  the loop left (R9, R10)

What does not change:

- [x] 9. In `tests/package-documents.test.mjs`, hold that each of the four files of `roles/` holds
  `Read [process.md](../process.md) first`. The test of `AGENTS.md` in `tests/agentrite-init.test.mjs` holds the
  required reading already, and is left as it is (R11)

The documents:

- [x] 10. In `README.md`, add the section `### How the kit's instructions reach an agent` under "Installing it into
  a project", before "On a fresh clone". Its table, or a list where a row would not fit the line limit, gives for
  `AGENTS.md`, `CLAUDE.md` and `opencode.json` what each must hold and which harness reads it, as R12 lists them.
  Then the three things R12 says: what `init` puts in and where it only prints a notice, so that the project adds
  what is missing by hand; that neither harness reports a file that lacks them, and a session then has the kit's
  instructions only if the model follows the link in `AGENTS.md`; and that `refresh` never adds them, and prints
  its notice on every run while one lacks them, also for a project that leaves them out on purpose. The lines of
  `CLAUDE.md` are shown in a fenced block, and the text says that in the file they are not (R12)
- [x] 11. In `README.md`, change "agentrite init" (R13, R14):
    * the opening says that `init` writes or amends `opencode.json` with `opencode`
    * a paragraph says what it does with an `opencode.json` that exists, as R4 and R5 have it, the two `skipped`
      lines among it, and that no state of the file makes `init` refuse. And that it notices a `CLAUDE.md` that
      exists only with `claude` and only when it lacks one of the two lines
    * the paragraph on `--no-sandbox` names `opencode.json` among what is still written or amended
    * "See" gains the new section
- [x] 12. In `README.md`, change "agentrite refresh": it reads `CLAUDE.md` with `claude` and `opencode.json` with
  `opencode`, never writes either, and prints after its lines a notice for one that does not load the kit's
  instructions, which changes neither what it writes nor its exit status. "See" gains the new section (R13, R14)
- [x] 13. In `README.md`, change "Installing it into a project" (R13, R14):
    * the row of `CLAUDE.md` in the table says it imports the kit's `process.md` and `AGENTS.md`, and a row for
      `opencode.json` says it is for `opencode` and loads `process.md` into OpenCode
    * "`init` also amends two files" becomes three, with `opencode.json`: written when there is none, amended when
      it is a JSON object, and left with a notice when it cannot be amended
    * the text on a file that exists: the item on `CLAUDE.md` names both lines and points to the new section, and
      the item on `AGENTS.md` points to it too. A new item says what happens to an `opencode.json` that exists
    * the item on `AGENTS.md` among the files a project edits, and "`CLAUDE.md` is best left as written", point to
      the new section for what must stay
- [x] 14. In `README.md`, change "Updating a project to a newer kit": `opencode.json` is among the files `refresh`
  never touches or creates, it reads `CLAUDE.md` and `opencode.json` and prints the notices of task 12, and a
  project set up before this release runs `npx agentrite init` with no argument to get its `opencode.json`, or adds
  what the notices name by hand. It points to the new section (R13, R14)

In real sessions:

- [x] 15. In a scratch project outside the repository, install the kit from `npm pack` of the working copy, run
  `npx agentrite init --no-sandbox claude opencode`, and add a code word to the installed
  `node_modules/agentrite/process.md`. Ask a Claude Code session and an OpenCode session, each told not to read a
  file, for the code words in its context, and have each dispatch the planner wrapper as a subagent with the same
  question, reading the subagent's answer from its own result as the spec's "Context" describes. Both sessions and
  both subagents name the code word. Log in `record.md` the harness versions, the models and what each answered.
  Where a harness or a model cannot be reached from where the implementer works, log which check was not made
  and why, and leave it to the human (R1, R8)

## Verification

- [ ] `npm test` passes, and the count is higher than 500
- [ ] `node scripts/check-changes.mjs` at the root exits 0
- [ ] `node scripts/agentrite.mjs refresh` at the root prints `up to date` for the eight wrappers and `sandbox.sh`,
  and then the two notices, and `git status --short` shows nothing it changed (R9)
- [ ] `grep -rn "agentrite/process.md" scripts` shows the path in `scripts/agentrite-instructions.mjs` alone, and
  `grep -rn "opencode.json\|CLAUDE.md\|OPENCODE_FILE" scripts/agentrite.mjs` shows the template's path, the
  calls of `readProjectFile` and the lines printed, and no judging of either file (R10)
- [ ] `npm pack --dry-run` lists `scripts/agentrite-json.mjs` and `scripts/agentrite-instructions.mjs`
- [ ] The check of task 15 is logged in `record.md`, with what was not checked and why (R1, R8)
- [ ] No line of a file this unit changed is over 120 characters, and none holds an em dash
- [ ] `git diff master -- CHANGELOG.md CONTRIBUTING.md SANDBOX.md CLAUDE.md AGENTS.md process.md roles` is empty
  (R11, Non-goals)

## Commit Points

- [x] `feature-0048 Plan loading process.md through the harness`: this plan and the record
- [x] `feature-0048 Lay out an amended JSON file in one place`: task 1
- [x] `feature-0048 Judge whether CLAUDE.md and opencode.json load the process, in one module`: tasks 2 and 3
- [x] `feature-0048 Import process.md in the CLAUDE.md that init writes`: task 4
- [x] `feature-0048 Have init write or amend opencode.json, and notice only a CLAUDE.md that lacks a line`: tasks 5
  and 6
- [x] `feature-0048 Have refresh notice a CLAUDE.md or opencode.json that does not load the process`: tasks 7 and 8
- [x] `feature-0048 Hold that the role files still say to read process.md first`: task 9
- [x] `feature-0048 Describe how the kit's instructions reach an agent`: tasks 10 to 14
- [x] `feature-0048 Record the check in real sessions`: task 15, the entry in `record.md`
