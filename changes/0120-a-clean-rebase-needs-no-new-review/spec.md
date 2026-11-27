# 0120 A clean rebase needs no new review

## Context

`npx agentrite complete <unit>`, from unit `0117-set-a-unit-implemented-by-a-command`, sets a unit to `implemented` when
its record shows that the last review saw the work as it stands. The human lands a unit by rebasing its branch on the
default branch and then fast-forwarding the default branch to it, and wants no merge commits. A clean rebase is
therefore the normal way to a landing, and must need neither undoing nor another review.

## Observed behavior

When the default branch has moved and the unit's branch is rebased on it before `complete` runs, the command refuses.
It lists the files the default branch brought in as work changed after the review, and asks for another review. In a
fresh clone of the rebased branch it refuses because the commit the review's entry names no longer exists.

## Expected behavior

Whether the last work was reviewed is read from the commits of the branch, and a rebase does not change the answer. The
command passes a branch whose commits from the review on touch only the unit's own directory, whether the rebase came
before or after `complete`, and in a fresh clone that holds the default branch or its `origin/` ref. It refuses a branch
with a commit from the review on that touches anything else, and names the files.

## Steps to reproduce

Reproduced on a clone of this repository, with 0117 as the unit:

1. Put the branch of 0117 at the commit before its `Set the unit to implemented`, where its status is `in-progress`
2. Add a commit to the commit the branch was cut from, and make that the default branch
3. Rebase the unit's branch on it, which succeeds with no conflict
4. Run `npx agentrite complete 0117`

It exits 1 and names `AGENTS.md`, the documents of unit 0118 and the added file as differing between the last review
and the commit checked out.

## Root cause

The command compares the tree of the commit the review's entry names with the tree of the commit checked out. A rebase
puts the default branch's newer commits under the unit's work, so that the two trees differ by everything the default
branch gained, although no commit of the unit changed. The rebase also gives the unit's commits new hashes, so that the
named commit is reachable from no branch, and a fresh clone does not hold it.

## Fix

The command finds the commit that added the last review's entry to the unit's `record.md`, by the opening of the entry,
and reads the files that commit and the commits after it touch. On the reproduction above, the review commit is found
under its new hash, the commits after it touch only the unit's `record.md`, and a code commit added after it is caught.
A trial of this reading on units 0100 to 0119 found 13 clean, 4 with no review entry, and 0100, 0101 and 0104 with files
outside the unit really changed after their last review.

## Requirements

### The rule

1. The first condition of `process.md` for `implemented` says that the last review of the run was of the work as it
   stands when neither the commit that added its entry nor any since touches a file outside the unit's directory under
   `changes/`. This replaces the statement that no such file differs between the commit reviewed and the commit checked
   out, and the rest of the condition stays. `wc -w process.md` does not grow by this unit.

### The command

2. The commit that added the last review's entry is the newest commit reachable from the commit checked out at which the
   unit's `record.md` holds the entry's opening more times than at each of its parents, a commit with no parent
   counting as a parent that holds it none. The opening is a line start followed by
   `- <timestamp> [<who made it>] as the reviewer`, read literally. It is found under a new hash after a rebase, after
   an edit of the entry's text past the opening, and whether or not the commit the entry names exists. A commit that
   removes an entry is never that commit, and neither is a merge that holds the entry because one of its parents does.
   The commits after it are those reachable from the commit checked out and not from it.
3. When no such commit is found, the command refuses. The message names the entry by its timestamp, says that no commit
   of the branch was found to have added it, and says that a review in the form the command reads, as a delta review of
   the commit checked out, lets the command go on.
4. When the commit that added the entry is a merge commit, the command refuses as R5 says. When it touches a file
   outside the unit's directory, the command refuses. The message names those files and that commit by its short hash,
   and says that the commit of the last review also holds other work, so that the reviewer reviews it again.
5. When a merge commit stands after the commit that added the entry, the command refuses. The message names the merge
   commit by its short hash, and says that rebasing the branch on the default branch, or another review, lets the
   command go on.
6. When a commit after the one that added the entry touches a file outside the unit's directory, the command refuses.
   The message names those files, each once, and the commit that added the entry by its short hash, and says that the
   work changed after the last review, so that the reviewer reviews it again.
7. When none of R3 to R6 holds, this condition of the rule holds. Commits that touch only the unit's directory, its
   `record.md` and `plan.md` among it, do not count, and neither does an empty commit.
8. The command no longer needs the commit the entry names to exist or to resolve. The refusals of a named commit that
   is no commit of the repository, or that names more than one, are gone, and so is the comparison of two trees. The
   form of the reviewer's entry is unchanged and still requires its commit, and the entry `complete` writes still names
   that commit as the review's entry has it.
9. What a commit touches is read so that:
    * a renamed file counts by both its old and its new path
    * a changed, added or removed gitlink counts
    * the answer is the same whatever the user's `diff.ignoreSubmodules`, `diff.relative` and `diff.renames` are
    * no external diff and no textconv driver runs, for the search of R2 as for the reading of the files
    * in a project in a subdirectory of its repository, paths are compared from the top of the repository, as now
10. The refusals of R3 to R6 stand in that order at the place of the two refusals R8 removes, after the refusal of a
    last review not in the form and before that of a blocking finding still open. All else the command does, reads,
    writes and refuses is unchanged. As before, a refusal writes and commits nothing and exits 1.
11. No role file and no file of `standards.md` changes, and the documents of 0117 stay as they are.

### The documents

12. `COMMANDS.md` gives the refusals of R3 to R6 in the list of `complete`, in place of the two that go, and says that
    the command reads the commits from the one that added the last review's entry, and that the commit the entry names
    need not exist. The row of `complete` in the table at the top of `COMMANDS.md` stays as it is, since what it says
    the command does stays true.
13. No other document changes for this unit unless it states the old comparison. `README.md`, `ORCHESTRATOR.md`,
    `SETUP.md` and `SANDBOX.md` were read for it and do not: they say that the last review saw the work as it stands,
    which stays true, and nothing about the order of completing and rebasing. No document gains a section on landing.
14. `record.md` logs `wc -w process.md` on the commit the unit's branch is cut from and once the work is done, as
    `AGENTS.md` requires.

### Tests

15. Tests of the command show that:
    * a clean rebase on a moved default branch before `complete` passes
    * a code commit after the review refuses, naming the file
    * commits after the review that touch only the unit's own documents pass
    * a fresh clone of a rebased branch, which holds the default branch and lacks the commit the entry names, passes
    * an edit of the entry's text past its opening, in a later commit, leaves the commit that added it found
    * an entry for which no commit is found refuses
    * a review commit that also holds code refuses, naming the file
    * a merge commit after the review refuses, naming it, and a review after the merge passes
    * a review commit that reaches the branch through a merge, as of commits waiting at `sandbox/<branch>`, is found as
      the commit that added the entry, and the merge after it refuses
    * a gitlink changed after the review refuses under `diff.ignoreSubmodules=all`, and a file changed after the review
      refuses under `diff.relative=true`
    * a rename after the review names both paths
16. The tests of the behavior that goes are removed or adapted: those of a named commit that does not exist or is
    ambiguous, of a named commit that is no ancestor with the same tree, and of the helper that only those refusals use.

## Decisions

* **Read the commits from the review on, and not the trees.** A rebase changes the base of every commit and leaves what
  each one touches. Comparing trees cannot tell the default branch's files from the unit's. Storing a fingerprint of the
  diff was rejected: it would change the reviewer's entry, and so the role files that 0118 is changing.
* **Identify the commit by the opening of the entry.** Hashes do not survive a rebase. The text past the opening does
  not reliably survive either, since 0117's fold took commit names out of entries that were already written. The
  timestamp, who made it and the role are what no such edit touches. The line start keeps a quotation of the opening
  inside another entry from counting, since a continuation line is indented. The role keeps an entry of another role by
  the same agent in the same second from being taken for it.
* **Take the newest commit that raises the count above each of its parents.** With the entry present at the commit
  checked out, that is the commit that added it, also when an earlier entry has the same opening. Comparing with each
  parent keeps a merge that brings the review commit in from its other side from being taken for it, so that the
  review commit is found where it was made and the merge stands after it. A commit that only removes an entry lowers
  the count and is not taken.
* **A review commit that holds other work refuses.** The code in it cannot be told apart from the reviewed work, so
  passing would pass unreviewed code. This did not occur in units 0100 to 0119, so that the refusal costs nothing in
  the normal flow. A branch squashed into one commit is refused by this, and needs another review.
* **Any merge commit after the review refuses.** Git lists no files for a merge by default, so it must not pass
  silently. Judging it by its diff against a parent was rejected as more rules for a shape the human's flow does not
  produce. The recovery is cheap, since a rebase removes the merge and a review after the merge places it before the
  review. This includes the merge `SANDBOX.md` names for commits that wait at `sandbox/<branch>`, and the refusal says
  what to do, so that `SANDBOX.md` needs no entry for it.
* **Each commit is judged, and not their sum.** A change outside the unit and its revert after the review both touch
  the file, so the command refuses although the tree came back. This follows from reading commits, and another review
  or dropping both commits recovers from it.
* **`supersedes` is set to 0117's directory.** `process.md` calls for a new unit that names the old one when a
  correction would make the original record misleading. 0117's spec states the tree comparison and the refusals of the
  named commit as what the command does, and after this unit it no longer does them. Only those parts are superseded,
  and the rest of 0117 stands.
* **`process.md` gains nothing for the edge cases.** Without text on merges, review commits with code or the identifying
  of the entry, nothing goes wrong at runtime: the command applies them and its messages say what to do. They are
  settled here, which only the unit's workers read. The refusal of a merge is the command's own and no condition of
  `implemented`: a merge whose commits touch only the unit's directory meets the rule of R1, and the command refuses it
  because it does not read a merge's sides, with a message that gives the recovery.
* **The threat model is 0117's.** The command defends against a mistake, and not against an agent that writes a false
  entry or rewrites history to hide a commit. The content of the commits of the unit's branch stays outside what the
  kit defends against, and the human reviews the branch before landing it.

### Limitations

* **A change made inside a commit before the review commit is not seen**, such as a conflict resolved during a rebase or
  an amend. This is no new gap, since completing first and rebasing afterwards has never checked it, and the human
  resolves such conflicts themselves.
* **A commit between the commit reviewed and the commit that added the entry is not seen.** The reviewer commits its
  entry directly after it reviews, so that nothing normally stands there. The old comparison did catch it. See BTR1.
* **An edit of the entry's opening counts as adding it.** A corrected timestamp makes the commit of the correction the
  commit found, so that earlier commits are taken as reviewed. Nothing in the kit edits an opening.
* **A shallow clone can refuse a clean branch.** Its oldest commit appears to add the whole file, and so also every
  other file, and R4 refuses. Fetching the full history recovers from it.
* **A clone without the default branch is refused by the change check.** `complete` runs the change check before it
  reads the review, and the check needs a common ancestor with the default branch or its `origin/` ref, as a
  `--single-branch` clone of the unit's branch lacks. This unit leaves the check as it is. Fetching the default branch
  recovers from it.
* **After a rebase, a delta review may lack its base.** The reviewer's role compares against the commit the last
  review names, which a fresh clone of a rebased branch does not hold, and then asks rather than falling back to a
  full review. The refusals of R4 and R6 name the commit that added the entry by its short hash, which the human can
  give the reviewer as the base.

## Non-goals

* Storing a fingerprint of the diff
* Running the test suite from the command
* Merging or rebasing from the command
* Changing the role files or the form of the reviewer's entry
* A document section on how a unit is landed

## Beyond the request

1. Also check the commits between the commit the entry names and the commit that added the entry, when the named commit
   is still an ancestor of the commit checked out. Cost: one more range and a test, and the check silently does not
   apply after a rebase, which is the normal flow, and would not have applied to 0117, whose named commit is no ancestor
   of the default branch. Without it: a code commit made during a review, before its entry is committed, passes unseen.
2. Pass a merge commit whose second parent's side touches only the unit's directory, as when the human logged a decision
   on the host during a sandbox run and then merged the waiting commits. Cost: a second reading of commits and tests of
   its shapes. Without it: the command refuses with a clear message, and a rebase recovers from it.
