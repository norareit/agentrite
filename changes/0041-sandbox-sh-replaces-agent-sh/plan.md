# 0041 `sandbox.sh` replaces `agent.sh`

## Approach

The unit is a rename with one new refusal, and it is built in three steps that are each reviewable alone:

1. **The rename of the code**, in one commit: the kit's script, the two compose files, the templates, `init` and
   `refresh`, this repository's own three files, and every test, with the tests' expectations changed first. Nothing
   is added that looks for an old name. `git diff -M` shows the moved files as moves
2. **The old names**, in one commit: the refusal of requirement 6, and the tests that hold an old name because an old
   name is what they look for
3. **The four documents**, in one commit

The suite is green after each. The rename cannot be cut smaller and stay coherent: the shim that `init` writes runs
`container/sandbox.sh`, that script reads `sandbox/compose.project.yml` and runs the service `sandbox`, and
`sandbox-dev.sh` runs the same script against this repository's own compose file.

What is renamed and what is not follows requirements 1 and 3. Where a line holds the word `agent`, the question is
whether it names the sandbox or the agent:

* The sandbox, so renamed: the paths, the service, `<name>-agent`, the five variables, the messages' opening
  `agent.sh:`, the marker `agent.sh/no-version-from-the-project`, `agentName`, the placeholder `{{agent_name}}`, the
  three test files, the temporary directories the tests make (`agent-wrapper-`, `agent-unit-run-`, `agent-dev-`), the
  fake Compose project `project-agent`, and "the agent service" in the comments of two tests
* The agent, so kept: the account and group `agent`, `/home/agent`, the volume `agent-home`, `AGENT_UID`,
  `AGENT_GID`, `--user agent`, `USER=agent`, `agent_uid` and `agent_gid` in `container/entrypoint.sh`, "the agent
  sandbox", and in the tests whatever plays the agent: `agentScript`, its file `agent-script`, and the function
  `agent` of the unit run test

**The refusal.** Compose is what knows which services the two files configure, and the script already asks it: the
function `read_merged_configuration` of the kit's script reads `docker compose config --format json` on every path
that goes on to Docker, the run and `--connect` alike, and before a build, a clone or a container. The refusal is
put there: when the merged configuration holds a service `agent`, the script prints the message and exits 2. The
kit's file configures none, so one that is there is the project's. Three things the implementer must hold to:

* The check is made before anything else of the merged configuration is used. With the project's service unrenamed,
  `services.sandbox.image` is missing, as the planner saw on the host with Compose v2.39.2: the merge has the two
  services `agent` and `sandbox`, exits 0, and `sandbox` has no image
* What `node` prints for the check is a line that is never empty and is not the last to be empty. `read` fails on a
  line that is not there, command substitution drops empty lines at the end, and the script runs under `set -e`
* The message opens with `sandbox.sh:`, names the file by `$project_compose` as the refusal for a missing file does,
  and says both that the service is named `sandbox` and that `agent:` under `services:` of that file is to be
  renamed to `sandbox:`. With both said, `AGENTS.md` keeps it out of `SANDBOX.md`

A unit given by its number that has no branch yet gets its branch before the configuration is read, so a refused
start may have cut a branch. That is the order of every refusal that follows the reading, and no build, clone or
container precedes it.

**Testing the refusal and the steps without Docker.** The fake `docker` of `tests/wrapper-fixture.mjs` answers
`config --format json` with a fixed object. It is made to read the two things the tests of requirements 6 and 7
turn on from the project's compose file, which is the file of the last `-f` of the call:

* a line `  agent:` makes the answer hold a service `agent` with the image, beside a `sandbox` without one, as
  Compose merges it
* a line `name: <literal>` at the left margin gives the answer's `name` and the image, and without one they are
  `project-sandbox` and `image` as now

The tests that exist write an empty compose file, so they are answered as before. A test of requirement 7 then does
nothing but what the four steps say, and never tells the fake what to answer.

**The project of the release before.** The test of requirement 7 holds, as two strings, the `agent.sh` and the
`agent/compose.project.yml` that `init` of release 4.2.0 writes for a package named `my-app` with no Playwright, and
writes them to a temporary project. They are taken from `git show c818fa2:templates/project/agent.sh` and from the
template `c818fa2:templates/project/agent/compose.project.yml`, filled with `my-app-agent` and with the line of the
Playwright placeholder dropped. No tracked file or directory is named after an old name for it.

**Line lengths.** `sandbox` is two characters longer than `agent`. The planner replaced the names in a copy of the
tree: the lines that pass 120 characters are `README.md` 97 and 330, `CONTRIBUTING.md` 70 and 146, and one line of
`tests/wrapper-fixture.mjs`. Paragraphs are wrapped again where a line passes the limit, and a table whose cell
grows has its column widened in every row, and its text shortened where the row would pass 120.

## Files

Moved, and changed inside:

- `container/agent.sh` to `container/sandbox.sh`: the usage, every `agent.sh:` and `agent.sh ` of a message, the
  marker, `agent/compose.project.yml`, `services.agent.build.args` in a message, `agent.services` read by `node`,
  the two `AGENT_..._VERSION` variables, the service given to `docker compose run`, the name of the unit run test in
  a comment. In the second commit, the refusal
- `templates/project/agent.sh` to `templates/project/sandbox.sh`: the path it runs, and its comment
- `templates/project/agent/compose.project.yml` to `templates/project/sandbox/compose.project.yml`: the service, the
  placeholder `{{sandbox_name}}`, the two limits' variables, `container/sandbox.sh` in its comment
- `agent.sh` to `sandbox.sh`: byte for byte `templates/project/sandbox.sh`
- `agent/compose.project.yml` to `sandbox/compose.project.yml`: the service, `SANDBOX_PROJECT_NAME`, the default
  `ritenoar-agentrite-sandbox`, the two limits' variables, and its comment
- `agent-dev.sh` to `sandbox-dev.sh`: `SANDBOX_PROJECT_NAME=ritenoar-agentrite-sandbox-dev`, the script it runs, and
  its comment
- `tests/agent-wrapper.test.mjs` to `tests/sandbox-wrapper.test.mjs`
- `tests/agent-unit-run.test.mjs` to `tests/sandbox-unit-run.test.mjs`
- `tests/agent-dev.test.mjs` to `tests/sandbox-dev.test.mjs`

Changed in place:

- `container/compose.yml`: the service, the two `SANDBOX_..._VERSION` variables, the three messages "run the
  sandbox through the project's sandbox.sh", and the comments that name the script, the project's file and
  `agent.sh --mount`. `agent-home`, `/home/agent`, `AGENT_UID` and `AGENT_GID` stay
- `container/unit-clone.sh`: `agent.sh:` in every message, and the script's name in the first comment. The remote
  `sandbox/<branch>` stays
- `container/Dockerfile`: the script's name in four comments and in the message "Do not run sandbox.sh with sudo"
- `container/entrypoint.sh`: `sandbox/compose.project.yml` in the recovery text, and the script's name in a comment
- `scripts/agentrite.mjs`: `COMPOSE_FILE`, the two places that name the shim's template and path, `agentName` to
  `sandboxName` with the suffix `-sandbox`, and the placeholder's key
- `tests/wrapper-fixture.mjs`: the two variables the fake reads, the fake Compose project and service, the comment,
  and in the second commit what the fake reads from the project's file
- `tests/agentrite-init.test.mjs`, `tests/agentrite-refresh.test.mjs`: every path, name and variable, the test
  titles, and in the second commit the tests of a project that holds the old files
- `tests/harness-versions.test.mjs`, `tests/compose-allowlist.test.mjs`, `tests/compose-tmpfs.test.mjs`,
  `tests/dockerfile-log-directories.test.mjs`: the variables, the message, "the sandbox service", and whatever each
  reads by the old path
- `README.md`, `SANDBOX.md`, `CONTRIBUTING.md`, `RELEASING.md`

New:

- `tests/sandbox-update.test.mjs`: the steps of requirement 7

Not changed: `CHANGELOG.md`, the other units under `changes/`, `process.md`, `roles/`, `templates/project/AGENTS.md`,
`templates/project/CLAUDE.md`, `package.json`, `.dockerignore`, `.gitignore`. None of them holds an old name.
`tests/agentrite-run.test.mjs` holds `history-0036-install-the-agent-kit`, which is a directory of `changes/` and no
name of requirement 1, and stays.

## Tasks

The rename of the code:

- [x] Move the three test files with `git mv`, and in them and in `tests/wrapper-fixture.mjs`,
  `tests/harness-versions.test.mjs`, `tests/compose-allowlist.test.mjs`, `tests/compose-tmpfs.test.mjs` and
  `tests/dockerfile-log-directories.test.mjs` change every expectation to the names of requirement 1: the paths the
  tests read and write, `sandbox.sh:` and `sandbox.sh ` in the messages they match, the service `sandbox` at the end
  of a recorded `run`, `-f <root>/sandbox/compose.project.yml`, the `SANDBOX_..._VERSION` variables recorded and
  read, `SANDBOX_PROJECT_NAME`, `ritenoar-agentrite-sandbox` and `-sandbox-dev`, `project-sandbox`, the temporary
  directories' prefixes, the titles and the comments. Keep what plays the agent and what names the account. The
  suite fails now (R1, R2, R3, R9, R11)
- [x] In `tests/agentrite-init.test.mjs` and `tests/agentrite-refresh.test.mjs`, change every expectation to
  `sandbox.sh`, `sandbox/compose.project.yml`, `sandboxName`, `<name>-sandbox`, `SANDBOX_MEM_LIMIT` and
  `SANDBOX_CPUS`, the titles and comments among them, and the fake kit script of the test of the written shim to
  `container/sandbox.sh` (R4, R5, R9, R11)
- [x] Move `container/agent.sh` to `container/sandbox.sh` and change it, `container/compose.yml`,
  `container/unit-clone.sh`, `container/Dockerfile` and `container/entrypoint.sh` as "Files" says. Every message is
  the one it was but for the names, and no exit status changes (R1, R2, R3, R9)
- [x] Move the two templates, and change them and `scripts/agentrite.mjs` as "Files" says, the JSDoc of the renamed
  function among it (R1, R4, R5, R9)
- [x] Move `agent.sh` to `sandbox.sh`, `agent/` to `sandbox/` and `agent-dev.sh` to `sandbox-dev.sh`, and change
  them as "Files" says. `sandbox.sh` keeps its executable bit, and so does `sandbox-dev.sh` (R1, R2, R8, R9)
- [x] Run `npm test`, which passes with the 411 tests it had, and commit

The old names:

- [x] In `tests/wrapper-fixture.mjs`, make the fake `docker` answer `config --format json` from the project's
  compose file as "Approach" says, and describe it in the comment of `fakeHost`. `npm test` passes unchanged (R11)
- [x] In `tests/sandbox-wrapper.test.mjs`, add the failing tests of the refusal, for a project whose
  `sandbox/compose.project.yml` holds `services:` with `  agent:` under it: with `--in-place` and with `--rebuild
  --in-place`, on a host where the image is missing, the status is 2, the error opens with `sandbox.sh:`, holds the
  path of the file, that the service is named `sandbox` and that `agent:` under `services:` is to be renamed, the
  fake `docker` recorded no call, `npm` was asked nothing, and no log directory was made (R6, R11)
- [x] In `tests/sandbox-unit-run.test.mjs`, add the failing tests of the refusal for a unit run and for `--connect`:
  status 2, the same message, no recorded call, and no clone in the state directory (R6, R11)
- [x] In `container/sandbox.sh`, add the refusal to `read_merged_configuration` as "Approach" says, and say in the
  comment above the function why a service `agent` is looked for. The tests of the two tasks before pass (R6, R9)
- [x] Add `tests/sandbox-update.test.mjs`. It makes a git repository that holds `package.json` named `my-app`, the
  two files of the release before as "Approach" gives them, and the working copy's `container/sandbox.sh` and
  `container/unit-clone.sh` under `node_modules/@ritenoar/agentrite/container`, on the host of `fakeHost`. It then
  asserts, in this order (R7, R11):
    - after `refresh claude` of `scripts/agentrite.mjs`: `sandbox.sh` is the shim and is executable, `agent.sh` and
      `agent/compose.project.yml` are byte for byte what they were, and the output names neither
    - after removing `agent.sh`: `./sandbox.sh --in-place true` exits 2 and names the missing
      `sandbox/compose.project.yml`
    - after renaming `agent` to `sandbox`: the same command exits 2 with the refusal of requirement 6, and no call
      was recorded
    - after renaming `  agent:` to `  sandbox:` in the file: the same command exits 0, and the recorded `run` holds
      `-f <root>/sandbox/compose.project.yml` and ends in `sandbox true`
    - a unit run of a branch of that repository then names its container `my-app-agent-<branch>` and makes its
      clone under `agentrite/my-app-agent/` of the state directory, and the file still reads
      `${AGENT_MEM_LIMIT:-8g}` and `${AGENT_CPUS:-6}`
- [x] In `tests/agentrite-init.test.mjs`, add an end to end test of `init claude` in a project that holds an
  `agent.sh` and an `agent/compose.project.yml` of its own: it writes `sandbox.sh` and `sandbox/compose.project.yml`
  and prints `wrote` for each, the compose file configures the service `sandbox`, names `my-app-sandbox` twice and
  reads `SANDBOX_MEM_LIMIT` and `SANDBOX_CPUS`, the two old files keep their content and mode, and no line of the
  output holds `agent.sh` or `agent/`. Add the same for `init --no-sandbox claude`, which writes neither new file.
  The tests of a project without the old files are the ones the rename changed (R4, R11)
- [x] In `tests/agentrite-refresh.test.mjs`, add an end to end test of `refresh claude` in a project that holds an
  `agent.sh` and no `sandbox.sh`: it writes `sandbox.sh` and prints `wrote sandbox.sh`, `agent.sh` keeps its content
  and mode, and no line of the output holds `agent.sh`. Add one where `agent.sh` is a directory and one where it is
  a dangling symbolic link, which `refresh` leaves and exits 0 for, and one of `refresh --no-sandbox claude`, which
  writes no `sandbox.sh` and prints nothing for either path. The tests of a project without `agent.sh` are the ones
  the rename changed (R5, R11)
- [x] Run `npm test` and commit

The documents:

- [x] `README.md`: the heading `### sandbox.sh` and its four forms, the table of environment variables with
  `SANDBOX_MEM_LIMIT` and `SANDBOX_CPUS`, the two rows of "What is here", and every other mention of the shim, the
  compose file, `services.sandbox.build.args` and the kit's script, with every form, option and variable that is
  there now. Lines 97 and 330 are brought under the limit (R10)
- [x] `SANDBOX.md`: every command and path, and the service in the two YAML examples, under "Reaching more hosts"
  and "Holding a harness version". `/home/agent` and `<project>_agent-home` stay. It gets no entry for the refusal
  (R10)
- [x] `CONTRIBUTING.md`: the three rows of "What the repository holds besides the package", the heading
  `### sandbox-dev.sh` and its forms, `SANDBOX_PROJECT_NAME`, `ritenoar-agentrite-sandbox` and
  `ritenoar-agentrite-sandbox-dev` in the names of the project, the image, the home volume, the network and the
  state directory, and every other mention. Lines 70 and 146 are brought under the limit (R10)
- [x] `RELEASING.md`: `./sandbox.sh` in step 6, in its five commands, in what is said of each and in what the step
  reports (R10)
- [x] Read the four once more against `git diff master`: every form, option, variable and table row that was there
  is there, no line passes 120 characters, and none says what a name was or how a project moves (R10)
- [x] Run `npm test` and commit

## Verification

- [ ] `npm test` passes
- [ ] `npm run check-changes` passes, run after the last commit
- [ ] `cmp sandbox.sh templates/project/sandbox.sh` prints nothing, and `test -x sandbox.sh -a -x sandbox-dev.sh`
  holds (R8)
- [ ] `git ls-files -- . ':!changes' | grep -E '(^|/)agent([-./]|$)'` prints nothing (R8, R9)
- [ ] This prints lines of two kinds only: those of the refusal in `container/sandbox.sh` and of the tests of
  requirements 4 to 7, and `history-0036-install-the-agent-kit` in `tests/agentrite-run.test.mjs` (R9):

  ```sh
  git grep -n -E -e 'agent\.sh|agent-dev|agent/compose|agent_name|agentName|agent-wrapper|agent-unit-run' \
    -e '[a-z>}]-agent\b' \
    -e 'AGENT_(MEM_LIMIT|CPUS|CLAUDE_CODE_VERSION|OPENCODE_VERSION|PROJECT_NAME)' \
    -e 'services\.agent|^ *agent:|agent service' -- . ':!changes' ':!CHANGELOG.md' ':!package-lock.json'
  ```

- [ ] `git grep -n -w agent -- container templates sandbox sandbox.sh sandbox-dev.sh README.md SANDBOX.md
  CONTRIBUTING.md RELEASING.md` is read line by line: each line names the agent, its account or its home, or is of
  the refusal (R3, R9, R10)
- [ ] `git diff master --stat -- CHANGELOG.md` is empty, and so is `git diff master --stat -- changes` but for this
  unit
- [ ] With Docker on the host, `./sandbox-dev.sh --in-place true` exits 0, and `docker image ls` holds
  `ritenoar-agentrite-sandbox-dev`. `./sandbox.sh` is not run: it fails here until the release, as the spec decides.
  Where the session has no Docker, log that it was not run (R2, R8)
- [ ] With Docker on the host, in a copy of `sandbox/compose.project.yml` whose service is named `agent`, given to
  `./sandbox-dev.sh --in-place true` in a scratch checkout, the refusal is what is printed and nothing is built.
  Where the session has no Docker, log that it was not run (R6)

## Commit Points

- [x] `feature-0041 Plan the renaming of what names the sandbox agent`: `plan.md` and `record.md`
- [ ] `feature-0041 Rename what names the sandbox agent`: the first six tasks
- [ ] `feature-0041 Refuse a service named agent, and test what is left of the old names`: the next eight
- [ ] `feature-0041 Describe sandbox.sh in the documents`: the last six
- [ ] `feature-0041 Log the work and what was run`: `record.md`, and the ticks of this plan
