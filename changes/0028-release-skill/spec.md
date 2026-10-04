# 0028 A release skill

## Context

How a release of the kit is made is in two places since 0025: the README's "Releasing" gives the order, and
`AGENTS.md`, under "Release notes", tells an agent how to write the notes. The human runs the rest by hand.

While deciding, for unit 0027, that the harness versions should no longer be fixed by the kit alone, the human said:
"We can still add the bumps in new version everytime (this should probably be added to 'creating the release' along
with the release notes. AND come to think of it: maybe that should all be a slash-command/skill here (the creating
the release). Then it can be simplified in the readme to: use that skill!"

### What the human decided

On 2026-10-04, in the session that dispatched this planner:

* Creating a release becomes a Claude Code skill in this repository
* It is split the way the roles are: a harness-neutral description of the steps, and the skill as a thin pointer to
  it. The implementer proposed that, with an OpenCode command beside the skill, and the human corrected it: "I dont
  necessarily need the opencode command. A claude code skill is enough for the release part. But splitting it the
  way we did with the roles is a nice pattern anyway. Even without the opencode command!"
* The release gains a step: the kit's pinned harness versions are bumped to the latest
* The README's "Releasing" is simplified to pointing at the skill

The human also heard, as a starting point, what the implementer proposed the release would cover: bump the pins in
`container/Dockerfile` and run the start-up checks with `./agent-dev.sh`; draft the notes by 0025's rule; stop for
the human to read, pick the version and run `npm version` and `./deploy.sh`. The decisions below say where that is
kept and where it is changed.

After reading the planner's report of the first draft, on the same day, the human decided further, and this spec
was changed for it:

* The steps for writing the notes move out of `AGENTS.md` into `RELEASING.md`, with a small pointer left in
  `AGENTS.md`: "Yes. It moves to releasing.md with a small pointer in agents."
* A bump of the pins with a clean check may be a commit on `master` with no unit: "yes"
* The agent does not run `npm version`: "NO. I still want to do the npm version myself. It should simply tell me
  to do."
* The agent does not run `./deploy.sh` either: "same: I will do the deploy myself."
* The release ends with the agent telling the human what to run: "pushing master and the tag should be what the
  skill says at the end. Basically: run npm version [with the correct type], run ./deploy.sh and push master with
  tags."
* The names are fine as proposed
* No requirement holds the package to a number of files: "Im not sure if checking a hard 'only 24 files' is a good
  idea. This will easily go beyond 24 soon."

While the unit was being implemented, still on the same day, the check was run once for real, as the plan asks. The
human heard what it found, decided two things further, and this spec was changed for them. The record has what was
seen:

* Three hosts the egress proxy refused once Claude Code was at its prompt, with the pinned and the latest versions
  alike, are refusals the check knows, and none is admitted: "for 1) list them as known refusals. None of these
  seem like something we should care about."
* The release runs `npm test` with the bumped pins, before anything is committed: "2) YES"

Later the same day the human withdrew the bump, and with it the check, and this spec was changed for it a fourth
time. The human had been shown what the step had become: the two pins bumped, the suite run, and then a check of
some 90 lines of `RELEASING.md`, which needs a `claude` and an `opencode` that report no version on the `PATH` for
the wrapper to use the pins at all, since under 0027 a pin is only what a host without the harness gets. The
human's words:

* "Regarding the pins we really need to take a few steps back, because this feels like something is getting very
  complicated while it should be easy."
* "Mmm I have a hard time finding a good solution. Because no check doesn't feel right either. Maybe it just
  doesn't make sense anymore to have a kit version? Maybe we only need : host version OR pinned version in
  compose.project.yml"
* On the main session's proposal: that the kit stops naming versions of its own, in a new unit because 0027 is
  frozen; that the bump and the check come out of this unit; and that a run of `npm test` before `npm version` is
  kept as a small step: "Yes, Go ahead"

So of what is listed above, three things no longer hold: the bump as a step of the release, in the first list; the
bump as a commit on `master` with no unit, in the second; and both decisions of the third, on the known refusals
and on the suite's run with the bumped pins. The kit's versions themselves are unit 0030's. The record has what
the trial of the check saw, and the spec as it stood with the bump and the check is this file at `45e349f`.

### What was found while planning

On `master` at `aa4b8b3`, which holds 0025, on Linux with npm 11.11.0, node 24.14.1, Claude Code 2.1.289 on the host
and Docker Engine 28.4.0.

**The pins.** `container/Dockerfile` holds `ARG CLAUDE_CODE_VERSION=2.1.266` and `ARG OPENCODE_VERSION=1.18.30`, and
no other file outside `changes/` names either version. `npm view @anthropic-ai/claude-code version` printed
`2.1.289` and `npm view opencode-ai version` printed `1.18.34`, so both pins are behind today.

**What a Claude Code skill is.** From the Claude Code documentation at `https://code.claude.com/docs/en/skills`,
fetched on 2026-10-04:

* A project skill is a directory with a `SKILL.md`, at `.claude/skills/<name>/SKILL.md` in the repository. The
  directory may hold supporting files, and the skill's text may send the agent to other files
* Its frontmatter is optional. `name` is what is typed after the slash and defaults to the directory's name.
  `description` says what it does. `disable-model-invocation: true` keeps Claude from starting the skill by itself,
  and the documentation gives a deploy as the case it is for. `allowed-tools` lets the named tools run without a
  permission prompt during the turn the skill starts
* The human runs it by typing `/<name>`, with or without arguments
* A file in `.claude/commands/` still works and makes the same `/<name>`. The documentation says custom commands
  "have been merged into skills" and recommends a skill for new work

**What is in the package.** `files` in `package.json` lists `process.md`, `CHANGELOG.md`, `roles`, `templates`,
three scripts and `container`. `npm pack --dry-run` lists 24 files, none under `.claude/`. A new file at the
repository root is packed only when `files` lists it, as 0025 found for `CHANGELOG.md`.

**The thin wrappers there are.** `.claude/agents/planner.md` holds a frontmatter and one instruction: "Read
`node_modules/@ritenoar/agentrite/roles/planner.md` in the project root and follow it. It is your instruction; this
file holds none of its own." `tests/agentrite-roles.test.mjs` compares the generated wrappers with fixtures, byte
for byte.

**The host.** `./deploy.sh` needs the host, for the AWS account.

**Found for the check, and withdrawn with it.** How 0015, 0022 and 0023 each checked a harness in a sandbox, that
the dev sandbox's home may hold a login, and that this repository's own allowlist admits two hosts the kit's does
not. They are in this file at `45e349f`, and what the check saw when it was run is in the record.

**Not established.**

* That typing `/release` in a session in this repository runs a skill written as this unit describes. It is read
  from the documentation, through a fetch that summarises the page, and was not tried: the session's guard refused
  the trial in a scratch directory. It was not tried while the unit was built either: the human left it to the
  first release, as the decisions say
* That `RELEASING.md` can be followed as it is. Nobody, human or agent, has followed it since the bump was taken
  out, and its commit of the notes and the three commands the human runs have never been run
* What `npm version` does with files that are not tracked. 0025 tried only a changed tracked file. The human runs
  it, and sees it

### What is left to other units

0027 is on `master` and is implemented: a sandbox's harness versions come from the project's Compose file, else
from the host, else from the kit's two pins in `container/Dockerfile`. Unit 0030 takes the pins away. This unit
changes nothing under `container/` and no longer reads or edits the pins. What it holds of 0027's is in
requirement 18: two changes to 0027's tests, made on this unit's branch while the bump was still part of it.

## Requirements

Requirements 7 to 11 held the bump of the harness versions and its check. They are withdrawn, and their numbers
are not used again, so that a number the record cites still means what it meant there.

The skill and the file it points at:

1. The repository has a Claude Code skill, `.claude/skills/release/SKILL.md`. Its frontmatter holds `name: release`,
   a description, and `disable-model-invocation: true`. Its body is one instruction, which sends the agent to
   `RELEASING.md` in the repository root and says that the skill holds no instruction of its own. Typing `/release`
   in a Claude Code session in this repository starts it, which rests on Claude Code's documentation and is first
   seen at the first release made with it
2. `RELEASING.md`, at the repository root, holds the whole release in order: what is checked before anything else,
   the release notes, the human's reading, the commit, and what the human runs to finish it. It needs no feature
   of one harness to be followed, and names the skill only as one way to arrive at it. It names no harness version
   and has no step for one
3. Neither file is in the package: `npm pack --dry-run` lists the same files as it does on `master`, whatever their
   number
4. There is no OpenCode command for a release, and `.opencode/` is unchanged. `process.md`, `roles/`, `templates/`,
   `scripts/` and `container/` are unchanged by this unit
5. `AGENTS.md` keeps what holds for every agent in this repository: that `CHANGELOG.md` has one section per release,
   written when the release is made and never by a unit, with the reason. It sends an agent that is asked to make a
   release, or to write the release notes, to `RELEASING.md`, and says that an agent starts neither unasked. The
   steps for writing the notes, which 0025 put in `AGENTS.md`, are in `RELEASING.md`, with their meaning, their
   exact commands and their strength kept, apart from what requirements 12 to 14 add

Before anything else:

6. `RELEASING.md` has the agent stop, saying why and changing nothing, when the branch is not `master`; when a
   tracked file has an uncommitted change; or when the suite, `npm test`, does not pass, in which case it says
   which test failed and what it printed. It repairs none of the three

The human's reading, the commit and the version:

12. The agent commits nothing before the human's word. With the notes drafted it stops and reports: the version it
    proposes, as major, minor or patch with the reason; and every shipped change that belongs to no unit
13. On the human's word, with the version the human picked, the agent makes sure the section's heading is that
    version, and then, on `master`, commits `CHANGELOG.md` as `Release notes for <version>`, with no unit prefix.
    It commits nothing else
14. The agent runs neither `npm version` nor `./deploy.sh`, and pushes nothing. After its commit it ends by telling
    the human what is left, as three commands in this order, ready to run: `npm version` with the part, patch,
    minor or major, that gives the version of the heading; `./deploy.sh`; and the push of `master` together with
    the release's tag. `RELEASING.md` says what `npm version` and `./deploy.sh` do, what `./deploy.sh` refuses and
    what to do then, as the README does today but for the command that moves the tag, and why the push comes
    last. After that recovery the tag is still an annotated one, which the push takes with `master`

The README and the script:

15. The README's "Releasing" says what a release is and what serves it, as today; that a release is made with the
    `/release` skill in a Claude Code session on the host, which follows `RELEASING.md`, and that a human or an
    agent in another harness follows that file directly; and, in a sentence, what a release does, what the human
    runs at the end included. Everything else the section says today is in `RELEASING.md`, with its exact commands
    and its strength, with one exception: the command that moves the tag after `./deploy.sh` refused, which the
    README gives as `git tag -f v<version>`, is `git tag -fa v<version> -m "<version>"` in `RELEASING.md`. "What is
    here" has a row for `RELEASING.md`
16. The message `./deploy.sh` prints when it refuses a version with no section sends the reader to `RELEASING.md`,
    and no longer to a section of `AGENTS.md` that is not there. The script does what it did otherwise

The tests:

17. The suite, which runs without Docker and without a network, holds tests that:
    * the skill's frontmatter and body are what requirement 1 says
    * `RELEASING.md` exists, and the skill, `AGENTS.md`, the README and `deploy.sh` each name it
    * the refusal of `./deploy.sh` names `RELEASING.md`
18. Two things this unit's branch changed in 0027's tests are as the branch has them at `45e349f`: the test of
    where a pin is written searches `container/` and `templates/` and not `README.md`, and the versions the
    wrapper's tests give their fake host and an image built earlier are ones no pin equals. Nothing else of 0027's
    is changed

## Decisions

* **A skill, not a file in `.claude/commands/`. The human asked for a skill.** The documentation says the two make
  the same `/release` and recommends a skill for new work. A skill also has `disable-model-invocation`, which this
  one needs
* **The skill is `release`, typed as `/release`.** It is what the human called it: creating the release. The
  directory gives the name and the frontmatter states it too, so that a renamed directory does not rename the
  command unseen
* **`disable-model-invocation: true`.** A release commits on `master`. It starts when the human types
  `/release` and at no other time, and a session that discusses a release, as the one planning this unit did, does
  not set one off. `AGENTS.md` says the same to an agent in any harness, which has no such switch
* **No `allowed-tools`.** It would let the release's commands run without a permission prompt. Which commands an
  agent may run unasked on the human's host is the human's own setting, and a skill in the repository would grant
  it for everyone who clones it. It is under "Beyond the request"
* **The steps are in `RELEASING.md`, at the root, and not in `AGENTS.md`.** Three places were weighed:
  * `AGENTS.md`, where 0025 put the notes rule. It is read into every session of every agent, and the release is long
    and is of use to one session in many. The roles are kept out of it for the same reason
  * A file under `roles/` or `templates/`. Both ship in the package, and a release of the kit is nothing a project
    needs
  * A file of its own at the root. Taken. `RELEASING.md` is the name a human looks for, it is beside `README.md`
    and `CHANGELOG.md`, and it is not packed because `files` does not list it
* **This keeps the human's decision for 0025 and changes where the steps sit. The human agreed to the move.** That
  decision was that the rule is this repository's own and does not go in `process.md`. It still is and does not.
  `AGENTS.md` still tells every agent what every agent has to know, that a unit never writes the changelog, and
  where the rest is. The steps move, whole. 0025's spec and plan are frozen and say `AGENTS.md`; this unit's record
  is where the move is found
* **The skill's body is the role wrappers' sentence, for another file.** One line, and a statement that the file
  holds no instruction of its own, so that nobody adds a step to the wrapper where an agent in another harness
  would not see it
* **The human runs `npm version`, `./deploy.sh` and the push, and the agent ends by naming them. The human's
  decision.** The first draft had the agent run `npm version` after the human's pick, and left the push out as
  something nothing documents. The human decided otherwise on all three: "I still want to do the npm version
  myself. It should simply tell me to do", "I will do the deploy myself", and the skill ends by saying: "run npm
  version [with the correct type], run ./deploy.sh and push master with tags." So the agent's last act is its
  commit, and its last words are the three commands with the part filled in. That is 0025's rule for `npm
  version` and `./deploy.sh`, kept
* **The agent does not check afterwards that `npm version` gave the heading's version.** It no longer runs it.
  The wrong part gives a version with no section in `CHANGELOG.md`, and `./deploy.sh` refuses that before it does
  anything, which 0025 built
* **The push comes last, after `./deploy.sh`, with `--follow-tags`. The flag is the human's choice.** When
  `./deploy.sh` refuses, the recovery moves the tag, which is harmless while the tag is on the human's
  machine only. `git push --follow-tags origin master` pushes `master` and, with it, the annotated tags that point
  into what is pushed, which is the tag `npm version` made: its tags are annotated, as `git cat-file -t v2.3.0`
  shows. The first revision named the tag in the command, and the human asked for the flag. The flag takes
  annotated tags only, which the next decision is about
* **The recovery after a refusal recreates an annotated tag. The human's decision, on the review's finding S1.**
  0025's recovery, which this unit moved out of the README, moves the tag with `git tag -f v<version>`. That
  replaces the annotated tag `npm version` made with a plain one, and `git push --follow-tags`, which this unit
  introduced, pushes annotated tags only: the push would succeed, take `master`, and leave the release's tag
  behind without a word. 0025 had no push, so the command was right there and became wrong here, and requirement
  14 was untrue on the one path the file gives for a refusal. The reviewer found it, and the human accepted the
  correction, in the words the record has. So `RELEASING.md` gives `git tag -fa v<version> -m "<version>"`, the
  message being the one `npm version` gives its tags here, and says why. It is the one command of the moved text
  that differs on purpose, which requirement 15 names. Not taken: naming the tag in the push, which the human had
  already turned down for the flag. Shown in a scratch clone with dry-run pushes, as the record has it, and not
  yet in a real release after a real refusal
* **The package is compared with `master`'s, not counted. The human's remark.** The first draft required 24 files.
  The number moves with every unit that ships a file, so a requirement that names it is wrong as soon as another
  unit lands first. What this unit promises is that it adds nothing to the package
* **The README keeps what a release is and loses how one is made.** The first is of use to a project that wonders
  where its tarball comes from. The second is of use to whoever releases, who is sent to the file. The human asked
  for the simplification. The plan lists every paragraph of today's section and where it ends up
* **`deploy.sh` changes by its message only.** It names "Release notes" in `AGENTS.md`, which this unit moves. A
  message that sends the reader to a section that is gone is the kind of thing found on the day of a release
* **The bump of the harness versions, and its check, are withdrawn. The human's decision, made while the unit was
  implemented.** The bump was the human's own request, and the check came with it: a version nobody tried should
  not become the kit's. Built, it was the largest part of the release: two edits, a run of the suite, two runs of
  a sandbox under a Compose project of its own, a comparison of the proxy's log with two lists of hosts, and a
  `claude` and an `opencode` that report no version, put on the `PATH` so that the wrapper takes the pins at all.
  And since 0027 it guarded little: a pin is what a sandbox gets only on a host that does not have the harness.
  The human: "this feels like something is getting very complicated while it should be easy", and then "Maybe it
  just doesn't make sense anymore to have a kit version?" With no version of the kit's own there is nothing for a
  release to bump and nothing to check, so both leave this unit whole, and the kit's versions leave the kit in
  unit 0030. Weighed and not taken: the bump without the check, of which the human said "no check doesn't feel
  right either"; and the check as built
* **What the trial of the check saw is in the record, and is nobody's requirement now.** Three hosts the proxy
  refuses once Claude Code is at its prompt, some ninety connections of OpenCode's that end before they name a
  host, and that both harnesses started and the README's login printed a code with the versions of that day. The
  human's decision that the three hosts are refusals nobody need care about stands as a statement about those
  hosts. What the kit promises for a harness version it did not check is 0030's to say
* **The suite is run before anything else, and a failure stops the release.** `./deploy.sh` runs `npm test`, but
  only after `npm version` has committed and tagged, and a failure there is undone by hand. It was found by
  trying, with the pins bumped, and the reason holds without the pins: any test may fail on `master` on the day of
  a release. Keeping the run is the main session's recommendation, which the human's "Yes, Go ahead" covers, and
  is open to the human's correction on reading. That it is one of the conditions of the first step, and not a step
  before the commit, is the planner's: there it stops the release before anything is written, it costs about a
  second, and the one file the release changes afterwards is `CHANGELOG.md`, with `./deploy.sh` running the
  suite once more after it. An agent asked only for the release notes does not run it
* **Nothing checks for Docker any more. The planner's.** The first step stopped when Docker did not answer, because
  the check needed it, and that also told a session in a sandbox that it was in the wrong place. The agent's part
  now needs no Docker. What needs the host is `./deploy.sh`, for the AWS credentials, and the human runs it. The
  file and the README still say that a release is made on the host, and the README loses the sentence on Docker
  that this unit gave it. Kept as a stand-in for "not in a sandbox", the condition would be a check with no reason
  of its own
* **The test of the two `ARG` lines goes, in this unit and not in 0030. The planner's.** It held that the Dockerfile
  has each pin on one line as a plain three-part version and that `RELEASING.md` names what the release edits. The
  release edits neither line now. Left for 0030, the test would sit on `master` holding a file to a form that
  0030 exists to change, and 0030, planned from `master`, would have to delete a test from a file its own branch
  does not have. 0027's own test that each pin is written once in the Dockerfile is on `master` and is 0030's
* **Nothing is committed before the human's word.** 0025 decided it for the notes, and it is kept. A release that
  is abandoned leaves one changed file in the working tree and nothing on `master`
* **Two commits, in the order notes, version, the second one the human's.** The notes come before `npm version` so
  that the tag names a tree that holds them, which 0025 decided
* **The two changes to 0027's tests stay as this branch has them.** They were made so that the suite survives a
  bump: the README left the test of where a pin is written, on the human's decision, "Okay no readme it is", and
  the fake host of the wrapper's tests got versions no pin equals, on the word of the dispatching session, which
  the human has not corrected. With no bump their reason is weaker, and it is not gone: until 0030 the pins exist,
  the README's examples are still versions a pin could be set to, and both changes are test-only. Taking them
  back would be a second change to the same lines, shortly before 0030 rewrites those tests for a kit with no pins.
  That they stay is what the main session expects, and the planner agrees. 0030 is planned from `master` and
  says how it meets them
* **The tests hold the wiring, not the release.** The suite holds what breaks silently: a wrapper that grew a
  second instruction, and a pointer to a file that was renamed. The release itself is held by no test and
  tried by nothing in this unit: its first trial is the first release, by the next decision
* **The first real release is the trial of `/release` and of the file. The human's decision, with the risk
  accepted.** The plan had a task that typed `/release` in a fresh session in a throwaway clone and stopped
  before the commit. The human has a release to make once 0030 and 0029 are in, and chose to see it there, in
  the words the record has. Accepted as not established until then: that typing `/release` starts the skill, which
  requirement 1 asks and only the documentation supports; that the shorter `RELEASING.md` can be followed; and
  its commit and the human's three commands, which have never been run. What a failure costs is small and is
  seen at once: when `/release` does not start the skill, an agent is asked to read `RELEASING.md`, which needs
  no skill, and a step that does not work as written is corrected in the file, in a unit. The steps of the trial
  stay in the record, for whoever wants it sooner. The reviewer is to judge requirement 1 knowing this
* **The withdrawn requirements keep their numbers. The planner's.** The record cites requirements 7 to 12 by number
  in many places, as what was built and tried. Renumbering would make each of those point at something else.
  With the gap, only the plan's tasks had citations to correct
* **The texts are in the plan.** The requirements say what `RELEASING.md`, the skill, `AGENTS.md` and the README
  must hold. Their wording is in the plan's approach, for the human to read with it

## Non-goals

* An OpenCode command, or a command for any other harness. The human excluded it
* Bumping or checking a harness version at a release. Withdrawn by the human
* Which versions of the harnesses a sandbox gets, and whether the kit names any. That is 0027's, and 0030's
* Any change to what ships: the package, `process.md`, the roles, the templates, the scripts, the sandbox
* Repairing a test that fails on the day of a release. The release stops, and the repair is a unit
* A rule for when a release is due, or for major, minor and patch
* The agent pushing anything. The file tells the human the command

## Beyond the request

* **`allowed-tools` in the skill**, so that the release's commands run without a permission prompt. Without it the
  human answers the prompts, or sets the permissions on their own host
* **A test that `files` in `package.json` names neither `RELEASING.md` nor anything under `.claude/`.** It guards
  against a mistake nobody has made. Without it the plan's verification runs `npm pack --dry-run` once
