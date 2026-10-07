---
kind: bug
status: in-progress
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
- 2026-10-07T11:51:36Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in the main session on the Linux host,
  at the human's word to build the unit. Cut `bugfix-0042-home-check-cannot-enter-a-directory` from `master` at
  `a41ca27`, on which `npm test` passes with 363 tests. Read `roles/planner.md` of the release 4.1.0, the spec and this
  record, the entrypoint, and the tests of its home checks with their fixture. The fix takes more than a couple of
  steps, with two tests, a comment, a sentence of the README and three runs on a real Docker, so the unit has a
  `plan.md`. Settled as how: the owner is read through the `setpriv` call the entrypoint ends in, the suite stands in
  for `setpriv` on the `PATH`, and the runs on a real Docker use a Compose project and a data directory of their own.
  Nothing in the spec was found unclear or untrue of the tree. The status is `planned`
- 2026-10-07T11:51:44Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in the main session on the Linux
  host, on the unit's branch at `20587ef`. Read `roles/implementer.md` of the release 4.1.0, and the spec, the plan and
  this record in full. The status is `in-progress`
- 2026-10-07T11:55:29Z [Claude Code, anthropic/claude-opus-5-5] **the fault on a real Docker, before the fix.** On the
  tree at `20587ef`, whose entrypoint is that of 4.1.0, with Docker Engine 28.4.0 and Compose 2.39.2, through the
  wrapper as `XDG_DATA_HOME=<scratch> AGENT_PROJECT_NAME=ritenoar-agentrite-0042-trial container/agent.sh "$PWD"
  --rebuild`, called `trial` below. `trial --in-place true` built the image, made the volume
  `ritenoar-agentrite-0042-trial_agent-home`, passed the firewall's proof and exited 0. `trial --in-place chmod 700
  /home/agent/.local` exited 0. `trial --in-place bash -c 'ls -ldn ~/.claude ~/.local ~/.local/share; echo started'`
  then printed, after the build, the one line `stat: cannot statx '/home/agent/.local/share': Permission denied` and
  exited 1, with no line of the entrypoint's own. That is the human's output
- 2026-10-07T11:55:29Z [Claude Code, anthropic/claude-opus-5-5] **the tests, failing first.**
  `tests/entrypoint-home-owner.test.mjs` got a stand-in for `setpriv` on the `PATH` of the guard's script and two tests.
  Run against the entrypoint of `20587ef`, both failed on their assertions: no call of `setpriv` was recorded where
  three were expected, and the message of the closed directory was not the entrypoint's. The four tests that were there
  passed, before and after
- 2026-10-07T11:55:29Z [Claude Code, anthropic/claude-opus-5-5] **the fix.** `check_log_directory_owners` reads each
  owner through `setpriv --reuid=agent --regid=agent --init-groups -- stat -c %u`, and a read that fails is refused with
  `<directory> could not be examined as the agent, so the agent cannot be shown to write it:`, what the read said, and
  the recovery. The comparison of the owner and its refusal are unchanged, and so is the refusal the README quotes,
  compared by eye with the function. The comment above the function says who reads and why, and the README's "The
  harness logs" has three lines on it. `container/compose.yml` has no difference from `master`. Committed as `6db6223`
- 2026-10-07T11:55:29Z [Claude Code, anthropic/claude-opus-5-5] **requirement 1 on a real Docker, after the fix.** On
  the same volume, with the working tree that became `6db6223`: the third command above passed the firewall's proof,
  printed `drwx------ 3 1000 1000` for `/home/agent/.local`, `drwxr-xr-x` for the other two, and `started`, and exited
  0. Then `.local/share` was closed too, by `chmod 700` in a container of the image with the entrypoint replaced and the
  user the developer's, which is how the human's volume has them: the start printed both as `drwx------ 3 1000 1000` and
  `started`, and exited 0
- 2026-10-07T11:55:29Z [Claude Code, anthropic/claude-opus-5-5] **requirement 2 on a real Docker, after the fix.**
  `.claude` was removed from the volume in such a container, with no log mounts, leaving `.bash_logout`, `.bashrc`,
  `.local` and `.profile`. `trial --in-place bash -c 'echo started'` exited 1 with `[entrypoint] FATAL:
  /home/agent/.claude is owned by uid 0, but the agent is uid 1000, so the agent cannot write it.`, then the two lines
  on the earlier release and the four of the recovery, as 4.1.0 printed them. The output holds no line of the firewall
  being installed, and not `started`. The trial was removed: its volume, network, image and the scratch data directory,
  which held `.claude` and `.local` under `agentrite/agentrite` and nothing of a harness
- 2026-10-07T11:55:29Z [Claude Code, anthropic/claude-opus-5-5] `npm test` on the host, on the tree of `6db6223`: 365
  tests, 365 pass, none skipped. Not run: the suite in the sandbox, which the plan does not ask for. Not shown on a real
  Docker: the refusal of a directory that cannot be examined, which the suite shows with a directory closed to its own
  owner, and anything on macOS. Not done: the human's own project, which needs a release that holds this and its image
  built again. Every task of the plan is ticked. The status stays `in-progress`: the review is not this session's
