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
mkdir -p /tmp/agentrite-release-no-harness
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

Before the first run there may be nothing of that name. Each of the three then fails and says so, which is as it
should be. After the last run remove `/tmp/agentrite-release-no-harness` as well.

Each run is a new container with a new proxy log, so a harness is started and the log is read in the same run. A
harness wants a terminal, and one with a size: start it as
`timeout 30 script -qec 'stty rows 40 cols 120; <command>' <logfile>`, with the log file under `/tmp`, and read its
screen from the capture, with the escape sequences stripped. Without the `stty`, the terminal `script` makes has no
rows and no columns when the run itself has no terminal, and OpenCode then draws nothing that can be read. A
harness places its text by moving the cursor, so in a stripped capture words run together or stand one to a line.
Log in to nothing, and enter a code nowhere.

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
  lists it, such as `models.dev`, is not on the kit's allowlist: a project that does not list it refuses it. A
  line that names no host, `refused: the connection closed before its ClientHello was complete`, has nothing to
  compare: say how many there were. OpenCode's start leaves many of them
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
