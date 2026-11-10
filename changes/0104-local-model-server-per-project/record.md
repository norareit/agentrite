---
kind: feature
status: in-progress
timestamp: 2026-11-09T17:28:29Z
---

# 0104 The local model server, admitted only in a project that asks for it

## Log

- 2026-11-09T17:28:29Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `985ea9a`, on the
  human's request to admit the local model server's port only in a project that asks for it, as a feature by
  "Security findings" of `AGENTS.md`. Read "The local model server", "Reaching more hosts", "What the sandbox defends
  against" and "When something goes wrong" of `SANDBOX.md`, "The project's settings" of `SETUP.md`, "sandbox.sh" of
  `COMMANDS.md`, how `bell` is read in `scripts/agentrite-settings.mjs` and `container/sandbox.sh`, and the admission
  of the port in `container/entrypoint.sh` and `container/compose.yml`. Wrote `spec.md`. The status is `draft`
- 2026-11-09T17:41:48Z [human] approved the spec. The status is `approved`
- 2026-11-10T10:02:40Z [Claude Code, anthropic/claude-opus-5-5] as the planner, on
  `feature-0104-local-model-server-per-project` cut from `master` at `ca112f6`, stopped before writing `plan.md`.
  Requirement 3 has this repository's own `agentrite.json` hold `"modelServer": false` in this unit, while "The kit's
  own copy of the kit" of `CONTRIBUTING.md` says that the root's `agentrite.json` is the installed release's default
  file with the repository's own roles added, differing from it in nothing else, and that a unit changes the root's
  files only when the repository moves to the release that holds the change. The installed release, 8.4.0, has no
  `modelServer`, and `bbeb81b` returned the root's file to the default file of 7.1.0 after unit 0058 added `bell` to
  it in the unit. The spec records no exception to that rule. The unit goes back to the specifier and the human to
  settle whether the key reaches the root's file in this unit, with an exception recorded, or when the repository
  moves to the release that ships it. The status stays `approved`
- 2026-11-10T10:28:21Z [human] decided that requirement 3 stays as the spec has it: a new required key goes into the
  root `agentrite.json` in the unit that adds it, because the working tree's `npx agentrite` refuses the file
  without it, as unit 0095 did for `process` and task 0096 allowed for. The passage of "The kit's own copy of the
  kit" in `CONTRIBUTING.md` that says otherwise is out of date, and is to be corrected by a task of its own
- 2026-11-10T10:28:21Z [Claude Code, anthropic/claude-opus-5-5] as the planner, wrote `plan.md` against
  `feature-0104-local-model-server-per-project` at `519e5c7`. Read requirement 5 as no rule naming the host
  gateway's address or the model server's port, with the rules of DNS as they are, since the spec's context leaves
  the project DNS to its resolvers. "Updating a project to a newer kit" of `SETUP.md` gains the line a project adds
  for `modelServer`, as it has for each required key. The status stays `approved`
- 2026-11-10T10:44:32Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, began the work on
  `feature-0104-local-model-server-per-project` at `74a46bf`. The status is `in-progress`
- 2026-11-10T10:53:17Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, gave the files of a start that
  `tests/wrapper-fixture.mjs`, `tests/bell.test.mjs`, `tests/sandbox-unit-run.test.mjs` and
  `tests/sandbox-wrapper.test.mjs` write the key `modelServer` in the commit of the setting rather than in that of the
  wrapper, since `parseStart` refuses a start without it once it judges the key, and the suite would fail between the
  two commits. `writeStartSettings` takes `modelServer`, `false` unless given, as the plan has it under task 13
- 2026-11-10T11:04:20Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, finished the tasks of `plan.md` in
  three commits, `7ea2911`, `74dfd35` and `9bd04d4`. On `9bd04d4`, on the host with Docker, `npm test` passes, 1815
  tests with none failed or skipped, `npm run check-changes` exits 0, and no line of a file the branch changes is longer
  than 120 characters but the rows of Markdown tables. `./sandbox-dev.sh --in-place` with a command that opens a TCP
  connection to `host.docker.internal:11434` was run twice. With `"modelServer": false` the entrypoint logged that the
  local model server is not admitted, and the connection timed out after 5 seconds. With `"modelServer": true` in the
  root `agentrite.json` for the check alone, set back to `false` after it, the next start logged the server allowed at
  `172.17.0.1:11434`, the image's ID was the same before and after, every layer of its build cached, and the connection
  timed out too, though a process on the host listens on `*:11434`. Whether the host's firewall drops it, the case of
  the entry in "When something goes wrong", was not checked. The message of the refusal of a project's file that sets
  `MODEL_SERVER_ADMITTED` is the plan's text as written. The status stays `in-progress`, for the review
- 2026-11-10T11:10:43Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, made a full review of unit 0104 at
  `3db42503a0e004ed5a74f0faef0455ee95a15607`, against the merge base with `master`. Returned C1 and C2 in
  `.reviews/0104-local-model-server-per-project/review-2026-11-10T111043Z.md`. `npm test` passed, 1815 tests with none
  failed or skipped; `npm run check-changes` and `git diff --check master...HEAD` passed. Did not independently repeat
  the manual sandbox runs or verify connectivity to the host's actual model server.
- 2026-11-10T11:13:52Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, accepted C1 and C2 of the review of
  `3db4250` and applied them in `e0d19e1`. C1: "Running a unit" of `SANDBOX.md` names `modelServer` among the keys a
  run that cuts no branch reads, and "The local model server" among the sections that say so. C2: the refusal of a
  project's Compose file that sets `MODEL_SERVER_ADMITTED` says to remove that variable from that file, naming it,
  before it names `modelServer` in `agentrite.json` as the setting, in `container/sandbox.sh`, in its test in
  `tests/sandbox-wrapper.test.mjs` and in the message in `plan.md`. On `e0d19e1`, `npm test` passes, 1815 tests with
  none failed or skipped. The status stays `in-progress`
- 2026-11-10T11:15:55Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, made a delta review of unit 0104 at
  `067df4ee8020dbaa338f785d8a51460ded385394`, compared with `3db42503a0e004ed5a74f0faef0455ee95a15607`.
  Returned no new findings in `.reviews/0104-local-model-server-per-project/review-2026-11-10T111555Z.md`.
  `npm test` passed, 1815 tests with none failed or skipped; `npm run check-changes` and the delta's
  `git diff --check` passed. Connectivity to the host's actual model server was not independently verified.

## Amendments
