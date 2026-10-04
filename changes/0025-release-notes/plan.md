# 0025 Release notes with every release

## Approach

One new file that ships, a section in `AGENTS.md`, a check at the top of `deploy.sh` with its tests, and the README.
`process.md`, `roles/`, `templates/`, `scripts/` and `container/` do not change.

**The check in `deploy.sh`.** It goes ahead of the AWS session check, so `cd "$ROOT"` moves up with it. The version
is read from `package.json` with `node`, which the script already uses, and the heading is matched as a whole line:

```sh
cd "$ROOT"

VERSION="$(node -p 'JSON.parse(require("node:fs").readFileSync("package.json", "utf8")).version')"
if ! grep -qxF "## $VERSION" CHANGELOG.md 2>/dev/null; then
  echo "✗ CHANGELOG.md has no section headed \"## $VERSION\". Write the release notes as AGENTS.md" >&2
  echo "  describes under \"Release notes\", commit them, and run this again." >&2
  exit 1
fi
```

`grep -x` matches the whole line and `-F` takes the dots literally, so `## 1.2.30` is not the section for `1.2.3`.
The `2>/dev/null` makes a missing file the same refusal. The script's header comment gains a sentence on the check.

**The tests.** `tests/deploy.test.mjs` copies the script into an empty `kit` directory. `release()` gains two
options and writes two files there before the run: a `package.json` holding `{"version": "1.2.3"}`, which is the
version of the stubbed tarball, and a `CHANGELOG.md` whose content is the `changelog` option, defaulting to a file
with a `## 1.2.3` section, or no file when the option is `null`. The five existing tests then run unchanged, which
is requirement 8. The stubs log every call, so "before it calls anything" is an assertion that the log holds no
line starting with `aws`, `npm` or `npx`.

**The changelog.** `CHANGELOG.md` at the repository root, added to `files` in `package.json` after `process.md`.
Its whole content, for the human to read and correct before approving:

```markdown
# Changelog

What each release of AgentRite changed, newest first, and what is worth knowing before a project updates to it.
The numbers in parentheses are change units. Each is a directory under `changes/` in the kit's own repository, which
holds the reasoning and is not in the package. The changelog begins at 2.3.0, and first shipped in the release after
it.

## 2.3.0

### What changed

* The sandbox admits four more hosts itself, through the kit's own allowlist, with no change to a file of the
  project's: `platform.claude.com`, without which Claude Code does not start in a sandbox that holds no saved login,
  and `models.opencode.ai`, from which OpenCode fetches its model catalog (0015); `auth.openai.com` and
  `chatgpt.com`, which OpenCode needs to log in with a ChatGPT account and to send its prompts (0023)
* A developer's own Claude Code status line is shown in the sandbox. When `~/.claude/statusline-command.sh` is a
  file on the host, the wrapper mounts it read-only, together with a new file of the kit's,
  `container/claude-managed-settings.json`, whose one setting runs it. With no such file on the host, nothing is
  mounted (0022)
* The README has a new section, "Logging in to a model provider": a login that sends the browser back to
  `localhost` cannot complete in the sandbox, and OpenCode's login with a ChatGPT account is
  `opencode auth login -p openai -m "ChatGPT Pro/Plus (headless)"` (0023)
* A spec has a new section, "Beyond the request", for what the planner would add and the request does not need. It
  is in `process.md`, `roles/planner.md` and the spec template (0019)
* The comment above `ALLOWLIST` in the compose file `init` writes for a project names the four new hosts among the
  kit's own (0015, 0023)
* The package holds 23 files, one more than 2.2.1: `container/claude-managed-settings.json` (0022)
* Not in the package: `./agent-dev.sh`, which runs the sandbox from the kit's working copy and which the README
  describes (0021), and the kit repository's own sandbox files and its dependency on a released kit (0016, 0018)

### Worth knowing when you update

* The update needs nothing but the install. No command or option changed, `refresh` writes what it wrote in 2.2.1,
  and the image needs no rebuild: the changes take effect when the sandbox next starts
* Every sandbox now admits `auth.openai.com` and `chatgpt.com`, whether or not the project uses OpenAI. `chatgpt.com`
  serves the whole of ChatGPT, not only what OpenCode uses, and data can leave a sandbox through any host it admits
  (0023)
* The sandbox checks at start-up that every host it admits can be reached, the kit's own among them, and refuses to
  start when one cannot. On a network that blocks one of the four new hosts, a sandbox that started under 2.2.1
  therefore stops with `allowlisted host <host> is not reachable`. This was read from the entrypoint and not tried
  on such a network (0015, 0023)
* For a developer who has `~/.claude/statusline-command.sh` on the host, that script now runs inside the sandbox,
  where it finds only the tools of the image, `jq` and `git` among them. While the host file exists it replaces a
  status line set inside the sandbox (0022)
* A project's own `agent/compose.project.yml` is never rewritten, so the comment above its `ALLOWLIST` still lists
  the kit's hosts as they were when `init` wrote it (0015, 0023)
* A spec written before this release has no "Beyond the request" section and needs none. The change check does not
  look for it (0019)
```

**The rule.** A new section at the end of `AGENTS.md`, with this wording:

```markdown
## Release notes

`CHANGELOG.md` holds one section per release and ships in the package. A section is written when a release is made,
for all the units in it at once, and never by a unit as it is implemented: a unit cannot know which version it will
be released in, and one summary of a whole release reads better than lines written apart. The order of a release is
in the README, under "Releasing".

When asked to write the release notes:

* Build the section from the repository, not from memory. Find the last version tag with
  `git describe --tags --abbrev=0`
* The units of the release are those whose `record.md` says `implemented` now and did not at that tag.
  `git diff <tag> HEAD --stat -- changes/` shows which units moved, and
  `git grep '^status:' <tag> -- 'changes/*/record.md'` gives the statuses at the tag. Read the spec and the record
  of each, not its title: what a release changes for a project is in the decisions, in the paragraph that states a
  unit's boundary, and in what the record says was not established
* Read the diff of what ships since the tag: `git diff <tag> HEAD` over `README.md`, `package.json` and every path
  in `files` of `package.json`. Every change in it belongs to a unit. Name one that does not to the human, and write
  it in the section without a number. A consequence nobody wrote down is found only here
* Write the section at the top of `CHANGELOG.md`, above the last release's, headed `## <version>` with the version
  you propose and nothing else on the line. It has two parts:
    * `### What changed`: a line for each change a project gets, ending with the numbers of its units in
      parentheses. It closes with a line that opens with "Not in the package:" and names the units that changed
      this repository only, or says "nothing". Every unit of the release is on one line or the other
    * `### Worth knowing when you update`: what changes for a project that updates, without the project having
      asked for it. Something the sandbox newly admits, mounts or runs; a default that changed; something that may
      stop working; a step the update needs, such as a rebuild of the image, a `refresh` or an edit to a file of
      the project's own. Say of anything that was not tested that it was not. This part is always there, and says
      "Nothing." when there is nothing
* Write for a reader who has the package and not this repository: what changed and what it means for them, not how
  it was found
* In your answer, propose major, minor or patch, with the reason, and name every change in the shipped diff that
  has no unit
* Stop there. The human reads the section, corrects it and picks the version. Do not commit it before that, and do
  not run `npm version` or `./deploy.sh`
* A release is not a unit and has no directory in `changes/`. On the human's word, commit the section on `master`
  as `Release notes for <version>`, with no unit prefix
* A section of an earlier release may be corrected in place, for example for a consequence found later. The
  released tarball keeps what it shipped with
```

**The README.** Four places, removing nothing but the two sentences the new order replaces:

* "What is here": a row for `CHANGELOG.md`, "What each release changed, and what is worth knowing when updating to
  it", after the `process.md` row
* "Installing it into a project": the sentence that lists what a project receives names `CHANGELOG.md` among the
  listed files
* "Updating a project to a newer kit": after the paragraph that ends "Moving to a newer kit is a deliberate change
  to the project", a paragraph saying that what a release changed, and what is worth knowing when updating to it,
  is in the kit's `CHANGELOG.md`, which after the install is at `node_modules/@ritenoar/agentrite/CHANGELOG.md`,
  one section per release, newest first; and that a project that skips releases reads every section between its
  old version and the new one
* "Releasing": the sentence "A release starts with a version bump, then `deploy.sh`, from the repository root and
  with AWS credentials for the account:" and its code block become the new order, on `master`:
  1. An agent is asked to write the release notes. It adds a section to `CHANGELOG.md` for the units implemented
     since the last release and proposes major, minor or patch. How it does that is in `AGENTS.md`, under "Release
     notes"
  2. The human reads the section, corrects it and picks the version, changing the heading when the pick differs
     from the proposal. The section is committed as `Release notes for <version>`
  3. `npm version patch`, or `minor`, or `major`
  4. `./deploy.sh`, with AWS credentials for the account

  After the list: the notes are committed first because `npm version` refuses a working tree that is not clean, and
  so the tree the tag names holds the section and the tarball does too. A release has no unit in `changes/`: both
  commits are made on `master`, which is this project's exception to working on a branch. `deploy.sh` refuses,
  before it does anything else, a version whose section is missing from `CHANGELOG.md`; then write the notes,
  commit them, move the tag with `git tag -f v<version>` and run it again. The paragraph that begins "Pick the part
  to bump as semver means it" stays as it is, and so does everything after it

**0024.** The branch `task-0024-depend-on-agentrite-2-3-0` is not on `master` yet and edits `package.json` and
`package-lock.json`, on other lines. Expect a small merge. Once it is merged, `AGENTS.md` sends agents to the
process of release 2.3.0; this unit was planned under it.

## Files

- `CHANGELOG.md`: new
- `package.json`: `CHANGELOG.md` in `files`
- `AGENTS.md`: the "Release notes" section
- `deploy.sh`: the check, the moved `cd`, the header comment
- `tests/deploy.test.mjs`: the two files in the fixture, the two options, the new tests
- `tests/changelog.test.mjs`: new, that the package lists the changelog
- `README.md`: the four places above
- `changes/0025-release-notes/record.md`: the log

## Tasks

- [x] In `tests/deploy.test.mjs`, have `release()` write `package.json` with version `1.2.3` and a `CHANGELOG.md`
  holding a `## 1.2.3` section into the `kit` directory, with a `changelog` option that replaces the content and
  writes no file when it is `null`. Run `npm test` and see all 188 tests pass, since `deploy.sh` does not read
  either file yet (R8, R9)
- [x] Add the tests and see them fail. With no `CHANGELOG.md`; with a changelog whose only headings are `## 1.2.2`
  and `## 1.2.30`; and with one that holds `1.2.3` in its text and `### 1.2.3` as a heading but no `## 1.2.3`
  line: the exit status is 1, standard error names `1.2.3` and `CHANGELOG.md`, and the log of calls holds no line
  that starts with `aws`, `npm` or `npx` (R7, R9)
- [x] Add the check to `deploy.sh` as the Approach gives it, ahead of the AWS session check, with `cd "$ROOT"`
  moved above it and a sentence in the header comment. See the new tests pass and the five existing ones with them
  (R7, R8)
- [x] Add `tests/changelog.test.mjs` and see it fail: `files` in `package.json` includes `CHANGELOG.md` (R1)
- [x] Add `CHANGELOG.md` with the content the Approach gives, as the human corrected it on approval, and list it in
  `files` in `package.json`. Before committing, check each line of the 2.3.0 section once more against
  `git diff v2.2.1 v2.3.0` over the shipped files and against the statuses at the two tags, and record what was
  checked. See the test pass and `npm pack --dry-run` list 24 files, `CHANGELOG.md` among them (R1, R2, R3, R4)
- [ ] Add the "Release notes" section to `AGENTS.md`, after "General guidelines", with the wording the Approach
  gives, wrapped at 120 characters (R5, R6)
- [ ] Change the README in the four places the Approach names. Remove nothing but the sentence and code block the
  new order replaces (R10, R11)
- [ ] In a scratch directory outside the repository, make a git repository with a `package.json` and one commit,
  change a file without committing, and run `npm version patch`. Record the npm version and what it printed. If it
  does not refuse, stop and tell the human: the reason for a separate notes commit is then gone, and the README must
  not give it (R10)
- [ ] Try the rule once without releasing: in a session that has read only `AGENTS.md` and the README, ask for the
  release notes of the units implemented since `v2.3.0`, on a scratch branch or worktree that is thrown away
  afterwards. Record whether the section came out in the shape requirement 2 gives, whether every unit was accounted
  for, and what the agent proposed. Commit nothing from it. When the rule's wording needs changing for it to work,
  change it and say so in the record (R5)

## Verification

- [ ] `npm test` passes on the host, with the new tests among them
- [ ] `npm pack --dry-run` lists 24 files
- [ ] `git diff master -- process.md roles templates scripts container` is empty
- [ ] `bash -n deploy.sh` passes
- [ ] No line of the files this unit adds or changes is longer than 120 characters, and none holds an em dash
- [ ] `npm run check-changes` passes, after `npm ci`
- [ ] The record says what was not run: `./deploy.sh` itself, which needs the AWS account and a release

## Commit Points

- [x] The fixture files in the deploy test
- [x] The tests and the check in `deploy.sh`
- [x] The changelog, its test and `files`
- [ ] The rule in `AGENTS.md`
- [ ] The README
- [ ] The record of the two trials
