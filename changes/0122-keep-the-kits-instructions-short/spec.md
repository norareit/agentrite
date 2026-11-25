# 0122 Keep the kit's instructions short

## Context

Unit 0121 trims `process.md`, the standards, the role files, the templates and this repository's `AGENTS.md` and
`CLAUDE.md`. This unit is meant to keep them short from then on. It is specified once 0121 is implemented, so that what
the trimming taught can shape it. Until then this draft holds what is already known and is not ready for approval.

Today the section "The length of the kit's instructions" of `AGENTS.md` asks every unit that changes `process.md`,
`standards.md` or a role file to log `wc -w` of each before and after, and the reviewer to put every growth to the
human under `**Needed from you**`. In an orchestrator run that item is given in `afterwards`, which stops no run, but
it still asks the human about every unit that touches these files. The human does not want a rule that takes them into
every such unit. They want two things instead:

- A clear instruction to write these files as short as they can be without losing a rule, its context or its strength,
  so that no unit adds wording it does not need
- A reminder to the maintainer of the kit to look at the growth now and then, rather than a question per unit

## Requirements

Provisional, to be confirmed or replaced once 0121 is implemented:

1. No unit asks the human to decide on the growth of a file in scope. The reviewer does not put a growth under
   `**Needed from you**` and the orchestrator gives no item for it.
2. The instructions hold a rule on writing instruction text short: each thing said once, in the fewest words that keep
   its meaning, its context and its strength, and nothing restated that another file in scope holds.
3. The maintainer of the kit is reminded at a set point to look at how the files in scope grew since the last time,
   with the counts of words given to them, and nothing stops when they do not look.

## Decisions

- The files in scope are those of 0121
- To decide once 0121 is implemented:
    - Where the rule of requirement 2 lives: in `standards.md`, so that it holds for every project's instruction files
      too, or in this repository's `AGENTS.md`, so that it holds only for the kit's
    - The point of the reminder of requirement 3. The release is the candidate, as a step of `RELEASING.md` that
      compares `wc -w` of the files in scope with the last release, since the release is already a point where the
      human reads what changed. Another is a count of units since the last look
    - Whether units still log `wc -w`. It is cheap and gives the maintainer the data, but with no question attached it
      may be noise
    - What the walk of 0121 found about why the files grew, and whether that calls for more than the rule of
      requirement 2

## Non-goals

- A hard limit on the words of a file, or a check that refuses a unit for growth. The human wants a reminder, not a
  gate that could stop an orchestrator run
- Trimming the files. That is 0121

## Beyond the request

None
