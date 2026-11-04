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
  the entry above to that of its commit, `3e3e28c`. Merged "Running a role" into the section of `agentrite run` of
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
- 2026-11-04T13:07:50Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, made the README a landing
  page: what the kit is, "The name", "The sandbox", "Quick start", "How it works" with the statuses, "The documents"
  and "What is here", 168 lines before the diagrams. `claude --help` on the host gives `--agent <agent>`, which the
  quick start uses for the specifier. In a unit run the quick start gives `agentrite orchestrate` with
  `--skip-permissions`, as `SANDBOX.md` does, since without it a headless step gets only what the harness's settings
  allow. `npm test` passes, 1353 tests
- 2026-11-04T13:11:47Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, added the diagrams.
  `npm view @mermaid-js/mermaid-cli versions` lists 11.4.2, which the script pins. On this host the first
  `npm run diagrams` failed with "Could not find Chrome": puppeteer's install, run by `npx`, downloaded the zips of
  Chrome and of its headless shell into `~/.cache/puppeteer` but unpacked only a few of their files, under node
  26.9.0. Unpacking the two zips by hand with `unzip` into the directories puppeteer names made the command work;
  this is the host's cache and changes nothing in the repository. The components diagram is laid out top to bottom,
  since left to right made it 3130 pixels wide. Both SVGs were rendered to PNG on white and looked at; they were not
  looked at in a dark viewer, and their root element has `background-color: white`, which the test checks.
  `npm run diagrams` is described in `CONTRIBUTING.md` as exiting `1` when one diagram fails, as its `|| exit 1`
  does. `npm test` passes, 1358 tests
- 2026-11-04T13:12:57Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, wrote the rules in
  `AGENTS.md`: "Line limit" lets a line of a Markdown table pass 120 characters, and "The documents" opens with the
  table of the six documents and holds the rules of R21 to R23 and R25. "Exit statuses" already linked
  `COMMANDS.md#exit-statuses` since the move of the commands. The rule "The three documents say what there is" now
  reads "The documents say", since its content is in six. `grep -rn -i 'lines' tests/*.mjs scripts/check-changes.mjs`
  shows no count of the lines of a document. `npm test` passes, 1358 tests
- 2026-11-04T13:13:11Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, recorded where each
  section of the README at `2a20348` went:
    * "AgentRite" and its opening: stay in `README.md`, its list of sections removed for "The documents" of R1
    * "The name": stays in `README.md`
    * "What is here": stays in `README.md`, with the rows of `COMMANDS.md`, `ORCHESTRATOR.md` and `SETUP.md`
    * "How it works": stays in `README.md`, with the statuses and the workflow diagram added before the workflow list
    * "Commands": the title and opening of `COMMANDS.md`; its twelve sections, "agentrite init", "agentrite
      config", "agentrite refresh", "agentrite roles", "agentrite units", "agentrite approve", "agentrite run",
      "agentrite orchestrate", "agentrite runs", "check-changes", "check-commit-message" and "sandbox.sh", are the
      `##` sections of the same names in `COMMANDS.md`
    * "Exit statuses": "Exit statuses" of `COMMANDS.md`
    * "Running a role": merged into "agentrite run" of `COMMANDS.md`. Dropped, as the section already made them:
      that the command waits for the harness and exits with its status, or 1 for a signal, which its paragraph of
      exit statuses says; and the refusals of a project with no or a wrong `agentrite.json` or role file, and of a
      role that `roles` does not name, which its opening paragraph says. Everything else was added to it in its
      wording, and "See "Running a role"." was removed
    * "The orchestrator" and "The definition", "The outcome of a step", "How a run ends", "What .orchestrator
      holds" and "On the host and in the sandbox": `ORCHESTRATOR.md`, the first as its title and the five as its
      `##` sections
    * "Installing it into a project" with "How the kit's instructions reach an agent" and "On a fresh clone", "Git
      hooks", "The project's settings", "Replacing a role or the standards", "Adding a role" and "Updating a project
      to a newer kit": the sections of the same names and levels in `SETUP.md`, in that order
    * "The sandbox": its opening paragraph stays in `README.md` as "The sandbox", and its first sentence opens
      "Before the first run" of `SANDBOX.md` too. "What a run needs", the three files that configure a project's
      sandbox and the bullets of the image and of `--rebuild` went to "Before the first run". "What it confines",
      the table of what of the host is reachable and the sentence on `~/.gitconfig` went to the top of "What the
      sandbox defends against". Dropped, as `SANDBOX.md` already made them: the unit run and the branch it gets,
      in "Running a unit"; `--in-place`, in "Running on the tree as it is"; `--connect`, in "Two agents on one
      unit"; `--variant`, in "Two implementations of one unit"; and the bell, in "The bell"
- 2026-11-04T13:14:15Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran the verification
  on `d0e43e9`: `npm test` passes, 1358 tests, none skipped; `npm run check-changes` exits 0; every line of the
  README at `2a20348` that is not a line of a table is in `README.md`, `COMMANDS.md`, `ORCHESTRATOR.md`,
  `SETUP.md` or `SANDBOX.md` as it was, but for the changed levels of headings, the corrected references, the
  paragraphs rewrapped for them and the statements the map above says were dropped, which a script compared line by
  line; `grep -rn 'README' scripts container templates pointers tests` names no section that moved; no line of
  `*.md` or of the unit's documents but a line of a table passes 120 characters; `npm pack --dry-run` lists the
  three documents and nothing under `diagrams/`. That GitHub and npmjs.com show the images is the human's to see,
  once the branch is pushed and released, and its box stays open. The unit is handed over for review at
  `in-progress`
- 2026-11-04T13:17:34Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, on the human's request,
  folded `28931a0`, which wrapped a line of the test of the links, into the commit of that test, now `7f396bc`. The
  rewrite left the tree as it was and gave the later commits new hashes, so the two entries above that named
  `de5fc1d` and `6e4287b` now name `3e3e28c` and `d0e43e9`, the same commits after the fold
- 2026-11-04T13:17:34Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, removed from the
  verification of `plan.md` the check that GitHub and npmjs.com show the two images (R15). It is NOT checked
  before the unit is set to `implemented`, and setting `implemented` does not wait for it: npmjs.com shows the
  README of a release only, and the release comes after the unit is `implemented`. What this unit verified of R15
  is that the README addresses each SVG at
  `https://raw.githubusercontent.com/norareit/agentrite/master/diagrams/<name>.svg` with alternative text, which a
  test checks. The human looks at the images after the release, outside this unit, and a fault found then is a new
  unit
- 2026-11-04T13:31:19Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, fully reviewed 0094 at
  `ec001025e57628d71df75f476f11b04090772607` against merge base `2a20348`. Returned S1, P1 and C1 in
  `.reviews/0094-split-the-readme/2026-11-04T133119Z-opencode.md`. `npm test` passes, 1358 tests, none skipped;
  `npm run check-changes`, `npm pack --dry-run` and `git diff --check` pass. Did not regenerate the SVGs or
  independently verify visual rendering in light or dark viewers, or the earlier visual inspection claimed in the
  record. The status remains `in-progress`
- 2026-11-04T13:39:10Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, took up the findings of
  `.reviews/0094-split-the-readme/2026-11-04T133119Z-opencode.md`, and added their tasks to `plan.md`:
    * S1, blocking, accepted and applied: the quick start now commits what `npm install` and `init` wrote, on the
      default branch after `git status`, before the first unit, since a unit run clones only what is committed
    * C1, blocking, accepted and applied: the loop of `npm run diagrams` is in `generate-diagrams.sh` at the root,
      a file of this repository only, as `sandbox-dev.sh` is, and the script of `package.json` runs it, so no line
      of `package.json` passes the line limit. A JSON string cannot be wrapped, so a file of its own is the only
      way within the rule short of an exception, which is the human's to grant. `CONTRIBUTING.md` describes it and
      lists it. `npm run diagrams` through the script left both SVGs unchanged, which `git status` showed
    * P1, not blocking, accepted and applied by doing the check rather than removing it: both SVGs were shown as
      images on a page of background `#0d1117`, GitHub's dark one, in Chrome's headless shell with
      `--force-dark-mode`, and the screenshot was looked at. Each reads as on white, on its own white background
  `npm test` passes, 1358 tests, none skipped
- 2026-11-04T13:48:44Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, on the human's request,
  restyled both diagrams, after a prototype the human commented on, and added the tasks to `plan.md`. The components
  name `./sandbox.sh` alone, say that the standards are the kit's or the project's own, and show `changes/` as a
  stack of documents, whose text Mermaid centres, unlike that of the cylinder. In the workflow each role says what it
  does, the reviewer being of another model family, as the human asked, and the steps of the human are named for what
  they act on, as approving the unit. Leaving the sandbox is a step of the human inside the box of the sandbox, and
  the orchestrator a dashed alternative there. Both were rendered to PNG and looked at. On this host Arial is missing
  and the render fell back to another font; a viewer with Arial or Helvetica shows those. The alternative text of the
  two images in `README.md` says what they now show. `npm test` passes, 1358 tests, none skipped
- 2026-11-04T14:04:39Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, gave both diagrams the
  style the human chose, from five rendered in the scratchpad and not committed: hand-drawn, soft cards, dark and
  bold, minimal monochrome, and soft cards with bold titles, the one taken. The theme, its colours and a few lines of
  CSS are in the front matter of each source. The titles of the groups are written in capitals and bold in the
  source rather than by CSS, and the two of the components end in a non-breaking space: Mermaid measures a title
  before CSS applies, and the last letter was cut off otherwise. Both SVGs were rendered to PNG and looked at, with
  the fonts of this host, which has none of those the sources name. `npm test` passes, 1358 tests, none skipped
- 2026-11-04T14:06:37Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, delta-reviewed 0094 at
  `4be8b72aafe1c3c01a17c2cc2a45515b23d0bbcb` from `ec001025e57628d71df75f476f11b04090772607`.
  Returned no new findings, in `.reviews/0094-split-the-readme/2026-11-04T140637Z-opencode.md`.
  `npm test` passes, 1358 tests, none skipped; `npm run check-changes`, `npm pack --dry-run`, shell syntax and
  diff whitespace checks pass. Did not regenerate the SVGs, independently inspect visual rendering or verify the
  historical manual inspections or published images. The status remains `in-progress`
