---
kind: task
status: draft
timestamp: 2026-10-21T15:03:05Z
---

# 0070 BTR names an item beyond the request

## Description

The human has started to refer to the items of a spec's "Beyond the request" section as `BTR1`, `BTR2` and so on,
to save typing. Agents have understood it so far, but nothing committed defines it, and a reply to a specifier
usually holds two numbered lists, the spec's "Beyond the request" and the message's "Needed from you", so a bare
number could be read as an item of either. Define the abbreviation where every role and work in no role reads it:

* `process.md` says, directly after its bullet on what `spec.md` states, that the human may refer to item *n* of a
  spec's "Beyond the request" section as `BTR<n>`, such as `BTR2`, and that it names that item of the spec of the
  unit under discussion, never an item of a message's "Needed from you" list
* No other file defines it or repeats it

Afterwards the lines of `process.md` are within 120 characters, `npm test` passes and `npm run check-changes` exits 0.

Not part of this task:

* Agents writing `BTR<n>` in their own messages. The human declined it: the term is clear without being used back
* Labeling the items of `templates/changes/spec.md` as `BTR1`, `BTR2`. The human declined it: the list is numbered
  already, and the definition is enough

## Log

- 2026-10-21T15:03:05Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `1ce8f23`, on the human's request to define their abbreviation `BTR<n>` for item *n* of a spec's
  "Beyond the request". Nothing committed used or defined it. The human chose `process.md` as its place, since every
  role and work in no role reads it while the specifier's role file and the spec template are read only by whoever
  writes a spec, and chose the kind `task`. Numbered 0070: the highest number in `changes/` is 0069. Wrote this
  record. The status is `draft`
- 2026-10-21T15:04:25Z [human] approved the record. The status is `approved`
