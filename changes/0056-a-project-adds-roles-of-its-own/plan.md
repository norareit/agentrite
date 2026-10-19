# 0056 A project adds roles of its own

## Approach

The suite is green before the work: `npm test` reported 653 tests, 653 passing, at `170527e`, the head of the
unit's branch. The default branch has moved on since with unit 0057, which touches the sandbox and none of the files
below. The work is in five steps, each a commit of its own and each leaving the suite green:

1. **The settings take extra roles** (R1 to R4). `parseSettings` takes the extra roles and refuses the names R3
   refuses. Nothing that reads the settings uses the extra roles yet, so every command still behaves as before for
   a file that unit 0054 makes valid
2. **Everything after the settings follows every role they name** (R4, R5, R7, R8, R9): the wrappers that `init`
   and `refresh` write, `agentrite roles`, `agentrite run` and `.agentrite/instructions.md`
3. **`refresh` removes the kit's wrapper of a role that is gone** (R6)
4. **The kit's reviewer reads the files of the extra roles that worked on the unit** (R10)
5. **The README** (R12, R13). `process.md` is not touched in any step (R11)

### Decided here, so that the implementer does not re-derive it

**Where the names of the harnesses' own agents live (R3).** In the `HARNESSES` registry of
`scripts/agentrite-roles.mjs`, which is the one place that holds what the kit knows of each harness. Each entry gets
two keys beside `directory` and `render`: `title`, the harness's name as a message gives it (`Claude Code`,
`OpenCode`), and `ownAgents`, the list of the names of R3's table for that harness, written as the table writes them.
A new exported pure function `harnessesWithAgent(name)` returns the titles of the harnesses, in the order of
`HARNESS_NAMES`, whose `ownAgents` hold a name equal to `name` when both are lowercased, and an empty list when none
does. Nothing names one harness in that function, so a harness added to the registry is judged without a change to
it.

**What `ROLE_NAMES` is now.** It stays the exported constant of the four names in their order, and its comment says
that it is the four roles every project has, in the order of their stages, which every listing gives first. The
extra roles are never held in a constant: they come from the settings.

**The settings, judged in this order, the first fault named.** `parseRoles` in `scripts/agentrite-settings.mjs`
judges, each message opening `agentrite.json: ` as today:

1. A role of the four that `roles` lacks, in `ROLE_NAMES` order: `roles lacks <name>. It must hold the roles
   specifier, planner, implementer and reviewer, each with the path of its file, and may hold roles of the
   project's own besides`. This text replaces `ROLES_EXACTLY`
2. Each other name, in the order of the file's text (the order of `Object.keys` of the parsed object). A name that
   does not match `/^[a-z]+(-[a-z]+)*$/`: `roles holds "<name>", which is not the name of a role. A role's name is
   one or more words of the lowercase letters a to z, joined by single hyphens, as security-reviewer`. `<name>` is
   written with `JSON.stringify`, as the refusal it replaces writes it. A name of the right form for which
   `harnessesWithAgent` gives one title or more: `roles holds "<name>", which is the name of an agent that <titles>
   of its own. A role cannot have the name of an agent of a harness the kit writes wrappers for`, where `<titles>`
   is `Claude Code has`, `OpenCode has`, or `Claude Code and OpenCode have` when both do, the titles joined by ` and `
   and the verb `has` for one and `have` for more. Both checks of a name are made before the next name is judged.
   The harnesses that `harnesses` names play no part
3. The path of each role, the four in `ROLE_NAMES` order and then the extra roles in the order of the text, as
   today: `roles.<name> is <JSON of the value>. It must hold ` and `PATH_MUST`

The `must` of the key `roles` in `KEYS`, for a `roles` that is missing or no object, becomes: `an object from each
of the roles specifier, planner, implementer and reviewer, and from any role of the project's own, to the path of
its file`. The refusal in a command is the one every refusal of the settings already is, which unit 0045 set: the
message after `agentrite: ` on standard error, nothing written, exit 1.

`parseRoles` returns an object whose keys are the four in `ROLE_NAMES` order and then the extra roles in the order
of the text. A key of a JavaScript object keeps the order it was added in unless it is an integer, and the form of a
name holds no digit, so the object's own key order is the order R4 gives, and every consumer below takes the order
from `Object.keys` or `Object.entries` of `settings.roles`. The type `RoleFiles` becomes `Record<string, string>`,
with its comment saying that it holds the four and any extra roles, in that order.

`checkSettingsFiles` judges `standards` and then each entry of `settings.roles` in that order, with the key
`roles.<name>` as today, so an extra role's path names a file as one of the four must (R2). `settingsText` writes
every entry of `roles` in that order, one to a line as today, so that what it writes reads back as the settings it
was given whatever roles they hold. The default file it writes for the kit's paths does not change.

**The roles from the settings (R4, R5, R7, R9).** `readRoles(root, roles)` maps over `Object.entries(roles)`
instead of `ROLE_NAMES`, and its comment says so. Every consumer gets the extra roles through it, with no change of
its own: `plannedFiles`, and so the wrappers `init` and `refresh` write (R5); `listFile`, and so the list; the
listings of `agentrite roles`; and `checkWrapper` of `run`. `instructionsList` in
`scripts/agentrite-instructions.mjs` lists `Object.entries(roles)` instead of `ROLE_NAMES`, each by its name and
path as the four are listed today (R9). Its import of `ROLE_NAMES` goes, if nothing else uses it. `rolesJson` gives
each role as `{ name, description, path }`, in that key order; `rolesListing` does not change (R7).

**`agentrite run` (R8).** `positionError` no longer judges the role against `ROLE_NAMES`: it still refuses a missing
role with `no role given`, and a word in the role's place is now taken whatever it is, so the harness is judged next
as today. The usage line of the role becomes `  <role>              a role that agentrite.json names, as agentrite
roles lists them`. `run` in `scripts/agentrite.mjs` judges the role right after `projectRoles(root)`, before the unit
and the wrapper, and for a role that is not the name of one of the roles throws: `the project has no role <role>.
The roles agentrite.json names are <names>`, where `<names>` are the names of the roles in their order, joined by
`, ` with ` and ` before the last. That is a refusal of the command, so the entry point prints it after `agentrite: `
and exits 1, and nothing is started. The check compares with the names of the list `readRoles` returned, never with
a property of an object, so that a word such as `toString` is refused.

**What a wrapper of the kit's is (R6).** A new exported pure function `isKitWrapper(text)` in
`scripts/agentrite-roles.mjs`, beside `body`, which writes the body it recognizes:

* The text is split into lines on `\r?\n`, so a wrapper saved with CRLF is read as the same lines, as
  `refreshedWrapper` reads one. The first line is `---` and a later line is `---`, which closes the front matter.
  What is in the front matter, a pinned model included, is not looked at
* The lines after the closing line, joined by `\n`, are a line break followed by `body(path)` for the `path` that
  the first of them names: the text between the first backtick and the next, with each line break in it read as a
  space, since `wrapWords` breaks a path that holds a space there. Anything else, no front matter included, is not
  a wrapper of the kit's

**The removal in `refresh` (R6).** After the loop over the kit's own files and before the notices, `refresh` calls a
new function `removeStaleWrappers(root, harnesses, roleNames)` in `scripts/agentrite.mjs`. For each directory of
`wrapperDirectories(harnesses)`, in that order, that exists, it reads the names of its entries, sorted, and for each
name that ends in `.md`, is a regular file by `lstatSync` (so a symbolic link or a directory is never read or
removed) and whose name before `.md` is not in `roleNames`, reads the file and, when `isKitWrapper` of its text is
true, removes it with `rmSync` and prints `removed <directory>/<name>`. A file it leaves gets no line. `refresh`
passes the names of the roles `readRoles` returned. `init` calls nothing of it.

**The reviewer's file (R10).** In `roles/reviewer.md`, the paragraph that says to read the role files of the
specifier, the planner and the implementer gets two sentences after its sentence on those three: that the reviewer
also reads the file of each role besides the four that has an entry in the unit's `record.md`, as `as the <name>`,
by the path `.agentrite/instructions.md` names for it, and judges the work against it as against the three; and that
a role besides the four with no entry in `record.md` did not work on the unit, and its file is not read. The
paragraph keeps the sentence that `tests/package-documents.test.mjs` matches today (the three roles that
`.agentrite/instructions.md` names, and the instructions the work was produced under). The front matter does not
change.

## Files

- `scripts/agentrite-roles.mjs`: `title` and `ownAgents` in `HARNESSES`, `harnessesWithAgent`, `isKitWrapper`,
  `readRoles` over every role, the comment of `ROLE_NAMES`
- `scripts/agentrite-settings.mjs`: `parseRoles` and its messages, the `must` of `roles`, `RoleFiles`,
  `checkSettingsFiles` and `settingsText` over every role
- `scripts/agentrite-instructions.mjs`: `instructionsList` over every role
- `scripts/agentrite-run.mjs`: `rolesJson` with `path`, `positionError` and the usage line of the role
- `scripts/agentrite.mjs`: the role check of `run`, `removeStaleWrappers` and its call in `refresh`
- `roles/reviewer.md`: the files of the extra roles that worked on the unit
- `README.md`: the opening, "How it works", the four commands, "The project's settings" and the new section "Adding
  a role"
- `tests/agentrite-roles.test.mjs`, `tests/agentrite-settings.test.mjs`, `tests/agentrite-instructions.test.mjs`,
  `tests/agentrite-run.test.mjs`, `tests/agentrite-refresh.test.mjs`, `tests/agentrite-init.test.mjs`,
  `tests/package-documents.test.mjs`: the tests below
- `changes/0056-a-project-adds-roles-of-its-own/record.md`: the log of the work

## Tasks

### 1. The settings take extra roles

- [x] In `tests/agentrite-roles.test.mjs`, test `harnessesWithAgent`: for each name of R3's table, written in the
  test as the table writes it and not imported, the harness of its row is among the titles given, for the name as
  written, lowercased and uppercased; `plan` and `explore` give `['Claude Code', 'OpenCode']`; a name of no agent,
  as `security-reviewer`, and each of the four roles give `[]` (R3)
- [x] In `tests/agentrite-settings.test.mjs`, test that a `roles` with the four and `security-reviewer` and
  `test-writer` is valid and gives the six, the four in their order and then the two in the order of the text, also
  when the two stand before the four in the text; that an extra role may name the file of another role, one of the
  four or an extra one; and that a file with the four alone still gives the four (R1, R2, R4)
- [x] Replace the test that refuses a name that is no role with one that refuses each of `Security-Reviewer`,
  `security_reviewer`, `reviewer2`, `-reviewer`, `reviewer-`, `security--reviewer`, `security reviewer`, `a/b`,
  `toString`, `__proto__` and the empty name with the message of the form, the name in it as JSON (R2, R3)
- [x] Test that each lowercase name of R3's table that has the form of a name, as `general-purpose`, `claude`,
  `fork`, `build` and `compaction`, is refused with the message that names it and its harness, with `has` for one
  harness; that `plan` and `explore` name both, with `have`; and that the refusal does not depend on `harnesses`,
  with `["claude"]` and with `["opencode"]` (R3)
- [x] Test the order of judging: a file that lacks `planner` and holds a bad name is refused for the lack; of two
  bad names the first in the text is named; a bad name is named before a path of the four that does not hold; and
  an extra role whose path is absolute, or names no file for `readSettings`, is refused with `roles.<name>` as the
  key, after the four (R2, R3)
- [x] Update the expected messages of the lack and of a `roles` that is no object to the texts above, and extend
  the test that `settingsText` reads back as the settings it was given to settings with two extra roles
- [x] Make the tests pass in `scripts/agentrite-roles.mjs` and `scripts/agentrite-settings.mjs` as "Approach" says
  (R1 to R4)

### 2. Everything after the settings follows every role they name

- [ ] In `tests/agentrite-roles.test.mjs`, test that `readRoles` of the four and an extra role whose file has front
  matter gives five roles in that order, the extra one with its path and description, and that an extra role whose
  file has no front matter is refused, naming its file, as one of the four is (R4, R5, R7)
- [ ] In `tests/agentrite-instructions.test.mjs`, test that the list names the four and then the extra roles, in the
  order of the settings, each by its name and with a link that works from `.agentrite/`, as the four are named (R9)
- [ ] In `tests/agentrite-run.test.mjs`, change the tests of the JSON to expect `name`, `description` and `path` for
  each role, in that key order, the path as `roles` gives it, and keep the tests of the text listing as they are
  (R7)
- [ ] Change the expected usage of `run` to the role's line above, and assert that it names none of the four. Move
  `auditor` and `toString` out of the cases `parseRunArgs` refuses: test that it takes any word as the role, and
  that `['claude', 'reviewer', '0007']` is refused as `unknown harness: reviewer` (R8)
- [ ] Add a helper beside `withOwnReviewer` that writes a role file of a project's own, with front matter, and
  names it as `security-reviewer` in the project's `roles` after the four. With it, test end to end that
  `agentrite roles` and `agentrite roles --json` list the five, the extra role last, with its description and, in
  the JSON, its path; that `run security-reviewer claude 0007` after `refresh` starts the harness with
  `--agent security-reviewer`; and that `run auditor claude 0007` exits 1, prints nothing on standard output,
  starts nothing, and prints `agentrite: the project has no role auditor. The roles agentrite.json names are
  specifier, planner, implementer, reviewer and security-reviewer` on standard error. Take `auditor` out of the
  test of what run does not take with exit 2 (R7, R8)
- [ ] In `tests/agentrite-refresh.test.mjs`, test end to end that `refresh` with an extra role in `roles` writes its
  wrapper for each harness `harnesses` names, as `plannedFiles` gives it, and none for a harness it does not name,
  and that `.agentrite/instructions.md` names it after the four (R5, R9)
- [ ] In `tests/agentrite-init.test.mjs`, test end to end that `init` in a project whose `agentrite.json` names an
  extra role writes that role's wrappers for each harness it names, and the list naming it (R5, R9)
- [ ] Make the tests pass in `scripts/agentrite-roles.mjs`, `scripts/agentrite-instructions.mjs`,
  `scripts/agentrite-run.mjs` and `scripts/agentrite.mjs` as "Approach" says (R4, R5, R7, R8, R9)

### 3. `refresh` removes the kit's wrapper of a role that is gone

- [ ] In `tests/agentrite-roles.test.mjs`, test `isKitWrapper`: true for each wrapper `plannedFiles` gives, for
  either harness; for one with a pinned model in its front matter; for one with CRLF line ends; and for one whose
  body names another path, as `node_modules/@ritenoar/agent-kit/roles/planner.md`, a path long enough that the
  body wraps, or a path that holds a space where the body wraps. False for a text with no front matter, for one
  whose front matter is never closed, for a body with a word added, changed or wrapped otherwise, and for an agent
  of the project's own (R6)
- [ ] In `tests/agentrite-refresh.test.mjs`, test end to end, with both harnesses: a project that ran `refresh`
  with `security-reviewer` in `roles`, then took it out, runs `refresh` again, and its two wrappers are gone, with
  `removed .claude/agents/security-reviewer.md` and `removed .opencode/agents/security-reviewer.md` printed after
  the lines of the files and before the notices, also when one of them pins a model. A renamed role loses the
  wrappers of its old name and gets those of its new one. An agent of the project's own in either directory, a
  symbolic link and a directory named `<name>.md` there are left as they are and no line names them. A second
  `refresh` removes nothing and prints no `removed` line. The wrappers of a harness that `harnesses` no longer
  names are left (R6)
- [ ] Test that `init` in the project of the last task removes nothing (R6, and the decision that `init` removes
  nothing)
- [ ] Make the tests pass with `isKitWrapper` in `scripts/agentrite-roles.mjs` and `removeStaleWrappers` in
  `scripts/agentrite.mjs`, as "Approach" says (R6)

### 4. The kit's reviewer reads the files of the extra roles that worked on the unit

- [ ] In `tests/package-documents.test.mjs`, beside the test of the reviewer's first paragraph, test that it says to
  read the file of each other role that has an entry in the unit's `record.md`, by the path
  `.agentrite/instructions.md` names, and that the file of a role with no entry is not read (R10)
- [ ] Change `roles/reviewer.md` as "Approach" says, wrapped at 120 characters (R10)

### 5. The README

- [ ] The opening: after the sentence on replacing the standards and the roles, say that a project can add roles of
  its own as well, with a link to "Adding a role" in the place of the link to "Replacing a role or the standards",
  both links there; add "Adding a role" to the list of sections after "Replacing a role or the standards" (R12)
- [ ] "How it works": say that each of the four roles covers one stage of the process and moves the unit through the
  statuses, and that a project can add roles that run just before or just after one of the four, within its stage,
  with a link to "Adding a role" (R12)
- [ ] "The project's settings": the `roles` row of the table and the bullet on `roles` say that it holds the four
  names and may hold extra roles besides, each with the path of its file; what a name must be, as R2 has it; that a
  name of an agent of a harness's own is refused, with the names of R3's table, as a Markdown table whose lines fit
  120 characters, judged without regard to case and whatever `harnesses` names; and that the extra roles are listed
  after the four in the order of the file. In "What to run afterwards", add that a role taken out of `roles`, or
  renamed, has its wrappers removed by `npx agentrite refresh`, and keep the bullet that no command removes a file
  for a harness taken out or the sandbox set to `false` (R12)
- [ ] "agentrite init": it writes the wrappers of every role `roles` names. "agentrite refresh": it writes the
  wrappers of every role `roles` names, and removes a wrapper as R6 says, printing `removed <path>`, and says nothing
  of an agent of the project's own. "agentrite roles": the extra roles are listed after the four, and each object of
  the JSON has `path` besides `name` and `description`, the path as `roles` gives it. "agentrite run": `<role>` is
  one that `agentrite.json` names, and a role it does not name is refused, the message naming the role and the
  roles the project has, nothing started and exit 1. In "Running a role", the list of when the command starts
  nothing gets that refusal too (R12)
- [ ] The new section "Adding a role", after "Replacing a role or the standards", with each point of R13: no stage
  and no status, and the table of the examples of the spec's "Context"; how it is added and removed; the front
  matter and the first instruction, as "Replacing a role or the standards" says of a role file; what its file says,
  and that it sets no status; that its findings do not block `implemented` and go where its file says; the entry it
  writes in `record.md` as `as the <name>` each time it works on the unit, and that the kit's reviewer reads the file
  of each extra role with such an entry; and that the human dispatches it, in a session or with `agentrite run`
  (R13)

## Verification

- [ ] `npm test` passes after each commit point, and at the end the count is the baseline's 653 and the tests the
  unit adds
- [ ] `git diff 170527e -- process.md` is empty (R11)
- [ ] No line of a file the unit changes is over 120 characters, and none of them holds an em dash
- [ ] Every requirement has a task: R1 to R4 in step 1, R4, R5, R7, R8 and R9 in step 2, R6 in step 3, R10 in step 4,
  R12 and R13 in step 5, R11 in the verification above
- [ ] `npm run check-changes` passes on the committed branch

## Commit Points

- [ ] `feature-0056 Take roles of a project's own in agentrite.json`, after step 1
- [ ] `feature-0056 Write, list and run every role agentrite.json names`, after step 2
- [ ] `feature-0056 Remove the wrappers of a role that is gone on refresh`, after step 3
- [ ] `feature-0056 Have the kit's reviewer read the files of the extra roles in the record`, after step 4
- [ ] `feature-0056 Describe adding a role in the README`, after step 5
