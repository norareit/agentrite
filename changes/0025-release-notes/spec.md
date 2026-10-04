# 0025 Release notes with every release

## Context

A release of the kit changes things for every project that updates to it, and nothing that ships says what. Release
2.3.0 admitted four more hosts in every project's sandbox and mounted a host file that overrides a setting made
inside the sandbox. The only account of either is in the unit records under `changes/`, which are not in the
package. The README describes the kit as it is, not what a release changed, and a release is a bare commit, `2.3.0`,
made by `npm version`.

After 2.3.0 the implementer wrote a summary by hand, on request. The human then asked: "Wouldn't it be worth adding a
release notes with each version with AT LEAST that 'worth telling' part in it?"

### What the human decided

In the discussion that followed, on 2026-10-04:

* The rule goes in this repository's `AGENTS.md`: "This should NOT go into process.md. It's specific for this
  project. SO it goes into AGENTS.md."
* The notes are written when a release is made, by an agent that summarises the changes since the last version, and
  not by each unit as it is implemented: "Isn't it easier to just let an LLM summerise the changes between version?
  That can make it more coherent AND it makes for easy knowing which version it is for. Because RIGHT NOW a new
  change can't know if it's going into 2.3.1, 2.4.0 or 3.0.0"
* 2.3.0 is backfilled, from the implementer's summary: "hand this to a planner as a unit, with 2.3.0 backfilled from
  the summary above"

The human also said yes to a shape the implementer proposed, as a starting point: a `CHANGELOG.md` in the package
with a section per version in two parts; a summary built from the repository and not from memory; a release in the
order notes, human, `npm version`, `./deploy.sh`, with `deploy.sh` refusing a version that has no section; and a
pointer from the README. The decisions below say where that shape is kept and where it is changed.

### What was found while planning

On `master` at `b1ca65b`, which is the tag `v2.3.0`, with npm 11.11.0 and node 24.14.1.

**What npm packs.** With an empty `CHANGELOG.md` at the repository root, `npm pack --dry-run` lists the same 23 files
as without it. npm 11 always packs `package.json`, the README and a licence file, and no longer a changelog, so the
file ships only when `files` in `package.json` lists it.

**How a release is made today.** `npm version` commits and tags, and `./deploy.sh` then packs the working tree with
`npm pack` and uploads the tarball. The tarball's name and the refusal to replace a released one both come from the
version in `package.json`. `deploy.sh` runs `npm ci`, the type check and `npm test` first, and nothing in it reads
any file of the kit's. Its test, `tests/deploy.test.mjs`, copies the script into an empty directory and stubs `aws`,
`npm`, `npx` and `curl`, so nothing the script reads exists there unless the test writes it.

**What `npm version` needs.** By npm's documentation it refuses to run in a git repository whose working tree is not
clean. A section written for a release therefore has to be committed before `npm version`, and cannot be part of the
version commit itself without a script of the kit's own.

**Which units a release holds.** A unit's number does not say which release it is in. Comparing the statuses in the
records at two tags does. Between `v2.2.1` and `v2.3.0` the units that became `implemented` are 0015, 0016, 0018,
0019, 0021, 0022 and 0023. 0018 was `in-progress` at `v2.2.1`, and 0004 has been `draft` at every tag since
`v2.0.0`, so a unit can sit on `master` across a release without being in it.

**The summary, checked against `git diff v2.2.1 v2.3.0`.** It holds, with these corrections:

* It says a network that blocks one of the new hosts "may" keep the sandbox from starting. The entrypoint reads the
  kit's allowlist and the project's into one list and requires every host in it to be reachable through the proxy
  before it drops to the agent, trying three times and then stopping with `allowlisted host <host> is not
  reachable`. So by the code it does keep it from starting. It was read, not run on such a network
* It leaves out one shipped change: the comment above `ALLOWLIST` in the compose file `init` writes for a project
  now names the four hosts among the kit's own. An existing project's file is never rewritten, so its comment stays
  as it was
* It lists `./agent-dev.sh` as not shipped, which is right for the script. The README sections that describe it do
  ship, since the README is in the package
* It does not say what 0023's spec says of `chatgpt.com`: the host serves the whole of ChatGPT, and data can leave a
  sandbox through any allowlisted host
* "Nothing needs an image rebuild" holds: the Dockerfile, the entrypoint and the proxy have no diff, and those are
  all the image copies from the kit. "No command, option or file layout changed" holds: `scripts/` has no diff, and
  so does everything `refresh` writes. "From 22 to 23 files" holds

**The change check.** `check-changes` reads only the records, specs and plans under `changes/`. A file at the
repository root that changes at every release is outside what it looks at.

**Not established.**

* That `npm version` refuses a working tree that is not clean was taken from npm's documentation and not run
* That a blocked host keeps the sandbox from starting was read from the entrypoint and not run
* `./deploy.sh` cannot be run here: it needs the AWS account. The first real use of this unit is the next release,
  which is the human's

## Requirements

The changelog:

1. The kit has a changelog, `CHANGELOG.md` at the repository root, and it is in the package: `npm pack --dry-run`
   lists it, so a project finds it at `node_modules/@ritenoar/agentrite/CHANGELOG.md`
2. It holds one section per release, newest first, each headed with the version and nothing else, as `## 2.3.0`.
   A section has two parts, in this order: what changed, and what is worth knowing when you update. The second part
   is always there, and says "Nothing." when there is nothing
3. Every line of what changed names the unit or units it comes from, by number. The file opens by saying what those
   numbers are and where the units are, and that the changelog begins at 2.3.0
4. It has a section for 2.3.0 that says at least this, each line with its unit:
   * the four hosts the sandbox newly admits itself, and what each is for
   * the status line: what is mounted, when, and that nothing is mounted without the host file
   * the README section on logging in to a model provider, with the command it gives
   * the "Beyond the request" section of a spec
   * the changed comment in the compose file `init` writes
   * the new file in the package
   * what the units of that release changed in this repository only
   * under worth knowing: that updating needs no rebuild, no `refresh` and no edit; that every sandbox admits
     `auth.openai.com` and `chatgpt.com`, whether or not the project uses OpenAI, and what `chatgpt.com` serves;
     that a network blocking one of the four hosts keeps the sandbox from starting, and that this was read and not
     run; and that the host's status line script runs in the sandbox and replaces one set inside it

The rule:

5. `AGENTS.md` has a section that tells an agent asked to write the release notes how to do it:
   * the section is built from the repository: the units whose record says `implemented` now and did not at the
     last version tag, read from their specs and records, and the diff since that tag of the files that ship
   * every such unit is accounted for in the section, on a line of what changed or on a closing line that names
     what is not in the package
   * a change in the shipped diff that belongs to no unit is named to the human, and is written in the section
     without a number
   * what belongs under worth knowing is said: what changes for a project that updates without the project having
     asked for it, a step the update needs, something that may stop working, and what was not tested, said as such
   * the section is headed with the version the agent proposes, and the agent gives its proposal of major, minor or
     patch, with the reason, in its answer
   * the agent leaves the section for the human to read and correct, and neither commits it before that nor runs
     `npm version` or `./deploy.sh`
   * the commit that holds the notes is named `Release notes for <version>`, with no unit prefix
   * a section is written at release time and never by a unit as it is implemented, with the reason
6. The rule is in this repository's `AGENTS.md` only. `process.md`, `roles/` and `templates/` are unchanged by this
   unit

The release:

7. `./deploy.sh` refuses to release a version that has no section: when `CHANGELOG.md` holds no line that is exactly
   `## <version>`, for the version in `package.json`, or does not exist, it exits non-zero before it calls `aws`,
   `npm` or `npx`, and its message names the version and the file
8. With the section there, `./deploy.sh` does what it did before
9. The suite holds tests for requirements 7 and 8, among them that a heading for another version that begins with
   the same characters, as `## 1.2.30` for `1.2.3`, is not the section
10. The README says how a release goes now, under "Releasing": the notes are drafted by an agent, read and corrected
    by the human, who picks the version, and committed; then `npm version`; then `./deploy.sh`. It says why the
    notes are committed before `npm version`, what `deploy.sh` refuses and what to do then, and points at
    `AGENTS.md` for how the notes are written without repeating it
11. The README's "Updating a project to a newer kit" points at the changelog and says where it is after the install.
    Each place in the README that lists what the repository holds or what a project receives names `CHANGELOG.md`

## Decisions

* **The rule is in `AGENTS.md`, not in `process.md`. The human's decision.** How this kit is released is this
  project's own. `process.md` is what every project that installs the kit works by, and most of them release
  nothing
* **A section is written at release time, by an agent, for every unit in the release at once. The human's
  decision.** The implementer first proposed that each unit's implementer adds a line when the unit ships something.
  The human rejected that: a unit cannot know whether it goes into 2.3.1, 2.4.0 or 3.0.0, and one summary of the
  whole release is more coherent than lines written weeks apart by different sessions. An "Unreleased" section,
  renamed at release, is the usual way around the first objection and was not taken, because it answers the
  heading and not the coherence
* **2.3.0 is backfilled, and no release before it. The first is the human's decision, the second the planner's.**
  The 2.3.0 tarball is released and never replaced, so its section first ships in the release after it, and the
  changelog says so. The releases from 2.0.0 to 2.2.1 are under "Beyond the request"
* **`CHANGELOG.md`, at the root, listed in `files`. Kept from the proposal.** It is the name a reader looks for. It
  has to be listed, because npm 11 does not pack it otherwise. The package goes from 23 files to 24
* **Two parts per section, the second one mandatory. Kept.** "Worth knowing when you update" is the part the human
  asked for, and a section without it cannot be told from one whose writer forgot it. So it is written even to say
  "Nothing."
* **Each line names its unit. Kept, with one addition.** The reasoning stays in `changes/`, which the package does
  not hold, so the file's opening says what the numbers refer to. The addition is the closing line that names the
  units that changed this repository only. With it every unit of the release is in the section somewhere, and the
  human can check the section against the list of units without reading the diff
* **The summary is built from the units and cross-checked against the diff of what ships. Kept.** The units hold
  the reasons and the consequences somebody wrote down. The diff holds what actually shipped. The implementer's
  caveat stands and the rule states it: a consequence nobody recorded is found only by reading the diff. Planning
  this unit showed it twice: the summary missed the changed comment in the generated compose file, and understated
  the start-up check
* **The units of a release are found by status, not by number or by merge.** "Implemented now and not at the last
  tag" is what the records at the two tags show, and it is right for a unit that stayed open across a release, as
  0018 did across 2.2.1. Part of such a unit's work may have shipped in the earlier release. The diff of what ships
  is taken from the same tag, so the section still describes this release's changes and no more
* **The draft is headed with the version the agent proposes.** The version is the human's to pick, after reading.
  The agent has to propose one anyway, so it heads the section with it, and a different pick is a one-line edit in
  a file the human is correcting already. A forgotten edit is what requirement 7 catches. A heading of "Unreleased"
  would need a rename at every release, by hand or by a script, and gains nothing over that
* **A heading holds the version and no date.** The tag holds the date. A date in the heading would be one more
  thing to get right on the day, and `deploy.sh` would have to match around it
* **The notes are a commit of their own, ahead of `npm version`, and not part of the version commit.** `npm
  version` refuses a working tree that is not clean. Folding the notes into its commit needs a `version` script in
  `package.json` that stages the file, which is machinery for the sake of one commit fewer. The notes commit is an
  ancestor of the tag, so the tagged tree holds the section, and the tarball does too
* **A release needs nothing in `changes/`.** A unit records a change and the reasoning for it. A release changes
  nothing that its units have not recorded, and the section is a summary of them. A unit per release would hold
  only a copy of the section. The notes commit and the version commit are therefore made on `master`, with no unit
  prefix, as the version commit is today. That is an exception to working on a branch, and `AGENTS.md` and the
  README state it as this project's own
* **There is no script that gathers the inputs.** The inputs are the last tag, the statuses at it, and one diff.
  The rule names the commands. A script is under "Beyond the request"
* **`deploy.sh` checks for the section itself, first, and by the heading only. Kept, and placed.** The check goes
  ahead of everything else in the script, the AWS sign-in included, so a refusal has touched nothing. It compares
  the whole line, so a version that is the beginning of another is not found by mistake. Two alternatives were
  weighed:
  * A test in the suite that the changelog has a section for the version in `package.json`. `deploy.sh` runs the
    suite, so it would refuse too, and the script would not change. Not taken: the refusal would arrive as a failed
    test after `npm ci` and the type check, and the human said yes to a refusal by `deploy.sh`
  * Checking in `npm version`, through a `version` script, which would refuse before the tag exists. It is under
    "Beyond the request"
* **The check comes after the tag exists, and the README says what to do then.** `deploy.sh` runs after `npm
  version`. When it refuses, the version commit and its tag are already there, without the section. The README says
  to write the notes, commit them, and move the tag to that commit before running `deploy.sh` again, so that the
  tag still names the tree that was released
* **`check-changes` and the freeze are unchanged, and a released section may be corrected.** The freeze protects
  the spec and plan of an implemented unit, which are the record of what was agreed. A changelog section is a
  summary of those and not a record itself, and it has to change at every release by design. A released tarball
  keeps the section it shipped with whatever happens later. A correction to an older section, such as a consequence
  found after the release, is made in place and ships with the next release
* **The rule's wording is in the plan.** The requirements state what the rule must say. The text proposed for
  `AGENTS.md` and for the 2.3.0 section is in the plan's approach, for the human to read with it

## Non-goals

* Sections for the releases before 2.3.0
* A changelog for any other project, or a release process in `process.md`
* A way to read the changelog of a release before installing it. Nothing reports that a newer release exists
  either, which the README already says
* A rule for when a change is major, minor or patch. The README's "as semver means it" stands, and the agent gives
  its reason
* Notes for the units that are not released yet. They are written when the next release is made, which is the
  human's
* Any change to what `npm version` does, or to how the tarball is packed, uploaded or served
* Checking that `deploy.sh` runs on the tagged commit, or on a clean tree. It checks neither today

## Beyond the request

* **Sections for 2.2.1, 2.2.0, 2.1.0 and 2.0.0.** The implementer called it possible from the records, and the
  statuses at the tags bear that out: 0020 became implemented for 2.2.1, 0017 for 2.2.0, 0012 to 0014 for 2.1.0, and
  2.0.0 holds the rename to AgentRite and what came before it. It would cost four more sections to draft and, more
  to the point, four more for the human to read and correct. Without it, a project updating from before 2.2.1 has
  the README and nothing else, as every project had until now
* **A `version` script in `package.json` that refuses `npm version` when the section is missing.** It would catch
  the missing section before the commit and the tag exist, where `deploy.sh` catches it after. It costs a script,
  its test, and a failure mode of `npm version` to document. Without it, `deploy.sh` refuses with a clear message
  and the recovery is a commit and a moved tag, on the human's own machine, before anything is uploaded
* **A script that gathers the inputs**: the last tag, the units implemented since, and the diff of what ships. It
  costs a script and its tests, and it would encode the list of shipped files a second time. Without it the agent
  runs the three commands the rule names
* **`deploy.sh` checking that the section has both parts.** It guards against a mistake nobody has made, in a
  section the human reads before every release. Without it a section missing its second part is seen on reading
* **Serving the changelog from `agentrite.ritenoar.com`**, so that it can be read before installing a release. It
  costs an upload that, unlike the tarballs, is replaced at every release, so different caching and a test.
  Without it a project installs the release and reads the file, and goes back by installing the older URL
* **A date in each heading.** Without it the date of a release is the date of its tag
