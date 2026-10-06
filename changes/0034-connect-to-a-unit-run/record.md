---
kind: feature
status: draft
timestamp: 2026-10-06T14:38:19Z
---

# 0034 Connect to a unit run

## Log

- 2026-10-06T14:38:19Z [human] said, in a session of Claude Code on the host: "Im running into an issue during testing
  this all out: I want claude code and opencode open both in the container for the implementation/review loop. Can I
  connect a second client to the container for this?" Answered that Docker can start a second process in the running
  container, which is root unless the user is named. The human: "I really think it is worth making this into its own
  unit. Can you act as the @specifier and create a spec for this? maybe something like npx agentrite connect 0012"
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
