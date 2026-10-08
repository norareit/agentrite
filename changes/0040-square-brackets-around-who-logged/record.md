---
kind: task
status: in-progress
timestamp: 2026-10-08T19:25:31Z
---

# 0040 Square brackets around who logged an entry

## Description

`process.md` says of an entry in `record.md` that it "opens with the same UTC timestamp format as the frontmatter,
then names the harness and provider/model that made it, or `human` for a human-only action". It does not say how
that name is written. The records of this repository put it in square brackets, as `[human]` and
`[Claude Code, anthropic/claude-opus-5-5]`, which an editor highlights, so that who made each entry is seen at a
glance. Another project that uses the kit wrote the harness and the model as plain text, without the brackets.
`templates/changes/record.md` does not settle it: its line
`- [YYYY-MM-DDTHH:MM:SSZ] [[harness], [provider/model] | human] [Status transition or outcome]` uses square brackets
for what is to be filled in too, so its outer pair around the name reads as one more placeholder.

In `process.md`, under "Changes", say how an entry of `## Log` and of `## Amendments` is written, with an example:

* An entry is a list item. It opens with the timestamp, written bare, then who made it in square brackets, then, for
  an agent acting in a role, `as the <role>`, then the text
* Who made it is `[<harness>, <provider>/<model>]` for an agent, as `[Claude Code, anthropic/claude-opus-5-5]`, and
  `[human]` for a human-only action. The brackets are written, and are not a mark for something to fill in
* The role is one of the four under "Roles", as `as the planner`, on every entry the agent makes in that role and
  not only on its first. An entry of a human has none, and neither has one of an agent that acts in no role
* The example shows one entry of a human and one of an agent, as they stand in a record, such as:

  ```markdown
  - 2026-10-07T11:51:06Z [human] approved the spec. The status is `approved`
  - 2026-10-07T11:51:36Z [Claude Code, anthropic/claude-opus-5-5] as the planner, wrote `plan.md`. The status is
    `planned`
  ```

* Say that in `templates/changes/record.md` the brackets around the name are these, while its other brackets mark
  what is to be filled in

In `templates/changes/record.md`, give the two entry lines the role, between the name and the text, as
`as the [role]`, so that the template and `process.md` show the same form.

What `process.md` says of an entry today stays true and is not stated twice: the new text takes the place of, or
follows on, the bullet on `record.md`, as reads best.

Afterwards `npm test` and `npm run check-changes` pass.

Not part of this task: any other change to `templates/changes/record.md`, whose lines already have the brackets
where they belong; `roles/reviewer.md`, which asks for "the form the entries around it use" and is right once
`process.md` gives the form; the records that exist, here or in another project; a check by
`scripts/check-changes.mjs` that entries have the form; and the `CHANGELOG.md` section, which is written at the
release.

## Log

- 2026-10-08T19:25:31Z [human] saw a new project write its record entries with the harness and the model as plain
  text, without square brackets, while this repository always writes them in brackets, which IntelliJ highlights.
  Asked for a small task that puts the convention in `process.md`, with an example, if it is not there yet
- 2026-10-08T19:26:01Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the main session on the Linux
  host, on `master` at `4dbc436`. Read `process.md` and `roles/specifier.md`. The convention is not in `process.md`:
  it asks for the timestamp and the name and gives no form, and the template's own brackets are ambiguous. A task:
  a wording change to one document, with nothing left to decide. Numbered 0040: the plain directories run from 0001
  to 0039 without a gap, and 0042 and the `history-` directories do not count. Not checked: how the other project's
  entries read, which the human described and this session did not see. Status left at `draft` for the human's
  approval
- 2026-10-08T19:34:28Z [human] said that their own note of the form was `${datetime} [${LLM/human}] as the ${role}
  ${message}`, and asked whether the role matters too. Was told that it does, since one harness and model may write
  a record in several roles, and that the records here name it by habit and not on every entry
- 2026-10-08T19:34:28Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `ba3fe78`, added the
  role to the description: `as the <role>` after the name, on every entry an agent makes in a role, and none for a
  human or for an agent in no role. That every entry carries it, and not only the first of a session, is the
  specifier's reading of the human's form and not the human's in those words. The template is now part of the task
  for its two entry lines. Still a task: the form is the human's, and nothing is left to decide. Status left at
  `draft`
- 2026-10-08T19:36:49Z [human] read the description with the role in it, said that the role on every entry is fine, and asked for the
  task to be implemented, which approves it. The status is `approved`
- 2026-10-08T19:37:10Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in the main session on the Linux
  host, in the main checkout. Read `roles/implementer.md` and this record in full. Cut
  `task-0040-square-brackets-around-who-logged` from `master` at `05d68a2`, on which `npm test` passes with 411
  tests. The status is `in-progress`
