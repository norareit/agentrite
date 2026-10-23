# 0082 A unit can be approved by a command

## Approach

A new command `approve` joins the registry `COMMANDS` of `scripts/agentrite.mjs`. As for `units` and `runs`, a new
module holds every pure part and `scripts/agentrite.mjs` holds what touches the files and git.

**The pure parts.** A new module `scripts/agentrite-approve.mjs`, which imports `optionError` from
`scripts/agentrite-run.mjs` and `fieldFrom` from `scripts/check-changes.mjs`:

* `APPROVE_FORM` is `usage: agentrite approve <unit>` (R13)
* `parseApproveArgs(args)` gives `{ unit }`. It reads the arguments by `parseArgs` of `node:util`, not strict, with
  tokens, and options `{}`, as `parseOrchestrateArgs` does. It refuses, by the first token at fault: an option by
  `optionError(APPROVE_OPTIONS, {}, token)`, which gives `unknown option: <rawName>`; a `--` with `unexpected argument:
  --`; a second word with `unexpected argument: <word>`; and then no word at all with `no unit given`. It throws the
  line, a line feed and `APPROVE_FORM`, which the entry point prints and exits 2 with (R2, R11)
* `PREFIXES` maps the kinds to the prefixes of the commits: `feature` to `feature`, `bug` to `bugfix`, `task` to
  `task`, as `process.md` gives them
* `recordFields(record, recordFile)` gives `{ status, kind }` of a record, read by `fieldFrom`, so a missing field
  is refused as `units` refuses it: `<recordFile> is missing a status field`, then the same for `kind`. It then throws
  `<recordFile> is missing a ## Log heading` when no line of the record is `## Log`, trailing white space and a
  carriage return aside, and `<recordFile> gives the kind <kind>, and a unit is a feature, a bug or a task` for a kind
  that `PREFIXES` does not hold (R10)
* `approvedDocument(kind)` gives `record` for `task`, and `spec` for the two others
* `approvalEntry(kind, instant)` gives `` - <instant> [human] approved the <document>. The status is `approved` ``
  (R4)
* `approvalMessage(kind, directory)` gives `<prefix>-<the first four characters of directory> Approve the
  <document>` (R6)
* `approvedRecord(record, kind, instant)` gives the record approved, and changes it in two places only (R3, R4, R5):
    * the value of the first line that is `status:`, the line `fieldFrom` reads, becomes `approved`; what stands before
      and after the value on that line is kept
    * the entry is added on a line of its own directly after the last line of `## Log` that is not blank, before the
      blank line that follows it, where the section runs from the line `## Log` to the next line that opens with `## `
      or to the end of the text. The last line that is not blank is the last line of the last entry, whether that entry
      has one line or several. A `## Log` that holds no entry gets the entry after one blank line under the heading,
      as the template of the record has it
    * a record whose lines end in `\r\n` gets the entry ended by `\r\n`; one ended by `\n`, by `\n`
* `uncommittedFiles(statusOutput, prefix)` reads what `git status --porcelain=v1 -z --untracked-files=all
  --no-renames` printed into `{ path, state }`, the path from the project root, by taking `prefix`, what `git
  rev-parse --show-prefix` printed, off its start, and the state `not tracked` for `??`, `staged` for a first column
  that is not a space, `changed` for a second that is not, and `staged and changed` for both (R10)
* `uncommittedRefusal(directory, files)` gives `changes/<directory>/ holds files that differ from the commit checked
  out:`, a line `- <path>: <state>` for each, and the line `The human approves what is committed, so commit these
  files, or discard their changes, and run the command again` (R10)
* `approvedLine(directory, hash, message)` gives `changes/<directory>/ is approved, in <hash> <message>` (R9)

**The command.** In `scripts/agentrite.mjs`, `approve(root, { unit })` does, in this order, and refuses by throwing,
which the entry point prints after `agentrite: ` and exits 1 with:

1. `readSettings(root)`, which refuses a missing or invalid `agentrite.json` as every command does (R10)
2. `repositoryPrefix(root)`, a new function that runs `git rev-parse --show-prefix` in the root by `spawnSync`, as
   `checkedOutBranch` runs git. It gives the prefix with the line feed taken off, and `null` when standard error says
   the directory is not a git repository; a git that cannot be run or fails otherwise throws `git could not be run:
   <message>`, as `checkedOutBranch` does. `null` is refused with `<root> is in no git repository, and an approval is
   a commit on the default branch <defaultBranch>`. Then `checkedOutBranch(root)`: `null` is refused with `no branch
   is checked out, and an approval is committed on the default branch <defaultBranch>`, and a branch other than
   `defaultBranch` with `the branch checked out is <branch>, and an approval is committed on the default branch
   <defaultBranch>` (R10)
3. `resolveUnit(unit, changeDirectories(root))`, which refuses as `orchestrate` refuses (R1, R10)
4. The text of `changes/<directory>/record.md`, refused with `changes/<directory>/record.md does not exist` when it is
   no regular file, as `readUnit` refuses it, then `recordFields` (R10)
5. A status other than `draft` is refused with `the unit changes/<directory>/ is <status>, and an approval moves a
   unit from draft` (R10)
6. For a kind other than `task`, a `changes/<directory>/spec.md` that is no regular file is refused with
   `changes/<directory>/spec.md does not exist, and the approval of a feature or a bug is that of its spec` (R10)
7. `git status --porcelain=v1 -z --untracked-files=all --no-renames -- changes/<directory>/` in the root, read by
   `uncommittedFiles` with the prefix of step 2. Any file is refused with `uncommittedRefusal` (R10)
8. The record is written with `approvedRecord(text, kind, instantOf(Date.now()))` by `writeFileSync` (R3, R4)
9. `git commit --quiet --message <approvalMessage> -- changes/<directory>/record.md` in the root by `spawnSync`, its
   output captured. The path after `--` makes git commit that file alone, from the working tree, and keep what the
   index holds of every other file as it was, and the commit runs the hooks and takes the identity as any commit of
   the developer does (R6, R7). When git cannot be run or exits other than 0, the original text of the record is
   written back by `writeFileSync`, what git printed on standard output and standard error is written to standard
   error, and the command throws `the commit failed, and changes/<directory>/record.md is as it was`. A refused
   commit leaves the index as it was, which the test of R16 shows (R8)
10. `git rev-parse --short HEAD`, and `approvedLine` printed with `console.log`. It returns 0, and pushes nothing
    and makes no branch (R9)

Nothing is written before step 8, so every refusal of steps 1 to 7 writes nothing and commits nothing (R10).

`COMMANDS` gets `approve: { form: APPROVE_FORM, parse: parseApproveArgs, run: approve }` after `units`, so the usage
of `agentrite` names it there (R13). `package.json` lists `scripts/agentrite-approve.mjs` in `files`, after
`scripts/agentrite-units.mjs`, since `scripts/agentrite.mjs` imports it.

**The documents.** `README.md` gets `### agentrite approve` after `### agentrite units` (R12). The root `process.md`
gets a paragraph in "Changes", after the one on `npx agentrite units` (R14). `README.md`'s "What is here" names the
scripts as a whole and `CONTRIBUTING.md`'s table names no file the unit adds, so neither changes. `SANDBOX.md` does not
change, since the command is nothing a developer does with the sandbox.

## Files

- `scripts/agentrite-approve.mjs`: new, the pure parts
- `scripts/agentrite.mjs`: `repositoryPrefix`, `approve`, the import of the new module, and the entry of `COMMANDS`
- `package.json`: `scripts/agentrite-approve.mjs` in `files`
- `tests/agentrite-approve.test.mjs`: new, the unit tests of the module and the tests of the command in a git
  repository
- `tests/package-documents.test.mjs`: `scripts/agentrite-approve.mjs` in the list of `files`
- `README.md`: `### agentrite approve`
- `process.md`: the paragraph on the command in "Changes"
- `changes/0082-a-unit-can-be-approved-by-a-command/record.md`: the log of the work

## Tasks

- [ ] Add to the new `tests/agentrite-approve.test.mjs` the unit tests of `parseApproveArgs`: `['0082']` and
  `['changes/0082-x/']` give `{ unit }` as given; `[]` throws `no unit given`, `['0082', '0083']` `unexpected
  argument: 0083`, `['0082', '--json']` and `['--json', '0082']` `unknown option: --json`, `['-x', '0082']` `unknown
  option: -x`, `['--', '0082']` and `['0082', '--']` `unexpected argument: --`, each followed by a line feed and
  `APPROVE_FORM` (R2, R11, R15)
- [ ] Add to it the unit tests of the rest of the module: `recordFields` gives the status and the kind, and throws,
  naming the file, for a record without `status`, without `kind`, without `## Log`, and with the kind `epic`;
  `approvalEntry` and `approvalMessage` for `feature`, `bug` and `task`, giving `spec`, `spec` and `record` and the
  prefixes `feature`, `bugfix` and `task`; `approvedRecord` changes the status line alone of the front matter, keeping
  `supersedes` and `timestamp`, and puts the entry directly after the last entry in a record whose `## Log` is its last
  section, and in one where `## Amendments` follows it, each after a last entry of one line and after one of three
  lines, with the rest of the text as it was; puts it under a `## Log` with no entry after one blank line; and ends it
  with `\r\n` in a record whose lines end so; `uncommittedFiles` with a prefix and without, for each state;
  `uncommittedRefusal`; and `approvedLine` (R3, R4, R5, R6, R9, R10, R15)
- [ ] Write `scripts/agentrite-approve.mjs` as the approach gives it, until the tests of the two tasks above pass
  (R2, R3, R4, R5, R6, R9, R10, R11)
- [ ] Add to `tests/agentrite-approve.test.mjs` a fixture of the command: a base with a `home` holding a `.gitconfig`
  of a name and an email, and a `project` made by `git init --quiet --initial-branch master`, with `installKit`, an
  `agentrite.json` of `kitSettingsText` with `defaultBranch` `master`, a `.gitignore` of `node_modules`, a draft
  feature `0010-a-feature` with `spec.md` and `record.md`, and a draft task `0011-a-task` with `record.md`, all
  committed; git and the command run with `HOME` the base's `home`, `GIT_CONFIG_NOSYSTEM` `1` and the `PATH`. Helpers
  give the status of `git status --porcelain`, the text of `git diff --cached`, `HEAD`, and a record (R16)
- [ ] Add the tests of an approval: of the feature by `0010`, and of the task by `changes/0011-a-task/`, each exiting
  0, printing the one line of `approvedLine` with the short hash of the new `HEAD`, with a `HEAD` whose parent is the
  `HEAD` before, whose message is `feature-0010 Approve the spec` and `task-0011 Approve the record`, whose author is
  the name of the `.gitconfig`, which changes `changes/<directory>/record.md` alone, and whose record is the one before
  with `status: approved` and the entry of its kind, its instant matched by the form of an instant; and a `commit-msg`
  hook that writes the message to a file outside the project and exits 0 has run with that message (R1, R3, R4, R5,
  R6, R7, R9, R16)
- [ ] Add the test that a file `other.txt` staged and a tracked file changed and not staged, both outside the unit,
  are not in the commit of an approval, and that `git status --porcelain` and `git diff --cached` give for them after
  the approval what they gave before it (R6, R16)
- [ ] Add the test that a `commit-msg` hook that prints `refused by the hook` on standard error and exits 1 makes the
  command exit 1 with that line on standard error, and leaves `HEAD`, the text of the record, `git status --porcelain`
  and `git diff --cached` as they were before, with a file staged outside the unit (R8, R16)
- [ ] Add the tests of each refusal of R10, each exiting 1 with its message on standard error, nothing on standard
  output, and `HEAD`, `git status --porcelain` and the record as they were: no `agentrite.json`; an `agentrite.json`
  that is not JSON; a project in no git repository, the fixture's files without `.git`; a branch `other` checked out;
  a detached `HEAD`; the digits `0099`; the digits `0010` with a second directory `0010-twin` committed; a unit with
  no `record.md`; records without `status`, without `kind` and without `## Log`; a record with the kind `epic`; the
  status `approved`; a feature and a bug with no `spec.md`; and a `spec.md` changed, a `spec.md` staged and a
  `notes.md` not tracked in the unit's directory, the message naming each by its path and state (R10, R16)
- [ ] Add the tests that `approve` with no argument, with `0010 0011`, with `0010 --json` and with `0010 --` exits 2,
  writes the line of what is wrong and the form on standard error, and changes nothing (R11, R16)
- [ ] Add `repositoryPrefix` and `approve` to `scripts/agentrite.mjs`, import the module, and add `approve` to
  `COMMANDS` after `units`, as the approach gives them, until the tests of the command pass. Add to
  `tests/agentrite-approve.test.mjs` the test that `agentrite` with no argument prints `usage: agentrite approve
  <unit>` among its forms, after that of `units` (R1 to R11, R13)
- [ ] Add `scripts/agentrite-approve.mjs` to `files` in `package.json` and to its list in
  `tests/package-documents.test.mjs`, after `scripts/agentrite-units.mjs`
- [ ] Add `### agentrite approve` to "Commands" of `README.md`, after `### agentrite units`: its form `npx agentrite
  approve <unit>`, that it runs from the project root and takes no option; what it writes in `record.md`, the status
  and the entry of each kind; what it commits, the message of each kind, that the commit holds the record alone and
  leaves the rest of the working tree and the index as they were, and that it runs the hooks with the developer's
  identity; that a failed commit puts the record back, passes git's output to standard error and exits 1; the line it
  prints, with an example; that it pushes nothing and makes no branch; each refusal of R10 with what it names; the
  wrong arguments of R11; a table of `<unit>`; and its exit statuses `0`, `1` and `2` by [Exit
  statuses](#exit-statuses) (R12)
- [ ] Add to "Changes" of `process.md`, after the paragraph on `npx agentrite units`, a paragraph that says that `npx
  agentrite approve <unit>` makes the approval of a unit: it sets its `status` to `approved`, adds the human's entry to
  `## Log`, and commits `record.md` alone on the default branch; and that an agent runs it only when the human has
  approved that unit and asked for the approval to be recorded, and never on its own judgement (R14)

## Verification

- [ ] `npm test` passes
- [ ] `npm run check-changes` passes, after the commits
- [ ] Every line of the changed files fits 120 characters, checked before each commit
- [ ] Every requirement 1 to 16 is traced by a task above, and every task traces to one or is the listing of the
  module in the package, which the import of R1 to R11 needs

## Commit Points

- [ ] `feature-0082 Add the pure parts of the approval`: the first three tasks
- [ ] `feature-0082 Approve a unit by a command`: the fourth to eleventh tasks
- [ ] `feature-0082 Document the command approve`: the tasks of `README.md` and `process.md`
