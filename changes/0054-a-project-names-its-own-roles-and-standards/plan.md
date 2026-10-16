# 0054 A project names its own roles and standards

## Approach

The suite is green before the work: `npm test` reported 581 tests, 581 passing, at `6019dd3`. The work is in five
steps, each a commit of its own and each leaving the suite green:

1. **The settings.** `agentrite.json` gets `standards` and `roles`, both required, and every command that reads the
   file checks that each path names a file. The commands still write what they write today; only the file and its
   checks change. The test projects of the whole suite get the two keys and a kit to name (R1 to R5)
2. **The roles from their files, and everything after them from the settings.** The descriptions move into the kit's
   role files, the wrappers, `agentrite roles` and `agentrite run` take them from the files the settings give,
   `CLAUDE.md` and `opencode.json` are judged against the `standards` the settings give, and `init` and `refresh`
   write `.agentrite/instructions.md` and the new notices (R6 to R16)
3. **What the kit's files say of each other** (R17, R18)
4. **This repository's own files**, judged against the installed release (R24, R25)
5. **The documents** (R19 to R23, and `SANDBOX.md` and `CONTRIBUTING.md` where the unit makes them untrue)

### Decided here, so that the implementer does not re-derive it

**Where each piece lives.** What a valid settings file is stays in `scripts/agentrite-settings.mjs` (R4): the shape of
the text in `parseSettings`, which stays pure, and whether each path names a file in a new `checkSettingsFiles(root,
settings)` beside it, which `readSettings` calls after parsing. Everything that reads the file goes through
`readSettings`, the sandbox's reader and the change check among them, so all of them refuse alike. The role names
move to `scripts/agentrite-roles.mjs` as `ROLE_NAMES`, in the order `specifier`, `planner`, `implementer`,
`reviewer`; its `ROLES` constant and the four description constants are removed (R7). The front matter of a role
file is read there too: a pure `parseRoleDescription(text)` and a `readRoles(root, rolesSetting)` that reads each
file the settings give. The list `.agentrite/instructions.md` is written by a pure `instructionsList(settings)` in
`scripts/agentrite-instructions.mjs`, beside the judging of `CLAUDE.md` and `opencode.json`, and the judging of
`AGENTS.md` for R16 goes there too.

**The settings, judged in this order, the first fault named.** `defaultBranch`, `harnesses`, `sandbox` as today, then
`standards`, then `roles`, then the files: `standards` first, then each role in `ROLE_NAMES` order. Messages, each
opening `agentrite.json: ` as today:

* A path, for `standards` or a role, holds when it is a string that is not empty, is not absolute (`isAbsolute` of
  `node:path`), and whose `posix.normalize` is neither `..` nor opens with `../`. No file system is touched for it
  (R2: judged as written). Otherwise: `<key> is <JSON of the value or missing>. It must hold the path of a file,
  relative to the project root, that does not lead outside the project`, where `<key>` is `standards` or
  `roles.<name>`
* `roles` that is missing or no JSON object (an array included): `roles is <value or missing>. It must hold an object
  from each of the roles specifier, planner, implementer and reviewer to the path of its file`
* `roles` that lacks a role: `roles lacks <name>. It must hold exactly the roles specifier, planner, implementer and
  reviewer, each with the path of its file`. Missing roles are looked for first, in `ROLE_NAMES` order
* `roles` that holds a name that is none of the four: `roles holds "<name>", which is no role. It must hold exactly
  the roles specifier, planner, implementer and reviewer, each with the path of its file`
* A path that names no regular file, judged with `statSync` of `resolve(root, path)`, which follows symbolic links:
  `<key> is "<path>", and there is no file at it. It must name a file in the project's working tree`. A `statSync`
  that throws counts as no file
* The opening sentence of `MUST_HOLD_OBJECT` names the five keys, as it names the three today
* A key the kit does not know is still ignored (R3). A name inside `roles` is not a key of the file, and R2 refuses
  one that is no role
* `parseSettings` returns the five keys, `roles` as an object in `ROLE_NAMES` order. `settingsText` writes the five,
  `roles` one role to a line, indented by four spaces, which for the kit's paths is the default file of R5 byte for
  byte

**`init` from its arguments** writes `standards` and `roles` as the template has them, read with `parseSettings` from
`templates/project/agentrite.json` as it reads the template's branch today (R5). It then calls `checkSettingsFiles` on
what it is about to write, before it writes anything, so that a project without the kit installed is refused with the
message above and not with a failed read of a role file. With an `agentrite.json` it reads it with `readSettings`,
which checks the files.

**A role file's front matter (R6).** `parseRoleDescription(text)` returns the description, or `undefined` for a text
not in one of the two forms. Lines are split on `/\r?\n/`. The first line is `---`, and the next line that is `---`
closes it. Between them is exactly one of:

* one line `description: <text>`, whose text, trimmed, is not empty and is not `>-`. The description is that text,
  trimmed
* the line `description: >-` and one or more lines that each open with two spaces and then a character that is not a
  space. The description is those lines without their two spaces, each trimmed at its end, joined by single spaces

Anything else, an empty front matter, another key, a blank line or a line indented otherwise among them, is refused.
`readRoles` throws, for a file that `parseRoleDescription` refuses, `<path> has no front matter that a role file must
open with. It must be a line ---, then either the line description: <text>, or the line description: >- followed by
the text on lines indented by two spaces, then a line ---` (R8), and for one it cannot read, `cannot read <path>:
<error>`. It returns `{ name, path, description }` for each role in `ROLE_NAMES` order, reading a file that two roles
share once for each.

**The wrappers (R7, R9).** `plannedFiles(harnesses, roles)` takes what `readRoles` returns. The body line is
``Read `{path}` in the project root and follow it. It is your instruction; this file holds none of its own.``, with
the path as the settings write it. With the kit's paths and the kit's descriptions, that is today's wrapper byte for
byte, which the fixtures of task 2.1 pin. The kit's four role files open with front matter in the folded form, its
lines exactly the `description: >-` block a wrapper holds today (`wrapWords(description, 120, '  ')`), so that the
descriptions move word for word. `roleWrapperDirectories` in `scripts/agentrite.mjs` stops calling `plannedFiles`:
`scripts/agentrite-roles.mjs` exports `wrapperDirectories(harnesses)`, the directory of each harness in the order
given.

**The list (R13).** `.agentrite/instructions.md`, exported as `INSTRUCTIONS_LIST`. Each path is shown as the
settings write it, in a code span, and linked by `posix.relative('.agentrite', posix.normalize(path))` with each
segment between its `/` encoded by `encodeURIComponent`, and `(` and `)` as `%28` and `%29`, so that a `#`, a `?` or
a parenthesis in a file's name is part of the path the link names.
For the default file, the text is exactly this, ending in one line break:

```markdown
# Instructions in use

These are the files whose instructions hold in this project. The standards are its whole set of rules on how text,
documentation, commits, code and tests are written.

The kit writes this list from `agentrite.json`, with `npx agentrite init` and `npx agentrite refresh`, and it is not
edited by hand. To use another file, change `agentrite.json` and run `npx agentrite refresh`.

* Process: [`node_modules/agentrite/process.md`](../node_modules/agentrite/process.md)
* Standards: [`node_modules/agentrite/standards.md`](../node_modules/agentrite/standards.md)

## Roles

* specifier: [`node_modules/agentrite/roles/specifier.md`](../node_modules/agentrite/roles/specifier.md)
* planner: [`node_modules/agentrite/roles/planner.md`](../node_modules/agentrite/roles/planner.md)
* implementer: [`node_modules/agentrite/roles/implementer.md`](../node_modules/agentrite/roles/implementer.md)
* reviewer: [`node_modules/agentrite/roles/reviewer.md`](../node_modules/agentrite/roles/reviewer.md)
```

It is a kit-owned file as the shim is: `refresh` writes it whatever is there, and leaves a path that is not a regular
file with the same message and status as for a wrapper (R14). It keeps no model. In what `init` writes and `refresh`
prints, it comes after the wrappers and before `AGENTS.md`, `CLAUDE.md` and `sandbox.sh`.

**The standards a project loads (R11, R12).** `INSTRUCTION_PATHS` and `CLAUDE_LINES` become functions of the
`standards` the settings give: `instructionPaths(standards)`, `[PROCESS_PATH, standards]`, and `claudeLines(standards)`,
the imports of those two and `@AGENTS.md`. `claudeLacks`, `opencodeVerdict` and the `skipped opencode.json, which
loads ...` line take `standards`. The kit's standards are another file when `posix.normalize(standards)` is not
`STANDARDS_PATH`, and then:

* `claudeLoadsKitStandards(read, standards)` is true for a `CLAUDE.md` that has a line, judged as `claudeLacks` judges
  one, that is exactly `@node_modules/agentrite/standards.md`
* `opencodeLoadsKitStandards(read, standards)` is true for an `opencode.json` whose `instructions` list holds
  `node_modules/agentrite/standards.md`, or that is not JSON and whose text holds it in quotes

Both are false otherwise, a missing or unreadable file included. Their notices, one for each file, which `init` and
`refresh` both print, after an empty line as the others are:

```text
CLAUDE.md imports the kit's standards.md, and the project's standards are <standards>. Claude Code then loads
both sets of rules. Remove this line, which init and refresh do not remove:

@node_modules/agentrite/standards.md

See "How the kit's instructions reach an agent" in node_modules/agentrite/README.md.
```

```text
opencode.json lists the kit's standards.md, and the project's standards are <standards>. OpenCode then loads
both sets of rules. Remove this entry from its instructions list, which init and refresh do not remove:

node_modules/agentrite/standards.md

See "How the kit's instructions reach an agent" in node_modules/agentrite/README.md.
```

**`AGENTS.md` and the list (R16).** `agentsNamesList(read)` in `scripts/agentrite-instructions.mjs` is true when the
file has text and the text holds `.agentrite/instructions.md`. Its notice, for a file that is missing or lacks it:

```text
AGENTS.md is missing, so agents do not learn from it which role and standards files the project uses,
which .agentrite/instructions.md names. refresh does not change AGENTS.md. See "How the kit's instructions reach
an agent" in node_modules/agentrite/README.md.
```

with `does not name .agentrite/instructions.md` in the place of `is missing` for a file that is there. Its words are
wrapped at 120 characters by `wrapWords`, and not broken where the text above breaks them, since with the longer
problem the first line would be over 120 characters, as `record.md` says. `refresh`
judges it whatever the harnesses. `init` judges it only for an `AGENTS.md` that exists, since it writes a missing one,
and prints it after the notice of the sections, which it prints as today.

**The order of the notices.** `init`: the sections of `AGENTS.md`, the list notice of `AGENTS.md`, the lines
`CLAUDE.md` lacks, the kit's standards in `CLAUDE.md`, then `opencode.json` that cannot be amended, the kit's
standards in `opencode.json`. `refresh`: `CLAUDE.md` lacks, the kit's standards in `CLAUDE.md`, `opencode.json` does
not load, the kit's standards in `opencode.json`, then `AGENTS.md`. For an `opencode.json` that `init` amends, the
kit's standards are judged on the file as it was read, since amending only adds.

**`agentrite roles` and `agentrite run` (R10).** Both call `readSettings(root)` and `readRoles(root, settings.roles)`
before anything else they do with the project, and refuse with the message of either, exit 1, print nothing on
standard output and start nothing. `roles` lists what `readRoles` returns. `run` resolves the unit after that, and
checks the wrapper against `plannedFiles([harness], roles)`. Its usage and its check of the role argument take the
names from `ROLE_NAMES`, so `run` with a role that is not a name refuses before it reads anything, as today.

**What the test projects stand on.** A new helper, `tests/installed-kit.mjs`, holds what the suite's projects need of
an installed kit:

* `KIT_SETTINGS`, the `standards` and `roles` of the template, read with `parseSettings`
* `kitSettingsText({ defaultBranch, harnesses, sandbox })`, the `settingsText` of those with them
* `installKit(root)`, which copies the working tree's `process.md`, `standards.md` and `roles/` into
  `node_modules/agentrite` of the project, so that the kit's paths name files with the working tree's content. It
  stands in the place of a `linkKit(root)` that made `node_modules/agentrite` a symbolic link to this repository's
  root: with the link, a test of `init` that writes a fake `node_modules/agentrite/container/sandbox.sh` wrote it
  over the kit's own wrapper, as `record.md` says
* `KIT_ROLES`, the kit's roles as `readRoles` gives them in a project with the kit installed, which the tests give
  `plannedFiles` in the place of the kit's own wrappers
* `copyKitInstructions(installed)`, which copies `process.md`, `standards.md` and `roles/` into a directory that
  stands for an installed kit, for the tests that copy the kit's `scripts/` and `container/` into one today

A test project that is a git repository ignores `node_modules` before its first `git add`, so that the copies are not
committed.

**This repository (R24, R25).** The root's `agentrite.json` is the installed 7.0.0's default file already. The
installed `refresh`, run in a copy of the tracked files, rewrites `.claude/agents/implementer.md` and
`.opencode/agents/implementer.md`: they hold the working tree's description of unit 0052, which 7.0.0 does not. Task
4.2 makes them what the installed release writes. The test of R25 copies every file `git ls-files` lists, so that it
holds whatever a later release writes, and runs the installed release's own `scripts/agentrite.mjs`. Both tests need
`node_modules/agentrite`, and fail, naming `npm ci`, without it.

## Files

- `scripts/agentrite-settings.mjs`: the two keys, the path checks, `checkSettingsFiles`, `settingsText` of five keys
- `scripts/agentrite-roles.mjs`: `ROLE_NAMES`, `parseRoleDescription`, `readRoles`, `plannedFiles(harnesses, roles)`,
  `wrapperDirectories`; the description constants and `ROLES` removed
- `scripts/agentrite-instructions.mjs`: `instructionPaths`, `claudeLines`, the standards argument of the verdicts,
  the kit's standards checks and notices, `agentsNamesList` and its notice, `INSTRUCTIONS_LIST`, `instructionsList`
- `scripts/agentrite-run.mjs`: `ROLE_NAMES` in the place of `ROLES`
- `scripts/agentrite.mjs`: `init`, `refresh`, `roles` and `run` as above; the list among the files of `init` and
  `refresh`; the `CLAUDE.md` template filled with the standards
- `templates/project/agentrite.json`: the default file of R5
- `templates/project/AGENTS.md`, `templates/project/CLAUDE.md`: R15, and `{{standards}}` in the import of `CLAUDE.md`
- `roles/specifier.md`, `roles/planner.md`, `roles/implementer.md`, `roles/reviewer.md`: front matter, R17, R18
- `process.md`: R17
- `tests/installed-kit.mjs`: new, the helper above
- `tests/fixtures/opencode-agents/*.md`: new, the four OpenCode wrappers as the kit writes them before the unit
- `tests/repository-own-files.test.mjs`: new, R24 and R25
- `tests/agentrite-settings.test.mjs`, `tests/agentrite-roles.test.mjs`, `tests/agentrite-instructions.test.mjs`,
  `tests/agentrite-init.test.mjs`, `tests/agentrite-refresh.test.mjs`, `tests/agentrite-run.test.mjs`,
  `tests/agentrite-config.test.mjs`, `tests/check-changes.test.mjs`, `tests/settings-update.test.mjs`,
  `tests/sandbox-unit-run.test.mjs`, `tests/sandbox-update.test.mjs`, `tests/package-documents.test.mjs`: the
  settings, the kit and the expectations of the unit
- `.claude/agents/implementer.md`, `.opencode/agents/implementer.md`: as the installed release writes them (R25)
- `README.md`: R19 to R23
- `SANDBOX.md`: the change check in a clone without `npm ci`, and a project's own files in a clone
- `CONTRIBUTING.md`: the suite needs `npm ci`; the kit's own copy of the kit judged against the installed release

## Tasks

### 1. The settings

- [x] 1.1 Add `tests/installed-kit.mjs` as "What the test projects stand on" says. It makes no temporary directory
  itself (R1, R5)
- [x] 1.2 In `tests/agentrite-settings.test.mjs`, cover before the code: the five keys read back, `roles` in
  `ROLE_NAMES` order whatever order the text has; each refusal of "The settings, judged in this order" with its
  message, a missing `standards`, a `roles` that lacks each role, holds `tester`, is an array, and a path that is
  empty, absolute, `..`, `../x.md`, `a/../../x.md`, and one that is `a/../x.md`, which holds; an unknown key beside
  the five still ignored; `settingsText` of five keys and the template byte for byte; `readSettings` refusing a
  `standards` and a `roles.reviewer` that name no file, a directory, and a dangling link, with the message naming
  the key, the path and that there is no file at it; taking a path whose `node_modules/agentrite` is a link to a
  directory outside the project; and two roles naming one file (R1, R2, R3, R4, R5)
- [x] 1.3 Change `scripts/agentrite-settings.mjs` as decided, with `ROLE_NAMES` exported from
  `scripts/agentrite-roles.mjs` beside `ROLES`, which stays until task 2.4 (R1, R2, R3, R4)
- [x] 1.4 Change `templates/project/agentrite.json` to the default file of R5. `init` from its arguments writes
  `standards` and `roles` from the template and calls `checkSettingsFiles` before writing anything, as decided (R5)
- [x] 1.5 Give every test project of the suite the two keys and a kit to name: `kitSettingsText` in the place of a
  three-key text in `tests/check-changes.test.mjs`, `tests/sandbox-unit-run.test.mjs`, `tests/sandbox-update.test.mjs`,
  `tests/agentrite-refresh.test.mjs` and `tests/agentrite-init.test.mjs`; `installKit` in each project of
  `tests/agentrite-init.test.mjs`, `tests/agentrite-refresh.test.mjs`, `tests/agentrite-run.test.mjs` and
  `tests/check-changes.test.mjs`, with `node_modules` ignored in the last before its first commit; and
  `copyKitInstructions` where `tests/sandbox-unit-run.test.mjs` and `tests/settings-update.test.mjs` copy the kit's
  `scripts/`. A test that lists a project's directory leaves `node_modules` out of what it compares. The expectations
  that hold the three-key default file, in `tests/agentrite-config.test.mjs`, `tests/agentrite-init.test.mjs` and
  `tests/settings-update.test.mjs`, read the template as they do today, and the `edit` steps of the last still find
  `"master"` (R5)
- [x] 1.6 In `tests/agentrite-init.test.mjs`, cover: `init claude opencode` writes the default file of R5 byte for byte;
  `init --default-branch main opencode` writes it with `main` and only `opencode`; `init` from arguments in a project
  with no `node_modules/agentrite` refuses with the message of `standards`, writes nothing and exits 1; `init` with no
  argument in a project whose file lacks `roles` refuses and writes nothing (R1, R4, R5)
- [x] 1.7 In `tests/check-changes.test.mjs` and `tests/sandbox-unit-run.test.mjs`, cover that the change check and a
  unit run that cuts a branch refuse a file whose `standards` names no file, with the reader's message (R4)
- [x] 1.8 Do task 4.1 here, before running the suite: the default file of task 1.4 breaks the test of R41 of unit
  0045, and `readSettings` of task 1.3 refuses the root's three-key file in the test of R42, so step 1 cannot leave
  the suite green with them. Then run `npm test`; all pass. Commit: `feature-0054 Require the standards and the
  roles in agentrite.json`

### 2. The roles from their files, and everything after them from the settings

- [x] 2.1 Before any code changes, write `tests/fixtures/opencode-agents/<role>.md` from what
  `plannedFiles(['opencode'])` returns at that point, one file per role, and check that
  `tests/fixtures/claude-agents/` is what
  `plannedFiles(['claude'])` returns, which its existing test does. These are the wrappers of R7's comparison
- [x] 2.2 In `tests/agentrite-roles.test.mjs`, cover `parseRoleDescription`: both forms, CRLF, the folded form of each
  kit role file giving its description; and `undefined` for no front matter, no closing `---`, another key, an empty
  description, `description: >-` with no line under it, a line indented by one or by four spaces, a blank line inside.
  Cover `readRoles`: the four kit files read from a linked project in `ROLE_NAMES` order; two roles that share a file
  each get its description; the R8 message, naming the path, for a file without front matter (R6, R8)
- [x] 2.3 In `tests/agentrite-roles.test.mjs`, replace the tests that use the constants: `plannedFiles` of both
  harnesses, given `readRoles` of the kit's files, is the eight fixtures byte for byte; with a role's path and file
  replaced, the wrapper carries that file's description and a body that names that path; two roles sharing a file
  both get wrappers with its description. The test that holds the four descriptions as strings goes, since the role
  files are now where they are kept (R7, R9, R2)
- [x] 2.4 Add the front matter to `roles/specifier.md`, `roles/planner.md`, `roles/implementer.md` and
  `roles/reviewer.md`, each in the folded form, its lines the `description: >-` block of today's wrapper for the role,
  copied from `tests/fixtures/claude-agents/<role>.md`. Add `parseRoleDescription`, `readRoles`,
  `wrapperDirectories` and `plannedFiles(harnesses, roles)` to `scripts/agentrite-roles.mjs`, and remove `ROLES` and
  the description constants. `scripts/agentrite-run.mjs` takes `ROLE_NAMES` (R6, R7, R8, R9)
- [x] 2.5 In `tests/agentrite-instructions.test.mjs`, cover before the code: `instructionPaths` and `claudeLines` of
  the kit's standards and of `rules/house.md`; `claudeLacks` and `opencodeVerdict` judged against `rules/house.md`,
  `opencodeVerdict` writing a new file and amending one with that path after `process.md`; the two kit's-standards
  checks, true only for another standards file and a file that holds the kit's line or entry, a non-JSON
  `opencode.json` included, and false for `./node_modules/agentrite/standards.md`; their notices as given;
  `agentsNamesList` and its two notices; `instructionsList` of the default file as given, of a project's own
  standards and roles with links that work from `.agentrite/`, of two roles sharing one file, and of a path with a
  space, linked with `%20`; no line of the default list over 120 characters (R11, R12, R13, R16)
- [x] 2.6 Change `scripts/agentrite-instructions.mjs` as decided (R11, R12, R13, R16)
- [x] 2.7 Rewrite `templates/project/AGENTS.md`: Development Guidelines says that the files
  [`.agentrite/instructions.md`](.agentrite/instructions.md) names are required reading before any change, that they
  are the kit's `process.md`, the project's standards and the file of each role, with what `process.md` and the
  standards hold as it says today, and that the kit writes the list from `agentrite.json`; Roles says that the list
  names each role's file, keeps `{{role_wrapper_directories}}` and says that each wrapper points at one role file;
  the comment under Specific to this project says that what holds for every project is in the files the list names.
  Neither section names `standards.md` or a role file. Rewrite `templates/project/CLAUDE.md`: it bridges the kit's
  `process.md`, the project's standards and `AGENTS.md`, names the list in its text where it names the kit's files
  today, and imports `@node_modules/agentrite/process.md`, `@{{standards}}` and `@AGENTS.md` (R11, R15)
- [x] 2.8 In `tests/agentrite-init.test.mjs`, cover before the code: the files and their order with the list after
  the wrappers; the list's content; `CLAUDE.md` importing the settings' standards between the other two, and the kit's
  in a project that names them; `AGENTS.md` holding `.agentrite/instructions.md` and no `roles/` and no `standards.md`;
  `opencode.json` written with the settings' standards and amended with it; with a project's own standards, a
  `CLAUDE.md` and an `opencode.json` that exist and load the kit's `standards.md` each get the notice, and with the
  kit's they do not; an existing `AGENTS.md` without the list's path gets the sections notice and then the list
  notice, and one with it only the sections notice; a project whose `roles.planner` names a file of its own gets
  wrappers with that file's description and path; a list path that exists is skipped (R9, R11, R12, R13, R14, R15, R16)
- [x] 2.9 In `tests/agentrite-refresh.test.mjs`, cover before the code: the list written, refreshed and up to date,
  and left with a message and exit 1 for a directory or a link at its path, the other files still written; the list
  and the wrappers following a changed `roles.reviewer` and a changed `standards`; the R12 notices for `CLAUDE.md`
  and `opencode.json`, and none with the kit's standards; the R16 notice for a missing `AGENTS.md`, for one without
  the path, whatever the harnesses, and none for one with it; the notices in the order decided; a role file without
  front matter refused with the R8 message and nothing written. Bring the existing expectations of the files
  printed and of `CLAUDE_LINES` and the paths up to date with the list and the standards argument. The test of R41
  and R42 of unit 0045 is gone by then, since task 4.1 is done in step 1 (R9, R11, R12, R13, R14, R16)
- [x] 2.10 In `tests/agentrite-run.test.mjs`, cover before the code: `roles` and `roles --json` list the
  descriptions of the files the settings give, a replaced role's included; `roles` and `run` refuse with no
  `agentrite.json`, with one that is not valid, with a path that names no file and with a role file without front
  matter, each with exit 1, the message of the refusal, nothing on standard output and no harness started; `run`
  refuses a wrapper that points at the kit's file when `roles` names another, and starts with the one `refresh`
  writes then. The test of R7 of unit 0045, that the two read no `agentrite.json`, is replaced by these. The tests
  of the listing that take `ROLES` take `readRoles` of the kit's files (R10)
- [x] 2.11 Change `scripts/agentrite.mjs`: `init`, `refresh`, `roles` and `run` as decided, the list among the
  kit-owned files and among those `init` writes, the `CLAUDE.md` template filled with `standards`, and the notices in
  their order (R9, R10, R11, R12, R13, R14, R15, R16)
- [x] 2.12 In `tests/settings-update.test.mjs` and `tests/sandbox-update.test.mjs`, bring the expectations up to
  date: `refresh` writes the list, and prints the `AGENTS.md` notice for a project without it (R14, R16)
- [x] 2.13 Run `npm test`; all pass. Commit: `feature-0054 Take the roles and the standards from the files the
  settings name`

### 3. What the kit's files say of each other

- [x] 3.1 In `tests/package-documents.test.mjs`, replace the test that each role file says to read `process.md` and
  `standards.md` first: each opens, after its front matter and heading, with the instruction to read
  `[process.md](../process.md)` and the project's standards first, names `.agentrite/instructions.md`, and links no
  `../standards.md`; no text of `process.md` or a role file links `standards.md`; `roles/reviewer.md` links none of
  `specifier.md`, `planner.md` and `implementer.md` and names `.agentrite/instructions.md` for them (R17, R18)
- [x] 3.2 Change `process.md`: its opening says that the rules on how text, documentation, commits, code and tests are
  written are in the project's standards, the file `.agentrite/instructions.md` in the project root names, which is
  the kit's `standards.md` unless the project replaced it; the second case of what blocks says "a rule in
  `process.md` or in the project's standards"; the section Roles says that `.agentrite/instructions.md` names the
  file of each role and that the project's `AGENTS.md` points to it, and that work in no role follows this document,
  the project's standards and the project's `AGENTS.md` alone. The test of R8 of unit 0052, that the section names
  no role file and names `AGENTS.md`, still holds (R17, R15)
- [x] 3.3 Change the four role files: each opens with "Read [process.md](../process.md) and the project's standards
  first", says that the standards are the file `.agentrite/instructions.md` in the project root names and hold the
  rules on how text, documentation, commits, code and tests are written, and says "`process.md` and the standards"
  where it says "`process.md` and `standards.md`". `roles/reviewer.md` then says to read the files of the specifier,
  the planner and the implementer that the list names, as the instructions the work was produced under, and names
  "the project's standards" where it names `standards.md` in what is judged and in what blocks (R17, R18)
- [x] 3.4 Run `npm test`; all pass. Commit: `feature-0054 Send the kit's files to the standards and roles the
  project uses`

### 4. This repository's own files

- [x] 4.1 Done in step 1, as task 1.8 says. Add `tests/repository-own-files.test.mjs` with the two tests as decided:
  the root `agentrite.json` is `node_modules/agentrite/templates/project/agentrite.json` byte for byte, and is not in
  `files` of `package.json`;
  the installed release's `refresh`, in a copy of the tracked files with `node_modules/agentrite` a link to the
  installed one and every copy dated long ago, exits 0, prints `up to date` on every line before the notices, and
  leaves every copy's content and time as they were and no file that was not there. Each fails naming `npm ci` when
  `node_modules/agentrite` is missing. Remove the test of R41 from `tests/package-documents.test.mjs` and that of R42
  from `tests/agentrite-refresh.test.mjs` (R24, R25)
- [x] 4.2 Run `node node_modules/agentrite/scripts/agentrite.mjs refresh` at the root, which rewrites the two
  implementer wrappers, and check that it changes nothing else (R25)
- [x] 4.3 Run `npm test`; all pass. Commit: `feature-0054 Judge this repository's own files against the installed
  release`

### 5. The documents

- [x] 5.1 `README.md`, its opening before the list of sections: what the kit holds by default, the process in
  `process.md`, the standards in `standards.md`, the four roles, specifier, planner, implementer and reviewer, as
  opinionated, and the sandbox; that the process is the same in every project; that a project can replace the
  standards and each role with a file of its own, named in `agentrite.json`, with a link to the section of task 5.3.
  The list of sections holds that section (R23)
- [x] 5.2 "The project's settings": five keys, the table with a row for `standards`, read by `init` and `refresh`,
  and for `roles`, read by `init`, `refresh`, `agentrite roles` and `agentrite run`; the default file of R5; both
  required, naming the kit's files in what `config` and `init` write; a valid path as R2 has it, links followed for
  the file and not for leading outside; two roles may share a file; every command that reads the file refuses a path
  that names no file; `agentrite roles` and `agentrite run` read the file; after changing either key,
  `npx agentrite refresh` rewrites the wrappers and the list, and prints the notices on `CLAUDE.md` and
  `opencode.json`. "Updating a project to a newer kit": a project whose `agentrite.json` lacks the two keys adds them,
  as the default file gives them, before any command that reads the file runs again; `refresh` writes the list; an
  `AGENTS.md` that `init` wrote before has its Development Guidelines and Roles sections replaced by those that
  `npx agentrite init` with no argument prints (R19, R21)
- [x] 5.3 A new section after "The project's settings", "Replacing a role or the standards", which says what such a
  file must hold: a role file, the front matter of R6 in both forms, an opening instruction to read `process.md` and
  the project's standards with a link that works from where the file is, and its input, its output and the status it
  sets in the documents and statuses of `process.md`; a standards file, that it is the project's whole set of rules
  and that a broken rule in it blocks `implemented` as one of the kit's does. It says that a replaced file gets none
  of the kit's later improvements to it, that the file is committed, since a unit run's clone holds only what is
  committed and a path that names no file is refused, and that what a project adds to a role without replacing it
  belongs in its `AGENTS.md` (R20)
- [x] 5.4 "agentrite init", "Installing it into a project", "agentrite refresh", "agentrite roles", "agentrite run"
  and "How the kit's instructions reach an agent": the list among the files `init` writes and `refresh` rewrites,
  with what it holds; the wrappers pointing at the role files the settings give, with their descriptions; the
  `CLAUDE.md` lines and the `opencode.json` paths with the settings' standards; the notices of R12 and R16;
  `AGENTS.md` holding a link to the list and naming no role or standards file; `roles` and `run` reading the settings
  and the role files, and their refusals, R8's among them (R21, R22)
- [x] 5.5 `SANDBOX.md`: the bullet on `npm ci` in a new clone says that without it the change check in the clone
  refuses too, since the files `agentrite.json` names under `node_modules` are not there, and that a project's own
  role or standards file is in the clone only when it is committed. The refusal names the key and the path but not
  what to do, so it is an entry of "When something goes wrong": what is seen, that the file is not in the clone or
  the checkout, and to run `npm ci` or commit the file
- [x] 5.6 `CONTRIBUTING.md`: "The kit's own tests" says that the suite needs `npm ci` first, for the two tests of
  this repository's own files, in the place of "The tests need no install"; "The kit's own copy of the kit" says that
  the root's `agentrite.json` is the installed release's default file and its `refresh` finds every file it writes up
  to date, and that the suite checks both (R24, R25)
- [x] 5.7 Check that no line of a changed document is over 120 characters. Commit: `feature-0054 Describe the
  settings that name the standards and the roles`

### 6. The review

- [x] 6.1 In `tests/agentrite-instructions.test.mjs`, cover before the code, and see it fail: the list links a
  standards path `rules/house#team.md` as `../rules/house%23team.md`, a role path `rules/what?.md` as
  `../rules/what%3F.md`, and `rules/a (b).md` as `../rules/a%20%28b%29.md`; each resolved against the list's place
  names the file, with no query and no fragment (R13, finding S1 of the review)
- [x] 6.2 Change `listItem` in `scripts/agentrite-instructions.mjs` to encode each segment as decided (R13)
- [x] 6.3 Run `npm test`; all pass. Commit: `feature-0054 Encode the characters of a file's name in the list's links`

## Verification

- [x] `npm test` passes, with no test skipped on Linux
- [x] `npm run check-changes` passes
- [x] In a scratch project with the working tree's kit linked as `node_modules/agentrite`: `init claude opencode`
  writes the default file of R5, the list and the eight wrappers, which are the fixtures; `roles.reviewer` and
  `standards` pointed at files of the project's own, `refresh` rewrites the reviewer's wrappers and the list and
  prints the notices on `CLAUDE.md` and `opencode.json`; `roles` lists the project's reviewer; `run reviewer claude`
  refuses until `refresh` has run
- [x] `git diff 6019dd3 -- .claude .opencode` shows only the two implementer wrappers, and
  `node node_modules/agentrite/scripts/agentrite.mjs refresh` at the root prints `up to date` for every file
- [x] Every requirement 1 to 25 is named by a task above. The tasks that name none are those that run the suite and
  commit, 1.8, 2.13, 3.4, 4.3 and 5.7, task 2.1, which names R7 in its text, and task 5.5, on `SANDBOX.md`

## Commit Points

- [x] After task 1.8: the settings
- [x] After task 2.13: the roles and the standards from the settings
- [x] After task 3.4: the kit's files
- [x] After task 4.3: this repository's own files
- [x] After task 5.7: the documents
