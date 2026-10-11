# 0045 A project names its settings in `agentrite.json`

## Approach

One new module, `scripts/agentrite-settings.mjs`, is the one place that knows `agentrite.json`: what a valid file
is, how it is read, what is said of one that is missing or not valid, and how the file is written out. Everything
else takes the settings from it (R4):

* `scripts/agentrite.mjs` imports it for `init`, `refresh` and the new `config`
* `scripts/check-changes.mjs` imports it for the default branch
* `container/sandbox.sh` and `container/unit-clone.sh` cannot import. The module, run as the entry point with the
  project root as its one argument, prints the default branch, and the shell runs it with `node`, which the
  wrapper uses already. It is found as `$here/../scripts/agentrite-settings.mjs`: `container/` and `scripts/` are
  siblings in the package and in the working copy alike

The module is split as `process.md` asks: `parseSettings(text)` and `settingsText(settings)` are pure, and
`readSettings(root)` is the one function that touches the file system.

What this plan decides, each because the spec leaves the how open:

* **The default file is a template, and the written file is rendered.** `templates/project/agentrite.json` holds
  the default file. `config` copies it as it is. `init` writes `settingsText(...)`, and a unit test holds that
  `settingsText` of the template's own values is the template byte for byte, so the two cannot drift (R9)
* **`master` is in the template and nowhere in the code.** The branch that `init` writes when
  `--default-branch` is not given is the `defaultBranch` of the parsed template, and the notice names that value
  (R32)
* **The order of the harnesses.** In `agentrite.json` they are in the kit's order, `HARNESS_NAMES` (R8). For every
  other file `init` goes on using the order they were given in, as today, because R15 keeps what it writes and
  prints for those. `readSettings` returns the list in the file's order, each name once
* **Parsing comes before the file is looked at.** A command line that cannot be parsed exits 2 as today, whether
  or not the project has a file: `--default-branch` with no name, an unknown harness, any argument to `refresh` or
  `config`. Past that, `init` with an argument in a project where something is at the path of `agentrite.json`
  refuses with 1 and does not read the file (R12), and `init` with no argument reads it
* **`agentrite.json` is written and listed first by `init`,** after `package.json`, the lockfile and the templates
  have been read and judged, which is everything `init` refuses on. So a refusal has written no file (R13)
* **Git is asked for `refs/heads/<default branch>` and `refs/remotes/origin/<default branch>`,** by the change
  check and by the wrapper, so that a name that is also a tag, or one that opens with a dash, is read as a branch
  or not at all. What is printed names the branch plainly
* **`resolve_unit_branch` is given the reader's path as a third argument** and reads the default branch itself,
  only on the way to cutting. `--connect`, `--in-place`, `--workdir` and a unit whose branch exists never reach it
  (R7, R27)
* **The section of `README.md` on the file is "The project's settings",** between "Installing it into a project"
  and "Updating a project to a newer kit"

What the tree holds that the work must fit:

* The suite is 426 tests in `tests/*.test.mjs`, run by `npm test`. Many of them run `refresh` and `init` with
  harnesses as arguments, or cut a branch from `master` with no `agentrite.json`. Each task below names the test
  file it rewrites. No new test may ask git anything of the kit's own repository, because the clone of a unit run
  has no local `master` (R45)
* `npm run check-changes` and `./sandbox.sh` at this root run the installed release 6.0.0 and are not touched by
  this unit. `npx agentrite` and `node scripts/check-changes.mjs` at this root run the working copy, and need the
  root's `agentrite.json` from task 9 on
* `README.md` is in the package although `files` does not list it, so R32 covers its "merge it back to master"
* Nothing here needs Docker. A unit run is tested with the stand-in of `tests/wrapper-fixture.mjs`. A run of
  `./sandbox-dev.sh` with real Docker is not part of the plan

## Files

- `scripts/agentrite-settings.mjs`: new. The reader, the judge and the writer of `agentrite.json`
- `templates/project/agentrite.json`: new. The default file
- `agentrite.json`: new, at the root. This repository's own, byte for byte the template
- `package.json`: `files` gains `scripts/agentrite-settings.mjs`
- `scripts/agentrite.mjs`: `config`, both forms of `init`, `refresh` with no argument, the remedy of `run`, the
  usage
- `scripts/check-changes.mjs`: the base is the default branch of the file
- `container/unit-clone.sh`, `container/sandbox.sh`: the branch is cut from the default branch. The messages and
  the comments
- `process.md`, `roles/planner.md`, `roles/specifier.md`, `roles/reviewer.md`: "the default branch"
- `README.md`, `SANDBOX.md`, `CONTRIBUTING.md`, `RELEASING.md`: as tasks 21 to 26 say
- `pointers/agentrite-roles/pointer.mjs`, `README.md`, `package.json`: the commands, and version `2.0.2`
- `tests/agentrite-settings.test.mjs`: new. The unit tests of the module
- `tests/agentrite-config.test.mjs`: new. `config` end to end
- `tests/settings-update.test.mjs`: new. The steps of R44 end to end
- `tests/agentrite-init.test.mjs`, `tests/agentrite-refresh.test.mjs`, `tests/agentrite-run.test.mjs`,
  `tests/check-changes.test.mjs`, `tests/sandbox-unit-run.test.mjs`, `tests/sandbox-update.test.mjs`,
  `tests/package-documents.test.mjs`, `tests/pointers.test.mjs`: changed

## Tasks

The settings module:

- [x] 1. Write `tests/agentrite-settings.test.mjs`, failing, for `parseSettings`, `settingsText` and
  `readSettings` (R1, R3, R5, R6, R45):
    * a valid file gives `{ defaultBranch, harnesses, sandbox }`. A harness named twice is there once. A key the
      kit does not know is ignored
    * every kind R3 names as not valid throws, one case each: text that is not JSON, JSON that is no object (an
      array, `null`, a string), each of the three keys missing, `defaultBranch` a number and an empty string,
      `harnesses` no list, an empty list, a list with a number in it and one with `codex`, `sandbox` the string
      `"false"` and a number
    * the message for a key opens with `agentrite.json: <key> `, says what is wrong and ends in what the key must
      hold. The message for text that is not JSON names `agentrite.json`, holds the parser's own error, and says
      that the file must hold a JSON object with the keys `defaultBranch`, `harnesses` and `sandbox`
    * `settingsText` gives the three keys in the order of R1, indented by two spaces, the list on one line with
      `, ` between its names, and one line break at the end
    * `readSettings`, in temporary directories: a valid file, a directory with no file, and a directory where
      `agentrite.json` is itself a directory. No file throws exactly
      `the project has no agentrite.json. Run: npx agentrite config, which writes one`. What cannot be read
      throws a message with the file's name, the error and the sentence on the JSON object
- [x] 2. Add `templates/project/agentrite.json`, the default file of R2, ending in one line break. Add to the test
  file of task 1: the template is valid, and `settingsText(parseSettings(template))` is the template byte for byte
  (R2, R9)
- [x] 3. Write `scripts/agentrite-settings.mjs` until tasks 1 and 2 pass. It exports `SETTINGS_FILE`, which is
  `agentrite.json`, and the three functions. The harness names come from `HARNESS_NAMES` of
  `scripts/agentrite-roles.mjs`, and the text of what `harnesses` must hold is built from them. What is wrong is
  said as `is missing` or with `JSON.stringify` of the value found, and the first key at fault, in the order of
  R1, is the one named. No shebang (R3, R4, R5, R6)
- [x] 4. Add to the test file, failing, and then to the module, its entry point. `node
  scripts/agentrite-settings.mjs <project root>` prints the default branch and a line break and exits 0. For a
  missing file and for one that is not valid it prints nothing on standard output, prints `agentrite: ` and the
  message of `readSettings` on standard error, and exits 1. Imported, the module prints nothing. Guard the entry
  point as `isMain` of `scripts/agentrite.mjs` does (R4, R27)
- [x] 5. In `package.json`, add `scripts/agentrite-settings.mjs` to `files`. In
  `tests/package-documents.test.mjs`: add it to the list the test compares, hold that every file a listed file of
  `scripts/` imports by a relative path is itself listed, and hold that `templates/project/agentrite.json` exists
  under the listed `templates` (R47)

The commands:

- [x] 6. Write `tests/agentrite-config.test.mjs`, failing (R16, R17, R18, R19, R46):
    * with an argument, also `claude`: the usage `usage: agentrite config`, exit 2, nothing written
    * in an empty directory with no `package.json`: exit 0, `agentrite.json` byte for byte the template, and
      standard output is `wrote agentrite.json`, an empty line, the content, an empty line and the notice
    * the notice says the four things R18 lists
    * with a valid file, a file that is not valid and a directory at the path: exit 0, the path as it was,
      standard output exactly `skipped agentrite.json, which exists\n`
    * `refresh` run after `config` in the same directory exits 0 and writes the eight wrappers and `sandbox.sh`
- [x] 7. Rewrite the tests of `refresh` in `tests/agentrite-refresh.test.mjs`, failing. Its `project` helper gets
  a way to write `agentrite.json` from `settingsText`, and every end-to-end test runs `refresh` with no argument
  on a file that holds what the test gave as arguments before: the harnesses, and `sandbox` `false` where it gave
  `--no-sandbox`. Then add (R20, R21, R22, R46):
    * each value of both settings: one harness, the other, both, and `sandbox` `true` and `false`. With `false`,
      `sandbox.sh` is not read or written and no line names it, whatever is at its path
    * `agentrite.json` is byte for byte what it was after every run
    * a missing file: exit 1, nothing written, the message of task 1 with `agentrite: ` before it
    * a file that is not valid in a key `refresh` does not use, `defaultBranch` a number: exit 1, nothing written
    * every argument it took before, `claude`, `claude opencode`, `--no-sandbox` and `--no-sandbox claude`, and
      `codex`: exit 2, nothing written, `usage: agentrite refresh` and a line that says that the harnesses and the
      sandbox setting are read from `agentrite.json`. Also in a project with no file
- [x] 8. Rewrite the tests of `init` in `tests/agentrite-init.test.mjs`, failing. The `parseArgs` tests lose
  `refresh` with harnesses and gain what task 10 returns. The end-to-end tests that compare every line `init`
  prints gain the line and the content of task 11. Then add (R8, R9, R10, R11, R12, R13, R14, R15, R46):
    * the file for every combination: each of the three harness lists, with and without `--no-sandbox`, with and
      without `--default-branch main`, compared with `settingsText`
    * `--default-branch main` before, between and after the harnesses, and given twice, where the last counts
    * `init claude opencode` and `init opencode claude` both write byte for byte the template. After the second,
      the wrapper lines are still printed with those of `opencode` first, as before this unit
    * what is printed: `wrote agentrite.json` as the first line, and the content after the notices of `AGENTS.md`
      and `CLAUDE.md`. Without `--default-branch`, the notice of the default branch last. With it, no such notice
    * `--default-branch` as the last word, and with `''` after it: exit 2, why and the usage, nothing written
    * no file and no harness, for `init`, `init --no-sandbox` and `init --default-branch main`: the usage, exit 2,
      nothing written
    * a refusal for a `package.json` that is missing, that is not JSON, or that has no `name` leaves no
      `agentrite.json`
    * a project with a file and no argument, for a file with the one harness `opencode`: the files `init opencode`
      wrote before, `skipped agentrite.json, which exists`, the file byte for byte what it was, no content and no
      notice printed
    * the same for a file with `sandbox` `false` and a `package.json` with no `name` and a lockfile that is not
      JSON: exit 0, and none of the three files of the sandbox
    * a project with a file, given `claude`, `--no-sandbox`, `--default-branch main`, and the arguments that say
      what the file says: exit 1, nothing written, and a message that says the four things of R12. Also when the
      file is not valid
    * a project with a file that is not valid and no argument: exit 1, nothing written
- [x] 9. Add the root's `agentrite.json`, byte for byte the template. In `tests/package-documents.test.mjs` hold
  that it equals the template and that `files` does not name it. In `tests/agentrite-refresh.test.mjs` add a
  test that copies the root's `agentrite.json`, its eight wrappers and its `sandbox.sh`, with its mode, into a
  temporary directory, runs `refresh` there, and sees `up to date` for all nine and no file changed. It fails
  until task 12 (R41, R42)
- [x] 10. In `scripts/agentrite.mjs`, replace `sandboxForm` and `harnessesAndSandboxOf` by a parser of `init`
  alone. It reads the words in order: `--no-sandbox` anywhere, `--default-branch` with the word after it as the
  name whatever that word is, the last one counting, and every other word as a harness, unknown ones refused as
  today. It returns the harnesses in the order given, each once, `sandbox`, `defaultBranch`, which is `undefined`
  when the option was not given, and whether any argument was given. It throws, with why and the usage of `init`,
  for `--default-branch` with no word or an empty one. An empty list of harnesses is not a parse error any more.
  The `form` of `init` is two lines: `usage: agentrite init [--no-sandbox] [--default-branch <name>] claude |
  opencode` and, under it, `agentrite init` (R8, R10, R24)
- [x] 11. In `scripts/agentrite.mjs`, make `init` pass task 8 (R8, R9, R11, R12, R13, R14, R15):
    * something at the path of `agentrite.json` and an argument given: throw the refusal of R12, before anything
      is read
    * a file and no argument: `readSettings`, then the files as today for its harnesses and its `sandbox`, with
      `skipped agentrite.json, which exists` as the first line
    * no file and no harness: print the usage of `init` on standard error and return 2
    * no file and harnesses: plan the files as today, which is where `init` refuses, then write `agentrite.json`
      first, in the same loop as the other files, as `settingsText` of the harnesses in the order of
      `HARNESS_NAMES`, the sandbox setting, and the branch given or else the template's. After the notices of
      today print the content, and then, when `--default-branch` was not given, the notice of R8
    * the content is printed by one function that `config` uses too, and both notices are exported, as
      `CLAUDE_NOTICE` is, with no line over 120 characters
- [x] 12. In `scripts/agentrite.mjs`, give `refresh` a parser that throws its usage and the line of R21 for any
  argument, and have it take the harnesses and `sandbox` from `readSettings`, until tasks 7 and 9 pass. It
  writes nothing to `agentrite.json` (R20, R21, R22, R42)
- [x] 13. In `scripts/agentrite.mjs`, add `config` to `COMMANDS`, after `init`, until task 6 passes: no argument,
  the template copied with the flag `wx` when nothing is at the path, and the lines of R17 to R19. It reads
  nothing of the project but whether the path is taken (R16, R17, R18, R19)
- [x] 14. Change the remedy of `checkWrapper` to `Run: npx agentrite refresh, which writes the wrappers of the
  harnesses that agentrite.json names`, for both of its messages. In `tests/agentrite-run.test.mjs`, first:
  the two messages, the usage of every command as R24 gives it, with `config` and the two lines of `init`, and
  the `project` helper, which writes an `agentrite.json` before its `refresh`. Add that `run` and `roles` do what
  they did with no file and with one that is not valid. In `tests/sandbox-update.test.mjs`, the project gets an
  `agentrite.json` with the one harness `claude`, and its `refresh` takes no argument (R7, R23, R24)

The default branch:

- [x] 15. Rewrite the end-to-end tests of `tests/check-changes.test.mjs`, failing. `repositoryWithFrozenUnit`
  takes the name of the default branch and writes an `agentrite.json` that names it. Then (R25, R26, R46):
    * the three tests of today, on a default branch `main`
    * a repository whose default branch is `main` and that also has a branch `master`, which holds no unit: the
      changed spec is still reported, so `master` was not read
    * the fallback: a clone with no local `main` finds its base as `origin/main`
    * a missing file and a file that is not valid: a status other than 0 and the messages of task 1
    * a `defaultBranch` that names no branch: a status other than 0, and a message that names `nowhere` and
      `origin/nowhere` and says that the name is the `defaultBranch` of `agentrite.json`
- [x] 16. In `scripts/check-changes.mjs`, take the default branch from `readSettings` of the repository root, and
  ask git for the merge base with `refs/heads/<default branch>` and then `refs/remotes/origin/<default branch>`.
  Remove `BASE_REFERENCES`, name the function and its comment after the default branch, and give the failure the
  message of R26 (R25, R26, R32)
- [x] 17. Change `tests/sandbox-unit-run.test.mjs`, failing. `setUp` copies the kit's whole `scripts/` beside
  the copied `container/`, and commits an `agentrite.json` that names `master` in the first commit. The tests
  that hold a message of today hold it with the default branch's name or with "the default branch", as R29 says.
  Then add (R7, R27, R28, R29, R30, R46):
    * a repository on `main`, with the unit committed on `main` and a branch `master` that does not hold it: the
      branch is cut at the head of `main`, and the line is `sandbox.sh: cut feature-0031-cut-me from main at
      <commit>, for changes/0031-cut-me.`
    * the file of the working tree is the one read: committed it names `master`, edited and not committed it
      names `main`, the checkout is on a third branch, and the cut is from `main`
    * a missing file and a file that is not valid, with a build due: exit 2, the message of task 1, no branch
      cut, no clone, and Docker and npm asked nothing
    * a default branch that is no local branch: the message names the branch and says that `agentrite.json`
      names it as the default branch
    * with no `agentrite.json`: a unit run of a branch that exists, `--in-place`, `--workdir` and `--connect`
      make the calls they make today
    * the two lines printed without the file say "the default branch": the forms, and the refusal of a name that
      is no branch
    * inside the clone: on a default branch `main` with an implemented unit, the agent's script changes that
      unit's `spec.md`, commits, runs the working copy's `scripts/check-changes.mjs` on the clone, and writes
      its status and what it printed to a file outside the clone. The test finds the violation there, which
      shows that the base was `origin/main`
- [x] 18. In `container/unit-clone.sh`, give `cut_unit_branch` the default branch as its third argument and use
  it wherever it reads `master`, as `refs/heads/<default branch>` for git and by its plain name in what is
  printed. Give `resolve_unit_branch` the reader's path as its third argument: for a unit of digits that no
  branch holds it runs `node <reader> <root>`, and when that fails it says that no branch is cut for the unit and
  returns 3. Word the messages as R29 says, and bring the comments of the file in line, its header on what it
  runs among them (R27, R28, R29, R32)
- [x] 19. In `container/sandbox.sh`, pass `$here/../scripts/agentrite-settings.mjs` to `resolve_unit_branch`,
  and say "the default branch" in `mount_forms` and in the comments of the header, of the usage and above the
  two places that name `master`, until task 17 passes (R27, R28, R29, R32)

The prose and the documents:

- [x] 20. In `process.md`, `roles/planner.md`, `roles/specifier.md` and `roles/reviewer.md`, write "the default
  branch" wherever `master` is named, and say once in `process.md`, where "Changes" first names the branch, that
  the default branch is the one the project names as `defaultBranch` in `agentrite.json` at its root. Nothing
  else of the four changes (R31, R32)
- [x] 21. `README.md`, "Installing it into a project" and "On a fresh clone" (R33, R35, R38):
    * the install is `npm install --save-dev agentrite`, and the sentence after it says `devDependencies`
    * `agentrite.json` is in the table of what `init` writes, the example shows `--default-branch`, and the text
      refers to "The project's settings"
    * the bullets on `--no-sandbox` and on a `package.json` with no `name` say what holds now
    * "On a fresh clone" gains the passage of R35
- [x] 22. `README.md`, the new section "The project's settings", with its line in the list at the top: everything
  R36 lists, and nothing on why the file exists (R36, R40)
- [x] 23. `README.md`, "Commands": `agentrite config` as a new entry, `agentrite init` in both forms with
  `--default-branch <name>` and without "It is not remembered", `agentrite refresh` with no argument and no
  table of arguments, `check-changes` and `sandbox.sh` with the default branch. Then the rest of the document:
  the remedy under "Running a role" is `npx agentrite refresh`, "merge it back to master" and "a unit on
  `master`" name the default branch, and the row of `templates/project/` in "What is here" covers `config` (R23,
  R32, R37, R38)
- [x] 24. `README.md`, "Updating a project to a newer kit": `npm install --save-dev agentrite@latest`, `npx
  agentrite refresh` with no argument and no `--no-sandbox`, and that a project with no `agentrite.json` first
  runs `npx agentrite config`, checks what it wrote and commits the file (R34, R37, R38, R44)
- [x] 25. `SANDBOX.md`: "Running a unit" says the three things of R39 and names the default branch wherever it
  named `master`. The entries of "When something goes wrong" say "the default branch", and the entry for a
  default branch that is no local branch gives both remedies. No entry for the refusals of R5 and R6 (R32, R39,
  R40)
- [x] 26. `CONTRIBUTING.md` gains the row of `agentrite.json` in "What the repository holds besides the package",
  and changes in nothing else. Step 6 of `RELEASING.md` gives `npx agentrite refresh`, and changes in nothing
  else (R41, R43)

The update and the pointer:

- [ ] 27. Write `tests/settings-update.test.mjs`: a git repository on `main` with the eight wrappers, the files
  of the sandbox, a unit committed and no `agentrite.json`, with the kit's `container/` and `scripts/` copied in
  as `tests/sandbox-unit-run.test.mjs` does. `refresh`, the change check and a unit run by the unit's number
  each refuse and name `npx agentrite config`. Then `config`, an edit of `defaultBranch` to `main`, and a commit:
  `refresh` prints `up to date` for the nine files, the change check exits 0, and the unit run cuts from `main`.
  A second project without the sandbox and with one harness: after `config` and the edit of both keys, `refresh`
  prints its four wrappers and no line for `sandbox.sh`. It passes as written, on the work of tasks 1 to 19 (R44,
  R46)
- [ ] 28. In `tests/pointers.test.mjs`, failing: the version is `2.0.2`, the message and the README hold `npm
  install --save-dev agentrite`, `npx agentrite init claude opencode` and `npx agentrite refresh`, neither holds
  `refresh claude`, `refresh --no-sandbox` or an `npm install agentrite` with no `--save-dev`, and both name
  `--no-sandbox` for `init`. The exit status of 1 and the `description` are held as today (R48, R49)
- [ ] 29. Change `pointers/agentrite-roles/pointer.mjs`, its `README.md` and the `version` in its
  `package.json` until task 28 passes. Nothing is published (R48, R49)

## Verification

- [ ] `npm test` passes, and the count is higher than 426
- [ ] `node scripts/check-changes.mjs` at the root exits 0, and so does `npm run check-changes`
- [ ] `node scripts/agentrite.mjs refresh` at the root prints `up to date` for nine files, and `git status
  --short` shows nothing it changed (R42)
- [ ] `grep -rnw master process.md roles templates scripts container README.md SANDBOX.md` gives the template's
  line and the lines of the documents that say `master` is what is written when nothing else is asked for, and
  no other (R32)
- [ ] `grep -rn "agentrite.json" scripts container` shows no place but `scripts/agentrite-settings.mjs` that
  reads or judges the file (R4)
- [ ] `npm pack --dry-run` lists `scripts/agentrite-settings.mjs` and `templates/project/agentrite.json`, and
  does not list the root's `agentrite.json` (R41, R47)
- [ ] `grep -rn "refresh claude\|refresh opencode\|refresh --no-sandbox\|npm install agentrite" README.md
  SANDBOX.md CONTRIBUTING.md RELEASING.md pointers` gives nothing (R37, R43, R48)
- [ ] No new test runs git in the kit's own repository, read from the tests added (R45)
- [ ] No line of a file this unit changed is over 120 characters, none holds an em dash, and `SANDBOX.md` holds
  no HTML (R40)
- [ ] `git diff master -- CHANGELOG.md` is empty, and `RELEASING.md` and `CONTRIBUTING.md` differ by the one
  line and the one row

## Commit Points

- [x] `feature-0045 Read and judge agentrite.json in one module`: tasks 1 to 5
- [x] `feature-0045 Take the settings of init and refresh from agentrite.json, and add config`: tasks 6 to 14
- [x] `feature-0045 Compare with the default branch in the change check`: tasks 15 and 16
- [x] `feature-0045 Cut a unit's branch from the default branch`: tasks 17 to 19
- [x] `feature-0045 Name the default branch in the process and the roles`: task 20
- [x] `feature-0045 Describe agentrite.json and the commands in the documents`: tasks 21 to 26
- [ ] `feature-0045 Test the steps of a project that updates`: task 27
- [ ] `feature-0045 Bring the pointer package along`: tasks 28 and 29
