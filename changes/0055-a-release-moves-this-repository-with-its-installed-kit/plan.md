# 0055 A release moves this repository, with its installed kit

## Approach

The unit changes this repository's own files only: `package.json`, a test, `RELEASING.md`, `CONTRIBUTING.md`,
`AGENTS.md` and `CLAUDE.md`. Nothing in `files` of `package.json` changes, and neither does `README.md`.

1. **The script.** `package.json` gets the script `kit`, `node node_modules/agentrite/scripts/agentrite.mjs`, beside
   `check-changes`, which names a file under `node_modules` the same way. npm passes what follows `--` to it, so
   `npm run kit -- roles` runs the installed release's `roles`. A test in `tests/package-documents.test.mjs` pins the
   script's text, as that file pins `prepublishOnly`. The tests need no install, so the test reads `package.json`
   and does not run the script; that it prints the installed release's roles is shown under "Verification"
2. **Saying where `npx agentrite` leads.** "Commands" of `CONTRIBUTING.md` gets a section `npm run kit`, and
   `AGENTS.md` one paragraph, under a heading of its own, for an agent that would run the kit's command here
3. **Step 6.** `RELEASING.md` runs `refresh` as `npm run kit -- refresh`. The paragraph that reads "Worth knowing
   when you update" and stops on any ask beyond the five commands becomes a procedure that sorts each instruction
   that asks a project to do something into one of four outcomes, in this order:
    * done by step 6 itself: it installs the kit, runs `refresh`, starts the sandbox, or asks for the update to be
      committed (R7)
    * asks nothing here: it holds only for some projects, and `agentrite.json` or the tracked files on `master`
      show that its condition does not hold (R8)
    * carried out: it is exact, a command word for word or a line word for word with its named file and its place;
      a kit command runs as `npm run kit --` with the same arguments (R6)
    * stops the step: not exact, a condition neither source settles, or one carried out that fails or does not do
      what it says (R8, R9)

   The reading of the tree moves after the instructions, so that it reads once and takes their changes as expected
   (R10). Putting the repository back also removes each file a command an instruction ran printed as written, since
   `git restore .` leaves an untracked file. The commit takes the files the instructions changed, and its body
   gains three lists (R11)
4. **The text that lists the kit's files.** `CLAUDE.md` and two rows of the table in `CONTRIBUTING.md` say "the kit's
   instruction files" in the place of `process.md` (R12). The opening paragraph of `AGENTS.md` takes the wording of
   7.1.0's `templates/project/AGENTS.md`: `process.md` and `standards.md` linked as required reading, and what each
   holds (R13). Read 7.1.0's text with `git show v7.1.0:templates/project/AGENTS.md`

Commits follow `process.md`: the plan first, then the implementation in three commits that each leave the suite
passing.

## Files

- `package.json`: the script `kit`
- `tests/package-documents.test.mjs`: a test of the script `kit`
- `CONTRIBUTING.md`: a section `npm run kit` in "Commands"; the rows `CLAUDE.md` and `opencode.json` of "What the
  repository holds besides the package"
- `AGENTS.md`: the opening paragraph; a section on the kit's command
- `RELEASING.md`: step 6
- `CLAUDE.md`: its prose, not its import lines
- `changes/0055-a-release-moves-this-repository-with-its-installed-kit/record.md`: log entries and the status

## Tasks

The script and where `npx agentrite` leads:

- [ ] In `tests/package-documents.test.mjs`, after the test of `prepublishOnly`, add a test that
  `packageJson.scripts.kit` is `node node_modules/agentrite/scripts/agentrite.mjs`, with a comment that says why:
  in this repository `npx agentrite` runs the working tree's command, and the script runs the installed release's.
  Run `npm test` and see that test fail (R1)
- [ ] In `package.json`, add `"kit": "node node_modules/agentrite/scripts/agentrite.mjs"` to `scripts`, after
  `check-changes`. Run `npm test` and see it pass (R1)
- [ ] In "Commands" of `CONTRIBUTING.md`, after the section `npm test`, add a section `### npm run kit` in the form
  of the others: the synopsis `npm run kit -- COMMAND [ARGUMENT...]`; that it runs the `agentrite` command of the
  installed release, `node_modules/agentrite/scripts/agentrite.mjs`, with what follows `--`, which are the commands
  and arguments "Commands" of `README.md` gives for `npx agentrite`; that in this repository `npx agentrite` runs
  the working tree's command, because the package is named `agentrite`, and `npm run kit --` the installed
  release's; that the installed copy is there after `npm ci`, as for `npm run check-changes`; and a "See" line to
  "The kit's own copy of the kit". The script adds no environment variable (R2)
- [ ] In `AGENTS.md`, add a section `## The kit's command` before `## Releasing`: in this repository
  `npx agentrite` runs the working tree's `agentrite`, not the installed release's, and the installed release's
  command is run as `npm run kit -- <command>`, with a link to "Commands" of `CONTRIBUTING.md` for the rest. Say it
  there and nowhere else in `AGENTS.md` (R3)
- [ ] Commit as `feature-0055 Run the installed kit's command with npm run kit`

Step 6:

- [ ] In the command block of step 6 of `RELEASING.md`, replace `npx agentrite refresh` with
  `npm run kit -- refresh`, leaving the other four lines as they are. Change the bullet on `refresh` under the block
  to say that it runs the `refresh` of the release just installed, and that `npx agentrite refresh` would run the
  working tree's, which "Commands" of `CONTRIBUTING.md` explains (R4, R5)
- [ ] Replace the paragraph that opens "Then read "Worth knowing when you update"" and the sentence "The step is
  those five commands." with the update's instructions, placed after the bullets of the five commands and before
  the reading of the tree. Read the section of `<version>` in `CHANGELOG.md`, and take each instruction in it that
  asks a project to do something through the four outcomes of "Approach", in that order, with these words of the
  spec: what is exact (R6) as a closed list; what step 6 does itself (R7); a condition settled by `agentrite.json`
  or by what the tracked files on `master` hold, such as the status in each `record.md` under `changes/` or the
  text of `AGENTS.md` (R8); and that each instruction carried out is checked against what the instruction says it
  does, by what its command printed and by reading the file it named (R9). Keep the list of what was carried out,
  taken as done and found not to hold, with why, for the commit (R11) (R6, R7, R8, R9)
- [ ] Move "Then read `git status --short` and `git diff package.json`" after the instructions, and widen what it
  expects: beside `package.json`, `package-lock.json` and the files `refresh` printed as written or refreshed, the
  files an instruction named and those a command it ran printed as written or changed. A change to any other file
  still stops the step, and `package.json` still differs by the one version (R10)
- [ ] In the list of what stops the step, replace "The release asks this repository for more than the five
  commands. Name the file and the line" with: an instruction is not exact; its condition is settled by neither
  `agentrite.json` nor the tracked files; or one carried out fails or does not do what it says. Each names the
  instruction and why the step stopped (R9)
- [ ] In putting the repository back, remove each file a command an instruction ran printed as written, beside
  those `refresh` printed as written. Keep `git restore .` and `npm ci` as they are (R9)
- [ ] In the commit, add the files the instructions changed to what is committed. Add to the body's list: each
  instruction carried out and what came of it; each taken as done by the five commands; each whose condition does
  not hold here, with why (R10, R11)
- [ ] Read step 6 through and see that no text of `RELEASING.md` tells a reader to run the installed release's
  command with `npx agentrite`, and that `npx agentrite-roles` in step 5 is unchanged (R4)
- [ ] Commit as `feature-0055 Have step 6 carry out what a release asks when it is exact`

This repository's text:

- [ ] In `CLAUDE.md`, in the paragraphs above `## Repository Instructions`, replace each mention of the kit's
  `process.md` with the kit's instruction files: those every project follows "are in the kit's instruction files";
  one that every project follows is edited in "the kit's instruction files at the root"; the file "imports the
  kit's instruction files and `AGENTS.md` into Claude Code". Leave the import lines as they are (R12)
- [ ] In "What the repository holds besides the package" of `CONTRIBUTING.md`, write the row of `CLAUDE.md` as "The
  bridge that imports the kit's instruction files and `AGENTS.md` into Claude Code" and the row of `opencode.json`
  as "The configuration that loads the kit's instruction files into OpenCode". Re-pad the table so that its columns
  line up and no line passes 120 characters (R12)
- [ ] Rewrite the opening paragraph of `AGENTS.md`, from "We eat our own dog food" to "nothing is stated in both
  places.", keeping "We eat our own dog food: this project uses AgentRite" and its last sentence.
  [`node_modules/agentrite/process.md`](node_modules/agentrite/process.md) and
  [`node_modules/agentrite/standards.md`](node_modules/agentrite/standards.md) are **required reading** before any
  change; `process.md` holds the changes process in `changes/`, the status progression and the freeze, and the
  commit prefixes; `standards.md` holds the rules on text, documentation, commits, code and tests, as 7.1.0's
  template words them. It no longer says that `process.md` holds the documentation rules or the code and testing
  standards (R13)
- [ ] Commit as `feature-0055 Stop listing the kit's instruction files, and name standards.md in AGENTS.md`

Closing:

- [ ] Run everything under "Verification", and log in `record.md` what it showed

## Verification

- [ ] `npm test` passes
- [ ] `npm run check-changes` exits 0, after the last commit
- [ ] `npm run --silent kit -- roles` prints what `node node_modules/agentrite/scripts/agentrite.mjs roles` prints,
  the implementer as "Builds a planned change unit", and `npx agentrite roles` prints the working tree's,
  "Builds an approved change unit" (R1)
- [ ] `awk 'length > 120' RELEASING.md CONTRIBUTING.md AGENTS.md CLAUDE.md` prints nothing
- [ ] `grep -n 'npx agentrite' RELEASING.md CONTRIBUTING.md AGENTS.md` shows only `npx agentrite-roles` and the
  sentences that say what `npx agentrite` runs here, none that tells a reader to run it (R4)
- [ ] `git diff master --stat` names no path in `files` of `package.json`, and not `README.md`
- [ ] Step 6, read against the 7.1.0 section of `CHANGELOG.md` as a dry run without running it: the install and
  `refresh` are taken as done; `npx agentrite init` runs as `npm run kit -- init`; the line of `CLAUDE.md` is
  exact and carried out; the instruction on `planned` units does not hold, as no `record.md` says
  `status: planned` once this unit is implemented; the instruction on `AGENTS.md` does not hold, as `AGENTS.md`
  names `standards.md`. Nothing in the procedure leaves the agent a choice the spec does not settle (R6 to R11, R13)

## Commit Points

- [ ] `feature-0055 Plan the unit`: `plan.md` and `record.md`
- [ ] `feature-0055 Run the installed kit's command with npm run kit`
- [ ] `feature-0055 Have step 6 carry out what a release asks when it is exact`
- [ ] `feature-0055 Stop listing the kit's instruction files, and name standards.md in AGENTS.md`
- [ ] The record's closing entries, with the verification
