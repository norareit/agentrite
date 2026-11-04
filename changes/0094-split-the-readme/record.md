---
kind: feature
status: in-progress
timestamp: 2026-11-04T11:26:27Z
---

# 0094 Split the README into a landing page and references

## Log

- 2026-11-04T11:26:27Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `5913b67`, on the human's request that the README become a short page of what the kit is and how to
  start, with diagrams of the components and of the human's workflow, that the reference move into documents of its
  own with clear rules on what goes where, that `COMMANDS.md` open with a short reference table of every command,
  and that no document get a limit on its length. Numbered 0094: the highest number in `changes/`, on every branch,
  is 0093. Read the README, `SANDBOX.md`, `CONTRIBUTING.md`, "The documents" of `AGENTS.md`, `files` of
  `package.json`, and the pointers to the README in `scripts/`, `container/`, `templates/project/`, `pointers/` and
  `tests/`. Ran nothing in the sandbox. Wrote `spec.md`. The status is `draft`
- 2026-11-04T11:35:49Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's decisions: a line
  of a Markdown table may pass the line limit in every document, which became requirement 25 and its decision and
  lifts the requirement that the tables of `SANDBOX.md` fit the limit; the diagrams are addressed on `master`, as
  the spec had it; `BTR1` is declined; `BTR2` is taken, as requirement 26. The status is `draft`
- 2026-11-04T11:38:52Z [human] approved the spec. The status is `approved`
- 2026-11-04T12:49:20Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, on
  `feature-0094-split-the-readme`, cut from `master` at `2a20348`. Wrote `plan.md`. Two readings are the only ones
  that work and are logged here rather than put to the human: the README's paragraph of the sandbox (R2) is a
  subsection "The sandbox" of what the kit is, after "The name", since R1 names no other part for it; and
  `CHANGELOG.md` keeps its references to sections of the README, which name the README as it was at each release
  and hold no link. The SVGs are generated on the host, as R17 requires, so a session in the sandbox leaves that
  task to the host. The status is `approved`
- 2026-11-04T12:53:11Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host,
  on `feature-0094-split-the-readme` at `c9f5eb1`, began the work. The status is `in-progress`
- 2026-11-04T12:58:28Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, moved "Commands", "Exit
  statuses" and "Running a role" into `COMMANDS.md`. One reading is the only one that works: the heading "Commands"
  becomes the document's title, `# Commands`, its opening line the line of what the document holds, and each
  command's section a `##` section, while "Exit statuses" and "Running a role" keep `##`, so that the document has one
  title and `#commands` and `#exit-statuses` still name the same sections. A reference to a section still in the
  README names `README.md` until the section moves. The cells "See "How a run ends"" of the table of the options of
  `agentrite orchestrate` grew past the width of their column, and the table was realigned past 120 characters, which
  R25 allows. `npm test` passes, 1350 tests
- 2026-11-04T12:59:50Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, corrected the time of
  the entry above to that of its commit, `de5fc1d`. Merged "Running a role" into the section of `agentrite run` of
  `COMMANDS.md`, after its table and before its exit statuses; the statements it dropped are in the map of the
  README below. Corrected the two links to it in `README.md`. `npm test` passes, 1350 tests
- 2026-11-04T13:04:28Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, moved the orchestrator into
  `ORCHESTRATOR.md`, its heading the title as for `COMMANDS.md`, and the six sections of the installation and the
  configuration into `SETUP.md`. `SETUP.md` gets a title of its own, "Setting up a project", and a line of what it
  holds, and its sections keep their levels, in place of the plan's headings up one level: the six are siblings, and
  up one level each would be a title of its own, in a document with no title. The sentence of `agentrite refresh`
  that says where the README says what `AGENTS.md` must hold now names `SETUP.md`, since the notice it describes
  names it. `npm test` passes, 1353 tests
- 2026-11-04T13:06:14Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, moved what "The sandbox"
  of the README held and `SANDBOX.md` did not into "Before the first run", new and first in `SANDBOX.md`, and the top
  of "What the sandbox defends against". Two changes of wording were needed beyond R10's and are made: the bullet that
  opened "Either builds the image", whose "either" named the two bullets before it that `SANDBOX.md` already makes
  and that were left out, opens "A unit run, or a run with `--in-place`, builds the image"; and the bullets of what a
  run does that `SANDBOX.md` lacked stand under a new line, "What a run does, besides what the sections below say".
  The README keeps the opening paragraph of the section, as a section "The sandbox" after "The name". `npm test`
  passes, 1353 tests
