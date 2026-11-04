# 0094 Split the README into a landing page and references

## Approach

The work is a move of text, done one document at a time, so that every commit leaves the documents whole: each
link resolves, each message of the code names the document its section is in, and the suite passes. The guard
comes first: a test of the links between the documents (R26), written against the tree as it is, which then holds
at every later commit.

Each move takes a run of sections out of `README.md` as they are, pastes them into the new document, changes the
levels of their headings, and corrects every reference that now crosses a document (R10). The merge of "Running a
role" into `agentrite run` is a commit of its own after the move, so that the move can be checked as a pure move
and the merge on its own. The new text, the table of `COMMANDS.md`, the README's quick start, statuses, map of the
documents and paragraph of the sandbox, and the rules in `AGENTS.md`, is written after the moves, when the content
it describes is in place.

The diagrams are written last among the documents. Their SVGs are generated with `npm run diagrams`, which needs a
browser that Mermaid's command line downloads, and which runs on the host only (R17). A session in the sandbox
writes the sources, the command and the tests, and leaves the generation to the host, as the task says.

Two readings of the spec are the only ones that work, and are logged in `record.md` as such:

* The README's paragraph of the sandbox (R2) is a subsection "The sandbox" of what the kit is, after "The name". R1
  gives the parts of the README in order and names no part for it, and the sandbox is one of the components the
  first part lists
* `CHANGELOG.md` keeps its references to sections "of the README". It is written at a release, for that release,
  and a section names the README as it was then. R6 and R13 are about links and messages, and the changelog holds
  no link to a section of the README

## Files

- `tests/document-links.mjs`: new. Pure functions: the headings of a Markdown text as GitHub makes their anchors,
  the links of a text outside fenced code and inline code, and the faults of a set of documents
- `tests/document-links.test.mjs`: new. Unit tests of the functions, and the test of R26 over the six documents
- `tests/package-documents.test.mjs`: `files` with the three documents; the default definition read from
  `ORCHESTRATOR.md`; the documents searched for the status `planned` with the three added; `npm run diagrams` and
  the devDependencies; the diagrams and their sources; the README's images
- `tests/agentrite-hook.test.mjs`, `tests/agentrite-instructions.test.mjs`: the messages name `SETUP.md`
- `README.md`: everything but what the kit is, "How it works" and "What is here" moved out; new quick start,
  statuses, images, map of the documents, paragraph of the sandbox; "What is here" with the new documents
- `COMMANDS.md`: new. The table of every command, "Commands", "Exit statuses"
- `ORCHESTRATOR.md`: new. "The orchestrator" and its subsections
- `SETUP.md`: new. "Installing it into a project" to "Updating a project to a newer kit"
- `SANDBOX.md`: what the README's "The sandbox" holds and it does not; its references to the README corrected
- `CONTRIBUTING.md`: references to "Commands" and "Exit statuses" corrected; `npm run diagrams` under "Commands";
  `diagrams/` in "What the repository holds besides the package"
- `AGENTS.md`: "Line limit"; "The documents"; "Exit statuses"; the list of what to read
- `package.json`: `files` with the three documents; the script `diagrams`
- `diagrams/components.mmd`, `diagrams/components.svg`, `diagrams/workflow.mmd`, `diagrams/workflow.svg`: new
- `scripts/agentrite-hook.mjs`, `scripts/agentrite-instructions.mjs`, `container/sandbox.sh`: messages name
  `SETUP.md`
- `templates/project/commit-msg`, `templates/project/sandbox.sh`: comments name `SETUP.md` and `COMMANDS.md`
- `changes/0094-split-the-readme/record.md`: the map of the old README's sections, and the log

Not changed: the root `sandbox.sh`, which this repository's own tests judge against the installed release's
template and which follows the template when a release is installed; `container/Dockerfile`, whose comment names
the project's own README; `CHANGELOG.md`, as the approach says.

## Tasks

### The test of the links

- [x] In `tests/document-links.test.mjs`, unit tests of the functions of `tests/document-links.mjs`, written before
  them (R26):
    * a heading's anchor as GitHub makes it: lower case, every character but a letter, a digit, a space, a hyphen
      and an underscore removed, each space a hyphen, so that `The project's settings` is `the-projects-settings`
      and `What .orchestrator holds` is `what-orchestrator-holds`; a second heading of the same text is `-1`, a
      third `-2`
    * a heading inside a fenced code block is not a heading, as `# agentrite: commit-msg hook` in a shell block
    * the links of a text are those of the form `[text](target)`, outside fenced code and inline code, and a link
      whose text is itself inline code, as ``[`SANDBOX.md`](SANDBOX.md)``, is a link
    * of the links, those are judged whose target is one of the six documents, with or without `#anchor`, or a
      bare `#anchor`, which names the document it is in. A link to any other file or to an address is not judged
    * a fault names the document the link is in, the link as it is written, and what is not found: the document,
      or the heading in the document named
- [x] Write `tests/document-links.mjs`, the pure functions the tests above call. They take texts and return data,
  and read no file
- [x] In the same test file, the test of R26: read `README.md`, `COMMANDS.md`, `ORCHESTRATOR.md`, `SETUP.md`,
  `SANDBOX.md` and `CONTRIBUTING.md` that exist, judge their links, and assert that there is no fault, with the
  faults as the message. A document of the six that does not exist yet is left out of the reading, so that a link
  to it is a fault, and the test passes at this commit. Run `npm test`
- [x] Commit (R26)

### The commands

- [x] In `tests/package-documents.test.mjs`, the expected `files` hold `COMMANDS.md` after `SANDBOX.md`, and a test
  that each of `COMMANDS.md`, `ORCHESTRATOR.md` and `SETUP.md` is in `files` and is a file at the root. Add
  `COMMANDS.md` to the paths of the test that no text of the kit names the status `planned` (R13). They fail (R19)
- [x] Create `COMMANDS.md` with a heading `# Commands` and a line of what it holds, and move into it, as they are,
  "Commands" with each command's section, "Exit statuses" and "Running a role" of `README.md`. Their headings go up
  one level. `package.json` gets `COMMANDS.md` in `files` after `SANDBOX.md`, and "What is here" in the README a
  row for it (R3, R19)
- [x] Correct every reference that now crosses a document (R10):
    * in `COMMANDS.md`, a link or a quoted name of a section that stays in the README or goes to another document,
      such as "See "The sandbox"" under `sandbox.sh`, "Replacing a role or the standards" under `agentrite run` and
      the sections of the orchestrator, names `README.md` for now. The moves below correct it again to the document
      the section reaches
    * in `README.md`, `SANDBOX.md`, `CONTRIBUTING.md` and `AGENTS.md`, every link to `#commands`, to the section of
      a command, to `#exit-statuses` or to `#running-a-role`, and every quoted "Commands" or "Exit statuses" that
      names the README, points to `COMMANDS.md` (R6). Find them with
      `grep -n -E 'Commands|Exit statuses|exit-statuses|#agentrite-|#check-|#sandbox' *.md`
    * the comment of `templates/project/sandbox.sh` names the kit's `COMMANDS.md` for the command (R13)
- [x] Run `npm test`, which runs the test of the links, and commit (R3, R6, R10, R13, R19)
- [x] Merge "Running a role" into the section of `agentrite run` and remove it as a section (R4). Take each
  statement of "Running a role" in turn. One that the section already makes is dropped; one that it does not make is
  added to the section, in its wording. These the section already makes, and are dropped:
    * the role not named by `roles` is refused, naming the role and the roles of the project, and the refusals of
      `agentrite roles` hold: they stay as the section's opening paragraph says them
    * the command exits with the harness's status, or 1 for a signal: it stays as the section's paragraph of exit
      statuses says it
    * what each option is: the table stays, and the bullets of the options that say more than its row are added
      below it whole, as they are written

  The rest is added after the table, in the order "Running a role" has it: the harness started in the directory
  the command is run from with the one prompt, the two examples, the bullets of the unit and of the sandbox, the
  options, what the harness is given, stopping a run, resuming a session, and the list of refusals with the refusals
  that the opening paragraph already gives removed from it. "See "Running a role"." is removed. Each change is
  recorded in the section map of the record (R11)
- [x] Correct every reference to "Running a role", in every document and in the shipped code, to the section of
  `agentrite run` of `COMMANDS.md`. Run `npm test` and commit (R4, R6)
- [x] Add to `tests/document-links.test.mjs` a test that the table has a row for each form that the first block of
  each command's section under "Commands" gives, in that order, a line that continues a form, as the second of
  `agentrite run`, joined to it; that the second column is at most 60 characters; and that the third is a link to
  that section. It fails (R5)
- [x] Write the table at the top of `COMMANDS.md`, after its opening line and before "Commands" (R5). Its columns
  are the synopsis, what the command does and the section. One row per form, in the order of the sections: the two
  forms of `agentrite init`, `config`, `refresh`, `roles`, `units`, `approve`, `run`, `orchestrate`, `runs`, the two
  forms of `check-changes`, `check-commit-message`, and the four forms of `sandbox.sh`
    * the synopsis is the form as the command's section gives it in its block, with every argument and option, in
      inline code, on one line; a `|` in it is written `\|`
    * what the command does is at most 60 characters, counted without the Markdown, and says what it does, not how
    * the section is a link to the command's section in `COMMANDS.md`
- [x] Run `npm test` and commit (R5)

### The orchestrator

- [x] Point the test of the default definition in `tests/package-documents.test.mjs` at `ORCHESTRATOR.md`, add
  `ORCHESTRATOR.md` to `files` there and to the paths of the test of the status `planned`. They fail (R13, R19)
- [x] Create `ORCHESTRATOR.md` and move into it "The orchestrator" with "The definition", "The outcome of a step",
  "How a run ends", "What .orchestrator holds" and "On the host and in the sandbox", as they are, headings up one
  level. Add it to `files` after `COMMANDS.md` and to "What is here" (R7, R19)
- [x] Correct the references that now cross a document: from `ORCHESTRATOR.md` to the commands, to the setup and
  to the sandbox; from `COMMANDS.md`, as the section of `agentrite orchestrate` and of `agentrite runs`; from
  `SANDBOX.md`, whose "See "The orchestrator" of `README.md`" names `ORCHESTRATOR.md`; and in the code and templates,
  found with `grep -rn -E '"(The orchestrator|The definition|The outcome of a step|How a run ends|What .orchestrator
  holds|On the host and in the sandbox)"' scripts container templates pointers` (R10, R13)
- [x] Run `npm test` and commit (R7, R10, R13, R19)

### The setup

- [x] In `tests/agentrite-hook.test.mjs` and `tests/agentrite-instructions.test.mjs`, the expected messages name
  `node_modules/agentrite/SETUP.md` in place of `README.md`, rewrapped as the notices wrap. In
  `tests/package-documents.test.mjs`, add `SETUP.md` to `files` and to the paths of the test of `planned`. They fail
  (R13, R19)
- [x] Create `SETUP.md` and move into it, as they are and in this order, "Installing it into a project" with "How
  the kit's instructions reach an agent" and "On a fresh clone", "Git hooks", "The project's settings", "Replacing a
  role or the standards", "Adding a role" and "Updating a project to a newer kit", headings up one level. Add it to
  `files` after `ORCHESTRATOR.md` and to "What is here" (R8, R19)
- [x] The messages name `SETUP.md`: `SECTION` of `scripts/agentrite-hook.mjs` and of
  `scripts/agentrite-instructions.mjs`, the message of `container/sandbox.sh` at "Installing it into a project", and
  the comment of `templates/project/commit-msg`. Run the two test files (R13)
- [x] Correct the references that now cross a document, in every document: the README's intro and "How it works"
  link "Replacing a role or the standards" and "Adding a role" in `SETUP.md`; `COMMANDS.md` and `ORCHESTRATOR.md`
  name `SETUP.md` for these sections; `SANDBOX.md`'s "Git hooks" in `README.md` links `SETUP.md` (R6, R10, R12)
- [x] Run `npm test` and commit (R8, R10, R12, R13, R19)

### The sandbox

- [x] Move what "The sandbox" of the README holds and `SANDBOX.md` does not into `SANDBOX.md`, by what the reader is
  doing (R9). Take each statement in turn and either name the place of `SANDBOX.md` that already makes it, or move
  it there, in its wording:
    * a new section "Before the first run", first after the list of sections and linked from it: what a run needs,
      the three files that configure a project's sandbox, and of what a run does that `SANDBOX.md` does not say, the
      image built on first use, the shell opened or the command appended run instead, and `--rebuild`
    * at the top of "What the sandbox defends against": what it confines, and the table of what of the host is
      reachable besides `/work`, with the sentence on `~/.gitconfig`
    * the statements of what a run does that "Running a unit", "Running on the tree as it is", "Two agents on one
      unit", "Two implementations of one unit" and "The bell" already make stay there and are not repeated
- [x] Correct the opening of `SANDBOX.md`, which says the commands are in "Commands" of `README.md` and what the
  sandbox confines is in "The sandbox" there: the commands are in "Commands" of `COMMANDS.md`, and what it confines
  is in "What the sandbox defends against" (R6, R10)
- [x] Replace "The sandbox" of the README by a paragraph of at most five lines that says what the sandbox is and
  links `SANDBOX.md`, as the subsection "The sandbox" after "The name" (R2). Correct the references to the README's
  "The sandbox" in `COMMANDS.md`, as under `sandbox.sh`, to `SANDBOX.md` (R10)
- [x] Run `npm test` and commit (R2, R9, R10)

### The README

- [x] Order the README as R1 gives it and write its new parts (R1, R2):
    * what the kit is: the opening as it is, with its list of sections replaced by the map of the documents below,
      then "The name" and "The sandbox"
    * the components diagram, as the image of R15
    * "Quick start": `npm install --save-dev agentrite`, `npx agentrite init claude opencode` with a sentence that
      only the harnesses the project uses are named, then the steps of a first unit, each with its command:
      specifying in a session of the harness with the specifier as its agent, as `claude --agent specifier` (check
      the option with `claude --help` on the host); approving with `npx agentrite approve 0001`; the sandbox with
      `./sandbox.sh 0001`; planning, implementing and reviewing with `npx agentrite run planner claude 0001`,
      `npx agentrite run implementer claude 0001` and `npx agentrite run reviewer opencode 0001`, or all three with
      `npx agentrite orchestrate 0001`; leaving the sandbox with `exit`, which brings the branch back; merging with
      `git merge` of the unit's branch on the default branch. It ends with a link to `SETUP.md` for everything else
      about installing. Each command is checked against its section in `COMMANDS.md`
    * "How it works": the unit, the roles table and its paragraphs as they are, then the statuses: `draft`,
      `approved`, `in-progress`, `implemented`, and `cancelled` from any of the first three, each with who sets it,
      as `process.md` gives them, then the workflow diagram as the image of R15, then the numbered list as it is
    * "The documents": a list of `COMMANDS.md`, `ORCHESTRATOR.md`, `SETUP.md`, `SANDBOX.md`, `CHANGELOG.md` and
      `CONTRIBUTING.md`, each a link with the question its reader brings to it
    * "What is here", with the rows of the three documents
- [x] Check that the README holds no part of a section that R4, R7 and R8 moved, and that the test of the links
  passes. Run `npm test` and commit (R1, R2, R12)

### The diagrams

- [x] In `tests/package-documents.test.mjs`, tests written before what they test:
    * `diagrams/` holds, for each `<name>.mmd`, a `<name>.svg`, and no other file, and the sources are
      `components.mmd` and `workflow.mmd` (R14)
    * the root `<svg>` element of each SVG has a `style` whose `background-color` is `white` (R16)
    * `README.md` holds, for each diagram, an image whose address is
      `https://raw.githubusercontent.com/norareit/agentrite/master/diagrams/<name>.svg` and whose alternative text
      is not empty (R15)
    * the script `diagrams` of `package.json` runs `npx` with `@mermaid-js/mermaid-cli` at an exact version, and
      `devDependencies` holds `agentrite` alone (R17)
    * `files` holds no `diagrams` (R18)
- [x] Add to `package.json` the script `diagrams`, which runs over every `diagrams/*.mmd` the pinned Mermaid command
  line and writes the SVG beside it with a white background, stopping at the first that fails:
  `for source in diagrams/*.mmd; do npx --yes @mermaid-js/mermaid-cli@11.4.2 --input "$source" --output
  "${source%.mmd}.svg" --backgroundColor white || exit 1; done`. Check with `npm view @mermaid-js/mermaid-cli
  versions` that 11.4.2 is published, and take the newest 11 release that is at least two weeks old if it is not
  (R16, R17)
- [x] Write `diagrams/components.mmd`, a flowchart of what R14 lists for the components: the process and the
  standards, the kit's four roles and a project's own, the units in `changes/`, the role wrappers of the harnesses,
  `agentrite run`, the orchestrator and the sandbox. Its edges are labelled `reads`, `runs` or `starts`: a role reads
  the process and the standards; a wrapper reads its role; `agentrite run` starts a harness with a wrapper; the
  orchestrator runs `agentrite run`; the sandbox runs the harness, `agentrite run` and the orchestrator; a role reads
  and writes the units (R14)
- [x] Write `diagrams/workflow.mmd`, a flowchart of the workflow as R14 gives it: specifying with the human, the
  human's approval, the sandbox, planning, implementing, the review and its fixes as a loop back to implementing,
  leaving the sandbox, and merging. The steps of the human and those of an agent are two classes with their own
  fill, and a legend of the two; the orchestrator is a path beside planning to the review's fixes, marked as the
  alternative (R14)
- [x] On the host, run `npm run diagrams` and look at both SVGs in a light and a dark viewer. In the sandbox, which
  cannot download the browser, leave this task open, log in `record.md` that the SVGs await `npm run diagrams` on
  the host, and hand the unit over there (R16, R17)
- [x] Put the two images into the README where the tasks of the README placed them, each with alternative text
  that says what the diagram shows, as `![The components of the kit: ...](https://raw.githubusercontent.com/...)`
  (R15)
- [x] In `CONTRIBUTING.md`, describe `npm run diagrams` under "Commands", after `npm run kit`, as the other commands
  are: its block, what it does, that it takes no argument, that it runs a pinned Mermaid command line through `npx`,
  which downloads a browser on its first run, that it runs on the host, and how it exits. Add the row of
  `diagrams/` to "What the repository holds besides the package" (R17, R18)
- [x] Run `npm test` and commit, with the SVGs once they are generated (R14 to R18)

### The rules

- [x] In "Line limit" of `AGENTS.md`, say that a line of a Markdown table may be longer than 120 characters, in
  every document of the repository, and that every other line keeps the limit (R25)
- [x] Rewrite "The documents" of `AGENTS.md` (R20 to R25):
    * open with a table of `README.md`, `COMMANDS.md`, `ORCHESTRATOR.md`, `SETUP.md`, `SANDBOX.md` and
      `CONTRIBUTING.md`, with the question each reader brings and what goes in each
    * a unit changes the README only when it changes what the kit is, the quick start, a component or the
      workflow, and otherwise at most by a line of the map of the documents
    * the rule that the commands are complete names `COMMANDS.md`, and that a command added, changed or removed
      changes its row of the table at the top of `COMMANDS.md`
    * a unit that changes a source in `diagrams/` generates its SVG with `npm run diagrams` and commits both in the
      same unit, and a unit that changes a component or the workflow changes its diagram
    * the rule on the tables of `SANDBOX.md` keeps that a table there is a Markdown table and that it holds no HTML,
      and drops that its lines fit the limit and that what does not fit is written as text
    * every other rule keeps its wording, its meaning and its strength, with the document it names corrected where
      the content moved: "The two tables" still names "What is here" of `README.md`, and the rules of `SANDBOX.md`
      stay as they are
- [x] Point "Exit statuses" of `AGENTS.md` to `COMMANDS.md#exit-statuses`, and add `COMMANDS.md`, `ORCHESTRATOR.md`
  and `SETUP.md` to its list of what to read, each with what it is the source of truth on (R6, R22)
- [x] Check that no test or check limits the number of lines of a document: `grep -rn -i 'lines' tests/*.mjs
  scripts/check-changes.mjs` shows none that counts the lines of a document (R24)
- [x] Run `npm test` and commit (R20 to R25)

### The record

- [x] In `record.md`, a log entry with the map of the README as it was at `2a20348`: every heading of the list
  below, and where it went, by document and heading, with the statements of "Running a role" that the merge
  dropped and why, and the statements of "The sandbox" that `SANDBOX.md` already made and where (R11). The headings:
  "AgentRite" with its opening, "The name", "What is here", "How it works", "Commands" with "agentrite init",
  "agentrite config", "agentrite refresh", "agentrite roles", "agentrite units", "agentrite approve",
  "agentrite run", "agentrite orchestrate", "agentrite runs", "check-changes", "check-commit-message" and
  "sandbox.sh", "Exit statuses", "Running a role", "The orchestrator" with its five subsections, "Installing it into
  a project" with its two, "Git hooks", "The project's settings", "Replacing a role or the standards", "Adding a
  role", "Updating a project to a newer kit" and "The sandbox"
- [x] Commit the record

## Verification

- [x] `npm test` passes (R27)
- [x] `npm run check-changes` passes (R27)
- [x] `git diff 2a20348 -- README.md COMMANDS.md ORCHESTRATOR.md SETUP.md SANDBOX.md` read section by section
  against the map of the record: every moved line is in its new place with its wording, but for the changes R10
  allows (R10, R11)
- [x] `grep -rn 'README' scripts container templates pointers tests` names no section that moved (R13)
- [x] Every line of the changed documents that is not a line of a table is at most 120 characters:
  `awk 'length > 120 && !/^\|/ {print FILENAME": "FNR}' *.md changes/0094-split-the-readme/*.md` prints nothing
- [x] `npm pack --dry-run` lists `COMMANDS.md`, `ORCHESTRATOR.md` and `SETUP.md`, and nothing under `diagrams/` (R18,
  R19)

## Commit Points

- [x] `feature-0094 Test that the links between the documents resolve`
- [x] `feature-0094 Move the commands and the exit statuses into COMMANDS.md`
- [x] `feature-0094 Merge Running a role into agentrite run`
- [x] `feature-0094 Open COMMANDS.md with a table of every command`
- [x] `feature-0094 Move the orchestrator into ORCHESTRATOR.md`
- [x] `feature-0094 Move the installation and the configuration into SETUP.md`
- [x] `feature-0094 Move what the README says of the sandbox into SANDBOX.md`
- [x] `feature-0094 Make the README a landing page`
- [x] `feature-0094 Add the diagrams of the components and the workflow`
- [x] `feature-0094 Say in AGENTS.md what goes in which document`
- [x] `feature-0094 Record where each section of the README went`
