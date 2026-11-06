# 0097 The sandbox takes its harnesses from their modules

## Approach

What the sandbox knows of each harness moves into a member group `sandbox` of its module. A new helper,
`scripts/agentrite-sandbox.mjs`, is the one place that goes over `HARNESSES` for the sandbox: the wrapper runs it with
node, as it runs the readers of the settings today, and it prints, line by line, what the shell needs for the
project's harnesses. The Dockerfile and the base compose file stop naming harnesses and take lists the wrapper
composes. Nothing is generated or committed.

### The `sandbox` group of the contract

Each module gains the members below. The contract's kinds gain `records`, a list of objects each holding exactly the
named string fields, which `HARNESS_CONTRACT` gives as `fields` beside `kind`. A mount is a record
`{ from, path, target }`: `from` is `kit` for a file of the harness's own directory `container/harnesses/<name>/`,
whose `path` is relative to that directory, or `host` for a file of the host, whose `path` is absolute. `target` is
the absolute path in the container. Every mount is read-only.

| Member                       | Kind     | Claude Code                                              | OpenCode                                             |
|------------------------------|----------|----------------------------------------------------------|------------------------------------------------------|
| `sandbox.package`            | string   | `@anthropic-ai/claude-code`                              | `opencode-ai`                                        |
| `sandbox.versionArgument`    | string   | `CLAUDE_CODE_VERSION`                                    | `OPENCODE_VERSION`                                   |
| `sandbox.readVersion`        | function | the first word of the first line, or `undefined`         | the same, written in its own module                  |
| `sandbox.updates.environment`| strings  | `DISABLE_AUTOUPDATER=1`, `DISABLE_UPDATES=1`             | `OPENCODE_CONFIG=/etc/opencode/opencode.json`        |
| `sandbox.updates.mounts`     | records  | none                                                     | `opencode.json` at `/etc/opencode/opencode.json`     |
| `sandbox.logDirectories`     | strings  | `.claude/projects`                                       | `.local/share/opencode`                              |
| `sandbox.hosts`              | records  | `api.anthropic.com`, `platform.claude.com`, with reasons | `models.opencode.ai`, `auth.openai.com`, `chatgpt.com`, with reasons |
| `sandbox.bell.environment`   | strings  | none                                                     | `OPENCODE_CONFIG_CONTENT={"plugin":["file:///etc/agentrite/bell/opencode-plugin.js"]}` |
| `sandbox.bell.mounts`        | records  | `bell-settings.json` at `/etc/claude-code/managed-settings.d/agentrite-bell.json` | `bell-plugin.js` at `/etc/agentrite/bell/opencode-plugin.js` |
| `sandbox.host`               | function | the status line and the session retention, below         | gives nothing                                        |

`sandbox.hosts` records have the fields `host` and `reason`, the reason being today's comment of `KIT_ALLOWLIST`
without the part about the probe. `sandbox.readVersion` of each module is written in that module, since the two
harnesses print their versions independently and only look alike today. The shape of a version stays the wrapper's
`is_version`, applied to what the helper prints (R6).

`sandbox.host(home, read)` takes the host's home and a reader of a path relative to it that returns a `ProjectFile`,
as `readProjectFile` does, and returns `{ environment, mounts, files }`. A file is a record `{ name, content, target }`
that the wrapper writes into the project's log directory and mounts read-only. Claude Code's:

* when `.claude/statusline-command.sh` is a file that can be read, the mounts of that file (`from: host`) at
  `/etc/claude-code/statusline-command.sh` and of its own `managed-settings.json` at
  `/etc/claude-code/managed-settings.json`; a missing path, a directory or an unreadable file gives neither, as `-f`
  does today
* when `.claude/settings.json` holds a `cleanupPeriodDays`, the file `claude-cleanup-period-<n>.json` with the content
  `{"cleanupPeriodDays": <n>}` at `/etc/claude-code/managed-settings.d/agentrite-cleanup-period.json`. The value is
  judged by `parseCleanupPeriod`, and a file that cannot be read throws today's message of `readCleanupPeriod`

`scripts/agentrite-cleanup-period.mjs` keeps `parseCleanupPeriod`. `readCleanupPeriod(home)` becomes
`cleanupPeriodOf(read, path)`, which takes the `ProjectFile` and the path to name, so that the module stays pure, and
its command-line entry is removed: the wrapper no longer runs it. The Claude Code module imports it.

### The files of a harness

`container/harnesses/claude/` holds `managed-settings.json`, moved from `container/claude-managed-settings.json`, and
`bell-settings.json`, moved from `container/bell/claude-managed-settings.json`. `container/harnesses/opencode/` holds
`bell-plugin.js`, moved from `container/bell/opencode-plugin.js`, and `opencode.json`, the configuration that
`container/Dockerfile` writes with `printf` today, with the same content. `container/bell/` keeps `ring-bell.sh`
alone (R3). Each is moved with `git mv`, so that its history follows it.

The paths in the container stay those the harnesses read today. `ring-bell.sh` is mounted as a file at
`/etc/agentrite/bell/ring-bell.sh` and OpenCode's plugin at `/etc/agentrite/bell/opencode-plugin.js`, so the plugin
still finds the script beside it and `OPENCODE_CONFIG_CONTENT` is unchanged. The one thing of the container that is
no longer there is the copy of Claude Code's hooks at `/etc/agentrite/bell/claude-managed-settings.json`, which today
comes with the directory mount and which nothing reads. The directory cannot be mounted with a file of another
directory inside it, because Docker would make that mount point in the kit's directory on the host.

### The helper

`scripts/agentrite-sandbox.mjs` has two forms, each printing one record to a line with its fields separated by a tab.
It refuses, as a fault of the kit, a field that holds a tab or a line break.

`node agentrite-sandbox.mjs start <project root> <home>` reads `bell` and `harnesses` with the new `readStart` of
`scripts/agentrite-settings.mjs`, takes the project's harnesses as `HARNESSES` filtered by the setting (R18), calls
each one's `sandbox.host` when `<home>` is not empty, and prints, in this order:

```text
bell	<true or false>
harness	<name>	<title>	<command>	<package>	<version argument>
directory	<log directory>
allow	<host>	<reason>
env	<NAME=value>
mount	<kit or host>	<path>	<target>
file	<name>	<content>	<target>
```

A `harness` line for each harness in the list's order, then the `directory` and `allow` lines of each in that order.
The `env` and `mount` lines are those of the updates of each harness, then of the host of each, then, with
`"bell": true`, the shared `mount kit bell/ring-bell.sh /etc/agentrite/bell/ring-bell.sh` and the bell of each. A
`mount kit` path is relative to the kit's `container/`, as `harnesses/claude/managed-settings.json`, so that the
wrapper puts its own `$here` before it and the paths it hands Docker are those it computes today. An error of either
reader is printed as `agentrite: <message>` with exit 1, as the two readers print theirs today.

`node agentrite-sandbox.mjs version <name>` reads what the harness printed from its standard input and prints what
its `sandbox.readVersion` gives, or nothing.

`scripts/agentrite-settings.mjs` gains `parseStart(text)` and `readStart(root)`, which return `{ bell, harnesses }`:
`bell` is judged first, by today's `parseBell` and with its messages, and then `harnesses`, by `checkKey` and its key
of `KEYS`, so its message is `agentrite.json: harnesses is missing. It must hold a list of one or more of "claude" and
"opencode"`. Nothing else of the file is judged. `readBell` and the `bell` form of the file's command line are
replaced by them, since only the wrapper used them.

### The image

The last stage of `container/Dockerfile` takes three build arguments without a default, which `container/compose.yml`
gives from the wrapper's variables:

* `HARNESS_PACKAGES`, the words `<package>@<version>` of the project's harnesses, installed by one
  `npm install -g --no-audit --no-fund ${HARNESS_PACKAGES}`. The words are split by the shell; a package comes from a
  module and a version has passed `is_version`, so no word holds a space or a character the shell reads
* `HARNESS_RECORD`, the words `<name>@<version>`, which the label `com.ritenoar.agentrite.harnesses` records after the
  install (R4). It replaces the two labels of the versions, as the decision on the labels allows
* `HARNESS_DIRECTORIES`, the log directories, each made under `/home/agent` and owned, with the directory of the home
  it is in, by the agent, after the agent's account is made. The same instruction writes them, one to a line, to
  `/usr/local/lib/agentrite/log-directories`, which the entrypoint reads. It is the one file the image gains: the
  entrypoint has no other way to learn the directories, since a variable of the compose file would also be in the
  environment of the command, which `docker exec` of `--connect` inherits

The `ENV` of `DISABLE_AUTOUPDATER`, `DISABLE_UPDATES` and `OPENCODE_CONFIG` and the `printf` of
`/etc/opencode/opencode.json` leave the image. The run is given them instead, as `--env` and a mount, which the
decision on the updates allows: `docker exec` of `--connect` inherits the environment that `docker compose run` gave
the container, so the command of every run has the same variables as today.

### The base compose file

`container/compose.yml` gives the build arguments `HARNESS_PACKAGES`, `HARNESS_RECORD` and `HARNESS_DIRECTORIES` from
`SANDBOX_HARNESS_PACKAGES`, `SANDBOX_HARNESS_RECORD` and `SANDBOX_HARNESS_DIRECTORIES`, each with `:?` and today's
message. `KIT_ALLOWLIST` holds the kit's own host, `registry.npmjs.org`, with its comment that it is the probe and what
`npm ci` reaches, followed by `${SANDBOX_HARNESS_ALLOWLIST:?...}`, which the wrapper composes as a comment line with
the reason and a line with the host for each `allow` line. `FIREWALL_PROBE` becomes `registry.npmjs.org` (R8). The
comments that name the two log directories or the harnesses say what they are in general words.

### The wrapper

`container/sandbox.sh` runs the helper's `start` where it reads `bell` today, before the branch is cut and before the
host's harnesses, Docker or npm are asked anything, with `$HOME`, or nothing when it is empty. It replaces the two
node calls of `bell` and of `cleanupPeriodDays`. `--connect` does not run it (R18). What the helper prints is read into
indexed arrays, one per field of a `harness` line and one for each other kind of line, since the wrapper runs under
the bash of macOS, which has no associative arrays and no `mapfile`.

Everything that is written once per harness today, as `claude_code_wanted` and `opencode_wanted`, becomes one loop
over the index of the harnesses:

* `installed_version` runs the harness's command as today and pipes what it printed to the helper's `version`, and
  takes the result only when it passes `is_version`. The message for a command that printed none is today's, with the
  command and the title of the harness
* `read_merged_configuration` hands its inline node script the version arguments of the project's harnesses and reads
  back one line per argument: the value the project's file gives, or a marker for none. A value that holds a line
  break is printed as JSON, so that no version shape matches it. A value the project gives that is not `is_version`
  is refused before anything is installed, with `sandbox.sh: sandbox/compose.project.yml gives <ARGUMENT> as
  '<value>', which is not a version.` and `Give an exact version, as 1.2.3.` (R6). The base compose file no longer
  gives the version arguments, so an argument there is the project's, and the marker handed for the harnesses'
  versions today is no longer needed. The markers handed for the four `SANDBOX_HARNESS_` variables and the kit's
  version remain, since Compose requires them, and in `--connect` the script is handed no argument
* the same script refuses a merged configuration in which `HARNESS_PACKAGES`, `HARNESS_RECORD` or
  `HARNESS_DIRECTORIES` of `build.args`, or `KIT_ALLOWLIST` of `environment`, is not the marker the wrapper handed,
  that is one the project's file sets, with `sandbox.sh: <file> sets <NAME>, which is the kit's to set.` and
  `Remove it from that file.` (R13)
* the labels read are `com.ritenoar.agentrite.harnesses` and the kit's. A word of the record whose version is not
  `is_version` counts as not recorded. When the record names harnesses and they are not, in order, the project's,
  the wrapper prints `sandbox.sh: the image holds the harnesses <names>, and agentrite.json names <names>.
  Rebuilding.`, the names joined as `claude, opencode and codex` would be, and a build is due (R18). The comparison of
  each harness of the project, `needs_build` and `differs_from_image`, then runs as today and prints today's lines
  with the title. An image that records no harness, as one built before this unit, gives today's lines alone (R4, R5)
* `latest_published` is asked for each harness of the project with no origin, all before any line is printed, as
  today, with the harness's package and version argument
* the wrapper exports `SANDBOX_HARNESS_PACKAGES`, `SANDBOX_HARNESS_RECORD`, `SANDBOX_HARNESS_DIRECTORIES` and
  `SANDBOX_HARNESS_ALLOWLIST`, assigned whatever the caller's environment holds (R12), in place of
  `SANDBOX_CLAUDE_CODE_VERSION` and `SANDBOX_OPENCODE_VERSION`
* after the build, it makes each `directory` under the project's log directory, writes each `file` there as the
  cleanup period's file is written today, by `mktemp` in that directory and a rename, readable by all and never
  rewritten, and mounts it. The log directories are mounted last, in the list's order
* the `docker compose run` of both kinds of run takes the `env` lines as `--env` after the terminal's variables, where
  the bell's environment is today, and the `mount` lines, `kit` ones under `$here/`, after the `--mount` directories,
  where the status line's are today, then the `file` mounts, then the log directories. For a project of `claude` and
  `opencode` the run's flags are today's, but for the updates' variables and OpenCode's configuration, which are now
  flags, and the bell's script, which is a file mount in place of the directory

### The entrypoint

`check_log_directory_owners` takes the directories to check as arguments, and a new `log_directory_parents` prints,
from the lines of `/usr/local/lib/agentrite/log-directories`, every directory above each log directory under the home,
each once and in the order they are met. For today's two that is `.claude`, `.local` and `.local/share`, as the loop
holds now (R9). A missing list is refused, naming the file and saying to start the sandbox again with `--rebuild`.
The default of `FIREWALL_PROBE` becomes `registry.npmjs.org`. The recovery message says that removing the volume
discards the harnesses' saved logins, such as Claude Code's, and the comments that name a harness say so as an example
(R2).

## Files

- `scripts/agentrite-harness.mjs`: the `sandbox` members in `Harness` and `HARNESS_CONTRACT`, the kind `records` with
  its `fields`, the typedefs `Mount`, `SandboxFile` and `Given`
- `scripts/harnesses/claude.mjs`, `scripts/harnesses/opencode.mjs`: the `sandbox` group of each
- `scripts/agentrite-cleanup-period.mjs`: `cleanupPeriodOf` in place of `readCleanupPeriod`, no command line
- `scripts/agentrite-settings.mjs`: `parseStart` and `readStart` in place of `readBell`, no `bell` form
- `scripts/agentrite-sandbox.mjs`: new, the helper
- `container/harnesses/claude/managed-settings.json`, `container/harnesses/claude/bell-settings.json`,
  `container/harnesses/opencode/bell-plugin.js`: moved; `container/harnesses/opencode/opencode.json`: new
- `container/Dockerfile`, `container/compose.yml`, `container/sandbox.sh`, `container/entrypoint.sh`: as above
- `container/bell/ring-bell.sh`: its comment names where the hooks and the plugin are
- `templates/project/sandbox/compose.project.yml`: the comment on the hosts the kit admits names no harness's host
- `package.json`: `scripts/agentrite-sandbox.mjs` in `files`
- `tests/agentrite-harness.test.mjs`, `tests/agentrite-cleanup-period.test.mjs`, `tests/agentrite-settings.test.mjs`,
  `tests/agentrite-sandbox.test.mjs` (new), `tests/sandbox-harness-names.test.mjs` (new), `tests/wrapper-fixture.mjs`,
  `tests/sandbox-wrapper.test.mjs`, `tests/harness-versions.test.mjs`, `tests/dockerfile-log-directories.test.mjs`,
  `tests/entrypoint-home-owner.test.mjs`, `tests/compose-allowlist.test.mjs`, `tests/bell.test.mjs`,
  `tests/claude-managed-settings.test.mjs`, `tests/sandbox-project-dockerfile.test.mjs`,
  `tests/package-documents.test.mjs`, and every other sandbox test that writes an `agentrite.json` or asserts a run's
  flags, such as `tests/sandbox-unit-run.test.mjs`, `tests/sandbox-update.test.mjs` and `tests/sandbox-dev.test.mjs`
- `CONTRIBUTING.md`: "Adding a harness"
- `SANDBOX.md`: the allowlist, "Holding a harness version", the image and the log directories of "Where things are
  kept on the host", and what a change of `harnesses` does
- `SETUP.md`: where it says what the image holds or what the kit admits, if it says it
- `changes/0097-the-sandbox-takes-its-harnesses-from-their-modules/record.md`: the log

## Tasks

### The settings a start reads

- [x] In `tests/agentrite-settings.test.mjs`, add cases of `parseStart` and `readStart`, to replace those of
  `parseBell`, `readBell` and the `bell` form: both values of a sound file, in the order of `HARNESSES` and without
  repeats; each of today's refusals of `bell` with its message unchanged; `harnesses` missing, empty, not a list and
  naming an unknown harness, each refused with the message of `checkKey`; a file whose `defaultBranch`, `roles` or
  `standards` is at fault read without a refusal. Then write `parseStart` and `readStart` (R18)
- [ ] Remove `parseBell`, `readBell`, the `bell` form and their cases, in the commit that changes the wrapper, which
  until then runs the `bell` form, so that each commit passes `npm test` (R18)

### The contract and the modules

- [x] In `tests/agentrite-harness.test.mjs`, extend `kindOf` and `contractFaults` with the kind `records`, its
  fields named in the fault, and a case of a record that lacks a field or holds a field of another kind; update the
  test of the members' list to the new count and names (R15)
- [x] Add the `sandbox` members to `Harness` and `HARNESS_CONTRACT`, each with its purpose, and implement them in
  both modules as the table above has them (R1)
- [x] Add to `tests/agentrite-harness.test.mjs`, going over `HARNESSES`: every log directory is relative, with no
  empty part, no `..` and no space; every host is a hostname and every reason is not empty; every environment entry
  is `NAME=value`; every mount's `from` is `kit` or `host` and its target absolute; and no field of a member holds a
  tab or a line break (R1)
- [x] Add the cases of each harness's own: Claude Code's `readVersion` of `2.1.288 (Claude Code)` and OpenCode's of
  `1.18.33` and of `0.0.0-dev-202610030456`, and each of an empty output; Claude Code's `host` with a fake reader, for
  a status line script that is there, missing and a directory, and a `cleanupPeriodDays` that is there, missing, at
  fault and unreadable, with today's messages; OpenCode's `host` giving nothing (R1, R11)
- [x] In `tests/agentrite-cleanup-period.test.mjs`, add cases of `cleanupPeriodOf` with `ProjectFile` values, to
  replace those of `readCleanupPeriod`. Then write `cleanupPeriodOf` in `scripts/agentrite-cleanup-period.mjs` (R11)
- [ ] Remove `readCleanupPeriod`, the command line of `scripts/agentrite-cleanup-period.mjs` and their cases, in the
  commit that changes the wrapper, which until then runs that command line, so that each commit passes `npm test`
  (R11)

### The helper

- [x] Write `tests/agentrite-sandbox.test.mjs`, which runs the helper with node on temporary projects and homes and
  builds what it expects from `HARNESSES`: `start` for each subset of the list that a setting can name, in the list's
  order whatever the setting's order, with `"bell": true` and `false`, with an empty home, and with the reader's
  refusals printed as `agentrite: ...` and exit 1; `version` for each harness; and a usage error with exit 2 (R1, R10,
  R14, R18)
- [x] Write `scripts/agentrite-sandbox.mjs` as above, with an `isMain` as the settings reader has, and add it to
  `files` of `package.json` and to the list of `tests/package-documents.test.mjs` (R1, R18)

### The sandbox

- [ ] Move the three files into `container/harnesses/` with `git mv` and write
  `container/harnesses/opencode/opencode.json` with the content the Dockerfile writes today. Point
  `tests/bell.test.mjs` and `tests/claude-managed-settings.test.mjs` at their new places, and rewrite the test that
  the hooks and the plugin name the files where the wrapper mounts them: the hooks run
  `/etc/agentrite/bell/ring-bell.sh`, the shared mount puts the script there, and the plugin's mount puts it beside
  the script. Add to `tests/agentrite-harness.test.mjs`, going over `HARNESSES`, that every
  `kit` mount names a file of `container/harnesses/<name>/`, that every file there is named by a mount of its
  harness, and that `container/harnesses/` holds a directory only for a harness of the list (R3, R10)
- [ ] Add `tests/sandbox-harness-names.test.mjs`: for `container/Dockerfile`, `container/compose.yml`,
  `container/sandbox.sh`, `container/entrypoint.sh` and `templates/project/sandbox/compose.project.yml`, with the lines
  that are comments removed and, of the entrypoint, the text of `home_volume_recovery`, no line holds, without regard
  to case, the name, title, command, package, version argument, a host, a log directory, or a target or an
  environment name of a mount or an entry of any harness of `HARNESSES` (R2)
- [ ] Rewrite `tests/harness-versions.test.mjs` over `HARNESSES`: the last stage declares the three arguments without
  a default; the label `com.ritenoar.agentrite.harnesses` is set from `HARNESS_RECORD` after the install; the install
  takes `HARNESS_PACKAGES`; the base compose file gives the three from their `SANDBOX_HARNESS_` variables; and the
  search for a version of a harness is built from the names, titles, packages and arguments of the list, with its own
  cases kept (R4)
- [ ] Rewrite `tests/dockerfile-log-directories.test.mjs`: the RUN that goes over `HARNESS_DIRECTORIES` follows the
  agent's account, makes each under `/home/agent`, owns the directory of the home it is in, and writes the list file;
  and the wrapper hands the build the log directories of the project's harnesses (R9)
- [ ] Rewrite `tests/compose-allowlist.test.mjs`: the literal hosts of `KIT_ALLOWLIST` are `registry.npmjs.org`
  alone, the block ends with the line of `SANDBOX_HARNESS_ALLOWLIST`, `FIREWALL_PROBE` is one of the literal hosts,
  and the set of those and the hosts of `claude` and `opencode` is today's six (R7, R8)
- [ ] Extend `tests/entrypoint-home-owner.test.mjs` with `log_directory_parents` over the log directories of
  `HARNESSES` and of a list that shares a parent, and with the refusal of a missing list; make the guard's cases pass
  the directories it gives (R9)
- [ ] In `tests/wrapper-fixture.mjs`, build `hostVersions` and `latestVersions` from `HARNESSES`, with versions no
  release has; give each fake harness a `--version` that prints the first of the bare version, `<name> <version>`
  and `<command> <version>` that its `readVersion` reads as the version, and fail naming the harness when none is;
  answer `npm view` for each package of the list; answer `image inspect` with the record and the kit's label;
  write `imageLabelsText` from a map of versions; answer `config --format json` with the version arguments of the
  list and the markers of the four `SANDBOX_HARNESS_` variables; build `logDirectories` and `logMounts` from the
  list; give `dockerHost`'s stand-in Dockerfile the argument and the label of the record; add a writer of an
  `agentrite.json` with `bell` and `harnesses`, by default every name of the list, which each test that writes
  `{"bell": ...}` today uses (R14)
- [ ] In `tests/sandbox-wrapper.test.mjs`, turn every case that names a harness into a loop over `HARNESSES`: the
  host's versions, the not-installed message, a pre-release, the differing image, the latest published, the
  caller's environment, the status line and the bell. Add, for a project of `claude` and `opencode`, one case that
  holds the whole `docker compose run` of an `--in-place` start against its flags written out, to pin R16. Add the
  cases of R18 and R6: a project of each single harness gets only its package, record, directories, hosts,
  environment, mounts and bell, asks npm and the host of it alone, and is built when the image records both; the
  line that names both lists; `harnesses` missing or at fault refused with the reader's message and no call to
  `docker`, `npm` or a harness; `--connect` with an `agentrite.json` at fault still connects; a version from the
  project's file that is not a version refused before a build; a project's file that sets `HARNESS_PACKAGES` or
  `KIT_ALLOWLIST` refused (R4 to R7, R10 to R13, R16, R18)
- [ ] Update the expected calls of `tests/sandbox-unit-run.test.mjs`, `tests/sandbox-update.test.mjs`,
  `tests/sandbox-project-dockerfile.test.mjs`, `tests/sandbox-dev.test.mjs` and every other test the change of the
  run's flags or of `agentrite.json` touches, through the fixture where they share it (R14, R16)
- [ ] Change `container/Dockerfile`, `container/compose.yml`, `container/entrypoint.sh` and
  `templates/project/sandbox/compose.project.yml` as above, with their comments (R2, R4, R7, R8, R9)
- [ ] Change `container/sandbox.sh` as above, and its opening comment, so that it names no harness but as an
  example (R2, R4 to R6, R10 to R13, R18)
- [ ] Run `npm test` and correct until it passes (R14, R16)

### The documents

- [ ] Rewrite "Adding a harness" of `CONTRIBUTING.md`: under the contract, the `sandbox` group, what each member asks
  of a new harness, and its directory `container/harnesses/<name>/`; remove the entries of the image, the choice of
  its version, its own updates, the directories of its logs, the allowlist hosts, the bell, the status line and the
  session retention; keep those of the login, the trailers, the terminal variables and the rest; and name, among the
  tests, those that go over the list and those of a harness's own (R17)
- [ ] Change `SANDBOX.md`: the probe host is the npm registry and the table of `KIT_ALLOWLIST` says which hosts are
  admitted for which harness and only when the project names it; "Holding a harness version" says the image holds the
  project's harnesses only, records them in one label, and is built again at the next start after `harnesses`
  changes, naming both lists; a harness the project does not name is not in the sandbox; the image and the log
  directories of "Where things are kept on the host" say the same; and any other sentence the change makes untrue,
  such as the self-check's probe (R17)
- [ ] Read `SETUP.md` for what it says of the image, the labels, the allowlist and the probe, and change what is no
  longer true (R17)
- [ ] Check every changed line against the limit of 120 characters (R17)

## Verification

- [ ] `npm test` passes
- [ ] `npm run check-changes` passes after the commits
- [ ] `./sandbox-dev.sh --in-place --rebuild true` builds the image and starts, and `docker image inspect` shows the
  label `com.ritenoar.agentrite.harnesses` with both harnesses; in it, `claude --version` and `opencode --version`
  print the versions of the label, `env` holds `DISABLE_AUTOUPDATER=1`, `DISABLE_UPDATES=1` and `OPENCODE_CONFIG`, and
  the entrypoint's self-check passes with the npm registry as its probe. Where Docker is not reachable from the
  implementer's shell, the record says so and this is left to the human
- [ ] `git grep -n -i -E 'claude|opencode|anthropic|openai' -- container/Dockerfile container/compose.yml
  container/sandbox.sh container/entrypoint.sh templates/project/sandbox/compose.project.yml` shows only comments
  that name a harness as an example, and the recovery message

## Commit Points

- [x] `feature-0097 Plan the sandbox taking its harnesses from their modules`: `plan.md` and the planner's entry in
  `record.md`
- [x] `feature-0097 Read the harnesses of the project at the start of the sandbox`: the settings reader and its tests
- [x] `feature-0097 Give each harness module what the sandbox knows of it`: the contract, the modules, the cleanup
  period's reader, the helper, `package.json` and their tests. The wrapper does not use them yet, and the tree passes
  `npm test`
- [ ] `feature-0097 Take the harnesses of the sandbox from their modules`: the moved files, the Dockerfile, the compose
  files, the wrapper, the entrypoint and the sandbox's tests. The tree passes `npm test`
- [ ] `feature-0097 Describe the sandbox's harness modules`: `CONTRIBUTING.md`, `SANDBOX.md` and `SETUP.md`
- [ ] `feature-0097 Record the implementation and the verification`: the implementer's entries in `record.md`
