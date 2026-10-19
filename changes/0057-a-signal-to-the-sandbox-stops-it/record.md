---
kind: bug
status: draft
timestamp: 2026-10-19T14:45:48Z
---

# 0057 A signal to the sandbox stops it

## Log

- 2026-10-19T14:45:48Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `170527e`, on the human's request to log the bug that stopped the sandbox twice during a login of
  Claude Code, after `./sandbox.sh 0056`. Made the unit as a bug. Numbered 0057: the highest number in `changes/` is
  0056. The session had read `roles/specifier.md` of the working tree earlier, for unit 0056. Reproduced the
  message on the human's host with the image `ritenoar-agentrite-sandbox:latest` and a Compose file of the kit's
  settings of `init`, `cap_drop` and `cap_add`, dropping to another user with `setpriv`: `SIGWINCH` and `SIGINT`
  sent to `docker compose run`, and `SIGWINCH` sent with `docker kill`, each stopped the container, and with `KILL`
  added it went on running. Read `container/compose.yml`, the drop in `container/entrypoint.sh`, the forms of
  `container/sandbox.sh`, and "Logging in", "Where things are kept on the host" and "What the sandbox defends
  against" of `SANDBOX.md`, and looked into the home volume of the running sandbox, which holds no saved login.
  Left the human's running sandbox as it was. Wrote `spec.md`. What sent the signal during the login is not
  established, and the spec says so. The status is `draft`
