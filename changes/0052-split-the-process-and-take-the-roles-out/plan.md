# 0052 Split `process.md`, and take the roles out of it

## Approach

The work is in four steps, each a commit of its own, so that a reviewer can check the move of text apart from the
rewriting of it:

1. **The split, as a move.** `process.md` is cut in two along requirements 2 and 3, and `standards.md` is added to the
   package. The text moves word for word. Only the opening of each file is new (R5), so that requirement 4 can be
   checked by comparing lines
2. **The roles out, and `planned` dropped.** `process.md` is rewritten where it names a role or the status `planned`,
   the definition of what blocks moves into it, and the role files, the record template and the implementer's
   description follow
3. **The second file loaded.** `scripts/agentrite-instructions.mjs` counts `standards.md` beside `process.md`, the
   `CLAUDE.md` and `AGENTS.md` templates name it, and `init` and `refresh` judge, amend and notice by both paths
4. **`README.md`**, made true of all of it

Tests come first in each step that changes code or a document a test reads. The suites are green on `HEAD` before
the work: `npm test` reported 572 tests, 572 passing, at `79ecca6`.

How `opencode.json` is judged, decided here so that the implementer does not re-derive it. The kit's paths are
`INSTRUCTION_PATHS = [PROCESS_PATH, STANDARDS_PATH]`, in that order, and the verdict carries the paths the file lacks:

* Nothing: lacks both; problem `it is missing`; content `{ "instructions": [<both>] }`, formatted as today
* Something that cannot be read: lacks both; problem `it cannot be read: <error>`; no content
* Not JSON, its text holding each path in quotes: loads
* Not JSON otherwise: lacks the paths its text does not hold in quotes; problem `it is not JSON: <parser error>`;
  no content
* JSON that is not an object: lacks both; problem `it is not a JSON object`; no content
* An object with no `instructions`: lacks both; problem `it has no instructions list`; content with the list added
  last, holding both
* An `instructions` that is not a list: lacks both; problem `its instructions is not a list`; no content
* A list that lacks one or both: lacks those, in the order of `INSTRUCTION_PATHS`; problem
  `its instructions list does not hold <lacks joined by " or ">`, which for one path is today's text; content with
  the lacking paths added at the end of the list, in that order
* A list that holds both: loads

The notices name what is missing by listing `lacks`, one path to a line, as the notices of `CLAUDE.md` list the lines
it lacks today. The texts are given in task 3.3.

## Files

- `process.md`: loses what moves to `standards.md`; new opening; rewritten where it names a role or `planned`; gains
  the definition of what blocks, when an approved unit may be built, and the new Roles section
- `standards.md`: new, at the root, in the package
- `package.json`: `standards.md` in `files`, after `process.md`
- `roles/specifier.md`, `roles/planner.md`, `roles/implementer.md`, `roles/reviewer.md`: the opening, and what
  requirements 9, 14, 15 and 17 change
- `templates/changes/record.md`: the status list without `planned`
- `templates/project/CLAUDE.md`, `templates/project/AGENTS.md`: name and load `standards.md`
- `scripts/agentrite-roles.mjs`: the implementer's description
- `scripts/agentrite-instructions.mjs`: the second path, the lines, the verdict and the notices
- `scripts/agentrite.mjs`: `writeOpencodeJson`'s line for a file that loads them, and the notices it passes `lacks`
- `README.md`: the sections requirement 20 names, and the sentences listed in task 4.1
- `tests/package-documents.test.mjs`, `tests/agentrite-instructions.test.mjs`, `tests/agentrite-init.test.mjs`,
  `tests/agentrite-refresh.test.mjs`, `tests/settings-update.test.mjs`, `tests/agentrite-roles.test.mjs`,
  `tests/fixtures/claude-agents/implementer.md`

Left as they are: this repository's own `AGENTS.md`, `CLAUDE.md`, `opencode.json` and the wrappers under
`.claude/agents/` and `.opencode/agents/`, which come from the installed release (non-goal; do not run `refresh` or
`init` here), `CHANGELOG.md`, `CONTRIBUTING.md`, whose rows are about this repository's own `CLAUDE.md` and
`opencode.json` and stay true, `SANDBOX.md`, whose one mention of the planner is the role and not the status, and
every unit under `changes/` but this one.

## Tasks

### 1. The split, as a move

- [ ] 1.1 In `tests/package-documents.test.mjs`, expect `standards.md` in `files` right after `process.md`, and add a
  test that `standards.md` is a file at the root and is in `files`. Run it and see it fail (R1)
- [ ] 1.2 Create `standards.md` and move into it, word for word, from `process.md`: the sections Text and
  Documentation changes, the two bullets of Commits on `Co-Authored-By` and on `Claude-Session` and other trailers,
  the section Code with How code is written, and the section Testing. Keep their heading levels: `## General
  guidelines` holding `### Text`, `### Documentation changes` and `### Commits`, then `## Code` and `## Testing` (R3,
  R4)
- [ ] 1.3 What stays in `process.md`: `## General guidelines` holding Where instructions belong, Verifying reported
  problems, and `### Commits` with the three prefix bullets alone; `## Changes` with Features, Bugs and Tasks; and
  `## Roles`, unchanged in this step (R2, R4)
- [ ] 1.4 Write the opening of each file, under its title and the line "This document contains critical instructions
  for coding agents. Follow these guidelines precisely.", which both keep (R5):
    * `process.md`: what it holds (where instructions belong, how reported problems are verified, the commit prefixes,
      the changes process and the roles); that the rules on how text, documentation, commits, code and tests are
      written are in [`standards.md`](standards.md); and, as today, that what a project is, what it is built with
      and how its commands are run belong to that project's own `AGENTS.md`, which links here for the rest
    * `standards.md`, titled `# Standards`: that it holds the rules on how text, documentation, commits, code and
      tests are written; that they hold for every role and for work in no role; that the process is in
      [`process.md`](process.md); and that what is specific to a project is in its own `AGENTS.md`
- [ ] 1.5 Add `standards.md` to `files` in `package.json`, after `process.md`. Run 1.1's tests and see them pass (R1)
- [ ] 1.6 Check the move: every non-empty line of `process.md` at `79ecca6` but its opening paragraph is a line of the
  new `process.md` or of `standards.md`, and no line was added to either but the openings of 1.4 and the duplicated
  heading `### Commits` and `## General guidelines`. A script in the scratchpad that compares the lines does it; log
  what it reported in `record.md` (R4)

### 2. The roles out of `process.md`, and `planned` dropped

- [ ] 2.1 Add to `tests/package-documents.test.mjs`, and see each fail:
    * `process.md` with its example log block (the fenced `markdown` block) removed matches no
      `/specifier|planner|implementer|reviewer/i`, and the block holds `as the implementer` and no other role (R6, R7)
    * None of `process.md`, `standards.md`, `roles/*.md`, the files under `templates/`, and `README.md` holds the
      text `` `planned` `` or `| planned`, and `templates/changes/record.md` has the status line
      `status: [draft | approved | in-progress | implemented]` (R10, R13)
    * Each of the four role files holds `Read [process.md](../process.md) and [standards.md](../standards.md) first`.
      This replaces the test of unit 0048 that holds `Read [process.md](../process.md) first`, which the new text no
      longer contains (R17)
    * `roles/planner.md` holds "needs no plan" (R14)
    * The `## Roles` section of `process.md` names no file under `roles/` and holds the words "`AGENTS.md`" (R8)
- [ ] 2.2 In `tests/agentrite-roles.test.mjs`, set the expected implementer description to
  "Builds an approved change unit and keeps its documents true. Use once the unit is approved, with its plan where
  its kind needs one. Dispatch it with the unit directory.", and write `tests/fixtures/claude-agents/implementer.md`
  as `plannedFiles(['claude'])` renders it with that description: the folded block wrapped at 120 characters as the
  other fixtures are. See both tests fail (R16)
- [ ] 2.3 Set `IMPLEMENTER_DESCRIPTION` in `scripts/agentrite-roles.mjs` to that text. Leave the other three
  descriptions, the specifier's "before anything is planned or implemented" among them (R16, R13)
- [ ] 2.4 Rewrite in `process.md`, under `## Changes` (R6, R7, R9, R10, R11, R12):
    * The bullet on `spec.md`: "what was left out as beyond the request", for "what the specifier left out"
    * The log format: "Then, for an agent that acts in a role, comes `as the <role>`, with the name of the role it
      acts in", for "with one of the four roles below"; the rest of that bullet stays
    * The example: two entries, `- 2026-10-07T11:51:06Z [human] approved the spec. The status is `approved`` as today,
      and `- 2026-10-07T11:52:40Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, began the work. The
      status is `in-progress``, wrapped as the current second entry is
    * The status paragraph: the statuses are `draft`, `approved`, `in-progress` and `implemented`, and every kind of
      unit goes through them in that order. `approved` says that the human approved the spec, or for a task its
      record. An approved unit may be built: a task always; a bug when it has a `plan.md`, or a log entry in its
      `record.md` that says it needs no plan; a feature when it has a `plan.md`. Nobody approves a plan. Drop the
      sentences on `planned` and "A task goes from `approved` to `in-progress`, and is never `planned`"
    * What blocks: replace "What blocks is defined in [`roles/reviewer.md`](roles/reviewer.md), and a limitation
      already recorded as a decision does not." by the definition: a finding of a review blocks in exactly two
      cases, as two bullets: a requirement in `spec.md` is false, under the usage the spec says the unit supports
      and the threat model it states, and a requirement that holds for supported usage and fails only outside it is
      not false; or a rule in `process.md` or in `standards.md` is broken, and no decision in `spec.md` or
      `record.md` records an exception to it. Every other finding does not block, and neither does a limitation
      recorded as a decision
    * "The reviewer saves its complete findings in the ignored `.reviews/<unit-directory>/` directory." becomes "A
      review's findings are saved in full in the ignored `.reviews/<unit-directory>/` directory."
    * The paragraph on when the spec and the plan are written keeps "The plan is written when the unit is next to be
      built and not before", and drops "and nobody approves it: once the unit is `planned`, the implementer may
      begin", which the status paragraph now says
    * "What the specifier writes, and the approval, are committed on the default branch: a unit's `spec.md` and
      `record.md` while its status is `draft` or `approved`." becomes "What is written before the approval, and the
      approval itself, are committed on the default branch: the unit's `spec.md` and `record.md`."
    * The branch: "The branch is cut from the head of the default branch when work on the unit starts after its
      approval: the planning of a feature or a bug, and the work itself of a task, and not earlier." "a role run on
      the host cuts it itself" becomes "a session on the host cuts it itself", and "that holds for the specifier's
      commits too" becomes "that holds for the commits of the spec too"
- [ ] 2.5 Rewrite `## Roles` of `process.md`: the work in `changes/` is done in roles, and the project's `AGENTS.md`
  names the role files; a role's file is read at the point the role is taken on, whether or not the tool running
  the session can delegate to a separate agent; a session that takes on several roles in turn reads each one's file
  as it takes that role on; work in no role follows `process.md`, [`standards.md`](standards.md) and the project's
  `AGENTS.md` alone. No list of role files and no count of roles (R8)
- [ ] 2.6 Open each role file with "Read [process.md](../process.md) and [standards.md](../standards.md) first."
  and say what each holds, splitting today's list of what `process.md` holds: the commit conventions stay with
  `process.md`, and "the code and testing rules" are in `standards.md`. `roles/reviewer.md` continues ", then
  [specifier.md](specifier.md), [planner.md](planner.md) and [implementer.md](implementer.md)" as today. Where the
  specifier and the planner say "Where the two meet, `process.md` is the rule", make it name both files (R17)
- [ ] 2.7 `roles/reviewer.md`: under Code quality, "the code and testing rules in `standards.md`". Under What blocks,
  keep the first sentence and "Everything else is reported without blocking..." and the reporting sentences, and
  replace the two bullets by a reference: what blocks is defined in [`process.md`](../process.md). Under Recorded
  decisions are settled, "an exception to a rule in `process.md` or `standards.md`" (R9, R17)
- [ ] 2.8 `roles/planner.md` (R14): the output is `plan.md` where the unit gets one, or a log entry in its
  `record.md` that the unit needs no plan, holding the words "needs no plan"; the bug bullet logs that the fix
  "needs no plan" and drops "still set the status to `planned`"; Handing over logs that the plan is written, or that
  the unit needs no plan, and says that the planner does not change the status, which stays `approved`. Drop
  "Nobody approves the plan: once the unit is `planned`, the implementer may begin", which `process.md` says
- [ ] 2.9 `roles/implementer.md` (R15, R17): "You build what an approved unit describes"; the paragraph on a planned
  unit becomes: a unit may be built as `process.md` says, and given one that may not be, stop and say what is
  missing (a feature without a `plan.md`, a bug with neither a `plan.md` nor a log entry that it needs no plan).
  "Move the status to `in-progress` when you begin" stays
- [ ] 2.10 `templates/changes/record.md`: `status: [draft | approved | in-progress | implemented]` (R10, R13)
- [ ] 2.11 Run `npm test`, and see 2.1 and 2.2 pass and nothing else fail (R6, R13, R14, R16, R17)

### 3. `standards.md` loaded into every session

- [ ] 3.1 In `tests/agentrite-instructions.test.mjs`: `STANDARDS_PATH` is `node_modules/agentrite/standards.md`,
  `INSTRUCTION_PATHS` is both in order, `CLAUDE_LINES` is the three lines in order; `claudeLacks` lacks each of the
  three it does not hold, in order, and all three for a missing or unreadable file; every row of the table under
  Approach, its `lacks` among it, with a list holding only `process.md` amended by `standards.md` at its end, one
  holding only `standards.md` amended by `process.md` at its end, a not-JSON text quoting one path lacking the
  other, and the written file `{\n  "instructions": [\n    "node_modules/agentrite/process.md",\n
  "node_modules/agentrite/standards.md"\n  ]\n}\n`; and each notice of 3.3 listing the paths it is given and only
  those, with no line over 120 characters. See them fail (R18)
- [ ] 3.2 In `scripts/agentrite-instructions.mjs`: add `STANDARDS_PATH` and `INSTRUCTION_PATHS`; `CLAUDE_LINES` is
  `[@process, @standards, @AGENTS.md]`; `opencodeVerdict` follows the table under Approach and returns `lacks` in
  every `loads: false` case; update the doc comments that say "process.md" or "both" for what is now the kit's two
  paths or three lines (R18)
- [ ] 3.3 The notices for `opencode.json` take `lacks` and list it, one path to a line, as the `CLAUDE.md` notices
  list their lines (R18):
    * `opencodeInitNotice(problem, lacks)`: `opencode.json was left as it is, because <problem>.\nFor OpenCode to
      read the kit's instructions, its instructions list must hold the paths below.\nAdd them by hand:\n\n<lacks,
      one to a line>\n\n<SECTION>\n`
    * `opencodeRefreshNotice(problem, lacks)`: `opencode.json does not load the kit's instructions,\nbecause
      <problem>.\nOpenCode does not read them without the paths below in its instructions list, and refresh\ndoes
      not add them:\n\n<lacks, one to a line>\n\n<SECTION>\n`
- [ ] 3.4 In `tests/agentrite-init.test.mjs`: `CLAUDE.md` imports process, standards and `AGENTS.md` in that order,
  outside a fenced block and a code span; `CLAUDE.md` names `standards.md` in its text; `AGENTS.md` calls both
  files required reading, each in a link, and its comment says what holds for every project is in `process.md` and
  `standards.md`; `OPENCODE` is the two-path file; an object without the paths and a list holding only `process.md`
  are amended; the line for a file that loads both is
  `skipped opencode.json, which loads node_modules/agentrite/process.md and node_modules/agentrite/standards.md`;
  a not-JSON file quoting only `process.md` is left with a notice naming `standards.md`; the `CLAUDE.md` notice
  cases use three lines. See them fail (R18, R19)
- [ ] 3.5 In `tests/agentrite-refresh.test.mjs` and `tests/settings-update.test.mjs`: the loading `CLAUDE.md` holds
  the three lines and the loading `opencode.json` both paths; a `CLAUDE.md` with only the two lines of the last
  release and an `opencode.json` with only `process.md` each get a notice naming `standards.md` alone; the expected
  notices pass `lacks`. See them fail (R18)
- [ ] 3.6 `templates/project/CLAUDE.md`: the line `@node_modules/agentrite/standards.md` between the two imports; the
  prose says the file imports the kit's `process.md` and `standards.md` and `AGENTS.md`, and its list names
  [`node_modules/agentrite/standards.md`](node_modules/agentrite/standards.md) beside `process.md` for what is the
  same in every project (R18, R19)
- [ ] 3.7 `templates/project/AGENTS.md`: the first paragraph calls
  [`node_modules/agentrite/process.md`](node_modules/agentrite/process.md) and
  [`node_modules/agentrite/standards.md`](node_modules/agentrite/standards.md) **required reading** and says what
  each holds: `process.md` the changes process in `changes/`, the status progression and the freeze, and the commit
  prefixes; `standards.md` the rules on text, documentation, commits, code and tests. The comment under Specific to
  this project ends "Everything that holds for every project is in the kit's process.md and standards.md already."
  Keep the three section headings as they are, which `agentsNotice` prints (R19)
- [ ] 3.8 In `scripts/agentrite.mjs`: `writeOpencodeJson` prints the line of 3.4 for a file that loads both, from
  `INSTRUCTION_PATHS`, and passes `verdict.lacks` to `opencodeInitNotice`; `instructionNotices` passes it to
  `opencodeRefreshNotice` (R18)
- [ ] 3.9 Run `npm test`, and see 3.1, 3.4 and 3.5 pass and nothing else fail (R18, R19)

### 4. `README.md`

- [ ] 4.1 Make `README.md` true of the kit (R20), with every line within 120 characters:
    * "What is here": a row for `standards.md`, "The rules on how text, documentation, commits, code and tests are
      written", after `process.md`, whose row becomes "How work is done: the changes process, the roles, the commit
      prefixes"; widen the table if a cell needs it
    * "How it works": "The rules each role works by are in `process.md`, `standards.md` and the role's own file
      under `roles/`", and the implementer is given "An approved unit, with its plan where its kind needs one", the
      table widened to fit
    * "agentrite init": the amending of `opencode.json` adds whichever of the two paths its list lacks at the end, in
      order; a not-JSON file is left when its text holds each path in quotes; the `skipped` line of 3.4; the notice
      names the paths it lacks; the `CLAUDE.md` paragraph gives the three lines
    * "agentrite refresh": the three lines of `CLAUDE.md` and the two paths of `opencode.json`, and that the notice
      names what is missing
    * "Installing it into a project": the rows of `AGENTS.md`, `CLAUDE.md` and `opencode.json` name `standards.md`
      beside `process.md`; the bullet on an existing `CLAUDE.md` gives the three lines; the bullet on `opencode.json`
      adds whichever path is missing and leaves one that loads both
    * "How the kit's instructions reach an agent": the harness loads `process.md` and `standards.md`, and an agent
      finds the role files from `AGENTS.md`; the three lines in the block, the two-path `opencode.json`, and the
      model following the links to `process.md` and `standards.md` in `AGENTS.md`
- [ ] 4.2 `grep -n "process\.md\|planned" README.md` and read each hit, so that none says `process.md` alone where
  both are now meant, and none names the status `planned` (R13, R20)

## Verification

- [ ] `npm test` on the final tree, every test passing; log the count and the commit in `record.md`
- [ ] `npm run check-changes` on the final committed tree, passing
- [ ] The line comparison of task 1.6, logged in `record.md`
- [ ] `grep -rn "planned" process.md standards.md roles templates README.md scripts/agentrite-roles.mjs`: each hit
  read, and none names the status (`plannedFiles` and the specifier's "before anything is planned or implemented"
  are expected) (R13)
- [ ] `grep -n -i "specifier\|planner\|implementer\|reviewer" process.md`: the one hit is the example entry (R6)
- [ ] No line over 120 characters in any file the unit changes: `awk 'length > 120'` over them

## Commit Points

- [ ] `feature-0052 Move the standards out of process.md`: tasks 1.1 to 1.6
- [ ] `feature-0052 Take the roles and the status planned out of process.md`: tasks 2.1 to 2.11
- [ ] `feature-0052 Load standards.md beside process.md`: tasks 3.1 to 3.9
- [ ] `feature-0052 Make README.md true of the split`: tasks 4.1 and 4.2, and the record's entries of the
  verification
