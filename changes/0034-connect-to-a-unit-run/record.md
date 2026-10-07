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
- 2026-10-07T14:53:05Z [Claude Code, anthropic/claude-opus-5-5] as the implementer: the refactoring is `3e58512`, the
  command with its tests `2a3df5f`, and the second run's refusal and the forms `294f547`. Every test of `--connect`
  was seen to fail before the wrapper was changed: 25 failing of 389 before `2a3df5f`, and 5 of 390 before
  `294f547`. Two things were written that the plan does not spell out:
    - The form in `mount_forms` stands under a line of its own, `Or run a command beside the one of a unit's run
      that is under way, which mounts nothing:`, because the forms above it are listed under `Say what to mount at
      /work, as one of:`, which is not true of `--connect`
    - The test of the terminal runs `script --quiet --return --command <wrapper> /dev/null`, with the wrapper's
      path and the project root in single quotes
- 2026-10-07T14:53:05Z [Claude Code, anthropic/claude-opus-5-5] as the implementer: the proof of requirement 16, on
  the host, on a real Docker, with the working copy's wrapper at `294f547`. Docker 28.4.0, Docker Compose v2.39.2,
  Linux 7.0.0-34-generic, uid and gid 1000. Every one of the plan's points was as the requirement says. `C` below
  stands for the connecting command of the plan, run from the repository root:
  `AGENT_PROJECT_NAME=ritenoar-agentrite-agent-dev container/agent.sh "$PWD" --connect
  feature-0034-connect-to-a-unit-run`. Where a line is longer than this file's, it is wrapped or shortened with
  `...`, and that is said.
    - **The run.** Started with
      `./agent-dev.sh feature-0034-connect-to-a-unit-run bash -c 'echo written by the first command >
      /tmp/first-command; while [ ! -e /tmp/end-the-first-command ]; do sleep 1; done'`, which is one line. So the
      first command writes a file and then sleeps a second at a time until a file appears, where the plan has it
      sleep: that lets a connected command end it. It built the image, the entrypoint proved the firewall, and the
      container `ritenoar-agentrite-agent-dev-feature-0034-connect-to-a-unit-run` was up
    - **The processes, and that the connected command is in the container (R6).** `C ps -eo pid,ppid,user,group,args`
      exited 0 and printed, with the arguments of the first command shortened and the egress proxy's hosts left out:

      ```text
          PID    PPID USER     GROUP    COMMAND
            1       0 root     root     /sbin/docker-init -- /usr/local/bin/entrypoint.sh bash -c echo written ...
            7       1 agent    agent    bash -c echo written by the first command > /tmp/first-command; while ...
           52       7 egress-+ egress-+ node /usr/local/lib/egress-proxy/egress-proxy.mjs 15443 ...
          118       7 agent    agent    sleep 1
          119       0 agent    agent    ps -eo pid,ppid,user,group,args
      ```

      The first command is pid 7. `cat /tmp/first-command`, connected, printed `written by the first command`
    - **The user, the group and the groups (R4).** `C id` printed `uid=1000(agent) gid=1000(agent)
      groups=1000(agent)`. The rest of this entry, up to the terminal, is one connected shell that was given its
      commands on standard input, `C bash < probe.sh`, which exited 0. `grep -E '^(Uid|Gid|Groups):'` of
      `/proc/self/status` and of `/proc/7/status` printed the same three lines:

      ```text
      Uid:	1000	1000	1000	1000
      Gid:	1000	1000	1000	1000
      Groups:	1000
      ```

    - **The environment and the working directory (R4).** `env | grep -E '^(HOME|USER|LOGNAME|PATH)=' | sort`, and
      the same `grep` and `sort` over `tr '\0' '\n' < /proc/7/environ`, printed the same four lines:

      ```text
      HOME=/home/agent
      LOGNAME=agent
      PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
      USER=agent
      ```

      `pwd` printed `/work`, and so did `readlink /proc/7/cwd`
    - **The capabilities (R5).** `grep -E '^(CapInh|CapPrm|CapEff|CapBnd|CapAmb|NoNewPrivs):'` of
      `/proc/self/status` and of `/proc/7/status` printed the same six lines:

      ```text
      CapInh:	0000000000000000
      CapPrm:	0000000000000000
      CapEff:	0000000000000000
      CapBnd:	00000000000010c0
      CapAmb:	0000000000000000
      NoNewPrivs:	1
      ```

      The bounding set is the three capabilities of the compose file, for the connected process as for the first
      command. It is not held: the permitted, effective and ambient sets are empty
    - **A new privilege cannot be gained (R5).** `setpriv --reuid=0 true` printed `setpriv: setresuid failed:
      Operation not permitted` and exited 127. `iptables -S` printed `iptables v1.8.9 (nf_tables): Could not fetch
      rule set generation id: Permission denied (you must be root)` and exited 4. These two were tried and nothing
      else was: no setuid binary of the image was looked for or run
    - **The firewall and the proxy (R6).**
      `curl --silent --show-error --max-time 15 --output /dev/null --write-out '%{http_code}\n' https://example.com`
      printed `curl: (35) OpenSSL/3.0.20: error:0A000458:SSL routines::tlsv1 unrecognized name` and `000`, and
      exited 35. The same for `https://api.anthropic.com` printed `404` and exited 0, which is the host answering.
      `/run/egress-proxy.log` then held `[egress-proxy] refused example.com: not allowlisted` and
      `[egress-proxy] allowed api.anthropic.com -> 160.79.104.10`. One host that is not on the allowlist was tried,
      and plain HTTP and other ports were not
    - **The terminal and the status (R3).** `C tty </dev/null` printed `not a tty` and exited 1, which is the status
      of `tty`. `script --quiet --return --command "C tty" /dev/null </dev/null` printed `/dev/pts/0` and exited 0.
      `C false` exited 1. With the unit given as `0034`, `id -un` printed `agent`
    - **Two at one time (R9).** `C sleep 31` and `C sleep 32` were started side by side, and a third connected `ps`
      showed both, as pids 226 and 220, each with the parent 0, beside the first command. Both then exited 0, and
      the first command went on
    - **The first command ends under a connected command (R8).** With `C sleep 600 </dev/null` under way, a
      connected `touch /tmp/end-the-first-command` ended the first command. The wrapper of the `sleep` printed
      nothing and exited 137. The unit run's wrapper printed nothing more and exited 0, the container and the clone
      were gone, no `sandbox/` ref was left, and the branch was at `294f547` as before. A second run showed the
      same for a command connected on a terminal, `script --quiet --return --command "C sleep 600" /dev/null`:
      nothing printed, and 137. A connect after that printed, the first line wrapped here, and exited 2:

      ```text
      agent.sh: no run is under way for 'feature-0034-connect-to-a-unit-run': the container
      ritenoar-agentrite-agent-dev-feature-0034-connect-to-a-unit-run is not running.
      Start one with 'agent.sh feature-0034-connect-to-a-unit-run'.
      ```

    - **A second run, on the real Docker (R12).** While the second run was up, the working copy's wrapper given
      `0034 true` under the same Compose project started nothing, exited 2, and its third line was
      `To run a command beside it: 'agent.sh --connect 0034 [COMMAND...]'.`
    - **For the README, what Docker's own command gives.** `docker exec <container> id`, with no user named,
      printed `uid=0(root) gid=0(root) groups=0(root)`, and `/proc/self/status` of such a process held
      `CapPrm: 00000000000010c0` and `CapEff: 00000000000010c0`: root, holding `NET_ADMIN`, `SETUID` and `SETGID`
    - **Not shown.** No harness was started in a connected shell, so the second thing the spec lists as not
      established, two harnesses with a terminal each side by side, stays so: the size of each terminal and what
      each does to the other's files were not looked at. `--tty` was seen only under `script`, not from a
      developer's own terminal. Nothing was run on macOS
- 2026-10-07T14:54:40Z [Claude Code, anthropic/claude-opus-5-5] as the implementer: the README is `537b41a`. It says
  of a connected command only what the entry above saw, names Linux and Docker 28.4.0 as where it was seen, and says
  what was not shown. That `NET_ADMIN` is what changing the firewall takes is the spec's finding and was not tried:
  no rule was changed from a root process
- 2026-10-07T14:54:40Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, what was run on `537b41a`, whose
  tree differs from this entry's commit in this record and the plan's ticks only. `npm test` reported 390 tests, 390
  passing, none failing and none skipped, the test of `--tty` under `script` among those that ran. It was 364 on
  `ff15108`. `npm run check-changes` exited 0, and is run once more after this entry is committed, which the entry
  cannot hold. No line of a file that differs from `master` is over 120 characters and none holds an em dash, by
  `awk 'length > 120'` and `grep` over `git diff master --name-only`. Every requirement of the spec is named by a
  ticked task, and every task of the plan is ticked. No shellcheck is on the host, so the two shell files were
  checked by `bash -n` and the suite alone
- 2026-10-07T14:54:40Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, what is open. The planner's two
  points stand as logged, for the specifier and the human: `./agent-dev.sh --connect` is refused, because the shim
  always passes `--rebuild`, while the README says that the shim takes what `./agent.sh` takes, and this unit did
  not change that sentence or the shim. Two harnesses side by side in one container were not tried, as said above.
  The status stays `in-progress`: the review is done elsewhere, and `implemented` is set after it
- 2026-10-07T16:25:38Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, full review of
  `changes/0034-connect-to-a-unit-run/` at `7db50d7e34754b5202fc7f231950920cc992ea76`, against the merge base
  `1391ee6da8d8499d065620192f5a52b91ace2ec1`. Returned S1 and C1; complete findings are saved in
  `.reviews/0034-connect-to-a-unit-run/2026-10-07T162356Z-opencode-gpt-6.1-sol-7db50d7-full.md`.
  `npm test` reported 390 passing, none failing or skipped; `npm run check-changes`, `bash -n` of both changed
  shell files and `git diff --check` passed. Independently exercised connected identity, environment, capabilities,
  privilege refusals, egress, terminals, concurrent commands and owner termination on real Docker 28.4.0 on Linux.
  Historical test-first ordering and red-test counts could not be verified from committed history. Did not run
  macOS or two interactive harnesses side by side. No implementation, spec or plan was changed, and no commit made
- 2026-10-07T16:27:42Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the host, asked
  by the human, through the session that coordinates the work, to check the review of `7db50d7` and to change what
  is necessary. Read the findings file in full and `process.md` and `roles/reviewer.md` of the release 4.1.1 again.
  The reviewer's entry above was not committed, and is committed with this one, as it was written. S1 is right:
  `--workdir` and `--mount` resolve their directory with `cd` while the options are read, so a directory that is
  not there ends the wrapper with the shell's error and 1 before the refusal of requirement 10 is reached, in
  either order. The tests of that refusal gave only a directory that exists. Two tasks for it are added to
  `plan.md`, under a line that says when and why, with three commit points. The status stays `in-progress`
- 2026-10-07T16:28:40Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, the outcome of the review's two
  findings:
    - `S1`, blocking, that `--connect` with `--workdir` or `--mount` and a directory that is not there ends with
      the shell's error and 1, not with the refusal of requirement 10: accepted, on the human's word to change what
      is right, and corrected in `e27106e`. The wrapper keeps the two options' directories as they were given
      while it reads the options and resolves them after the refusals of `--connect`. Four tests, both options in
      both orders with a directory that is not there, failed before the change and pass after it. The reviewer's
      four commands, run on the fixed wrapper with another directory that is not there, each printed the refusal
      that names the option and exited 2. A run is as it was: two tests that a run with such a directory prints
      the shell's error, exits 1 and asks Docker and npm nothing were written first and passed before and after.
      One thing a run does differently, which no test holds: a directory that is not there is now reported after
      all options are read, so an option after it that lacks its argument is reported in its place
    - `C1`, not blocking, that the README says `./agent-dev.sh` takes what `./agent.sh` takes while
      `./agent-dev.sh --connect` is refused: not changed, and not declined. It is the planner's first point of
      2026-10-07T14:17:00Z, and whether the shim should connect or the README should say that it does not is the
      human's to decide. It is open
- 2026-10-07T16:28:40Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, what was run on `e27106e`, whose
  tree differs from this entry's commit in this record and one tick of the plan only. `npm test` reported 396
  tests, 396 passing, none failing and none skipped. `npm run check-changes` exited 0, and is run once more after
  this entry is committed. `bash -n container/agent.sh` passed. No line of a file that differs from `master` is
  over 120 characters and none holds an em dash. Nothing was run on a real Docker for this correction: the refusal
  comes before Docker is asked anything, and a run on a real Docker was not started again, so that a run's
  directories still reach `docker compose run` as before rests on the suite's stand-in. The fix was not reviewed.
  The status stays `in-progress`: `C1` is the human's, and so is `implemented`
