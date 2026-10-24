# 0085 The orchestrator's own output stands out when followed

## Context

`npx agentrite orchestrate <unit>` prints a line before and after each step and, when the run ends, its end report.
Without `--follow` that is all it prints, and it reads well. With `--follow` it also prints, between a step's two
lines, the text messages and the tool calls of the step's agent, and a step can print hundreds of them. The
command's own lines are then plain lines among many others, and are hard to find when scrolling back: a reader looking
for where a step ended, or for the end report, has to read the agent's messages to find them.

The human asked that, with `--follow`, the command's own output is set apart by lines around it, so that it is clear
at a glance what the command printed and what the agent did.

## Requirements

What is framed:

1. With `--follow`, everything the command prints on standard output that is not a followed item, a text message or a
   tool call of a step, stands in a frame: an opening rule on the line before it and a closing rule on the line after
   it. Those are the line a step starts with, the line it ends with, and the end report
2. The frames of a run are, in this order: one around the line the first step starts with; for each step after it,
   one around the line the step before it ended with and the line it starts with; and one around the line the last
   step ended with and the end report. No two rules stand on consecutive lines, and no frame is open while a step runs
3. Inside a frame, the lines are those the command prints without the option, in the same order, with the blank line
   before the end report kept. A frame is preceded by one blank line unless it is the first output of the run, and
   followed by the blank line the followed items already open with, so that a rule never touches an item

The rules:

4. The opening rule is `==== agentrite ` followed by `=` up to 80 characters in all. The closing rule is 80 `=`. Both
   are plain characters, with no colour and no other escape sequence, on standard output and also when it is not a
   terminal

What does not change:

5. Without `--follow`, the command prints exactly what it printed before this unit, byte for byte
6. With `--follow`, the followed items are printed as before, between frames. The followed file of each step,
   `state.json`, every other file of the run's directory, the standard error of the command and the harness, and the
   command's exit status are what they were before this unit, in every case of "How a run ends" of `README.md`

The documents:

7. "How a run ends" of `README.md` says that with `--follow` the command's own lines and the end report stand in
   frames, which lines share a frame, and what the rules are, and its example of a followed step shows the frames.
   Its line on `--follow` in the options table of "agentrite orchestrate" is left as it is

Tests:

8. Unit tests cover the opening and closing rules, a frame around one line and around several, and that the frames
   of a run of two steps fall as requirement 2 gives them, an end report among them
9. Tests of the command show, with `--follow`, the frames around the step lines and the end report of a run of more
   than one step, with the followed items between them, and without `--follow`, output that holds no rule and is what
   the command printed before this unit

## Decisions

* **Rules around the output, not a mark on each line.** A prefix such as `agentrite │ ` before every line the command
  prints was weighed. It marks each line on its own, but adds width to the end report's table and breaks the end
  report for a reader who copies a path from it. Rules around a block leave the lines as they are, and are what the
  human proposed
* **The end line of one step and the start line of the next share a frame.** The command prints the two directly
  after each other, with only files written between them. A frame each would put a closing rule and an opening rule
  on consecutive lines between every two steps, which reads as noise and gives two frames for one moment of the run.
  For the same reason the end line of the last step and the end report share one
* **No frame is open while a step runs.** The harness's standard error reaches the terminal while a step runs. Were a
  frame left open until the first followed item, what the harness prints there would stand inside it and read as the
  command's own
* **Only with `--follow`.** Without it the command's lines are the only lines on standard output, and need nothing to
  set them apart. Leaving that output unchanged also keeps it the same for whatever reads it today
* **`=` and a fixed width of 80.** Plain ASCII prints the same in every terminal and font, and in a log file or a
  pipe, where box-drawing characters can come out garbled. A width of 80 fits the narrowest terminal in common use,
  so a rule never wraps onto a second line. The rule is not made as wide as the terminal: on a pipe there is no
  width to read, and a rule that depends on it would differ between a terminal and a captured log. The name
  `agentrite` in the opening rule says whose output follows, for a reader who does not know the rules
* **No colour.** The tool calls are already dimmed. A colour or bold for the frames would be lost in a log and on a
  pipe, where the rules alone must carry it. It is offered as item 1 of "Beyond the request"

## Non-goals

* What the command prints before the run starts, its refusals and its usage, which stand before any followed item and
  are on standard error
* A frame around what the harness prints on standard error, or around the agent's own messages
* A text message of the agent that holds a line like a rule. Nothing keeps the agent from printing one
* A way to change the rules, their width or their character, by an option or a key of `agentrite.json`
* A frame for the output of any other command of the kit

## Beyond the request

1. Print the rules, and the command's lines inside a frame, in bold when standard output is a terminal. It would make
   the frames stand out further while scrolling quickly, at the cost of a check of the terminal and a second form of
   the output to test. Without it the rules alone set the output apart, which is what was asked
2. Make the rules as wide as the terminal when standard output is one, up to 120 characters. It would match the width
   of a wide terminal, at the cost of reading the width and keeping 80 for a pipe, so that a captured log differs from
   what the terminal showed. Without it a rule is 80 wide on a wide terminal, which is still clear
