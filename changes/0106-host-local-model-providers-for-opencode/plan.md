# 0106 OpenCode in the sandbox is given the host's local model providers

## Approach

The host's OpenCode configuration is read where the host's Claude Code settings are read today: in the `host` member
of the harness's module, which `scripts/agentrite-sandbox.mjs` calls at each start for each harness the project
names, before the wrapper asks Docker or npm anything, and whose throw the helper prints as `agentrite: <message>`
and exits 1 on. That gives requirements 1, 2 and 10 their timing and their exit status with no change to the
wrapper's order.

* **What the host member is given.** `sandbox.host(home, read)` becomes `sandbox.host(home, read, start)`, where
  `start` is `{ modelServer, readKit }`: the project's `modelServer`, which the helper has read already, and a reader
  of the harness's own files in `container/harnesses/<name>/`, in the shape of the host reader. Claude Code's and
  Codex's members take neither and do not change. OpenCode's reads nothing with `modelServer` false, and the helper
  calls no member of a harness the project does not name, so requirement 1 holds by construction
* **The reading, kept pure.** A new module, `scripts/agentrite-opencode-providers.mjs`, after the precedent of
  `scripts/agentrite-cleanup-period.mjs`, holds functions that take text and return data: which file of the
  directory is read, the local providers of a parsed configuration with their kept keys and the host of `baseURL`
  replaced, the configuration written for OpenCode, and the line of requirement 9. Each refusal is a throw whose
  message names the file, what is wrong and what to do. OpenCode's `host` member only joins them to the readers
* **Comments and trailing commas.** The kit has no dependency to parse JSONC, so `scripts/agentrite-json.mjs` gains
  `parseJsonc(text)`: it takes out `//` and `/* */` comments and a comma that only white space and comments separate
  from a closing `}` or `]`, leaving the text of strings as it is, and gives the rest to `JSON.parse`
* **The model server's host and port.** `container/compose.yml` sets them, and the kit has no YAML parser, so the new
  module holds them as a constant, `MODEL_SERVER = { host: 'host.docker.internal', port: '11434' }`, and a test
  holds it equal to `MODEL_SERVER_HOST` and `MODEL_SERVER_PORT` of `compose.yml`, read with
  `tests/compose-entries.mjs`, as the allowlist's tests tie the module and the Compose file today
* **A local provider.** Its `options.baseURL` is a string that `new URL` parses, whose `protocol` is `http:`, whose
  `hostname` is `localhost`, `127.0.0.1` or `[::1]`, and whose `port` is `MODEL_SERVER.port`. A `baseURL` that is no
  string or does not parse makes the provider not local. A `provider` key that is absent or not an object holds no
  provider. The replaced `baseURL` is the original text with the host alone replaced: the scheme as written, then
  any user information with its `@`, then `MODEL_SERVER.host`, then the rest of the text from the `:` of the port on,
  unchanged, so `http://localhost:11434/v1` becomes `http://host.docker.internal:11434/v1` and a `baseURL` without a
  path gains no `/`. `new URL(...).href` is not used, since it normalizes the path
* **The kept keys.** Of the provider `npm`, `name`, `options` with `baseURL` alone in it, and `models`; of each model
  `name`, `limit`, `options` and `variants`. Each is copied only when the source holds it, as the source holds it.
  Everything else, at every level, is left out. `models` that is not an object, and a model that is not an object,
  are refused (R11)
* **Where the providers go.** OpenCode's `updates` mounts the kit's `container/harnesses/opencode/opencode.json` at
  `/etc/opencode/opencode.json`, and OpenCode's `OPENCODE_CONFIG` names that path. With local providers, the host
  member gives a file instead, of the kit's configuration as `readKit` reads it with `provider` added, written on one
  line by `JSON.stringify`, at the same target. In `startLines` a file a harness is given of the host stands in the
  place of a mount of the same harness's `updates` at the same target, since Docker refuses two mounts at one
  target; the kit's mount is then left out. The configuration thus holds `"autoupdate": false` beside the providers,
  is read-only to the agent, and stays the file of the highest precedence (R7). With no local provider no file is
  given and the kit's mount is unchanged (R8). The bell's `OPENCODE_CONFIG_CONTENT` is untouched
* **The file's name.** The wrapper writes each file of the host once and never changes it, so the name holds the
  content: `opencode-configuration-<hash>.json`, with `<hash>` the first 16 hexadecimal digits of the SHA-256 of the
  content. A changed host file gives a new name at the next start (R2), and a run under way keeps its own
* **The line of requirement 9.** `Given` gains `notes: string[]`, lines a start prints. `startLines` prints each as
  a line `note\t<text>` after the harnesses' other lines, and `container/sandbox.sh` echoes each to standard error
  as `sandbox.sh: <text>` while it reads the helper's lines, which is before the container starts. The wrapper names
  no harness, as `tests/sandbox-harness-names.test.mjs` requires. Provider names are written in the text with
  `JSON.stringify`, so that a name with a tab or a line break cannot break the line. The texts:
    * `OpenCode is given the local providers "ollama" and "lmstudio" of /home/u/.config/opencode/opencode.json`,
      with `the local provider "ollama"` for one, and names joined by `, ` and a last ` and `
    * `/home/u/.config/opencode/opencode.json holds no local provider on port 11434, so OpenCode is given none`
    * `there is no opencode.json or opencode.jsonc in /home/u/.config/opencode/, so OpenCode is given no local
      provider`
* **The refusals.** With `<path>` the absolute path of the file, `<directory>` that of `~/.config/opencode/`:
    * `cannot read <path>: <error>. Make it readable, or remove it, and start again`
    * `<path> is not a JSON object once its comments and trailing commas are taken out: <reason>. Correct it as
      OpenCode reads it, and start again`, with `<reason>` the parse error, or `it holds <JSON of the value>`
    * `<directory> holds both opencode.json and opencode.jsonc, and the sandbox reads one alone. Keep one, with what
      the other holds moved into it, and start again`
    * `<path>: the models of the local provider "<name>" are not a JSON object. Correct them, and start again`
    * `<path>: the model "<model>" of the local provider "<name>" is not a JSON object. Correct it, and start again`

The readings that are the only ones that work, to be logged in one line each in `record.md` by the implementer as
`AGENTS.md` asks: a `provider` key that is absent or not an object holds no local provider, and a `baseURL` that is no
string or no URL makes its provider not local, since requirements 10 and 11 list every refusal; the file the host
member gives replaces the kit's mount at the same target, since the providers are to be in the kit's configuration
and Docker takes one mount per target; and the line of requirement 9 goes to standard error as the wrapper's other
lines of what it does.

## Files

- `scripts/agentrite-json.mjs`: `parseJsonc`
- `scripts/agentrite-opencode-providers.mjs`: new. `MODEL_SERVER`, the choice of the file, the local providers, the
  configuration for OpenCode, its file's name, the line of requirement 9 and the refusals
- `scripts/harnesses/opencode.mjs`: the `host` member, joining the new module to the readers; the kit configuration's
  path and target named once, for `updates` and for the host member
- `scripts/agentrite-harness.mjs`: `Given` gains `notes`; the `host` member's type takes `start`; its contract purpose
- `scripts/harnesses/claude.mjs`, `scripts/harnesses/codex.mjs`: their `host` gives `notes: []`
- `scripts/agentrite-sandbox.mjs`: passes `{ modelServer, readKit }`; a host file in the place of an `updates` mount at
  its target; the `note` lines; the doc comments of `startLines` and `startText`
- `container/sandbox.sh`: the `note` kind, in the header comment of the helper's lines and in the reading loop
- `package.json`: the new module in `files`
- `tests/agentrite-json.test.mjs`: `parseJsonc`
- `tests/agentrite-opencode-providers.test.mjs`: new, the unit tests of the new module
- `tests/agentrite-harness.test.mjs`: OpenCode's `host` member; Claude Code's and Codex's give `notes: []`
- `tests/agentrite-sandbox.test.mjs`: the helper's start with the host's OpenCode configuration
- `tests/sandbox-wrapper.test.mjs`: the wrapper's start with it; the fixture copies the new module and
  `container/harnesses/opencode/opencode.json`
- `tests/sandbox-dev.test.mjs`, `tests/sandbox-project-dockerfile.test.mjs`: their fixtures copy the new module
- `tests/package-documents.test.mjs`: the new module among the package's files
- `tests/sandbox-harness-names.test.mjs`: `wordsOf` calls `host` with `start`, and a reader that gives a home with one
  local provider, so that the words include what OpenCode is given of it
- `SANDBOX.md`: "The local model server", "What the sandbox defends against", "Where things are kept on the host"
- `COMMANDS.md`: "sandbox.sh"

## Tasks

### JSONC

- [x] In `tests/agentrite-json.test.mjs`, test `parseJsonc`: plain JSON; a `//` comment to the end of a line and a
  `/* */` comment over lines; a trailing comma before `}` and before `]`, also with a comment between; `//`, `/*`
  and `,}` inside a string, and a string with an escaped quote, left as they are; a text that is still not JSON
  throws `JSON.parse`'s error (R3, R16)
- [x] Add `parseJsonc` to `scripts/agentrite-json.mjs` (R3)

### The reading of the host's file

- [x] In `tests/agentrite-opencode-providers.test.mjs`, test that `MODEL_SERVER` equals `MODEL_SERVER_HOST` and
  `MODEL_SERVER_PORT` of `container/compose.yml`, through `environmentEntry` of `tests/compose-entries.mjs` (R4, R5)
- [x] Test the choice of the file: `opencode.json` alone and `opencode.jsonc` alone are read; neither is no file;
  both is refused with its message; one that cannot be read is refused with its message (R3, R8, R10, R16)
- [x] Test the parse: `opencode.jsonc` with comments and trailing commas is read; a text that is not JSON, and one
  that is an array, a string or `null`, is refused with its message (R3, R10, R16)
- [x] Test the local providers: a provider at each of `http://localhost:11434/v1`, `http://127.0.0.1:11434/v1` and
  `http://[::1]:11434/v1` crosses with `baseURL` at `http://host.docker.internal:11434/v1`; a `baseURL` without a
  path gains no `/`; one with user information keeps it; providers at another host, such as `192.168.1.2` and
  `api.openai.com`, at another port, at the default port, over `https`, with a `baseURL` that is no string or no URL,
  or with none, do not cross; a `provider` that is absent or not an object gives none (R4, R5, R16)
- [x] Test the kept keys, with a provider that holds every kept key and beside them `apiKey` and `headers` at its
  top and in its `options`, `id`, `env`, `whitelist` and an unknown key, and models that hold every kept key and
  beside them `id`, `apiKey`, `headers`, `reasoning` and an unknown key: the result holds the kept keys alone, each
  as written, `options` and `variants` of a model whole; a provider without `models` crosses without it (R5, R16)
- [x] Test the refusals of `models` that is an array, a string or `null`, and of a model that is not an object, each
  with its message naming the file, the provider and the model (R11, R16)
- [x] Test the configuration for OpenCode: from a host file that holds `model`, `plugin`, `mcp`, `permission` and
  `$schema` beside `provider`, it is the kit's configuration with the local providers as `provider` and nothing else
  of the host's file, holds `"autoupdate": false`, is one line with no tab, and its file's name is
  `opencode-configuration-<hash>.json` with the hash of the content, different for a different content (R2, R6, R7,
  R16)
- [x] Test the line of requirement 9 for one provider, for two, for three, for a file with no local provider, and
  for no file, each with the full path (R9, R16)
- [x] Write `scripts/agentrite-opencode-providers.mjs` to pass them, and add it to `files` of `package.json` and to
  the expected files of `tests/package-documents.test.mjs` (R3, R4, R5, R9, R10, R11)

### OpenCode's host member and the helper

- [ ] In `scripts/agentrite-harness.mjs`, add `notes: string[]` to `Given` and the `start` argument to the type of
  `sandbox.host`, and update its purpose in `HARNESS_CONTRACT`. Give `notes: []` in Claude Code's and Codex's `host`,
  and in the `nothing` of `startText`, and update the expected values of `tests/agentrite-harness.test.mjs`. The suite
  passes with no change of behavior (R9)
- [ ] In `tests/agentrite-harness.test.mjs`, test OpenCode's `host`: with `modelServer` false it calls neither reader
  and gives nothing, also for a home whose file is not JSON; with `modelServer` true and a local provider it gives the
  file at `/etc/opencode/opencode.json` and the line; with no file, or no local provider, it gives no file and the
  line; each refusal of the module is thrown through it (R1, R7, R8, R9, R10, R11)
- [ ] Write OpenCode's `host` member. Name the kit configuration's path, `opencode.json`, and target,
  `/etc/opencode/opencode.json`, once in `scripts/harnesses/opencode.mjs`, for `updates` and for `host` (R1, R7, R8)
- [ ] In `tests/agentrite-sandbox.test.mjs`, test the helper's start: with `"modelServer": true` and `opencode` and a
  home with a local provider, it prints the `file` line of the configuration at `/etc/opencode/opencode.json`, no
  `mount` line of the kit's `opencode.json` and the `note` line, and still the `env` line of `OPENCODE_CONFIG`; with
  `"modelServer": false`, or without `opencode`, and a home whose `opencode.json` is not JSON, it prints what it
  prints today and exits 0; with no file or no local provider it prints the kit's mount and the `note` line; each
  refusal is on standard error alone as `agentrite: <message>`, with nothing on standard output, and exits 1; with
  an empty home it prints what it prints today (R1, R7, R8, R9, R10, R11, R16)
- [ ] In `scripts/agentrite-sandbox.mjs`, pass `{ modelServer, readKit }` to each `host`, with `readKit` reading
  `container/harnesses/<name>/` of the kit; leave out an `updates` mount whose target a host file of the same harness
  has; print each note as `note\t<text>`; update the doc comments (R1, R7, R9)
- [ ] Update `wordsOf` in `tests/sandbox-harness-names.test.mjs` as "Files" says, and run that suite (R7)

### The wrapper

- [ ] In `tests/sandbox-wrapper.test.mjs`, copy the new module and `container/harnesses/opencode/opencode.json` into
  the fixture's kit, and the new module into the fixtures of `tests/sandbox-dev.test.mjs` and
  `tests/sandbox-project-dockerfile.test.mjs`
- [ ] In `tests/sandbox-wrapper.test.mjs`, for each start form, test: with `"modelServer": true`, `opencode` and a host
  `opencode.jsonc` with comments, a local provider and an `apiKey`, the run mounts
  `<logs>/opencode-configuration-<hash>.json` read-only at `/etc/opencode/opencode.json` and not the kit's file, the
  file holds `"autoupdate": false` and the provider with the host replaced and no `apiKey`, and standard error holds
  the line, and no mount has the host's file as its source; with `"bell": true` besides, the bell's environment and
  mounts are there too; a changed host file gives a new file at the next start with no build between, and the first
  file is left; with `"modelServer": false` and a host file that is not JSON, the start goes on as today; with no file
  it goes on with the kit's mount and the line; each refusal exits 1 with its message on standard error and no call
  of Docker or npm (R1, R2, R6, R7, R8, R9, R10, R11, R16)
- [ ] Test that `--connect` reads nothing of a host file that is not JSON and is not refused for it (R1)
- [ ] In `container/sandbox.sh`, add the `note` kind to the comment of the helper's lines and to the reading loop,
  echoing `sandbox.sh: <text>` to standard error (R9)

### The documents

- [ ] In "The local model server" of `SANDBOX.md`, say what requirement 12 lists, with the line of requirement 9 (R12)
- [ ] In "What the sandbox defends against" of `SANDBOX.md`, add the row of the host's OpenCode configuration: not
  mounted, of it the keys of the local providers alone, in "The local model server" (R13)
- [ ] In "The project's log directory" of "Where things are kept on the host" of `SANDBOX.md`, add
  `<logs>/opencode-configuration-<hash>.json`, mounted read-only at `/etc/opencode/opencode.json`: the kit's
  configuration of OpenCode with the local providers, written at a start when there are local providers and the file
  is not there yet, one for each content, none changed or removed; and say that removing the directory removes them
  (R14)
- [ ] In "sandbox.sh" of `COMMANDS.md`, say that with `"modelServer": true` and `opencode` among `harnesses` every form
  but `--connect` reads `~/.config/opencode/opencode.json` or `opencode.jsonc` at each start, before Docker or npm,
  the line it prints, and what it refuses with exit status 1 (R15)
- [ ] Check every changed line against the limit of 120 characters

## Verification

- [ ] `npm test` passes
- [ ] `npm run check-changes` passes after the last commit
- [ ] Each requirement 1 to 16 has a ticked task above that names it

## Commit Points

- [x] `feature-0106 Plan giving OpenCode in the sandbox the host's local model providers`: this plan and its log entry
- [x] `feature-0106 Read JSON with comments and trailing commas`: the tasks of "JSONC"
- [x] `feature-0106 Read the local providers of the host's OpenCode configuration`: the tasks of "The reading of the
  host's file"
- [ ] `feature-0106 Give a harness's host member the start, and let it print a line`: the first task of "OpenCode's
  host member and the helper", which changes no behavior
- [ ] `feature-0106 Give OpenCode in the sandbox the host's local providers`: the rest of "OpenCode's host member and
  the helper" and "The wrapper"
- [ ] `feature-0106 Document the host's local providers for OpenCode`: the tasks of "The documents"
