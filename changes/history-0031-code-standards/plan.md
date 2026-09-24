# 0031 Code standards

## Approach

Draft the standards against the code they describe, so that every example names a real file and no rule contradicts
how `src/` is already written. Then replace `## Code` in one edit, splitting it so the standards and the repository
rules are visibly different kinds of rule, and confirm the existing rules survive word for word.

## Files

- `AGENTS.md`: `## Code` gains the standards and splits into two subsections, then gains the standards for the
  inside of a function

## Tasks

### 1. Draft the standards

- [x] Write separation of concerns, DRY, YAGNI, and coupling and cohesion, each with the failure it names, so that a
      reviewer can point at a violation rather than only agree with the principle
- [x] Write the five SOLID principles with their canonical definitions, and state that they apply to modules and
      functions as well as classes
- [x] Write the precedence rules: YAGNI over open/closed and dependency inversion, loose coupling over DRY, each
      with the reason it wins
- [x] Check every example against the file it names, and confirm no standard contradicts how `src/` is written today

### 2. Rewrite the section

- [x] Split `## Code` into `### How code is written` and `### In this repository`, moving the `www/`, static files
      and `sips` rules into the second subsection unchanged
- [x] Put the standards in the first subsection, keeping the naming rule at its head
- [x] Confirm the finished section is within the roughly 40 lines the spec allows

### 3. Verify

- [x] Diff AGENTS.md and confirm the three repository rules and the naming rule appear verbatim, and that nothing
      else was removed
- [x] Confirm no role file restates a standard, and that the reviewer's code-quality axis still points at AGENTS.md
      rather than duplicating it
- [x] Confirm every task in this plan traces to a requirement in the spec and every requirement to a task
- [x] Run `npm run test:unit` and `PORT=3100 npm test` on the final tree. No test is added, since the change adds no
      logic; the suites run to show nothing else moved
- [x] Commit AGENTS.md and the recorded verification results
- [x] Run `npm run check:changes` after that commit so it checks the committed implementation

### 4. Extend the standards to the inside of a function

- [x] Write one level of abstraction, comments and dead code, pure rendering, validation at the boundary, types,
      consistency with surrounding code, and refactoring separate from behavior, each with the failure it names and
      an example from a file that already does it
- [x] Reword open/closed so that the code consuming the cases is what does not change, and name the consumer
- [x] Check every new example against the file it names, and confirm no new standard contradicts how `src/` is
      written today
- [x] Confirm the finished section is within the roughly 60 lines the amended spec allows
- [x] Run `npm run test:unit` and `PORT=3100 npm test` on the final tree
- [x] Commit AGENTS.md, the amended spec and plan, and the recorded verification results
- [x] Run `npm run check:changes` after that commit so it checks the committed implementation

### 5. Strip the repository examples from the standards

- [x] Reword every standard that names a file, function, or convention of this repository so that it names the
      failure instead, and drop the `src/` remark from the SOLID introduction
- [x] Generalize the rendering purity standard to computation and side effects, and add where rendering and file
      access live here to `### In this repository`
- [x] Confirm `### How code is written` contains no backticked path, function name, or convention from this
      repository apart from the TypeScript keywords `any` and `unknown`
- [x] Run `npm run test:unit` and `PORT=3100 npm test` on the final tree
- [x] Commit AGENTS.md, the amended spec and plan, and the recorded verification results
- [x] Run `npm run check:changes` after that commit so it checks the committed implementation

### 6. Apply the review findings

- [x] C2: reword separation of concerns so that only the same kind of change repeatedly forcing edits in the same
      two modules is the violation, not any change that touches two modules
- [x] C1: reword the repository line so that it names where rendering lives, including `src/layout.ts`, and states
      file access as belonging in the entry point of each tool, naming all three
- [x] P1: redo the contradiction check of task 4 against every file in `src/`, and list each deviation from a
      standard under the spec's refactoring non-goal
- [x] Run `npm run test:unit` and `PORT=3100 npm test` on the final tree
- [x] Commit AGENTS.md, the amended spec and plan, and the recorded outcomes
- [x] Run `npm run check:changes` after that commit so it checks the committed implementation

## Verification

- [x] The four rules that exist today survive verbatim
- [x] The section is within roughly 40 lines
- [x] `npm run test:unit` and `PORT=3100 npm test` pass
- [x] `npm run check:changes` passes against the committed implementation
- [x] The four original rules and the first-pass standards survive verbatim, apart from the open/closed rewording
- [x] The section is within roughly 60 lines
- [x] `npm run test:unit` and `PORT=3100 npm test` pass on the extended tree
- [x] `npm run check:changes` passes against the committed extension
- [x] `### How code is written` names nothing specific to this repository
- [x] Every standard still names a failure a reviewer can point at
- [x] `npm run test:unit` and `PORT=3100 npm test` pass on the stripped tree
- [x] `npm run check:changes` passes against the committed stripping
- [x] Every file in `src/` that reads or writes files, and every file that renders, is accounted for by the
      repository line or the non-goal
- [x] `npm run test:unit` and `PORT=3100 npm test` pass on the reviewed tree
- [x] `npm run check:changes` passes against the committed review fixes

## Commit Points

- [x] Spec and plan
- [x] AGENTS.md and verification results
- [x] Extended standards, amended spec and plan, and verification results
- [x] Stripped examples, amended spec and plan, and verification results
- [x] Review fixes, amended spec and plan, and recorded outcomes
