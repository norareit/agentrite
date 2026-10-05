---
kind: feature
status: draft
timestamp: 2026-10-04T23:56:09Z
---

# 0031 A release moves the kit's own dependency

## Log

- 2026-10-04T23:52:59Z [human] right after release 3.0.0 was made with the `/release` skill, said: "I just
  realised: maybe we need one more thing in this release skill.... Shouldn't it bump the agentrite dependency
  itself to the newest version in the end? It's kind of absurd to have to have a new change unit for this
  afterwards..." The main session answered with a proposal and asked "Shall I dispatch the planner for it?", and
  the human said: "Yes". Two things are the human's: that the release itself moves this repository's devDependency
  on the kit to the version just released, with no unit afterwards, and the go-ahead to plan it. The proposal is
  the main session's and is in the spec's context, marked as such. The time of this entry is when the request
  reached the planner, not when each thing was said
- 2026-10-04T23:56:09Z [Claude Code, anthropic/claude-opus-5-5] took the planner role, in the main checkout, and
  wrote `spec.md` and `plan.md` on the branch `feature-0031-release-moves-own-dependency`, made from `master` at
  `2c23bec`, the commit tagged `v3.0.0`. A feature, because it has decisions: where the step sits, who runs what
  and when, what stops it, and what the release notes make of it. The number is the highest existing, 0030, plus
  one, and no local or remote branch holds a 0031. Planned under the process of release 2.3.0, which is what
  `node_modules` holds. Read before writing: `RELEASING.md`, the skill, the README's "Releasing", "The kit's own
  copy of the kit" and "Updating a project to a newer kit", `tests/release.test.mjs`, the end of `deploy.sh`, the
  section of 3.0.0 in `CHANGELOG.md`, the record of 0024 and its commit `69921d4`, and the spec of 0028. Run:
  `npm run check-changes` on `master`, which exited 0 and printed nothing, and `git grep` for lines that run
  `./agent.sh`. Not done: fetching the tarball of 3.0.0, which the main session reports as served, and any
  `npm install`. What the planner decided and the human has not read:
  * The agent names two commands after the notes and the push after the move, where 0028 has it name all three
    at the end, on the human's words. The agent still runs none of the three
  * The step reads its version from `package.json` and can be followed alone, in a session that did not make the
    release
  * The body of the step's commit is its record, and the step does not start the sandbox
  * A step that stops commits nothing and puts the tree back, and the push does not wait for it
  * The release notes say nothing of the move, on either line, and the agent does not name it to the human
  * The skill's description changes, and `AGENTS.md` and `deploy.sh` do not
  * The move to 3.0.0 is left out of the unit, as the first use of the step after the merge
  The texts of `RELEASING.md`, the skill and the two paragraphs of the README are in the plan, for the human to
  read and correct. Status left at `draft` for the human's approval
- 2026-10-05T00:03:07Z [human] shown what the draft held and left out, asked for a Docker check once the
  dependency is moved: "Eat your own dog food. If that works, it's really ready to be pushed and used by the
  outside world." The main session answered that the release is public by then, and proposed a second start
  before `./deploy.sh` and a prompt to each harness. The human: "Leave it out. Keep it simple. Just the container
  running is fine. Can you edit the plan/spec?"
- 2026-10-05T00:03:07Z [Claude Code, anthropic/claude-opus-5-5] as the main session, on that request, revised the
  draft's `spec.md` and `plan.md`: step 6 runs a fifth command, `./agent.sh --in-place true`, after the change
  check, and its commit says that the sandbox started. The spec's context, requirements 6, 7, 8 and 10, the
  decisions on the sandbox, the non-goals and "Beyond the request" follow, and the text of `RELEASING.md` in the
  plan. The main session's, and not read by the human: that a start that fails stops the move like any failing
  command and puts the tree back, and that the file says the start gates the push and not the release. The
  command was not run. Status still `draft`

## Amendments
