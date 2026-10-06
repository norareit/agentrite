# 0035 Harness logs on the host

## Approach

Written against `feature-0035-harness-logs-on-the-host`, cut from `master` at `e1495c3`, on which `npm test` passes
with 352 tests.

Four pieces, each in the file that already holds its kind of thing:

* **The wrapper gives the two mounts**, as `--volume` flags of `docker compose run`, as it gives `/work`, `.reviews`
  and the status line. Not the base compose file: the stand-in for Docker records the flags of a call and does not
  read `compose.yml`, so only flags are what requirement 17 can show. The wrapper works the log directory out as
  `${XDG_DATA_HOME:-$HOME/.local/share}/agentrite/$(basename "$root")`, which is how it finds the state directory
  for the clones, and makes both directories with `mkdir -p` after the build and before either `docker compose run`,
  where it makes the clone and `.reviews` today. A run that is refused, or whose build fails, therefore makes none.
  It then takes the path through `cd` and `pwd`, as `--workdir` and `--mount` do, because Docker reads a source that
  is not absolute as the name of a volume. The two flags are appended to the `mounts` array, so that in a call they
  come last, after any `--mount` and the status line
* **The image holds both mount points**, with `.claude`, `.local` and `.local/share` above them, as the agent's.
  Docker fills a new home volume from the image, ownership included, before it mounts anything inside it, so the
  mount points are found there and none is made as root. Tried by the planner on this host, on Docker Engine, with
  an image made from `ritenoar-agentrite-agent` by one `RUN mkdir -p ... && chown -R agent:agent ...`, a new volume
  and both mounts: all six directories were uid 1000, the agent wrote in every one, and what it wrote in a mount was
  the developer's on the host. The image and the volume were removed
* **The entrypoint refuses a home in which a directory above a mount is not the agent's**, in a function of its
  own beside `check_home_owner`, called right after it and so before the firewall and the command. It compares
  `.claude`, `.local` and `.local/share`, and not the mount points: Docker Desktop shows the top of every mounted
  directory as root's, which the record's trial on the Mac has. The two refusals end in the same recovery, so that
  text is extracted first, in a commit that changes no behavior
* **The README and the comments say so.** A section of its own, "The harness logs", after "The home volume", and a
  correction of each sentence the unit makes untrue

The paths `.claude/projects` and `.local/share/opencode` are then in three files of three languages: the wrapper,
the Dockerfile and the entrypoint. Nothing can be shared between them, so a test holds the Dockerfile to them, as
`tests/compose-tmpfs.test.mjs` holds the tmpfs list.

Every test that compares a whole `run` call changes, because the call gains two flags. The expected flags come from
one helper in `tests/wrapper-fixture.mjs`, so that the three test files do not each spell them out.

Requirement 18 cannot be run in a sandbox, which has no Docker. It is run on the host, with a Compose project of
its own, `ritenoar-agentrite-0035-trial`, so that no home volume of the human's is touched. The human is needed for
it: both harnesses are logged in by hand, twice.

## Files

- `container/agent.sh`: work out the log directory, make its two directories, append the two mounts. The header
  comment and the comment at the `mkdir`
- `container/Dockerfile`: make both mount points in the agent's home, as the agent's
- `container/entrypoint.sh`: extract the recovery text, add the check of the directories above the mounts, correct
  the comment that says the top of the home is enough
- `container/compose.yml`: comments only, in the header, at `read_only`, at `agent-home` and at the git
  configuration
- `tests/wrapper-fixture.mjs`: the helper that gives the expected log directory and its two flags
- `tests/agent-wrapper.test.mjs`, `tests/agent-unit-run.test.mjs`, `tests/agent-dev.test.mjs`: the expected calls,
  the assertions on what the home holds, and the new tests
- `tests/entrypoint-home-owner.test.mjs`: the extracted function in the list, and the tests of the new check
- `tests/dockerfile-log-directories.test.mjs`: new
- `README.md`: the new section and the corrections
- `changes/0035-harness-logs-on-the-host/record.md`: the log, the run on a real Docker among it

`CHANGELOG.md` is not touched: a release writes it. Nothing under `node_modules` is touched.

## Tasks

The wrapper:

- [x] In `tests/wrapper-fixture.mjs`, export `logDirectory(data, root)`, which gives
  `<data>/agentrite/<basename of root>`, and `logMounts(logs)`, which gives the two flags as the wrapper is to pass
  them, each followed by a space: `--volume <logs>/.claude/projects:/home/agent/.claude/projects` and
  `--volume <logs>/.local/share/opencode:/home/agent/.local/share/opencode` (R17)
- [x] Put `logMounts` in every expected `run` call, directly before `agent`: in `agent-wrapper.test.mjs` the
  literal calls at the three `build`-and-`run` tests, `runOnly`, `buildAndRun`, `expectedRun` and the `--workdir`
  test; in `agent-unit-run.test.mjs` the `unitRun` builder; in `agent-dev.test.mjs` the three calls, whose root is
  named `checkout`. `<data>` is `.local/share` in the test's home. The suite now fails on these (R1, R2, R3, R13,
  R17)
- [x] Change the four assertions that the wrapper leaves the home empty, so that each still says what its test is
  about: "creates nothing there" asserts that the home holds no `.claude`; the `--in-place` and the `--workdir`
  test, "makes no clone", assert that the home holds no `.local/state`; the `XDG_STATE_HOME` test of
  `agent-unit-run.test.mjs` asserts the same in place of no `.local` (R17)
- [x] Added while implementing: the test of a build that fails, in `agent-wrapper.test.mjs`, also asserts that no
  log directory was made, which is what making the directories after the build is for (R5)
- [x] Give `setUp` of `agent-wrapper.test.mjs` a way to run the wrapper with more environment and in a working
  directory, and add these tests, which fail (R17):
    - for `--in-place` and for `--workdir`, with `XDG_DATA_HOME` unset: the call mounts both directories of
      `<home>/.local/share/agentrite/project`, and they were there when Docker was called, which the stand-in's
      `agentScript` shows as the `.reviews` test does. Afterwards both belong to the user running the suite, and
      the log directory holds `.claude/projects` and `.local/share/opencode` and nothing else (R1, R2, R3, R5)
    - the same two with `XDG_DATA_HOME` set to a directory outside the home: the call mounts both directories of
      `<that directory>/agentrite/project`, and the home holds no `.local` (R2)
    - `--workdir` with a directory named otherwise than the root mounts the log directory named after the root,
      not after the directory (R4)
    - a relative `XDG_DATA_HOME` is mounted as the absolute path it names from the wrapper's working directory (R1)
- [x] Add to `agent-unit-run.test.mjs`, failing: a unit run with `XDG_DATA_HOME` unset mounts both directories of
  `<home>/.local/share/agentrite/project`, named after the root and neither after the Compose project
  `project-agent` nor after the branch, and they were there when Docker was called; with `XDG_DATA_HOME` set it
  mounts those of `<that directory>/agentrite/project`, while the clone stays under the state directory (R1, R2,
  R4, R5, R17)
- [x] In `container/agent.sh`, after the build and before `if [ -z "$branch" ]`: work out the log directory, make
  `.claude/projects` and `.local/share/opencode` in it with one `mkdir -p`, resolve it with `cd` and `pwd`, and
  append the two `--volume` flags to `mounts`. Mount nothing above them. Every test above passes (R1, R2, R3, R4,
  R5, R13)
- [x] Make the comments true. In `container/agent.sh`: the header, which lists what the wrapper adds, and a
  comment at the new lines that says why the wrapper makes the directories and where a reader finds them. In
  `container/compose.yml`: the header's sentence on what the wrapper adds; at `read_only`, that the agent also
  writes the two mounted log directories of the host; at `agent-home`, that OpenCode's login and both harnesses'
  sessions are not in it; at the git configuration, that the wrapper adds the log directories besides the status
  line (R7, R14)

The entrypoint:

- [x] Extract what `check_home_owner` says after its first line, from "Recover by removing" to the `docker volume
  rm` line, into a function that prints it, and call it from `check_home_owner`. Add its name to the functions
  `tests/entrypoint-home-owner.test.mjs` builds its script from. The message is the same to the letter, and both
  existing tests pass with their assertions unchanged. `entrypointFunctions` ends a function at the first line that
  is a lone `}`, so the new function holds none inside it (R12)
- [x] Add to `tests/entrypoint-home-owner.test.mjs`, failing, with a home that holds `.claude`, `.local` and
  `.local/share` as real directories of the user running the suite, and skipped off Linux as the two beside them:
    - with the agent's uid that user's, the new check passes and prints nothing
    - with another uid it exits 1, and the message names `<home>/.claude`, says that the volume was made by an
      earlier release in which that directory was never made, gives `docker volume rm <project>_agent-home` and
      starting again, and says that this discards the saved logins (R12)
- [x] Add the check to `container/entrypoint.sh` as a function that takes the agent's uid and the home, compares
  the owner of `.claude`, `.local` and `.local/share` in it with the uid, and dies at the first that differs with
  the message above, ending in the extracted recovery. Call it with `/home/agent` directly after
  `check_home_owner`. Correct the comment above `check_home_owner`, which says that comparing the top alone is
  enough, and say there why the mount points themselves are not compared (R9, R12)

The image:

- [x] Add `tests/dockerfile-log-directories.test.mjs`, failing: the Dockerfile's last stage makes
  `/home/agent/.claude/projects` and `/home/agent/.local/share/opencode`, which are the two targets `logMounts`
  gives, and gives `/home/agent/.claude` and `/home/agent/.local` to the agent with everything in them, after the
  agent's account is made (R11)
- [x] In `container/Dockerfile`, a `RUN` of its own after the one that makes the agent: `mkdir -p` of both mount
  points and `chown -R "${AGENT_UID}:${AGENT_GID}"` of `/home/agent/.claude` and `/home/agent/.local`. Its comment
  says what Docker does to a mount point a new volume lacks, and that the entrypoint refuses a volume made without
  these (R11)

The README:

- [x] Add "### The harness logs" after "### The home volume", holding the seven points of requirement 15 in its
  order: where the logs are on the host, with the path, `$XDG_DATA_HOME`, the layout as a home, and that a tool on
  the host reads them there; that the agent writes this directory besides `/work` and that a reader treats what is
  in it as data; that OpenCode's login is there, in a file of the host, and Claude Code's stays in the volume; that
  two project roots of one name share a log directory, and what follows; what moving to this release does to a
  project that has a home volume; that a volume in which a harness was never started may be refused, with the
  refusal as the entrypoint prints it, and that the logs are copied first by whoever wants them; and that it was
  shown on macOS with Docker Desktop's VirtioFS and with no other file sharing (R15)
- [x] Give in that section the command that copies a volume's logs to the log directory by hand. It is one
  `docker run` on the project's image with `--entrypoint` given, so that no firewall is installed, with the home
  volume mounted read-only, the log directory mounted beside it, and `--user` the developer's uid and gid, so that
  what it writes is the developer's. It copies `.claude/projects` and `.local/share/opencode`, each when the volume
  holds it, and overwrites nothing that the log directory already holds. The README says to run it before the first
  start with this release, because OpenCode's database is one file and is not copied over one that is there. Run
  the command once as it is written in the README, from `ritenoar-agentrite-agent_agent-home` read-only into a
  directory under the scratch directory and not into the real log directory, and log what it printed and what
  arrived. Moving the human's own logs is the human's (R15)
- [x] Correct what the unit makes untrue (R16):
    - under "Running the sandbox": "The agent writes the working directory, its home volume and `/tmp`."
    - under "Working on a clone", the last point of what a unit run does not defend against: the saved logins are
      now Claude Code's in the home volume and OpenCode's in the log directory, and the log directory is one more
      place of the host that a misled agent writes
    - under "The home volume": "It holds both harnesses' credentials and state and the npm cache". The section
      gives the entrypoint's one refusal, of a home with another owner, so name the second there and point to the
      new section for it
    - under "Logging in to a model provider": "once per home volume ... and the login is kept there", which holds
      for Claude Code alone. OpenCode is logged in once per log directory
    - under "Trying the working copy's sandbox": "The image and the saved logins of `./agent.sh` are not touched",
      "The home starts empty and lasts", and "To remove everything it created". The two sandboxes share the log
      directory `~/.local/share/agentrite/agentrite`, and so their sessions and their OpenCode login
- [x] Read every other sentence of the README that holds "home volume", "login" or "logged in", and
  `templates/project/` for the same, and correct what is untrue. Leave what is still true as it is, as the status
  line's `~/.claude/settings.json` (R16)
- [x] Added while implementing: correct the comment of this repository's own `agent/compose.project.yml`, which
  says that `./agent-dev.sh` leaves the saved logins of `./agent.sh` alone. The two share OpenCode's login now. And
  under "Starting it" in the README, "Nothing else of the host is reachable, with three exceptions", which are
  four (R16)

The proof on a real Docker, on the Linux host, by the implementer with the human at hand:

- [x] Set up, from the repository's root. `released` runs the sandbox of the release 4.0.0 and `working` the
  working copy's, both under the trial's Compose project. Both always rebuild, because they share one image name:

  ```sh
  trial=ritenoar-agentrite-0035-trial
  released() { AGENT_PROJECT_NAME="$trial" ./agent.sh --rebuild "$@"; }
  working() { AGENT_PROJECT_NAME="$trial" container/agent.sh "$PWD" --rebuild "$@"; }
  logs="${XDG_DATA_HOME:-$HOME/.local/share}/agentrite/agentrite"
  ```

  Log the versions of Docker Engine and Compose, and of both harnesses in the image (R18)
- [x] **A volume that lacks the directories.** `released --in-place true` makes the trial's home volume with no
  harness started. Then `working --in-place true`. It must exit non-zero before the firewall is installed, with
  the refusal naming `/home/agent/.claude`. Log the message whole (R12, R18)
- [x] **A volume this release makes.** Remove the volume as the refusal says, `docker volume rm
  "${trial}_agent-home"`. Then, before any harness is started:

  ```sh
  working --in-place bash -c 'id; ls -ldn ~ ~/.claude ~/.claude/projects ~/.local ~/.local/share \
    ~/.local/share/opencode; for d in ~ ~/.claude ~/.claude/projects ~/.local ~/.local/share \
    ~/.local/share/opencode; do touch "$d/trial" && rm "$d/trial" || echo "NOT WRITABLE $d"; done; \
    findmnt -rno TARGET,SOURCE | grep /home/agent'
  ```

  All six are the agent's uid, nothing is printed as not writable, and `/home/agent` has the volume and the two
  mounts and no other (R7, R9, R11, R18)
- [x] In that volume the human, in `working --in-place`, logs in to Claude Code and gives it one prompt, logs in to
  OpenCode with the README's command and gives it one prompt, and leaves. In a second container:
  `claude --continue -p "What was the first thing I asked you?"` answers from that session, `opencode session
  list` lists the session, and `opencode auth list` shows the login. On the host, `ls -lnR "$logs"` shows every
  file as the developer's uid, the session file is read with `wc -l` and the database with `sqlite3 "$logs/.local/
  share/opencode/opencode.db" "PRAGMA integrity_check;"`, both as the developer and without `sudo`. `ls -A "$logs"`
  holds `.claude` and `.local` alone, and in a container `ls -A ~` shows Claude Code's login and settings in the
  volume (R6, R7, R8, R18)
- [x] Two containers at the same time, in two terminals, each `working --in-place bash -c 'for i in 1 2 3 4 5; do
  opencode run "say the number $i"; done; claude -p "Reply with only the word A"'`, with `B` in the second. No run
  prints an error, `opencode session list` afterwards lists the ten beside the first, Claude Code's directory holds
  two more session files, and the integrity check prints `ok` (R10, R18)
- [ ] **A volume of an earlier release that holds the directories.** Remove the volume. In `released --in-place`
  the human logs in to both harnesses and gives each one prompt, which is how such a volume came to hold them, and
  `ls -ldn ~/.claude ~/.local ~/.local/share` shows all three as the agent's. Then `working --in-place` with the
  `bash -c` of the task above: it starts, and every directory is writable. Claude Code is logged in from the
  volume and OpenCode from the log directory. Give each one prompt, and in a second container continue Claude
  Code's session and list OpenCode's. Log also what the README says of moving to this release, as seen here:
  whether the sessions made under `released` are listed, and that they are still in the volume, read from a
  container with the volume mounted read-only (R8, R9, R15, R18)
- [ ] Log each of the four steps in `record.md` with what was run and what it printed. Remove the trial: `docker
  volume rm "${trial}_agent-home"`, `docker network rm "${trial}_default"`, `docker image rm "$trial"`. The log
  directory stays, and the record says that it holds the trial's sessions and an OpenCode login: it is this
  project's real one, which `./agent.sh` uses from the next release on. Three home volumes of the host lack
  `.claude`, `ritenoar-agentrite-agent-dev_agent-home` among them, and will be refused. They are left as they are
  and named to the human (R18)

## Verification

- [ ] `npm test` passes, on the host and with `./agent-dev.sh --in-place npm test` in the sandbox
- [x] `npm run check-changes` passes on the committed branch
- [x] Every line of the changed files is within 120 characters, and no changed text holds an em dash
- [ ] Each of the requirements 1 to 18 is shown by a test named above or by a logged step of the proof, and the
  record says which
- [x] Each code block in the README's new section was run as written, and the refusal quoted there is the
  entrypoint's to the letter

## Commit Points

- [x] `feature-0035 Plan the harness logs on the host`: this plan and the record's entry, by the planner
- [x] `feature-0035 Mount the harness logs from the host`: the fixture, the three test files, `container/agent.sh`,
  and the comments of `container/compose.yml`
- [x] `feature-0035 Extract the recovery of a refused home volume`: the refactoring of the entrypoint and the one
  line of its test, with no change of behavior
- [x] `feature-0035 Refuse a home volume made without the log directories`: the entrypoint's check and its tests
- [x] `feature-0035 Make the log directories in the image`: the Dockerfile and its test
- [x] `feature-0035 Describe the harness logs`: the README
- [ ] `feature-0035 Record the proof on a real Docker`: the record
