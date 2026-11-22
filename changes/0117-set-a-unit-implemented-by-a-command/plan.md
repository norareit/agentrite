# 0117 Set a unit to implemented by a rule the record shows, and by a command

## Approach

The work has three parts: the rule and the forms of the record, written into `process.md` and the role files; the
command `complete`, built as `approve` and `cancel` are, with its pure parts in modules of their own and what touches
git and the files in `scripts/agentrite.mjs`; and the documents that describe both. The tree is that of `0a84557`,
where `wc -w process.md` prints `2406`.

**What `complete` shares with the commands before it, moved first.** A first commit changes no behavior:

* `wrappedEntry(entry)` and its `LINE_WIDTH` move from `scripts/agentrite-cancel.mjs` to
  `scripts/agentrite-record.mjs`, as they are, since `complete` wraps its entry as `cancel` does (R15).
  `scripts/agentrite-cancel.mjs` and `scripts/agentrite.mjs` import it from there, and its four unit tests move from
  `tests/agentrite-cancel.test.mjs` to `tests/agentrite-record.test.mjs`
* `uncommittedRefusal(directory, files, act)` and `checkCommitted` take `completes` as a third value of `act`, so that
  the last line reads `The human completes what is committed, so commit these files, or discard their changes, and
  run the command again` (R14). The type of `act` becomes `'approves' | 'cancels' | 'completes'`
* `scripts/check-changes.mjs` exports `untickedTaskCount(plan)`, which counts the matches of its `UNTICKED_TASK`, and
  `findIncompletePlans` calls it. `complete` counts the open tasks by it, so that it counts as the change check does
  (R14). The behavior of the change check does not change, which keeps to its non-goal

The log entries are not read by the change check's private `entriesOf`: that one reads `## Log` and `## Amendments`
alike and keeps the blank lines it judges, while `complete` reads `## Log` alone. Sharing it would change the change
check's module for a reader it does not need.

**The forms of the record, a module of their own.** `scripts/agentrite-log-forms.mjs` reads the forms of R6 to R9 out
of the text of a record, and touches nothing. It exports:

* `logEntries(record)`: the entries of `## Log`, from its heading to the next line that opens with `## `, in their
  order. An entry opens at a line that starts with `- `, and takes each following line that starts with white space
  and is not blank, its indent taken as one space (R6). A blank line ends the entry. Each entry is
  `{ timestamp, author, role, variant, text }`: `timestamp` is the first word after `- `; `author` what stands in the
  first `[...]` after it, as `human` or `Claude Code, anthropic/claude-opus-5-5`; `role` the name after
  `as the `, read as `[a-z0-9]+(?:-[a-z0-9]+)*` and followed by `, ` or by a space, or `null`; `variant` the name of
  ``on the variant `<name>`, `` where the text opens with it after the role and its `, ` or after the author, read by
  `VARIANT_PATTERN` of `scripts/agentrite-orchestrate.mjs`, or `null`; `text` what follows all of them. An entry whose
  role is followed by a space and not by `, ` has `variant` `null` and its text starts after the role and the space
* `runEntries(entries, variant)`: the entries whose `variant` is `variant`, where `null` is the unit's branch (R6)
* `reviewForm(text)`: for the text of an entry of the reviewer, `{ commit, blocking }` when it is of the form of R7,
  and `null` otherwise. The text opens with ``reviewed the unit at `<commit>` ``, a space after the closing backtick,
  with `<commit>` of `[0-9a-f]{7,40}`, and holds the words `Blocking findings:` exactly once, after a full stop and a
  space, followed by ` none.` or by one or more labels, each in backticks, apart by `, `, and a full stop. A label is
  any text in backticks without white space or a backtick. `blocking` lists the labels, empty for `none`
* `proposedDecline(text)`: the label when the text opens with ``proposed to decline `<label>`: ``, and `null`
  otherwise (R8). It is read of any entry, whoever made it, so that a decline written by another than the implementer
  is not passed over
* `declineDecision(entry)`: `{ label, decision }` when the author is `human` and the text opens with
  ``decided the proposed decline of `<label>`: `` followed by `declined` or `to be fixed`, ended by the end of the
  text, a full stop or a space, and `null` otherwise (R9)

**The pure parts of the command.** `scripts/agentrite-complete.mjs` imports `optionError` from
`scripts/agentrite-run.mjs`, `commitPrefix`, `loggedRecord` and `wrappedEntry` from `scripts/agentrite-record.mjs`,
`VARIANT_PATTERN` from `scripts/agentrite-orchestrate.mjs` and the readers above. It exports:

* `COMPLETE_FORM`, `usage: agentrite complete <unit>`, and `parseCompleteArgs(args)`, which reads the arguments as
  `parseApproveArgs` does: no option, so that an option gives `unknown option: <rawName>`, a `--` gives
  `unexpected argument: --`, a second word `unexpected argument: <word>` and no word `no unit given`, each followed by
  a line feed and the form (R12)
* `runOfBranch(branch, unitBranch)`: `{ variant: null }` for the unit's branch, `{ variant }` for the unit's branch,
  `--` and a name that matches `VARIANT_PATTERN` whole, and `null` for any other branch (R13)
* `branchRefusal(branch, unitBranch)`, the line for a branch that is neither: `the branch checked out is <branch>, and
  the unit is set to implemented on its branch <unitBranch> or a variant's branch of it` (R14)
* `statusRefusal(directory, status)`, `undefined` for `in-progress`, and for each other status the line R14 gives it
* `planRefusal(directory, kind, plan)`, where `plan` is the text of `plan.md` or `undefined`: for a feature without
  one, that `changes/<directory>/plan.md` does not exist and a feature is built by its plan; for a plan with open
  tasks by `untickedTaskCount`, that the file has `<count>` task(s) not ticked; `undefined` otherwise (R14)
* `commitsNamed(batchCheckOutput)`: the object names of the lines `<name> commit` of what
  `git cat-file --batch-check` printed for the names `git rev-parse --disambiguate=<commit>` gave, so that a prefix
  that names a commit and a blob names one commit (R14)
* `filesOutside(diffOutput, prefix, directory)`: the paths, from the project root, of what
  `git diff --no-renames --name-only -z <reviewed> HEAD` printed that are not under `<prefix>changes/<directory>/`.
  `--no-renames` lists a renamed file by both of its paths, so that either side outside the unit counts (R14)
* `recordRefusal(entries, variant, runName)`, the record's part of R14 in its order: no review in the run, the last
  review not of the form of R7, then, once the commit is checked by the entry point, blocking labels still open, an
  undecided proposed decline, and a decision `to be fixed` after the last review. It is split in two calls,
  `lastReview(entries, variant, runName)`, which returns `{ commit, blocking, index }` of the last review or throws
  the first two refusals, and `decisionsRefusal(entries, variant, review)`, which gives the last three in order or
  `undefined`. A proposed decline is decided by a decision of the same run with the same label that stands after it
  in `## Log`. `runName` is `the unit's branch` or ``the variant `<name>` ``
* `completionEntry(instant, commit)`, the entry of R15 on one line, `completedRecord(record, entryLines)`, which is
  `loggedRecord(record, 'implemented', entryLines)`, `completionMessage(kind, directory)`, `<prefix>-<number> Set the
  unit to implemented`, and `completedLine(directory, branch, hash, message)`, the line of R17

**The command.** `complete(root, { unit })` in `scripts/agentrite.mjs` runs the refusals of R14 in their order: it
reads `agentrite.json` by `readSettings`; it reads the prefix by `repositoryPrefix` and the branch by
`checkedOutBranch`, refusing as `cancellationBranch` does with `and a unit is set to implemented on its branch`; it
resolves the unit by `resolveUnit`; it reads the record by `recordFields`; it refuses the branch, the status and the
plan by the pure parts; it calls `checkCommitted(..., 'completes')`; it runs the change check by `run(root)` of
`scripts/check-changes.mjs`, refusing with `the change check failed:` and its message on the lines after; it takes
the last review; it resolves the review's commit, which matches `[0-9a-f]{7,40}` and so cannot be read as an option,
by `git rev-parse --disambiguate=<commit>` and `git cat-file --batch-check`, refusing for none with `the last review,
at <timestamp>, names <commit>, which is no commit of the repository`, and for more than one with `which names more
than one commit`; it refuses the files outside the unit by `filesOutside`, naming them and saying that the work
changed after the last review, so that it is reviewed again; and it refuses by `decisionsRefusal`. It then writes the
record and commits it by `commitRecordAlone`, and prints the line. It reads nothing under `.reviews/` or
`.orchestrator/` and nothing from its standard input (R18, R19). Each git it runs is given its arguments as a list,
with no shell, and none reads standard input but `cat-file`, which is given the names by `input`.

**The texts.** The rule of R1 replaces the sentence of `process.md` that opens with ``Set `implemented` only after``,
as a list of the four conditions, with the sentence that a finding the implementer accepted and fixed needs no
decision of the human and that the rule holds alike for a unit built by hand and by the orchestrator. The paragraphs
of `approve` and `cancel` become one paragraph for the three commands, as the decision on the length of `process.md`
says, keeping for each the branch it commits on, the reason and `--by` of a cancellation, that a cancellation is
recorded on the branch the human chose and that its reason is written in the agent's own words, and adding
`complete` (R2). The sentence on the variant's phrase of an agent's entry adds the human's decision on a proposed
decline (R9).

**The review of this unit.** The wrappers of this repository's roles read the role files of the installed release,
under `node_modules/agentrite/`, so the reviewer of this unit writes its entry by the role file before this unit and
not in the form of R7. `complete` refuses such a last review, as the decision on records written before the forms
says, until a review in the form is recorded.

## Files

- `scripts/agentrite-record.mjs`: `wrappedEntry` and `LINE_WIDTH` moved in; `completes` as an `act`
- `scripts/agentrite-cancel.mjs`: `wrappedEntry` imported rather than defined
- `scripts/check-changes.mjs`: `untickedTaskCount` exported and used by `findIncompletePlans`
- `scripts/agentrite-log-forms.mjs`: new, the reading of the forms of R6 to R9
- `scripts/agentrite-complete.mjs`: new, the pure parts of `complete`
- `scripts/agentrite.mjs`: `complete` and its row in `COMMANDS` after `cancel`; imports
- `package.json`: the two new modules in `files`, after `scripts/agentrite-cancel.mjs`
- `tests/agentrite-record.test.mjs`, `tests/agentrite-cancel.test.mjs`: the tests of `wrappedEntry` moved
- `tests/check-changes.test.mjs`: a test of `untickedTaskCount`
- `tests/agentrite-log-forms.test.mjs`: new, the unit tests of the forms
- `tests/agentrite-complete.test.mjs`: new, the unit tests of the pure parts and the tests of the command
- `tests/agentrite-init.test.mjs`: the usage with the line of `complete`
- `tests/package-documents.test.mjs`: the two new modules in the list of the package's files
- `process.md`: the rule, the paragraph of the three commands, the human's decision on a variant's branch
- `roles/reviewer.md`: what blocks, who applies and decides, the re-review, the labels, the form of the entry
- `roles/implementer.md`: applying findings, the forms of a proposed decline and of the human's decision
- `ORCHESTRATOR.md`: setting `implemented` after a run, and how a decision on a decline is recorded
- `README.md`: the table of the statuses, the quick start, the description of the diagram, the writer's workflow
- `diagrams/workflow.mmd`, `diagrams/workflow.svg`: the step that runs `complete` before the merge
- `SETUP.md`: the project's own reviewer and implementer files, and `agentrite complete` among the readers of
  `agentrite.json`
- `SANDBOX.md`: "Getting the work back", and taking a variant
- `COMMANDS.md`: the row and the section of `agentrite complete`
- `changes/0117-set-a-unit-implemented-by-a-command/record.md`: the entries of the work, the counts of R3

`extra-roles/spec-reviewer.md` says that whether a finding of a spec review is accepted is the human's decision. It
concerns the review of a draft spec, before `implemented` is in question, and is this repository's and not the kit's,
so R11 leaves it as it is.

## Tasks

### What is shared, moved

- [x] Move `wrappedEntry` and `LINE_WIDTH` to `scripts/agentrite-record.mjs`, import it in
  `scripts/agentrite-cancel.mjs` and `scripts/agentrite.mjs` from there, and move its four tests to
  `tests/agentrite-record.test.mjs` (R15)
- [x] Give `uncommittedRefusal` and `checkCommitted` the `act` `completes`, and add a case to
  `tests/agentrite-record.test.mjs` that its last line reads `The human completes what is committed, ...` (R14)
- [x] Write a test in `tests/check-changes.test.mjs` that `untickedTaskCount` gives 0 for a plan of ticked tasks and
  of prose, and 2 for two open tasks of which one is indented; then export `untickedTaskCount` from
  `scripts/check-changes.mjs` and have `findIncompletePlans` call it (R14)
- [x] Run `npm test`, which passes with the moved tests

### The forms of the record

- [x] In a new `tests/agentrite-log-forms.test.mjs`, write unit tests of `logEntries`: an entry on one line and one
  wrapped over three lines, read as their lines joined with one space; entries of `## Amendments` and of a section
  after `## Log` left out; the author, the role and the variant of an agent's entry on the unit's branch, of one on a
  variant's branch, of `[human]` on a variant's branch, of an agent with no role, and of an entry whose role is
  followed by a space; and a variant phrase wrapped at its space (R6, R21)
- [x] Write unit tests of `runEntries` keeping the entries of one variant, and those of the unit's branch for `null`
  (R6, R21)
- [x] Write unit tests of `reviewForm`: the entry of R7 with `Blocking findings: none.`, with one label, and with
  `` `S1`, `C2` ``, on one line and wrapped, on the unit's branch and on a variant's; refused: the reviewer's entry of
  the habit before this unit, as "reviewed `0116-...` at `dc65325` in full. Returned non-blocking P1", a hash of 6 and
  of 41 characters, one in upper case, no space after the hash's backtick, no `Blocking findings:`, two of them, a
  label not in backticks, labels apart by a comma alone, and no final full stop (R7, R21)
- [x] Write unit tests of `proposedDecline` and `declineDecision`: each form on one line and wrapped, on the unit's
  branch and on a variant's; refused: a decision by an agent, a decision with another word than `declined` or
  `to be fixed`, `to be fixedly`, and a decline without the colon (R8, R9, R21)
- [x] Create `scripts/agentrite-log-forms.mjs` with `logEntries`, `runEntries`, `reviewForm`, `proposedDecline` and
  `declineDecision` as the approach gives them, and run its tests, which pass

### The pure parts of the command

- [x] In a new `tests/agentrite-complete.test.mjs`, write unit tests of `parseCompleteArgs`: a unit given by its
  digits and by `changes/<name>/`; refused with the line and `COMPLETE_FORM`: no argument, two units, `--json`,
  `--`, `-x` (R12)
- [x] Write unit tests of `runOfBranch`: the unit's branch, a variant's, a variant whose name `VARIANT_PATTERN`
  refuses, as `--Opus` and `--a--b` read whole after the unit's branch and `--`, another unit's branch, and the
  default branch; and of `branchRefusal` naming both branches (R13, R14)
- [x] Write unit tests of `statusRefusal` for `in-progress` and for each of `implemented`, `cancelled`, `draft`,
  `approved` and another status, each line holding what R14 says of it; and of `planRefusal` for a feature without a
  plan, a plan with one and with three open tasks, a bug and a task without one, and a complete plan (R14)
- [x] Write unit tests of `commitsNamed` for no line, one commit, a commit and a blob, and two commits; and of
  `filesOutside` for a change inside the unit only, one outside, both paths of a rename out of the unit, a project in a
  directory of a larger repository, and a file of another unit's directory (R14)
- [x] Write unit tests of `lastReview` and `decisionsRefusal`: no review in the run, while the other run has one;
  the last review of the habit before this unit after one in the form; the last review's blocking labels; a proposed
  decline undecided, decided before it was proposed, decided by the other variant, and decided after it by the same
  run; a decision `to be fixed` before the last review, which passes, and after it, which is refused; a decision
  `declined` after the last review, which passes; and the order of the refusals when several hold (R1, R6 to R9, R14)
- [x] Write unit tests of `completionEntry`, of `completedRecord` changing the `status` line alone of the front matter
  and adding the entry after the last of `## Log`, of `completionMessage` for each kind, and of `completedLine`, with
  the texts of R15, R16 and R17
- [x] Create `scripts/agentrite-complete.mjs` with what the approach gives, and run its tests, which pass

### The command

- [x] In `tests/agentrite-complete.test.mjs`, write a fixture as that of `tests/agentrite-cancel.test.mjs`: a project
  made by `git init` on `master` with the kit, a feature in progress with a ticked `plan.md`, cut on its branch, with
  a file outside the unit, the work committed and a review in the form of R7 of that commit committed after it; and
  helpers to append an entry and commit it, and to run the command with the fixture's environment
- [x] Write command tests of success on the unit's branch and on a variant's branch: exit 0, the line of R17 alone on
  standard output, nothing on standard error, the record with `status: implemented` and the entry of R15 naming the
  review's commit as written, wrapped within 120 characters for a commit of 40 characters, and one new commit
  holding `record.md` alone with the message of R16 (R15 to R17, R21)
- [x] Write command tests that pass: a commit after the last review that changes only `record.md`; a reviewed commit
  made by `git commit-tree` of the tree of the commit checked out on another parent, which is not its ancestor; a
  bug without a `plan.md` (R14, R21)
- [x] Write a command test that the refs, by `git for-each-ref`, and the branch checked out are as before but for the
  branch checked out moving by the one commit, and that a file staged and a file changed outside the unit are left as
  they were and out of the commit (R16, R17)
- [x] Write a command test that a `commit-msg` hook that exits 1 makes the command exit 1 with what the hook printed
  on standard error, and leaves `record.md`, the index and `HEAD` as they were (R16, R21)
- [x] Write command tests for each refusal of R14, each asserting exit 1, nothing on standard output, the message on
  standard error, and `HEAD`, the status of git and `record.md` as before: no `agentrite.json`; an invalid one; no git
  repository; a detached `HEAD`; no directory for the unit; two for its digits; no `record.md`; one without `status`,
  without `kind`, without `## Log`, with the kind `epic`; the default branch checked out; another unit's branch; each
  status other than `in-progress`; a feature without `plan.md`; a plan with an open task; a changed, a staged and an
  untracked file in the unit's directory; a change check that fails, as by a frozen unit's `spec.md` changed on the
  branch; no review in the run, with one in another variant's run; a last review of the habit before this unit; a
  hash that names no commit; a hash that names two commits; a file outside the unit changed after the review; a
  merge after the review that brings in a file outside the unit; a blocking finding still open; an undecided
  proposed decline; a proposed decline of the variant decided only on the unit's branch; a decision `to be fixed`
  after the last review (R14, R21)
- [x] For the hash that names two commits, make two commits with one prefix of 7 characters by computing, with
  `node:crypto`, the SHA-1 of `commit <length>\0<content>` for a fixed tree, parent, author, committer and dates and
  the messages `0`, `1`, ... until two share their first 7 characters, and writing both with
  `git hash-object -t commit -w --stdin`. The search is deterministic and takes the order of 2^14 hashes
- [x] Write command tests of R12 that each wrong argument exits 2 with the line, then `COMPLETE_FORM`, on standard
  error, and changes nothing; and that `agentrite` with no argument lists `complete` after `cancel` (R12)
- [x] Write command tests that a run with its standard input closed, by `stdio: ['ignore', 'pipe', 'pipe']`, and a
  run with no controlling terminal, started with `detached: true` so that it is in a session of its own, each set the
  unit to implemented as R15 to R17 say (R19, R21)
- [x] Write `complete` in `scripts/agentrite.mjs` as the approach gives it, add `complete: { form: COMPLETE_FORM,
  parse: parseCompleteArgs, run: complete }` to `COMMANDS` after `cancel`, add the line
  `       agentrite complete <unit>` after that of `cancel` to the usage in `tests/agentrite-init.test.mjs`, add
  `scripts/agentrite-log-forms.mjs` and `scripts/agentrite-complete.mjs` to `files` of `package.json` and to the list
  of `tests/package-documents.test.mjs`, and run `npm test`, which passes (R12 to R19)

### The rule and the role files

- [x] Log in `record.md` that `wc -w process.md` prints `2406` at `0a84557`, the commit the branch was cut from (R3)
- [x] In `process.md`, replace the paragraphs of `npx agentrite approve <unit>` and `npx agentrite cancel <unit>` with
  one paragraph for the three commands, adding that `npx agentrite complete <unit>` sets `implemented` on the unit's
  branch, or a variant's, when the rule holds, and that an agent runs it only when the human has asked for that unit
  to be set to `implemented`, never on its own judgement; and check, sentence by sentence, that every statement of
  the two paragraphs is still there with its strength (R2, R3)
- [x] In `process.md`, replace the sentence ``Set `implemented` only after the human has decided every blocking
  finding the review returned and every task in `plan.md` is ticked.`` with the rule of R1: the four conditions as a
  list, the last review being the last entry of the reviewer of the branch's run, read by the variant the entries
  name; that a finding the implementer accepted and fixed needs no decision of the human, since the review after the
  fix verifies it; and that the rule holds alike for a unit built by hand and by the orchestrator. Keep the sentence
  on the two cases of what blocks, and the two cases, as they are (R1)
- [x] In `process.md`, where an entry of an agent made on a variant's branch names the variant, say the same of the
  human's decision on a proposed decline, which names no role (R9)
- [x] In `roles/reviewer.md`, under "What blocks", say that a blocking finding still open after the last review holds
  back `implemented`, in place of the human deciding every blocking finding; under "Reporting", replace `The human
  decides which are accepted and the implementer applies them` and `change nothing until the human has decided` with
  that the implementer applies the findings it agrees with and proposes declining the others, that the human decides
  a proposed decline, and that the reviewer fixes nothing it reported; and say that a label is never used twice in a
  run, a review continuing the numbering of each axis from the reviews of its run before it and a finding reported
  again keeping its label (R4)
- [x] In "Re-reviewing a unit" of `roles/reviewer.md`, replace the bullet that verifies the accepted findings with
  one that says that every review of a run after its first, a delta or a full one, verifies every finding of the
  review before it in its run: one the human decided `declined`, in the form of `roles/implementer.md`, is settled
  and not reported again, and every other is seen corrected or reported again by its label, with whether it blocks
  (R4)
- [x] In "Record that you reviewed" of `roles/reviewer.md`, give the form of R7 with an example of a delta review on
  the unit's branch, of the form ``- <instant> [OpenCode, openai/gpt-6.2-sol] as the reviewer, reviewed the unit at
  `1a2b3c4` as a delta review from `9f8e7d6`. Returned `S3` and `C1`. Blocking findings: `S3`. The findings are in
  `.reviews/0042-a-unit/review-<instant>.md`. Did not verify ...``, wrapped, and say what a variant's branch adds; and
  replace `Whether a finding is accepted is the human's decision and the implementer's to record` with that what
  becomes of a finding is the implementer's to record and, for a proposed decline, the human's to decide (R7, R11)
- [x] In "Review findings" of `roles/implementer.md`, say that the implementer applies a finding it agrees with, by
  hand as in a step of the orchestrator, unless the human decided otherwise; give the form of R8 with an example,
  written beside the `declines` of a step's outcome, one entry for each finding; keep that only the human turns a
  proposed decline into a decision; give the form of R9 with an example on a variant's branch, and that it is
  written as `[human]` whoever writes it, an agent writing it only for a decision the human gave, as by a resume's
  `--prompt` or a message; and say that once a decision is recorded the implementer acts on it, proposing no decline
  again of a finding decided `declined`, in `record.md` or in `declines`, and applying one decided `to be fixed` (R5,
  R8, R9)
- [x] Search `process.md`, `roles/`, `orchestrator.json`, `scripts/agentrite-outcome.mjs`, `templates/`,
  `README.md`, `ORCHESTRATOR.md`, `SETUP.md`, `SANDBOX.md` and `COMMANDS.md` for `every blocking finding`, `decides
  which`, `accepted`, `waits on` and `decided`, and change each statement that says that the human decides every
  blocking finding before `implemented` or decides which findings are accepted (R11)

### The documents

- [x] In `ORCHESTRATOR.md`, replace `The human sets `implemented` after the run, once the findings of its last review
  are decided.` with that the human sets it after the run with `npx agentrite complete`, when the rule of
  `process.md` holds; and where a resume follows the human deciding the proposed declines, say that the decision is
  recorded in the form `roles/implementer.md` gives, by the human or by the step a resume reruns with the decision in
  its `--prompt` (R10)
- [x] In `README.md`, make the row of `implemented` in the table of the statuses read, as "Set by", `The human, with
  npx agentrite complete, or the implementer`, and as "When" the rule of R1 in short; add a step to the quick start
  after leaving the sandbox that checks out the unit's branch and runs `npx agentrite complete 0001`, before the step
  that merges, which then checks out the default branch first; and in step 9 of the writer's workflow, replace
  marking the change `implemented` with running `npx agentrite complete` on its branch (R11)
- [x] In `diagrams/workflow.mmd`, add a human step `complete(["<b>Complete</b> the unit<br/>npx agentrite
  complete"])` between `leave` and `merge`, with `leave --> complete --> merge`, in the class `human`; run
  `npm run diagrams` to generate `diagrams/workflow.svg`; and make the description of the diagram in `README.md` say
  that you set the unit implemented with `npx agentrite complete` before you merge it. When `npm run diagrams` cannot
  run where the work is done, as in the sandbox without the host's Chrome, log it in `record.md` and leave the SVG to
  be generated on the host before the merge (R11)
- [x] In `SETUP.md`, where a role file covers a review whose blocking findings `implemented` waits on, say that it is
  a review whose blocking findings still open hold back `implemented`; say of a project's own reviewer and implementer
  files that they write the entries of the forms of R7 and R8, that every review after the first in a run accounts for
  every finding still open of the review before it, and that a label is never used for two findings within a run; and
  add `by agentrite complete` after `by agentrite cancel` among the commands that read `agentrite.json` (R11)
- [x] In "Getting the work back" of `SANDBOX.md`, say that the wrapper moves the unit's branch, or the variant's,
  while the developer stays on the branch checked out, usually the default branch, and that the unit is set to
  `implemented` by checking out the unit's branch, or the variant's, and running `npx agentrite complete`; in "Two
  implementations of one unit", say that a variant's run is set to `implemented` on the variant's branch before it is
  taken, since on the unit's branch the command reads the reviews of the unit's branch only, and that a completed
  variant is taken by moving the unit's branch to it or by a merge that fast-forwards the unit's branch to it, in
  place of taking one by any `git merge` (R11)
- [x] In `COMMANDS.md`, add the row `npx agentrite complete <unit>` with `Sets a unit to implemented when its record
  shows the rule, and commits its record.md` after that of `cancel`, and a section `agentrite complete` after that of
  `agentrite cancel`, in the shape of that section: where it runs, the rule it reads and the forms of R7 to R9 with an
  example of each, the entry of R15, the commit of R16, the line of R17, each refusal of R14 in its order, the
  argument, and its exit statuses `0`, `1` and `2` by "Exit statuses" (R20)
- [x] Log in `record.md` what `wc -w process.md` prints on the final tree and, when it grew, what the added words are
  for (R3)
- [x] Check every changed file for lines over 120 characters, a Markdown table row aside, and for em dashes, and run
  `npm test` and `npm run check-changes` on the committed tree, which pass, and log the result in `record.md`

## Verification

- [ ] `npm test` passes on the final tree
- [ ] `npm run check-changes` passes on the committed branch
- [ ] `node scripts/agentrite.mjs` with no argument prints the line of `complete` after that of `cancel`
- [ ] `grep -rn "every blocking finding\|decides which" process.md roles README.md ORCHESTRATOR.md SETUP.md SANDBOX.md
  COMMANDS.md` prints nothing
- [ ] No line of a changed file is over 120 characters, a Markdown table row aside

## Commit Points

- [ ] `feature-0117 Share the entry wrapping and the open task count`: the tasks of "What is shared, moved"
- [ ] `feature-0117 Read the forms of the record`: the tasks of "The forms of the record"
- [ ] `feature-0117 Add the pure parts of complete`: the tasks of "The pure parts of the command"
- [ ] `feature-0117 Set a unit to implemented by a command`: the tasks of "The command"
- [ ] `feature-0117 State the rule for implemented and the forms of the record`: the tasks of "The rule and the role
  files"
- [ ] `feature-0117 Document the command complete`: the tasks of "The documents"
