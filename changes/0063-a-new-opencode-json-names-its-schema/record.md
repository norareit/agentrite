---
kind: task
status: draft
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
