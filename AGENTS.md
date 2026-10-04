This document contains critical instructions for coding agents working in this repository. Follow these guidelines
precisely.

We eat our own dog food: this project uses AgentRite [
`node_modules/@ritenoar/agentrite/process.md`](node_modules/@ritenoar/agentrite/process.md) is **required reading**
before any change: the changes process in `changes/`, the status progression and the freeze, the commit conventions, the
documentation rules, and the code and testing standards. This file holds only what is specific to this project, and
nothing is stated in both places.

Read [README.md](README.md) before making changes. It is the source of truth for the project overview, architecture,
local development, testing, content authoring, and deployment.

## General guidelines

### Line limit

The default line wrapping of IntelliJ is used: 120 characters. Make sure all code and text are wrapped at 120
characters.

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
* In your answer, propose major, minor or patch, with the reason, and name every change in the shipped diff that
  has no unit
* Stop there. The human reads the section, corrects it and picks the version. Do not commit it before that, and do
  not run `npm version` or `./deploy.sh`
* A release is not a unit and has no directory in `changes/`. On the human's word, commit the section on `master`
  as `Release notes for <version>`, with no unit prefix
* A section of an earlier release may be corrected in place, for example for a consequence found later. The
  released tarball keeps what it shipped with
