# 0119 An item beyond the request keeps its number

## Context

`process.md` says that `spec.md` states, among the rest, what was left out as beyond the request, and that the human
may refer to item *n* of a spec's "Beyond the request" as `BTR<n>`. `templates/changes/spec.md` says of an item that it
is left out unless the human takes it. `roles/specifier.md` says to write the items as a numbered list, so the human
can take or decline each by its number, and to leave an item out of the unit unless the human takes it. None of them
says what becomes of the list once the human has decided on an item: whether a taken item stays in the list, whether
a declined one does, and whether the items are numbered again.

Two units show what that leaves open. In unit 0116, the human took the first of two items into the unit and left the
second out. The specifier moved the taken item into the requirements and numbered the remaining item again, from
`BTR2` to `BTR1`, so that the record's entries and the messages that had named it `BTR2` no longer named it rightly,
and its plan names it `BTR1`. In unit 0117, the items the human left out were removed from the spec on a hand-over
that misread the decision, and were then restored in a commit of their own.

The human decided how the list is kept: an item taken moves into the requirements and says which item it was, an
item left out stays as it is, and the numbers never change, with a taken item leaving a line in its place that says
where it went.

The human is concerned that the kit's always-read files grow. `process.md` and `standards.md` are read by every
session of every project. At `ed8c644`, `wc -w` in the root of this repository prints `2406` for `process.md` and
`1205` for `standards.md`, and `863` for `roles/specifier.md`, `1447` for `extra-roles/spec-reviewer.md` and `69`
for `templates/changes/spec.md`.

## Requirements

1. `roles/specifier.md`, where it says to put an item under "Beyond the request", says how the list is kept once the
   human has decided on an item:
    * an item the human takes moves into the requirements, and the requirement it becomes ends with `(was BTR<n>)`,
      with the item's number
    * in its place in the list, the taken item leaves one line, `BTR<n>: taken, now R<m>`, with the item's number and
      the requirement's, as `1. BTR1: taken, now R10`
    * an item the human leaves out stays in the list as it was written
    * the number of an item never changes, also when a revision of the spec adds, takes or removes other items, so
      that every `BTR<n>` in the record and in messages keeps naming the item it named
2. R1 holds for every "Beyond the request" the specifier writes, in a spec and in the record of a task, and for every
   revision of it, before the approval and after
3. The placeholder of "Beyond the request" in `templates/changes/spec.md` says, besides what it says now, that a taken
   item moves into the requirements and leaves the line of R1 in its place, that an item left out stays, and that the
   numbers never change
4. `extra-roles/spec-reviewer.md`, in its kind of finding "Scope", no longer counts as a finding a requirement that
   ends with `(was BTR<n>)` where the list holds the line of R1 for that item
5. No document, role file, template or prompt of the kit says that a taken or a declined item is removed from the
   list, or that the items are numbered again
6. `process.md`, `standards.md` and `templates/changes/record.md` are not changed by this unit. The sentence of
   `process.md` on `BTR<n>` agrees with R1 as it stands, and the record template holds no "Beyond the request"
7. `record.md` logs `wc -w` of `process.md` and `standards.md` at the commit the unit's branch is cut from and once
   the work is done
8. The lines of the changed files are within 120 characters, they hold no em dash, `npm test` passes, and the change
   check, `npm run check-changes`, exits 0

## Decisions

* **The kind is `task`.** The unit changes the text of two role files and one template and nothing else, as 0060
  changed a rule of `standards.md` and 0070 one of `process.md`, both tasks. What there was to decide, the form of the
  line and where the rule goes, is decided here, so what is left is an edit whose description and diff say the same
  thing. `spec.md` is kept, as 0060 and 0118 kept theirs, for the reviewer to judge the work against. Its branch is
  `task-0119-an-item-beyond-the-request-keeps-its-number`
* **A taken item leaves a line, rather than its number simply being skipped.** A gap in a numbered list cannot be
  written in Markdown, which numbers the items of a list in order whatever numbers the source gives, so a removed item
  would number the rest again as soon as the spec is read rendered. The line keeps the place and says where the item
  went, so a reader who meets `BTR1` in the record finds it in one step
* **The line repeats the number as `BTR<n>`.** The list already numbers the item, but the label lets a search for
  `BTR1` find the line, as it finds the requirement that ends with `(was BTR1)`
* **The rule goes in the specifier's role file and the template, and not in `process.md`.** Only the specifier
  writes and revises the list, from the role file and the template, and `process.md` is read by every session. Its
  sentence on `BTR<n>`, that it names that item of the spec of the unit under discussion, is what this unit makes
  true over time, and needs no word added for it. Its bullet on `spec.md`, what was left out as beyond the request,
  stays true too: the line of a taken item holds no content, only where the item went
* **The rule holds for a task's record, although no template gives a task a list.** `templates/changes/record.md`
  has no "Beyond the request", and the specifier's section on a task record names none. A task whose decisions need
  one has a `spec.md`, as 0118 has, and R1 covers it there. R2 makes the rule hold wherever a specifier still writes
  such a list in a record, without adding a section to the template, which is BTR3
* **The spec-reviewer needs a word.** Its kind "Scope" counts a requirement that the request did not ask for and that
  is not under "Beyond the request". A taken item is a requirement no longer under the list, which a spec-reviewer
  reading that sentence could report. The mark `(was BTR<n>)` and the line in the list show that the human took it.
  The other role files name no "Beyond the request", and the implementer, the planner and the reviewer judge the
  requirements as they stand, whatever they came from
* **No limit on the words of the role files.** The human set none. The always-read files are not changed, and R7 logs
  their counts so that the record shows they did not grow

## Non-goals

* Changing any existing unit's documents. 0116 is implemented and frozen, and 0117 and 0118 are drafts handled apart
* Keeping the numbers of the requirements, of the decisions or of a review's findings from changing
* A check, in the change check or elsewhere, that the numbers of the items do not change
* Changing what the human may write as `BTR<n>`, or how a message's `**Needed from you**` list is numbered

## Beyond the request

1. Keep the numbers of the requirements from changing on a revision of the spec, as R1 does for the items, so that a
   requirement placed among the others does not number the rest again. It would keep every `R<m>` in the record and
   in a review true, at the cost of requirements out of their reading order and a rule on every revision. Without it,
   a taken item is best added as the last requirement, and a reference to an `R<m>` made stale by a revision is
   corrected when it is found
2. Number the requirements of `templates/changes/spec.md`, which gives them as a bulleted list, so that `R<m>` in the
   line of R1 names something the template shows. It would cost a character of the template. Without it, the
   specifier's role file already has the requirements numbered, and the specs of this repository number them
3. Add a "Beyond the request" section to `templates/changes/record.md`, for a task with only a record. It would cost
   a few lines of the template, and every task record would carry the section or a "None". Without it, a task whose
   items need a list has a `spec.md`, as 0118 has
4. Have the change check refuse a branch that changes the number or the text of an item of "Beyond the request" other
   than by the line of R1. It would cost code and tests in `scripts/check-changes.mjs`, which reads specs today only
   for their freeze. Without it, a renumbering shows in the diff, where the spec-reviewer and the human see it
