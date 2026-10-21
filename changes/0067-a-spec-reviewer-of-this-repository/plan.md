# 0067 A spec reviewer of this repository

## Approach

The kit already does what the role needs: `refresh` of the installed release, 7.3.0, writes the wrappers of an extra
role named in `roles` and names it in `.agentrite/instructions.md`, and `roles` lists it after the four. A dry run in
a copy of the tree showed `refresh` writing `.claude/agents/spec-reviewer.md` and
`.opencode/agents/spec-reviewer.md`, refreshing `.agentrite/instructions.md`, and finding every other file up to
date. The work is therefore the role file, one line of `agentrite.json`, the files `refresh` writes, and the
documents. No code of the kit changes.

Requirement 1 makes the root `agentrite.json` differ from the installed release's default file, which
`tests/repository-own-files.test.mjs` asserts it equals byte for byte (unit 0054, requirement 24), and which "The
kit's own copy of the kit" of `CONTRIBUTING.md` states. Both change with the unit: the root file is the default file
with the roles of this repository's own added to `roles` after the four, and nothing else differs. The test checks
that by the text, so that a change to the formatting of the default file still shows, and the order of the roles
with it. The second test of that file, that `refresh` finds every file up to date and that the copy holds nothing
but the tracked files, then covers requirement 3 once the wrappers and the list are committed.

The role file follows the structure of the kit's reviewer: front matter, a heading, a short statement of what the
role is, its input and output, the instruction to read `process.md` and the standards, then a section for each of
when it runs, what it judges against, what it looks for, how it reports, where the findings go, what it changes, a
second review, and its record entry and commit. Its links work from `extra-roles/`: `process.md` is
`../node_modules/agentrite/process.md`, and the standards and the specifier's role file are named as the files that
`.agentrite/instructions.md` names, as the kit's role files name them. Its findings file is
`.reviews/<unit-directory>/spec-review-<instant>.md`, the instant in UTC as `2026-10-21T195515Z`, so that its name
says it is a review of the spec and no two reviews share a name. Its record entry and its commit carry the prefix of
the reviewed unit's kind and number, as `process.md` gives the prefixes, as the specifier's commits of a spec do.

The description in the front matter, which the wrappers and `roles` show:

> Reviews the spec of a draft change unit, or the record of a draft task, before the human approves it, and reports
> its findings. It changes nothing but its findings file and its one entry in the unit's record.md. Use once the
> specifier has written the unit. Dispatch it with the unit directory.

## Files

- `extra-roles/spec-reviewer.md`: new, the role file
- `agentrite.json`: `spec-reviewer` added to `roles` after `reviewer`, with the path `extra-roles/spec-reviewer.md`;
  the rest of the file as it is, `harnesses` on one line among it
- `.claude/agents/spec-reviewer.md`, `.opencode/agents/spec-reviewer.md`, `.agentrite/instructions.md`: as
  `npm run kit -- refresh` writes them
- `tests/repository-own-files.test.mjs`: the test of the root `agentrite.json`; a test that the package leaves
  `extra-roles/` out; a test of the listing of `roles`
- `CONTRIBUTING.md`: the row of `extra-roles/` in "What the repository holds besides the package"; the statement on
  the root `agentrite.json` in "The kit's own copy of the kit"

## Tasks

The tests:

- [x] In `tests/repository-own-files.test.mjs`, change the test of unit 0054, requirement 24, to assert that the root
  `agentrite.json` is the installed release's default file with the line
  `    "spec-reviewer": "extra-roles/spec-reviewer.md"` added after the line of `reviewer`, and a comma ending that
  line, and differs from it in nothing else, comparing the texts. Keep its assertion that `files` of `package.json`
  does not hold `agentrite.json`. Name the test for what it now checks and mark it with unit 0054, R24 and unit
  0067, R1. It fails before the tasks of the role (R1)
- [x] Add to the same file a test that no entry of `files` of `package.json` is `extra-roles` or a path under it,
  marked unit 0067, R2, and a test that `node_modules/agentrite/scripts/agentrite.mjs roles --json`, run at the
  root, lists the names `specifier`, `planner`, `implementer`, `reviewer`, `spec-reviewer` in that order, with the
  path `extra-roles/spec-reviewer.md` for the last, marked unit 0067, R1 and R3. The second fails before the tasks of
  the role (R2, R3)

The role:

- [x] Write `extra-roles/spec-reviewer.md`, opening with the front matter of a role file in the folded form, holding
  the description of "Approach" and nothing else, then a heading `# Spec reviewer` (R2, R4)
- [x] In it, the opening: that it reviews the documents of a unit before the human approves them and reports, and
  changes nothing under review; its input, the unit directory; its output, its findings in its response and in its
  findings file, and one entry in `record.md`; then the instruction to read `process.md`, linked as
  `../node_modules/agentrite/process.md`, and the project's standards, the file `.agentrite/instructions.md` names,
  first, worded as the kit's role files word it, and to read the specifier's role file that
  `.agentrite/instructions.md` names (R5, R7)
- [x] A section on when it runs: after the specifier and before the human approves, on a unit whose status in
  `record.md` is `draft`; on a unit of another status it says the status, does nothing else and stops, writing no
  findings file and no record entry; it sets no status, which stays with the four roles (R6)
- [x] A section on what it judges against: the specifier's role file for what a spec, and a task's record, must hold;
  `process.md` and the standards; and the repository as it is on the default branch for every statement of what
  exists today, as a command, an option, a file, a key of `agentrite.json` or how a harness behaves, which it checks
  by reading the files and running the commands that show it. Where it cannot check one, as a harness it cannot run,
  it says that it could not, and does not judge it (R8, R9)
- [x] A section on what it looks for, listing the seven kinds of finding of requirement 9 as the spec words them, and
  saying that it does not grade a decision recorded with its rationale, only whether the rationale still fits; and
  that it proposes no feature, something it would add being a finding only where the request needs it (R9, R10)
- [x] A section on how it reports: each finding numbered `F1`, `F2` and on, with where it is in the documents, as
  the file and the number of the requirement or the decision, what is wrong, why it matters, and its kind among
  those it looks for, said plainly as none of them when it has none; the same findings in its response and in
  `.reviews/<unit-directory>/spec-review-<instant>.md`, the instant in UTC as `2026-10-21T195515Z`, the directory
  made when it is not there (R7, R11)
- [x] A section on where the findings go: to the human and to the specifier; the human decides each, the specifier
  changes the spec, and the spec reviewer changes neither; the findings block nothing, neither the approval, which
  is the human's, nor `implemented`, for which what blocks is in `process.md` (R12)
- [x] A section on what it changes: nothing under review, no document of the unit and no other file, but its
  findings file and its record entry, worded as firmly as the kit's reviewer words it (R13)
- [x] A section on a second review: when `record.md` holds an entry `as the spec-reviewer` already, the review is a
  delta review; it takes the commit that the last such entry names, verifies each finding of that review that a
  later entry of the record says was accepted, reviews what changed in the unit's documents since that commit, by
  `git diff <commit> -- <unit directory>`, and names that commit in its findings and its entry (R14)
- [x] A section on its record entry and its commit: one entry, appended under `## Log` as `process.md` gives the
  format, `as the spec-reviewer`, saying that it reviewed, whether fully or as a delta, which documents at which
  commit, and the labels of its findings, or that it had none, and nothing of their outcomes; committed on the
  default branch, in a commit that holds nothing but that unit's own documents, with the prefix of the unit's kind
  and number, as `process.md` says of what is written before the approval (R15, R16)
- [x] Add `"spec-reviewer": "extra-roles/spec-reviewer.md"` to `roles` of `agentrite.json`, after `reviewer`, by
  hand, keeping the formatting of the rest. Run `npm run kit -- refresh` and check that it wrote the two wrappers and
  refreshed `.agentrite/instructions.md`, found every other file up to date, and that neither wrapper pins a model.
  Run `npm run kit -- roles` and check that `spec-reviewer` follows the four with the description of "Approach".
  The tests of the first two tasks pass (R1, R3)

The documents:

- [x] Add a row `extra-roles/` to "What the repository holds besides the package" of `CONTRIBUTING.md`, after
  `.opencode/`, saying that it holds the roles of this repository's own, which are not in the package, keeping the
  table aligned and within 120 characters (R17)
- [x] Change the statement in "The kit's own copy of the kit" of `CONTRIBUTING.md` that the root `agentrite.json`
  is the installed release's default file byte for byte, so that it says it is that file with the roles of this
  repository's own added to `roles` after the four, and nothing else differs, which the suite checks (R1)
- [x] Change the statement in "The kit's own tests" of `CONTRIBUTING.md` that two tests judge this repository's
  own files against the installed release and fail without `npm ci`, so that it says three: the test of the listing
  of `roles` runs the installed release's `roles` too (R3)

## Verification

- [ ] `npm test` passes on the committed tree
- [ ] `npm run check-changes` passes on the committed tree
- [ ] `npm run kit -- refresh` at the root prints `up to date` for every file and changes nothing
- [ ] Each of requirements 4 to 16 is checked against the text of `extra-roles/spec-reviewer.md`, and each of its
  links resolves from `extra-roles/`
- [ ] Every line of the changed and new files is within 120 characters

## Commit Points

- [x] `feature-0067 Plan the unit`: `plan.md` and the planner's entry in `record.md`
- [x] `feature-0067 Add the spec reviewer as a role of this repository`: the tasks of the tests and of the role,
  which only pass together
- [x] `feature-0067 Name extra-roles in the documents`: the tasks of the documents
- [ ] `feature-0067 Record the verification`: the ticks of "Verification" and the entry in `record.md` that says
  what was run on the committed work
