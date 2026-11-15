# 0108 Where reviews are saved and when log entries were written are left to each agent's guess

## Context

`process.md` has the findings of a review saved in `.reviews/<unit-directory>/`. The role files of the implementer,
the planner, the specifier and the reviewer give the same roles their input as the unit directory
`changes/<number>-<kebab-name>/`, and the reviewer, the spec-reviewer and the implementer then save or read findings
under `.reviews/<unit-directory>/`. The orchestrator's end report names `.reviews/<name>/`, with the name of the unit's
directory alone.

`process.md` has every entry under `## Log` and `## Amendments` of `record.md` open with a timestamp in UTC, and
says nothing of where the timestamp comes from. The role files of the reviewer, the spec-reviewer and the
security-reviewer each say to take it from `date -u +%Y-%m-%dT%H:%M:%SZ`. Those of the specifier, the planner and
the implementer do not.

A developer running the orchestrator on a project of their own reported both: that the reviewer saved its findings
in `.reviews/changes/<unit>/` while the implementer read `.reviews/<unit>/`, which they bridged with a symbolic link
before every run, and that the implementer wrote log entries with times it made up, often later than the time of
writing, which they corrected in every unit, three to seven entries each. They also reported that a specifier once
set the dates of its commits to earlier ones.

## Observed behavior

* A reviewer saves its findings in `.reviews/changes/<number>-<kebab-name>/`, and an implementer that reads
  `.reviews/<number>-<kebab-name>/` finds none of them
* An implementer writes entries in `record.md` whose timestamps are not the time they were written, many of them in
  the future
* A specifier made commits whose dates were earlier than the time it made them

## Expected behavior

* Every role saves and reads the findings of a unit in `.reviews/<number>-<kebab-name>/`, the name of the unit's
  directory without `changes/`
* The timestamp of an entry, and of a record's frontmatter, is the time in UTC at which it was written, as the
  system clock gives it
* The dates of a commit are the ones git gives it when it is made

## Steps to reproduce

Not reproduced in this repository. The reports are the developer's, from runs of the orchestrator on their own
project. The cause below is read from the kit's documents, which are what the agents of those runs read.

1. Run a unit through the orchestrator with a planner, an implementer and a reviewer, in different harnesses
2. See whether the reviewer's findings are under `.reviews/changes/<unit>/` or `.reviews/<unit>/`, and whether the
   implementer finds them
3. Compare the timestamps of the implementer's entries in `record.md` with the dates of the commits that added them

## Root cause

* `<unit-directory>` is defined nowhere. Each role file that uses it opens by naming its input as the unit directory
  `changes/<number>-<kebab-name>/`, so `.reviews/<unit-directory>/` read literally is `.reviews/changes/<number>-
  <kebab-name>/`. Read as the name of the directory, it is `.reviews/<number>-<kebab-name>/`. Both readings fit the
  text, and two agents in two harnesses took one each
* The source of an entry's timestamp is stated only in the three reviewer roles. The roles that write the most
  entries, the implementer among them, are told the format of the timestamp and not how to obtain it, so an agent
  without a clock in its context writes what it estimates
* Nothing in `process.md` or the standards says that an agent leaves a commit's dates to git

## Fix

`process.md` defines `<unit-directory>` once, as the name of the unit's directory, with an example, and says that an
entry's timestamp is read from `date -u +%Y-%m-%dT%H:%M:%SZ` when the entry is written and that an agent sets no
date of a commit. The role files that name a place under `.reviews` use the definition and say nothing that reads
otherwise.

## Requirements

1. `process.md` defines `<unit-directory>` in a path under `.reviews` as the name of the unit's directory in
   `changes/`, without `changes/`, and gives a path as an example, as `.reviews/0012-export-to-csv/`
2. No text in `process.md`, `roles/` or `extra-roles/` names a place under `.reviews` for a unit in a form that
   holds `changes/`, and every role file that names such a place does so as `process.md` defines it
3. `process.md` says, among the rules on entries under `## Log` and `## Amendments`, that the timestamp of an
   entry, and the `timestamp` of a record's frontmatter, is the output of `date -u +%Y-%m-%dT%H:%M:%SZ` run when
   the entry or the record is written, and is never estimated, carried over from another entry or taken from a local
   clock
4. `process.md` says that an agent sets neither the author date nor the committer date of a commit, by an option
   such as `--date` or by `GIT_AUTHOR_DATE` or `GIT_COMMITTER_DATE`, and leaves both to git
5. A regression test fails when `process.md` no longer states the source of an entry's timestamp of R3, and when a
   file of `process.md`, `roles/` or `extra-roles/` names a place under `.reviews/changes/`

## Decisions

* **One unit for both.** Both are a rule that every role needs and that only some role files state, or that no file
  states unambiguously, and both are fixed by stating it once in `process.md`. The human asked for them together
* **The kind is bug.** The documents are meant to make the roles agree on where findings are and to have records
  show what happened when, and they do not
* **The name of the directory, not its path.** The orchestrator's end report and every review already saved in this
  repository use `.reviews/<number>-<kebab-name>/`, so that reading is the one the kit meant. Defining it as the path
  would move every saved review and change the orchestrator
* **The rule goes in `process.md`, not in each role.** Every role writes entries, and a project may add roles of its
  own, as this repository does. A rule in `process.md` reaches them all, where one in each kit role would miss the
  project's
* **The reviewers' role files keep their line on the timestamp.** Their lists say what their one entry holds, item
  by item, and the line is one of those items. It agrees with `process.md` after the fix, so it states nothing
  different, and removing it is not what the request is for
* **A rule, not a check.** The human chose to start with the rule in `process.md`. A check of the change check that
  refuses an entry later than its commit is left out, see "Beyond the request"
* **The cause is read, not reproduced.** The runs are on the developer's project. The two readings of
  `<unit-directory>` and the missing source of the timestamp are in the text as it stands, which is evidence enough
  for a fix to the text

## Non-goals

* Moving reviews that a project already saved under `.reviews/changes/`, and the symbolic link the developer made
* Changing where the orchestrator, the security-reviewer or the spec-reviewer save anything
* Correcting the timestamps of entries already written, in this repository or in a project
* The format of the timestamp, which stays as `process.md` gives it

## Beyond the request

1. A rule of the change check, `scripts/check-changes.mjs`, that refuses an entry the branch adds whose timestamp
   is later than the committer date of the commit that adds it, or earlier than the entry above it. It costs a
   reading of the dates of the branch's commits per added entry, its tests and a line in `COMMANDS.md`. Without it,
   an agent that ignores the rule writes a wrong time that the human sees in the record and corrects there, as now
2. A rule of the change check that refuses a commit of the branch whose author or committer date is earlier than
   that of its parent. It costs a walk of the branch's commits and its tests. Without it, a backdated commit is seen
   in `git log` and is made again by the human
