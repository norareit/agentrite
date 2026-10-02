# 0014 Role wrappers that keep to 120 characters a line

## Approach

The change is in `scripts/agentrite-roles.mjs`, in the two functions that render a wrapper, and nowhere else:
`agentrite init` takes its wrappers from `plannedFiles` in that file.

One pure function does the breaking: `wrapWords(text, width, indent)` returns the text as lines, each starting with
`indent` and holding as many whole words as fit in `width` characters including the indent, and never breaks inside
a word. `claudeFile` and `opencodeFile` use it twice: for the description, with an indent of two spaces under a
`description: >-` line, and for the pointer sentence, with no indent. The width is one constant, 120.

The path of the role file contains no space, so breaking between words cannot split it.

The fixtures are the expected output, so they change first. The test for OpenCode reads the description out of the
Claude fixture with a pattern that expects it on one line; it is rewritten to take the folded block instead.

0013's `refreshedWrapper` treats the indented lines under a key as part of that key, so the folded description is
one block to it, and the two units can land in either order.

Start from `master` once 0012 is merged into it, since this repository's own wrappers arrive with 0012.

## Files

- `tests/fixtures/claude-agents/planner.md`, `implementer.md`, `reviewer.md`: the wrapped form
- `tests/agentrite-roles.test.mjs`: unit tests of `wrapWords`; the OpenCode test reads the folded description; a
  test that no line of any planned wrapper is over 120 characters and that the description unfolds to the same text
- `tests/agentrite-init.test.mjs`: a test that no file `init` plans holds a line over 120 characters
- `scripts/agentrite-roles.mjs`: `wrapWords`, the width constant, the two render functions
- `.claude/agents/*.md`, `.opencode/agents/*.md`: written again from the generator
- `changes/0014-wrap-generated-wrappers/record.md`: the log

## Tasks

- [ ] Write unit tests of `wrapWords` in `tests/agentrite-roles.test.mjs`: a text shorter than the width is one
  line; a longer one breaks at the last space that fits, and no line is longer than the width; the indent starts
  every line and counts toward the width; a word longer than the width stays whole on a line of its own; the lines
  joined by single spaces, without the indent, are the text. See them fail (R1, R2, R3)
- [ ] Rewrite the three fixtures in the wrapped form: `description: >-`, the description on lines indented by two
  spaces, and the pointer sentence over two lines, each line holding as many words as fit in 120 characters. Change
  the OpenCode test to read the description from the fixture's folded block and to compare the two as unfolded
  text. Add a test that, for both harnesses and every role, no line of the planned wrapper is over 120 characters,
  the folded block under `description: >-` unfolds to the role's description, and the role file's path is on one
  line. See the fixture comparison and the new test fail (R1, R2, R3, R4, R7)
- [ ] Write `wrapWords` and use it in `claudeFile` and `opencodeFile`, until every test in the file and the whole of
  `npm test` passes (R1, R2, R3, R4, R9)
- [ ] Add a test to `tests/agentrite-init.test.mjs` that, for each combination of harnesses and the package name
  the other tests use, no file `projectFiles` returns holds a line over 120 characters. It passes at once if the
  templates already keep to it, and the record says so (R8)
- [ ] Remove this repository's six wrappers and write them again with
  `node scripts/agentrite-roles.mjs claude opencode`, from the working copy, not from the installed release. Check
  that no line in them is over 120 characters (R6)
- [ ] Check the harnesses, in this repository: `opencode agent list` names `planner`, `implementer` and `reviewer`
  as subagents, and a new `claude -p` session, asked for the description of each role's subagent, returns each in
  full. Do it inside the sandbox, where the versions are the pinned ones, or on the host with the versions written
  into the record (R5)

## Verification

- [ ] `npm test` passes
- [ ] No line over 120 characters under `tests/fixtures/`, `.claude/agents/` and `.opencode/agents/`:
  `awk 'length($0) > 120 { print FILENAME ": " FNR }' tests/fixtures/claude-agents/*.md .claude/agents/*.md
  .opencode/agents/*.md` prints nothing
- [ ] In a scratch project with the packed kit, `npx agentrite init claude opencode` writes six wrappers that are
  byte for byte this repository's
- [ ] `npm run check-changes` passes

## Commit Points

- [ ] `wrapWords`, the wrapped fixtures and the generator
- [ ] The check on everything `init` writes
- [ ] This repository's wrappers, written again
- [ ] The record of the harness check
