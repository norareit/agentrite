---
kind: task
status: in-progress
timestamp: 2026-10-20T18:40:50Z
---

# 0063 A new opencode.json names its schema

## Description

When nothing is at the path of `opencode.json`, `init` with `opencode` among the harnesses writes the file with only
an `instructions` list. OpenCode adds `"$schema": "https://opencode.ai/config.json"` to the file itself, so every
project using OpenCode finds a change to `opencode.json` it did not make, as was seen in a project moving to 7.2.0.
This repository's own `opencode.json` received the key by hand for the same reason. Have `init` write the key
from the start:

* The `opencode.json` that `init` writes when nothing is at its path holds `"$schema"` with the value
  `https://opencode.ai/config.json` as its first key, followed by the `instructions` list it holds now, formatted as
  it is now
* The test of the missing `opencode.json` in `tests/agentrite-instructions.test.mjs` asserts the new content, and so
  does any other test that asserts the written file
* The paragraph of `README.md` on `init` and `opencode.json` says that the file `init` writes when nothing is at its
  path names OpenCode's schema as well as holding the `instructions` list

Afterwards `npm test` passes and `npm run check-changes` exits 0.

Not part of this task:

* An `opencode.json` that exists. `init` amends one by adding to its `instructions` list and keeps every other key as
  it is, and it does not add `$schema` to it. OpenCode adds the key to such a file itself
* `refresh`, which does not write `opencode.json`
* Projects whose `opencode.json` already holds the key. Nothing is migrated

## Log

- 2026-10-20T18:40:50Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, wrote the record. The status is
  `draft`
- 2026-10-20T18:41:51Z [human] approved the record by asking for it to be built. The status is `approved`
- 2026-10-20T18:41:51Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host, cut
  `task-0063-a-new-opencode-json-names-its-schema` from `master` at `698ed17` and began the work. Read
  `roles/implementer.md` of the installed release 7.2.0. The status is `in-progress`
- 2026-10-20T18:43:44Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, built the task in `c21c41c`. The
  `opencode.json` that `opencodeVerdict` gives for a missing file, and `init` writes, now holds
  `"$schema": "https://opencode.ai/config.json"` as its first key, before the `instructions` list, formatted as
  before; an existing file is amended as before, with no `$schema` added. The expected file was changed in the tests
  first, and `tests/agentrite-instructions.test.mjs` failed on the missing file's content before the code changed.
  The tests that assert the written file, in `tests/agentrite-instructions.test.mjs` and
  `tests/agentrite-init.test.mjs`, with the kit's standards and with a project's own, expect the key. In
  `README.md`, the paragraph on `init` and `opencode.json` says the written file names the schema and that an
  amended one gets no `$schema`, and the example of the written file in "How the kit's instructions reach an agent"
  holds the key
- 2026-10-20T18:43:44Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran on `c21c41c`: `npm test`
  passed 747 of 747 tests, and `npm run check-changes` exited 0. Not checked: that OpenCode leaves the written file
  unchanged when it starts in the project
