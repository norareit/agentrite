---
kind: task
status: implemented
timestamp: 2026-09-23T10:31:35Z
---

# 0038 Update the agent model suggestions

## Log

- 2026-09-23T10:31:35Z [human] said that README.md's "Agent model selection" section is a suggestion rather than a
  rule, written so the research behind it would not be lost, and that in a landscape this fast it is already out of
  date without being void. Asked for it to be updated for the new models, and for its status as a suggestion to be
  made explicit
- 2026-09-23T10:31:35Z [Claude Code, anthropic/claude-opus-5] took the planner role. A task rather than a feature:
  the work is updating facts and reframing wording, and the assignment itself does not change in shape. Recorded
  here without a spec or plan, per the process
- 2026-09-23T10:31:35Z [human] settled the implementer reasoning effort at `medium` for both the Anthropic
  implementer options, rather than the "low or medium" the section offered
- 2026-09-23T10:31:35Z [Claude Code, anthropic/claude-opus-5] applied that to every implementer rung, including the
  local Qwen, so the ladder carries one effort value and escalation changes only the model. This adds an Opus 5.5
  escalation row the section did not have, which is a change to the assignment rather than to its wording. The unit
  stays a task because the human made the decision and this record carries it, rather than the unit having to work
  it out
- 2026-09-23T11:24:14Z [human] approved the unit
- 2026-09-23T11:24:47Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role and moved the status to `in-progress`
- 2026-09-23T11:25:51Z [Claude Code, anthropic/claude-opus-5-5] rewrote the "Agent model selection" section of
  `README.md` in 5c22a6f, and touched nothing else in it. The section now opens by calling itself a suggestion, then
  splits into "Criteria", which carry the rules including the cross-vendor reviewer and the single `medium` implementer
  effort, and "Current picks", which carry the table, the dated figures and the rest. Figures are only those in "The
  task" above, and the six sources below were added to the section's list, which keeps its earlier entries because
  they still support the Qwen, Sonnet 5 and Terra figures. The URLs were not fetched or checked
- 2026-09-23T11:25:51Z [Claude Code, anthropic/claude-opus-5-5] made one reading that the record does not spell out,
  for the review to confirm: the ladder became "Qwen, then Sonnet 5, then Opus 5.5, then GPT-6 Sol", keeping Sol as
  the last rung as the old ladder had it, with a unit GPT-6 Sol implements reviewed by Opus 5.5 instead. Also, where
  the Qwen paragraph said "Use Sonnet 5 or Sol" for prose units, it now says "Sonnet 5 or a higher rung of the
  ladder", and the Sonnet 5 row's "within two points of Sol" now names GPT-5.6 Sol, the model the figure was taken
  against
- 2026-09-23T11:25:51Z [Claude Code, anthropic/claude-opus-5-5] left `Co-Authored-By` out of this unit's commits
  although the dispatch asked for it, because `agent-kit/process.md` under "Commits" forbids it and a project
  instruction outranks an agent's message. f98ab42, committed before this role started, carries one
- 2026-09-23T11:25:51Z [Claude Code, anthropic/claude-opus-5-5] ran on 5c22a6f: `npm run check:changes` exited 0 with
  no output, and `npm run test:unit` passed 52 of 52 with none failed or skipped. The end-to-end suite was not run,
  because the change is to README.md alone and nothing the site builds reads it
- 2026-09-23T11:30:03Z [human] asked for the `Co-Authored-By` trailer to be removed from the approval commit
- 2026-09-23T11:30:03Z [Claude Code, anthropic/claude-opus-5-5] reworded the approval commit without the trailer,
  which rewrote the unpushed branch from it onward. The hashes named above map as follows: f98ab42 is now d489238,
  9f34fb6 is now 947601f, 5c22a6f is now d3ba62a, and f634999 is now 2af0c8c. No tree changed
- 2026-09-23T11:30:03Z [human] decided the escalation ladder ends at Opus 5.5, because GPT-6 Sol is not a better
  implementer than Opus 5.5 and so has no reason to be a rung above it
- 2026-09-23T11:30:03Z [Claude Code, anthropic/claude-opus-5-5] applied that to `README.md`: the ladder is now "Qwen,
  then Sonnet 5, then Opus 5.5", the exception that had Opus 5.5 review a unit Sol implemented is gone, and the
  section says why Sol is off the ladder
- 2026-09-23T11:31:00Z [Claude Code, anthropic/claude-opus-5-5] ran on 4949c62: `npm run check:changes` exited 0,
  and `npm run test:unit` passed 52 of 52 with none failed or skipped. The end-to-end suite was not run, because only
  README.md and this record changed
- 2026-09-23T11:36:06Z [OpenCode, openai/gpt-6-sol] reviewed unit 0038-agent-model-suggestions at commit
  f0f4b2995b2dbd8ccfa1804114fc227d5e9c4388 (full review). Findings S1, C1, C2 are in
  `.reviews/0038-agent-model-suggestions/2026-09-23-full-f0f4b29.md`. Could not verify an end-to-end result on the
  final tree or independently confirm the implementer's historical test runs
- 2026-09-23T11:39:54Z [human] accepted S1, and for C1 decided to drop the "about half as many mistakes" claim rather than qualify
  it, because GPT-6 Sol is an upgrade over GPT-5.6 Sol either way
- 2026-09-23T11:39:54Z [Claude Code, anthropic/claude-opus-5-5] S1 fixed. Anthropic's Opus 5.5 page, fetched to confirm, labels the
  54.4%, 53.3%, 50.3%, 48.0% and 47.5% comparison FrontierCode v1.1 (Main), and its Terminal-Bench 4.0 figures differ.
  Corrected the benchmark name in `README.md` and in "The task" below, which the README had copied. The same page
  says Opus 5.5 results are at max effort unless noted, so "at maximum effort" stays
- 2026-09-23T11:39:54Z [Claude Code, anthropic/claude-opus-5-5] C1 applied as the human decided: the reviewer row's reason is now
  "Direct successor to GPT-5.6 Sol, at half the price", with the mistakes figure removed
- 2026-09-23T11:40:19Z [Claude Code, anthropic/claude-opus-5-5] C2 answered by running the suites on 446b271, the final tree:
  `npm run check:changes` exited 0, `npm run test:unit` passed 52 of 52, and `PORT=3100 npm test` exited 0 with 86
  end-to-end tests passed and none failed
- 2026-09-23T11:41:57Z [human] marked the unit implemented, with every review finding decided

## The task

Two changes to the "Agent model selection" section of `README.md`, and nothing else.

**Make it plainly a suggestion.** The section already dates its figures and says to recheck them, but it does not
say that the assignment is advisory. Separate what ages from what does not: the criteria, which barely change, from
the picks and figures, which changed in a day. State that the picks are a starting point a developer may depart
from, and keep the criteria as the rules they are.

**Update it for the models released on 2026-09-22.** Both vendors shipped on the same day, and the figures below
come from the sources listed at the end of this record rather than from recall.

| Role | Currently says | Becomes | Why |
|---|---|---|---|
| Planner | Opus 5 or Fable 5.1 | Opus 5.5 | Beats Fable 5.1 on agentic coding and costs less to run than Opus 5 |
| Implementer | local Qwen3.8-27B | unchanged model | Local and free; neither release affects it |
| Implementer, fallback | Sonnet 5 at "$3 / $15" | Sonnet 5 at $2 / $10 | The price in the section is stale, not the choice |
| Implementer, escalation | not in the table | Opus 5.5 | The rung above Sonnet 5, for units that are large or span repositories |
| Reviewer | GPT-5.6 Sol | GPT-6 Sol | Direct successor: about half as many mistakes, at half the price |

Every implementer row's reasoning column becomes `medium`, replacing "medium or low" and "low or medium". The
planner stays at `inherit` and the reviewer stays at `high`.

Supporting figures worth carrying into the section: Opus 5.5 reaches 54.4% on FrontierCode v1.1 (Main) at maximum
effort, against GPT-6 Astra 53.3%, Fable 5.1 50.3%, Opus 5 48.0% and GPT-5.6 Sol 47.5%; and at its lowest effort it
found 72% of known bugs in code review, against Opus 5's 56% at high effort, with fewer false alarms and less output.
GPT-6 Sol is $2 / $10 per million tokens and Opus 5.5 is $4 / $20.

Three things that also need touching, because they name models by their old versions:

* The escalation ladder, "Qwen, then Sonnet 5, then Sol", and its follow-on that a unit Sol implemented is reviewed
  with Opus or Fable instead
* The paragraph rejecting GPT-5.6 Terra for implementation. Keep it, and say it concerns the previous generation,
  rather than deleting reasoning that is still the reason
* The sources list

## Decisions

* **The cross-vendor reviewer becomes a stated rule, not a sentence in the preamble.** Opus 5.5's review result is
  strong enough to tempt a later reader into making it the reviewer, which would quietly destroy the property that
  the reviewer does not share the planner's and implementer's blind spots. That property outlives any model, so it
  belongs with the criteria rather than among the picks.
* **Every implementer runs at `medium`, and escalation changes the model rather than the effort.** The section's
  reason for keeping implementers below high still holds: the implementer follows a plan rather than re-deriving
  it, and high effort is where scope creep and unrequested rework come from, which is a deliberate trade of
  capability for obedience. General guidance that coding and long-horizon agentic work respond strongly to effort
  pulls the other way, and `medium` is where the two settle. Fixing one value across the whole ladder keeps that
  trade constant while capability climbs, which works because a stronger model at `medium` can exceed a weaker one
  at `high`. It also removes a real defect: the two implementer rows read "medium or low" and "low or medium",
  which are the same pair in two orders and tell a reader nothing about which to pick.
* **The planner keeps `inherit` and the reviewer keeps `high`.** Architectural judgment is the work that most
  repays effort, so the planner is the wrong place to economize. The reviewer has no scope-creep risk to manage,
  because it changes nothing it reviews, so thoroughness costs nothing but tokens.
* **Nothing is removed.** The Terra rejection and the Qwen limitations are research that still explains the current
  shape, so they are updated in place rather than dropped.

## Sources

- https://www.anthropic.com/claude-opus-5-5
- https://techcrunch.com/2026/09/22/anthropic-releases-opus-5-5-with-lower-prices-and-fable-level-performance/
- https://venturebeat.com/technology/anthropic-releases-claude-opus-5-5-beating-fable-5-1-on-key-agentic-benchmarks-at-60-cheaper-api-price
- https://openai.com/index/introducing-gpt-6-sol-and-luna/
- https://techcrunch.com/2026/09/22/openai-launches-gpt-6-sol-and-luna/
- https://www.cosmicjs.com/blog/claude-opus-5-5-vs-opus-5

## Amendments
