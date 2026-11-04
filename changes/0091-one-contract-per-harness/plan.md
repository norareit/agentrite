# 0091 One contract per harness

## Approach

The registries keyed by a harness's name, `HARNESSES` of the roles module, `STARTS` of the run command, `HEADLESS`
of the headless module, and the Claude Code and OpenCode functions of the instructions module with the
`harnesses.includes(...)` branches of `init` and `refresh`, are gathered into one module per harness in a new
directory `scripts/harnesses/`, which holds `claude.mjs` and `opencode.mjs` and nothing else. Each exports one object,
`claude` and `opencode`, that implements the contract. Unit 0090 is implemented on `master`, so requirement 9 holds:
the reading of refused calls is the member `headless.refused`, and `OPENCODE_REFUSAL` moves into `opencode.mjs`.

A new module `scripts/agentrite-harness.mjs` defines the contract and lists the harnesses. It holds:

* `HARNESS_CONTRACT`, the value the test reads: an array of `{ member, kind, purpose }`, where `member` is the
  member's path as `start.command`, `kind` is one of `'string'`, `'function'` and `'strings'` (a list of strings),
  and `purpose` says what it is for in one sentence
* the JSDoc typedef `Harness` beside it, with the same members as nested objects
* `HARNESSES`, the list `[claude, opencode]`, the kit's only list of its harnesses
* what goes over the harnesses, moved here from the roles module: `HARNESS_NAMES`, `harnessesWithAgent`,
  `wrapperDirectories` and `plannedFiles`, and a new `harnessNamed(name)` that returns the harness of the list with
  that name and throws `unknown harness: <name>` for a name that is not one

The contract has these sixteen members, each as today's code has it:

| Member                   | Kind     | From today's code                                                             |
|--------------------------|----------|-------------------------------------------------------------------------------|
| `name`                   | string   | the key of each registry                                                      |
| `title`                  | string   | `HARNESSES[...].title`                                                        |
| `wrappers.directory`     | string   | `HARNESSES[...].directory`                                                    |
| `wrappers.render`        | function | `claudeFile`, `opencodeFile`                                                  |
| `wrappers.ownAgents`     | strings  | `HARNESSES[...].ownAgents`, with its comment and links                        |
| `start.command`          | string   | `STARTS[...].command`                                                         |
| `start.skipPermissions`  | string   | `STARTS[...].skipPermissions`                                                 |
| `start.interactive`      | function | `STARTS[...].interactive`                                                     |
| `start.headless`         | function | `STARTS[...].headless`                                                        |
| `headless.arguments`     | function | `HEADLESS[...].arguments`                                                     |
| `headless.read`          | function | `HEADLESS[...].read`                                                          |
| `headless.follow`        | function | `followClaude`, `followOpencode`, with `CLAUDE_TOOLS` and `OPENCODE_TOOLS`    |
| `headless.refused`       | function | `refusedClaude`, `refusedOpencode`, with `OPENCODE_REFUSAL`                   |
| `instructions.file`      | string   | `'CLAUDE.md'`, `OPENCODE_FILE`                                                |
| `instructions.init`      | function | `claudeInitNotices` and `writeOpencodeJson` of `scripts/agentrite.mjs`, pure  |
| `instructions.refresh`   | function | the two branches of `instructionNotices` of `scripts/agentrite.mjs`           |

The tool names are part of `headless.follow` and `headless.refused`, which use them, and the judging of the file is
part of `instructions.init` and `instructions.refresh`, which judge it, so neither is a member of its own that no code
would call.

`instructions.init(read, standards)` is pure. It takes the file as `readProjectFile` read it and returns
`{ content, line, notices }`: the text to write, or `undefined` to write nothing; the line `init` prints of the file,
or `undefined` for none; and the notices. For OpenCode it returns what `writeOpencodeJson` prints, writes and returns
today, in each of its three cases. For Claude Code it returns no content and no line, and the notices of
`claudeInitNotices`; for a file that is missing it returns no notices, since `init` writes `CLAUDE.md` from its
template before it is called, as today. `instructions.refresh(read, standards)` returns the notices of today's branch.

`init` in `scripts/agentrite.mjs` then calls, at the place where it writes `opencode.json` today and under the same
`settings.process`, a new `writeInstructionFiles(root, harnesses, standards)`. It goes over `HARNESSES` in the kit's
order, keeps those of `harnesses`, reads each one's `instructions.file`, calls `instructions.init`, writes the content
when there is one (with the flag `wx` when the file was missing, as today), prints the line when there is one, and
returns the notices. The check of `CLAUDE.md` in the loop over the files is removed. This keeps the output as it is:

* the notices of `CLAUDE.md` came before those of `opencode.json` and after those of `AGENTS.md`, and the steps between
  the loop and the write of `opencode.json` add no notice, so judging `CLAUDE.md` after the loop keeps the order
* a `CLAUDE.md` that `init` wrote from its template holds every line `claudeLacks` looks for and imports the
  project's own standards, so judging it after the write gives no notice, as not judging it gives today
* the harnesses are taken in the kit's order, as the two fixed branches take them today, whatever order they were
  given in

`refresh`'s `instructionNotices` goes over `HARNESSES` in the same way and calls `instructions.refresh`. `runStep`
takes `harnessNamed(step.harness).headless`, `harnessCommand` takes `harnessNamed(harness).start`, and the usage of
`init`, the parsing of its arguments, the written settings and the settings module take `HARNESS_NAMES` from the new
module.

What both harness modules use stays shared:

* `scripts/agentrite-headless.mjs` keeps the typedefs `Followed` and `Call` and exports the readers both use:
  `isRecord`, `stringOrNone`, `jsonRecord`, `jsonRecords`, `textFollowed` and `callFollowed`. `HEADLESS` and the
  readers of one harness leave it
* `scripts/agentrite-roles.mjs` keeps the roles, `wrapWords` and `isKitWrapper`, and exports `descriptionBlock` and
  `wrapperBody` (today's `body`), which both renderers use
* `scripts/agentrite-instructions.mjs` keeps the paths, `instructionPaths`, `readProjectFile`, the `AGENTS.md` notice
  and the list, and exports what both harness modules use: `INSTRUCTIONS_SECTION` (today's `SECTION`), `isOwnStandards`
  and `messageOf`

The named exports that tests import today keep their names and move with their code: `claudeLines`, `claudeLacks`,
`claudeInitNotice`, `claudeRefreshNotice`, `claudeLoadsKitStandards` and `claudeKitStandardsNotice` to `claude.mjs`;
`OPENCODE_FILE`, `opencodeVerdict`, `opencodeInitNotice`, `opencodeRefreshNotice`, `opencodeLoadsKitStandards` and
`opencodeKitStandardsNotice` to `opencode.mjs`.

No import cycle arises: the harness modules import the roles, headless, instructions and JSON modules, the list module
imports the harness modules, and none of the shared modules imports the list module.

The help text of `agentrite run`, and the writing of `CLAUDE.md` in `processFiles` and `readTemplates`, stay as they
are, by the decisions of the spec.

The existing tests change only in what they import and where from. Two kinds of change follow from that and from
nothing else. A test that reached `HEADLESS.claude` or `HEADLESS.opencode` reaches the same object as
`claudeHarness.headless` or `opencodeHarness.headless`, imported as `{ claude as claudeHarness }` and
`{ opencode as opencodeHarness }`, since `tests/agentrite-orchestrate.test.mjs` has local variables named `claude`
and `opencode`. And three tests that copy the scripts the sandbox wrapper runs with node copy the files those scripts
now import as well. No assertion, input or expected value changes.

## Files

- `scripts/agentrite-harness.mjs`: new. The contract, its typedef, the list, `harnessNamed`, and what goes over the
  harnesses
- `scripts/harnesses/claude.mjs`: new. The Claude Code module
- `scripts/harnesses/opencode.mjs`: new. The OpenCode module
- `scripts/agentrite-roles.mjs`: loses the registry and what goes over it, and exports the two rendering helpers
- `scripts/agentrite-headless.mjs`: loses `HEADLESS` and the per-harness readers, and exports the shared readers
- `scripts/agentrite-instructions.mjs`: loses the per-harness functions, and exports the three shared helpers
- `scripts/agentrite-run.mjs`: loses `STARTS`, and imports `HARNESS_NAMES` and `harnessNamed` from the new module
- `scripts/agentrite-settings.mjs`: imports `HARNESS_NAMES` and `harnessesWithAgent` from the new module
- `scripts/agentrite.mjs`: imports from the new module, `writeInstructionFiles` replaces `writeOpencodeJson` and
  `claudeInitNotices`, `instructionNotices` and `runStep` go through the contract, and comments that named
  `CLAUDE.md` and `opencode.json` as the files init and refresh judge say the instruction file of each harness
- `tests/agentrite-harness.test.mjs`: new. The tests of requirements 4 and 10, and of the new logic
- `tests/agentrite-config.test.mjs`, `tests/agentrite-init.test.mjs`, `tests/agentrite-instructions.test.mjs`,
  `tests/agentrite-orchestrate.test.mjs`, `tests/agentrite-outcome.test.mjs`, `tests/agentrite-refresh.test.mjs`,
  `tests/agentrite-roles.test.mjs`, `tests/agentrite-run.test.mjs`, `tests/settings-update.test.mjs`: their imports
- `tests/sandbox-dev.test.mjs`, `tests/sandbox-project-dockerfile.test.mjs`, `tests/sandbox-wrapper.test.mjs`: the
  scripts they copy
- `package.json`: `files` lists the three new modules
- `tests/package-documents.test.mjs`: the list of the package's files names the three new modules
- `CONTRIBUTING.md`: the section "Adding a harness", and its line in the contents at the top
- `AGENTS.md`: the row of `CONTRIBUTING.md` in the table of the documents says it holds what adding a harness takes

## Tasks

- [x] Write `tests/agentrite-harness.test.mjs`, which fails until the modules exist. It holds:
    * a function of the test file that gives the faults of one harness against `HARNESS_CONTRACT`: for each member,
      `<name> lacks <member>` when the path leads to nothing, and `<name> has <member> as <found kind>, and the
      contract makes it <kind>` when the value is of another kind, where a `strings` value is an array whose items
      are all strings (R4)
    * a test that goes over every harness of `HARNESSES` and asserts its faults are empty, the message naming them
      (R4)
    * a test that the function bites: a copy of `claude` without `start.command` gives
      `claude lacks start.command`, and one whose `wrappers.ownAgents` is a string gives the kind fault for it (R4)
    * a test that `HARNESS_CONTRACT` holds the sixteen members of the approach, each with a kind of the three and a
      purpose that is not empty, so that a member is not dropped unseen (R2)
    * a function of the test file that compares the files of a directory with a list of names: `<file> is in
      scripts/harnesses/ and not in HARNESSES` for a file that is no `<name>.mjs` of the list, and `<name> is in
      HARNESSES and scripts/harnesses/ has no <name>.mjs` for an entry without its file (R10)
    * a test that `readdirSync` of `scripts/harnesses/` against the names of `HARNESSES` gives no fault, and one that
      the function bites, for a file too many and for an entry without its file (R10)
    * a test that `HARNESS_NAMES` is `['claude', 'opencode']`, in that order, and that `harnessNamed` gives each
      harness by its name and throws `unknown harness: <name>` for another (R3)
    * tests of `instructions.init` of each harness: for OpenCode, a missing file gives the content of today's
      `opencodeVerdict` and the line `wrote opencode.json`, a file that loads the instructions gives no content and
      the line `skipped opencode.json, which loads <paths>`, a file that cannot be amended gives the line
      `skipped opencode.json, which cannot be amended` and the init notice, and a file listing the kit's standards
      beside the project's own adds the kit-standards notice; for Claude Code, a missing file gives nothing, a file
      lacking lines gives the init notice, and a file importing the kit's standards beside the project's own gives
      the kit-standards notice (R1, R5)
    * tests of `instructions.refresh` of each harness, one case per notice it can give (R1, R5)
- [x] Export `descriptionBlock`, and `body` as `wrapperBody`, from `scripts/agentrite-roles.mjs` (R1)
- [x] Export `isRecord`, `stringOrNone`, `jsonRecord`, `jsonRecords`, `textFollowed` and `callFollowed` from
  `scripts/agentrite-headless.mjs`, and reword its opening comment for a module of shared readers (R1)
- [x] Export `INSTRUCTIONS_SECTION` (renamed from `SECTION`), `isOwnStandards` and `messageOf` from
  `scripts/agentrite-instructions.mjs` (R1)
- [x] Write `scripts/harnesses/claude.mjs`: the object `claude` with the members of the table, its renderer, its start,
  its headless run with `CLAUDE_TOOLS`, its reading of the final response and of refused calls, its instruction file
  `CLAUDE.md`, and `init` and `refresh` as the approach says; the moved Claude Code functions of the instructions
  module and `linesOf`, keeping their names and exports; the comment on `ownAgents` with its links (R1, R9)
- [x] Write `scripts/harnesses/opencode.mjs` in the same way, with `OPENCODE_TOOLS`, `OPENCODE_REFUSAL`, the
  `OpencodeEvent` typedef, `opencodeEvent`, `readOpencode`, `OPENCODE_SCHEMA`, the `OpencodeFailure` typedef and the
  moved OpenCode functions, keeping their names and exports (R1, R9)
- [x] Write `scripts/agentrite-harness.mjs` with `HARNESS_CONTRACT`, the typedef `Harness`, `HARNESSES`,
  `HARNESS_NAMES`, `harnessNamed`, and `harnessesWithAgent`, `wrapperDirectories` and `plannedFiles` moved from the
  roles module, which go through the list and `harnessNamed` (R2, R3)
- [x] Remove from `scripts/agentrite-roles.mjs` `claudeFile`, `opencodeFile`, `HARNESSES`, `HARNESS_NAMES`,
  `harnessesWithAgent`, `wrapperDirectories` and `plannedFiles`; from `scripts/agentrite-headless.mjs` `HEADLESS`,
  the readers, followers and refusals of each harness and their tool names; and from
  `scripts/agentrite-instructions.mjs` the functions and constants that moved (R3)
- [x] In `scripts/agentrite-run.mjs`, remove `STARTS` and take `harnessNamed(harness).start` in `harnessCommand`, and
  import `HARNESS_NAMES` from the new module; leave `runUsage` as written (R3, R5)
- [x] In `scripts/agentrite-settings.mjs`, import `HARNESS_NAMES` and `harnessesWithAgent` from the new module (R3)
- [x] In `scripts/agentrite.mjs`, import from the new module; add `writeInstructionFiles` and call it where
  `writeOpencodeJson` is called today; remove `writeOpencodeJson`, `claudeInitNotices` and the check of `CLAUDE.md`
  in the loop of `init`; make `instructionNotices` go over `HARNESSES` and call `instructions.refresh`; make
  `runStep` take `harnessNamed(step.harness).headless`; reword the comments that named the two harnesses' files as
  the ones judged; leave `processFiles` and `readTemplates` writing `CLAUDE.md` (R3, R5)
- [x] Change the imports of the existing tests, and nothing else of them, as the approach says: `plannedFiles`,
  `HARNESS_NAMES`, `harnessesWithAgent` and `wrapperDirectories` from `scripts/agentrite-harness.mjs`; the Claude Code
  and OpenCode functions from their modules; `HEADLESS.claude` and `HEADLESS.opencode` as `claudeHarness.headless`
  and `opencodeHarness.headless` in `tests/agentrite-outcome.test.mjs` and `tests/agentrite-orchestrate.test.mjs` (R5)
- [x] In `tests/sandbox-dev.test.mjs`, `tests/sandbox-project-dockerfile.test.mjs` and `tests/sandbox-wrapper.test.mjs`,
  add to the list of copied scripts `agentrite-harness.mjs`, `agentrite-headless.mjs`, `agentrite-instructions.mjs`
  and `agentrite-json.mjs`, and copy `scripts/harnesses/` with `cpSync` and `recursive: true`, so that no test names a
  harness module and a new one is copied without a change; confirm by running them that the list is the whole
  closure of `agentrite-settings.mjs` and `agentrite-cleanup-period.mjs` (R5)
- [x] In the test "no file under scripts/ has a shebang but the commands the package has" of
  `tests/agentrite-roles.test.mjs`, read the files of `scripts/` and its subdirectories rather than every entry of
  `scripts/`, which now holds the directory `harnesses/` and fails with `EISDIR`. Added by the implementer (R5, R10)
- [x] Add `scripts/agentrite-harness.mjs`, `scripts/harnesses/claude.mjs` and `scripts/harnesses/opencode.mjs` to
  `files` of `package.json`, after `scripts/agentrite-roles.mjs`, and the same three to the list in the test
  "package.json keeps the one command and the files the package holds" of `tests/package-documents.test.mjs`. Listing
  each file keeps the test that every imported file is listed passing unchanged (R6)
- [x] Search `scripts/*.mjs` outside `scripts/harnesses/` for `'claude'`, `'opencode'`, `CLAUDE`, `OPENCODE`,
  `claude` and `opencode`, ignoring case, and confirm that what is left is the help text of `runUsage`, the
  `CLAUDE.md` of `processFiles` and `readTemplates`, the comments on that writing, and
  `scripts/agentrite-cleanup-period.mjs`, which the sandbox runs and the checklist names (R3)
- [x] Add the section "Adding a harness" to `CONTRIBUTING.md`, before "Releasing", with its line in the contents at
  the top. It opens with the contract: a module `scripts/harnesses/<name>.mjs` that exports an object implementing
  `HARNESS_CONTRACT` of `scripts/agentrite-harness.mjs`, its place in `HARNESSES` there, its file in `files` of
  `package.json` and in the test of the package's files, and `tests/agentrite-harness.test.mjs` as the check of that
  part, which fails for a member the module lacks or a module the list lacks. Then one entry per place, each naming
  the file or section and saying what to do there (R7):
    * the image, `container/Dockerfile`: install the harness at the version a build argument without a default
      gives, and record it in a label `com.ritenoar.agentrite.<harness>-version`
    * the choice of that version in `container/sandbox.sh`, from the project's compose file, the host's `--version`
      or the latest published, with the build arguments of `container/compose.yml`, the shape of a version the
      wrapper accepts, and the comparison with the image's label at each start
    * turning off the harness's own updates in the image
    * the directories of its logs: made and owned in the image, owned at `container/entrypoint.sh`, mounted by the
      wrapper from the project's log directory on the host, and outside the home volume
    * its login: where it is kept, and a login that needs no callback into the sandbox
    * the hosts the egress allowlist admits for it, in `container/compose.yml` and the comment of
      `templates/project/sandbox/compose.project.yml`
    * the bell: the hook or plugin under `container/bell/` that rings it, and its wiring in the wrapper
    * the status line, which only Claude Code has: `container/claude-managed-settings.json` and its mount
    * how long the harness keeps its sessions, which only Claude Code carries from the host:
      `scripts/agentrite-cleanup-period.mjs` and its call in the wrapper
    * the trailers it adds to a commit message, which `container/check-commit-message.mjs` refuses, and the rule on
      them in `standards.md`
    * the terminal variables the wrapper passes on, which were added for OpenCode
    * the default `harnesses` of `templates/project/agentrite.json`, this repository's own `agentrite.json`,
      wrappers and instruction files (`CLAUDE.md`, `opencode.json`, `.claude/`, `.opencode/`), its own
      `sandbox/compose.project.yml`, and the table "What the repository holds besides the package" that lists them
    * the `CLAUDE.md` that `init` writes into every project, from `templates/project/CLAUDE.md` in `processFiles`
      of `scripts/agentrite.mjs`, which a new harness's file is not written beside unless its module's
      `instructions.init` writes it
    * the default orchestrator, `orchestrator.json`, whose steps name a harness and its model
    * the help texts that name harnesses, in the usage of `agentrite run` in `scripts/agentrite-run.mjs`
    * the sections of `README.md`, `COMMANDS.md`, `ORCHESTRATOR.md`, `SETUP.md` and `SANDBOX.md` that name each
      harness, the keywords of `package.json`, and the text of the `agentrite-roles` pointer package in `pointers/`
    * the components diagram, `diagrams/components.mmd`, which names each harness and the directory of its role
      wrappers, with its SVG generated by `npm run diagrams` and committed with it
    * the tests that hold a case for each harness, such as `tests/agentrite-run.test.mjs`,
      `tests/agentrite-orchestrate.test.mjs` with its fake harnesses, `tests/agentrite-init.test.mjs`,
      `tests/agentrite-refresh.test.mjs`, `tests/harness-versions.test.mjs`,
      `tests/dockerfile-log-directories.test.mjs`, `tests/bell.test.mjs` and `tests/compose-allowlist.test.mjs`
- [x] In the table of the documents of `AGENTS.md`, add "what adding a harness takes" to what goes in
  `CONTRIBUTING.md`, which the new section makes true (R7)
- [x] Run `git grep -l -i -e claude -e opencode -- . ':!changes' ':!CHANGELOG.md' ':!scripts/harnesses'`, which
  leaves out `node_modules` and `.git` as untracked, and account for every file it lists against the checklist, or as
  one that names a harness only as a model's id, an example of a log entry or the author of a commit. Add an entry to
  the checklist for a place it misses. Log the result in `record.md` (R8)

## Verification

- [ ] `npm test` passes, the new `tests/agentrite-harness.test.mjs` among it
- [x] `git diff master -- tests/` shows, in the existing test files, only import lines, the `HEADLESS` identifiers,
  the lists of copied scripts, the list of the package's files, the shebang test of the task the implementer added,
  and two lines of `tests/agentrite-outcome.test.mjs` wrapped to 120 characters after their identifier grew (R5, R6)
- [x] A copy of `scripts/harnesses/claude.mjs` with `start.command` removed makes the contract test fail with
  `claude lacks start.command`, and a file `scripts/harnesses/extra.mjs` makes the directory test fail naming it;
  both undone afterwards (R4, R10)
- [x] `npm pack --dry-run` lists `scripts/agentrite-harness.mjs`, `scripts/harnesses/claude.mjs` and
  `scripts/harnesses/opencode.mjs` (R6)
- [x] Every changed line is at most 120 characters, a Markdown table row excepted
- [x] `npm run check-changes` passes on the committed branch

## Commit Points

- [x] `feature-0091 Plan the harness contract`: `plan.md` and the planner's entry in `record.md`
- [x] `feature-0091 Gather each harness into a module that implements one contract`: the new modules, the changed
  scripts, the new test file, the import changes of the existing tests, `package.json` and its test. The tree passes
  `npm test` at this commit
- [x] `feature-0091 Describe adding a harness in CONTRIBUTING.md`: the section, its line in the contents, and the row
  of `AGENTS.md`
- [x] `feature-0091 Record the implementation and the verification`: the implementer's entries in `record.md`
