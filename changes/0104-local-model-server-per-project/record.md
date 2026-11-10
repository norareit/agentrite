---
kind: feature
status: approved
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

## Amendments
