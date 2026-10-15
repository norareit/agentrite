# Changelog

What each release of AgentRite changed, newest first, and what is worth knowing before a project updates to it.
The numbers in parentheses are change units. Each is a directory under `changes/` in the kit's own repository, which
holds the reasoning and is not in the package. The changelog begins at 2.3.0, and first shipped in the release after
it.

## 7.0.0

### What changed

* A project keeps its settings in `agentrite.json` at its root: `defaultBranch`, the branch units are cut from and
  compared with, `harnesses`, the harnesses it uses, and `sandbox`, `true` with the sandbox and `false` without it.
  All three keys are required, and a command that reads a file that is missing or not valid refuses, says what is
  wrong and changes nothing. "The project's settings" of the README describes the file (0045)
* The new command `npx agentrite config` writes the default file, `master`, both harnesses and the sandbox, without
  looking at the project, prints it and asks for it to be checked. It leaves a file that exists as it is (0045)
* `init` writes `agentrite.json` from its arguments and prints it, and takes the new option
  `--default-branch <name>`, `master` when it is not given. In a project that has the file, `init` takes no
  argument: it reads the harnesses and the sandbox setting from the file and writes what is missing for them. Given
  a harness, `--no-sandbox` or `--default-branch` there, it refuses and exits 1 (0045)
* `refresh` takes no argument and reads the harnesses and the sandbox setting from `agentrite.json`. Given any, a
  harness or `--no-sandbox` among them, it refuses and exits 2. It never writes `agentrite.json` (0045)
* The change check compares with the branch `defaultBranch` names, and with `origin/<default branch>` when the local
  one gives no common ancestor, where it compared with `master`. A unit run cuts a unit's branch from that branch,
  reading `agentrite.json` from the checkout it is run from, and says so. `process.md` and the role files say "the
  default branch" where they said `master` (0045)
* The README installs the kit as a development dependency, `npm install --save-dev agentrite`, and updates it with
  `npm install --save-dev agentrite@latest`. "On a fresh clone" says that an install without development
  dependencies, as `npm ci --omit=dev`, installs no kit (0045)
* Claude Code and OpenCode load `process.md` into every session themselves, where an agent read it only when it
  followed the link in `AGENTS.md`, which stays. The `CLAUDE.md` that `init` writes imports
  `@node_modules/agentrite/process.md` above `@AGENTS.md`. With `opencode`, `init` writes an `opencode.json` at the
  project root whose `instructions` list holds that path, or adds the path to one that exists and that it can amend.
  `init` and `refresh` print a notice for a `CLAUDE.md` or an `opencode.json` that does not load the file, and never
  change either. The README's new section "How the kit's instructions reach an agent" says what each file must hold
  (0048)
* A command in the sandbox, of a run and of `--connect`, has the `TERM` and `COLORTERM` of the terminal the wrapper
  was run from, where it had `TERM=xterm` and no `COLORTERM`, so a harness draws in the colours it draws in on the
  host. A `TERM` the image holds no description of becomes `xterm-256color`. A command of `--connect` gets those of
  its own shell, not the first command's (0049)
* On a Docker Compose older than 2.35.0, a unit run mounts the clone of the unit's branch at `/work`, and a run with
  `--workdir DIR` mounts `DIR`. Both mounted the project root there, so a unit's agent worked in the developer's own
  checkout. The kit's base Compose file declares no volume at `/work` any more (0050)
* The sandbox starts on a Docker that gives the local model server's host an IPv6 address besides an IPv4 one, as
  Docker Desktop 4.95.0 does for `host.docker.internal`. The entrypoint stopped with iptables'
  "host/network ... not found". The firewall admits the model server at its IPv4 address alone (0051)
* Not in the package: this repository installs the kit from the npm registry (0044); the suite passes on a macOS
  host, and a test skipped for what the host lacks names `./sandbox.sh --in-place npm test` (0046); this
  repository's own `agentrite.json`, and the pointer package `agentrite-roles` at 2.0.2, which gives the commands as
  this release takes them (0045)

### Worth knowing when you update

* **The update needs these steps. Until `agentrite.json` is there, `refresh`, the change check and a unit run that
  cuts a branch refuse, each naming `npx agentrite config`.** From the project root:

  ```sh
  npm install --save-dev agentrite@latest
  npx agentrite config
  npx agentrite refresh
  npx agentrite init
  ./sandbox.sh --in-place --rebuild true
  ```

  After `config`, read what it printed and edit `agentrite.json` where the project differs: a default branch other
  than `master`, a harness it does not use, no sandbox. `refresh` then writes and prints what `refresh` given those
  harnesses, and `--no-sandbox` without the sandbox, did before. `init` with no argument writes or amends
  `opencode.json` with `opencode`, and writes any other file of the kit's that is missing for the settings. Add the
  line `@node_modules/agentrite/process.md` to `CLAUDE.md` by hand, on a line of its own above `@AGENTS.md`: no
  command adds it, and `init` and `refresh` print a notice until it is there. A project without the sandbox has no
  last command. Commit `agentrite.json` with `package.json`, `package-lock.json`, `CLAUDE.md`, `opencode.json` and
  what `refresh` changed, in one commit on the default branch (0045, 0048)
* A project whose CI runs the change check fails there from a commit that updates the kit until `agentrite.json` is
  committed, which is why the steps commit them together. The check reads the file of the working tree, so one that
  is not committed passes on the developer's machine and refuses in CI and in a unit run's clone (0045)
* A project whose default branch is not `master` must change `defaultBranch`. Left at `master`, a unit run refuses
  to cut a branch from a local branch that is not there, and the change check fails naming it, or, where a branch
  `master` exists too, compares with that one (0045)
* Whatever of the project's own runs `npx agentrite refresh` with harnesses or `--no-sandbox`, such as a script or
  its documents, now fails with exit 2 and has to drop them. So does `npx agentrite init` with arguments in a project
  that has `agentrite.json`, with exit 1 (0045)
* The update command with `--save-dev` moves a kit that an earlier `npm install agentrite` put under `dependencies`
  to `devDependencies`. A job that installs with `npm ci --omit=dev`, or with `NODE_ENV=production`, then has no kit,
  and `npm run check-changes` does not run there. Such a job installs with a plain `npm ci` (0045)
* **The image is to be rebuilt, with the last command above.** The wrapper does not rebuild it by itself for this
  release. With an image built by an earlier one, `--connect` fails with Docker's
  "known-terminal.sh: no such file or directory" and exit 127, a `TERM` the image does not describe reaches the
  command as it is, and on a Docker that gives the model server's host an IPv6 address the sandbox still does not
  start (0049, 0051)
* `process.md` is in every session's context from its start, about 220 lines more for a session that did not read
  it. A project that leaves the import or the `opencode.json` entry out on purpose gets the notice on every
  `refresh`. A project that keeps OpenCode's configuration in an `opencode.jsonc` or under `.opencode/` gets a new
  `opencode.json` at its root from `init`, beside its own, and folds the two together by hand (0048)
* A harness in the sandbox may look different, which is the repair: it now draws for the developer's terminal. The
  colours were checked in the Terminal app of macOS 15. tmux on Linux, where the bug was seen too, was not checked
  (0049)
* On a Compose older than 2.35.0, unit runs of earlier releases worked in the developer's checkout: the agent
  switched its branch and committed on the unit's branch there. That work is on the unit's branch, and is the
  project's to keep or undo. A project's own `sandbox/compose.project.yml` that declares a volume at `/work` brings
  the bug back on such a Compose, and nothing checks for it. The repair was shown through the wrapper on macOS with
  Compose 2.23.3-desktop.2 and 2.39.2, and not on a Linux host (0050)
* A model server's host with only IPv6 addresses, or a `MODEL_SERVER_HOST` set to an IPv6 address, is not admitted:
  the entrypoint warns that the host did not resolve, and the sandbox starts without the model server. Shown on
  Docker Desktop 4.95.0 on macOS, not on a Linux host (0051)
* The steps of the first item without `init` and the line of `CLAUDE.md` are tested by the suite, in a temporary
  project. All of them together, the rebuild among them, were not tried in a project (0045, 0048)

## 6.0.0

### What changed

* The kit is the package `agentrite` on the npm registry, and no longer `@ritenoar/agentrite` from a URL on
  `agentrite.ritenoar.com`. A project installs it with `npm install agentrite` and updates it with
  `npm install agentrite@latest`, and `npm outdated` reports when a newer release exists. This is the first version
  on the registry: the releases before it are not there (0043)
* The kit's files are in a project at `node_modules/agentrite/`, where they were at
  `node_modules/@ritenoar/agentrite/`. Everything the kit writes or reads names the new path: the role wrappers that
  `init` and `refresh` write, the `AGENTS.md`, `CLAUDE.md`, `sandbox.sh` and `sandbox/compose.project.yml` that
  `init` writes, the `check-changes` script it adds to `package.json`, and the exception it writes into
  `.dockerignore` and looks for in one that exists. What a command does is otherwise unchanged. No old path keeps
  working (0043)
* The kit is open source under the MIT License, and `LICENSE` is in the package. Its repository is
  `https://github.com/norareit/agentrite`, which `package.json` names together with a description, keywords and
  where issues go (0043)
* The sandbox no longer admits `agentrite.ritenoar.com` by itself. The hosts the kit admits are the Anthropic API,
  `platform.claude.com`, `models.opencode.ai`, `auth.openai.com`, `chatgpt.com` and the npm registry, and the table
  in `SANDBOX.md` and the comment in the compose file `init` writes say so (0043)
* "Installing it into a project" and "Updating a project to a newer kit" of the README give the two commands above,
  and no command in the README names a version of the kit (0043)
* Not in the package: `npm publish` in the place of `deploy.sh`, with its checks of the release notes, the working
  tree and the suite, the removal of `infra/` and of the package that held the name `agentrite` on the registry,
  the reworded package that holds the name `agentrite-roles`, and `RELEASING.md` and `CONTRIBUTING.md` (0043)

### Worth knowing when you update

* **The update needs these steps, and without them the roles are not found, the change check does not run and the
  sandbox does not start.** From the project root, naming the harnesses the project uses in the third:

  ```sh
  npm uninstall @ritenoar/agentrite
  npm install agentrite
  npx agentrite refresh claude opencode
  sed -i 's#node_modules/@ritenoar/agentrite#node_modules/agentrite#g' \
    AGENTS.md CLAUDE.md .dockerignore sandbox/compose.project.yml package.json
  sed -i 's#@ritenoar/agentrite#agentrite#g' AGENTS.md
  ./sandbox.sh --in-place --rebuild true
  ```

  A project that holds the kit as a devDependency installs it with `npm install --save-dev agentrite`. `refresh`
  prints the role wrappers and `sandbox.sh` as refreshed. The two `sed` commands change the path in the files that
  are the project's own, which `refresh` never touches, and the name of the package where `AGENTS.md` gives it. A
  project without the sandbox gives `--no-sandbox` to `refresh`, leaves `.dockerignore` and
  `sandbox/compose.project.yml` out of the first `sed`, and has no last command. Commit the changes with
  `package.json` and `package-lock.json` (0043)
* These are the steps from 5.0.0. A project on an older release reads the sections between first: the steps of
  5.0.0, which rename `agent.sh` to `sandbox.sh`, are not among the ones above (0043)
* What happens when the `sed` commands are left out. The `check-changes` script runs a file that is not there, and
  node says that it cannot find the module. The links in `AGENTS.md` and `CLAUDE.md` lead nowhere, so an agent does
  not find `process.md`. The build of the image fails on a file it cannot copy, because `.dockerignore` still lets
  back in the old directory and keeps the new one out. Nothing of the kit names the step that was skipped. None of
  the three was tried (0043)
* Whatever else of the project's own names `node_modules/@ritenoar/agentrite` or `@ritenoar/agentrite` is the
  project's to change: its other documents, its scripts, its CI. Nothing of the kit finds these (0043)
* npm writes a range into `package.json`, `^6.0.0`, where it wrote the URL of one release. `package-lock.json`
  still pins one version with its integrity hash, and `npm ci` installs exactly that. `npm install agentrite@latest`
  is what moves a project to a newer major version (0043)
* The releases up to 5.0.0 are installed from `agentrite.ritenoar.com`, and that host is taken down once the
  projects that use the kit have moved. After that `npm ci` fails on every commit of a project from before its
  move, and those releases cannot be installed any more (0043)
* A project that still needs `agentrite.ritenoar.com` inside its sandbox, for as long as the host answers, lists it
  in the `ALLOWLIST` of its `sandbox/compose.project.yml` (0043)
* `npx agentrite` in a project that has not installed the kit now fetches the kit from the registry and runs its
  command, where it fetched a package that said the kit was not installed and exited with an error. So
  `npx agentrite init` there writes files that name `node_modules/agentrite/`, which the project does not have, and
  exits 0. The first thing that then fails is `./sandbox.sh`, with the shell's "No such file or directory".
  `npm install agentrite` repairs it. Install first, as the README says (0043)
* The registry holds one older version under this name, `agentrite@1.0.0`. It is not a release of the kit: it is
  the package that held the name, and it is marked as deprecated (0043)
* The steps were tried once, by hand, in a project that `init` of 5.0.0 set up with both harnesses and no
  Playwright, with Docker on Linux: the role files were found, `npm run check-changes` ran and the sandbox was
  built and started. The kit was installed there from the packed tarball and not from the registry. Not tested: the
  install from the registry, a harness or a unit run in the sandbox after the move, a project with Playwright, a
  project without the sandbox, a project set up by a release before 5.0.0, and anything on macOS (0043)

## 5.0.0

### What changed

* What starts the sandbox is `sandbox.sh`, and no longer `agent.sh`. Everything that named the sandbox `agent` is
  named `sandbox`: the shim at the project root, the kit's `container/sandbox.sh` that it runs, the project's half of
  the configuration at `sandbox/compose.project.yml`, and the Compose service in both compose files. `sandbox.sh`
  takes every form, option and environment variable `agent.sh` took and does the same with each. Its messages open
  with `sandbox.sh:`. No old name keeps working (0041)
* `init` writes `sandbox.sh` and `sandbox/compose.project.yml`. The compose file it writes configures the service
  `sandbox`, names the Compose project and the image `<name>-sandbox` where it wrote `<name>-agent`, and reads the
  limits from `SANDBOX_MEM_LIMIT` and `SANDBOX_CPUS` where it wrote `AGENT_MEM_LIMIT` and `AGENT_CPUS`. `refresh`
  writes and refreshes `sandbox.sh` (0041)
* `sandbox.sh` refuses a project whose compose file still configures a service named `agent`. It builds and starts
  nothing, says which line to rename and exits with 2 (0041)
* What names the agent keeps its name: the account `agent` in the container, its home `/home/agent`, the home
  volume `<project>_agent-home`, and the build arguments `AGENT_UID` and `AGENT_GID`. The clones of unit runs and
  the project's log directory are where they were (0041)
* The package has one command, `agentrite`. `agentrite-roles` is gone, and nothing in the package does what it did
  (0038)
* `init` and `refresh` take `--no-sandbox`, at any place among the harnesses, for a project that wants the process
  and the roles without the sandbox. `init --no-sandbox` writes the role wrappers, `AGENTS.md`, `CLAUDE.md` and the
  `check-changes` script, and leaves out `sandbox.sh`, `sandbox/compose.project.yml` and `.dockerignore`. It runs
  when `package.json` has no `name`, and does not read `package-lock.json`. `refresh --no-sandbox` refreshes the
  role wrappers and leaves `sandbox.sh` out. The usage of both commands names the option (0038)
* The README is rebuilt, and is one of three documents. `README.md` says what the kit is, what the four roles are,
  and has a part "Commands" with a section for each command a project runs, each with a table of every argument,
  option and environment variable, then "Running a role", installing, updating and the sandbox in brief. The
  reference of the sandbox is `SANDBOX.md`, which is new in the package, at
  `node_modules/@ritenoar/agentrite/SANDBOX.md`. Working on the kit itself is in `CONTRIBUTING.md`, which is not in
  the package. The documents say what there is and how to use it, and no longer why it is so (0037)
* `SANDBOX.md` is ordered by what a reader does: "Running a unit", "Getting the work back", "Two agents on one
  unit", "Running on the tree as it is", "Logging in", "Reaching more hosts", "Holding a harness version", "The
  status line", "The local model server". "Where things are kept on the host" is the one place for the clone of a
  unit run, the project's log directory, the home volume and the image, with where each is and how it is removed.
  "What the sandbox defends against" is the one place for that. "When something goes wrong" has an entry for every
  failure a reader recovers from, each with what is seen, why and what to do (0039)
* The README names `SANDBOX_MEM_LIMIT` and `SANDBOX_CPUS`, the two limits a project's compose file reads from the
  environment, which the README before did not name under either name (0037, 0041)
* The message of the entrypoint for a home volume it refuses says that removing the volume discards Claude Code's
  saved login, where it said the harnesses' saved logins. OpenCode's login is in the project's log directory since
  4.1.0 (0039)
* `process.md` says how an entry of a record is written, with an example: the timestamp written bare, who made it
  in square brackets, as `[human]` or `[Claude Code, anthropic/claude-opus-5-5]`, then `as the <role>` for an agent
  that acts in a role, then the text. `templates/changes/record.md` has the role in its two entry lines (0040)
* `process.md` says under "How code is written" that one-character variables are never used
* Not in the package: `CONTRIBUTING.md`, the rules on the three documents in this repository's `AGENTS.md`, and the
  reworded package that holds the name `agentrite-roles` on the npm registry (0037, 0038, 0039). This repository's
  own `sandbox-dev.sh`, which was `agent-dev.sh`, and its own compose file and names (0041)

### Worth knowing when you update

* **The update needs these steps in a project that has the sandbox, and its sandbox does not start without them.**
  From the project root, after the install:

  ```sh
  npx agentrite refresh claude opencode
  git rm agent.sh
  git mv agent sandbox
  ```

  Name the harnesses the project uses in the first. It prints `wrote sandbox.sh`, and leaves `agent.sh` where it
  is, which is why the second removes it. Then, in `sandbox/compose.project.yml`, rename the service: the line
  `agent:` under `services:` becomes `sandbox:`. Everything under it stays as it is, a held harness version under
  `build:` and `args:` among it. Commit the four changes with `package.json` and `package-lock.json` (0041)
* What happens when a step is left out. An `agent.sh` that was left fails with the shell's "No such file or
  directory", since the script it ran is gone. Without `sandbox/compose.project.yml`, `sandbox.sh` names that path
  as missing and exits with 2. With the service still named `agent`, `sandbox.sh` refuses as above (0041)
* Whatever of the project's own names `./agent.sh` or `agent/compose.project.yml` is the project's to change: its
  `AGENTS.md` and other documents, its scripts, its CI, an alias in a shell. Nothing of the kit finds these. The
  comments in the project's compose file name the old paths too, and harm nothing (0041)
* Leave `name:` and `image:` in the project's compose file as they are, `<name>-agent` in a project that `init`
  set up before this release. The home volume, with Claude Code's login in it, the image and the clones of unit
  runs are found by that name, so they are the ones the project had. The name is seen in `docker` listings and
  nowhere else. Changing it to `<name>-sandbox` is allowed and costs this: a new and empty home volume, so Claude
  Code is logged in again, an image built anew, a clone that an earlier unit run left is no longer found, and the
  old volume, image and network stay until removed by hand, as "Where things are kept on the host" in `SANDBOX.md`
  gives for the first two (0041)
* The limits are read from the variables the project's compose file names. A file that says `AGENT_MEM_LIMIT` and
  `AGENT_CPUS` goes on reading those, and the README now describes `SANDBOX_MEM_LIMIT` and `SANDBOX_CPUS`. To have
  the names the README gives, rename the two in the file, and wherever the project sets them (0041)
* Build the image once after the steps, with `./sandbox.sh --in-place --rebuild true`. The wrapper does not build
  by itself for this update: the image's name and the harness versions are unchanged. An image built before this
  release holds an entrypoint whose messages name `agent/compose.project.yml` and the harnesses' saved logins.
  Starting this release on such an image, without the build, was not tried (0041, 0039)
* The steps were tested in the kit's suite on the two files as `init` of 4.2.0 writes them, with Docker replaced
  by a stand-in, and the refusal and the renamed service were tried with Docker Compose 2.39.2 on Linux. Not
  tested: the steps in a real project with Docker, a project set up by a release before 4.2.0, an update while a
  unit run is under way or while a clone of one is kept, and anything on macOS (0041)
* A project that runs `agentrite-roles` runs `agentrite init` or `agentrite refresh` in its place, each with
  `--no-sandbox` when it has no sandbox. After the update `npx agentrite-roles` finds no command in the project and
  asks the npm registry, where the name is held by a package that installs nothing of the kit and exits with 1
  (0038)
* A project without the sandbox gives `--no-sandbox` on every `refresh`. The option is not remembered, and a
  `refresh` without it prints `wrote sandbox.sh` and writes the file, which is then deleted by hand. The remedy
  `agentrite run` prints for a wrapper that is missing or out of date, `npx agentrite refresh <harness>`, does not
  name the option (0038)
* What the README held on the sandbox is in `SANDBOX.md`, under other titles, and the notes of earlier releases
  below name sections of the README as they were. "Working on a clone" is "Running a unit" and "Getting the work
  back", "Egress" is "Reaching more hosts", "The home volume" and "The harness logs" are in "Where things are kept
  on the host", and `--connect` is in "Two agents on one unit" (0037, 0039)
* Some of what the README said is in no document any more: why a behavior was chosen, how the egress proxy works
  inside, on which system something was tried, the lists of what a command does not do, and every refusal whose
  own message says both why it refused and what to do. The command that copies the harness logs out of a home
  volume from a release up to 4.0.0, which the notes of 4.1.0 below point to, is among what went. The tarball of
  4.2.0 still holds it in its README (0037, 0039)
* "When something goes wrong" in `SANDBOX.md` gives a recovery for failures the README gave none for. Not tried
  among them: what to do when the entrypoint's canary is reached or its hostname is not refused, a host without
  network, and connecting to a unit whose branch a run cut, from the cutting run to the connected command, with
  Docker. How the project's log directory and the image are removed is new too, and was tried on Linux with no
  sandbox running and no container of the image (0039)
* How the three documents render on Bitbucket, GitHub or npm was not checked (0037, 0039)
* The form of a record's entries is an instruction to agents. Nothing checks it, and records that exist are not
  changed (0040)

## 4.2.0

### What changed

* `./agent.sh --connect <unit> [COMMAND...]` runs a command in the container of the unit run that is under way for
  the unit, beside what runs there, and with no command it opens the shell a unit run opens. It is the way to two
  harnesses on one unit at the same time, such as the implementer in one terminal and the reviewer in another:
  `./agent.sh 0029 claude` in the first, and `./agent.sh --connect 0029 opencode` in the second while that runs.
  The unit is given as a unit run takes it, by its branch's name or by a number that one local branch's name
  holds. Any number of commands may be connected to one run (0034)
* A connected command is in that container and not in one like it: the same `/work`, the same home, the same
  processes, and the firewall and the egress proxy between it and the network. It runs as the agent, as the first
  command does: the same user and groups, no capability and no way to gain one, the same `HOME`, `USER`, `LOGNAME`
  and `PATH`, and `/work` as its working directory. It is given a terminal when `--connect` is run from one and
  none when it is not, and the wrapper exits with the status the command exited with (0034)
* `--connect` starts no container and stops none, builds no image, asks npm nothing, makes no clone, cuts no
  branch and fetches nothing. It runs nothing, says why and exits with 2 when no unit is given, when the unit
  names no local branch or several, when no run is under way for the unit, in which case it names the command
  that starts one, when Docker could not be asked, and when it is given together with `--in-place`, `--workdir`,
  `--mount` or `--rebuild`. A number that no branch holds is refused although `master` holds a unit of that
  number: only a unit run cuts the branch. A run with `--in-place` or `--workdir` cannot be connected to (0034)
* The refusal of a second unit run for a branch whose container is running names `--connect`, and so do the forms
  the wrapper lists when nothing to mount was given (0034)
* `init` no longer writes `models.dev` into the `ALLOWLIST` of a project that uses OpenCode. OpenCode takes its
  model catalog from `models.opencode.ai`, which the kit admits itself, so the `ALLOWLIST` that `init` writes
  holds its comment and no host, for either harness (0036)
* The README describes `--connect` under "Working on a clone", with what ends with the first command, what is
  refused, and why `docker exec` with no user named is not the way to a second shell (0034)
* Not in the package: nothing

### Worth knowing when you update

* The update asks for no rebuild of the image and no `refresh`. `--connect` is in the wrapper, which the install
  brings, and nothing in the image, the entrypoint or the compose file changed (0034)
* The first command of a unit run owns the container. When it ends the container stops and every connected
  command ends with it: its wrapper prints nothing and exits with 137. So end the first shell last. A session of
  a harness in a connected shell that had not saved what it held is lost. A commit is not: what was committed in
  the clone is brought back as after every unit run (0034)
* Two harnesses in one clone write the same files and commit on the same branch. Nothing keeps them out of each
  other's way (0034)
* A second shell opened with `docker exec <container> bash`, with no user named, is root and holds `NET_ADMIN`,
  `SETUID` and `SETGID`, which is what changing the firewall takes. Whoever opened a second shell that way before
  this release uses `--connect` now (0034)
* A project that `init` set up for OpenCode before this release keeps `models.dev` in the `ALLOWLIST` of its
  `agent/compose.project.yml`, with a comment that is no longer true. `init` wrote the file once and `refresh`
  does not touch it. The entry harms nothing while the host answers, but the entrypoint refuses to start when a
  listed host is unreachable, so the project depends on a host it does not use. Remove the line and its comment
  by hand. It is read when a container starts, and asks for no rebuild (0036)
* That OpenCode leaves `models.dev` alone was seen with OpenCode 1.18.35, logged in with a ChatGPT account, for a
  prompt sent with `opencode run`. It was not checked for another version or provider, for the interactive
  session, or with a home volume that holds no catalog yet (0036)
* A run given `--workdir` or `--mount` with a directory that is not there still ends with the shell's error and
  1, but only after all options are read. An option after it that lacks its argument is now reported in its
  place (0034)
* Shown on Linux, on Docker 28.4.0: the user, the groups, the environment, the working directory and the
  capability sets of a connected command, that it could not become root or read the firewall's rules, and that it
  was refused a host that is not on the allowlist. Not tried: a harness in each of two shells, so nothing is
  known of how two of them share a clone and the size of each terminal, `--connect` from a developer's own
  terminal, which was seen only under `script`, and anything on macOS (0034)

## 4.1.1

### What changed

* The sandbox starts again on a home volume in which `.local`, `.local/share` or `.claude` admits its owner alone.
  In 4.1.0 the entrypoint looked at those three directories as the container's root, which holds no capability to
  pass a file's permissions and so could not enter such a directory, and every start ended in the one line
  `stat: cannot statx '/home/agent/.local/share': Permission denied`, with no refusal of the entrypoint's own and
  nothing saying how to go on. Tools that follow the XDG convention make `.local` that way, so a volume in which
  one ran has it. The entrypoint now looks at the three as the agent. What it refuses is what it refused in 4.1.0,
  a directory among the three that is not the agent's, with the same words (0042)
* A directory among the three that even the agent cannot read is refused by the entrypoint, before the command
  runs: `FATAL: <directory> could not be examined as the agent`, with what the read said and the command that
  removes the home volume (0042)
* The README's "The harness logs" says who examines the directories (0042)
* Not in the package: nothing

### Worth knowing when you update

* Build the image again after the install, with `./agent.sh --in-place --rebuild true`. The entrypoint is in the
  image, and nothing else builds it: the wrapper builds only when there is no image or a harness version is due.
  Until then a project has the entrypoint of the release its image was built with, and a start that failed with
  the line above fails the same way. The update asks for no `refresh` (0042)
* A project whose sandbox did not start on 4.1.0 with that line needs nothing done to its home volume. The failed
  starts changed nothing in it, and it starts on this release as it is, once the image is built again (0042)
* Shown on Linux, on Docker Engine 28.4.0: a start through the wrapper with the three directories closed to all
  but their owner, the refusal of a directory Docker made as root, and the refusal of a directory the agent cannot
  read. Nothing of this release was tried on macOS (0042)

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
* Found after the release: the sandbox of 4.1.0 does not start on a home volume in which `.local`, `.local/share`
  or `.claude` admits its owner alone, which is how tools that follow the XDG convention make `.local`. The start
  ends in `stat: cannot statx '/home/agent/.local/share': Permission denied`. The volume is sound and needs
  nothing done to it. 4.1.1 holds the fix (0042)
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
