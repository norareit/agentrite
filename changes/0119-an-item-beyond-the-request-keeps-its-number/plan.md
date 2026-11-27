# 0119 An item beyond the request keeps its number

## Approach

The unit changes the text of one role file, one extra role file and one template, and nothing else. The tree is that
of `f1b26ac`, the head of `master` the branch is cut from. The three files are as they were at `ed8c644`, where the
spec measured them; only `process.md` changed since, and its sentence on `BTR<n>` is still the one R6 relies on.

The unit adds no logic, so it adds no unit test and no end-to-end test: no test of the suite reads the text of these
three files. `npm test` is run to show that nothing else changed.

The wording below is the plan's, so that the files grow by no more than the change needs. It is put in as written,
wrapped at 120 characters.

**`roles/specifier.md`, "Writing the spec".** After the bullet that opens "Write as requirements only what the request
needs" and ends "it is fixed when it happens and not before", this bullet is added, before the bullet that opens "A
unit that claims to be safe":

```markdown
* Keep the numbers of "Beyond the request", in a spec and in a task's record, on every revision before the approval
  and after, so that every `BTR<n>` keeps naming its item. An item the human takes moves into the requirements, the
  requirement ending with `(was BTR<n>)`, and leaves in its place the one line `BTR<n>: taken, now R<m>`, as
  `1. BTR1: taken, now R10`. An item left out stays as it was written. The number of an item never changes, also when
  a revision adds, takes or removes other items
```

**`templates/changes/spec.md`, "Beyond the request".** The placeholder becomes:

```markdown
1. [What the specifier would add that the request does not need, with its cost and what happens without it. Left
   out unless the human takes it. A taken item moves into the requirements and leaves the line `BTR<n>: taken, now
   R<m>` in its place, an item left out stays, and the numbers never change. Write "None" when there is nothing]
```

**`extra-roles/spec-reviewer.md`, the kinds of finding.** The bullet "Scope" becomes:

```markdown
* **Scope**: what the request asked for that no requirement covers, and a requirement that the request did not ask
  for and that is not under "Beyond the request". A requirement that ends with `(was BTR<n>)`, where the list holds
  the line `BTR<n>: taken, now R<m>` for it, was taken by the human and is no finding
```

## Files

- `roles/specifier.md`: the bullet on how the list of "Beyond the request" is kept
- `templates/changes/spec.md`: the placeholder of "Beyond the request"
- `extra-roles/spec-reviewer.md`: the bullet "Scope"
- `changes/0119-an-item-beyond-the-request-keeps-its-number/record.md`: the word counts and the work done

## Tasks

- [ ] Log in `record.md` `wc -w` at `f1b26ac`, in the root of the repository, of `process.md` (2562) and
  `standards.md` (1205), which R7 asks for, and of `roles/specifier.md` (863), which the unit changes and which
  "The length of the kit's instructions" of `AGENTS.md` counts among the kit's instructions (R7)
- [ ] Add the bullet above to "Writing the spec" of `roles/specifier.md`, after the bullet that opens "Write as
  requirements only what the request needs" (R1, R2)
- [ ] Replace the placeholder of "Beyond the request" in `templates/changes/spec.md` with the one above (R3)
- [ ] Replace the bullet "Scope" of `extra-roles/spec-reviewer.md` with the one above (R4)
- [ ] Search the repository outside `changes/`, `CHANGELOG.md` and `node_modules/`, the code and the prompts among
  it, for "Beyond the request", `BTR` and "number", and confirm that nothing says that a taken or a declined item is
  removed from the list or that the items are numbered again. Change any text that does, and log the search and
  its result in one line of `record.md` (R5)
- [ ] Confirm with `git diff f1b26ac -- process.md standards.md templates/changes/record.md` that the three files
  are unchanged (R6)
- [ ] Log in `record.md` `wc -w` of `process.md`, `standards.md` and `roles/specifier.md` once the work is done. The
  first two do not change; for `roles/specifier.md` the entry says that the added words are the rule of R1 and R2
  (R7)

## Verification

- [ ] `awk 'length > 120 { print FILENAME ": " FNR }'` over the three changed files and `record.md` prints nothing
  (R8)
- [ ] `grep -nP '\x{2014}'`, a search for the em dash, over the three changed files and `record.md` prints nothing (R8)
- [ ] `npm test` passes (R8)
- [ ] `npm run check-changes` exits 0, run after the work is committed (R8)

## Commit Points

- [ ] `task-0119` commit of the three changed files, with the entries of `record.md` for the word counts at `f1b26ac`
  and for the search of R5
- [ ] `task-0119` commit of `record.md` with the word counts once the work is done and the work's entry
