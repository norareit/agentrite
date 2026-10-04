---
kind: feature
status: in-progress
timestamp: 2026-10-04T18:20:11Z
---

# 0028 A release skill

## Log

- 2026-10-04T13:24:41Z [human] while deciding, for unit 0027, that the harness versions should no longer be fixed by
  the kit alone, said: "We can still add the bumps in new version everytime (this should probably be added to
  'creating the release' along with the release notes. AND come to think of it: maybe that should all be a
  slash-command/skill here (the creating the release). Then it can be simplified in the readme to: use that skill!"
  The implementer proposed building it the way the roles are built, the steps in one harness-neutral file and a thin
  wrapper per harness, and the human agreed with one correction: "I dont necessarily need the opencode command. A
  claude code skill is enough for the release part. But splitting it the way we did with the roles is a nice pattern
  anyway. Even without the opencode command!" The spec records four things as the human's: a Claude Code skill and
  no OpenCode command; the split into a neutral file and a thin pointer; the bump of the pinned harness versions as
  a step of the release; and the README's "Releasing" simplified to pointing at the skill. The time of this entry is
  when the request reached the planner, not when each thing was said
- 2026-10-04T13:24:41Z [Claude Code, anthropic/claude-opus-5-5] took the planner role, in a worktree of this
  repository, and wrote `spec.md` and `plan.md` on the branch `feature-0028-release-skill`, made from `master` at
  `aa4b8b3`, which holds 0025. A feature, because it has decisions. The number was given by the session that
  dispatched the planner: 0026 is on a branch that is not on `master`, and 0027 is being planned at the same time.
  Planned under the process of release 2.3.0, read from the main checkout's `node_modules`, since a worktree has
  none. What the spec rests on, on Linux with npm 11.11.0, node 24.14.1 and Claude Code 2.1.289 on the host:
  * `container/Dockerfile` pins Claude Code 2.1.266 and OpenCode 1.18.30, and no file outside `changes/` names
    either version. `npm view @anthropic-ai/claude-code version` printed 2.1.289 and `npm view opencode-ai
    version` printed 1.18.34
  * The Claude Code documentation on skills, `https://code.claude.com/docs/en/skills`, fetched once, through a
    fetch that answers questions about the page and does not return it whole. From it: where a project skill
    lives, its frontmatter, how it is started, and that a file in `.claude/commands/` makes the same command and a
    skill is recommended for new work
  * `npm pack --dry-run` lists 24 files, none under `.claude/`
  * `README.md`, `AGENTS.md`, `deploy.sh`, `container/agent.sh`, `agent-dev.sh`, `agent/compose.project.yml`, the
    wrappers under `.claude/agents/` and `.opencode/agents/`, and the tests of the wrappers and of `deploy.sh`,
    read. Every place that names "Releasing" or "Release notes" outside `changes/` is in the README, `AGENTS.md`
    and `deploy.sh`
  * The records and plans of 0015, 0022 and 0023, for how each checked a harness in a sandbox, and the documents of
    0025
  * `docker volume ls` and `docker image ls`, read only: the dev sandbox's image and home volume exist on this host

  Where the spec keeps the proposal and where it changes it is in its decisions. The changes: the check runs under
  a Compose project of its own and not with `./agent-dev.sh`, whose home volume may hold a login; the check reads
  the hosts a harness reached and not only the refusals, because this repository's own allowlist admits
  `models.dev` and `api.openai.com`; and the agent runs `npm version` on the human's word, where the proposal and
  0025's rule left it to the human. Decided by the planner where nothing was discussed: the file is `RELEASING.md`
  at the root; the skill is `release` and cannot be started by the model; a clean bump is a commit of the release
  on `master` and a finding is a new unit; nothing is committed before the human's word; the check is skipped when
  the pins are the latest; the check is described and not scripted.

  Not established: that `/release` starts the skill, which is from the documentation and was not tried, the
  session's guard having refused a trial in a scratch directory; that the check runs as written, since no Docker
  was run while planning; that the two latest versions pass it; what `npm version` does with untracked files; and
  whether `./deploy.sh` could run from an agent's shell. The plan has a task for each of the first two.

  For the human to decide, besides approval: the four texts in the plan's approach; whether the steps for the
  notes may move out of `AGENTS.md`, where 0025 put them, into `RELEASING.md`; whether a clean bump may be a third
  commit on `master` with no unit; whether the agent runs `npm version`; whether the skill should run
  `./deploy.sh` as well; and what under "Beyond the request" is taken. Status left at `draft` for the human's
  approval
- 2026-10-04T14:01:08Z [human] having heard the planner's report of the first draft, and before reading the spec and
  the plan, gave these remarks and decisions, and said the documents are read and approved after they are handled:
  * Against a requirement that holds the package to 24 files: "Im not sure if checking a hard 'only 24 files' is
    a good idea. This will easily go beyond 24 soon."
  * The notes steps move to `RELEASING.md`, with a small pointer in `AGENTS.md`: yes
  * A clean bump of the pins as a commit on `master` with no unit: yes
  * The agent running `npm version`: "NO. I still want to do the npm version myself. It should simply tell me to
    do."
  * The skill running `./deploy.sh`: "same: I will do the deploy myself."
  * The names: "seems fine to me"
  * Pushing: "pushing master and the tag should be what the skil lsays at the end. Basically: run npm version
    [with the correct type], run ./deploy.sh and push master with tags."
- 2026-10-04T14:01:08Z [Claude Code, anthropic/claude-opus-5-5] took the planner role, in the session that dispatched
  the first planner, and changed `spec.md` and `plan.md` for those remarks, on the branch in the main checkout,
  the first planner's worktree being removed. What changed:
  * R3, the plan's third task and its verification compare the package's list of files with `master`'s and name
    no number. The decision says why
  * R13 ends at the agent's two commits. R14 has the agent run neither `npm version` nor `./deploy.sh`, push
    nothing, and end by telling the human three commands in order: `npm version` with the part that gives the
    picked version, `./deploy.sh`, and the push of `master` with the release's tag. The requirement that the agent
    checks `package.json` afterwards is gone with the command: a wrong part gives a version that has no section,
    which `./deploy.sh` refuses, as 0025 built
  * In the plan's texts: the skill's description, the list of steps and steps 5 and 6 of `RELEASING.md`, the
    README's summary sentence, the list of what differs from the moved texts, and two rows of the table of
    paragraphs. Step 6 is now "What the human runs", with the three commands, and says why the push comes last
  * The push is written as `git push origin master v<version>`, naming the one tag, where the human said "push
    master with tags". That choice of command is the planner's, for the human to change on reading
  * The decisions record each of the human's as the human's. The non-goal on pushing now says only that the agent
    pushes nothing. Under "Beyond the request", the skill running `./deploy.sh` and the push as a last step are
    gone, the first declined and the second taken as an instruction to the human. The other items there stand,
    undecided, and so left out
  Nothing was run for this revision. What the spec lists as not established still is, except whether `./deploy.sh`
  runs from an agent's shell, which no longer matters. Status left at `draft` for the human's reading and approval
- 2026-10-04T14:13:07Z [human] on the push command: "I want it to be --folow-tags"
- 2026-10-04T14:13:07Z [Claude Code, anthropic/claude-opus-5-5] as planner, changed the push in step 6 of the plan's
  `RELEASING.md` text to `git push --follow-tags origin master`, with its explanation, and the spec's decision on
  the push to match. Checked: `git cat-file -t v2.3.0` prints `tag`, so the tags `npm version` makes here are
  annotated, which is what `--follow-tags` pushes. The push itself was not run. Status still `draft`
- 2026-10-04T18:20:11Z [human] approved the spec and the plan as they stand at `e33ae0b`, in the session that
  dispatched the implementer, with the words: "Let's move on to 0028. Implement it as the @implementer". Nothing
  under "Beyond the request" was taken up, so none of it is in scope. Status `approved`. The time of this entry is
  when the words reached the implementer, not when they were said
- 2026-10-04T18:20:11Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role, in the main checkout at
  `/home/stef/projects/agentrite`, on the branch `feature-0028-release-skill`, and not in a worktree, as the human
  wants it. Working under the process of release 2.3.0, read from `node_modules`. Status `in-progress`
- 2026-10-04T18:22:40Z [Claude Code, anthropic/claude-opus-5-5] as implementer, brought the branch up to date by
  merging `master` at `94099e9` into it, as `3eadd13`, and not by a rebase, so that `e33ae0b`, which the approval
  names, keeps its id. `master` held two units the branch did not: task 0026 and feature 0027. The merge had no
  conflict, since the branch had changed only this unit's directory. On the merged tree, before any change of this
  unit, `npm test` exited 0 with 224 tests, 224 passing
- 2026-10-04T18:25:45Z [Claude Code, anthropic/claude-opus-5-5] as implementer, read 0027's spec and record on
  `master`, and `container/agent.sh`, `container/Dockerfile`, `container/compose.yml`, the README and
  `tests/harness-versions.test.mjs` as 0027 left them, and went through this unit's spec and plan against them.
  The spec foresaw 0027 under "What is assumed about 0027" and says the implementer writes the step for it from
  the start, so what follows changes the plan and not the spec. No requirement or decision of the spec was found
  that no longer holds. What 0027 changed, and what was done about each, in `plan.md` before the work:
  * A sandbox no longer builds from the pins on a host that has the harnesses. The plan's run command,
    `AGENT_PROJECT_NAME=ritenoar-agentrite-agent-release container/agent.sh "$PWD" --rebuild <command>`, would on
    this host build with the host's versions, and requirement 9 has the sandbox print the pins. 0027 gives three
    ways to a pin, and the first is the one taken:
    * A `claude` and an `opencode` first on the wrapper's `PATH` that report no version. By 0027's requirement 3
      the wrapper then takes the kit's pin and says so in a line that names it. It touches no tracked file, it goes
      through the wrapper's own reading of the two `ARG` lines, and the wrapper's line shows that it did. It rests
      on a path 0027 built for a harness that misbehaves, which is the weak side of it
    * The versions held in this repository's `agent/compose.project.yml`, uncommitted, which is the way 0027's
      spec and README name for holding a version. Not taken: it is an edit to a tracked file in the middle of a
      procedure that ends by committing on `master`, which 0027's own spec calls easy to commit by mistake; it has
      to be undone on every outcome; and while it is there a start of `./agent.sh` or `./agent-dev.sh` in this
      checkout would take the held versions too. It would also not go through the wrapper's fallback
    * A choice from the environment, which 0027 lists under "Beyond the request" and did not build
    Which of the first two the release uses is a judgement the human may want to make differently. It changes
    step 2 of `RELEASING.md` and nothing else
  * The pins are no longer "the versions the image installs". Step 2 of the plan's `RELEASING.md` text now opens
    by saying what a pin is under 0027
  * What a bump means for a project changed: a sandbox on a host that has the harness does not get the pin at
    all. The spec left that wording to the README of the day. The bullet on the bump in step 3 now has the notes
    say which sandboxes get the new versions, and names the README's subsection "The harness versions", which 0027
    added, where it named "Running the sandbox"
  * The wrapper rebuilds by itself when the image's labels differ from the wanted versions. The check keeps
    `--rebuild`, so nothing changes for it, and with `--rebuild` the wrapper prints no line about a difference
  * 0027 added `tests/harness-versions.test.mjs`, with a test that the Dockerfile has one line per pin and one that
    no shipped file but the Dockerfile holds a pin, `README.md` included. The README text of this unit names no
    version. The first overlaps with the test of the two `ARG` lines requirement 17 asks for, which is kept as the
    plan has it: it is stricter, a plain three-part version where 0027's allows a pre-release part, and it sits
    with the test that `RELEASING.md` names what the release edits
  * The suite holds 224 tests, not the 192 the plan's first task names. Corrected
  * 0027's README sentence that the login's label is the one the pinned OpenCode uses, and its sentence that
    `./agent-dev.sh` runs the host's versions, agree with the check as written and change nothing in it
  * After 0027 nothing on this host runs the pinned pair, as its record says. So the check of step 2 is the only
    thing that does, and it is made only when the pins move
- 2026-10-04T18:27:05Z [Claude Code, anthropic/claude-opus-5-5] as implementer, the tests, `RELEASING.md`, the skill and
  `AGENTS.md`.
  * `tests/release.test.mjs` holds eight tests, and the three refusal tests of `tests/deploy.test.mjs` gained the
    assertion. Before anything else of the unit existed, `npm test` exited 1 with 232 tests, 221 passing and 11
    failing: the eight new ones and those three. The 221 are the suite of the merged tree less the three
  * `RELEASING.md` and `.claude/skills/release/SKILL.md` are the plan's texts, written out of `plan.md` by a script
    and not retyped. The skill's test, the two of the pins and the two of `RELEASING.md` then passed
  * `npm pack --dry-run --json` lists 24 paths here and 24 in an export of `master` at `94099e9`, and the two
    sorted lists are the same, compared with `diff`. None is `RELEASING.md` or under `.claude/`. Nothing was added
    under `.opencode/`: `git ls-files .opencode` shows the three role wrappers
  * `AGENTS.md`: "Release notes" is replaced by the plan's "Releasing". The nine bullets it loses, against
    `RELEASING.md`, compared by a script for the ones said to be word for word:
    * "Build the section from the repository", "The units of the release", "Read the diff of what ships", "Write
      the section at the top" with its two parts, "Write for a reader", and "A section of an earlier release": each
      is in step 3 word for word, commands included
    * "In your answer, propose major, minor or patch, with the reason, and name every change in the shipped diff
      that has no unit": step 4, as two bullets, with the pins added as a third
    * "Stop there. The human reads the section, corrects it and picks the version. Do not commit it before that,
      and do not run `npm version` or `./deploy.sh`": the stop, the human's reading and "Commit nothing before the
      human's word" are in step 4, and "Do not run `npm version` or `./deploy.sh`" closes step 5
    * "A release is not a unit and has no directory in `changes/`. On the human's word, commit the section on
      `master` as `Release notes for <version>`, with no unit prefix": step 5, with the commit of the pins before it
    * The line that opened the list, "When asked to write the release notes:", is the pointer's "Read it when asked
      to make a release or to write the release notes", and the opening of `RELEASING.md` says which steps an agent
      asked only for the notes runs
    What differs is what the plan lists, and one thing it does not list: the opening paragraph of the section
    stays in `AGENTS.md` without its last sentence, "The order of a release is in the README, under "Releasing"."
    The plan's text for `AGENTS.md` leaves it out, and the pointer to `RELEASING.md`, which now holds the order,
    stands in its place
- 2026-10-04T18:27:40Z [Claude Code, anthropic/claude-opus-5-5] as implementer, the README. "Releasing" is the plan's
  text, written out of `plan.md` by a script, and "What is here" has the row for `RELEASING.md` after
  `CHANGELOG.md`'s.
  The section on `master` at `94099e9` is the one the plan's table was written against: 0026 and 0027 did not
  touch it. Each row of the table, checked by searching for the sentence with the line breaks ignored:
  * "A release is a tarball of the kit served from": in the README, word for word
  * "A release is made on `master`, from the repository": the opening of `RELEASING.md`, which adds "on the host",
    and its list of six
  * List item 1: step 3. Its last sentence, "How it does that is in `AGENTS.md`, under "Release notes"", is gone
    with what it pointed at
  * List item 2: step 4 has "The human reads the section, corrects it and picks the version, changing the heading
    when the pick differs from the proposal", word for word, and step 5 has the commit as
    `Release notes for <version>`
  * List item 3: step 6. The command was written "`npm version patch`, or `minor`, or `major`" and is now
    `npm version <patch|minor|major>` in a block
  * List item 4: step 6, `./deploy.sh` in the block, under "with AWS credentials for the account"
  * "The notes are committed first because": step 5, as "The pins and the notes are committed first because", and
    "holds the section" became "holds both"
  * "A release has no unit in `changes/`": the opening of step 5, in the words `AGENTS.md` had for it, "A release
    is not a unit and has no directory in `changes/`", with "both commits" now "Its commits"
  * "`deploy.sh` refuses, before it does anything else": step 6, word for word, with "which is also what a wrong
    part gives" added, and `git tag -f v<version>` as it was
  * "Pick the part to bump as semver means it; there is no rule of the kit's own": step 4, word for word
  * "`npm version` updates `package.json`" to "fails": step 6, word for word but for its opening, which now says
    which part to give
  * "`deploy.sh` signs in with `aws sso login`" and "A released tarball is never replaced or removed": step 6,
    both paragraphs word for word
  * "Releasing runs on the host only": the README, with the sentence on Docker added, and step 1
  Nothing else in the README changed: `git diff` shows the row and the section only. The README names neither
  pin, which `tests/harness-versions.test.mjs` holds. After it `npm test` exited 1 with 232 tests, 228 passing: the
  four that failed are the ones waiting for `deploy.sh`
- 2026-10-04T18:28:08Z [Claude Code, anthropic/claude-opus-5-5] as implementer, `deploy.sh`. The refusal's two lines
  are the plan's, and nothing else in the script changed. `bash -n deploy.sh` exited 0, and `npm test` exited 0
  with 232 tests, 232 passing. The script itself was not run: the suite runs a copy of it against commands of its
  own. Also corrected in this record: the time of the entry on 0027, which was written ahead of the clock, is now
  that of its commit, and a line that was 123 characters long is wrapped
- 2026-10-04T18:38:53Z [Claude Code, anthropic/claude-opus-5-5] as implementer, ran the check of step 2 by hand, once,
  on the host, from this checkout on the tree of `b27c3dc`. Linux, Docker Engine 28.4.0, node 24.14.1. The host has
  Claude Code 2.1.289 and OpenCode 1.18.34, and `npm view` printed the same two as the latest, so on this day the
  host's versions and the bumped pins are equal. The branch was this unit's and not `master`, so step 1 would
  have stopped: the trial is of step 2 alone. The two pins were set in the working tree to 2.1.289 and 1.18.34,
  nothing was committed, and `container/Dockerfile` was restored with `git checkout` afterwards.
  The commands were the file's, with two additions of the trial's own: each run's commands were a script in the
  session's scratch directory, mounted with the wrapper's `--mount <directory>:ro` and run as
  `bash /mnt/<directory>/<script>`, and a second `--mount` took the raw captures and the proxy's log out for
  reading. Standard input was `/dev/null`. What each line of "What has to hold" showed:
  * The image builds from the pins. The wrapper printed `agent.sh: 'claude --version' printed no version, so the
    sandbox gets the kit's Claude Code 2.1.289.` and the same for OpenCode with 1.18.34, and in the sandbox
    `claude --version` printed `2.1.289 (Claude Code)` and `opencode --version` printed `1.18.34`. Since the
    host has those versions too, the printed versions alone would not have shown where they came from. The
    wrapper's two lines do, and the runs with the pins as they are on `master`, below, printed 2.1.266 and 1.18.30
    on the same host
  * `claude`, in a home that held `.bash_logout`, `.bashrc` and `.profile` only, reached its first-run screen:
    "Welcome to Claude Code v2.1.289", "Let's get started." and the choice of a text style
  * `opencode` reached its prompt, "Ask anything", with `1.18.34` in the corner, in the run that gave the terminal
    a size. In the first run, with the command as the plan had it, its capture held terminal queries and nothing
    that could be read
  * The hosts of the first run, after the 12 lines of start-up: `claude` gave 5 lines, `api.anthropic.com` and
    `platform.claude.com` allowed and `raw.githubusercontent.com` refused. `opencode` gave 119 lines:
    `models.opencode.ai` once and `registry.npmjs.org` 30 times, allowed, and 88 lines `refused: the connection
    closed before its ClientHello was complete`, which name no host. The login gave 4: `models.opencode.ai` and
    `auth.openai.com` allowed, and two of the lines that name no host. Every host named is on `KIT_ALLOWLIST` or
    is the known refusal. `models.dev` and `api.openai.com`, which this repository's own list admits, were
    contacted by neither harness, only by the entrypoint's start-up check
  * The login command, as the README gives it, printed "Go to: https://auth.openai.com/codex/device" and "Enter
    code:" with a code, and waited. It was ended by `timeout` after 45 seconds. The code was entered nowhere
  * The second run: with the made-up key and the seeded `/home/agent/.claude.json`, Claude Code came to its
    prompt, said "Remote managed settings failed to load (authentication rejected (401))", and showed
    `/work (feature-0028-release-skill) | Opus 5.5`, which is the line the host's script prints for that directory
    and model. No login was made. The home held `backups`, `plugins` and `sessions` under `.claude` afterwards
  * The hosts of the second run are a finding by the file's rule: besides `api.anthropic.com`, allowed, and
    `raw.githubusercontent.com`, refused, the proxy refused `downloads.claude.ai` twice, `github.com` once and
    `http-intake.logs.us5.datadoghq.com` twice. None is on `KIT_ALLOWLIST` and none is a refusal the file knows.
    Claude Code showed its prompt and its status line all the same
  Both runs were then repeated with the pins as `master` has them, 2.1.266 and 1.18.30, under the same name, to see
  what is the new versions' and what is not. The same three hosts were refused in the second run, `github.com`
  once and the other two twice, and OpenCode's start left 90 of the lines that name no host. So neither is new
  with 2.1.289 or 1.18.34: the second run has a finding with the versions the kit pins today, and by requirements
  9 and 10 as they stand the check of every release would end in one. That is told to the human and not fixed
  here. What to do about it is the human's and the planner's: name the three as refusals the file knows, as 0015
  did for `raw.githubusercontent.com`; or compare hosts in the first run only, as 0015's own check did; or a unit
  that admits a host. `RELEASING.md` keeps the rule the spec gives.
  A second thing the trial found, which no requirement covers: with the pins at 2.1.289 and 1.18.34,
  `node --test tests/harness-versions.test.mjs` failed in "no file that ships holds a pinned version but the
  Dockerfile", naming `README.md`. The README's examples under "The harness versions", which 0027 wrote, use
  2.1.288, 2.1.289, 1.18.33 and 1.18.34, and two of those are today's latest. The check of step 2 does not run
  the suite, so a release made today would commit the pins, and `./deploy.sh` would stop at its own `npm test`,
  after `npm version` made its commit and its tag, and before it deploys or uploads anything. Not fixed here: the
  README's examples are 0027's text, and a step of the check that runs the suite is a requirement the spec does
  not have. For the human: whether step 2 runs `npm test` with the bumped pins, and whether the README's examples
  move to versions a pin cannot reach.
  Corrected in `RELEASING.md` and in the plan's text alike, for what did not work as written or was not said:
  * A harness is started as `script -qec 'stty rows 40 cols 120; <command>'`. Without a size OpenCode drew
    nothing readable, as above. Claude Code's first-run screen was readable either way
  * `mkdir -p` for the directory of the two commands, so that one left by a check that was broken off is no error
  * That the three removals fail before the first run when there is nothing to remove. Each exited 1 here
  * That a stripped capture has words run together or one to a line, which is how both harnesses' screens came out
  * That a proxy line naming no host has nothing to compare, and that their number is reported. Whether some
    ninety connections that end before they name a host are something to look into is the human's to say
  Not established by the trial: that the check works from a session whose Bash has no `/dev/null` standard input
  or cannot mount a directory; the check on a host without `~/.claude/statusline-command.sh`; a build that fails;
  and the path on a finding as an agent would walk it, since the pins were restored by hand at the end.
  Afterwards: the volume `ritenoar-agentrite-agent-release_agent-home`, the network
  `ritenoar-agentrite-agent-release_default`, the image `ritenoar-agentrite-agent-release` and
  `/tmp/agentrite-release-no-harness` are removed. The lists of all images, volumes, networks and containers,
  taken before the trial and after it, are the same, compared with `diff` by name and id.
  `ritenoar-agentrite-agent` is still `143d91ec452a` and `ritenoar-agentrite-agent-dev` still `d11961d8abb8`.
  The build cache keeps the layers the builds made, which `docker builder prune` removes. Nothing was logged in
  to, and `git status --short` shows no change to a tracked file
- 2026-10-04T18:39:43Z [Claude Code, anthropic/claude-opus-5-5] as implementer, the second trial is not made and is the
  human's. It asks for `/release` typed in a fresh Claude Code session, which this session cannot drive, so its
  task and the commit point of the two trials stay unticked. Whether `/release` starts the skill is therefore
  still not established: the skill's text is held by a test, and nothing has run it. The steps, on the host:
  1. `git clone /home/stef/projects/agentrite /tmp/agentrite-release-trial`, then in the clone
     `git checkout -B master origin/feature-0028-release-skill` and `npm ci`. The clone has the tags, which step 3
     needs
  2. `claude` in the clone, and type `/release`. Say nothing else, except, when it asks or stops for it, that this
     is a trial that ends at step 4
  3. To record: whether the skill started and sent the session to `RELEASING.md`; whether it bumped, checked and
     cleaned up; whether the section had the bump's line; and what it reported at step 4
  4. Have it restore the tree and commit nothing. Then `docker image ls`, `docker volume ls` and
     `docker network ls` show nothing named `ritenoar-agentrite-agent-release`,
     `/tmp/agentrite-release-no-harness` is gone, and `rm -rf /tmp/agentrite-release-trial`
  What to expect while the finding of the trial by hand stands: the second run of the check has three refused
  hosts the file does not know, so the session should stop at step 2 with the pins restored, and the notes then
  have no line for a bump. The trial shows the bump's line in the section only after the human has decided what
  those three hosts are
- 2026-10-04T18:39:43Z [Claude Code, anthropic/claude-opus-5-5] as implementer, where the unit stands, on `99b7a4c`.
  This commit adds this entry and ticks in the plan and nothing else.
  * `npm test` exited 0: 232 tests, 232 passing, none failing, cancelled or skipped
  * `npm run check-changes` exited 0 and printed nothing of its own. It ran the released 2.3.0 script from
    `node_modules`, which was there already. `npm ci` was not run again for it
  * `npm pack --dry-run --json` lists 24 paths, the same as an export of `master` at `94099e9`, compared as sorted
    lists with `diff`
  * `git diff master -- process.md roles templates scripts container .opencode` is empty, and `spec.md` is as it
    was at `e33ae0b`
  * `bash -n deploy.sh` exited 0
  * No line of a file this branch adds or changes against `master` is over 120 characters, and none holds an em
    dash
  * `docker image ls -a`, `docker volume ls` and `docker network ls` show nothing named
    `ritenoar-agentrite-agent-release`. The images and volumes of `ritenoar-agentrite-agent` and
    `ritenoar-agentrite-agent-dev` are as they were, as the entry on the trial says
  * Not run, by anyone: step 1 on `master`; step 3, the notes, with a bump in them; step 4; step 5 with a real
    version, so neither `Harness pins for <version>` nor `Release notes for <version>` was ever committed; and the
    three commands of step 6, `npm version`, `./deploy.sh` and `git push --follow-tags origin master`, which are
    the next release's and the human's. `./deploy.sh` itself was not run with its changed message: the suite runs
    a copy against commands of its own
  Open, so the status stays `in-progress`: the second trial; the review; and three things for the human and the
  planner, each in the entries above: the three hosts refused in the check's second run, which make the check
  end in a finding with the versions pinned today; the README's examples, which equal today's latest versions and
  fail 0027's test when the pins are bumped to them; and whether the check takes the pins through a `claude` and
  an `opencode` that report no version, as written, or through versions held in the project's Compose file.
  Not pushed, not merged into `master`. None of the items under "Beyond the request" was built
- 2026-10-04T19:06:49Z [human] decided one of the things the trial left open, the README's examples that fail 0027's
  test when a pin comes to equal them. Shown that the test searches `container/`, `templates/` and `README.md` for
  the pins as plain text, and that every version in the README is an example: "cant it just ignore the readme?",
  then "Or even better: cant it just only look in sensicval places?", and on the proposal to keep the plain search
  over `container/` and `templates/` and drop only the README: "Okay no readme it is". So `README.md` leaves that
  test, the README's examples stay as they are, and the human accepts that the README is no longer checked for a
  pin. Still undecided: the three hosts refused in the check's second run, how the check takes the pins, and
  whether step 2 runs `npm test` after the bump. The time of this entry is when the words reached the implementer,
  through the dispatching session
- 2026-10-04T19:06:49Z [Claude Code, anthropic/claude-opus-5-5] as implementer, resumed for that one change.
  `tests/harness-versions.test.mjs` was not among the plan's files and is added there first, and the plan's
  paragraph on 0026 and 0027, which said the test holds the README, is made true. The test no longer reads
  `README.md`. Its search over `container/` and `templates/` and its "written once in the Dockerfile" part are as
  they were. Its name said "no file that ships", which the README does, so it is now "no file under container/ or
  templates/ holds a pinned version but the Dockerfile", with a comment that says why the README is not searched.
  `RELEASING.md` says nothing of the test or of the README's versions and is unchanged. 0027 is frozen, and its
  plan and record say the test reads the README, so its record has an amendment.
  What was seen, with the pins set to 2.1.289 and 1.18.34 in the working tree:
  * Before the change, `npm test` exited 1 with 232 tests, 230 passing and 2 failing: the test of this entry,
    naming `README.md`, and "the wrapper rebuilds for the kit's pins when the host has neither harness, and names
    the kit" in `tests/agent-wrapper.test.mjs`
  * After the change, `npm test` exited 1 with 232 tests, 231 passing and 1 failing. The changed test passes, and
    `node --test tests/harness-versions.test.mjs` alone exited 0 with 4 of 4 passing. The wrapper's test still
    fails. So the change does what it is for, and the suite does not pass with these pins all the same
  * That second failure was not seen in the trial, which ran `tests/harness-versions.test.mjs` alone with the
    bumped pins and not the suite, and the entry on the trial is wrong where it names one failing test as what
    `./deploy.sh` would stop at. Its cause is the same kind: `tests/wrapper-fixture.mjs` gives the suite's fake
    host the versions 2.1.289 and 1.18.34, and the test expects the wrapper to rebuild because the image, which
    holds the fake host's versions, differs from the pins. With the pins equal to them nothing differs, the
    wrapper says nothing, and the test's expected lines are not printed. Not fixed: it is another test of 0027's,
    the human's decision names the README, and what the fixture's versions should be is a choice. For the human:
    a release that bumps the pins to 2.1.289 and 1.18.34 still fails `npm test`, and so `./deploy.sh`, until the
    fixture's host versions are ones a pin cannot reach
  `container/Dockerfile` was restored with `git checkout`, which exited 0, and `git status --short` then showed
  the test file as the only changed tracked file. With the pins as `master` has them, `npm test` exited 0 with
  232 tests, 232 passing. No Docker was run for this. Status stays `in-progress`

## Amendments
