# 0104 The local model server, admitted only in a project that asks for it

## Approach

`modelServer` follows the path `bell` takes today, from the file to the container, and the firewall gains one
decision at the point where it admits the model server.

**The key.** `modelServer` joins `KEYS` of `scripts/agentrite-settings.mjs` right after `bell`, with the same
`holds` and `must` as `bell`, so `parseSettings` judges it and names it in its messages with no code of its own. It
joins the type `Settings` and `settingsText` at the same place, and the template
`templates/project/agentrite.json` gains `"modelServer": false` after `"bell": true`. `config` writes the template's
text and `init` builds its settings in `settingsToWrite` of `scripts/agentrite.mjs`, which takes
`modelServer: template.modelServer` as it takes `bell`. The key comes after `bell` because the two are the
sandbox's settings that a start reads, and they sit together in the file and in the table of `SETUP.md`.

**The start.** `parseStart` judges `bell`, then `modelServer`, then `harnesses`, and returns `modelServer` in the
type `Start`. `readStart` and the messages for a file that is missing, is not JSON or is not an object stay as they
are: they name `bell`, the first key judged. `startLines` of `scripts/agentrite-sandbox.mjs` prints a line
`modelServer\t<true|false>` right after the line `bell`. `container/sandbox.sh` reads it into `model_server`, which
starts as `false` like `bell`, and only in the branch where `connect` is `0`, so `--connect` reads nothing of it.

**What carries the value.** The kit's `container/compose.yml` gains, beside `MODEL_SERVER_HOST` and
`MODEL_SERVER_PORT`, the entry `MODEL_SERVER_ADMITTED: ${SANDBOX_MODEL_SERVER_ADMITTED:?run the sandbox through the
project's sandbox.sh}`. It is a required variable as `SANDBOX_HARNESS_ALLOWLIST` is, so Compose refuses a start that
does not come through the wrapper. The wrapper exports `SANDBOX_MODEL_SERVER_ADMITTED="$model_server"` beside the
other `SANDBOX_` variables, before the build and the run, and so takes no value of it from the caller's environment.
It is read at every start, so a change of `modelServer` holds from the next start, and the image does not change.

`read_merged_configuration` hands Compose its marker for `SANDBOX_MODEL_SERVER_ADMITTED`, as it does for the
others. The merged `environment.MODEL_SERVER_ADMITTED` is then the marker unless the project's file sets it. The
check comes after that of the build arguments and before that of `KIT_ALLOWLIST`, and prints
`kit-set-model-server`, for which the wrapper writes, and then exits 1:

```text
sandbox.sh: <project compose> sets MODEL_SERVER_ADMITTED, which is the kit's to set.
The local model server is admitted by "modelServer" in agentrite.json. Remove it from that file.
```

**The firewall.** `container/entrypoint.sh` gains a function `admit_model_server <admitted> <host> <port>`. With
`true` it calls `allow_model_server`, which stays as it is. With `false` it adds no rule and logs `local model
server not admitted; "modelServer": true in agentrite.json admits it`. With anything else, an empty value among
them, it stops the start with `die`, naming `MODEL_SERVER_ADMITTED` and what it holds. The top-level call becomes
`admit_model_server "${MODEL_SERVER_ADMITTED:-}" "$MODEL_SERVER_HOST" "$MODEL_SERVER_PORT"`, and the comment of the
inputs names `MODEL_SERVER_ADMITTED`.

Requirement 5 is read as: with `false` the firewall installs no rule that names the host gateway's address or the
model server's port. The rules that admit DNS stay as they are, since the spec's context leaves the project with DNS
to its resolvers and nothing else outside the allowlist. Every other address, the gateway's among them, falls to
the default-deny policy.

**This repository.** The root `agentrite.json` gains `"modelServer": false` after `"bell": true`, as requirement 3
asks. The working tree's `npx agentrite` reads the whole file and would refuse this repository without the key. The
installed release ignores a key it does not know, so `npm run kit`, `npm run check-changes`, `./sandbox.sh` and the
suite's check that the installed release's `refresh` finds the root up to date are not affected.

**The documents.** `SETUP.md`, `COMMANDS.md` and `SANDBOX.md` change where requirements 10 to 14 say. "Updating a
project to a newer kit" in `SETUP.md` gains the paragraph for a file that lacks `modelServer`, as it has for `bell`,
`orchestrator` and `process`, since a start and every command that reads the whole file refuse such a file. The
release notes are written at the release, as `AGENTS.md` says, and not in this unit.

## Files

- `scripts/agentrite-settings.mjs`: `modelServer` in `KEYS`, `Settings`, `parseSettings`, `settingsText`, `Start` and
  `parseStart`, and the doc comments that name the start's keys
- `scripts/agentrite.mjs`: `modelServer` in `settingsToWrite`, and its doc comment
- `scripts/agentrite-sandbox.mjs`: the line `modelServer` of `startLines`, and the doc comments of `startLines` and
  `startText`
- `templates/project/agentrite.json`: `"modelServer": false` after `bell`
- `agentrite.json`: `"modelServer": false` after `bell`
- `container/compose.yml`: `MODEL_SERVER_ADMITTED` from the required `SANDBOX_MODEL_SERVER_ADMITTED`, and its comment
- `container/sandbox.sh`: reading the line `modelServer`, exporting `SANDBOX_MODEL_SERVER_ADMITTED`, the marker and
  the check in `read_merged_configuration`, the refusal, and the comments at the top and over the start lines
- `container/entrypoint.sh`: `admit_model_server`, its call, and the comment of the inputs
- `tests/agentrite-settings.test.mjs`, `tests/agentrite-config.test.mjs`, `tests/agentrite-init.test.mjs`,
  `tests/agentrite-refresh.test.mjs`, `tests/agentrite-run.test.mjs`: the key in the whole file
- `tests/installed-kit.mjs`: `modelServer` in `kitSettingsText`, `false` unless given
- `tests/agentrite-sandbox.test.mjs`, `tests/bell.test.mjs`, `tests/sandbox-dev.test.mjs`,
  `tests/sandbox-only.test.mjs`, `tests/sandbox-project-dockerfile.test.mjs`, `tests/sandbox-unit-run.test.mjs`:
  the key in the files of a start that they write
- `tests/wrapper-fixture.mjs`: `modelServer` in `writeStartSettings`, `MODEL_SERVER_ADMITTED` in the merged
  configuration of the fake `docker`, and a recording of the `SANDBOX_MODEL_SERVER_ADMITTED` each call saw
- `tests/sandbox-wrapper.test.mjs`: what the wrapper hands Compose, and the refusal of a project's file that sets it
- `tests/entrypoint-model-server.test.mjs`: `admit_model_server` for `true`, `false` and anything else
- `tests/compose-allowlist.test.mjs`: the entry of the kit's compose file
- `SETUP.md`, `COMMANDS.md`, `SANDBOX.md`: the documents

## Tasks

The setting:

- [x] In `tests/agentrite-settings.test.mjs`, add `modelServer` to the valid file and to the list of keys of the
  message for a file that is no object, and cover: a file that lacks `modelServer` is refused with
  `agentrite.json: modelServer is missing. It must hold true or false`; `null`, `0`, `"true"`, `[]` and `{}` are
  each refused, naming what the key holds; `true` and `false` are given as written; `settingsText` writes
  `"modelServer"` on the line after `"bell"`, and `parseSettings` of its text gives the settings back (R1)
- [x] Add `modelServer` to `KEYS` after `bell`, to `Settings`, to what `parseSettings` returns and to `settingsText`
  in `scripts/agentrite-settings.mjs`. Add `modelServer = false` to `kitSettingsText` of `tests/installed-kit.mjs`
  and the key to every whole file that the tests named under "Files" write, until the suite passes (R1)
- [x] In `tests/agentrite-config.test.mjs`, cover that `config` writes `"modelServer": false` on the line after
  `"bell"`. In `tests/agentrite-init.test.mjs`, cover that `init` writes it, with and without `--no-sandbox` and with
  `--sandbox-only`, and that `init` with no argument refuses a file that lacks `modelServer` or holds `"false"`,
  with the message of the key (R1, R2)
- [x] Add `"modelServer": false` after `"bell": true` in `templates/project/agentrite.json`, and
  `modelServer: template.modelServer` to `settingsToWrite` of `scripts/agentrite.mjs`, with its doc comment (R2)
- [x] Add `"modelServer": false` after `"bell": true` in the root `agentrite.json`. Run `npx agentrite units` and
  `npm run kit -- refresh` at the root: the first lists the units, the second prints `up to date` for every file
  (R3)

The start:

- [x] In `tests/agentrite-settings.test.mjs`, cover that `parseStart` gives `modelServer`, from a file of `bell`,
  `modelServer` and `harnesses` alone and from a whole file; that it refuses a file that lacks `modelServer` or whose
  `modelServer` is `"true"`, with the message of the key; that a file at fault in `bell` and `modelServer` is refused
  for `bell`, and one at fault in `modelServer` and `harnesses` for `modelServer`; and that another key at fault does
  not stop it (R4)
- [x] Add `modelServer` to `Start` and judge it in `parseStart` between `bell` and `harnesses`, updating the doc
  comments of `parseStart` and `readStart` (R4)
- [x] In `tests/agentrite-sandbox.test.mjs`, give `setUp` and `expected` the key, and cover that `start` prints
  `modelServer\ttrue` and `modelServer\tfalse` on the line after `bell`, and that it refuses a file that lacks the
  key, with the message and exit 1 (R4, R7)
- [x] Print the line in `startLines` of `scripts/agentrite-sandbox.mjs`, taking `modelServer` from `readStart` in
  `startText`, with the doc comments (R4)
- [x] Commit point: the setting and its reading

What carries the value:

- [x] In `tests/compose-allowlist.test.mjs`, cover that the sandbox service of `container/compose.yml` sets
  `MODEL_SERVER_ADMITTED: ${SANDBOX_MODEL_SERVER_ADMITTED:?...}`, a variable Compose requires (R9)
- [x] Add the entry to `container/compose.yml` beside `MODEL_SERVER_HOST`, and change its comment to say that the
  port is admitted only when `modelServer` in the project's `agentrite.json` holds `true`, and that the value is the
  kit's to set (R6, R9)
- [x] In `tests/wrapper-fixture.mjs`, give `writeStartSettings` a `modelServer` that is `false` unless given, give
  the merged configuration of the fake `docker` `MODEL_SERVER_ADMITTED` from `SANDBOX_MODEL_SERVER_ADMITTED`, before
  the project's environment, and record the `SANDBOX_MODEL_SERVER_ADMITTED` of each call as the fake records
  `SANDBOX_HARNESS_ALLOWLIST`, read by a `modelServerAdmitted` that `setUp` returns (R5, R6, R9)
- [x] In `tests/sandbox-wrapper.test.mjs`, cover that a start with `"modelServer": true` hands Compose `true` and one
  with `false` hands it `false`, in the build and in the run; that the value changes at the next start when the file
  changes and nothing is built for it; that the caller's `SANDBOX_MODEL_SERVER_ADMITTED` is not used; that a file
  that lacks `modelServer` is refused before Docker and npm are asked anything; and that a project's file that sets
  `MODEL_SERVER_ADMITTED`, to `true` or to `false`, is refused with the message of the approach, exit 1, and no
  call to Docker or npm. In `tests/sandbox-unit-run.test.mjs`, cover that `--connect` connects with a file that
  lacks `modelServer` (R4, R7, R8, R9)
- [x] In `container/sandbox.sh`, read the line `modelServer` into `model_server` in the loop over the start lines,
  export `SANDBOX_MODEL_SERVER_ADMITTED`, hand Compose the marker for it in `read_merged_configuration`, check
  `MODEL_SERVER_ADMITTED` there after the build arguments, and refuse with the message of the approach. Update the
  comment at the top of the file, the list of the start lines and the comment over `read_merged_configuration`
  (R4, R7, R8, R9)

The firewall:

- [x] In `tests/entrypoint-model-server.test.mjs`, cover `admit_model_server`, with the stand-ins of the file: with
  `true` it makes the one call of `allow_model_server` and logs the line of an admitted server; with `false` it makes
  no call of `iptables` and logs only `[entrypoint] local model server not admitted; "modelServer": true in
  agentrite.json admits it`, also when the host has an IPv4 address; with an empty value and with `yes` it exits 1,
  naming `MODEL_SERVER_ADMITTED` and the value, and makes no call (R5, R6)
- [x] Add `admit_model_server` to `container/entrypoint.sh`, call it in place of the call of `allow_model_server`,
  and name `MODEL_SERVER_ADMITTED` in the comment of the inputs (R5, R6)
- [x] Commit point: the wrapper and the firewall

The documents:

- [x] In "The project's settings" of `SETUP.md`: the row of `modelServer` after `bell` in the table, read by
  `./sandbox.sh` at each start; the key in the default file; nine keys, all nine required, and `modelServer` among
  the keys that are `true` or `false`; a bullet saying that it admits the local model server's port in the sandbox,
  that it is `false` in the file `config` and `init` write, that it is read at each start, so a change holds from
  the next start with no rebuild, and that it has no effect outside the sandbox; the start reading and judging
  `bell`, `modelServer` and `harnesses`, in that order; and `modelServer: nothing. It holds from the next start of
  the sandbox` among what to run afterwards (R10)
- [x] In "Updating a project to a newer kit" of `SETUP.md`, add the paragraph for a file that lacks `modelServer`:
  every command that reads the file and every start but `--connect` refuse it until it is added, and the line, after
  `bell`, is `"modelServer": false`, with `true` for a project that uses a local model server. Change the paragraph
  of `process` to name the three keys a start judges (R10)
- [x] In `COMMANDS.md`: under "agentrite init", that the file it writes holds `modelServer` as `false`; under
  "agentrite config", that the default file holds `"modelServer": false`; under "sandbox.sh", that every form but
  `--connect` reads `bell`, `modelServer` and `harnesses`, that with `"modelServer": true` the local model server's
  port is admitted, that a file lacking `modelServer` or holding anything but `true` or `false` is refused, `bell`
  first, then `modelServer`, then `harnesses`, and that a `sandbox/compose.project.yml` setting
  `MODEL_SERVER_ADMITTED` is refused, with what the message names (R11)
- [x] In "The local model server" of `SANDBOX.md`: the port is admitted only with `"modelServer": true` in the
  project's `agentrite.json`, from the next start; the container then reaches the server's whole API, as any program
  on the host does; and what the server does for a caller, such as pulling a model from a registry the caller names,
  it does from the host, beyond the allowlist and the firewall of the container (R12)
- [x] In "Reaching more hosts" of `SANDBOX.md`, the bullet of the model server says it is there only with
  `"modelServer": true`. In "What the sandbox defends against", the row of the model server's port says the same
  (R13)
- [x] In "When something goes wrong" of `SANDBOX.md`, the entry "The container cannot reach the model of the local
  model server" gives first a project whose `agentrite.json` lacks `"modelServer": true`, with what to do, and then
  the host's firewall, as today (R14)
- [x] Commit point: the documents

## Verification

- [x] `npm test` passes, with the tests that need Docker run on a host that has it (R15)
- [x] `./sandbox-dev.sh --in-place true` on the host logs that the local model server is not admitted, and a
  connection from the container to `host.docker.internal:11434` times out. With `"modelServer"` set to `true` in the
  root `agentrite.json` for the check alone, and set back to `false` after it, the next start logs the server
  admitted at the gateway's IPv4 address, with no change to the image (R5, R6, R7)
- [x] `npm run check-changes` exits 0
- [x] No line of a changed file is longer than 120 characters, but the rows of a Markdown table

## Commit Points

- [x] The setting and its reading: `scripts/agentrite-settings.mjs`, `scripts/agentrite.mjs`,
  `scripts/agentrite-sandbox.mjs`, the template, the root `agentrite.json` and their tests
- [x] The wrapper and the firewall: `container/compose.yml`, `container/sandbox.sh`, `container/entrypoint.sh` and
  their tests
- [x] The documents: `SETUP.md`, `COMMANDS.md` and `SANDBOX.md`
