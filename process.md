# Process

This document contains critical instructions for coding agents. Follow these guidelines precisely.

It holds how work is done: where instructions belong, how reported problems are verified, the commit prefixes, the
changes process and the roles. The rules on how text, documentation, commits, code and tests are written are in the
project's standards, the file that `.agentrite/instructions.md` in the project root names, which is the kit's
`standards.md` unless the project replaced it. What a project is, what it is built with and how its commands are run
belong to that project's own `AGENTS.md`, which links here for the rest.

## General guidelines

### Where instructions belong

Agent memory is stored per machine and is not committed, so it does not travel. A project may be worked on from
several machines, and anything recorded only in memory is invisible on the others.

* Record anything that would still be useful on another machine in a committed instruction file rather than in agent
  memory. That includes workflow preferences, conventions, corrections, and lessons learned from a debugging session
* Keep in agent memory only what is genuinely specific to one machine, such as a local preview URL or a locally
  broken tool
* When something already in memory turns out to apply everywhere, move it into the committed instructions and delete
  the memory, so the two cannot drift apart
* When in doubt, prefer the committed file. A note that turns out to be machine-specific is easy to move back

A rule that applies to every project belongs in this kit. A rule that would need rewording to make sense in another
project belongs in the project's own `AGENTS.md`. Nothing is stated in both places.

### Verifying reported problems

The agent's shell may run in a sandbox that is not the developer's machine. Servers started there are not reachable
from the developer's browser, and commands the developer runs with a `!` prefix execute there rather than locally. A
`curl` returning 200, or a headless browser clicking through successfully, is therefore not evidence about what the
developer actually sees.

* When a reported problem cannot be reproduced, do not answer with measurements from the agent's own environment
* Observe the developer's own browser, or ask for the exact error text, before forming a theory about the cause
* If the developer repeats that something is broken after it was declared fine, treat that as proof the evidence came
  from the wrong place, not as a reason to restate it
* Prefer asking for one decisive detail over running more checks that cannot see the developer's machine

### Commits

* Prefix feature implementation commits with `feature-<number>`
* Prefix bugfix commits with `bugfix-<number>`
* Prefix task commits with `task-<number>`

## Changes

All project change records live in `changes/`, independent of the harness driving the work. Each unit has its own
directory, named `changes/<number>-<kebab-name>/`. The number is four digits and is the highest number appearing in any
existing change directory, regardless of its kind, plus one. A project that adopted this scheme later may hold
historical directories under its older naming, which are left as they are so that existing references to them remain
findable.

`npx agentrite units` lists the units of a project, and `npx agentrite units --open` those still open. An agent asked
which units are open, or in what status a unit is, runs it rather than reading the records.

Each unit has a mandatory `record.md` and may also have `spec.md` and `plan.md`. Start from the kit's
`templates/changes/`.

* `spec.md` states what should be true: context, requirements, decisions with rationale, non-goals, and what was left
  out as beyond the request. It has no file paths or task order
    * The human may refer to item *n* of a spec's "Beyond the request" as `BTR<n>`, such as `BTR2`. It names that
      item of the spec of the unit under discussion, and never an item of a message's `**Needed from you**` list
* `plan.md` states how the work will be done: approach, files, ordered tasks, tests first, and commit points
* `record.md` states what happened: frontmatter, timestamped status transitions, and amendments

Use the frontmatter in `templates/changes/record.md`. Its `kind`, `status`, and `timestamp` fields are required, and
`supersedes` names an older unit when applicable. The timestamp is an ISO 8601 instant in UTC ending in `Z`, so that
sorting it lexicographically orders the whole set chronologically.

Every entry under `## Log` and under `## Amendments` of `record.md` is a list item, written as these two are:

```markdown
- 2026-10-07T11:51:06Z [human] approved the spec. The status is `approved`
- 2026-10-07T11:52:40Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, began the work. The status is
  `in-progress`
```

* It opens with the timestamp, in the same UTC format as the frontmatter, written bare
* Then comes who made it, in square brackets: `[<harness>, <provider>/<model>]` for an agent, and `[human]` for a
  human-only action. The brackets are written, and are not a mark for something to fill in
* Then, for an agent that acts in a role, comes `as the <role>`, with the name of the role it acts in. An entry of a
  human has none, and neither has one of an agent that acts in no role
* Then comes the text. In an entry of an agent made on a variant's branch, defined under the review's findings
  below, the text names the variant, as "on the variant `opus`". An entry made on the unit's branch names none
* In `templates/changes/record.md` the brackets around who made the entry are the written ones, and its other
  brackets mark what is to be filled in

The entries of a section follow one another with no blank line between them. A new entry goes directly after the
last entry of its section, above the blank line before the next heading. The change check rejects an entry that the
branch adds after a blank line.

The statuses are `draft`, `approved`, `in-progress`, `implemented` and `cancelled`. A unit that is built goes through
the first four in that order. `implemented` and `cancelled` are the two end statuses, and a unit leaves the order for
`cancelled` only from `draft`, `approved` or `in-progress`. `approved` says that the human approved the spec, or for a
task its record. An approved unit may be built: a task always; a bug when it has a `plan.md`, or a log entry in
its `record.md` that says it needs no plan; a feature when it has a `plan.md`. Nobody approves a plan.

Set `implemented` only after the human has decided every blocking finding the review returned and every task in
`plan.md` is ticked. A finding of a review blocks in exactly two cases:

* A requirement in `spec.md` is false, under the usage the spec says the unit supports and the threat model it
  states. A requirement that holds for supported usage and fails only outside it is not false
* A rule in `process.md` or in the project's standards is broken, and no decision in `spec.md` or `record.md`
  records an exception to it

Every other finding does not block, and neither does a limitation recorded as a decision. Remove a task that will
not be done, recording the reason in `record.md`, rather than leaving its box open. Once implemented, `spec.md` and
`plan.md` are frozen. Log later small corrections under `## Amendments` in `record.md`, with the timestamp, change,
and reason. For a correction that would make the original record misleading, create a new unit and set
`supersedes:` to the old directory.

Only the human cancels a unit. A unit that is `implemented` is never cancelled: undoing implemented work is a new
unit that names the old one in `supersedes`, as for a correction that would make the original record misleading. The
log entry that sets `cancelled` gives the reason in words, and when another unit did the work or made it moot, it
names that unit's directory. A cancelled unit is frozen as an implemented one is: its `spec.md` and `plan.md` change
no more, a later correction is an amendment in `record.md`, and outcomes recorded after the cancellation go under
`## Amendments`. Taking a cancelled unit's idea up again is a new unit that names the cancelled one in `supersedes`,
and a cancelled unit is never set back to an earlier status.

Run the change check before submitting work. The kit ships it as `scripts/check-changes.mjs`, and each project wires
it to a command of its own. It compares the committed work on the current branch with the default branch and rejects
changes to the `spec.md` or `plan.md` of any unit implemented or cancelled on the merge base, and the deletion of
any such unit. It also rejects an implemented unit whose `plan.md` still has unticked tasks. It reads committed
content, so commit before trusting it. The default branch is the one the project names as `defaultBranch` in
`agentrite.json` at its root.

A review's findings are saved in full in the ignored `.reviews/<unit-directory>/` directory. Record the outcome of
each finding, not the full review, in `record.md`: as timestamped log entries while the unit is not frozen, and
as amendments once it is.

A unit may be worked on in more than one variant, each a separate run of the unit on a branch of its own. A branch
whose name holds `--` is a variant's, and the variant's name is what follows the last `--`, as `opus` for
`feature-0012-export-to-csv--opus`. A role reads which variant it is on from the branch it is on, on the host as in
the sandbox. The reviews of the runs are kept apart by the name of their file.

* A review of a variant is saved in a file whose name ends in `--<name>.md`, with the variant's name
* A review of the unit's branch is saved in a file whose name holds no `--`
* A role on a variant takes findings only from the files whose name ends in `--<name>.md` with its own variant's
  name, and a role on the unit's branch only from the files whose name holds no `--`

The spec is written when the human wants the unit described, and any number of units may be `draft` or `approved`
at one time. The plan is written when the unit is next to be built and not before.

What is written before the approval, and the approval itself, are committed on the default branch: the unit's
`spec.md` and `record.md`. Such a commit holds nothing but that unit's own documents. Everything after the approval is
done on the unit's branch and never on the default branch: the plan, the implementation, the record's further
entries, and a correction of the spec. The one exception is the cancellation. A unit with no branch is cancelled on
the default branch, as its approval was. A unit that has a branch, which an `in-progress` unit always has and an
`approved` one has once its planning began, is cancelled on the default branch too, and its branch is not merged.
That commit holds the unit's documents as they stand at the head of its branch, `spec.md`, `plan.md` when there is
one, and `record.md` with the entry that sets `cancelled`, and nothing of its implementation. The branch is cut from
the head of the default branch when work on the unit starts after its approval: the planning of a feature or a bug,
and the work itself of a task, and not earlier. Its name is the prefix of the unit's commits and its directory name,
as `feature-0012-export-to-csv`, with `bugfix` for a bug and `task` for a task. A unit run of the sandbox cuts it,
and a session on the host cuts it itself. Commit the change documents first, then the implementation. Work committed
straight to the default branch skips the freeze check entirely, and that holds for the commits of the spec too.

### Features

Features are larger changes and **require** a spec and plan before implementation.

### Bugs

Bugs **require** a spec. Add a `plan.md` only when the fix takes more than a couple of steps. A single-commit fix
needs only `spec.md` and `record.md`.

### Tasks

Tasks are small changes and may need only a record.

## Roles

The work in `changes/` is done in roles. `.agentrite/instructions.md` in the project root names the file of each, and
the project's `AGENTS.md` points to it. A role's file is read at the point the role is taken on, whether or not the
tool running the session can delegate to a separate agent. A session that takes on several roles in turn reads each
one's file as it takes that role on. Work in no role follows this document, the project's standards and the
project's `AGENTS.md` alone.
