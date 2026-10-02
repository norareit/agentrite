# 0014 Role wrappers that keep to 120 characters a line

## Context

A role wrapper, as `agentrite-roles` and `agentrite init` write it, holds two long lines: the role's description, as
one YAML line of 255 to 375 characters, and the sentence that points at the kit's role file, of about 150. This
repository wraps all code and text at 120 characters, and its own six wrappers, added in 0012, broke that. The
review of 0012 reported it as finding C1.

The human decided that no tracked file here is to hold a line over 120 characters, whatever wrote it. For 0012 the
six wrappers were rewrapped by hand: the description as a folded YAML scalar and the pointer sentence broken after a
word. That leaves them different from what the kit's own command writes. A fresh `init` in any project still writes
the long lines, the refresh command planned in 0013 would write them back over the wrapped ones, and the fixtures
the tests compare the generator with are still long.

## Requirements

1. No line of a role wrapper the kit writes, for either harness and any role, is longer than 120 characters
2. The description is a folded block scalar: the key line is `description: >-`, and the text follows on lines
   indented by two spaces, broken only between words. Joined by single spaces, those lines are the role's
   description exactly as the kit holds it, so a YAML parser reads the same string as before
3. The pointer sentence is broken only between words, and the path of the role file, in its backticks, is on one
   line. Joined by single spaces, the body is the sentence as before
4. Everything else about a wrapper is as it was: the keys and their order, `name` for Claude Code, `mode: subagent`
   for OpenCode, the blank line between frontmatter and body, and the single trailing newline
5. Both harnesses read the wrapped wrappers: OpenCode lists the three roles as subagents, and a new Claude Code
   session has each role's description in full. This is checked with the harness versions the sandbox pins, or the
   record says which versions it was checked with
6. The six wrappers in this repository, under `.claude/agents/` and `.opencode/agents/`, are byte for byte what the
   generator writes
7. No file under `tests/fixtures/` holds a line over 120 characters
8. Every file `init` writes into a project with an ordinary package name holds no line over 120 characters, which a
   test checks for every combination of harnesses
9. `npm test` passes

## Decisions

* **The fix is in the generator, not in each project.** Wrapping by hand, as 0012 did here, has to be repeated in
  every project and undone by every regeneration. Once the generator writes the wrapped form, a project gets it
  from `init`, from `agentrite-roles`, and from `refresh` when 0013 is in
* **A folded scalar, `>-`, for the description.** It is the YAML form made for one long string written over several
  lines: line breaks fold to spaces and `-` drops the final newline, so the value is the same string. A plain
  scalar continued on indented lines folds the same way, but reads as if the indentation were an accident, and a
  description holding a colon followed by a space would break it. A quoted string with escaped line breaks was
  rejected as harder to read. Shortening the descriptions to fit one line was rejected: the description is what a
  harness shows its model when choosing an agent, and the detail is there on purpose
* **Both harnesses were tried before deciding.** On 2026-10-02, in a scratch project with one wrapper in the folded
  form, `opencode agent list` (1.18.34) listed it as a subagent and a fresh `claude -p` session (2.1.287) returned
  its description in full. Those are the host's versions, not the ones the sandbox pins, which requirement 5 covers
* **The limit is 120 and is not configurable.** It is this repository's limit and IntelliJ's default. A project
  with a narrower limit is not served, and a setting for it would be a parameter with one caller
* **This repository's wrappers are written again from the generator,** not kept as 0012 wrapped them. The hand
  wrapping broke lines at 118 characters. What matters is that they equal the generator's output, so that neither
  `refresh` nor a fresh `init` changes them
* **The fixtures change with the generator.** The tests compare the generator's output with them byte for byte, so
  they are the expected output and are wrapped first, as the failing test

## Non-goals

* The other tracked files that hold a line over 120 characters. `package-lock.json` holds five, which npm writes and
  which stay as npm writes them. `changes/0002-role-wrapper-command/plan.md` holds one and is frozen. Five records
  under `changes/history-*` hold 41 between them; a record is not frozen, but rewrapping historical logs is a
  different piece of work from changing the generator
* A test or a check that fails when any tracked file holds a line over 120 characters
* A configurable width
* Wrapping what a project adds to a wrapper
* Norareit's wrappers. They become wrapped when that project next writes them from a release that holds this unit
