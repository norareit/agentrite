# Changelog

What each release of AgentRite changed, newest first, and what is worth knowing before a project updates to it.
The numbers in parentheses are change units. Each is a directory under `changes/` in the kit's own repository, which
holds the reasoning and is not in the package. The changelog begins at 2.3.0, and first shipped in the release after
it.

## 4.1.0

### What changed

* The harnesses' logs are on the host and no longer in the home volume. In every run of the sandbox, a unit run,
  `--in-place` and `--workdir` alike, the wrapper mounts two directories of the host in the agent's home:
  `/home/agent/.claude/projects`, which holds Claude Code's sessions, and `/home/agent/.local/share/opencode`,
  which holds OpenCode's database and its login. On the host they are in the project's log directory,
  `<data>/agentrite/<name>/`, as `.claude/projects` and `.local/share/opencode`. `<data>` is `$XDG_DATA_HOME` when
  that is set and `~/.local/share` when it is not, and `<name>` is the name of the project root's directory, so a
  project at `~/projects/norareit` has `~/.local/share/agentrite/norareit/`. The wrapper makes the directories, as
  the developer, before the container starts, and what a harness writes there is the developer's. A tool on the
  host that reads the harnesses' logs is given that one path and reads the sandboxed sessions as plain files,
  without Docker. There is no option for another place, and none that turns the mounts off (0035)
* The image holds `.claude/projects` and `.local/share/opencode` in the agent's home, with every directory above
  them, as the agent's, so that a home volume filled from it has both mount points (0035)
* The entrypoint refuses to start, before the command runs, when `.claude`, `.local` or `.local/share` in the home
  is not the agent's. The refusal names the directory and gives the command that removes the home volume, as the
  refusal of a home with another owner does (0035)
* The README has a new section, "The harness logs", and says in "The home volume", "Logging in to a model
  provider" and the list of what a unit run does not defend against where each login is now (0035)
* The README's table of what the repository holds lists its rows in another order
* Not in the package: nothing

### Worth knowing when you update

* Build the image again after the install, with `./agent.sh --in-place --rebuild true`. Nothing else does it: the
  wrapper builds only when there is no image or a harness version is due. The wrapper of this release mounts the
  two directories from its first run, and an image that an earlier release built holds neither the mount points
  nor the new refusal, so a new home volume made from it gets `.claude` and `.local` as root's and nothing says
  so. A start of this release on an image of an earlier one was not tried. The update asks for no `refresh` (0035)
* The sandbox writes one more directory of the host in every run: the project's log directory. What is in it was
  written by an agent that may have been misled, which can put anything there, a false record of usage and a link
  to a file elsewhere among it. Whatever reads the directory treats what it finds as data. A container reaches
  its own project's log directory and no other, no directory above it, and none of the host's own `~/.claude` or
  OpenCode directories (0035)
* OpenCode's login is now a file of the host, `<logs>/.local/share/opencode/auth.json`, and is no longer in the
  home volume. OpenCode asks for its login once more in each project, and after that a new home volume of the
  project needs none. Claude Code's login and settings stay in the home volume (0035)
* The sessions a home volume holds are no longer listed or continued, because the harnesses now look in the log
  directory. Nothing is deleted, and the kit moves nothing. "The harness logs" in the README gives a command that
  copies a volume's logs, OpenCode's login among them, to the log directory by hand. Run it before the first start
  with this release, while no sandbox of the project runs: it copies nothing of OpenCode once the log directory
  holds a database, and it overwrites nothing. The command was tried with Claude Code's real sessions and with a
  made-up OpenCode database, on Linux. It was not tried with a real OpenCode database, or on macOS (0035)
* A home volume in which a harness was never started may be refused at the first start. Such a volume lacks
  `.claude` or `.local/share`, Docker makes them as root when it mounts the logs, and the entrypoint stops with
  `FATAL: /home/agent/.claude is owned by uid 0`. The way on is the one the refusal gives,
  `docker volume rm <project>_agent-home`, which discards the logins saved in the volume. The next start makes a
  new volume from the image, which is one more reason for the rebuild above. The kit does not repair such a
  volume, and the copy command still reads one that is refused (0035)
* Two projects whose root directories have one name share a log directory, wherever on the host they are. Either
  harness may then list or continue the other project's sessions, a reader cannot tell them apart, and the two
  share one OpenCode login. Renaming one of the roots ends it. Two sandboxes run from one project root under two
  Compose project names share it in the same way (0035)
* Nothing removes a log directory. It stays when the home volume is removed and when the project is gone (0035)
* What was tried, and what was not. On Linux, with Docker Engine 28.4.0, Claude Code 2.1.292 and OpenCode 1.18.35,
  through the wrapper: both harnesses logged in and holding a session, a second container continuing Claude
  Code's and listing OpenCode's, and two containers writing at the same time, on a home volume this release made
  and on one of 4.0.0 in which both harnesses had been started, and the refusal of one in which neither had. On
  macOS 15.1.1, with Docker Desktop 4.26.0 and VirtioFS as its file sharing, the same was tried with the image of
  4.0.0, the two mounts given by hand and a home volume prepared for it, and not with this release's wrapper and
  image. Not tried: gRPC FUSE and osxfs, the other file sharing of Docker Desktop for macOS (0035)

## 4.0.0

### What changed

* There are four roles where there were three. A new role, the specifier, writes what a unit must make true: the
  spec of a feature or a bug, or the record of a task. Its file, `roles/specifier.md`, holds what the planner's
  held on choosing the kind, writing a task record and writing the spec. The planner keeps its name and writes
  the plan only, for a unit the human approved, against the tree as it is on the unit's branch. It never changes
  the spec: where the spec is unclear or no longer fits the tree, it stops and the unit goes back to the specifier
  and to the human (0033)
* A status `planned` stands between `approved` and `in-progress`. `approved` says that the human approved what
  the specifier wrote, and `planned` that the planner is done: the plan is written, or the planner logged that a
  bug needs none. Nobody approves the plan. A task has no plan, is never `planned`, and goes from `approved` to
  `in-progress`. The implementer builds a planned unit, and stops at a feature or a bug that is `approved` and
  not yet `planned` (0033)
* `process.md` says when each document is written and where it is committed. A spec is written when the human
  wants the unit described, and any number of units may wait as `draft` or `approved`. A plan is written when
  the unit is next to be built and not before. What the specifier writes, and the approval, are committed on
  `master`, in commits that hold nothing but that unit's own documents. Everything after the approval is done on
  the unit's branch, which is cut from the head of `master` when the planner starts, or the implementer for a
  task, and is named `feature-`, `bugfix-` or `task-` and the unit's directory name (0033)
* `./agent.sh <number>` cuts that branch. Given a number that no local branch holds, the wrapper looks at
  `changes/` as `master` holds it, cuts a local branch for the one unit there whose directory opens with the
  number and a dash, says on standard error what it cut and at which commit, and goes on as for a unit whose
  branch was there. Nothing is checked out and no branch that exists is moved. The README's "Working on a clone"
  says what it refuses (0033)
* `agentrite roles` lists the roles the kit has, each with the description its wrappers hold, and
  `agentrite roles --json` prints the same for a script, as an object with one key, `roles` (0032)
* `agentrite run <role> <harness> <unit>` starts Claude Code or OpenCode as a role, for one unit of `changes/`
  given by its name or its four digits, from the project root. `--prompt <text>` adds text to the prompt,
  `--model <id>` passes the harness's own id of a model on, `--headless` runs the harness without a session, for
  a script, and `--skip-permissions` gives Claude Code `--dangerously-skip-permissions` and OpenCode `--auto`.
  What follows a `--` is given to the harness as written, before the prompt, which is how a session is resumed.
  The command exits with the harness's status. It starts no sandbox: it runs the harness where it is run, on the
  host or inside the sandbox. The README has a new section, "Running a role" (0032)
* The OpenCode wrappers are written with `mode: all` where they held `mode: subagent`, so that a role is both a
  primary agent, which is what OpenCode takes on its command line, and a subagent (0032)
* The wrappers of the planner and the implementer hold new descriptions, for what the two roles do now, and the
  template of a project's `AGENTS.md` and the two change templates name the specifier and `planned` (0033)
* The package holds 27 files, two more than 3.0.0: `roles/specifier.md` (0033) and `scripts/agentrite-run.mjs`
  (0032)
* Not in the package: the step of `RELEASING.md` by which a release moves the kit repository's own dependency to
  itself, and that repository's dependency on release 3.0.0 (0031)

### Worth knowing when you update

* Run `npx agentrite refresh claude opencode` after the install. It writes the specifier's wrapper for each
  harness, and refreshes the planner's and the implementer's for both and the reviewer's for OpenCode. A pinned
  model is kept, and a key a project added to a wrapper by hand is removed, as before. This was tested with
  wrappers the kit's suite builds as 3.0.0 wrote them, not in a project that holds them (0032, 0033)
* The planner no longer writes a spec. Whoever dispatched the planner with a request now dispatches the
  specifier, and the planner, given a unit that is not `approved`, has nothing to plan from (0033)
* A unit that is under way needs a look. A feature or a bug that is `approved`, with a plan the human approved
  with it, is refused by the implementer as not planned: set its status to `planned` in its `record.md`, with a
  log entry that says so. A unit that is `in-progress` goes on as it was, and a unit that is `implemented` is not
  touched. A draft that waits on a branch of its own stays where it is: nothing moves it to `master` (0033)
* No human reads a plan before the work begins. Every plan the kit's own repository had so far was read and
  corrected by its human first, so that an agent writes a usable plan from a spec alone was not established. What
  the approval is meant to approve has to be in the spec (0033)
* The specifier commits on `master`, which the process forbade before for every commit. A project whose `master`
  takes no direct commit cannot follow that as written. Nothing checks that such a commit holds only the unit's
  own documents: the change check compares a branch with `master`, and does not see `master` itself (0033)
* `./agent.sh <number>` now makes a local branch where it refused before, when `master` holds a unit of that
  number and no branch does. It is cut from the local `master`, so a `master` that is behind its remote gives a
  branch that is behind too. A run that cut the branch and committed nothing leaves it where it was cut, and a
  later run plans on that older tree without saying so: remove such a branch by hand, with `git branch -d`. A unit
  given by a branch's name that does not exist is refused as before. The cutting was tested against a real git
  repository and a fake Docker, on Linux. A first unit run of a real unit, on a real Docker, was not made (0033)
* The image is as it was: no file that goes into it changed, so the update asks for no rebuild (0032, 0033)
* A project's own `AGENTS.md` is not touched, and still names three roles and links three files. The specifier
  reaches the project through `process.md` and through its wrapper. Add the fourth link by hand where the file
  should name it (0033)
* In OpenCode the roles are now also offered among the primary agents of its own interface. They were seen as
  subagents and as agents of the command line with OpenCode 1.18.34, and what the interface lists was not looked
  at (0032)
* `agentrite run` starts nothing when the role's wrapper is missing or is not what `refresh` would leave, a
  pinned model aside, and names the file and the `refresh` that repairs it. So `refresh` comes before the first
  `run`, as the first line above has it (0032)
* `agentrite run` passes no signal on. A signal sent to the command alone, as `kill <pid>` does, ends the command
  and leaves the harness running. A caller that stops a run signals the command's process group. That was tried
  with a stand-in for the harness, not with a real one (0032)
* What was tried of `agentrite run`, and what was not. Both harnesses were run as a role, headless and in a
  session, with a pinned model, with `--model` over the pin, and with a session resumed after a `--`, with Claude
  Code 2.1.289 and OpenCode 1.18.34, on the host, on Linux, the sessions on a terminal a script drove. Not tried:
  any run inside the sandbox, `--skip-permissions` on a real harness, the specifier and the planner as the role,
  and macOS. In a directory Claude Code was never trusted in, a session opens on its question about trust and
  ends with status 1 when that is declined. Whether it asks in the new clone of a unit run was not tried. A
  session of OpenCode that is resumed opens on what was said before and does not send the new prompt (0032)

## 3.0.0

### What changed

* A run of the sandbox says what it mounts at `/work`, and there is no default. `./agent.sh <unit>` mounts a clone
  of the unit's branch, `./agent.sh --in-place` mounts the project as it is on the host, which is what every run
  did before, and `./agent.sh --workdir DIR` mounts `DIR` as before. A command that says none of the three starts
  nothing and names the forms (0029)
* A unit run, `./agent.sh 0029 claude`, is the way to implement and to review a unit. The unit is a local branch,
  by its name or by the number its name holds. The wrapper clones the repository under
  `~/.local/state/agentrite/<Compose project>/<branch>`, mounts the clone and the host's `.reviews`, and names the
  container after the branch, so that two units run side by side and two runs never work on one branch. When the
  container exits it fetches the branch back as `sandbox/<branch>`, fast-forwards the host's branch when it can,
  and removes the clone unless it holds work the host lacks. A new file of the kit's, `container/unit-clone.sh`,
  holds the git work, and the README's "Working on a clone" says what the clone protects and what it does not
  (0029)
* The kit names no version of Claude Code or OpenCode any more. For each harness on its own, the image holds the
  version the project's `agent/compose.project.yml` gives as `CLAUDE_CODE_VERSION` or `OPENCODE_VERSION` under
  `services.agent.build.args`, or else the version installed on the host, or else the latest published at the time
  the image is built, which the wrapper names in a line. Release 2.3.0 gave 2.1.266 and 1.18.30 to every sandbox
  (0027, 0030)
* The wrapper compares, at each start, the versions it wants with those the image was built with, which the image
  holds as two labels, and builds the image again by itself when they differ, saying which harness and why. No
  flag is needed after a harness is updated on the host (0027)
* The README has new sections on running the sandbox: "Starting it", "Working on a clone", "Another working
  directory", "Extra directories", "The harness versions" and "The local model server" (0026, 0027, 0029, 0030)
* `CHANGELOG.md`, this file, is in the package, at `node_modules/@ritenoar/agentrite/CHANGELOG.md` after the
  install, and the README's part on updating the kit points at it (0025)
* The package holds 25 files, two more than 2.3.0: `CHANGELOG.md` (0025) and `container/unit-clone.sh` (0029)
* Not in the package: `RELEASING.md` and the `/release` skill, by which a release of the kit is made, and the
  refusal of `deploy.sh` to release a version that has no section here (0025, 0028), and the kit repository's own
  dependency on release 2.3.0 (0024)

### Worth knowing when you update

* `./agent.sh` with no argument, and `./agent.sh <command>` such as `./agent.sh claude`, `./agent.sh npm test` and
  `./agent.sh -- npm ci`, no longer start a sandbox. The first word that is not an option is now taken as a unit,
  so a command is refused with `'<command>' names no local branch, by its name or as a unit's number`. Add
  `--in-place` for what these did before: `./agent.sh --in-place claude`. A script, an alias or a line of the
  project's own documents that runs the sandbox needs that edit. `./agent.sh --workdir DIR` and `--mount` work as
  they did, and `--rebuild` needs one of the three forms beside it (0029)
* No file of the project's needs an edit, and `refresh` writes what it wrote in 2.3.0 (0027, 0029, 0030)
* The first start after the update builds the image again, by itself, because the image of 2.3.0 records no
  harness versions. That start needs the network, and when the build fails the sandbox does not start, although
  an image exists (0027, 0030)
* The harnesses in the sandbox are no longer 2.1.266 and 1.18.30. On a host that has a harness, the sandbox gets
  the host's version, and follows it at the first start after each update on the host. The host's version is what
  `claude --version` and `opencode --version` print for the command on the `PATH` of whoever runs `./agent.sh`: a
  harness reached only through a shell alias counts as not installed. Two developers on one project so run what
  their own hosts have, until the project holds a version in its `agent/compose.project.yml` (0027)
* On a host without a harness, that harness in the sandbox is the latest published version of the day the image
  is built, and stays until the image is built again: `./agent.sh --in-place --rebuild` brings a newer one. Such a
  build runs `npm view <package> version` on the host, so it needs `npm` on the `PATH` and the registry in reach.
  With neither, the start stops with two lines that say how to get past it, and does not fall back to the image
  that exists. No time limit is set on that question: on a network that swallows the connection the start hangs
  until it is interrupted, which was not tried (0030)
* The kit checks no version of either harness. That both harnesses start with the kit's allowlist alone, that
  OpenCode's login method for a ChatGPT account has the name the README gives, that the status line shows and
  that self-update is switched off were checked for the versions 2.3.0 pinned, and are promised for no version
  now. The confinement depends on no harness's version. When a version breaks one of these, add the refused host
  to the project's `ALLOWLIST` or hold a version that works in `agent/compose.project.yml`; the README's "The
  harness versions" says what a developer sees then (0027, 0030)
* The wrapper now runs `node` on the host at every start, to read the configuration Compose merges, and `git` on
  the host for a unit run (0027, 0029)
* Each rebuild leaves the image it replaced behind, untagged, at about 0.6 GB. `docker image prune` removes them
  (0027)
* A clone holds what is committed and nothing else: no uncommitted work, no ignored file such as a `.env`, and no
  `node_modules`. The first command in a new clone is `npm ci`, which needs the registry on the project's
  `ALLOWLIST`, and a project whose suite reads an ignored file does not find it in a unit run (0029)
* A unit run writes outside the sandbox, which no run did before: the clone under `~/.local/state/agentrite`, or
  under `$XDG_STATE_HOME`; a `.reviews` directory in the project root, made when it is not there; and the host's
  repository, where the unit's branch is fast-forwarded, whether or not it is checked out, or the commits are
  left at `sandbox/<branch>`. The files of a checked-out branch change with it (0029)
* The image, the allowlist, the limits and the harness versions of a unit run are those of the checkout the
  command is run from, not those of the unit's branch. A unit that changes `agent/compose.project.yml` runs
  without its own change until its branch is checked out on the host (0029)
* A unit run does not defend the host against what a commit contains once it is checked out and run, against
  what a review file says, or against a flaw in git's handling of a fetch from a hostile repository. A run with
  `--in-place` or `--workdir` is as exposed as every run was before (0029)
* Not tested, for any of this: Docker Desktop for macOS, and the bash 3.2 that macOS ships, on which the wrapper's
  additions were not run. The wrapper was tried on Linux with bash 5.2 and Docker Engine only. Not tried either: a
  unit run at an interactive terminal and an interrupt typed into one; a stopped container left under a unit's
  name by a crash; two starts for one branch in the same moment; a project with Playwright under the new wrapper;
  and a project's file that gives an empty value for a harness version (0027, 0029, 0030)
* The README says that on a Linux host whose firewall denies incoming traffic, `ufw` for example, the Docker
  bridge subnets have to be allowed to the local model server's port. That the container cannot reach the model
  on such a host was seen; that `ufw` is the cause, and that the rule repairs it, was not established (0026)

## 2.3.0

### What changed

* The sandbox admits four more hosts itself, through the kit's own allowlist, with no change to a file of the
  project's: `platform.claude.com`, without which Claude Code does not start in a sandbox that holds no saved login,
  and `models.opencode.ai`, from which OpenCode fetches its model catalog (0015); `auth.openai.com` and
  `chatgpt.com`, which OpenCode needs to log in with a ChatGPT account and to send its prompts (0023)
* A developer's own Claude Code status line is shown in the sandbox. When `~/.claude/statusline-command.sh` is a
  file on the host, the wrapper mounts it read-only, together with a new file of the kit's,
  `container/claude-managed-settings.json`, whose one setting runs it. With no such file on the host, nothing is
  mounted (0022)
* The README has a new section, "Logging in to a model provider": a login that sends the browser back to
  `localhost` cannot complete in the sandbox, and OpenCode's login with a ChatGPT account is
  `opencode auth login -p openai -m "ChatGPT Pro/Plus (headless)"` (0023)
* A spec has a new section, "Beyond the request", for what the planner would add and the request does not need. It
  is in `process.md`, `roles/planner.md` and the spec template (0019)
* The comment above `ALLOWLIST` in the compose file `init` writes for a project names the four new hosts among the
  kit's own (0015, 0023)
* The package holds 23 files, one more than 2.2.1: `container/claude-managed-settings.json` (0022)
* Not in the package: `./agent-dev.sh`, which runs the sandbox from the kit's working copy and which the README
  describes (0021), and the kit repository's own sandbox files and its dependency on a released kit (0016, 0018)

### Worth knowing when you update

* The update needs nothing but the install. No command or option changed, `refresh` writes what it wrote in 2.2.1,
  and the image needs no rebuild: the changes take effect when the sandbox next starts
* Every sandbox now admits `auth.openai.com` and `chatgpt.com`, whether or not the project uses OpenAI. `chatgpt.com`
  serves the whole of ChatGPT, not only what OpenCode uses, and data can leave a sandbox through any host it admits
  (0023)
* The sandbox checks at start-up that every host it admits can be reached, the kit's own among them, and refuses to
  start when one cannot. On a network that blocks one of the four new hosts, a sandbox that started under 2.2.1
  therefore stops with `allowlisted host <host> is not reachable`. This was read from the entrypoint and not tried
  on such a network (0015, 0023)
* For a developer who has `~/.claude/statusline-command.sh` on the host, that script now runs inside the sandbox,
  where it finds only the tools of the image, `jq` and `git` among them. While the host file exists it replaces a
  status line set inside the sandbox (0022)
* A project's own `agent/compose.project.yml` is never rewritten, so the comment above its `ALLOWLIST` still lists
  the kit's hosts as they were when `init` wrote it (0015, 0023)
* A spec written before this release has no "Beyond the request" section and needs none. The change check does not
  look for it (0019)
