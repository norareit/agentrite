# 0031 Code standards

State the standards code is written and judged against, in the one section that every role reads.

## Context

AGENTS.md `## Code` has four bullets. Only the first, on meaningful names, is about how code is written; the other
three are rules for handling this repository's files: leave `www/` alone, keep the static files in place, use `sips`.
Nothing states separation of concerns, DRY, YAGNI, coupling, or SOLID.

`0030` gave the reviewer a code-quality axis that judges "correctness, naming, tests that actually exercise the
behavior, and the code and testing rules in AGENTS.md". Against the section as it stands, that axis has naming and
almost nothing else, so code quality is judged on whatever the reviewer happens to believe rather than on anything
the implementer was told. `0030` could not fix this itself: its non-goals rule out changing any existing rule, and
adding standards is adding rules.

The gap is the same shape as the one `0030` described. Guidance that nobody has written down stays unwritten, and is
then re-argued in conversation every time it matters.

A first pass covered the structure between modules: how responsibilities are split, what depends on what, and when
knowledge is shared. It said nothing about the code inside a function, which is what a reader actually looks at, and
nothing about the conventions this codebase already follows without stating them, such as pure renderers with file
access kept to `src/build.ts`. A reviewer judging readability against the first pass still had only naming.

## Requirements

1. AGENTS.md states the standards that code is written and judged against: separation of concerns, DRY, YAGNI, loose
   coupling with high cohesion, and the five SOLID principles, each named and defined
2. Every standard is stated so that a reviewer can point at a violation of it. A standard that can only be agreed
   with is not usable on either side
3. Where two standards pull against each other, the section says which one wins
4. The three repository rules currently in `## Code` survive unchanged, and the section makes plain which of its
   rules are about writing code and which are about handling this repository's files
5. The standards are shared, live in AGENTS.md, and no role file restates them
6. The section stays affordable for every agent on every turn, which bounds it at roughly 60 lines
7. AGENTS.md also states the standards for the code inside a module, each named and stated so a reviewer can point
   at a violation: one level of abstraction per function, comments that explain why with no commented-out code, pure
   rendering with file access at the edge, validation at the boundary, types carrying the rules, consistency with
   the surrounding code, and refactoring kept separate from behavior change
8. The open/closed principle is worded so that adding an entry to a registry is visibly conforming rather than
   visibly an edit to existing code
9. `### How code is written` names no file, function, or convention of this repository, so that it can be copied
   into another project unchanged. A fact about this repository that a standard relies on lives in
   `### In this repository`

## Decisions

* The standards go in AGENTS.md `## Code` rather than in a file it points at. Two of the three roles act on them, the
  implementer writing and the reviewer judging, which makes them shared under `0030`'s audience rule, and AGENTS.md
  is the only thing a session doing code work that fits no role reads. The alternative, a `standards/code.md` with
  room for worked examples, was rejected: it adds a fourth location for instructions one unit after `0030` settled
  where instructions go, and it would be invisible to exactly the small non-unit changes that most need a floor
* The five SOLID principles are named and defined canonically, rather than translated into module-level rules. The
  vocabulary is already known to any reader, and a translation would have to be re-derived by anyone who wanted to
  check it against the original
* They are stated as applying to modules and functions as well as classes. `src/` is roughly 900 lines of
  module-shaped TypeScript with no class hierarchy, so principles worded only for classes would read as inapplicable
  and be skipped. This is scope, not translation: the definitions themselves stay canonical
* DRY is about knowledge, not text. Two pieces of code that encode the same decision are extracted the second time
  they appear; two that merely look alike are left alone. Deduplicating look-alikes couples decisions that change
  independently, which is the more expensive mistake and the harder one to undo
* The conflicts are resolved in the text rather than left to judgment. YAGNI wins over open/closed and dependency
  inversion, and loose coupling wins over DRY. Both give precedence to the cheaper mistake: a duplication or a
  missing abstraction is local and visible, while a wrong shared abstraction is spread across its callers
* `## Code` gains two subsections, so that the standards do not read as three more file-handling rules and the
  repository rules do not read as principles
* The standards name no file or function. An earlier draft illustrated each with a real file in `src/`, on the
  grounds that code the reader can open is checkable. That was reversed: the file name proves only that the rule
  held on the day it was written, goes stale on the first rename without anything noticing, and is noise in any
  other project the section is copied into. What makes a standard checkable is the failure it names, and every
  standard keeps that. The one concrete anchor worth keeping, where rendering and file access live, is a fact about
  this repository and moves to the subsection that holds those
* No test is added. The change introduces no logic, and a test asserting that a documentation section contains
  particular words would freeze the wording without protecting anything that can break silently
* The second set of standards is about the inside of a function and the conventions the code already follows.
  They are the ones readability and adaptability are judged by, and they were missing because the first pass took
  its list from the request rather than from what a reviewer needs. Each was checked against code that already does
  it. Where `src/` deviates from one, the deviation is listed under non-goals and stays
* The line budget rises from roughly 40 to roughly 60. The alternative, dropping structural standards to make room,
  was rejected: both sets are needed and the cost of twenty lines on every turn is smaller than the cost of
  re-arguing any one of them in conversation
* Purity is stated generally, as computation in the middle and side effects in the entry point that drives the
  work, with the repository subsection saying where those two live here. An earlier draft stated it for renderers
  only, which described this codebase and nothing else
* Types are stated as `unknown` at the boundary and no `any` anywhere, which is how `src/` is already written,
  rather than as a rule about union types for known sets, which it is not and which a conforming pass would have to
  add

## Non-goals

* Refactoring existing code to conform. The standards apply to work from here on; a conforming pass over `src/` is
  its own unit, and would need its own spec about what it is allowed to change. This covers the commented-out
  category entry in `src/categories.ts`, which the comments standard would remove, and the puzzle collector in
  `src/generators/puzzle.ts`, which reads files from inside the rendering directory where the purity standard puts
  them in the entry point. Both stay until that unit
* Automated enforcement. No linter, no rule plugin, no check script
* Changing the testing rules, which are their own section and stay as they are
* Restating any standard in a role file, which `0030` already forbids
