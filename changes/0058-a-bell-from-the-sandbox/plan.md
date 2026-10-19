# 0058 A bell from the sandbox

## Approach

Written against `8cc88d6` on `feature-0058-a-bell-from-the-sandbox`. Before the work, `npm test` reports 682 tests:
680 pass, 1 is skipped (the Docker test of `tests/sandbox-signal.test.mjs`, in a sandbox with no Docker) and 1 fails.
The failing one is unit 0054's R24 test in `tests/repository-own-files.test.mjs`, which holds the root
`agentrite.json` byte for byte against the installed release's template. Commit `8cc88d6` gave the root file
`standards` and `roles`, which the installed 7.1.0 template lacks. This unit does not fix it, since it is no part of
the spec, and it adds `bell` to the root file besides, so the test fails on one more key. Every other test is kept
green at every commit point.

The work is in four steps, each a commit of its own:

1. **The key.** `bell` becomes a required key of `agentrite.json`, judged by every command that judges the file, and
   written by `init` and `config`. A second reader judges `bell` alone, for a start of the sandbox (R6 to R9, R11)
2. **What rings.** Three files of the kit's, under a new `container/bell/`, which the wrapper mounts: a script that
   writes the bell to the session's terminal, Claude Code's hooks that run it, and OpenCode's plugin that runs it.
   Tests of each, and the Docker test that a bell passes out of a container (R1, R3, R4, R5, R10)
3. **The start.** `container/sandbox.sh` reads `bell` at each start but `--connect`, before anything else is asked
   or done, and with `true` mounts the files of step 2 and gives OpenCode the plugin (R1 to R3, R6, R7, R11)
4. **The documents** (R13, R14, and `CONTRIBUTING.md` and the comments that the unit makes untrue)

Last comes the check by hand (R12), which the implementer does on the host with the human, in tmux.

### Decided here, so that the implementer does not re-derive it

**The reading of R3.** R3 names `agentrite run --headless` as an example of a run with no terminal, which it is when
a script starts it. A headless run started from a terminal has that terminal, and Claude Code runs its `Stop` hooks
in `--print` too, so it rings once, at its end. The plan builds what R3 says of a run with no terminal: the script
finds none, writes nothing, prints nothing and exits 0, and the plugin swallows every failure.

**How each harness is given the bell, at each start and with nothing in the home volume (R1, R2, R6).**

* Claude Code reads a drop-in directory of managed settings, `/etc/claude-code/managed-settings.d/`, beside
  `/etc/claude-code/managed-settings.json`. The image's Claude Code 2.1.303 holds the name of that directory. The
  wrapper mounts `container/bell/claude-managed-settings.json` read-only at
  `/etc/claude-code/managed-settings.d/agentrite-bell.json`. So the status line's mount stays as it is, and the
  hooks hold with or without the status line. Managed hooks are added to the hooks of every other level, so a hook
  the developer sets in the home volume runs besides (R4)
* OpenCode reads the variable `OPENCODE_CONFIG_CONTENT`, a configuration in JSON merged over the others, and loads a
  plugin named in its `plugin` list by a `file://` URL, with no install. The image's OpenCode 1.19.3 holds both. The
  wrapper gives the run `--env 'OPENCODE_CONFIG_CONTENT={"plugin":["file:///etc/agentrite/bell/opencode-plugin.js"]}'`.
  `OPENCODE_CONFIG_DIR` is not used: OpenCode installs `@opencode-ai/plugin` into each configuration directory, which
  a read-only mount refuses. A plugin the developer puts in the home volume's `~/.config/opencode/plugins/` is loaded
  besides (R4)
* The whole of `container/bell/` is mounted read-only at `/etc/agentrite/bell`. A `docker exec` of `--connect`
  inherits the run's mounts and environment, so a harness started by `--connect` rings as the run says
* With `false`, nothing of these is mounted or given, and the run is the one of today (R6)
* Both are mounted from the kit at each start rather than built into the image: a start picks up a change of `bell`
  and of the kit with no rebuild (R7), as the status line is

**The script, `container/bell/ring-bell.sh` (R3, R4).** POSIX `sh`, as `container/known-terminal.sh` is, so that
its tests run on any host. It writes the one byte BEL, `printf '\a'`, and nothing else. Where to:

1. `/dev/tty`, the controlling terminal, when it opens
2. Otherwise the first of the file descriptors 0, 1 and 2 of its parent, then of the parent's parent and so on, that
   `readlink /proc/<pid>/fd/<n>` gives as a path under `/dev/pts/`. The parent of a process is the `PPid:` line of
   `/proc/<pid>/status`. The walk stops at pid 1 and at a process it cannot read, which in the sandbox is every
   process of root's. This is for a harness that starts its hooks with no controlling terminal: its own output is
   still the terminal
3. Otherwise nowhere

Every error of a write, a `readlink` and a read of `/proc` goes to `/dev/null`. It reads nothing from its standard
input, which a hook of Claude Code fills with JSON, prints nothing and always exits 0, so that no harness shows an
error or output for it (R3). A comment says why the walk is there.

**The hooks, `container/bell/claude-managed-settings.json` (R1).** Exactly:

```json
{
  "hooks": {
    "Notification": [{ "hooks": [{ "type": "command", "command": "sh /etc/agentrite/bell/ring-bell.sh" }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "sh /etc/agentrite/bell/ring-bell.sh" }] }]
  }
}
```

With no `matcher`, the `Notification` hook runs at every kind of notification. Laid out as the implementer likes,
within the line limit. The managed settings stand above every other level, so the file holds `hooks` and nothing
else.

**The plugin, `container/bell/opencode-plugin.js` (R1).** An ES module whose one export is
`export const RingBell = async () => ({ event: async ({ event }) => ... })`. On an event whose `type` is
`session.idle` or `permission.asked` it runs `sh` with the script that lies beside it, found as
`fileURLToPath(new URL('./ring-bell.sh', import.meta.url))`, so that the plugin names no mount path. `spawn` of
`node:child_process`, with `stdio: 'ignore'` and not detached, so that the script has OpenCode's controlling
terminal. The handler awaits the child's `exit` or `error` and resolves either way: OpenCode is not left with a
rejected promise, nothing is printed, and a test can wait for it. Other events do nothing. The image's OpenCode has
no event `permission.updated`, the older name the human's own plugin also listens to, so it is not listened to. The
plugin imports nothing but `node:` modules.

**The settings (R6, R8, R9).** In `scripts/agentrite-settings.mjs`:

* `KEYS` gets `{ name: 'bell', holds: (value) => typeof value === 'boolean', must: 'true or false' }` after
  `sandbox`. The type `Settings` gets `bell: boolean`, `parseSettings` returns it, and `settingsText` writes
  `  "bell": <true|false>,` after the line of `sandbox`. `MUST_HOLD_OBJECT` names the six keys from `KEYS` as it does
  the five. So every command that judges the file refuses a missing or wrong `bell` with
  `agentrite.json: bell is <missing|JSON of the value>. It must hold true or false`, as it does any key (R8)
* The message of one key at fault is built in one place, a function that `parseSettings` and the reader below both
  call with the entry of `KEYS`, so that the two readers word it alike
* A pure `parseBell(text)` returns the value of `bell` and judges no other key (R7). It throws:
    * for a text that is not JSON: `agentrite.json is not JSON: <error>, so bell cannot be read. It must hold true
      or false`
    * for JSON that is no object: `agentrite.json holds <JSON>, which is no JSON object, so bell is missing. It must
      hold true or false`
    * for a missing or wrong key: the message of one key at fault, above
* `readBell(root)` reads `<root>/agentrite.json` and calls `parseBell`. A file that is missing:
  `the project has no agentrite.json, so bell is missing. It must hold true or false. Run: npx agentrite config,
  which writes one`. A file that cannot be read: `cannot read agentrite.json: <error>, so bell cannot be read. It
  must hold true or false`
* The file run as a command takes a second form, `node agentrite-settings.mjs <project root> bell`, which prints
  `true` or `false` from `readBell`, or `agentrite: <message>` on standard error and exits 1. The first form, which
  `container/unit-clone.sh` runs for the default branch, stays as it is. Any other argument prints the usage, now
  `usage: node agentrite-settings.mjs <project root> [bell]`, and exits 2
* `templates/project/agentrite.json` gets `"bell": true` after `"sandbox"`. `settingsToWrite` in
  `scripts/agentrite.mjs` takes `bell` from the template, as it takes `standards` and `roles`, so `init` with
  arguments writes `true`, also with `--no-sandbox` (R9). `config` writes the template as it is. No code writes
  into a file that exists, which stays true; the tests below hold it
* The root `agentrite.json` of this repository gets `"bell": true` after `"sandbox"` in the same commit, because the
  working tree's commands and `./sandbox-dev.sh` read it

**The start (R6, R7).** In `container/sandbox.sh`, right after the refusal of a run with nothing to mount and before
the unit's branch is found or cut, and not for `--connect`:

```bash
bell="$(node "$here/../scripts/agentrite-settings.mjs" "$root" bell)" || exit 2
```

The reader prints its own message. So a refused start has asked nothing of the host's harnesses, Docker or npm, and
cut, cloned and mounted nothing. With `true`, after the status line's mounts, `mounts` gets
`--volume "$here/bell:/etc/agentrite/bell:ro"` and
`--volume "$here/bell/claude-managed-settings.json:/etc/claude-code/managed-settings.d/agentrite-bell.json:ro"`,
and the two `run` calls get the `--env` of OpenCode beside `terminal_environment`. The header comment of the wrapper
and the head comment of `container/compose.yml`, which list what the wrapper adds, name the bell.

**The test projects.** Every `agentrite.json` that a test writes for a command that judges the whole file gets
`"bell"`. The wrapper's tests that do not test the bell give their project an `agentrite.json` of `{"bell": false}`
alone, which also holds R7's "judges no other key", so that their recorded calls stay as they are. The project of
`tests/sandbox-unit-run.test.mjs`, whose file is read whole when a branch is cut, gets `"bell": false` in
`settingsFor`. The wrapper finds the reader at `<container>/../scripts/agentrite-settings.mjs`, so a test that
copies `container/sandbox.sh` alone copies `scripts/agentrite-settings.mjs` and `scripts/agentrite-roles.mjs` beside
it, as `tests/sandbox-unit-run.test.mjs` does today.

**The Docker test (R10).** In `tests/bell.test.mjs`, beside the script's tests. Under `script` of util-linux, which
gives it a terminal, it runs `docker run --rm -t --init` with `--read-only`, the `cap_drop`, `cap_add` and
`security_opt` of `container/compose.yml`, on the base image of `container/Dockerfile`, the command
`setpriv --reuid=1000 --regid=1000 --clear-groups -- sh -c "printf 'x\ay' > /dev/tty"`, and finds `x`, BEL, `y` in
what `script` printed. It is skipped as `tests/sandbox-signal.test.mjs` skips, with the same reason, where `docker
info` fails, and with `skipReason` where `script` is not on the PATH. The reading of a list of the compose file,
`listEntries` of `tests/sandbox-signal.test.mjs`, moves to a module of its own, `tests/compose-entries.mjs`, which
both tests import, since this is its second use.

## Files

- `scripts/agentrite-settings.mjs`: the key `bell`, the shared message of a key at fault, `parseBell`, `readBell`,
  the second form of the command
- `scripts/agentrite.mjs`: `settingsToWrite` writes `bell` from the template
- `templates/project/agentrite.json`: `"bell": true`
- `agentrite.json`: `"bell": true`
- `container/bell/ring-bell.sh`: new, the script
- `container/bell/claude-managed-settings.json`: new, Claude Code's hooks
- `container/bell/opencode-plugin.js`: new, OpenCode's plugin
- `container/sandbox.sh`: reads `bell` at a start, mounts and gives the bell, the header comment
- `container/compose.yml`: the head comment
- `tests/agentrite-settings.test.mjs`: `bell` in `parseSettings`, `settingsText`, `parseBell`, `readBell` and the
  command's second form
- `tests/agentrite-init.test.mjs`, `tests/agentrite-config.test.mjs`, `tests/agentrite-refresh.test.mjs`: the
  written file, a file that lacks `bell`, and the fixtures
- `tests/agentrite-run.test.mjs`: `agentrite roles` with a file that lacks `bell`
- `tests/installed-kit.mjs`: `kitSettingsText` writes `bell`, `true` unless it is given
- `tests/check-changes.test.mjs`, `tests/sandbox-update.test.mjs`, `tests/settings-update.test.mjs`,
  `tests/sandbox-unit-run.test.mjs`, `tests/sandbox-dev.test.mjs`: the fixtures, and the calls that change with them
- `tests/sandbox-wrapper.test.mjs`: the fixture, and the start for each value of `bell`
- `tests/bell.test.mjs`: new, the script, the plugin, the hooks file, and the Docker test
- `tests/compose-entries.mjs`: new, `listEntries` moved out of `tests/sandbox-signal.test.mjs`
- `tests/sandbox-signal.test.mjs`: imports `listEntries`
- `SANDBOX.md`: the section "The bell"
- `README.md`: the key `bell`, the start that reads it, and updating a project to the release
- `CONTRIBUTING.md`: the tests that a host without Docker, or without `script`, skips

## Tasks

### 1. The key

- [x] In `tests/agentrite-settings.test.mjs`, test `parseSettings` with the default file and each value of `bell`:
  `true` and `false` are returned, and absent, `null`, `0`, `"true"`, `[]` and `{}` are each refused with
  `agentrite.json: bell is <missing|JSON>. It must hold true or false`. Test that `settingsText` writes `bell` after
  `sandbox`, and that the template is `settingsText` of its own settings byte for byte. See them fail (R6, R8, R9,
  R11)
- [x] In the same file, test `parseBell` for the same values, and for a text that is not JSON and JSON that is no
  object, with the messages of the approach. Test that it takes a file of `bell` alone, and one whose other keys are
  all wrong. Test `readBell` for a project with no file. Test the command's second form: it prints `true` or `false`
  and exits 0, prints `agentrite: <message>` and exits 1 for a file at fault, and prints the usage and exits 2 for
  another argument. See them fail (R6, R7, R11)
- [x] Add `bell` to `KEYS`, the type, `parseSettings`, `settingsText`, extract the message of a key at fault, add
  `parseBell`, `readBell` and the second form, in `scripts/agentrite-settings.mjs` (R6, R7, R8)
- [x] Add `"bell": true` after `"sandbox"` to `templates/project/agentrite.json` and to the root `agentrite.json`,
  and take `bell` from the template in `settingsToWrite` (R9)
- [x] In `tests/agentrite-init.test.mjs` and `tests/agentrite-config.test.mjs`, test that the file `init` writes
  from its arguments holds `"bell": true` after `"sandbox"`, with and without `--no-sandbox`, and that `config`
  writes it. Test that `init`, `config` and `refresh` in a project whose `agentrite.json` lacks `bell` leave the file
  byte for byte as it was: `init` and `refresh` refuse it naming `bell`, and `config` skips it (R8, R9, R11)
- [x] Test that one more command that judges the whole file, `agentrite roles`, refuses a file that lacks `bell` and
  one whose `bell` is `"true"`, naming the key, and exits other than 0 (R8, R11)
- [x] Add `"bell"` to every `agentrite.json` the suite writes for a command that judges the whole file, in the
  files the "Files" section names. Give `settingsFor` of `tests/sandbox-unit-run.test.mjs` `"bell": false` (R6, R8)

### 2. What rings

- [x] In `tests/bell.test.mjs`, test the script, each case run with `spawnSync`:
    * With no terminal anywhere, a new session with pipes for its standard streams (`setsid` when the host has it):
      exits 0, with nothing on its standard output or error (R3)
    * Under `script` of util-linux: what `script` prints holds BEL, and nothing else from the script (R4)
    * Under `script`, started by `sh -c` as `setsid sh ring-bell.sh </dev/null >/dev/null 2>&1`, so that it has no
      controlling terminal and its parent's output is the terminal: what `script` prints holds BEL (R1)
    * With JSON on its standard input, as a hook is given: the same as without

  The last three are skipped with `skipReason` where `script` or `setsid` is not on the PATH. See them fail
- [x] Add `container/bell/ring-bell.sh` as the approach gives (R1, R3, R4)
- [x] In `tests/bell.test.mjs`, test that `container/bell/claude-managed-settings.json` holds exactly the hooks of
  the approach. See it fail, then add the file (R1)
- [x] In `tests/bell.test.mjs`, test the plugin: copy `container/bell/opencode-plugin.js` into a temporary
  directory beside a stand-in `ring-bell.sh` that appends a line to a file, import it, and call its handler with
  events of the types `session.idle`, `permission.asked` and `message.updated`. The first two each append a line and
  the third none. With a stand-in that exits 1, the handler resolves and nothing is printed. See it fail, then add
  the plugin (R1, R3)
- [x] Move `listEntries` to `tests/compose-entries.mjs`, taking the text of `container/compose.yml` as it reads it
  today, and import it in `tests/sandbox-signal.test.mjs`. The test there passes or skips as before (R10)
- [ ] In `tests/bell.test.mjs`, add the Docker test of the approach. On a host with Docker and `script`, run it and
  see it pass; in the sandbox it is skipped with the reason of `tests/sandbox-signal.test.mjs` (R5, R10)

### 3. The start

- [x] In `tests/sandbox-wrapper.test.mjs`, give `setUp`'s project an `agentrite.json` of `{"bell": false}` and the
  kit's two scripts beside the copied wrapper, and see the existing tests pass unchanged (R7)
- [x] In `tests/sandbox-wrapper.test.mjs`, test a start with `--in-place` and one with `--workdir` for each value of
  `bell`, with a file that holds `bell` alone:
    * `true`: the `run` holds the two mounts of `container/bell/` and the `--env` of OpenCode, after the status
      line's mounts when the host has a status line, and with none of the host's
    * `false`: the `run` is the one of today
    * absent, `null`, `0`, `"true"`, `[]`, `{}`, a file that is not JSON, JSON that is no object, and no file: the
      wrapper exits 2, prints the reader's message, which names `agentrite.json`, `bell`, what it holds or that it is
      missing, and `true or false`, and `docker` and `npm` were not called

  See them fail (R1, R2, R6, R7, R11)
- [x] In `tests/bell.test.mjs`, test that the path the command of `container/bell/claude-managed-settings.json`
  runs is the path at which `container/sandbox.sh` mounts `container/bell/`, read from the wrapper's text. See it
  fail (R1)
- [x] In `tests/sandbox-wrapper.test.mjs`, test that a start reads the file again at each start: one start with
  `false`, the file changed to `true`, and the next start mounts the bell with no build in between (R7)
- [x] In `tests/sandbox-unit-run.test.mjs`, test that a unit run with `"bell": true` mounts the bell in its `run`,
  that a unit given by a number with no branch and a file lacking `bell` is refused before a branch is cut, so that
  no branch and no clone are made, and that `--connect` with a file lacking `bell` still connects, reading nothing
  (R3, R7)
- [x] In `tests/sandbox-dev.test.mjs`, test that `./sandbox-dev.sh` with `"bell": true` passes the bell to the
  working copy's wrapper, whose `run` holds the mounts (R3)
- [x] Read `bell` in `container/sandbox.sh` and add the mounts and the `--env`, as the approach gives, with the
  header comment and the head comment of `container/compose.yml` (R1, R2, R3, R6, R7)

### 4. The documents

- [ ] `SANDBOX.md`: a section "The bell" right after "The status line", with each point of R13: when each harness
  rings; that it rings in every project whose `agentrite.json` holds `"bell": true`, which `init` and `config`
  write, with nothing to set in the home volume or on the host; that the bell reaches the host's terminal and through
  it tmux, which marks the window; that the host's own hooks, plugins and settings of a bell do not hold in the
  sandbox, and that a hook that calls `tmux` cannot work there, since tmux runs on the host; that `"bell": false`
  turns it off from the next start; that a bell set in the home volume rings besides; and that managed settings from
  the claude.ai console may make Claude Code ignore the kit's, as "The status line" says, and it then rings as that
  policy says. A run with no terminal rings nothing. No HTML, and the refusal of a `bell` at fault is not described
  in it, since its message says why and what to do (R13)
- [ ] `README.md`, "The project's settings": `bell` in the table, after `sandbox`, read by `./sandbox.sh` at each
  start; six keys where it says five; the default file with `"bell": true`; that `bell` is required and is `true` or
  `false`, not a string; that it is read at each start of the sandbox, by every form but `--connect`, which judges it
  alone, and that it has no effect outside the sandbox; and in "What to run afterwards", that a change of `bell`
  needs nothing and holds from the next start. Change the bullet that says which forms of `./sandbox.sh` do not read
  the file (R14)
- [ ] `README.md`, "sandbox.sh" in "Commands": that a start but `--connect` reads `bell` and refuses, starting
  nothing, a file that lacks it or whose `bell` is neither `true` nor `false`, and "The bell" among the sections of
  `SANDBOX.md` it names. "The sandbox": a bullet of "What a run does" that the sandbox rings, naming "The bell" (R14)
- [ ] `README.md`, "Updating a project to a newer kit": a project whose `agentrite.json` lacks `bell` adds
  `"bell": true,` after `sandbox` before any command that reads the file runs again, as it says of `standards` and
  `roles` (R8)
- [ ] `CONTRIBUTING.md`: the host without Docker skips the two tests that need it, the signal and the bell, and a
  host without `script` of util-linux skips the tests of the script that need a terminal (R10)
- [ ] Check every line changed against the limit of 120 characters, and that no em dash was written (R13, R14)

## Verification

- [ ] `npm test` in the sandbox: all green but unit 0054's R24 test, which failed before the work, and the skips the
  approach names (R10, R11)
- [ ] `npm test` on the host with Docker: the Docker test passes (R5, R10)
- [ ] `npm run check-changes` passes, on the committed work, and `spec.md` is unchanged
- [ ] `npm pack --dry-run` lists the three files of `container/bell/` (R2)
- [ ] The check by hand of R12, on the host in a tmux pane, with `./sandbox-dev.sh --in-place`, whose
  `agentrite.json` holds `"bell": true`. First confirm that the home volume holds no bell: no `hooks` in
  `~/.claude/settings.json` and nothing in `~/.config/opencode/plugins/`. Then, from another tmux window each time:
    * Claude Code rings when it asks for a permission and when it ends a turn, with the host's
      `~/.claude/statusline-command.sh` there and again with it moved away, which holds the drop-in without
      `managed-settings.json`
    * OpenCode rings when it asks for a permission and when its session goes idle
    * With `"bell": false`, at the next start, neither rings
    * Log in `record.md` what was seen, with `claude --version` and `opencode --version` as they are in the sandbox.
      Should a harness not ring with `"bell": true`, stop and log what was seen: the mechanism of the approach then
      does not hold for that version, and the plan goes back to the planner (R1, R2, R6, R12)

## Commit Points

Each commit is made once `npm test` is green but for the test that failed before the work.

- [x] After task group 1: `feature-0058 Make bell a required key of agentrite.json`
- [x] After task group 2: `feature-0058 Ring the bell from a script, from Claude Code's hooks and from OpenCode's
  plugin`
- [x] After task group 3: `feature-0058 Ring in the sandbox as agentrite.json says, read at each start`
- [ ] After task group 4: `feature-0058 Describe the bell and the key bell`
- [ ] After the check by hand: `feature-0058 Log the check by hand of the bell`
