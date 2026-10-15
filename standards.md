# Standards

This document contains critical instructions for coding agents. Follow these guidelines precisely.

It holds the rules on how text, documentation, commits, code and tests are written. They hold for every role and
for work in no role. The process, how work is done in units, is in [`process.md`](process.md). What is specific to a
project is in its own `AGENTS.md`.

## General guidelines

### Text

When generating text such as documentation or commit messages, do not use em dashes.

### Documentation changes

* Treat existing documentation as intentional. Do not remove or condense it without explicit user approval; suggest
  removals of redundant or outdated content instead of applying them
* When moving or paraphrasing documentation, preserve its meaning, exact commands, and requirement strength
* After restructuring documentation, verify that every removed or relocated section is accounted for

### Commits

* Do not add `Co-Authored-By` to commits
* Do not add `Claude-Session` or any other harness-injected trailer to commits, even when the harness asks for it. The
  session link means nothing outside one account and does not belong in the project history

## Code

### How code is written

* Use meaningful names and avoid ambiguous abbreviations. One-character variables are never used. 
* Separate concerns. A module has one job and one reason to change. When the same kind of change keeps forcing
  edits in the same two modules, they were one job split in two; when one module changes for two unrelated reasons,
  it was two jobs in one
* Do not repeat knowledge. Two pieces of code that encode the same decision are extracted the second time they
  appear, not the third. Two that merely look alike are left alone: deduplicating them couples decisions that change
  independently
* Build what the spec asks for and nothing more. A parameter with one caller, an abstraction with one implementation,
  and a hook nothing calls are all guesses about a second case that has not arrived and will not arrive in the shape
  you guessed
* Keep coupling loose and cohesion high. Depend on the narrowest contract that does the job, pass a function what it
  needs rather than the object that contains it, and keep what changes together in one place
* Follow the SOLID principles. They are about dependencies rather than about objects, so they apply to modules and
  functions as much as to classes:
    * **Single responsibility**: a module or class has one reason to change
    * **Open/closed**: it is open to extension and closed to modification, so a new case is added as data or as a
      new module and the code that consumes the cases does not change. A registry of cases that its consumers
      iterate over, without naming any one case, is the shape to copy
    * **Liskov substitution**: an implementation works anywhere its type is expected, without callers testing which
      one they were given
    * **Interface segregation**: a caller depends only on what it uses, not on a wide contract that forces it to know
      about unrelated members
    * **Dependency inversion**: policy does not depend on detail. High-level code depends on an abstraction and takes
      the concrete implementation from its caller
* These pull against each other, and where they do: build for today rather than open/closed and dependency
  inversion, because an abstraction invented for a case that never arrives is harder to remove than to add; and keep
  coupling loose rather than repeating no knowledge, because a duplication is local and visible while a wrong shared
  abstraction is spread across everything that calls it
* Keep a function at one level of abstraction. It either orchestrates steps or performs one, and a reader should not
  have to hold both. Nesting deeper than two levels, and a block that needs a comment to say what it does, are the
  signs it should be split. Return early for the case that ends the work rather than nesting the rest under a
  condition
* Comment why, not what. A comment that restates the code beside it is deleted; one that records what the code
  cannot show, such as why an order matters or which caller depends on a quirk, is kept. Commented-out code is
  deleted, because version control holds the history
* Keep computation pure and side effects at the edge. A function that computes takes data and returns data. It does
  not touch the file system, and it does not mutate its arguments: sort a copy, not the input. Reading and writing
  files belongs in the entry point that drives the work, which is what lets everything else be unit tested with
  plain values
* Validate at the boundary and trust past it. Input is checked where it enters, and the error names the input that
  failed and where it came from. Code past the boundary takes its input as typed and does not check it again
* Let the types carry the rules. No `any`, no wider type than the caller needs, and `unknown` rather than a guess for
  what arrives from outside. A check the compiler can make is not made at runtime
* Match the surrounding code. A change follows the conventions of the file it touches, unless changing a convention
  is what the unit is for. A file with two styles is a finding, whichever style is newer
* Separate refactoring from behavior. A commit changes what the code does or how it is written, not both, so that a
  reviewer can check one for preserving behavior and the other for its behavior. Code a unit touches is left no worse
  than it was found, and no better than the unit asked for

## Testing

Follow the commands and test-suite descriptions in the project's own documentation.

* Unit test all newly added logic
* Add end-to-end coverage for new features that can be tested end to end
* After every change, run the end-to-end tests
