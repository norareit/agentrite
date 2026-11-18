# 0108 Where reviews are saved and when log entries were written are left to each agent's guess

## Approach

The fix is to the text of the kit, and to one test that keeps it. The regression test comes first and reads the
documents of the working tree, the root `process.md`, `roles/` and `extra-roles/`, not the copy of the installed
release under `node_modules/agentrite/`. Then `process.md` gets its three rules, each where the spec puts it: the
definition of `<unit-directory>` in the paragraph that already names `.reviews/<unit-directory>/`, the source of a
timestamp among the rules on entries, and the dates of a commit under "Commits". Last, the role files that name a
place under `.reviews` for a unit point to that definition, so that no role reads its input `changes/<number>-
<kebab-name>/` into the path.

No file of `process.md`, `roles/` or `extra-roles/` names `.reviews/changes/` today, and none of the tree outside
`changes/` names `GIT_AUTHOR_DATE`, `GIT_COMMITTER_DATE` or `--date`. The part of the test on `.reviews/changes/`
therefore passes before the fix and keeps R2 true after it; the part on the timestamp fails before the fix.

The reviewers' lines on the timestamp stay as they are, as the spec decides. No command changes, so `COMMANDS.md`
does not, and no file at the root is added, so neither table of `README.md` or `CONTRIBUTING.md` does.

## Files

- `tests/process-rules.test.mjs`: new, the regression test of R5
- `process.md`: the definition of `<unit-directory>` (R1), the source of a timestamp (R3), the dates of a commit (R4)
- `roles/reviewer.md`: its "Output" names `.reviews/<unit-directory>/` as `process.md` defines it (R2)
- `roles/implementer.md`: its line on taking findings names `<unit-directory>` as `process.md` defines it (R2)
- `extra-roles/spec-reviewer.md`: its "Output" names `.reviews/<unit-directory>/` as `process.md` defines it (R2)
- `extra-roles/security-reviewer.md`: its path of a unit review's findings file names `<unit-directory>` as
  `process.md` defines it (R2)

## Tasks

- [ ] Add `tests/process-rules.test.mjs`, run by `npm test` as every `tests/*.test.mjs` is. It reads files with
  `readFileSync` and builds paths with `fileURLToPath`, never from a URL's `pathname`, as
  `tests/file-paths.test.mjs` requires. It holds two tests, each with a comment naming the requirement of unit 0108
  it keeps (R5)
    - [ ] One asserts that `process.md` at the root holds `date -u +%Y-%m-%dT%H:%M:%SZ`, with a message saying that
      `process.md` no longer states where the timestamp of an entry in `record.md` comes from (R3, R5)
    - [ ] One reads `process.md` and every `.md` file directly in `roles/` and in `extra-roles/`, and asserts that the
      list of those whose text holds `.reviews/changes/` is empty, with a message naming the files and saying that a
      place under `.reviews` takes the name of the unit's directory without `changes/` (R2, R5)
- [ ] Run `node --test tests/process-rules.test.mjs` and see the test on the timestamp fail and the one on
  `.reviews/changes/` pass (R5)
- [ ] In `process.md`, in the paragraph that begins "A review's findings are saved in full", say that
  `<unit-directory>` in a path under `.reviews` is the name of the unit's directory in `changes/`, without
  `changes/`, and give `.reviews/0012-export-to-csv/` as the example, the unit of the example that the paragraph on
  variants below already uses (R1)
- [ ] In `process.md`, directly after the bullet "It opens with the timestamp, in the same UTC format as the
  frontmatter, written bare", or as a sentence of that bullet, say that the timestamp of an entry, and the
  `timestamp` of a record's frontmatter, is the output of `date -u +%Y-%m-%dT%H:%M:%SZ` run when the entry or the
  record is written, and is never estimated, carried over from another entry or taken from a local clock. Keep the
  format of the timestamp as it is (R3)
- [ ] In `process.md`, under "### Commits", add a bullet saying that an agent sets neither the author date nor the
  committer date of a commit, by an option such as `--date` or by `GIT_AUTHOR_DATE` or `GIT_COMMITTER_DATE`, and
  leaves both to git (R4)
- [ ] Run `node --test tests/process-rules.test.mjs` and see both tests pass (R5)
- [ ] In `roles/reviewer.md`, in "Output", name the place as `.reviews/<unit-directory>/`, the name of the unit's
  directory as `process.md` defines it. The later mention under "Save your complete findings" stays as it is (R2)
- [ ] In `roles/implementer.md`, in the line "Take findings only from the files of `.reviews/<unit-directory>/` of
  your own run, as `process.md` says", make the reference to `process.md` cover the definition of `<unit-directory>`
  as well as the variants, without restating the definition (R2)
- [ ] In `extra-roles/spec-reviewer.md`, in "Output", name `.reviews/<unit-directory>/` as `process.md` defines it.
  The later mention under "Save your complete findings" stays as it is (R2)
- [ ] In `extra-roles/security-reviewer.md`, at the path `.reviews/<unit-directory>/security-review-<commit>-
  <instant>.md`, say that `<unit-directory>` is as `process.md` defines it, in the sentences below the list that
  already say what `<commit>` and `<instant>` are. The places of an audit, `.reviews/security-audits/`, and
  `.reviews/security-accepted.md` are not a unit's and stay as they are (R2)
- [ ] Read every line of `process.md`, `roles/` and `extra-roles/` that holds `.reviews` and confirm that each place
  of a unit is written `.reviews/<unit-directory>/` and that no text near it reads as a path holding `changes/` (R2)

## Verification

- [ ] `npm test` passes
- [ ] `grep -rn "reviews/changes" process.md roles extra-roles` prints nothing
- [ ] `grep -n "date -u +%Y-%m-%dT%H:%M:%SZ\|GIT_COMMITTER_DATE\|0012-export-to-csv/" process.md` shows the three
  rules
- [ ] Every changed line is at most 120 characters, checked before each commit
- [ ] `npm run check-changes` passes after the last commit

## Commit Points

- [ ] `bugfix-0108 Plan the fix`: this `plan.md` and the planner's entry in `record.md`
- [ ] `bugfix-0108 State where reviews are saved and where timestamps and commit dates come from`: the test and
  `process.md`
- [ ] `bugfix-0108 Name the place of a unit's reviews as process.md defines it`: the four role files, and the
  implementer's entries in `record.md`
