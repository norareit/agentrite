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
also what a wrong part gives; then write the notes, commit them, move the tag with
`git tag -fa v<version> -m "<version>"` and run it again. The tag has to stay an annotated one, with the version as
its message, as `npm version` made it: `git tag -f` alone replaces it with a plain tag, and the push below takes
annotated tags only and leaves a plain one behind without saying so.

`deploy.sh` signs in with `aws sso login` if needed, deploys the two stacks, packs the kit with `npm pack`, and
uploads the tarball under the name `npm pack` gives it, which carries the version. Then it fetches the tarball's URL
with no credential and fails unless it is served, and prints the line to put in a project's `package.json`.

A released tarball is never replaced or removed. Projects pin it by its integrity hash, and two projects may sit on
different versions indefinitely, so the script refuses to upload over a name that already exists. It uploads with
`aws s3 cp` rather than a CDK `BucketDeployment` for the same reason: a `BucketDeployment` prunes by default and
would delete versions that a project still installs.

The push comes last. `--follow-tags` pushes `master` and, with it, the annotated tag `npm version` made. A tag that
is not pushed yet can still be moved, which is what a refusal by `deploy.sh` asks for.
