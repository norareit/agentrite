# 0028 A release skill

## Approach

Two new files, neither in the package: `RELEASING.md` at the root, which holds the release, and the skill, which
points at it. `AGENTS.md` and the README each lose their steps to that file and point at it, `deploy.sh` changes its
message, and one new test file holds the wiring. `process.md`, `roles/`, `templates/`, `scripts/`, `container/` and
`.opencode/` do not change. The pins in `container/Dockerfile` are not bumped by this unit.

The four texts below are for the human to read and correct before approving.

**The skill.** `.claude/skills/release/SKILL.md`, whole:

```markdown
---
name: release
description: >-
  Makes a release of the kit, on the host: bumps the pinned harness versions and checks them in a sandbox, drafts the
  release notes, on the human's word commits both, and names the commands the human runs to finish it.
disable-model-invocation: true
---

Read `RELEASING.md` in the repository root and follow it, from its first step. It is your instruction; this file holds
none of its own.
```

**`RELEASING.md`.** New, at the root, whole. Steps 3 to 6 are 0025's rule from `AGENTS.md` and the README's
"Releasing", moved; what differs from them is listed after the text.

````markdown
# Releasing

How a release of the kit is made. This file is this repository's own and is not in the package. In Claude Code the
`/release` skill sends the agent here. An agent in another harness, or a human, follows the file directly.

A release is made on the host, on `master`, from the repository root, in this order:

1. Before anything else: the host, the branch and the working tree
2. The harness versions: the pins in `container/Dockerfile` are moved to the latest and checked
3. The release notes: a section is added to `CHANGELOG.md`
4. The human reads, corrects and picks the version
5. The commits
6. What the human runs: `npm version`, `./deploy.sh` and the push

An agent runs steps 1 to 3, stops at step 4, and on the human's word runs step 5. It runs nothing of step 6: it
ends by telling the human its three commands. An agent asked only for the release notes runs step 3, stops at
step 4, and on the human's word commits the section as step 5 gives it and nothing else.

## 1. Before anything else

Stop, say why and change nothing when one of these does not hold. Do not repair it.

* `docker version` answers. Releasing runs on the host only: the check of step 2 needs Docker, and `./deploy.sh`
  needs AWS credentials, which never enter the sandbox. A sandbox has no Docker, so a session inside one cannot
  make a release
* The branch is `master`
* `git status --short` shows no change to a tracked file. `npm version` refuses a working tree that is not clean

## 2. The harness versions

The kit pins a version of Claude Code and one of OpenCode in `container/Dockerfile`, as the defaults of
`ARG CLAUDE_CODE_VERSION` and `ARG OPENCODE_VERSION`. A pin is what a sandbox gets on a host that does not have the
harness, and the pinned pair is the one the kit and its README were checked against, as the README says under "The
harness versions". A release moves both to the latest published versions, after checking, in a sandbox built from
the working copy, that what the kit and its README rely on still holds for them.

* The latest versions are what `npm view @anthropic-ai/claude-code version` and `npm view opencode-ai version`
  print. When both are the pins already, there is nothing to bump: skip the rest of this step and say so
* Otherwise edit the two lines. Commit nothing

### The check

The check has a Compose project of its own, with its own image and home volume, so that its home holds no login and
the sandboxes of `./agent.sh` and `./agent-dev.sh`, their images and their saved logins are not touched.

The wrapper builds the image with the pins only for a harness it finds no version of on the host, and the host of a
release has both harnesses. So the check gives the wrapper a `claude` and an `opencode` of its own, first on the
`PATH`, that report no version. Nothing else on the host is changed for it, and no tracked file:

```sh
mkdir /tmp/agentrite-release-no-harness
printf '#!/bin/sh\nexit 1\n' > /tmp/agentrite-release-no-harness/claude
cp /tmp/agentrite-release-no-harness/claude /tmp/agentrite-release-no-harness/opencode
chmod +x /tmp/agentrite-release-no-harness/claude /tmp/agentrite-release-no-harness/opencode
```

A run is then:

```sh
PATH="/tmp/agentrite-release-no-harness:$PATH" AGENT_PROJECT_NAME=ritenoar-agentrite-agent-release \
  container/agent.sh "$PWD" --rebuild <command>
```

That is what `./agent-dev.sh` runs, under another name and without the host's harnesses. At each run the wrapper
says, for each harness, that its command printed no version and that the sandbox gets the kit's, with the pin.
Before the first run and after the last, whatever the outcome, remove what bears that name, and nothing else:

```sh
docker volume rm ritenoar-agentrite-agent-release_agent-home
docker network rm ritenoar-agentrite-agent-release_default
docker image rm ritenoar-agentrite-agent-release
```

After the last run remove `/tmp/agentrite-release-no-harness` as well.

Each run is a new container with a new proxy log, so a harness is started and the log is read in the same run. A
harness wants a terminal: start it as `timeout 30 script -qec <command> <logfile>`, with the log file under `/tmp`,
and read its screen from the capture, with the escape sequences stripped. Log in to nothing, and enter a code
nowhere.

The first run, in a home that holds nothing, in this order:

1. `claude --version` and `opencode --version`
2. Count the lines of `/run/egress-proxy.log`. Those are the start-up checks' own
3. `claude`, for 30 seconds
4. `opencode`, for 30 seconds
5. The login command the README gives under "Logging in to a model provider", as it is written there, for 45
   seconds
6. Print the three captures, and the lines of `/run/egress-proxy.log` after the ones counted

The second run, only when `~/.claude/statusline-command.sh` is a file on the host, in the same home:

1. Write `/home/agent/.claude.json` with `hasCompletedOnboarding: true`, a `theme`, the last 20 characters of a
   made-up API key under `customApiKeyResponses.approved`, and `projects["/work"].hasTrustDialogAccepted: true`
2. `claude` with `ANTHROPIC_API_KEY` set to the made-up key, for 25 seconds. The key reaches `api.anthropic.com`,
   which refuses it. Nothing is authenticated and no credential is stored
3. Print the capture, and the proxy's log as before

What has to hold:

* The image builds, and the two versions printed are the two pins. When they are not, the sandbox did not build
  from the pins, and nothing else the check saw is about them. A version held in this repository's own
  `agent/compose.project.yml` stands above the pin, and is one way that happens
* `claude` reaches its first-run screen and `opencode` its prompt
* Every host on the proxy's lines after start-up, allowed or refused, is on the kit's own allowlist,
  `KIT_ALLOWLIST` in `container/compose.yml`, or is a refusal known here: `raw.githubusercontent.com`, which the
  kit refuses by decision (0015). A host that was allowed because this repository's own `agent/compose.project.yml`
  lists it, such as `models.dev`, is not on the kit's allowlist: a project that does not list it refuses it
* The login prints an address and a code
* In the second run, Claude Code shows the line of the host's script. With no such file on the host this is not
  checked: say so

Anything that does not hold is a finding. Then:

* Restore the pins with `git checkout -- container/Dockerfile`, remove what the check created, tell the human what
  was seen, with the capture or the log line, and stop
* Fix nothing. Do not add a host to an allowlist and do not change the README. A harness version that needs a host,
  a login whose label changed, a build that fails: each is a change with a decision in it, and so a unit in
  `changes/`, on a branch
* The human decides whether the release goes out with the pins as they were, in which case it continues at step 3,
  or waits for that unit. The human may also say to bump one harness alone. Then run the check again for that
  pair, because that pair is what would ship

## 3. The release notes

`CHANGELOG.md` holds one section per release and ships in the package. Write the section this way:

* Build the section from the repository, not from memory. Find the last version tag with
  `git describe --tags --abbrev=0`
* The units of the release are those whose `record.md` says `implemented` now and did not at that tag.
  `git diff <tag> HEAD --stat -- changes/` shows which units moved, and
  `git grep '^status:' <tag> -- 'changes/*/record.md'` gives the statuses at the tag. Read the documents each has,
  the spec where there is one and the record, not its title: what a release changes for a project is in the
  decisions, in the paragraph that states a unit's boundary, and in what the record says was not established
* Read the diff of what ships since the tag: `git diff <tag> HEAD` over `README.md`, `package.json` and every path
  in `files` of `package.json`. Every change in it belongs to a unit of the release. Name one that belongs to no
  unit to the human, and write it in the section without a number. Name one whose unit is not `implemented` to the
  human as well: whether the release waits for that unit is theirs to decide. A consequence nobody wrote down is
  found only here
* The bump of step 2 is not in that diff, since it is not committed yet, and it is the release's own, not a change
  that lacks a unit. Write it as a line of "What changed" that gives each harness's old and new version, with no
  number. Under "Worth knowing when you update", say which sandboxes get the new versions and what a project does to
  get them, as the README describes the pins under "The harness versions", and name anything the check of step 2
  did not establish
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
* A section of an earlier release may be corrected in place, for example for a consequence found later. The
  released tarball keeps what it shipped with

## 4. The human reads

Stop there. Commit nothing before the human's word. In your answer:

* Propose major, minor or patch, with the reason. Pick the part to bump as semver means it; there is no rule of
  the kit's own
* Name every change in the shipped diff that has no unit
* For the pins: the old and the new versions, what the check showed, and what it did not establish. Or that they
  were the latest already

The human reads the section, corrects it and picks the version, changing the heading when the pick differs from the
proposal.

## 5. The commits

A release is not a unit and has no directory in `changes/`. Its commits are made on `master`, with no unit prefix,
which is this project's exception to working on a branch. On the human's word, with the version the human picked:

1. Make sure the section is headed `## <version>` with that version
2. When the pins were bumped, commit `container/Dockerfile` as `Harness pins for <version>`
3. Commit `CHANGELOG.md` as `Release notes for <version>`

Commit nothing else, and push nothing. The pins and the notes are committed first because `npm version` refuses a
working tree that is not clean, and so the tree the tag names holds both and the tarball does too.

Then end by telling the human what is left, as the three commands of step 6, with the part filled in, in that
order. Do not run `npm version` or `./deploy.sh`.

## 6. What the human runs

From the repository root, on `master`, with AWS credentials for the account:

```sh
npm version <patch|minor|major>
./deploy.sh
git push --follow-tags origin master
```

An agent runs none of the three. `./deploy.sh` publishes, and what it publishes is never replaced.

`npm version`, with the part that gives the version of the section's heading, updates `package.json` and
`package-lock.json`, and commits and tags the change. The bump is not optional: the tarball's name comes from the
version, and `deploy.sh` refuses to upload a name that is already released, so a release without a bump fails.

`deploy.sh` refuses, before it does anything else, a version whose section is missing from `CHANGELOG.md`, which is
also what a wrong part gives; then write the notes, commit them, move the tag with `git tag -f v<version>` and run
it again.

`deploy.sh` signs in with `aws sso login` if needed, deploys the two stacks, packs the kit with `npm pack`, and
uploads the tarball under the name `npm pack` gives it, which carries the version. Then it fetches the tarball's URL
with no credential and fails unless it is served, and prints the line to put in a project's `package.json`.

A released tarball is never replaced or removed. Projects pin it by its integrity hash, and two projects may sit on
different versions indefinitely, so the script refuses to upload over a name that already exists. It uploads with
`aws s3 cp` rather than a CDK `BucketDeployment` for the same reason: a `BucketDeployment` prunes by default and
would delete versions that a project still installs.

The push comes last. `--follow-tags` pushes `master` and, with it, the annotated tag `npm version` made. A tag that
is not pushed yet can still be moved, which is what a refusal by `deploy.sh` asks for.
````

What differs in steps 3 to 6 from the two texts they are moved from, and nothing else does:

* `AGENTS.md` said "Stop there. [...] Do not commit it before that, and do not run `npm version` or `./deploy.sh`".
  Step 4 keeps the stop, and step 5 keeps both prohibitions. What is new is that the agent ends by naming the
  commands
* `AGENTS.md` said "In your answer, propose major, minor or patch, with the reason, and name every change in the
  shipped diff that has no unit". It is in step 4, with the pins added
* `AGENTS.md` said "On the human's word, commit the section on `master` as `Release notes for <version>`, with no
  unit prefix". It is in step 5, with the commit of the pins ahead of it
* The README said "both commits are made on `master`". There are three now, two of them the agent's, so step 5
  says "its commits"
* The README gave `npm version` and `./deploy.sh` as list items 3 and 4. They are step 6, with the push after
  them, which the README did not have
* The README said "The notes are committed first". Step 5 says "The pins and the notes"
* The bullet on the bump in step 3 is new
* The paragraph of `AGENTS.md` that opens the "Release notes" section stays in `AGENTS.md`, as below, and its first
  sentence is repeated at the head of step 3

**`AGENTS.md`.** The section "Release notes" becomes:

```markdown
## Releasing

`CHANGELOG.md` holds one section per release and ships in the package. A section is written when a release is made,
for all the units in it at once, and never by a unit as it is implemented: a unit cannot know which version it will
be released in, and one summary of a whole release reads better than lines written apart.

How a release is made, the release notes among it, is in [`RELEASING.md`](RELEASING.md). Read it when asked to make
a release or to write the release notes, and follow it. Start neither unasked.
```

**The README.** The section "Releasing" becomes the text below. Its first paragraph is today's, unchanged, and its
last opens with today's last sentence.

```markdown
## Releasing

A release is a tarball of the kit served from `https://agentrite.ritenoar.com/`, which a project installs from its
URL. `infra/` is the CDK app that serves it: a private bucket, a CloudFront distribution in front of it, a certificate
in us-east-1 because CloudFront takes no other, and the DNS record in the existing `ritenoar.com` hosted zone, which
it looks up rather than owns. None of it ships to a project.

A release is made with the `/release` skill, in a Claude Code session on the host, on `master`. The skill is
`.claude/skills/release/SKILL.md`, which holds one line that sends the agent to [`RELEASING.md`](RELEASING.md). That
file holds every step, and a human, or an agent in another harness, follows it directly.

In short: the versions of Claude Code and OpenCode pinned in `container/Dockerfile` are moved to the latest
published ones and checked in a sandbox built from the working copy; an agent drafts the release notes in
`CHANGELOG.md`; the human reads them, corrects them and picks the version; the agent commits the pins and the
notes; and the human runs `npm version` and `./deploy.sh`, and pushes `master` and the tag.

Releasing runs on the host only. It needs AWS credentials, and those never enter the sandbox. It needs Docker as
well, which a sandbox does not have.
```

Where each paragraph of today's "Releasing" ends up:

| Today's paragraph, by its opening words                 | Where it is afterwards                                  |
|---------------------------------------------------------|---------------------------------------------------------|
| "A release is a tarball of the kit served from"         | The README, unchanged                                   |
| "A release is made on `master`, from the repository"    | `RELEASING.md`, the opening and its list of six         |
| List item 1, an agent is asked to write the notes       | `RELEASING.md`, step 3                                  |
| List item 2, the human reads, corrects and picks        | `RELEASING.md`, step 4 and step 5, item 3               |
| List item 3, `npm version patch`, or `minor`, or        | `RELEASING.md`, step 6                                  |
| List item 4, `./deploy.sh`, with AWS credentials        | `RELEASING.md`, step 6                                  |
| "The notes are committed first because", first sentence | `RELEASING.md`, step 5, with the pins added             |
| "A release has no unit in `changes/`"                   | `RELEASING.md`, step 5, opening                         |
| "`deploy.sh` refuses, before it does anything else"     | `RELEASING.md`, step 6                                  |
| "Pick the part to bump as semver means it"              | `RELEASING.md`, step 4                                  |
| "`npm version` updates `package.json`" to "fails"       | `RELEASING.md`, step 6                                  |
| "`deploy.sh` signs in with `aws sso login`"             | `RELEASING.md`, step 6                                  |
| "A released tarball is never replaced or removed"       | `RELEASING.md`, step 6                                  |
| "Releasing runs on the host only"                       | The README, with a sentence added, and step 1           |

In "What is here", a row after `CHANGELOG.md`'s: `RELEASING.md`, "How a release of the kit is made, which the
`/release` skill follows". Nothing else in the README changes. "The kit's own tests" still says that releasing needs
`npm ci`, and "The kit's own copy of the kit" still says that `./deploy.sh` stays on the host.

**`deploy.sh`.** The refusal's two lines become:

```sh
  echo "✗ CHANGELOG.md has no section headed \"## $VERSION\". Write the release notes as RELEASING.md" >&2
  echo "  describes, commit them, and run this again." >&2
```

**The tests.** `tests/release.test.mjs`, new, reads files and runs nothing:

* The skill: the text before the body is exactly the frontmatter above, and the body, trimmed, is exactly the one
  instruction. Compared as whole strings, as the role wrappers are compared with their fixtures
* The pointers: `RELEASING.md` exists, and `.claude/skills/release/SKILL.md`, `AGENTS.md`, `README.md` and
  `deploy.sh` each contain `RELEASING.md`
* The pins: `container/Dockerfile` has exactly one line matching `^ARG CLAUDE_CODE_VERSION=\d+\.\d+\.\d+$` and one
  matching `^ARG OPENCODE_VERSION=\d+\.\d+\.\d+$`. `RELEASING.md` contains both argument names, and
  `@anthropic-ai/claude-code` and `opencode-ai`, each of which the Dockerfile's install line contains too

`tests/deploy.test.mjs` gains one assertion in the existing refusal tests: standard error names `RELEASING.md`.

**0026 and 0027.** Both were on `master` when this unit was implemented, and the branch holds them by a merge. 0026
added to the README under "Running the sandbox" and did not touch "Releasing", `AGENTS.md` or `deploy.sh`. 0027
made the pins the last of three sources of a harness's version, behind the project's Compose file and the host's
own version, and gave the README the subsection "The harness versions". The text of `RELEASING.md` above is written
for that, where the planner's was written for the pins as the only source. What was changed, with the reasons in
the record:

* Step 2 opens by saying what a pin is under 0027, where it said that the image installs the pins
* The run command of the check puts a `claude` and an `opencode` that report no version first on the wrapper's
  `PATH`, so that the wrapper takes both pins, by the rule 0027 gives for a command that is there and prints no
  version. Without it the sandbox of a host that has the harnesses is built with the host's versions. The directory
  is made before the first run and removed after the last
* The first line of "What has to hold" names a version held in the project's Compose file as a way the sandbox
  does not build from the pins
* The bullet on the bump in step 3 has the notes say which sandboxes get the new versions, and names the README's
  subsection "The harness versions"

`tests/harness-versions.test.mjs`, which 0027 added, already holds that the Dockerfile pins each harness once and
that no shipped file but the Dockerfile, the README among them, holds a pin. The README text above names no
version, and neither does `RELEASING.md`.

## Files

- `.claude/skills/release/SKILL.md`: new, the skill
- `RELEASING.md`: new, the release
- `AGENTS.md`: "Release notes" becomes "Releasing", two paragraphs
- `README.md`: "Releasing", and a row in "What is here"
- `deploy.sh`: the refusal's message
- `tests/release.test.mjs`: new
- `tests/deploy.test.mjs`: one assertion
- `changes/0028-release-skill/record.md`: the log

## Tasks

- [x] Add `tests/release.test.mjs` with the three groups of tests the Approach gives, and the assertion on
  `RELEASING.md` to the refusal tests of `tests/deploy.test.mjs`. Run `npm test` and see the new ones fail and the
  224 existing ones pass (R17)
- [x] Add `RELEASING.md` with the text the Approach gives, as the human corrected it on approval, wrapped at 120
  characters. `master` holds 0027, so the text is the one adapted to it, as the Approach says under "0026 and
  0027" (R2, R6, R7, R8, R9, R10, R11, R12, R13, R14)
- [x] Add `.claude/skills/release/SKILL.md` with the text the Approach gives. See the skill's tests pass. See that
  `npm pack --dry-run` lists the same files as it does on `master`, comparing the two lists and not their length,
  and that nothing was added under `.opencode/` (R1, R3, R4)
- [x] Replace the "Release notes" section of `AGENTS.md` with the "Releasing" section the Approach gives. Compare
  the removed bullets with step 3 to step 5 of `RELEASING.md`, one by one, and record that each is there and what
  differs, which must be only what the Approach lists (R5)
- [x] Replace the README's "Releasing" with the text the Approach gives and add the row to "What is here". Go
  through the table of paragraphs in the Approach and record, for each row, that the sentence is where the table
  says, with its commands as they were (R15)
- [ ] Change the refusal's message in `deploy.sh` and see every test pass (R16, R17)
- [ ] On the host, run the check of step 2 by hand, once, as `RELEASING.md` gives it: set the two pins in the
  working tree to what `npm view` prints, run the two runs under `ritenoar-agentrite-agent-release`, and read what
  has to hold. Then restore `container/Dockerfile` with `git checkout`, and remove the volume, the network and the
  image of that name. Touch no other image, volume or container. Record the versions, what each line of "What has
  to hold" showed, and every command that had to be written differently from the file; correct the file where a
  command did not work as written. A finding about a harness version is told to the human and is not fixed in this
  unit. When the session may not run Docker, record that and leave this task to the human (R8, R9)
- [ ] Try the file once without releasing. Make a throwaway clone of the repository on the host, with this branch
  checked out under the name `master`, and in a fresh Claude Code session there type `/release`. Tell it nothing
  else, except, when it asks or stops for it, that this is a trial that ends at step 4. Record whether the skill
  started and sent the session to `RELEASING.md`; whether it bumped, checked and cleaned up; whether the section
  had the bump's line; and what it reported at step 4. Then have it restore the tree, commit nothing, and remove
  the clone. When the wording of `RELEASING.md` has to change for it to work, change it, and in the plan's
  Approach alike, and say so in the record (R1, R2, R10, R11, R12)

## Verification

- [ ] `npm test` passes on the host, with the new tests among them
- [ ] `npm pack --dry-run` lists the same files as on `master`, compared as lists, whatever their number (R3)
- [ ] `git diff master -- process.md roles templates scripts container .opencode` is empty (R4)
- [ ] `bash -n deploy.sh` passes
- [ ] No line of the files this unit adds or changes is longer than 120 characters, and none holds an em dash
- [ ] `npm run check-changes` passes, after `npm ci`
- [ ] `docker image ls`, `docker volume ls` and `docker network ls` show nothing named
  `ritenoar-agentrite-agent-release`, and the images and volumes of `ritenoar-agentrite-agent` and
  `ritenoar-agentrite-agent-dev` are as they were before the unit
- [ ] The record says what was not run: step 5 with a real version, and the three commands of step 6, which are
  the next release's and the human's

## Commit Points

- [x] The tests
- [x] `RELEASING.md` and the skill
- [x] `AGENTS.md`
- [x] The README
- [ ] `deploy.sh`
- [ ] The record of the two trials, with any correction to `RELEASING.md` they caused
