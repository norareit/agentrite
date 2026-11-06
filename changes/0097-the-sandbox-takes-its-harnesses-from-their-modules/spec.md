# 0097 The sandbox takes its harnesses from their modules

## Context

Unit `0091-one-contract-per-harness` gathered what the kit's code knows of each harness into one module per harness,
under `scripts/harnesses/`, each implementing the harness contract of `scripts/agentrite-harness.mjs`, with a test
that every harness implements every member. It left the sandbox as it was, and listed in "Adding a harness" of
`CONTRIBUTING.md` what a new harness takes there. The human wants to add Codex as a third harness, and wants the
kit as well modelled as it can be before that. Of the entries of that checklist, the sandbox's are the most and the
most scattered. Each harness is named, by hand, in:

* `container/Dockerfile`: the build argument of its version, its npm package in the install, the label that records
  its version, the switches that turn off its own updates (`DISABLE_AUTOUPDATER` and `DISABLE_UPDATES` for Claude
  Code, a configuration file named by `OPENCODE_CONFIG` for OpenCode), and the directories of its logs made in the
  home as the agent's
* `container/compose.yml`: the build argument of its version, the hosts of `KIT_ALLOWLIST` it needs with a comment
  for each, `FIREWALL_PROBE`, which is `api.anthropic.com`, the host of Claude Code's API, and comments that name
  the directories of its logs
* `container/sandbox.sh`: its command, asked for its version on the host, and its npm package, asked for the latest
  published version; the build argument the project's compose file gives, read from the merged configuration; the
  label read from the image and compared with the wanted version, with a message that names it; the variable that
  hands its version to the build; the directories of its logs, made on the host and mounted; its bell, as mounts or
  as an environment variable; and, for Claude Code alone, the status line and how long it keeps its sessions, read
  from the host's `~/.claude/settings.json` by `scripts/agentrite-cleanup-period.mjs`. Each of these is written once
  per harness, as `claude_code_wanted` and `opencode_wanted` with their own lines
* `container/entrypoint.sh`: the directories above the log directories, which it checks the agent owns, and the
  recovery message, which names Claude Code's login
* `container/bell/`: Claude Code's hooks and OpenCode's plugin that ring the bell
* `container/claude-managed-settings.json`: Claude Code's status line
* `templates/project/sandbox/compose.project.yml`: a comment that lists the hosts the kit admits

A third harness written the same way adds a third copy of each, and the shell's per-harness variables grow a third
set. Nothing fails for a harness that the sandbox lacks: a harness that the commands know and the image does not hold
is found only when a run starts it and it is not there.

The host has node for the wrapper already, which reads the project's `agentrite.json` with
`scripts/agentrite-settings.mjs` and the host's Claude Code settings with `scripts/agentrite-cleanup-period.mjs`.

## Requirements

1. The harness contract has a member group `sandbox`, which each harness module implements, holding what the sandbox
   knows of that harness:
    * its npm package, which the image installs and the registry is asked for the latest version of
    * the build argument by which a project's compose file gives its version, `CLAUDE_CODE_VERSION` and
      `OPENCODE_VERSION` as today
    * the reading of its version from what its host command printed for `--version`
    * what turns off its own updates in the sandbox
    * the directories of its logs and its own state, each relative to the agent's home, that are mounted from the
      project's log directory on the host
    * the hosts the egress allowlist admits for it, each with the reason it is needed
    * what a run gives it for the bell when the project's `agentrite.json` holds `"bell": true`
    * what a run gives it besides, from the host: for Claude Code its status line and how long it keeps its
      sessions, and for OpenCode nothing
2. `container/Dockerfile`, `container/compose.yml`, `container/sandbox.sh`, `container/entrypoint.sh` and
   `templates/project/sandbox/compose.project.yml` name no harness, and hold no value that belongs to one harness.
   Each reaches the harnesses by going over the list `HARNESSES` of `scripts/agentrite-harness.mjs`, through the
   contract. The one exception is the recovery message of the entrypoint and the comments, which may name a harness
   as an example where the text says so
3. Files a harness needs in the sandbox that are not code of the kit's commands, such as Claude Code's hooks of the
   bell and its status line settings, and OpenCode's plugin of the bell, are in a directory of that harness's own
   under `container/harnesses/<name>/`, one per harness that has such files. `container/bell/ring-bell.sh`, which
   every harness's bell runs, stays shared
4. The image holds every harness of the list, each at exactly the version wanted for it, and records the versions it
   holds in a way that the wrapper reads for every harness of the list. A harness of the list that the image records
   no version of makes a build due, as one does today
5. The wanted version of each harness is chosen as today: the version the project's compose file gives under its
   build argument, else the version the host's command reports, else the version the image holds, and the latest
   published when a build is due. Every message the wrapper prints about the versions is the one it prints today, with
   the harness's title, for each harness of the list in the order of the list
6. Each version handed to the build, and each read from the host, the project or the registry, is refused unless it
   has the shape of a version that the wrapper accepts today, before anything is installed with it
7. The hosts the egress allowlist admits are the kit's own hosts, the hosts of every harness of the list, and the
   project's `ALLOWLIST`, as today. The set of the kit's and the harnesses' hosts is the set `KIT_ALLOWLIST` holds today
8. `FIREWALL_PROBE` is a host of the kit's own, and not a harness's
9. The directories of every harness's logs are made on the host, mounted at the same places in the home as today,
   made in the image as the agent's, and checked at the entrypoint with every directory above them, as the
   directories of Claude Code and OpenCode are today
10. With `"bell": true` each harness rings the bell at the moments it rings today, and with `false` nothing of any
    harness's bell is given to a run
11. The status line, and the number of days Claude Code keeps its sessions, reach Claude Code in the sandbox as today,
    from the same files of the host, and through the same read-only managed settings in the container
12. The values the wrapper hands Compose for the harnesses are assigned by the wrapper whatever the caller's
    environment holds, so that no variable of the caller's environment is a source of a version, a package or a host,
    as today
13. The harnesses' part of the sandbox comes from the installed kit alone. Nothing of the project, of `/work` or of
    the home volume chooses a package, a host of `KIT_ALLOWLIST`, a log directory or a mount of a harness
14. The tests of the sandbox that hold a case for each harness, of the versions, the log directories, the allowlist
    and the bell, go over the list `HARNESSES`, so that a harness added to the list has those cases without a test
    being edited. A test that runs a harness's own file, such as the plugin of OpenCode's bell, stays that harness's
15. The test of `tests/agentrite-harness.test.mjs` checks the members of `sandbox` as it checks every other member of
    the contract
16. A run behaves as before this unit, but for requirement 8 and for one build of the image at the first start after
    the kit is updated. The harnesses' versions, the image's contents, the mounts, the environment of the command, the
    allowlist, the bell, the status line and what the wrapper prints are unchanged. A project's compose file that gives
    `CLAUDE_CODE_VERSION` or `OPENCODE_VERSION` keeps working unchanged
17. "Adding a harness" of `CONTRIBUTING.md` holds, under the contract, what the `sandbox` group asks of a new harness
    and the directory of requirement 3, and no longer has an entry for the image, the choice of its version, its own
    updates, the directories of its logs, the allowlist hosts, the bell or the status line. It keeps the entries
    for its login, the trailers it adds to a commit message and the terminal variables, which stay outside the
    module. `SANDBOX.md` and `SETUP.md` are changed where what they say of the image, the labels, the allowlist or the
    probe is no longer true

## Decisions

* **The kind is feature.** What the contract holds for the sandbox, how a shell script and a Dockerfile reach a
  JavaScript module, and what stays outside it are decisions
* **The knowledge goes into the harness modules, not into data files of their own.** One module per harness is the
  shape 0091 chose and the test checks. A file per harness under `container/` beside the module would be a second
  place to edit for each harness, and a second list of the harnesses for its loader. The files a harness needs as
  files, which a module cannot be mounted as, are the exception of requirement 3, kept by the harness's name
* **The shell asks node, at each start; nothing is generated and committed.** The wrapper already runs node on the
  host for the settings and the session retention. A generator that writes the Dockerfile and the compose file from
  the modules, with a test that the committed files are what it writes, was rejected: it keeps a copy of each
  harness's knowledge in every generated file, and a change to a module then takes a regeneration step that a
  contributor must know of. A helper the wrapper runs reads `HARNESSES` and prints what the shell needs, as the
  readers of the settings print theirs. How it hands that over is the plan's
* **The Dockerfile and the base compose file take lists, not one argument per harness.** A Dockerfile and a compose
  file cannot go over a list of names that changes, so the harnesses reach them as values the wrapper composes, such
  as the packages to install at their versions, the directories to make and the environment that turns off updates.
  Which arguments those are, and how the image records the versions it holds, is the plan's. A project's per-harness
  build argument is read from the merged configuration by its name in the module, as it is read by a fixed name today
* **The labels of the versions may change their names or form.** The image records the kit's version, and the wrapper
  builds again for another kit, so the first start after an update of the kit builds anyway. A label read by a name
  that changed costs nothing more than that build
* **The probe moves to a host of the kit's own.** `FIREWALL_PROBE` proves that the allowlist admits a host, and is a
  host of Claude Code today because Claude Code was the only harness when it was set. A probe that belongs to one
  harness leaves the self-check depending on that harness's place in the list. The npm registry is the kit's own host,
  which every image reaches for `npm ci`, and is the obvious probe; the plan may choose another host of the kit's own
* **Turning off a harness's own updates is part of its module, in whatever form it takes.** Claude Code is turned off
  by environment variables and OpenCode by a configuration file. The member says what the image or the run is given,
  and the plan chooses whether that is applied in the build or at the start of a run, so long as the harness cannot
  update itself in the sandbox, as today
* **The host's version is read by the module.** Today the wrapper takes the first word of the first line. That is
  true of Claude Code and OpenCode, and not of every harness: Codex prints its name before its version. A member that
  reads it lets a harness that prints otherwise say so, and the shape of a version stays the wrapper's, so that
  requirement 6 holds whatever a module returns
* **The session retention is Claude Code's.** `scripts/agentrite-cleanup-period.mjs` reads a setting of Claude Code
  from Claude Code's file on the host, and is Claude Code's knowledge. It is reached through the Claude Code module,
  and the wrapper no longer names it. Where its code lives is the plan's
* **The login, the trailers and the terminal variables stay outside the module.** Where a harness keeps its login is
  answered by the directories of its logs and the home volume, which the module holds, and whether its login needs no
  callback into the sandbox is a fact to check by hand, not code. The trailers are a rule of the standards, which
  `container/check-commit-message.mjs` enforces from the kit alone inside the image. `TERM` and `COLORTERM` are given
  to every command, whatever harness it runs. Each stays an entry of the checklist
* **The adversary is the agent in the container, as for the sandbox as a whole.** Nothing the agent writes, in `/work`,
  in its home or in the project's files, is read to choose what the image installs as root, what the allowlist
  admits, or what is mounted. The harness modules are the installed kit's, which the agent of a unit run cannot write,
  since the kit is in the project's `node_modules` on the host and a unit run mounts a clone. This unit does not
  defend against a developer who edits the installed kit, nor against a compromised npm package of a harness, which
  is installed today as it will be after

## Non-goals

* Adding Codex, or any harness. This unit prepares for one
* Harnesses that are not installed with npm. The contract assumes an npm package, as both harnesses are and Codex is
* Generating the documents, the components diagram, the help text of `agentrite run`, or the default orchestrator
  from the modules. They stay entries of the checklist
* Making the trailer check, or the terminal variables, per harness
* A choice of which harnesses the image holds by the project's `harnesses` setting. The image holds every harness of
  the list, as it holds both today
* Any change to the project's `ALLOWLIST`, to the firewall, or to what the egress proxy admits beyond requirement 8
* Any change to `sandbox-dev.sh` or to this repository's own `sandbox/compose.project.yml` beyond what the change of
  the kit's files requires

## Beyond the request

1. **The image holds only the harnesses the project uses.** The project's `harnesses` setting chooses which harnesses
   the image installs, makes directories for and admits hosts of. It costs reading that setting at each start and a
   build when it changes, and a run of a harness the project does not list then finds no command in the image.
   Without it, every image holds every harness of the kit, as today, which with a third harness is one more package
   and a few more hosts admitted that a project may not use
2. **A test that `SANDBOX.md` lists every host of `KIT_ALLOWLIST`.** The table of the hosts the kit admits, in
   `SANDBOX.md`, compared with the kit's and the harnesses' hosts. It costs a small test. Without it, a host added to a
   module and not to the table is seen by a reader who compares the two, and corrected then
