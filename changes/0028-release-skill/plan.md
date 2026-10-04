# 0028 A release skill

## Approach

Two new files, neither in the package: `RELEASING.md` at the root, which holds the release, and the skill, which
points at it. `AGENTS.md` and the README each lose their steps to that file and point at it, `deploy.sh` changes its
message, and one new test file holds the wiring. `process.md`, `roles/`, `templates/`, `scripts/`, `container/` and
`.opencode/` do not change.

**The revision that withdrew the bump.** The unit was built on this branch, as far as `45e349f`, with a step of the
release that bumped the kit's pinned harness versions and checked them in a sandbox. The human withdrew that step,
as the spec says, after it was built. The texts below are the unit without it, and the last tasks cut what is
built down to them. What the implementer removes, and what stays:

* `RELEASING.md` loses step 2, "The harness versions", whole: the bump, "The suite" and "The check". Steps 3 to 6
  become 2 to 5. It loses the condition on Docker in step 1, the bullet on the bump in the notes, the line on the
  pins in the human's reading, and the commit of the pins. It gains one condition in step 1: `npm test` passes.
  The text below is the whole file, to be written out of this plan as before
* The skill's description loses the bump, and the test that compares it changes first
* The README's summary sentence loses the bump, and its last paragraph loses the sentence on Docker, which this
  unit gave it, and is `master`'s again
* `tests/release.test.mjs` loses its two tests of the `ARG` lines and the list they loop over
* Stays as built: `AGENTS.md`, `deploy.sh`, `tests/deploy.test.mjs`, the row in the README's "What is here", and
  the other tests of `tests/release.test.mjs`
* Stays as built, by requirement 18: `tests/harness-versions.test.mjs`, `tests/wrapper-fixture.mjs` and
  `tests/agent-wrapper.test.mjs`, which this branch changed for the bump. Do not take those changes back, and do
  not go further in them: what those tests become without the pins is unit 0030's
* `container/Dockerfile` was never changed on this branch and is not now. The pins stay where they are until 0030

The texts below are for the human to read and correct before approving.

**The skill.** `.claude/skills/release/SKILL.md`, whole:

```markdown
---
name: release
description: >-
  Makes a release of the kit, on the host: sees that the suite passes, drafts the release notes, on the human's word
  commits them, and names the commands the human runs to finish it.
disable-model-invocation: true
---

Read `RELEASING.md` in the repository root and follow it, from its first step. It is your instruction; this file holds
none of its own.
```

**`RELEASING.md`.** New, at the root, whole. Steps 2 to 5 are 0025's rule from `AGENTS.md` and the README's
"Releasing", moved; what differs from them is listed after the text.

````markdown
# Releasing

How a release of the kit is made. This file is this repository's own and is not in the package. In Claude Code the
`/release` skill sends the agent here. An agent in another harness, or a human, follows the file directly.

A release is made on the host, on `master`, from the repository root, in this order:

1. Before anything else: the branch, the working tree and the suite
2. The release notes: a section is added to `CHANGELOG.md`
3. The human reads, corrects and picks the version
4. The commit
5. What the human runs: `npm version`, `./deploy.sh` and the push

An agent runs steps 1 and 2, stops at step 3, and on the human's word runs step 4. It runs nothing of step 5: it
ends by telling the human its three commands. An agent asked only for the release notes runs step 2, stops at
step 3, and on the human's word commits the section as step 4 gives it and nothing else.

## 1. Before anything else

Stop, say why and change nothing when one of these does not hold. Do not repair it.

* The branch is `master`
* `git status --short` shows no change to a tracked file. `npm version` refuses a working tree that is not clean
* `npm test` passes. `./deploy.sh` runs the suite too, but only after `npm version` has made its commit and its
  tag, which is late to learn that a test fails. When one fails, say which and what it printed. A test is repaired
  in a unit in `changes/`, on a branch, and not by the release

Releasing runs on the host only: `./deploy.sh` needs AWS credentials, which never enter the sandbox.

## 2. The release notes

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

## 3. The human reads

Stop there. Commit nothing before the human's word. In your answer:

* Propose major, minor or patch, with the reason. Pick the part to bump as semver means it; there is no rule of
  the kit's own
* Name every change in the shipped diff that has no unit

The human reads the section, corrects it and picks the version, changing the heading when the pick differs from the
proposal.

## 4. The commit

A release is not a unit and has no directory in `changes/`. Its commits are made on `master`, with no unit prefix,
which is this project's exception to working on a branch. On the human's word, with the version the human picked:

1. Make sure the section is headed `## <version>` with that version
2. Commit `CHANGELOG.md` as `Release notes for <version>`

Commit nothing else, and push nothing. The notes are committed first because `npm version` refuses a working tree
that is not clean, and so the tree the tag names holds the section and the tarball does too.

Then end by telling the human what is left, as the three commands of step 5, with the part filled in, in that
order. Do not run `npm version` or `./deploy.sh`.

## 5. What the human runs

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

What differs in steps 2 to 5 from the two texts they are moved from, and nothing else does:

* `AGENTS.md` said "Stop there. [...] Do not commit it before that, and do not run `npm version` or `./deploy.sh`".
  Step 3 keeps the stop, and step 4 keeps both prohibitions. What is new is that the agent ends by naming the
  commands
* `AGENTS.md` said "In your answer, propose major, minor or patch, with the reason, and name every change in the
  shipped diff that has no unit". It is in step 3, as two bullets
* `AGENTS.md` said "On the human's word, commit the section on `master` as `Release notes for <version>`, with no
  unit prefix". It is in step 4
* The README said "both commits are made on `master`". One of the two is `npm version`'s, which the agent does not
  run, so step 4 says "its commits"
* The README gave `npm version` and `./deploy.sh` as list items 3 and 4. They are step 5, with the push after
  them, which the README did not have
* The README said "A release is made on `master`, from the repository root". The opening says "on the host, on
  `master`"
* The paragraph of `AGENTS.md` that opens the "Release notes" section stays in `AGENTS.md`, as below, and its first
  sentence is repeated at the head of step 2

Step 1 is new. Its first two conditions are what `npm version` and the README's "on `master`" already asked for,
and the third, the suite, is this unit's.

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
last is today's last paragraph, unchanged.

```markdown
## Releasing

A release is a tarball of the kit served from `https://agentrite.ritenoar.com/`, which a project installs from its
URL. `infra/` is the CDK app that serves it: a private bucket, a CloudFront distribution in front of it, a certificate
in us-east-1 because CloudFront takes no other, and the DNS record in the existing `ritenoar.com` hosted zone, which
it looks up rather than owns. None of it ships to a project.

A release is made with the `/release` skill, in a Claude Code session on the host, on `master`. The skill is
`.claude/skills/release/SKILL.md`, which holds one line that sends the agent to [`RELEASING.md`](RELEASING.md). That
file holds every step, and a human, or an agent in another harness, follows it directly.

In short: an agent sees that the suite passes and drafts the release notes in `CHANGELOG.md`; the human reads them,
corrects them and picks the version; the agent commits the notes; and the human runs `npm version` and
`./deploy.sh`, and pushes `master` and the tag.

Releasing runs on the host only. It needs AWS credentials, and those never enter the sandbox.
```

Where each paragraph of today's "Releasing" ends up:

| Today's paragraph, by its opening words                 | Where it is afterwards                                  |
|---------------------------------------------------------|---------------------------------------------------------|
| "A release is a tarball of the kit served from"         | The README, unchanged                                   |
| "A release is made on `master`, from the repository"    | `RELEASING.md`, the opening and its list of five        |
| List item 1, an agent is asked to write the notes       | `RELEASING.md`, step 2                                  |
| List item 2, the human reads, corrects and picks        | `RELEASING.md`, step 3 and step 4, item 2               |
| List item 3, `npm version patch`, or `minor`, or        | `RELEASING.md`, step 5                                  |
| List item 4, `./deploy.sh`, with AWS credentials        | `RELEASING.md`, step 5                                  |
| "The notes are committed first because", first sentence | `RELEASING.md`, step 4                                  |
| "A release has no unit in `changes/`"                   | `RELEASING.md`, step 4, opening                         |
| "`deploy.sh` refuses, before it does anything else"     | `RELEASING.md`, step 5                                  |
| "Pick the part to bump as semver means it"              | `RELEASING.md`, step 3                                  |
| "`npm version` updates `package.json`" to "fails"       | `RELEASING.md`, step 5                                  |
| "`deploy.sh` signs in with `aws sso login`"             | `RELEASING.md`, step 5                                  |
| "A released tarball is never replaced or removed"       | `RELEASING.md`, step 5                                  |
| "Releasing runs on the host only"                       | The README, unchanged, and step 1                       |

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

The tests of the two `ARG` lines, which the file holds as built, are removed with the list they loop over: the
release edits neither line any more.

`tests/deploy.test.mjs` gains one assertion in the existing refusal tests: standard error names `RELEASING.md`.

**0026 and 0027.** Both were on `master` when this unit was implemented, and the branch holds them by a merge. 0026
added to the README under "Running the sandbox" and did not touch "Releasing", `AGENTS.md` or `deploy.sh`. 0027
made the kit's pins the last of three sources of a harness's version, behind the project's Compose file and the
host's own version, and gave the README the subsection "The harness versions". Neither touches what this unit
builds, now that the release has no step for the pins.

What this branch changed in 0027's tests while it had that step stays, by requirement 18.
`tests/harness-versions.test.mjs` holds that the Dockerfile pins each harness once and that no file under
`container/` or `templates/` but the Dockerfile holds a pin. As 0027 left it, that test read `README.md` as well,
and the README's examples under "The harness versions" are versions a pin can come to equal. On the human's
decision this unit took `README.md` out of that test, and left the examples as they are. The suite's fake host had
2.1.289 and 1.18.34 as its versions, which a pin can come to equal too, and a test that tells the host's version
from the pin by its value then fails. This unit gave the fake host versions no release has.

## Files

- `.claude/skills/release/SKILL.md`: new, the skill. In the revision: its description
- `RELEASING.md`: new, the release. In the revision: cut down to the text above
- `AGENTS.md`: "Release notes" becomes "Releasing", two paragraphs
- `README.md`: "Releasing", and a row in "What is here". In the revision: two paragraphs of "Releasing"
- `deploy.sh`: the refusal's message
- `tests/release.test.mjs`: new. In the revision: the description it compares, and the tests of the `ARG` lines
  removed
- `tests/deploy.test.mjs`: one assertion
- `tests/harness-versions.test.mjs`: 0027's test of where a pin is written no longer reads `README.md`. Not
  touched by the revision
- `tests/wrapper-fixture.mjs` and `tests/agent-wrapper.test.mjs`: the fake host's versions, and those of an image
  built earlier, are ones a pin cannot come to equal. Not touched by the revision
- `changes/0028-release-skill/record.md`: the log

## Tasks

The first seven were done before the bump was withdrawn, against the texts of that time, which are this file at
`45e349f`. Requirements 7 to 11 are withdrawn, and a task that delivered one says so.

- [x] Add `tests/release.test.mjs` with the three groups of tests the Approach gave, and the assertion on
  `RELEASING.md` to the refusal tests of `tests/deploy.test.mjs`. Run `npm test` and see the new ones fail and the
  224 existing ones pass (R17)
- [x] Add `RELEASING.md` with the text the Approach gives, as the human corrected it on approval, wrapped at 120
  characters. `master` holds 0027, so the text is the one adapted to it, as the Approach says under "0026 and
  0027" (R2, R6, R12, R13, R14, and R7 to R11, withdrawn since)
- [x] Add `.claude/skills/release/SKILL.md` with the text the Approach gives. See the skill's tests pass. See that
  `npm pack --dry-run` lists the same files as it does on `master`, comparing the two lists and not their length,
  and that nothing was added under `.opencode/` (R1, R3, R4)
- [x] Replace the "Release notes" section of `AGENTS.md` with the "Releasing" section the Approach gives. Compare
  the removed bullets with step 3 to step 5 of `RELEASING.md`, one by one, and record that each is there and what
  differs, which must be only what the Approach lists (R5)
- [x] Replace the README's "Releasing" with the text the Approach gives and add the row to "What is here". Go
  through the table of paragraphs in the Approach and record, for each row, that the sentence is where the table
  says, with its commands as they were (R15)
- [x] Change the refusal's message in `deploy.sh` and see every test pass (R16, R17)
- [x] On the host, run the check of step 2 by hand, once, as `RELEASING.md` gives it: set the two pins in the
  working tree to what `npm view` prints, run the two runs under `ritenoar-agentrite-agent-release`, and read what
  has to hold. Then restore `container/Dockerfile` with `git checkout`, and remove the volume, the network and the
  image of that name. Touch no other image, volume or container. Record the versions, what each line of "What has
  to hold" showed, and every command that had to be written differently from the file; correct the file where a
  command did not work as written. A finding about a harness version is told to the human and is not fixed in this
  unit. When the session may not run Docker, record that and leave this task to the human (R8 and R9, withdrawn
  since: the record keeps what the trial saw)
- [x] Take `README.md` out of 0027's test of where a pin is written, and give the fake host of the wrapper's tests
  and their earlier-built image versions no pin equals. Done before the revision, and listed here so that
  requirement 18 has its task (R18)
- [x] In `tests/release.test.mjs`, change the description the skill's test compares to the one the Approach gives,
  and remove the two tests of the `ARG` lines with the list `pins` and its comment. Run `npm test` and see the
  skill's test fail and every other test pass (R17)
- [x] Change the description in `.claude/skills/release/SKILL.md` to the Approach's and see the skill's test pass
  (R1)
- [ ] Replace `RELEASING.md` with the text the Approach gives, written out of this plan and not retyped. See that
  nothing of the bump is left in it: `grep -n -i -E 'docker|dockerfile|claude-code|opencode|ARG ' RELEASING.md`
  prints nothing (R2, R6, R12, R13, R14)
- [ ] In the README's "Releasing", replace the paragraph that opens "In short" and the last paragraph with the
  Approach's. See that the last paragraph is `master`'s again: `git diff master -- README.md` no longer shows it
  (R15)
- [ ] See that nothing else is left of the bump: `git diff master --stat -- container` is empty, `AGENTS.md` and
  `deploy.sh` are as they were at `45e349f`, and the three test files of requirement 18 are as they were at
  `45e349f`, which `git diff 45e349f -- tests/harness-versions.test.mjs tests/wrapper-fixture.mjs
  tests/agent-wrapper.test.mjs` shows by printing nothing (R4, R18)
- [ ] Try the file once without releasing. Make a throwaway clone of the repository on the host, with this branch
  checked out under the name `master`, and in a fresh Claude Code session there type `/release`. Tell it nothing
  else, except, when it asks or stops for it, that this is a trial that ends at step 3. Record whether the skill
  started and sent the session to `RELEASING.md`; whether it ran the suite and went through step 1; whether it
  drafted a section; and what it reported at step 3. Then have it restore the tree, commit nothing, and remove
  the clone. The trial needs no Docker. When the wording of `RELEASING.md` has to change for it to work, change
  it, and in the plan's Approach alike, and say so in the record (R1, R2, R6, R12)

## Verification

Each was ticked before the revision and is open again, to be seen on the tree the cut-down leaves.

- [ ] `npm test` passes on the host, with the tests of `tests/release.test.mjs` among them
- [ ] `npm pack --dry-run` lists the same files as on `master`, compared as lists, whatever their number (R3)
- [ ] `git diff master -- process.md roles templates scripts container .opencode` is empty (R4)
- [ ] `bash -n deploy.sh` passes
- [ ] No line of the files this unit adds or changes is longer than 120 characters, and none holds an em dash
- [ ] `npm run check-changes` passes, after `npm ci`
- [ ] `docker image ls`, `docker volume ls` and `docker network ls` show nothing named
  `ritenoar-agentrite-agent-release`, which the trial of the withdrawn check created and removed, and
  `/tmp/agentrite-release-no-harness` does not exist
- [ ] The record says what was not run: step 4 with a real version, and the three commands of step 5, which are
  the next release's and the human's

## Commit Points

- [x] The tests
- [x] `RELEASING.md` and the skill
- [x] `AGENTS.md`
- [x] The README
- [x] `deploy.sh`
- [x] The record of the check's trial by hand, with the corrections to `RELEASING.md` it caused
- [x] The test and the skill's description
- [ ] `RELEASING.md` cut down
- [ ] The README
- [ ] The record of the trial of `/release`, with any correction to `RELEASING.md` it caused
