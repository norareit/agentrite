# 0120 A clean rebase needs no new review

## Approach

The tree is that of `d77a689`, on the branch cut from `0b09add`, where `wc -w process.md` prints `2562`. The work
replaces one step of `complete`: where it now resolves the commit the last review names and compares two trees, it
finds the commit that added the review's entry and reads what that commit and the commits after it touch. The pure
parts go into `scripts/agentrite-complete.mjs` and `scripts/agentrite-log-forms.mjs`, and what runs git stays in
`scripts/agentrite.mjs`, as for the rest of the command.

**The opening of the entry (R2, R3).** The opening is the literal text
`` - <timestamp> [<author>] as the reviewer ``, built from the entry's `timestamp` and `author` as `logEntries` reads
them. `logEntries` gains a `firstLine` field on each entry: the line of the record the entry opens at, as it stands,
before its continuation lines are joined. `lastReview` refuses, with the message of a last review not in the form, a
last review whose `firstLine` does not start with its opening, so that the opening is in `record.md` at the commit
checked out on one line, as R3 requires. That refusal stands where the form refusal stands now, and is the one change
R10 allows outside R4 to R6. `reviewForm` does not change.

**Finding the commit that added the entry (R2, R3, R9).** Three git calls, all of them plumbing, which no
`diff.*` setting, external diff or textconv driver reaches:

1. `git rev-list --topo-order --full-history HEAD -- :(top,literal)<prefix>changes/<directory>/record.md` lists, newest
   first, every commit reachable from `HEAD` whose `record.md` differs from at least one of its parents, merges among
   them, and it walks every parent of a merge, so that a review commit on a merge's other side is listed. A commit
   whose count exceeds that of each parent differs from each, and so is always among them. A trial on a merge whose
   file equals that of its second parent listed the merge and the commit of the second parent's side
2. `git rev-list --no-walk=unsorted --parents --stdin`, given those commits, gives each one's real parents. The parents
   the first call would print with `--parents` are rewritten to the path's history, and are not the ones R2 compares
   with. A commit at the boundary of a shallow clone is listed with no parent
3. `git cat-file --batch-check=%(objectname)` given `<commit>:<prefix>changes/<directory>/record.md` for each listed
   commit and each parent, and then `git cat-file --batch` for each distinct blob, gives the text of `record.md` at
   each of them. A commit where the file does not exist is `missing`, and counts zero. `cat-file` applies no textconv
   or filter without `--textconv` or `--filters`

`openingCount(text, opening)` counts the line starts followed by the opening, a line start being the start of the text
or the position after a line feed. `addingCommit(listed, counts)` returns the first commit of `listed`, in its order,
whose count is greater than that of each of its parents, a commit with no parent compared with zero. R3 shows that one
is always found. The function throws when none is, with a message that says the history holds no commit that adds the
entry, and a comment says that the refusal before it rules this out, so that it is no refusal of the command.

**What the commits touch (R4 to R7, R9).** `git rev-list --parents <added>..HEAD` gives the commits after the one that
added the entry, newest first, with their real parents. What a commit touches is read with
`git diff-tree -r -z --name-only --no-renames --no-relative --ignore-submodules=none --no-ext-diff --no-textconv --root
<commit>`, one call for each commit that is no merge. `--no-renames` lists a rename by both paths, and
`--ignore-submodules=none` lists a gitlink, whatever the configuration says. `--root` lists, for a commit with no
parent, every file it holds, which the shallow-clone limitation of the spec states. The paths come from the top of the
repository, and `filesOutside` keeps those outside `<prefix>changes/<directory>/`, as it does now. An empty commit lists
nothing.

The checks run in this order, each throwing its message:

* R4, merge: the commit that added the entry has more than one parent. The message is that of R5, naming that commit
* R4, other work: that commit touches files outside the unit's directory. `reviewCommitRefusal` names the files, says
  that the commit of the last review, by its short hash, also holds other work, and that the reviewer reviews it
  again from the parent of that commit by its short hash. When the commit has no parent in the history held, the
  message says so in place of naming a parent, and says that fetching the full history, or another review, lets the
  command go on
* R5: a commit after it has more than one parent. `mergeRefusal` names the newest such commit, the first that
  `rev-list` lists, by its short hash, and says that rebasing the branch on the default branch, or another review,
  lets the command go on. Naming the newest is the reading of R5's singular "the merge commit" that needs no list,
  and is logged in `record.md`
* R6: commits after it touch files outside the unit's directory. `changedAfterRefusal` names each file once, in the
  order the commits list them, newest commit first, and the commit that added the entry by its short hash, and says
  that the work changed after the last review, so that the reviewer reviews it again

Short hashes come from `git rev-parse --short <commit>`, as the success line has its hash now. Each message names the
last review by its timestamp, as the messages it replaces do.

**What goes (R8, R16).** `reviewedCommit`, `commitsNamed` and `checkWorkReviewed` are removed, with their refusals
and the `commitsNamed` unit test, `twoCommitsWithOnePrefix`, the import of `createHash`, and the command tests of a
hash that names no commit, one that names two, and a named commit that is no ancestor with the same tree. The entry
`complete` writes still names `review.commit` as the review's entry has it.

**Placement (R10).** In `complete`, the new step stands between `lastReview` and `decisionsRefusal`, where
`checkWorkReviewed(...)` stands now.

**The tests.** Unit tests cover the pure functions with plain values. Command tests use the existing `fixture`, in
which the review commit made by `logEntry` touches only the record. A rebase is made by adding a commit on `master`
after the branch was cut and running `git rebase master` on the unit's branch. A fresh clone is made with
`git clone` of the fixture's repository after the rebase, with the commit the entry names absent from it because the
rebase left it reachable from no ref and `git clone` of a local path with `--no-local` copies only what refs reach. A
commit with no parent is made as the first commit of a repository, holding the unit in progress with its review and
the work, with `master` and the unit's branch both at it. A shallow clone would serve too, but its boundary commit has
no common ancestor with `master`, so that the change check refuses before the command reads the review. A project in
a subdirectory is made by a `fixture` option that puts the repository one directory above the project, as `app/`.

## Files

- `scripts/agentrite-log-forms.mjs`: `firstLine` on each entry of `logEntries`
- `scripts/agentrite-complete.mjs`: `reviewOpening`, `openingCount`, `addingCommit`, `reviewCommitRefusal`,
  `mergeRefusal`, `changedAfterRefusal`; the first-line check in `lastReview`; `commitsNamed` removed
- `scripts/agentrite.mjs`: the git calls of the new step in place of `reviewedCommit` and `checkWorkReviewed`
- `tests/agentrite-log-forms.test.mjs`: `firstLine` in the expected entries
- `tests/agentrite-complete.test.mjs`: unit tests of the new functions, command tests of R15, removed and adapted tests
  of R16
- `process.md`: the first condition for `implemented` (R1)
- `COMMANDS.md`: the refusals of `complete`, what it reads, and the form of the reviewer's entry (R12)
- `changes/0120-a-clean-rebase-needs-no-new-review/record.md`: the word counts of `process.md`, and the readings

## Tasks

- [x] Log in `record.md` that `wc -w process.md` prints `2562` at `0b09add`, the commit the branch was cut from (R14)
- [x] Add a `logEntries` test that a wrapped entry's `firstLine` is its first line as it stands, and update the two
  `deepEqual` expectations of `tests/agentrite-log-forms.test.mjs` with `firstLine`; then add `firstLine` to the
  `LogEntry` type and to `entryOf`'s result in `scripts/agentrite-log-forms.mjs`, keeping the joined text for every
  other field (R3)
- [x] Add unit tests of `openingCount`: zero for a text without the opening, one for the opening at the start of the
  text and one after a line feed, none for the opening after an indent or inside a line, two for two such lines, and the
  timestamp and author read literally, so that `.` or `[` in them matches only itself; then write it (R2)
- [x] Add unit tests of `reviewOpening(entry)`, giving `` - <timestamp> [<author>] as the reviewer ``; then write it
  (R2)
- [x] Add unit tests of `addingCommit`: the newest of two commits that raise the count is returned; a commit after it
  that removes an entry is not; an edit of the entry's text past the opening, in a later commit with the same count, is
  not; a merge with the count of one parent is not, and the side commit that raised it is; a commit with no parent and
  a positive count is; and it throws when no commit qualifies; then write it (R2, R3)
- [x] Add `lastReview` unit tests that a last review whose first line ends before `as the reviewer` is complete, as
  `[author]` on the first line and `as the reviewer, reviewed ...` on the next, is refused with the message of a review
  not of the form, and that a review wrapped after its opening passes; then make `lastReview` check `firstLine`
  against `reviewOpening` (R3, R10)
- [x] Add unit tests of `reviewCommitRefusal`, `mergeRefusal` and `changedAfterRefusal` for their texts: the files as
  list items, the short hashes, the parent named, the text with no parent and the recovery by fetching the full
  history, the recovery by a rebase or another review, and each file once in `changedAfterRefusal` when two commits
  touch it; then write them (R4, R5, R6)
- [x] Commit: `bugfix-0120 Read the opening, the commit that added it and the refusals of the commits after it`
- [ ] Add the command tests of R15 to `tests/agentrite-complete.test.mjs`, which fail on the tree as it is:
  - a clean rebase on a moved `master` before `complete` passes, with the commit added on `master` touching a file
    outside the unit, and the entry written naming the commit the review names
  - a code commit after the review refuses, naming the file and the commit that added the entry
  - two commits after the review that touch only `record.md` and `plan.md`, and an empty one, pass
  - a fresh clone of the rebased branch, holding `master` and lacking the commit the entry names, passes
  - an edit of the entry's text past its opening, in a later commit, passes, and a code commit before that edit and
    after the review refuses, which shows the commit that added it is still the one found
  - a review commit that also changes `tracked.txt` refuses, naming the file and the parent's short hash, and in a
    repository whose first commit is the review commit refuses saying that it has no parent in the history held
  - a last review wrapped before the end of its opening refuses as not of the form
  - a merge after the review refuses, naming its short hash, and a review logged after the merge passes
  - a review commit made on a side branch, as at `sandbox/<branch>`, and merged into the unit's branch with
    `--no-ff`, refuses as a merge after the review, naming the merge and not the review commit
  - a gitlink changed after the review refuses under `diff.ignoreSubmodules=all`, and, for a project in `app/`, a
    file at the top of the repository changed after the review refuses under `diff.relative=true`, naming it
  - a rename of a file outside the unit after the review names both paths
  - with `diff.external` and a textconv driver for `*.md` set to a command that writes a marker file, the command
    passes and the marker file does not exist (R9)
  (R15, R7, R9)
- [ ] Remove the tests of R16: the `commitsNamed` unit test, `twoCommitsWithOnePrefix` and the `createHash` import,
  the refusals `a hash that names no commit` and `a hash that names two commits`, and `complete passes for a reviewed
  commit that is no ancestor with the same tree outside the unit`. Adapt the refusals `a file outside the unit changed
  after the review`, `a merge after the review that brings in a file outside the unit` and the gitlink refusal to the
  new messages, the merge one to that of R5 (R16, R8)
- [ ] In `scripts/agentrite.mjs`, replace `reviewedCommit` and `checkWorkReviewed` with `checkReviewedCommits(root,
  prefix, directory, opening, timestamp)`, which runs the three calls that find the commit, `addingCommit`, the
  `rev-list` of the commits after it and the `diff-tree` of each one that is no merge, and throws the refusals in the
  order of the approach. Call it where `checkWorkReviewed` is called. Remove `commitsNamed` from
  `scripts/agentrite-complete.mjs` and the imports. Run `npm test` until it passes (R2 to R10)
- [ ] Log in `record.md`, in one line each, the readings this plan builds: the newest merge named by R5, and the shallow
  clone recovered by fetching the full history in R4's message (R5, R4)
- [ ] Commit: `bugfix-0120 Read the commits from the review on, and not the trees`
- [ ] In `process.md`, replace `no file outside the unit's directory under `changes/` differs between the commit it
  reviewed and the commit checked out` with `neither the commit that added its entry nor any since touches a file
  outside the unit's directory under `changes/``, which keeps 19 words, and rewrap the item at 120 characters (R1)
- [ ] In `COMMANDS.md`, in the section of `complete`: say in the paragraph of the rule that the command reads the
  commits from the one that added the last review's entry, found by the entry's opening, and that the commit the entry
  names need not exist; say in the form of the reviewer's entry that its opening, up to and including
  `as the reviewer`, stands on the entry's first line; replace the two refusals of the named commit and the comparison
  with the refusals of R4 to R6, in that order, in the list; leave the row of `complete` in the table at the top as it
  is (R12, R13)
- [ ] Check that `README.md`, `ORCHESTRATOR.md`, `SETUP.md`, `SANDBOX.md`, `roles/` and `standards.md` are unchanged,
  and that the documents of 0117 are (R11, R13)
- [ ] Log in `record.md` the `wc -w process.md` once the work is done, `2562` if the replacement keeps it (R14)
- [ ] Commit: `bugfix-0120 State the rule by the commits from the review on`

## Verification

- [ ] `npm test` passes
- [ ] `npm run check-changes` passes on the committed work
- [ ] `git diff 0b09add -- roles extra-roles standards.md README.md ORCHESTRATOR.md SETUP.md SANDBOX.md
  changes/0117-set-a-unit-implemented-by-a-command` prints nothing
- [ ] No line of a changed file is longer than 120 characters, apart from Markdown table rows
- [ ] `wc -w process.md` prints no more than `2562`

## Commit Points

- [x] `bugfix-0120 Read the opening, the commit that added it and the refusals of the commits after it`: the pure
  functions and their unit tests, with the command unchanged
- [ ] `bugfix-0120 Read the commits from the review on, and not the trees`: the command tests, the removed tests and
  the command's new step
- [ ] `bugfix-0120 State the rule by the commits from the review on`: `process.md`, `COMMANDS.md` and the record
