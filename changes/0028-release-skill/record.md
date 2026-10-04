---
kind: feature
status: draft
timestamp: 2026-10-04T14:01:08Z
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

## Amendments
