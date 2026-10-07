---
kind: feature
status: in-progress
timestamp: 2026-10-06T14:38:19Z
---

# 0034 Connect to a unit run

## Log

- 2026-10-06T14:38:19Z [human] asked, in a session of Claude Code on the host, whether a second client can be
  connected to the container of a run, to have Claude Code and OpenCode open in it at the same time for the loop of
  implementing and reviewing. Answered that Docker can start a second process in the running container, which is root
  unless the user is named. The human then asked for a unit of its own, with a spec by the specifier, and proposed a
  command such as `npx agentrite connect 0012`
- 2026-10-06T14:38:19Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the main session, on `master` at
  `3ec09ad`. Read `process.md` and `roles/specifier.md` of the release 4.0.0, the wrapper, the compose file, the
  entrypoint and the README's sections on the sandbox. Asked the human three things. Where the command lives: the
  human chose `./agent.sh --connect 0012`, which the specifier advised, over `npx agentrite connect 0012` and over
  both. What happens to a connected shell when the first shell ends: it ends with the container. What a unit with no
  run under way gets: a refusal that names the command
- 2026-10-06T14:38:19Z [Claude Code, anthropic/claude-opus-5-5] wrote `spec.md`. The unit is a feature. Its number is
  0034: the highest in `changes/` beside the `history-` directories is 0033. Three things are not established and are
  in the spec, the first of them that a process started this way holds no capability: nothing was tried. The spec asks
  that this be shown once on a real Docker. Four things are under "Beyond the request", the human's first proposal
  among them. No plan is written. The status stays `draft`
- 2026-10-07T14:00:02Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the main session, on `master` at
  `306a57b`, on the human's request: replaced the literal quotes of the human's request with a description of what was
  asked, in "What the human asked for" in `spec.md` and in the first entry of this log. The human did not want the
  wording of a chat message in the unit's documents. What was asked, and every requirement and decision, is as it
  was. The status stays `draft`
- 2026-10-07T14:14:38Z [human] approved the spec as it is on `master` at `ddb8020`, asked in a session of Claude Code on
  the host. The status is `approved`
- 2026-10-07T14:17:00Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in the main session on the host. Read
  `process.md` and `roles/planner.md` of the release 4.1.1, the spec and this record, the wrapper, `unit-clone.sh`, the
  compose file, the entrypoint, the Dockerfile, the two suites of the wrapper with their stand-in for Docker, and the
  README's sections on the sandbox. Cut `feature-0034-connect-to-a-unit-run` from `master` at `1391ee6` and wrote
  `plan.md` against it. Every task names the requirements it delivers and every requirement has a task. Nothing was run
  but git: no test, no Docker. The status is `planned`
- 2026-10-07T14:17:00Z [Claude Code, anthropic/claude-opus-5-5] as the planner, two things found that the spec does not
  cover. The plan decides neither, and neither keeps it from being built:
    - `./agent-dev.sh --connect <unit>` will be refused. The shim always passes `--rebuild`, which requirement 10
      refuses together with `--connect`, while the README says of the shim that it takes what `./agent.sh` takes. The
      plan runs requirement 16 by calling the working copy's wrapper itself for the connecting side. Whether the shim
      should connect, or the README should say that it does not, is the specifier's and the human's
    - The wrapper prints no usage besides the forms it lists when nothing to mount was given. The plan reads "the usage
      the wrapper prints" of requirement 13 as those forms and the `Usage:` block of the wrapper's header
- 2026-10-07T14:17:00Z [Claude Code, anthropic/claude-opus-5-5] as the planner, for the implementer: requirement 16
  needs a Docker, which a sandbox does not have. The plan says to leave that task unticked and to log it as a blocker
  when the implementer runs in one. The plan holds the values of the connected command's environment a second time in
  the wrapper, because the spec keeps the entrypoint, the image and the compose file as they are, and has a test hold
  the two together
- 2026-10-07T14:48:00Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the host, in the
  main checkout on `feature-0034-connect-to-a-unit-run` at `ff15108`. Read `process.md` and `roles/implementer.md` of
  the release 4.1.1, the README, the spec, the plan and this record. `npm test` on `ff15108` reported 364 tests, all
  passing. The host has Docker and `script` of util-linux 2.39.3, so the proof of requirement 16 can be run here.
  The status is `in-progress`
