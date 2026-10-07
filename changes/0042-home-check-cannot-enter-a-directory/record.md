---
kind: bug
status: approved
timestamp: 2026-10-07T11:45:34Z
---

# 0042 The home check cannot enter a directory only the agent may enter

## Log

- 2026-10-07T11:45:34Z [human] moved another project of theirs to the release 4.1.0, built its image again with
  `./agent.sh --in-place --rebuild true`, and gave what it printed to a session of Claude Code on the host: the build,
  and then `stat: cannot statx '/home/agent/.local/share': Permission denied`. Told the cause, the human asked for the
  bug to be specified, and whether the project can simply be started again once a release holds the fix
- 2026-10-07T11:45:34Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the main session on the Linux
  host, on `master` at `966628b`, which holds the release 4.1.0. Read `process.md` and `roles/specifier.md` of that
  release, the entrypoint and the base compose file. Read the project's home volume from a container, mounted
  read-only: `.claude`, `.local` and `.local/share` are uid 1000, and `.local` and `.local/share` are `drwx------`
- 2026-10-07T11:45:34Z [Claude Code, anthropic/claude-opus-5-5] reproduced the cause on Docker Engine 28.4.0, with the
  project's image, built from 4.1.0, and a volume made for it, `agentrite-0042-trial`. As the agent: `chmod 700
  ~/.local`. Then in a container with `--cap-drop ALL --cap-add NET_ADMIN --cap-add SETUID --cap-add SETGID
  --security-opt no-new-privileges:true` and the entrypoint replaced by `bash`: `id -u` printed `0`, `CapEff` was
  `00000000000010c0`, `stat -c %u` printed `1000` for `/home/agent/.claude` and for `/home/agent/.local`, and for
  `/home/agent/.local/share` printed `stat: cannot statx '/home/agent/.local/share': Permission denied` and exited 1.
  In the same container `setpriv --reuid=agent --regid=agent --init-groups stat -c %u /home/agent/.local/share`
  printed `1000`, and as the agent all three directories were writable. The volume was removed. The entrypoint
  itself was not run on that volume: the human's output is what it prints
- 2026-10-07T11:45:34Z [Claude Code, anthropic/claude-opus-5-5] wrote `spec.md`. The unit is a bug, of
  `0035-harness-logs-on-the-host`, which is implemented and so frozen. Its number is 0042: the highest in `changes/`
  beside the `history-` directories is 0041. Which program made `.local` for its owner alone in the human's volume
  was not looked for. Two things are under "Beyond the request", the first of them that the image is not built again
  when the kit changed, so that a project needs `--rebuild` to get this fix. No plan is written. The status stays
  `draft`
- 2026-10-07T11:51:06Z [human] read what the specifier answered and the summary of the spec, and asked for the unit to
  be built, which approves it. The status is `approved`
