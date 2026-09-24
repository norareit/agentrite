---
kind: feature
status: implemented
timestamp: 2026-09-05T23:16:29Z
---

# 0031 Code standards

## Log

- 2026-09-05T23:16:29Z [human] noticed while reading the role files that no code standards are written down
  anywhere. AGENTS.md `## Code` is four bullets, only the first of which is about code itself, and asked for
  separation of concerns, DRY, YAGNI, loose coupling and SOLID
- 2026-09-05T23:16:29Z [human] decided the two open questions: the standards expand AGENTS.md `## Code` rather than
  moving to a file it points at, and the five SOLID principles are named and defined canonically rather than
  translated into module-level rules
- 2026-09-05T23:16:29Z [Claude Code, anthropic/claude-opus-5] spec and plan written, status `draft`, awaiting
  approval
- 2026-09-06T23:02:36Z [human] approved the spec and plan and asked for the implementation, moving the status from
  `draft` through `approved` to `in-progress`
- 2026-09-06T23:02:36Z [Claude Code, anthropic/claude-opus-5] implemented. `## Code` in AGENTS.md now has
  `### How code is written`, holding separation of concerns, DRY as knowledge rather than text, YAGNI, coupling and
  cohesion, the five SOLID principles defined canonically and scoped to modules and functions, and the precedence
  rules for where they pull against each other; and `### In this repository`, holding the three file-handling rules
  unchanged. The section is 36 lines, within the roughly 40 the spec allows
- 2026-09-06T23:02:36Z [Claude Code, anthropic/claude-opus-5] verification. The diff removes no line from AGENTS.md
  at all: the change is purely additive, and all four rules that existed before appear verbatim, checked by exact
  string match rather than by reading. Both examples were checked against the tree they name, `src/generators/`
  holding one renderer per output kind and `src/categories.ts` holding the registry whose entries are added rather
  than edited into callers. No role file restates a standard, and the reviewer's code-quality axis still points at
  the AGENTS.md rules rather than copying them. Tracing checked in both directions: requirements 1 to 6 to tasks 1
  and 2, requirement 4 also to task 3's diff check, requirement 5 to task 3's restatement check, and no task without
  a requirement behind it. No test was added, as the spec decided, since the change adds no logic. Suites on the
  final tree: `npm run test:unit` 56 pass and `PORT=3100 npm test` 86 pass, with `git diff --check` clean
- 2026-09-06T23:12:13Z [Claude Code, anthropic/claude-fable-5-1] `npm run check:changes` run against the committed
  implementation and passed, closing task 3
- 2026-09-06T23:12:13Z [human] asked for an assessment of the unit before review. The assessment found the section
  sound on the structure between modules and silent on the code inside a function: nothing on levels of abstraction,
  comments and dead code, purity, validation at the boundary, types, consistency with surrounding code, or keeping
  refactoring apart from behavior change. It also found the open/closed wording readable as forbidding any edit to an
  existing file, since adding a registry entry is an edit. The human asked for all of it to be added to AGENTS.md,
  with the spec and plan amended as needed, which is the return to planning the implementer role requires for a
  change the spec does not cover, decided by the human in the same request
- 2026-09-06T23:12:13Z [Claude Code, anthropic/claude-fable-5-1] spec amended while the unit is `in-progress` and not
  yet frozen: context gains the gap the first pass left, requirement 6 raises the line budget from roughly 40 to
  roughly 60, requirements 7 and 8 add the second set of standards and the open/closed rewording, decisions record
  why each is stated the way it is, and the refactoring non-goal now names the commented-out category entry that the
  comments standard would otherwise remove. Plan gains task 4 for the second pass with its own verification and
  commit point
- 2026-09-06T23:12:13Z [Claude Code, anthropic/claude-fable-5-1] implemented task 4. `### How code is written` gains
  seven bullets: one level of abstraction per function, comments that explain why with no commented-out code, pure
  rendering with file access in `src/build.ts`, validation at the boundary, types carrying the rules, matching the
  surrounding code, and refactoring separate from behavior. Open/closed now says the code consuming the cases does
  not change, and names `src/build.ts` as the consumer that maps over the registry without naming a category. The
  section is 59 lines, within the roughly 60 the amended spec allows
- 2026-09-06T23:12:13Z [Claude Code, anthropic/claude-fable-5-1] verification. The diff against the previous commit
  removes only the two open/closed lines; every other line of the section survives verbatim. Every new example was
  checked against its file: `collectPuzzles` returns early on a missing directory, `src/categories.ts` opens with the
  ordering comment, `renderIndex` sorts a copy, `requireCategory` names the file and value in its error, the
  frontmatter parsers in `src/build.ts` take `unknown`, `src/` contains no `any`, and `src/build.ts` names no
  category. No new standard contradicts `src/` as written, with one known exception recorded as a non-goal: the
  commented-out travel entry. Suites on the final tree: `npm run test:unit` 56 pass, `PORT=3100 npm test` 86 pass,
  `git diff --check` clean
- 2026-09-06T23:15:24Z [Claude Code, anthropic/claude-fable-5-1] `npm run check:changes` run against the committed
  extension and passed, closing task 4. Every task in the plan is ticked. Status stays `in-progress` until review
  passes
- 2026-09-06T23:18:39Z [Claude Code, anthropic/claude-fable-5-1] corrected the timestamp of the previous entry from
  `23:20:00Z`, which was written ahead of the clock, to `23:15:24Z`, the time of the commit it describes
- 2026-09-06T23:18:39Z [human] objected to the examples that name files and functions in `src/`: they go stale as the
  code moves, and they make no sense when the section is copied into another project. Asked whether they could be
  stripped without losing the value of the rules, and on hearing that the failure each rule names is what makes it
  checkable, decided to strip them
- 2026-09-06T23:18:39Z [Claude Code, anthropic/claude-fable-5-1] spec amended while the unit is `in-progress`:
  requirement 9 says `### How code is written` names nothing specific to this repository, the decision that examples
  name real files is reversed with the reason recorded in its place, the purity decision now states the general rule
  with the repository fact moved to the second subsection, and the second-set decision says the standards were
  checked against the code rather than illustrated by it. Plan gains task 5 with its own verification and commit
  point; tasks 1, 2 and 4 keep their ticks as the history of how the examples were checked before being removed
- 2026-09-06T23:18:39Z [Claude Code, anthropic/claude-fable-5-1] implemented task 5. Separation of concerns now names
  the two failures instead of the URL module; open/closed describes a registry its consumers iterate over; one level
  of abstraction, comments, validation, types and matching the surrounding code each drop their file or function and
  keep their failure; rendering purity becomes computation pure and side effects at the edge; and the SOLID
  introduction drops its remark about `src/`. `### In this repository` gains the line that rendering lives in
  `src/generators/` and returns strings while file access lives in `src/build.ts`. The section is 58 lines
- 2026-09-06T23:18:39Z [Claude Code, anthropic/claude-fable-5-1] verification. A search of `### How code is written`
  for backticked names finds only `any` and `unknown`, both TypeScript keywords. Every standard was reread for the
  failure it names, and each still has one. The four original repository rules survive verbatim. Suites on the final
  tree: `npm run test:unit` 56 pass, `PORT=3100 npm test` 86 pass, `git diff --check` clean
- 2026-09-06T23:19:58Z [Claude Code, anthropic/claude-fable-5-1] `npm run check:changes` run against the committed
  stripping and passed, closing task 5. Every task in the plan is ticked. Status stays `in-progress` until review
  passes
- 2026-09-06T23:24:51Z [OpenCode, openai/gpt-5.6-sol] reviewed unit `0031-code-standards` at commit
  `06fe620098f9863aefcb4778325609a66ad74249`; findings C1, P1, and C2. Human approval and the claimed historical
  intermediate-tree test runs could not be independently verified
- 2026-09-06T23:32:02Z [Claude Code, anthropic/claude-fable-5-1] review outcomes, applied as task 6 since the unit
  is still `in-progress`. All three findings accepted:
    - C1 accepted. The repository line said reading and writing files lives in `src/build.ts` and rendering in
      `src/generators/`. Checked against the tree: `src/image.ts` and `src/instagram.ts` are separate tools with
      their own file access, `src/layout.ts` renders, and `collectPuzzles` in `src/generators/puzzle.ts` reads
      files. The line now names both rendering locations, states file access as belonging in the entry point of
      each of the three tools, and the puzzle collector is listed under the refactoring non-goal as an existing
      deviation that stays
    - P1 accepted. Task 4's check that no standard contradicts `src/` was ticked after a check that found the
      puzzle collector and did not record it, and that did not look at `src/image.ts`, `src/instagram.ts` or
      `src/layout.ts` at all. The tick stands as the history of what was done; the check is redone in task 6
      against every file in `src/` that imports `fs` or renders, and its result is in the spec non-goal and the
      repository line
    - C2 accepted. The separation of concerns bullet made any change touching two modules a violation, which
      would flag a feature that rightly touches a type, a parser and a renderer. It now names the same kind of
      change repeatedly forcing edits in the same two modules, which is the pointable failure
    - The reviewer's open question on whether the repository line was exhaustive is answered by the C1 rewording.
      Human approval is logged in this record on the human's word, which is how approval is recorded in every unit;
      there is nothing else to verify it against
- 2026-09-06T23:32:02Z [Claude Code, anthropic/claude-fable-5-1] verification. Every file in `src/` importing `fs`
  is `src/build.ts`, `src/image.ts`, `src/instagram.ts` and `src/generators/puzzle.ts`; the first three are the
  tool entry points the repository line names and the fourth is the recorded deviation. Rendering outside
  `src/generators/` is `src/layout.ts`, which the line now names. The section is 61 lines, within the roughly 60 the
  spec allows. Suites on the final
  tree: `npm run test:unit` 56 pass, `PORT=3100 npm test` 86 pass, `git diff --check` clean
- 2026-09-06T23:33:33Z [Claude Code, anthropic/claude-fable-5-1] `npm run check:changes` run against the committed
  review fixes and passed, closing task 6. Every task in the plan is ticked. Status stays `in-progress` until the
  reviewer confirms the three findings are resolved
- 2026-09-06T23:36:14Z [human] asked whether this can go to `master` as a fast-forward, and for it to be done
- 2026-09-06T23:36:14Z [Claude Code, anthropic/claude-opus-5] verified independently rather than from this log, since
  a record entry is a claim: `npm run test:unit` 56 pass, `PORT=3100 npm test` 86 pass, `npm run check:changes` pass,
  `git diff --check master...HEAD` clean, every plan box ticked, and `master` an ancestor of this branch so the merge
  is a fast-forward. `### How code is written` was checked for names from this repository and has none, which is
  requirement 9
- 2026-09-06T23:36:14Z [Claude Code, anthropic/claude-opus-5] set to `implemented` before merging, because a unit
  that reaches `master` still `in-progress` never freezes and its spec and plan stay editable without the check
  noticing. Recorded honestly: the review at `23:24:51` returned findings, they were applied as task 6, and no
  further review confirmed the result, so this rests on those fixes being right rather than on a clean review round

## Amendments
