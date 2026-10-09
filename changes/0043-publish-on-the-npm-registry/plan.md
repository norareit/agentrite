# 0043 The kit is published on the npm registry

## Approach

The unit is built in six steps that are each reviewable alone, and the suite is green after each:

1. **The name**, in one commit: `name` of `package.json`, the three places in `scripts/` that hold the installed
   path, the four templates, and every test and fixture, with the tests' expectations changed first
2. **What the registry shows**, in one commit: the other fields of `package.json`, and `LICENSE`
3. **The checks of `npm publish`**, in one commit: a script of this repository's own, its tests, and the
   `prepublishOnly` script that runs it
4. **The host goes**, in one commit: `infra/`, `deploy.sh`, their tests and devDependencies, and the host in the
   kit's allowlist
5. **The pointers**, in one commit
6. **The documents**, in one commit

Then the trial of requirement 5 and what "Verification" lists, which change no tracked file but `record.md`.

**The name is in three places of the code.** `BODY_LINE` of `scripts/agentrite-roles.mjs`, and `CHECK_CHANGES` and
`KIT_CONTAINER` of `scripts/agentrite.mjs`, from which the exception of `.dockerignore` is made. Everything else a
command writes or prints comes from those or from `templates/project/`. `container/` holds no installed path: the
kit's script works out where it is, and passes it on as `AGENTRITE_CONTAINER`. `process.md`, `roles/` and
`templates/changes/` do not name the package. So requirement 4 is those three constants, the four templates,
`README.md`, and nothing else of the package.

**Lines get shorter, not longer.** `node_modules/agentrite` is ten characters shorter than the path it replaces, so
no line passes 120 characters by the rename. A paragraph is wrapped again only where its text is rewritten. The
role wrappers are wrapped by `wrapWords` as they are written, so the body of each breaks at another word than now,
and the four files of `tests/fixtures/claude-agents/` are written anew from what the command writes.

**Tests that hold an old name.** After the unit no tracked file outside `changes/`, `CHANGELOG.md` and this
repository's own setup names `@ritenoar/agentrite` (R10), and that holds for the tests:

* The tests of a wrapper that "names an earlier package" make one by putting `@ritenoar/agent-kit` in the place of
  the package's name. They go on doing that, with `node_modules/agentrite` as what is replaced. `@ritenoar/agent-kit`
  is not a name requirement 10 lists
* `tests/sandbox-update.test.mjs` holds, as two strings, the shim and the compose file of release 4.2.0. It tests
  the four steps of unit 0041, which are about the names of the sandbox and not about where the kit is installed.
  The kit's path in the two strings and in `kitPath` becomes `node_modules/agentrite`, and the comment above them
  says that the two files are those of release 4.2.0 but for that path. The line of the old compose file about
  "the kit's release host" stays: it names no host
* The cases of `tests/agentrite-init.test.mjs` in which a `.dockerignore` excludes the scope's directory,
  `node_modules/@ritenoar`, exclude `node_modules/agentrite` instead, and `sandboxName` is given another scoped
  name, `@acme/my-kit`, which gives `acme-my-kit-sandbox`
* Requirement 5 gets no test in the suite. A test of it would hold the files of release 5.0.0, which name
  `@ritenoar/agentrite` on every other line, and requirement 10 leaves no tracked file to hold them in. The
  requirement names its own proof: the implementer does the four steps by hand in a scratch project and logs what
  was seen. "Verification" gives the commands
* A test that the kit does not admit its old host cannot name the host. `tests/compose-allowlist.test.mjs` gets a
  test that `KIT_ALLOWLIST` holds exactly the six hosts that are left, which fails while the seventh is there

**The checks of `npm publish` are a script at the root, `publish-check.mjs`.** `prepublishOnly` of `package.json`
is `node publish-check.mjs && npm test`. npm runs `prepublishOnly` on `npm publish` alone, before it packs and
before it sends anything, and gives up the publish when the script exits with a status other than 0. So the three
checks run in this order: the release notes (R6), the working tree (R22), the suite (R7). The cheap ones come
first, and the working tree is looked at before the suite runs in it.

* The script is at the root and not under `scripts/`: every file of `scripts/` is in the package, and this one is
  not, as `deploy.sh` and `sandbox-dev.sh` are not. It is not in `files`, so `npm pack` leaves it out (R3). It takes
  the row of `deploy.sh` in the table of `CONTRIBUTING.md`
* It exports two functions that take text and return text, and its entry point does the reading and the printing:
    * `missingReleaseNotes(changelog, version)` returns the message of requirement 6 when no line of `changelog` is
      exactly `## <version>`, or when `changelog` is `undefined` because the file is missing, and `undefined`
      otherwise
    * `uncommittedChanges(status)` takes what `git status --porcelain --untracked-files=no` printed and returns the
      message of requirement 22, with what follows the two status letters and the space of each line on a line of
      its own, or `undefined` when it printed nothing. `git status` is used and not `git diff HEAD`, which does not
      show a change that is staged and then undone in the working tree
* The entry point reads `package.json` and `CHANGELOG.md` in the working directory, which npm sets to the root of
  the package, and runs `git status` there. It prints the first message there is to standard error, opening with
  `✗` as `deploy.sh` did, and exits 1. When `git status` itself fails it prints what git printed and exits 1. It
  reads no branch. Whether it is run or imported is told the way `scripts/agentrite.mjs` tells it
* The two messages, with `5.0.0` and two files standing for what is found:

  ```
  ✗ CHANGELOG.md has no section headed "## 5.0.0". Write the release notes as RELEASING.md
    describes, commit them, and run npm publish again.
  ```

  ```
  ✗ These tracked files hold a change that is not committed:
    README.md
    package.json
    Commit the changes or put them aside, and run npm publish again.
  ```

* No lifecycle script but `prepublishOnly` is added. `prepare`, `prepack` and `prepublish` run on `npm install`,
  `npm ci` or `npm pack` as well, and a test holds `package.json` to having none of them (R8). The
  `prepublishOnly` of a dependency never runs in the project that installs it
* An agent never runs `npm publish`, with `--dry-run` or without: on the host the human's login may be there. The
  script is run for "Verification" as `npm run prepublishOnly`, which publishes nothing

**`package-lock.json` follows `package.json`.** Requirement 18 lists it among what is unchanged. The plan reads
that as it must be read for `npm ci` to go on working: the entry of the kit's own devDependency,
`node_modules/@ritenoar/agentrite`, with its URL and its integrity hash, is byte for byte what it was. The root
entry follows `package.json`, with the new name, the license and the one devDependency that is left, and the
packages that the five removed devDependencies brought are gone, which leaves two entries under `packages`. A
lockfile that still listed the five would make `npm ci` refuse. It is written by
`npm install --package-lock-only --ignore-scripts` in each commit that changes the name, the license or the
devDependencies, and `git diff` is read after each for the kit's entry.

**Step 7 of `RELEASING.md` loses one name.** Requirement 15 says that step 7 is unchanged, and its last sentence of
the second paragraph names `deploy.sh`, which requirement 10 lets no tracked file name. The plan takes the step as
unchanged in its command, in who runs it and in what it says of the tag, with `npm publish` where that one
sentence names `deploy.sh`.

**How to go on after a refusal, in `RELEASING.md`.** Requirement 15 names four refusals and gives the way on for
the first. The plan writes the other three so that each ends with the tag on the commit that is published:

* The missing section: as the file gives it now. Write the notes, commit them, move the tag with
  `git tag -fa v<version> -m "<version>"`, run `npm publish` again
* The working tree: a change that belongs in the release is committed, and the tag moved in the same way. One that
  does not is put aside with `git stash`. Then `npm publish` again
* A failing test: nothing is published. It is repaired in a unit in `changes/`, on a branch, as step 1 says of a
  test that fails there. When that unit is on `master`, the section is given the unit, the tag is moved in the same
  way, and `npm publish` is run again
* A version that is on the registry already: the registry refuses it, with npm's error, and a published version is
  never replaced. That is what a forgotten `npm version` gives. Run `npm version` and then `npm publish`

**This repository's own setup stays on the old name (R18).** After the unit `package.json` is named `agentrite`
and still has the devDependency `@ritenoar/agentrite` by its URL, and the `check-changes` script, `AGENTS.md`, the
role wrappers, `sandbox.sh`, `.dockerignore` and `sandbox/compose.project.yml` are untouched. So `README.md`,
`RELEASING.md` and the templates describe a project of the new release, and this repository is not one until the
unit of human step 5. Two things follow, and neither is repaired here:

* Step 6 of `RELEASING.md` names the devDependency `agentrite`, which this repository does not have yet
* `./sandbox-dev.sh` runs a sandbox that no longer admits `agentrite.ritenoar.com`, so `npm ci` in a unit run of
  the working copy's sandbox fails until this repository has moved. `./sandbox.sh` runs the sandbox of release
  5.0.0, which admits it

**What the planner tried**, on the host with npm 11.19.1 and node 26.9.0, in scratch directories:

* `npm install --save-dev --save-exact agentrite@1.0.0` in a package that is itself named `agentrite` installs the
  registry's package, and `npm ci` installs it again. The spec has this as not established. It is for the unit of
  human step 5, and changes nothing here
* `npx agentrite` at the root of a package that has a `bin` named `agentrite` runs that package's own file and not
  `node_modules/.bin/agentrite`, whatever the package is named. That is so today as well, so the rename changes
  nothing in which command `npx agentrite` runs in this repository
* The registry holds `agentrite` at `1.0.0` and `agentrite-roles` at `1.0.0`, each as its only version. The
  `2.0.0` of `agentrite-roles` that unit 0038 made was not published. `2.0.1` is free either way
* `npm pack --dry-run --json` on `master` at `996db03` gives `ritenoar-agentrite-5.0.0.tgz` with the 28 files that
  "Verification" lists

## Files

Added:

- `LICENSE`: the MIT License, as below
- `publish-check.mjs`: the two checks, as "Approach" says. Executable, with the `#!/usr/bin/env node` line
- `tests/publish-check.test.mjs`: its tests

Removed:

- `infra/`, all seven files
- `deploy.sh`
- `tests/deploy.test.mjs` and `tests/record-name.test.mjs`
- `pointers/agentrite/`, all three files

Changed, of the package:

- `package.json`: `name`, no `private`, `description`, `keywords`, `homepage`, `bugs`, `license`, `repository`,
  the script `prepublishOnly`, no script `deploy`, and no devDependency but `@ritenoar/agentrite`. `bin`, `files`,
  `version`, `type`, the scripts `test` and `check-changes`, and the devDependency that is left stay as they are
- `scripts/agentrite-roles.mjs`: `BODY_LINE`
- `scripts/agentrite.mjs`: `CHECK_CHANGES` and `KIT_CONTAINER`
- `templates/project/AGENTS.md`: the package's name, and the path in the link to `process.md` and in the four
  links to the role files, each in its text and in its target. The first paragraph is wrapped again
- `templates/project/CLAUDE.md`: the path, in the text of the link and in its target
- `templates/project/sandbox.sh`: the path it runs
- `templates/project/sandbox/compose.project.yml`: the path in the second line, and the comment above `ALLOWLIST`,
  which ends its list of hosts with "auth.openai.com, chatgpt.com and the npm registry."
- `container/compose.yml`: `KIT_ALLOWLIST` without the host and without the comment line above it
- `README.md` and `SANDBOX.md`: as the tasks say

Changed, of the repository only:

- `package-lock.json`: as "Approach" says
- `.gitignore`: no line `cdk.out/`
- `pointers/agentrite-roles/pointer.mjs`, `README.md` and `package.json`
- `CONTRIBUTING.md`, `RELEASING.md`, `.claude/skills/release/SKILL.md`
- `tests/agentrite-init.test.mjs`, `tests/agentrite-refresh.test.mjs`, `tests/agentrite-roles.test.mjs`,
  `tests/agentrite-run.test.mjs`, `tests/sandbox-unit-run.test.mjs`, `tests/sandbox-update.test.mjs`,
  `tests/sandbox-wrapper.test.mjs`, and the four files of `tests/fixtures/claude-agents/`: the name
- `tests/package-documents.test.mjs`: what `package.json` holds, and `LICENSE`
- `tests/compose-allowlist.test.mjs`, `tests/entrypoint-allowlist.test.mjs`: the host
- `tests/pointers.test.mjs`, `tests/release.test.mjs`

Not changed, and read in "Verification" to be so: `CHANGELOG.md`, `AGENTS.md`, `CLAUDE.md`, `.claude/agents/`,
`.opencode/agents/`, `sandbox.sh`, `sandbox-dev.sh`, `.dockerignore`, `sandbox/compose.project.yml`, `process.md`,
`roles/`, `templates/changes/`, and every file of `container/` but `compose.yml`.

`LICENSE` holds this and nothing else, with one newline at its end:

```
MIT License

Copyright (c) 2026 Stef Klaassen

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Tasks

The name:

- [x] In the seven test files that "Files" lists for the name, change every expectation from
  `node_modules/@ritenoar/agentrite` to `node_modules/agentrite`: the constants `CHECK_CHANGES`, `KIT_CONTAINER`
  and `kitPath`, the regular expressions that hold the path with its slashes escaped, the directory a test makes
  with `join(base, 'node_modules', '@ritenoar', 'agentrite', 'container')`, and the recorded
  `AGENTRITE_CONTAINER=`. Change what "Approach" names under "Tests that hold an old name": the three makers of
  "an earlier package name", the two strings and the comment of `tests/sandbox-update.test.mjs`, the cases of a
  `.dockerignore` that excludes the scope's directory, and the scoped name given to `sandboxName`. The suite fails
  now (R4, R10)
- [x] Change `BODY_LINE`, `CHECK_CHANGES` and `KIT_CONTAINER`, and the four templates as "Files" says, without the
  comment above `ALLOWLIST`, which is a later task's (R4)
- [x] Write the four files of `tests/fixtures/claude-agents/` anew as `plannedFiles(['claude'])` gives them, and
  read each: its frontmatter is what it was, and its body names `node_modules/agentrite/roles/<role>.md` (R4, R10)
- [x] Set `name` of `package.json` to `agentrite`, and write `package-lock.json` with
  `npm install --package-lock-only --ignore-scripts`. Read `git diff package-lock.json`: the two lines that hold
  the name changed, and nothing else. When npm changed a line of the entry `node_modules/@ritenoar/agentrite`,
  put that entry back as it was (R1, R18)
- [x] Run `npm test`, which passes with the 421 tests it had, and commit

What the registry shows:

- [x] In `tests/package-documents.test.mjs`, add the failing tests of what `package.json` holds: the `name` is
  `agentrite`; there is no key `private`; `license` is `MIT`; `repository` is exactly
  `{ type: 'git', url: 'git+https://github.com/norareit/agentrite.git' }`; `description`, `keywords`, `homepage`
  and `bugs` are exactly what requirement 21 gives, the keywords in its order; `bin` is exactly
  `{ agentrite: 'scripts/agentrite.mjs' }`; and `files` is exactly the ten entries it has now, in their order.
  Add one that `LICENSE` is a file at the root that holds the line `Copyright (c) 2026 Stef Klaassen` and opens
  with `MIT License` (R1, R2, R21)
- [x] Change `package.json` so that they pass, with the new keys in npm's usual order: `description` after
  `version`, then `keywords`, `homepage`, `bugs`, `license` and `repository`, and `type` and what follows it as
  they are. Write `package-lock.json` as before, and read its diff: the root entry gained `"license": "MIT"`, and
  nothing else changed (R1, R21, R18)
- [x] Add `LICENSE` as "Files" gives it (R2)
- [x] In "What is here" of `README.md`, add the row `LICENSE`, after the row of `README.md`, with "The MIT License,
  which the kit is open source under" as what it holds (R2)
- [x] Run `npm test` and commit

The checks of `npm publish`:

- [x] Add `tests/publish-check.test.mjs` with the failing tests of the two functions, given plain text (R6, R22):
    - `missingReleaseNotes` returns `undefined` for a changelog with the line `## 5.0.0`, at its top and in its
      middle. It returns the message for a changelog without it, for one that holds only `### 5.0.0`, `## 5.0.01`,
      `## 15.0.0` or `## 5.0.0 and more`, and for `undefined`. The message holds `CHANGELOG.md`, `"## 5.0.0"`,
      `RELEASING.md`, "commit them" and "run npm publish again"
    - `uncommittedChanges` returns `undefined` for the empty string. For ` M README.md\nA  new file.txt\n` it
      returns a message that holds `README.md` and `new file.txt` on a line each, "is not committed", "Commit the
      changes or put them aside" and "run npm publish again"
- [x] In the same file, add the failing tests of the script as it is run, with the working directory at a scratch
  git repository that holds a committed `package.json` at version `5.0.0` and a committed `CHANGELOG.md`, made the
  way `tests/check-changes.test.mjs` makes its repository (R6, R22):
    - with the section and a clean tree: status 0, and nothing on standard error
    - without the section: status 1, standard error is the message of requirement 6, and standard output is empty
    - without a `CHANGELOG.md`: the same
    - with the section and a tracked file changed and not staged: status 1, and standard error names the file
    - with the change staged, and with the change staged and then undone in the working tree: the same
    - with the section and an untracked file: status 0
    - with the section, a clean tree and another branch checked out than `master`: status 0
    - without the section and with a changed file: the message of the release notes, and not the other
- [x] In `tests/package-documents.test.mjs`, add the failing tests that `scripts.prepublishOnly` is exactly
  `node publish-check.mjs && npm test`, that `scripts` holds none of `preinstall`, `install`, `postinstall`,
  `prepublish`, `preprepare`, `prepare`, `postprepare`, `prepack` and `postpack`, and that `files` does not hold
  `publish-check.mjs` (R3, R7, R8)
- [x] Add `publish-check.mjs` as "Approach" says, and the script `prepublishOnly` to `package.json`, after `test`.
  The tests of the three tasks before pass (R6, R7, R8, R22)
- [x] In `tests/release.test.mjs`, in the list of the files that name `RELEASING.md`, put `publish-check.mjs` in
  the place of `deploy.sh` (R9)
- [x] Run `npm test` and commit

The host goes:

- [x] In `tests/compose-allowlist.test.mjs`, take the host out of `needed`, and add the failing test that the hosts
  of `KIT_ALLOWLIST` are exactly `api.anthropic.com`, `platform.claude.com`, `models.opencode.ai`,
  `auth.openai.com`, `chatgpt.com` and `registry.npmjs.org`. In `tests/entrypoint-allowlist.test.mjs`, put
  `models.opencode.ai` in the place of the host, in `KIT` and in the four expectations (R10, R11)
- [x] In `container/compose.yml`, remove the host and the comment line above it from `KIT_ALLOWLIST`. In
  `templates/project/sandbox/compose.project.yml`, change the comment above `ALLOWLIST` as "Files" says, with its
  lines no longer than those beside them (R11)
- [x] Remove `infra/`, `deploy.sh`, `tests/deploy.test.mjs` and `tests/record-name.test.mjs` with `git rm`, the
  script `deploy` and the five devDependencies from `package.json`, and the line `cdk.out/` from `.gitignore`
  (R9)
- [x] Write `package-lock.json` as before and read its diff: the root entry lost the five devDependencies, every
  entry under `packages` is gone but the root's and `node_modules/@ritenoar/agentrite`, and that entry is byte for
  byte what it was. Then run `npm ci`, which exits 0, and `npm run check-changes`, which starts (R9, R18)
- [x] Run `npm test` and commit

The pointers:

- [x] In `tests/pointers.test.mjs`, change the expectations, which fail now (R9, R14):
    - the loop over the two names, the test that `agentrite` is not installed and the test of the pointer
      `agentrite` at `1.0.0` go, and the comment at the top of the file says what the one pointer is for
    - the manifest of `agentrite-roles` is still a publishable package with the one command, and its `version` is
      exactly `2.0.1`, in the place of the test that it is above `1.0.0`. Its `description` holds `agentrite`, and
      neither it, the message nor the `README.md` matches `/release URL/`, `/not (on|from) the npm registry/` or
      `/@ritenoar/`. No expectation names the address the README was at before
    - the message still exits 1 with nothing on standard output, still holds what it says of `init`, `refresh`
      and `--no-sandbox`, still holds no `|`, and holds `AgentRite is the package agentrite`,
      `npm install agentrite` and, at the end of a line, `https://github.com/norareit/agentrite`
    - the `README.md` holds the same three
- [x] Remove `pointers/agentrite/` with `git rm` (R9)
- [x] In `pointers/agentrite-roles/pointer.mjs`, make the last two lines of the message
  ``AgentRite is the package agentrite. Install it with `npm install agentrite`.`` and
  `Its README is at https://github.com/norareit/agentrite`. In its `README.md`, make the paragraph that names the
  package say the same in two sentences. In its `package.json`, set `version` to `2.0.1` and `description` to
  `Holds the name of a command AgentRite no longer has, and points to AgentRite, the package agentrite`. The exit
  status, the comment and the first four lines of the message stay (R14)
- [x] Run `npm test` and commit

The documents:

- [x] `README.md`, the name: `agentrite` and `node_modules/agentrite/` in the opening paragraph, in the second form
  of "check-changes", in the JSON of the `check-changes` script, in the two lines of the `.dockerignore` example
  and in the sentence under it, in the path of `templates/project/`, in the path of `CHANGELOG.md`, in the path of
  `SANDBOX.md`, and in the path the shim execs. Every form, option, variable and table row stays (R4)
- [x] `README.md`, "Installing it into a project": the first paragraph says that the kit is the package `agentrite`
  on the npm registry, and that a project adds it by its name. The command is `npm install agentrite`. The
  paragraph after it says that npm writes the package, with a range from the version it installed, into the
  project's `package.json`, and the version, its address on the registry and an integrity hash into
  `package-lock.json`. Its sentence that the kit assumes npm stays as it is. "On a fresh clone" stays as it is
  (R12)
- [x] `README.md`, "Updating a project to a newer kit": it opens with "Install the newest release:" and
  `npm install agentrite@latest`. The paragraph after it keeps that only `package.json` and `package-lock.json`
  change and are committed, and says that `npm outdated` reports when a newer release exists, in the place of the
  sentence that nothing does. The rest of the section stays (R13)
- [x] `SANDBOX.md`: remove the row of the host from the table under "Reaching more hosts", and narrow the table's
  first column to its widest cell in every row. Nothing else in the file changes, and it gets no entry in "When
  something goes wrong" (R11)
- [x] `CONTRIBUTING.md` (R17):
    - "What the repository holds besides the package": the rows of `infra/` and `deploy.sh` go. A row
      `publish-check.mjs` comes where `deploy.sh` was, with "What `npm publish` checks before it publishes". The
      row of `pointers/` says "The package that holds the name `agentrite-roles`"
    - "Commands": `### npm publish` in the place of `### deploy.sh`, with the one form `npm publish`. It says that
      it publishes the package at the version in `package.json` on the npm registry; that before anything is sent
      it refuses a version with no section in `CHANGELOG.md` and a working tree with a change to a tracked file
      that is not committed, and runs `npm test`, publishing nothing when a test fails; that the kit adds no
      argument, option or environment variable of its own to it; that it runs on the host, with the npm login that
      owns the package; and that an agent does not run it. It ends with `See "Releasing".`
    - "The kit's own tests": the bullet that releasing needs an install goes. The other two bullets and what
      follows them stay
    - "The kit's own copy of the kit": the last bullet says that `npm publish` stays on the host, because
      releasing needs the npm login that owns the package, which never enters the sandbox. Every other line of
      the section stays as it is, the old name and "by its URL" among them (R18)
    - "Releasing": it opens by saying that a release is a version of the package `agentrite` on the npm registry,
      which a project installs by its name. The sentence about `infra/` and its four bullets go. The paragraph
      about the `/release` skill stays. The last paragraph says that releasing runs on the host only: it needs the
      npm login that owns the package, and that never enters the sandbox
- [x] `RELEASING.md`, the opening and steps 1 to 4 (R15):
    - the list: step 5 is "What the human runs: `npm version` and `npm publish`"
    - the paragraph under it: `npm publish` wherever it names `./deploy.sh`, and the clause "the move of the
      README's version among it" goes
    - step 1: `npm publish` runs the suite too, where it says that of `./deploy.sh`. Its last line says that
      `npm publish` needs the npm login that owns the package `agentrite`, which never enters the sandbox
    - step 2: the bullet about the devDependency says that the line names the kit as a devDependency and was
      moved to the version `<tag>` names. The bullet about the version in the install commands of `README.md`
      goes. The last bullet says "The published version keeps what it shipped with"
    - step 4: its list is two items, the heading and the commit of `CHANGELOG.md` alone as
      `Release notes for <version>`. The paragraph under it says that the notes are committed first because
      `npm version` refuses a working tree that is not clean, and so the tree the tag names holds the section, and
      the package does too. Its sentence about the README goes. The last paragraph names `npm publish` where it
      names `./deploy.sh`
- [x] `RELEASING.md`, step 5 (R15): the two commands are `npm version <patch|minor|major>` and `npm publish`, run
  from the root, on the host, with the npm login that owns the package `agentrite`, which never enters the
  sandbox. An agent runs neither. It keeps what it says of `npm version`, with the reason for the bump being that
  the registry takes a version once. It says that `npm publish` checks three things before anything is sent, in
  the order of "Approach", and then packs the kit and sends it, and that it prints `+ agentrite@<version>` when it
  has worked. It gives the four refusals and the way on from each as "Approach" has them, and keeps the paragraph
  on why the tag stays an annotated one. Everything about `aws`, the stacks, the bucket, the upload and the fetch
  of the URL goes
- [x] `RELEASING.md`, steps 6 and 7 (R15): in step 6 the first command is
  `npm install --save-dev --save-exact agentrite@<version>`, the release is installed from the registry and so
  the step comes after `npm publish`, on the human's word that it succeeded, the devDependency is named
  `agentrite`, what is said of `npm install` is that it fetches the version `npm publish` published and fails
  when the registry does not have it, `package.json` differs by the one version, and the last paragraph says that
  the version is public once `npm publish` ends. The other four commands, what is read afterwards, the three
  reasons to stop, the putting back and the commit stay word for word. In step 7 the one `deploy.sh` becomes
  `npm publish`, and nothing else changes
- [x] In `tests/release.test.mjs`, change the `description` of the expected frontmatter to end "and once it is
  published moves this repository to the release.", which fails. Then change `.claude/skills/release/SKILL.md` to
  that (R16)
- [x] Read the four documents once more against `git diff master`: every form, option, variable and table row that
  was there and is not of the host is there, no line passes 120 characters, `SANDBOX.md` holds no HTML, no command
  in `README.md` names a version of the kit, and none of the four says why the kit moved (R12, R13, R15, R17)
- [x] Run `npm test` and commit

The trial and the log:

- [x] Do the trial of requirement 5 as "Verification" gives it, and log in `record.md` each command, its exit
  status and what was seen. When a step fails, or the project needs a step that is not one of the four, stop: the
  requirement does not hold, and that goes back to the specifier and the human (R5)
- [x] Read "Human steps" below against the tree as it was built: every command in it names a file, a script, a
  version and a message that are there. Correct in this plan what the implementation made different, and log the
  correction. Take none of the steps (R20)
- [x] Do everything else under "Verification", log what was run and what was not, and commit `record.md` and the
  ticks of this plan (R3, R10, R18, R19)

## Verification

- [x] `npm test` passes. Log how many tests
- [x] `npm run check-changes` exits 0, with everything committed
- [x] `npm pack --dry-run --json` names `agentrite-5.0.0.tgz` and lists 29 files: `LICENSE`, and the 28 that
  `master` packs, which are `CHANGELOG.md`, `README.md`, `SANDBOX.md`, `package.json`, `process.md`, the eight
  files of `container/`, the four of `roles/`, the four of `scripts/` that `files` names, the three of
  `templates/changes/` and the four of `templates/project/`. It runs no test and prints nothing of
  `publish-check.mjs` (R3, R8)
- [x] With a clean tree, `npm run prepublishOnly` exits 0 after running the suite. Then, with one tracked file
  changed and not committed, it exits 1 with the message of requirement 22 and runs no test. Put the file back
  with `git restore`. `npm publish` is not run, with no option (R7, R22)
- [x] This prints the lines of "The kit's own copy of the kit" of `CONTRIBUTING.md` that name
  `node_modules/@ritenoar/agentrite/`, and no other line (R10, R18):

  ```sh
  git grep -n -I -i -E 'agentrite\.ritenoar\.com|infra/|deploy\.sh|cdk|\baws\b|@ritenoar\\?/agentrite' -- . \
    ':!changes' ':!CHANGELOG.md' ':!package.json' ':!package-lock.json' ':!AGENTS.md' ':!.claude/agents' \
    ':!.opencode/agents' ':!sandbox.sh' ':!.dockerignore' ':!sandbox/compose.project.yml'
  ```

- [x] The same pattern over `package.json` prints two lines, the `check-changes` script and the devDependency, and
  `git grep -n -i bitbucket -- . ':!changes' ':!CHANGELOG.md'` prints nothing (R10, R14, R18)
- [x] This prints nothing (R18, R19):

  ```sh
  git diff master --stat -- CHANGELOG.md AGENTS.md CLAUDE.md .claude/agents .opencode/agents sandbox.sh \
    sandbox-dev.sh .dockerignore sandbox/compose.project.yml process.md roles templates/changes
  ```

- [x] `git diff master -- package-lock.json` holds no changed line inside the entry
  `node_modules/@ritenoar/agentrite`, and `git diff master --stat -- changes` names this unit alone (R18)
- [x] `git grep -n -E 'agentrite@[0-9]|[0-9]+\.[0-9]+\.[0-9]+\.tgz' -- README.md` prints nothing (R13)
- [x] With Docker on the host, `./sandbox-dev.sh --in-place true` exits 0: the working copy's sandbox starts
  without the host. Where the session has no Docker, ask the human to run it, and log the result or that it was
  not run (R11)
- [x] The trial of requirement 5, on the host, where Docker is. The project is made as release 5.0.0 sets one up,
  which needs the old host, so it is done before human step 8:

  ```sh
  trial="$(mktemp -d)/kit-trial" && mkdir "$trial" && cd "$trial"
  git init --quiet --initial-branch master
  npm init --yes
  npm install https://agentrite.ritenoar.com/ritenoar-agentrite-5.0.0.tgz
  npx agentrite init claude opencode
  printf 'node_modules/\n' > .gitignore
  git add . && git commit --quiet --message 'A project as release 5.0.0 set it up'
  (cd /path/to/this/repository && npm pack --pack-destination "$trial/..")
  ```

  Then the four steps of requirement 5, with the packed tarball as what step 1 installs, and nothing else that
  changes a file:

  ```sh
  npm uninstall @ritenoar/agentrite
  npm install ../agentrite-5.0.0.tgz
  npx agentrite refresh claude opencode
  sed -i 's#node_modules/@ritenoar/agentrite#node_modules/agentrite#g' \
    AGENTS.md CLAUDE.md .dockerignore sandbox/compose.project.yml package.json
  sed -i 's#@ritenoar/agentrite#agentrite#g' AGENTS.md
  ./sandbox.sh --in-place --rebuild true
  ```

  What is seen when it has worked:
    - `npm install` of the tarball ran no test and printed nothing of `publish-check.mjs` (R8)
    - `refresh` printed the eight wrappers as refreshed and `sandbox.sh` as refreshed
    - `grep -rn '@ritenoar' --exclude-dir=node_modules --exclude-dir=.git .` prints nothing
    - `ls $(grep -oh 'node_modules/agentrite/[a-z/]*\.md' AGENTS.md CLAUDE.md .claude/agents/*.md
      .opencode/agents/*.md | sort -u)` lists `process.md` and the four role files, with no error: the roles are
      found
    - `git add . && git commit --quiet --message 'Moved'`, then `npm run check-changes` exits 0: the change check
      runs
    - `./sandbox.sh --in-place --rebuild true` exited 0: the image was built from `node_modules/agentrite/container`
      and the sandbox started

  Where the session has no Docker, do everything but the last command, ask the human to run that one in the
  directory, and go on from its result. Afterwards remove what the trial made: the directory,
  `docker image rm kit-trial-sandbox`, `docker volume rm kit-trial-sandbox_agent-home`,
  `docker network rm kit-trial-sandbox_default` and `~/.local/share/agentrite/kit-trial` (R5)

## Commit Points

- [x] `feature-0043 Plan publishing on the npm registry`: `plan.md` and `record.md`
- [x] `feature-0043 Start the implementation`: `record.md`, with the status `in-progress`
- [x] `feature-0043 Name the package agentrite`: the tasks of the name
- [x] `feature-0043 Describe the package for the registry, with its license`: the tasks of what the registry shows
- [x] `feature-0043 Check the release notes, the working tree and the suite in npm publish`: the tasks of the checks
- [x] `feature-0043 Remove the release host and what deployed it`: the tasks of the host
- [x] `feature-0043 Point agentrite-roles at the package, and drop the pointer agentrite`: the tasks of the pointers
- [x] `feature-0043 Describe the registry in the documents`: the tasks of the documents
- [x] `feature-0043 Log the work and what was run`: `record.md`, and the ticks of this plan

## Human steps

These are the human's, taken once the unit is on `master`, in this order. They are a numbered list and not
checkboxes because they come after the unit is `implemented`, and the change check counts every open box in this
file. `<version>` is the version of the release of step 3, which is `6.0.0` when no other release is made first.

1. **Create the repository on GitHub.** At `https://github.com/new`: the owner `norareit`, the name `agentrite`,
   Public, and none of "Add a README file", "Add .gitignore" and "Choose a license", so that the first push is not
   refused. With the GitHub CLI it is one command:

   ```sh
   gh repo create norareit/agentrite --public \
     --description "A kit for running coding agents by a fixed process"
   ```

   It has worked when `git ls-remote git@github.com:norareit/agentrite.git` exits 0 and prints nothing. It asks for
   an SSH key of this computer on the GitHub account. With HTTPS in place of SSH, the address in every command
   below is `https://github.com/norareit/agentrite.git`
2. **On this computer, point `origin` at GitHub, with Bitbucket as a second address to push to, and push.** In the
   repository root, on `master`, with the unit merged:

   ```sh
   git remote set-url origin git@github.com:norareit/agentrite.git
   git remote set-url --add --push origin git@github.com:norareit/agentrite.git
   git remote set-url --add --push origin git@bitbucket.org:ritenoar/agentrite.git
   git remote -v
   ```

   Both push addresses are added by hand: the first `--add --push` replaces the one git takes from the fetch
   address. `git remote -v` then prints three lines:

   ```
   origin  git@github.com:norareit/agentrite.git (fetch)
   origin  git@github.com:norareit/agentrite.git (push)
   origin  git@bitbucket.org:ritenoar/agentrite.git (push)
   ```

   Then push `master` and every tag, and fetch:

   ```sh
   git push origin master
   git push origin --tags
   git fetch --prune origin
   ```

   Each push prints two answers, GitHub's with `* [new branch]` or `* [new tag]` and Bitbucket's with what it did
   not have yet. `https://github.com/norareit/agentrite` then shows the README and the MIT license, and
   `git ls-remote --tags origin` lists `v5.0.0` among the tags. `git fetch --prune` drops the remote-tracking
   branches `origin/feature-0010-init`, `origin/feature-0010-init2` and `origin/feature-0010-init3` here, which
   GitHub does not have. They stay on Bitbucket
3. **Make the release, with a major version, and without its step 6.** It waits for step 2. On the host, on
   `master`, in a session of Claude Code:

   ```
   /release
   ```

   The agent runs steps 1 and 2 of `RELEASING.md` and stops at step 3. Read the section: its "Worth knowing when
   you update" has to hold the four steps of requirement 5 of this unit's spec, since they are what a project does
   to move. Pick major. On your word the agent commits the section and names the two commands. See that the login
   is the one that owns the package, and run them:

   ```sh
   npm whoami
   npm owner ls agentrite
   npm version major
   npm publish
   ```

   `npm whoami` prints a name that `npm owner ls agentrite` lists. When it does not, `npm login` first.
   `npm publish` runs the three checks, the suite last, asks for a one-time password when the account has two-factor
   authentication, and ends with `+ agentrite@<version>`. Then `npm view agentrite dist-tags` prints
   `{ latest: '<version>' }`.

   Tell the agent that `npm publish` succeeded and that step 6 is left out: this release cannot run it, because
   the move takes the steps of requirement 5 and not that step's five commands. See step 5 below. Then run step 7
   of `RELEASING.md`, which reaches GitHub and Bitbucket alike:

   ```sh
   git push --follow-tags origin master
   ```

   Then mark the pointer the name held until now as deprecated:

   ```sh
   npm deprecate agentrite@1.0.0 \
     "A pointer. AgentRite itself is this package from <version> on: npm install agentrite@latest"
   ```

   It has worked when `npm view agentrite@1.0.0 deprecated` prints that text
4. **Publish the pointer `agentrite-roles`.** It waits for step 3, because it sends a reader to a package that has
   to be there:

   ```sh
   (cd pointers/agentrite-roles && npm publish)
   ```

   It ends with `+ agentrite-roles@2.0.1`. The checks of the kit's own `npm publish` do not run for it. Then, in an
   empty directory:

   ```sh
   cd "$(mktemp -d)"
   npx --yes agentrite-roles
   npx --yes agentrite roles
   ```

   The first prints the new text, with `npm install agentrite` and `https://github.com/norareit/agentrite` in it,
   and exits 1. The second runs the kit's command: it lists the four roles and exits 0. When either prints what
   the pointers printed before, npx took an older copy from its cache: run it as `npx --yes agentrite-roles@latest`
   and `npx --yes agentrite@latest roles`
5. **Have the unit specified that moves this repository to the release, and approve it.** It waits for step 3. In
   a session of Claude Code on the host, on `master`, ask the specifier for a unit that moves this repository to
   `<version>` by the steps of requirement 5 of this unit's spec:
    1. `npm uninstall @ritenoar/agentrite`, then the install. This repository holds the kit as a devDependency
       pinned to one version, so the install is the one step 6 of `RELEASING.md` gives:
       `npm install --save-dev --save-exact agentrite@<version>`
    2. `npx agentrite refresh claude opencode`
    3. Replace `node_modules/@ritenoar/agentrite` with `node_modules/agentrite` in `AGENTS.md`, `CLAUDE.md`,
       `.dockerignore`, `sandbox/compose.project.yml` and the `check-changes` script of `package.json`, and
       `@ritenoar/agentrite` with `agentrite` where `AGENTS.md` names the package
    4. `./sandbox.sh --in-place --rebuild true`

   That unit also changes what "The kit's own copy of the kit" of `CONTRIBUTING.md` says of where the copy is and
   where it is installed from, which this unit left. It has worked when the unit is `approved` on `master`. It is
   then planned, built, reviewed and merged like any unit, and pushed
6. **On the other computer, set the remotes as in step 2.** In the repository there:

   ```sh
   git remote set-url origin git@github.com:norareit/agentrite.git
   git remote set-url --add --push origin git@github.com:norareit/agentrite.git
   git remote set-url --add --push origin git@bitbucket.org:ritenoar/agentrite.git
   git remote -v
   git fetch --prune origin
   git pull
   ```

   `git remote -v` prints the three lines of step 2, and `git pull` brings `master` to what step 3 pushed. Nothing
   is pushed from there
7. **Move each other project that uses the kit to the release, as a unit of its own there.** It waits for step 3.
   In each, with the harnesses that project uses in the place of `claude opencode`:

   ```sh
   npm uninstall @ritenoar/agentrite
   npm install agentrite
   npx agentrite refresh claude opencode
   sed -i 's#node_modules/@ritenoar/agentrite#node_modules/agentrite#g' \
     AGENTS.md CLAUDE.md .dockerignore sandbox/compose.project.yml package.json
   sed -i 's#@ritenoar/agentrite#agentrite#g' AGENTS.md
   ./sandbox.sh --in-place --rebuild true
   ```

   A project that holds the kit as a devDependency installs it with `npm install --save-dev agentrite`. It has
   worked when the sandbox command exits 0, `npm run check-changes` exits 0, and
   `git grep -n -e '@ritenoar/agentrite' -e 'agentrite.ritenoar.com' -- . ':!changes'` prints nothing in that
   project. Merge the unit into the project's main branch and push it
8. **Delete the two stacks and the bucket.** It waits for steps 5 and 7 to be on the main branch of each
   repository, and for each of those to be pulled on both computers, with `npm ci` run there. Before it, in each
   repository, `git grep -n 'agentrite.ritenoar.com' -- package.json package-lock.json` prints nothing. After it
   no commit of any of them from before its move can run `npm ci`, and `./sandbox-dev.sh` here is not the only
   thing that cannot reach the host.

   `infra/` is gone from the tree by then, so the stacks are deleted with the AWS CLI and not with the CDK. Read
   the bucket's name first, because the stack that knows it is deleted:

   ```sh
   export AWS_PAGER=""
   aws sso login
   bucket="$(aws cloudformation describe-stacks --stack-name AgentRiteHostingStack --region eu-west-1 \
     --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)"
   echo "$bucket"

   aws cloudformation delete-stack --stack-name AgentRiteHostingStack --region eu-west-1
   aws cloudformation wait stack-delete-complete --stack-name AgentRiteHostingStack --region eu-west-1

   aws cloudformation delete-stack --stack-name AgentRiteCertStack --region us-east-1
   aws cloudformation wait stack-delete-complete --stack-name AgentRiteCertStack --region us-east-1

   aws s3 rb "s3://$bucket" --force
   ```

   The hosting stack goes first, because it uses the certificate of the other. Its `wait` takes the longest, a
   quarter of an hour or more, while the distribution is taken down, and it takes the DNS record of
   `agentrite.ritenoar.com` with it. The bucket is retained when its stack is deleted, and `aws s3 rb --force`
   empties and deletes it, every released tarball among it.

   When a `wait` ends with a failure, this names the resource and the reason:

   ```sh
   aws cloudformation describe-stack-events --stack-name <stack> --region <region> --output text \
     --query "StackEvents[?ResourceStatus=='DELETE_FAILED'].[LogicalResourceId,ResourceStatusReason]"
   ```

   It has worked when `aws cloudformation describe-stacks` says of each stack, in its region, that it does not
   exist, `aws s3 ls "s3://$bucket"` says `NoSuchBucket`, and
   `curl --silent --show-error --head https://agentrite.ritenoar.com/` fails to resolve the host. Then look in the
   hosted zone `ritenoar.com` for a CNAME record whose name ends in `.agentrite.ritenoar.com`, which the
   validation of the certificate may have left, and delete it when it is there
