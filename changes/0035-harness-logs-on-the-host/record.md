---
kind: feature
status: draft
timestamp: 2026-10-06T17:23:33Z
---

# 0035 Harness logs on the host

## Log

- 2026-10-06T17:23:33Z [human] said, in a session of Claude Code on the host, about a tool of theirs that collects
  token usage from the harnesses' logs: "BUT I just realised this probably doesn't happen when I'm running in the
  agentrite containers, becasue they have their own claude and opencode 'homes', right?!" Several ways out were
  weighed. The human settled on a directory of the host mounted for the logs, outside the project and named after the
  project root's directory: "Something like: .local/share/agentrite/norareit/ and .local/share/agentrite/projectx".
  Then: "Can you write the plan for harness-telemetry AND act as the @specifier for the changes necessary to fix this
  for agentrite?"
- 2026-10-06T17:23:33Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the main session, on `master` at
  `f6998db`. Read `process.md` and `roles/specifier.md` of the release 4.0.0, the wrapper, the base compose file, the
  entrypoint and the README's sections on the sandbox. Read the five home volumes of the host from a container, with
  each mounted read-only. Asked the human two things. What to do about OpenCode's login, which is in the directory of
  its database: the human chose to mount the whole directory, which the specifier advised, over Claude Code's logs
  only and over a requirement that the login stays in the volume. What happens to the logs an existing volume holds:
  the human wants them collected and is content with a command to run by hand
- 2026-10-06T17:23:33Z [Claude Code, anthropic/claude-opus-5-5] wrote `spec.md`. The unit is a feature. Its number is
  0035: the highest in `changes/` beside the `history-` directories is 0034. Four things are not established and are
  in the spec, the first of them what a directory mounted inside the home volume does to the home: nothing was
  started. The spec asks that the harnesses be shown working once on a real Docker, on Linux, and leaves macOS open,
  which the README is to say. Six things are under "Beyond the request", the human's proposal of another path than
  `/work` among them. The plan for the human's own tool was written in that tool's repository and is no part of this
  unit. No plan is written. The status stays `draft`
