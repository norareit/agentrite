# 0037 Refactor the README

## Approach

Written against `feature-0037-refactor-the-readme`, cut from `master` at `4bcf21f`, on which `npm test` passes with
401 tests and `npm run check-changes` exits 0. The installed release is 4.2.0.

The README that everything is measured against is the one on the merge base, 1027 lines, read with
`git show "$(git merge-base master HEAD)":README.md`. It is called the base README below. No document is written by
copying a section and trimming it: each section of the base README is read, and what requirement 9 keeps of it is
written again as requirement 10 asks, a list or a table where the base README enumerates in a paragraph.

The work is three moves, each its own commit, so that at every commit a statement is in one document only:

1. The reference of the sandbox leaves the README for `SANDBOX.md`, and the README gets its brief part in its place
2. Working on the kit leaves the README for `CONTRIBUTING.md`
3. What is left of the README is rebuilt in the order of requirement 1

In the commit of each move, the statements of the base README that the move leaves out are listed in `record.md`,
under a section of its own, `## What the three documents leave out`, between the log and `## Amendments`. It has one
list per section of the base README, under that section's title, and each list says which line of requirement 9 its
statements went by, or where the same is now said. A statement that is out of date and stays is moved as it is and
named in the same section, under `Out of date, moved as it is`, for the human.

Where each section of the base README goes:

| Section of the base README          | Where it goes                                                                |
|-------------------------------------|------------------------------------------------------------------------------|
| The introduction, "The name"        | `README.md`, as they are, word for word                                      |
| "What is here"                      | `README.md`. Four rows go to the table of `CONTRIBUTING.md`                  |
| "Installing it into a project"      | `README.md`, same title. What it says of a command's arguments: the list     |
| "Installing on a fresh clone"       | `README.md`, as `### On a fresh clone` of the part above                     |
| "Updating a project to a newer kit" | `README.md`, same title                                                      |
| "Running a role"                    | `README.md`: the arguments and options to the list, the rest under the title |
| "Where to run it"                   | `README.md`, in `### On a fresh clone`. The hosts are a pointer to "Egress"  |
| "Running the sandbox", its opening  | `README.md`, "The sandbox"                                                   |
| "Starting it"                       | `README.md`: the forms to the list, the rest to "The sandbox"                |
| "Working on a clone"                | `SANDBOX.md`, as three sections, named below                                 |
| The eleven after it, to its end     | `SANDBOX.md`, each under its present title                                   |
| The last four, to "Releasing"       | `CONTRIBUTING.md`, each under its present title                              |

The titles of sections stay as they are wherever a section stays, because `CHANGELOG.md`, the comments and the
messages of the kit name them.

The headings of the three documents:

* `README.md`: `# AgentRite`, then `## The name`, `## What is here`, `## How it works`, `## The commands`,
  `## Running a role`, `## Installing it into a project` with `### On a fresh clone`,
  `## Updating a project to a newer kit`, `## The sandbox`
* `SANDBOX.md`: `# The sandbox`, then `## Working on a clone`, `## Connecting to a unit run`,
  `## What a unit run defends against`, `## Another working directory`, `## Extra directories`,
  `## The shared node_modules` with the name as code, `## The home volume`, `## The harness logs`,
  `## The harness versions`, `## The status line`, `## Logging in to a model provider`, `## Egress`,
  `## The local model server`. The second and the third are today parts of "Working on a clone" with no heading
* `CONTRIBUTING.md`: `# Working on AgentRite`, then `## What the repository holds besides the package`,
  `## The commands`, `## The kit's own tests`, `## The kit's own copy of the kit`,
  `## Trying the working copy's sandbox`, `## Releasing`

Where the four facts of requirement 11 are stated, each once, with every other mention a pointer by title:

| Fact                              | Stated in                                             |
|-----------------------------------|-------------------------------------------------------|
| The kit's own allowlist hosts     | `SANDBOX.md`, "Egress"                                |
| What `refresh` rewrites           | `README.md`, "Updating a project to a newer kit"      |
| The Playwright build argument     | `README.md`, "Installing it into a project"           |
| The `.dockerignore` exception     | `README.md`, "Installing it into a project"           |

What the planner found in the code for requirement 6, which the implementer checks again and does not take from
here:

* `scripts/agentrite.mjs`: `init` and `refresh` take one or more of `claude` and `opencode` and nothing else.
  `roles` takes `--json` and nothing else. The script reads no environment variable
* `scripts/agentrite-run.mjs`: `<role> <harness> <unit>`, `--prompt <text>` also as `--prompt=<text>`,
  `--model <id>`, `--headless`, `--skip-permissions`, and `--` with the harness's own arguments after it
* `scripts/agentrite-roles.mjs`: one or more of `claude` and `opencode`
* `scripts/check-changes.mjs`: one optional argument, the repository root
* `container/agent.sh`: a unit, `--in-place`, `--workdir DIR`, `--connect UNIT`, `--rebuild`, `--mount HOST` and
  `--mount HOST:ro`, a `--` that ends the options, and a command. It reads `XDG_STATE_HOME` for the place of the
  clones and `XDG_DATA_HOME` for the log directory
* `templates/project/agent/compose.project.yml`: `AGENT_MEM_LIMIT` and `AGENT_CPUS`
* Not for the README: `AGENT_UID`, `AGENT_GID`, `AGENTRITE_CONTAINER`, `AGENT_CLAUDE_CODE_VERSION` and
  `AGENT_OPENCODE_VERSION`, which the wrapper sets itself, and `AGENT_PROJECT_NAME`, which only this repository's
  `agent/compose.project.yml` reads and which belongs in `CONTRIBUTING.md`

Two things are not changed, and why. `templates/project/AGENTS.md` and the test of it name a project's own README,
not the kit's. `RELEASING.md` reads the diff of `README.md`, `package.json` and every path in `files`, which holds
`SANDBOX.md` once this unit lists it there.

## Files

- `README.md`: rebuilt
- `SANDBOX.md`: new
- `CONTRIBUTING.md`: new
- `package.json`: `SANDBOX.md` in `files`
- `AGENTS.md`: the rules of requirement 15, and which document is the source of truth on what
- `tests/package-documents.test.mjs`: new
- `tests/release.test.mjs`: `CONTRIBUTING.md` names `RELEASING.md`, in place of the README
- `tests/harness-versions.test.mjs`: one comment
- `templates/project/agent.sh`, `agent.sh`: the comment that names the README
- `templates/project/agent/compose.project.yml`, `agent/compose.project.yml`: the comment that names "Egress"
- `container/Dockerfile`: the comment that names the README
- `container/agent.sh`: the message that names the README
- `agent-dev.sh`: the comment that names the README
- `changes/0037-refactor-the-readme/record.md`: the log and what the documents leave out

`CHANGELOG.md`, `process.md`, the role files and `RELEASING.md` are not touched, and nothing under `node_modules`.

## Tasks

Before anything else:

- [x] Ask the human for the text of the usual workflow, and go on with the tasks below while it is written. Write
      none of it. The task that places it stays open until the human has given it (R4)

The reference of the sandbox:

- [x] Add `tests/package-documents.test.mjs`, written as `tests/changelog.test.mjs` is: `files` of `package.json`
      holds `SANDBOX.md`, `SANDBOX.md` is a file at the root of the repository, and `files` does not hold
      `CONTRIBUTING.md`. The suite now fails on the first two (R17)
- [x] Add `SANDBOX.md` to `files` in `package.json`, after `CHANGELOG.md` (R7, R17)
- [x] Write `SANDBOX.md` with the headings above, from "Working on a clone" up to "The local model server" of the
      base README, by requirements 9 and 10. It opens with one sentence on what it is and that the commands are in
      the README. What a unit run defends against and does not, the supported usage, and every limit of what was
      tried stay (R7, R9, R10, R12)
- [x] State the kit's own allowlist hosts in "Egress" of `SANDBOX.md` and nowhere else in it (R11)
- [x] In `README.md`, put `## The sandbox` in place of "Running the sandbox" and all its subsections: what the
      sandbox is for, that the host needs Docker, that it is never run with `sudo` and why in one clause, what it
      confines, which is the read-only root, what the agent writes, what of the host is reachable and the egress
      by hostname, the two files a project configures it with, and that the reference is `SANDBOX.md` (R1)
- [x] In what the README still holds, name `SANDBOX.md` and the title wherever a sentence points to a section that
      moved (R11, R14)
- [x] List in `record.md` what this move left out of the base README's "Running the sandbox", by subsection (R13)

Working on the kit:

- [x] In `tests/release.test.mjs`, put `CONTRIBUTING.md` in place of `README.md` in the list of files that name
      `RELEASING.md`. The suite now fails on it (R8, R14)
- [x] Write `CONTRIBUTING.md` with the headings above, from "The kit's own tests", "The kit's own copy of the kit",
      "Trying the working copy's sandbox" and "Releasing" of the base README, by requirements 9 and 10. It names
      `RELEASING.md` as what a release follows, and holds no step of it (R8, R9, R10, R12)
- [x] In `## The commands` of `CONTRIBUTING.md`, describe each command that only this repository has, as an entry
      of the README's list is built: `npm test`, `./agent-dev.sh` in every form, with `AGENT_PROJECT_NAME`,
      `./deploy.sh` with `npm run deploy`, and `/release`. Read `agent-dev.sh`, `deploy.sh` and `scripts` of
      `package.json` for every argument, option and environment variable, and do not take them from here (R8)
- [x] In `## What the repository holds besides the package`, write a table with a row for every entry that
      `git ls-tree --name-only HEAD` lists and `npm pack --dry-run --json` does not, `CONTRIBUTING.md` among them.
      `.dockerignore`, `.editorconfig` and `.gitignore` share one row. The rows for `tests/`, `infra/`,
      `RELEASING.md` and `deploy.sh` are worded as the base README has them (R2, R8)
- [x] Remove the four sections from `README.md` (R8, R11)
- [x] List in `record.md` what this move left out of those four sections (R13)

The README:

- [x] Leave the introduction and "The name" as they are, to the letter: `git diff` shows no changed line in
      them (R1)
- [x] In "What is here", make the table hold a row for `process.md`, `CHANGELOG.md`, `README.md`, `SANDBOX.md`,
      `package.json`, `roles/`, `templates/changes/`, `templates/project/`, `scripts/` and `container/`, and no
      other. The rows that exist keep their wording. Compare the rows with `npm pack --dry-run --json`. The
      sentence on the four commands of `agentrite` goes, since the list says it (R1, R2, R11)
- [x] Write `## How it works`: one short paragraph or one row of a table per role, on what it is given, what it
      produces and where it stands in the order, with a pointer to `process.md` and to the role files for the
      rules. Read it against `process.md` and the four role files, and take out any sentence that states a rule
      of theirs (R1, R3)
- [x] Place the human's text of the usual workflow in "How it works", after the roles, as given apart from line
      wrapping (R4)
- [x] Write `## The commands` as one list, with these entries in this order: `npx agentrite init`,
      `npx agentrite refresh`, `npx agentrite roles`, `npx agentrite run`, `npx agentrite-roles`, the change
      check as `npm run check-changes` and as `node node_modules/@ritenoar/agentrite/scripts/check-changes.mjs`,
      and `./agent.sh` in its four forms. Each entry holds what requirement 5 lists, in that order, and nothing
      else, and there is no text in the part besides one opening sentence and the list (R1, R5)
- [x] Check every entry against the code and not against the base README: the usage that
      `node scripts/agentrite.mjs` and `node scripts/agentrite.mjs run` print, the parser of each of the four
      scripts, the usage in the header of `container/agent.sh` and its `case` over the options, and every `${...}`
      in `container/agent.sh`, `container/compose.yml` and `templates/project/agent/compose.project.yml`. Log in
      `record.md` what was read and each name the base README did not hold, `AGENT_MEM_LIMIT` and `AGENT_CPUS`
      among them (R6)
- [x] Write `## Running a role` from what the base README's section says beyond the arguments and options: where
      the harness is started and with which prompt, the status the command exits with, how a run is stopped, the
      order of what the harness is given, how a session is resumed in each harness with the commands as they are,
      the wrapper the command needs and the command that repairs it, what else makes it start nothing, and that it
      starts no sandbox. The entry of `run` names this part by its title (R1, R5, R9)
- [x] Write `## Installing it into a project`: the install by URL, `init` and the table of what it writes, which
      files a project edits, what `init` amends, what it leaves and what it refuses, and `### On a fresh clone`
      with `npm ci`, on the host before the sandbox can start. State the Playwright build argument and the
      `.dockerignore` exception here, and point to "Egress" of `SANDBOX.md` for the kit's hosts (R1, R9, R11)
- [x] Write `## Updating a project to a newer kit`: the install by URL, the changelog and where it is, `refresh`
      and what it rewrites, keeps, never touches and reports, stated here and pointed to from "Installing it into
      a project", from the entry of `refresh` and from "Running a role" (R1, R9, R11)
- [x] In both examples that install by URL, name the release that `devDependencies` of `package.json` names at
      that moment, which is 4.2.0 as this is written (R16)
- [x] List in `record.md` what the rebuilt README left out of the base README's sections from "What is here" to
      "Where to run it" (R13)

Across the three documents:

- [ ] For each of the four facts of requirement 11, search the three documents for it, with `git grep -n` for
      `auth.openai.com`, `rewrites`, `PLAYWRIGHT_VERSION` and `!node_modules`, and see that it is stated in the
      one place the table above gives and is a pointer by title everywhere else (R11)
- [ ] Take every code span of the base README, with `grep -o` for text between backticks, and see of each that it
      is in one of the three documents letter for letter, or belongs to a statement that `record.md` lists (R12)
- [ ] Read the base README once more from its first line to its last, section by section, beside the three
      documents, and add to the lists in `record.md` every statement that is in none of them and not listed yet.
      See of every statement that stayed that it is as strong as it was: refused is refused, "best kept" is
      "best kept" (R12, R13)

What names the README:

- [x] In `templates/project/agent.sh` and in `agent.sh`, make the comment say that the command is described in the
      kit's `README.md` and the sandbox in its `SANDBOX.md`. The two files stay equal (R14)
- [x] In `templates/project/agent/compose.project.yml` and in `agent/compose.project.yml`, make the comment name
      "Egress" of the kit's `SANDBOX.md` (R14)
- [x] In `container/Dockerfile`, make the comment at its head name the kit's `SANDBOX.md` for the sandbox (R14)
- [x] In `container/agent.sh`, make the message for a missing `agent/compose.project.yml` end in
      `See "Installing it into a project" in the kit's README.md.` (R14)
- [x] In `agent-dev.sh`, make the comment name `CONTRIBUTING.md` for "Trying the working copy's sandbox" (R14)
- [x] In `tests/harness-versions.test.mjs`, make the comment on the example versions name `SANDBOX.md` (R14)
- [x] Run `git grep -n -I -i readme -- . ':!README.md' ':!changes' ':!CHANGELOG.md' ':!package-lock.json'` and
      `git grep -n -I -e '"Running the sandbox"' -e '"Starting it"' -e '"Where to run it"' -- . ':!changes'
      ':!CHANGELOG.md'`, and see of every line found that what it names is where it says. The two pointer
      packages under `pointers/` name the README for the command that installs, which stays true (R14)

This repository's instructions:

- [x] In `AGENTS.md`, replace the sentence that names the README as the source of truth for all of it by which
      document is the source of truth on what: `README.md` on what the kit is and how a project uses it,
      `SANDBOX.md` on what the sandbox does, `CONTRIBUTING.md` on working on the kit, with `RELEASING.md` as it is
      named today (R15)
- [x] Add a section `## The documents` to `AGENTS.md`, before "Releasing", with the three rules of requirement
      15: the commands are complete in `README.md` and in `CONTRIBUTING.md` and a unit that adds, changes or
      removes one changes the document in the same unit; the two tables are kept up to date in the same way; and
      the documents say what there is and how to use it, with the why in the unit under `changes/` (R15)

## Verification

- [ ] `npm test` passes on the final tree (R17)
- [ ] `npm pack --dry-run --json` lists `README.md` and `SANDBOX.md` and does not list `CONTRIBUTING.md` (R17)
- [ ] `npm run check-changes` exits 0, run after the last commit
- [ ] No line of a changed or new file is over 120 characters, and none holds an em dash
- [ ] None of the three documents has a table of contents, and each section that is pointed to is named by its
      title alone (R10)
- [ ] Every requirement of the spec has a ticked task that names it

## Commit Points

- [x] `feature-0037 Plan the rebuilding of the README`: the plan and the record
- [x] `feature-0037 Move the reference of the sandbox to SANDBOX.md`: the test, `package.json`, `SANDBOX.md`, the
      README's "The sandbox" and the record's list
- [x] `feature-0037 Move working on the kit to CONTRIBUTING.md`: the test, `CONTRIBUTING.md`, the README and the
      record's list
- [x] `feature-0037 Rebuild the README around the commands`: the README and the record's list
- [x] `feature-0037 Name the document where the README was named`: the comments and the message
- [x] `feature-0037 Say in AGENTS.md how the three documents are kept`: `AGENTS.md`
- [ ] `feature-0037 Record the implementation and what was run`: the record, with the last read against the base
      README and the suites on the final tree
