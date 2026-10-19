# 0060 What the human must do ends a message

## Context

An agent's message to the human often needs something of them: an approval, a decision between options, an answer,
or an action only they can take, such as a login or a command on the host. In a long message such a request is
easily lost in the prose around it, and the human finds out only when the agent waits. The human asked that every
role list what it needs from the human at the end of its message.

The kit's process already has several such moments: the human approves a spec, decides every blocking finding of a
review before a unit is `implemented`, and settles the questions a specifier or a planner raises. None of the kit's
instruction files says how a message asks for them.

The human placed the rule in `standards.md`, since it holds for every role, and weighed that a project that replaces
`standards.md` with a file of its own then does not have it.

## Requirements

1. `standards.md` holds a rule on messages to the human, among the rules on text, which says:
    * a message to the human that needs something of them, a decision, an approval, an answer, or an action only
      they can take, ends with a list of what it needs, under a line that reads `**Needed from you**`
    * nothing of the message comes after the list
    * each item names one thing, and can be understood without the prose above it: what is to be decided, approved,
      answered or done, and where a choice is asked for, the options, with the one the agent recommends marked
    * a message that needs nothing of the human has no such list and no such line
    * the rule is on messages, in a session and in the last message of a run without a session, and not on the
      documents an agent writes, such as a spec or a record
2. The rule holds for every role and for work in no role, as every rule of `standards.md` does, and no role file of
   the kit repeats it

## Decisions

* **The rule is in `standards.md`.** The human decided this. It is a rule on how text is written, and holds for every
  role and for work in no role, which is what `standards.md` is for. A project that replaces `standards.md` has
  replaced the kit's rules on text as a whole, this one with them, and writes into its own file what it keeps of
  them. Rejected: `process.md`, which is the same in every project and could not be left out by one that does not
  want it; and each role file, which would state it four times and lose it in a role a project replaces
* **The list is under a fixed line, at the very end.** The end is where a reader looks last and where a terminal
  leaves the message, and a fixed line is found by eye and by a search alike. `**Needed from you**` is bold, and not
  a heading, so that it reads the same in a terminal that shows Markdown and in one that does not
* **Each item stands alone.** A list that only points back into the prose, as "see above", moves the hunt and does
  not end it
* **No list when nothing is needed.** An empty list, or a line that says nothing is needed, trains the reader to skip
  the line
* **Documents are left out.** A spec or a record is written for its later readers, and what it needs of the human,
  such as the approval, is asked for in the message that hands it over

## Non-goals

* Reading the list by a program, such as the orchestrator. The fixed line allows it later, and nothing reads it now
* This repository's own sessions, which load the installed release's `standards.md` and follow the rule when the
  repository moves to the release that holds this unit
* `CHANGELOG.md`, which is written when the release is made

## Beyond the request

None
