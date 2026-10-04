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
- 2026-10-04T18:31:02Z [Claude Code, anthropic/claude-opus-5-5] as implementer, read 0027's spec and record on
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

## Amendments
