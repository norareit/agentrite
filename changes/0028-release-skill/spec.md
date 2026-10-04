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

**What a check of a harness version has to look at.** What a harness does changes with its version, and three units
rest on what the pinned versions do:

* 0015: the hosts a harness contacts at start-up. Its check started `claude` and `opencode` in a sandbox whose home
  held no login, then read `grep 'not allowlisted' /run/egress-proxy.log`, expecting the canary `example.com` and
  `raw.githubusercontent.com`, which 0015 refuses by decision. Its rule: a host found there is a new unit
* 0023: the login the README gives, `opencode auth login -p openai -m "ChatGPT Pro/Plus (headless)"`. The label is
  OpenCode 1.18.30's. Started on a pseudo-terminal it prints a device address and a code and logs in to nothing
* 0022: the status line, which relies on Claude Code honouring `statusLine` from
  `/etc/claude-code/managed-settings.json`. Its check got Claude Code to its prompt with no login, by a made-up API
  key and a seeded `~/.claude.json`

Each of those runs drove the harness under `script -qec <command> <logfile>` and `timeout`, because a harness wants
a terminal, and read the screen from the capture.

**The dev sandbox's home may hold a login.** `./agent-dev.sh` uses the Compose project
`ritenoar-agentrite-agent-dev`, whose home volume "starts empty and lasts". The human logged in to OpenAI in it for
0023, and the volume exists on this host. A check that needs a home with no login cannot assume that one, and
emptying it discards the human's login. `agent/compose.project.yml` names the project and the image after
`AGENT_PROJECT_NAME`, and `./agent-dev.sh` sets that variable over whatever the caller gave, so a third name is
reached by running `container/agent.sh` directly, as `./agent-dev.sh` does.

**This repository admits two hosts of its own.** `agent/compose.project.yml` lists `models.dev` and
`api.openai.com` in the project's `ALLOWLIST`. A sandbox of this repository therefore admits them, and a harness
version that needs one of them is not refused here, while it is in a project that does not list it. Looking only
for refusals misses that. The proxy logs a line for each connection it allows as well, so the hosts a harness
reached can be read too.

**Docker is on the host only.** A sandbox has none, so the release runs in a session on the host. `./deploy.sh`
needs the host as well, for the AWS account.

**Not established.**

* That typing `/release` in a session in this repository runs a skill written as this unit describes. It is read
  from the documentation, through a fetch that summarises the page, and was not tried: the session's guard refused
  the trial in a scratch directory. The plan has a task for it
* That the check runs as described when an agent drives it. No Docker was run while planning. The commands are the
  ones 0015, 0022 and 0023 recorded as having worked, under another Compose project name. The plan has a task that
  runs the check once for real
* That Claude Code 2.1.289 and OpenCode 1.18.34 pass the check. Finding that out is the first release's
* What `npm version` does with files that are not tracked. 0025 tried only a changed tracked file
* Whether `./deploy.sh` runs to its end from an agent's shell, which has no terminal for `aws sso login` or for a
  question from `cdk deploy`

### What is assumed about 0027

Unit 0027 is being planned at the same time and is not approved. Its proposed shape: a sandbox's harness versions
come from the project's own override in its Compose file, else from the versions installed on the developer's host,
else from the kit's pins in `container/Dockerfile`. The pins then stop being what most sandboxes run and become the
tested fallback.

This unit assumes only that the pins exist in `container/Dockerfile` as the two `ARG` defaults, which is true today
and stays true in that shape. It holds whichever unit lands first:

* The check verifies inside the sandbox that the versions it runs are the pins. Under 0027 a build on the host may
  take the host's versions instead; the check then fails on that line, visibly, and the step is corrected to build
  the fallback by whatever 0027 provides for it. If 0027 is on `master` when this unit is implemented, the
  implementer writes the step that way from the start
* What a bump means for a project is worded from what the README says of the pins at the time of the release, not
  fixed here: today every sandbox runs them after a rebuild, under 0027 they are the fallback
* If 0027 lands in another shape, with the pins somewhere else or gone, requirement 17's test of the two `ARG`
  lines fails, which is the signal that the release's step has to be rewritten in that unit or a new one

## Requirements

The skill and the file it points at:

1. The repository has a Claude Code skill, `.claude/skills/release/SKILL.md`. Its frontmatter holds `name: release`,
   a description, and `disable-model-invocation: true`. Its body is one instruction, which sends the agent to
   `RELEASING.md` in the repository root and says that the skill holds no instruction of its own. Typing `/release`
   in a Claude Code session in this repository starts it
2. `RELEASING.md`, at the repository root, holds the whole release in order: what is checked before anything else,
   the harness versions, the release notes, the human's reading, the commits and the version, and `./deploy.sh`. It
   needs no feature of one harness to be followed, and names the skill only as one way to arrive at it
3. Neither file is in the package: `npm pack --dry-run` lists the same 24 files as on `master`
4. There is no OpenCode command for a release, and `.opencode/` is unchanged. `process.md`, `roles/`, `templates/`,
   `scripts/` and `container/` are unchanged by this unit. The pins themselves move at a release, not in this unit
5. `AGENTS.md` keeps what holds for every agent in this repository: that `CHANGELOG.md` has one section per release,
   written when the release is made and never by a unit, with the reason. It sends an agent that is asked to make a
   release, or to write the release notes, to `RELEASING.md`, and says that an agent starts neither unasked. The
   steps for writing the notes, which 0025 put in `AGENTS.md`, are in `RELEASING.md`, with their meaning, their
   exact commands and their strength kept, apart from what requirements 11 to 14 change

Before anything else:

6. `RELEASING.md` has the agent stop, saying why and changing nothing, when Docker does not answer, which is the
   case inside a sandbox; when the branch is not `master`; or when a tracked file has an uncommitted change

The harness versions:

7. The release sets the two pins in `container/Dockerfile` to the versions `npm view @anthropic-ai/claude-code
   version` and `npm view opencode-ai version` print. When both pins already equal them, the step is skipped whole,
   check included, and the agent says so
8. The check runs the sandbox of the working copy under a Compose project of its own, named
   `ritenoar-agentrite-agent-release`, with an image and a home volume of that name. It does not touch the image,
   the home volume or a container of `./agent.sh` or of `./agent-dev.sh`. What it created is removed when the check
   is over, whatever its outcome, and nothing is logged in to
9. The check establishes, and the agent reports for each, what was seen:
   * the image builds, and `claude --version` and `opencode --version` inside the sandbox print the two pins
   * with a home that holds no login, `claude` reaches its first-run screen and `opencode` its prompt
   * every host the egress proxy's log shows a harness to have contacted, admitted or refused, is on the kit's own
     allowlist, `KIT_ALLOWLIST` in `container/compose.yml`, or is a refusal the file lists as known, which today is
     `raw.githubusercontent.com`. A host admitted only because this repository's own `agent/compose.project.yml`
     lists it is not on the kit's allowlist
   * the login command the README gives under "Logging in to a model provider", run as it is written there, prints
     an address and a code. It is stopped there
   * when the host has `~/.claude/statusline-command.sh`: Claude Code, brought to its prompt without a login, shows
     that script's line. When the host has no such file, the agent says this was not checked
10. Anything in requirement 9 that does not hold is a finding. On a finding the agent restores `container/Dockerfile`
    to what `master` holds, removes what the check created, tells the human what was seen, and stops. It fixes
    nothing: it adds no host to an allowlist and changes no README. The human then decides whether the release goes
    out with the pins as they were, or waits for a unit in `changes/` that deals with the finding. A release that
    goes out with the pins as they were continues from the release notes

The release notes:

11. A bump of the pins is a line of "What changed" that gives each harness's old and new version and no unit number.
    "Worth knowing when you update" then says what a project does to get them, and names anything of requirement 9
    that was not checked. The bump is not named to the human as a change that belongs to no unit: it is the
    release's own

The human's reading, the commits and the version:

12. The agent commits nothing before the human's word. With the notes drafted it stops and reports: the version it
    proposes, as major, minor or patch with the reason; every shipped change that belongs to no unit; and, for the
    pins, the old and new versions and what the check showed and did not establish
13. On the human's word, with the version the human picked, the agent makes sure the section's heading is that
    version, and then, on `master` and in this order: commits `container/Dockerfile` as `Harness pins for
    <version>` when the pins were bumped; commits `CHANGELOG.md` as `Release notes for <version>`; and runs `npm
    version` with the part that gives that version. It then checks that `package.json` holds the version of the
    heading. Neither commit has a unit prefix
14. The agent does not run `./deploy.sh`. It tells the human that the release is ready for it, and the command.
    `RELEASING.md` says what `./deploy.sh` does, what it refuses and what to do then, as the README does today

The README and the script:

15. The README's "Releasing" says what a release is and what serves it, as today; that a release is made with the
    `/release` skill in a Claude Code session on the host, which follows `RELEASING.md`, and that a human or an
    agent in another harness follows that file directly; and, in a sentence, what a release does, the bump of the
    pins included. Everything else the section says today is in `RELEASING.md`, with its exact commands and its
    strength. "What is here" has a row for `RELEASING.md`
16. The message `./deploy.sh` prints when it refuses a version with no section sends the reader to `RELEASING.md`,
    and no longer to a section of `AGENTS.md` that is not there. The script does what it did otherwise

The tests:

17. The suite, which runs without Docker and without a network, holds tests that:
    * the skill's frontmatter and body are what requirement 1 says
    * `RELEASING.md` exists, and the skill, `AGENTS.md`, the README and `deploy.sh` each name it
    * `container/Dockerfile` holds exactly one line `ARG CLAUDE_CODE_VERSION=<version>` and one
      `ARG OPENCODE_VERSION=<version>`, each a plain three-part version, and `RELEASING.md` names both arguments
      and both npm packages as the Dockerfile's install line has them
    * the refusal of `./deploy.sh` names `RELEASING.md`

## Decisions

* **A skill, not a file in `.claude/commands/`. The human asked for a skill.** The documentation says the two make
  the same `/release` and recommends a skill for new work. A skill also has `disable-model-invocation`, which this
  one needs
* **The skill is `release`, typed as `/release`.** It is what the human called it: creating the release. The
  directory gives the name and the frontmatter states it too, so that a renamed directory does not rename the
  command unseen
* **`disable-model-invocation: true`.** A release commits on `master` and tags. It starts when the human types
  `/release` and at no other time, and a session that discusses a release, as the one planning this unit did, does
  not set one off. `AGENTS.md` says the same to an agent in any harness, which has no such switch
* **No `allowed-tools`.** It would let the release's commands run without a permission prompt. Which commands an
  agent may run unasked on the human's host is the human's own setting, and a skill in the repository would grant
  it for everyone who clones it. It is under "Beyond the request"
* **The steps are in `RELEASING.md`, at the root, and not in `AGENTS.md`.** Three places were weighed:
  * `AGENTS.md`, where 0025 put the notes rule. It is read into every session of every agent, and the release with
    its check is long and is of use to one session in many. The roles are kept out of it for the same reason
  * A file under `roles/` or `templates/`. Both ship in the package, and a release of the kit is nothing a project
    needs
  * A file of its own at the root. Taken. `RELEASING.md` is the name a human looks for, it is beside `README.md`
    and `CHANGELOG.md`, and it is not packed because `files` does not list it
* **This keeps the human's decision for 0025 and changes where the steps sit.** That decision was that the rule is
  this repository's own and does not go in `process.md`. It still is and does not. `AGENTS.md` still tells every
  agent what every agent has to know, that a unit never writes the changelog, and where the rest is. The steps
  move, whole. 0025's spec and plan are frozen and say `AGENTS.md`; this unit's record is where the move is found.
  Moving documentation needs the human's approval by the kit's documentation rule, and approving this unit is that
  approval
* **The skill's body is the role wrappers' sentence, for another file.** One line, and a statement that the file
  holds no instruction of its own, so that nobody adds a step to the wrapper where an agent in another harness
  would not see it
* **The check has its own Compose project, not the dev sandbox's. Changed from the proposal.** The proposal was
  `./agent-dev.sh`. Its home volume lasts and may hold a login, the human's among them, and the first thing the
  check needs is a home with none. Emptying the dev volume would discard that login. The check therefore runs
  `container/agent.sh` from the working copy, which is all `./agent-dev.sh` does, under a third name. The image is
  built from the same Dockerfile, so Docker's build cache is shared and the cost is a name
* **The check reads the hosts a harness reached, not only the ones refused. Added while planning.** This
  repository's own allowlist admits `models.dev` and `api.openai.com`. A harness version that began to need either
  would start here and fail in a project that does not list it. So a host that was admitted, and is not the kit's
  own, is a finding like a refusal. The alternative, a project Compose file for the check with an empty allowlist,
  needs the wrapper to take another file and is under "Beyond the request"
* **The check is described, not scripted.** What it reads is a terminal's screen: whether a harness reached its
  prompt, whether a login printed an address and a code, whether a line is the status line. Those change shape
  with the version, which is the reason for the check, and reading them is what an agent is for. A script is under
  "Beyond the request"
* **The check is what the units that depend on a harness's behaviour need, and no more.** Start-up, hosts, the
  documented login and the status line are what 0015, 0023 and 0022 rest on. It is not a review of what a harness
  version does, and it sends no prompt to a model, which needs a login. A unit that comes to depend on something
  else a harness does adds its check to `RELEASING.md`
* **A clean bump needs no unit; a finding is one.** The kit's process sends every change through `changes/`, on a
  branch. A bump with a clean check is two lines whose description and diff say the same, decided by nobody: the
  latest version, checked. It is made as part of the release, on `master`, as a third commit beside the two 0025
  excepted. That widens this project's exception to working on a branch by one commit, and the human is asked. A
  bump that needs anything else, a host, a reworded README, a changed wrapper, has a decision in it, and by 0015's
  rule that is a new unit. The release does not make it
* **The alternative, a task unit for every bump, is not taken.** It would give the bump a number in the release
  notes and keep the process whole. It costs a directory, a branch and a merge at every release for two lines, and
  the human asked for the bump to be part of creating the release
* **On a finding both pins go back, and the human decides.** The check tested the pair. Which harness caused a
  finding is usually plain, and the human may say to bump the other alone; the check then runs again for that
  pair, since that pair is what would ship. The file says so and does not do it unasked
* **When the pins are the latest already, the check is skipped too.** The pins were checked when they were set. A
  host can change what it serves without a new version, and that is not what a release guards against. Running the
  check at every release whatever the pins is under "Beyond the request"
* **"Latest" is npm's `latest` tag, as `npm view <package> version` prints it.** It is what a developer gets from
  an install today. A minimum age for a version is under "Beyond the request"
* **Nothing is committed before the human's word, the bump included.** 0025 decided it for the notes. With one
  stop, a release that is abandoned leaves two changed files in the working tree and nothing on `master`. The
  notes' diff of what ships is taken against `HEAD`, as 0025's rule gives it, so the bump is not in it; the agent
  knows the bump from having made it, and the file says so
* **Three commits, in the order pins, notes, version.** The pins are a commit of their own so that it can be read
  and reverted alone. It comes before the notes and the notes before `npm version`, so that the tag names a tree
  that holds all three, which 0025 decided for the notes
* **The agent runs `npm version`, after the human's pick. Changed from 0025 and from the proposal.** 0025's rule
  has the agent stop before it, and the proposal kept that. The human then asked for creating the release as a
  skill. `npm version` changes two files, commits and tags, all in the local repository, and can be undone until
  it is pushed. The agent runs it only on the human's word and with the human's version. The human is asked
  whether that is wanted
* **The human runs `./deploy.sh`. Kept.** It publishes, and a released tarball is never replaced. It signs in to
  AWS through a browser when the session has lapsed, and `cdk deploy` asks at a terminal before it widens a
  permission; an agent's shell has no terminal for either, which was not tried. In Claude Code the human can run
  it from the session by typing `! ./deploy.sh`. The skill running it is under "Beyond the request", and the human
  is asked
* **The README keeps what a release is and loses how one is made.** The first is of use to a project that wonders
  where its tarball comes from. The second is of use to whoever releases, who is sent to the file. The human asked
  for the simplification. The plan lists every paragraph of today's section and where it ends up
* **`deploy.sh` changes by its message only.** It names "Release notes" in `AGENTS.md`, which this unit moves. A
  message that sends the reader to a section that is gone is the kind of thing found on the day of a release
* **The tests hold the wiring, not the release.** The suite runs no Docker and no network, so it cannot hold the
  check. It holds what breaks silently: a wrapper that grew a second instruction, a pointer to a file that was
  renamed, and pins that are no longer where the release edits them. The release itself is tried twice by the
  plan, once by hand and once by an agent that has only the file
* **The texts are in the plan.** The requirements say what `RELEASING.md`, the skill, `AGENTS.md` and the README
  must hold. Their wording is in the plan's approach, for the human to read with it

## Non-goals

* An OpenCode command, or a command for any other harness. The human excluded it
* Bumping the pins in this unit. They move at the next release, which is the human's
* Fixing what a check finds. A refused host, a renamed login label and a build that fails are each a new unit
* Where a sandbox takes its harness versions from, which is 0027's
* Any change to what ships: the package, `process.md`, the roles, the templates, the scripts, the sandbox
* A check that sends a prompt to a model or completes a login
* The release check on Docker Desktop for macOS. It was planned on Linux, and the release is made on the human's
  host
* A rule for when a release is due, or for major, minor and patch
* Pushing `master` or the tag. The README does not say when that happens today, and this unit does not either

## Beyond the request

* **The skill running `./deploy.sh` after a second go.** It would make the skill the whole release. It costs
  finding out what `aws sso login` and a question from `cdk deploy` do in a shell with no terminal, and it puts the
  one step that cannot be undone in the agent's hands. Without it the human types one command
* **A script for the check**, which builds, starts the harnesses, and prints the captures and the proxy's log. It
  would make the check the same at every release. It costs a script and its tests, and it fixes the shape of
  screens that change with the version. Without it the agent runs the commands the file gives, and a command that
  no longer works is seen and corrected in the file
* **A project Compose file for the check with an empty allowlist**, so that a host the kit does not admit is
  refused instead of read from the log. It costs an option in `container/agent.sh`, which ships, and its tests.
  Without it the agent compares the hosts the log shows with the kit's list
* **Running the check at every release, also when the pins did not move.** It would catch a host that changed
  what a pinned version needs. It costs a build and some minutes at every release. Without it such a change is
  found by whoever starts a sandbox, as 0015 was
* **A minimum age for a version**, so that a release does not pin one published the same day. It costs a rule and
  a date to look up. Without it the human sees the versions before the go and can say no
* **`allowed-tools` in the skill**, so that the release's commands run without a permission prompt. Without it the
  human answers the prompts, or sets the permissions on their own host
* **A test that `files` in `package.json` names neither `RELEASING.md` nor anything under `.claude/`.** It guards
  against a mistake nobody has made. Without it the plan's verification runs `npm pack --dry-run` once
* **Pushing `master` and the tag as the release's last step.** Nothing documents it today. Without it the human
  pushes as they do now
