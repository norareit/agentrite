# Releasing

How a release of the kit is made. This file is this repository's own and is not in the package. In Claude Code the
`/release` skill sends the agent here. An agent in another harness, or a human, follows the file directly.

A release is made on the host, on `master`, from the repository root, in this order:

1. Before anything else: the branch, the working tree and the suite
2. The release notes: a section is added to `CHANGELOG.md`
3. The human reads, corrects and picks the version
4. The commit
5. What the human runs: `npm version` and `./deploy.sh`
6. The kit's own dependency: this repository moves to the release
7. The push, which the human runs

An agent runs steps 1 and 2, stops at step 3, and on the human's word runs step 4. It runs nothing of step 5: it
ends step 4 by telling the human its two commands, and stops. On the human's word that `./deploy.sh` succeeded it
runs step 6, and ends by telling the human the command of step 7, which it does not run. An agent asked only for
the release notes runs step 2, stops at step 3, and on the human's word commits the section as step 4 gives it and
nothing else, the move of the README's version among it. An agent asked only to move this repository to a release
that is already made runs step 6 and nothing else.

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
* One change in that diff is the last release's own and belongs to no unit: the line of `package.json` that names
  the kit as a devDependency, moved to the URL of the release `<tag>` names. Step 6 of that release made it. Do
  not name it to the human, and do not write it in the section, on either line: a project that installs the kit
  does not install the kit's devDependencies. Any other change to that line is a change like every other
* Another is the version in the install commands of `README.md`, which step 4 of that release moved to its own
  version. Treat it as the line above: do not name it to the human, and do not write it in the section. Any other
  change to a version in `README.md` is a change like every other
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
* Name every change in the shipped diff that has no unit, but for the one step 2 says not to name

The human reads the section, corrects it and picks the version, changing the heading when the pick differs from the
proposal.

## 4. The commit

A release is not a unit and has no directory in `changes/`. Its commits are made on `master`, with no unit prefix,
which is this project's exception to working on a branch. On the human's word, with the version the human picked:

1. Make sure the section is headed `## <version>` with that version
2. Move every reference to the version of the kit in `README.md` to that version: the URL of the tarball,
   `ritenoar-agentrite-<version>.tgz`, in "Installing it into a project" and in "Updating a project to a newer kit".
   Find them with `git grep -n 'ritenoar-agentrite-.*\.tgz' README.md`, and change nothing else in the file
3. Commit `CHANGELOG.md` and `README.md` as `Release notes for <version>`

Commit nothing else, and push nothing. The notes and the README are committed first because `npm version` refuses a
working tree that is not clean, and so the tree the tag names holds the section and the new version, and the tarball
does too. A project that installs the kit reads the version it installs in its README.

Then tell the human what is theirs now, as the two commands of step 5, with the part filled in, in that order. Do
not run `npm version` or `./deploy.sh`. Say that the push comes after step 6, and ask the human to say when
`./deploy.sh` has succeeded. Stop until then.

## 5. What the human runs

From the repository root, on `master`, with AWS credentials for the account:

```sh
npm version <patch|minor|major>
./deploy.sh
```

An agent runs neither. `./deploy.sh` publishes, and what it publishes is never replaced.

`npm version`, with the part that gives the version of the section's heading, updates `package.json` and
`package-lock.json`, and commits and tags the change. The bump is not optional: the tarball's name comes from the
version, and `deploy.sh` refuses to upload a name that is already released, so a release without a bump fails.

`deploy.sh` refuses, before it does anything else, a version whose section is missing from `CHANGELOG.md`, which is
also what a wrong part gives; then write the notes, commit them, move the tag with
`git tag -fa v<version> -m "<version>"` and run it again. The tag has to stay an annotated one, with the version as
its message, as `npm version` made it: `git tag -f` alone replaces it with a plain tag, and the push of step 7
takes annotated tags only and leaves a plain one behind without saying so.

`deploy.sh` signs in with `aws sso login` if needed, deploys the two stacks, packs the kit with `npm pack`, and
uploads the tarball under the name `npm pack` gives it, which carries the version. Then it fetches the tarball's URL
with no credential and fails unless it is served, and prints the line to put in a project's `package.json`.

A released tarball is never replaced or removed. Projects pin it by its integrity hash, and two projects may sit on
different versions indefinitely, so the script refuses to upload over a name that already exists. It uploads with
`aws s3 cp` rather than a CDK `BucketDeployment` for the same reason: a `BucketDeployment` prunes by default and
would delete versions that a project still installs.

## 6. The kit's own dependency

This repository installs its own release as a devDependency, so that work on the kit follows the released process
and `./sandbox.sh` runs the released sandbox. A release moves that dependency to itself, so that no unit has to
afterwards. The tarball is installed from its URL, so this step comes after `./deploy.sh`, on the human's word that
it succeeded.

`<version>` is the `version` in `package.json`, which `npm version` wrote. Stop, say why and change nothing when
one of these does not hold:

* The branch is `master`
* `git status --short` shows no change to a tracked file

When the devDependency `@ritenoar/agentrite` in `package.json` already names `<version>`, there is nothing to
move. Say so, change nothing, and go on to the end of this step.

Run these five, in this order, and nothing else that changes a file:

```sh
npm install --save-dev https://agentrite.ritenoar.com/ritenoar-agentrite-<version>.tgz
npx agentrite refresh claude opencode
npm test
npm run check-changes
./sandbox.sh --in-place --rebuild true
```

* `npm install` fetches the tarball `./deploy.sh` uploaded and fails when it is not served. When the session may
  not run it, ask the human to, and go on from its result
* `refresh` brings the role wrappers and `sandbox.sh` to what the release writes, and prints each file as written,
  refreshed or up to date
* `npm run check-changes` runs the check of the release just installed. On `master` it has nothing to compare, so
  it shows that the installed check starts, and no more
* `./sandbox.sh --in-place --rebuild true` starts the sandbox of the release just installed, through this
  repository's own shim, and runs a command in it that does nothing. It needs Docker on the host. `--rebuild`
  builds the image every time, which can take minutes, so that the container holds the files of this release and
  not those of an image an earlier release left. It exits 0 when the container passed its own start-up checks,
  the firewall's among them. It shows nothing of a harness, a login, a prompt or a unit run. When the session may
  not run it, ask the human to, and go on from its result

Then read `git status --short` and `git diff package.json`. The tree holds changes to `package.json`,
`package-lock.json` and the files `refresh` printed as written or refreshed, and to nothing else, and
`package.json` differs by the one URL.

Then read "Worth knowing when you update" in the section of `<version>` in `CHANGELOG.md`, as a project that
updates does, and look in this repository's own files for what it asks of a project beyond the install and the
`refresh`: a line that runs something the release changed, a file of the project's own that needs an edit.

The step is those five commands. Stop, commit nothing and repair nothing when:

* One of the five fails. Say which and what it printed
* The tree holds another change, or `package.json` differs by more than the URL. Say what
* The release asks this repository for more than the five commands. Name the file and the line

Then put the repository back: `git restore .`, remove each file `refresh` printed as written, and run `npm ci`,
which installs the release `package-lock.json` names again. Tell the human that the move is now a unit in
`changes/`, on a branch, and what that unit has to do. The release itself is made, and step 7 does not wait.

Otherwise commit `package.json`, `package-lock.json` and the files `refresh` wrote or refreshed, on `master`, with
no unit prefix, as `Depend on AgentRite <version>`. The commit's body is the only record of this step, so write in
it what was seen:

* How many tests passed
* That the change check exited 0
* What `refresh` reported: the files written and refreshed, or that every file was up to date
* That `./sandbox.sh --in-place --rebuild true` exited 0

Commit nothing else, and push nothing.

The start shows that the released sandbox builds and starts in this repository, and no more. It does not stop a
release: the tarball is public once `./deploy.sh` ends, and is never replaced. A start that fails is found here,
before the push and before another project updates, and its repair is a unit and a release after this one. Say so
to the human when it fails.

Then end by telling the human the command of step 7. An agent that was asked only for this step says that its
commit needs that push too.

## 7. The push

```sh
git push --follow-tags origin master
```

The human runs it. An agent does not.

The push comes last. `--follow-tags` pushes `master` and, with it, the annotated tag `npm version` made. A tag that
is not pushed yet can still be moved, which is what a refusal by `deploy.sh` asks for.

With step 6 done, `master` is one commit past the tag, and the one push carries the release's commits, the tag and
the move. The push does not wait for step 6: when that step stopped, or is left for later, push all the same, and
the move is pushed with whatever makes it.
