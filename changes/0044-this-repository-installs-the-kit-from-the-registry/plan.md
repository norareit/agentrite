# 0044 This repository installs the kit from the npm registry

## Approach

The unit is the four steps of requirement 5 of unit 0043, done in this repository, and two corrections of text
that the steps do not reach. It changes no file of the package and adds no test: every requirement is a state of
this repository's own setup, and "Verification" holds the command that shows each.

It is built in two commits after the one that starts the implementation:

1. **The move**, in one commit: the devDependency and the lockfile, what `refresh` writes, and the path in the
   project's own files. The three belong together. Between them `sandbox.sh`, the role wrappers, `AGENTS.md` and
   the `check-changes` script name a directory that is not there, so no state between them is one to commit
2. **The two texts**, in one commit: the comment above `ALLOWLIST`, and the sentence of `CONTRIBUTING.md`

Then what "Verification" lists, which changes no tracked file but `record.md`.

**The working copy is what 6.0.0 shipped.** The spec leaves this to the planner. The tarball of
`agentrite@6.0.0` was fetched from `registry.npmjs.org`, its shasum is the `5ef9af2d40a27b51e780276a490e8d0430f88264`
that `npm view` gives, and `diff -r` of each of its 29 files against the tree at `d0f8930` shows no difference:
`process.md`, `CHANGELOG.md`, `SANDBOX.md`, `README.md`, `LICENSE`, `package.json`, `roles/`, `templates/`,
`container/` and the four files of `scripts/`. The only commits on `master` since the tag `v6.0.0` are this
unit's own documents. So `npx agentrite refresh claude opencode`, which at this root runs the working copy's
`scripts/agentrite.mjs`, writes what the release writes (R3). The implementer checks once more, before task 2,
that `git diff v6.0.0 -- scripts roles templates` is empty on the branch, and stops when it is not.

**The steps were tried on a copy.** In a scratch directory made with `git archive` of `d0f8930`, with npm 11.19.1
and node 26.9.0, tasks 1 to 6 below were done as written. What was seen, and what the implementer should see
again:

* `npm uninstall @ritenoar/agentrite` and `npm install --save-dev --save-exact agentrite@6.0.0` both exit 0, in a
  package that is itself named `agentrite`
* `package.json` differs in one line, the devDependency. The install does not touch the `check-changes` script
* `package-lock.json` has the entry `node_modules/agentrite`, version `6.0.0`, resolved from
  `https://registry.npmjs.org/agentrite/-/agentrite-6.0.0.tgz`, with the integrity
  `sha512-GjRzQ8XTdWm1sLDVHpEosLxHA4engiuc1kr9k8ZyXr+qdbkhFzlAnZ/MNTD0MaXrwKlyDi4YVpHgByDKl8lbIA==`, and a line
  `"license": "MIT"` that the old entry did not have
* `refresh` prints `refreshed` for nine files: the eight wrappers and `sandbox.sh`. In each wrapper the body's two
  lines change, because the shorter path lets `this` or the word before it onto the first line. In `sandbox.sh`
  the last line changes. Nothing else of the nine differs
* After the replacement of the path, `git grep` of requirement 7 finds nothing, `npm ci` exits 0, `npm test` passes
  with 426 tests, as it does on `master`, and `npm run check-changes` exits 0

Not tried: anything that builds or starts a container, which is requirement 9.

**The instructions move under the implementer's feet.** Task 1 removes `node_modules/@ritenoar/agentrite/`, which
this session's `AGENTS.md` and role wrapper point to until tasks 2 and 3 are done. The implementer reads
`process.md` and `roles/implementer.md` of the installed 5.0.0 before task 1, as the role asks anyway, and from
task 1 on reads them at `node_modules/agentrite/`.

**No line is wrapped again but where its text is rewritten.** `node_modules/agentrite` is shorter than what it
replaces, so no line passes 120 characters, and requirement 4 has nothing else differ in `AGENTS.md` and
`.dockerignore`. The replacement is of the path alone, in place. The sentence of `CONTRIBUTING.md` is rewritten
and so is wrapped as written in task 8.

**The test of "Beyond the request" is not built.** The spec left it out, and no task makes it.

## Files

- `package.json`: the devDependency `agentrite` at `6.0.0` in place of `@ritenoar/agentrite`, and the path in the
  `check-changes` script
- `package-lock.json`: as `npm` writes it
- `.claude/agents/specifier.md`, `planner.md`, `implementer.md`, `reviewer.md`: as `refresh` writes them
- `.opencode/agents/specifier.md`, `planner.md`, `implementer.md`, `reviewer.md`: as `refresh` writes them
- `sandbox.sh`: as `refresh` writes it
- `AGENTS.md`: the path, twice in line 5
- `.dockerignore`: the path, in line 4
- `sandbox/compose.project.yml`: the path in line 2, and the comment above `ALLOWLIST`
- `CONTRIBUTING.md`: the first sentence of "The kit's own copy of the kit"
- `changes/0044-this-repository-installs-the-kit-from-the-registry/record.md`: the log

Not changed: `CHANGELOG.md`, `RELEASING.md`, `README.md`, `SANDBOX.md`, `CLAUDE.md`, which names no path of the
kit, everything in the package, and everything under `tests/`.

## Tasks

- [ ] 1. Run `npm uninstall @ritenoar/agentrite`, then `npm install --save-dev --save-exact agentrite@6.0.0`.
  Both exit 0. `git diff package.json` shows the one line of the devDependency, and `git diff package-lock.json`
  shows the entry as "Approach" gives it. Stop and log it when the version, the host of `resolved` or the
  integrity is another (R1, R2)
- [ ] 2. Check that `git diff v6.0.0 -- scripts roles templates` prints nothing, then run
  `npx agentrite refresh claude opencode`. It prints `refreshed` for the eight wrappers and for `sandbox.sh`, and
  `git status --short` shows those nine files changed and no other besides the two of task 1 (R3)
- [ ] 3. In `AGENTS.md`, replace `node_modules/@ritenoar/agentrite` with `node_modules/agentrite`, in the text of
  the link and in its target, both in line 5. No line is wrapped again (R4)
- [ ] 4. In `.dockerignore`, make line 4 `!node_modules/agentrite/container/**` (R4)
- [ ] 5. In `sandbox/compose.project.yml`, make line 2
  `# at node_modules/agentrite/container/compose.yml, which holds everything` (R4)
- [ ] 6. In `package.json`, make the `check-changes` script
  `node node_modules/agentrite/scripts/check-changes.mjs`. `git diff package.json` then shows two lines changed
  and no other (R1)
- [ ] 7. In `sandbox/compose.project.yml`, in the comment above `ALLOWLIST`, make the line
  `# auth.openai.com, chatgpt.com, the npm registry and the kit's release host. See` read
  `# auth.openai.com, chatgpt.com and the npm registry. See`, at the same indentation, which is what
  `templates/project/sandbox/compose.project.yml` of the release has there. The lines around it stay as they are.
  `git diff master -- sandbox/compose.project.yml` then shows this line and that of task 5, and no other (R5)
- [ ] 8. In `CONTRIBUTING.md`, under "The kit's own copy of the kit", replace the two lines of the first sentence
  with these two, and leave the four list items below them as they are (R6):

  ```markdown
  The kit is also a devDependency of itself, installed from the npm registry at one pinned version, so
  `node_modules/agentrite/` exists here too.
  ```

## Verification

- [ ] `git diff master -- package.json` shows the devDependency and the `check-changes` script, and nothing else
  (R1)
- [ ] `rm -rf node_modules && npm ci` exits 0, `node_modules/agentrite/package.json` has the version `6.0.0`, and
  `node_modules/@ritenoar` does not exist. `git grep -n '@ritenoar' -- package-lock.json` finds nothing (R2)
- [ ] `npx agentrite refresh claude opencode`, run again on the committed tree, leaves `git status --short` empty
  (R3)
- [ ] `git diff master --stat` names the files of "Files" and no other, and the diff of `AGENTS.md` and of
  `.dockerignore` is one line each (R4)
- [ ] `git diff master -- sandbox/compose.project.yml` shows the two comment lines and no other, so `name`, `image`,
  the limits and `ALLOWLIST` are as they were (R5)
- [ ] `git diff master -- CONTRIBUTING.md` shows the two lines of task 8 and no other (R6)
- [ ] `git grep -n -e '@ritenoar/agentrite' -e 'agentrite\.ritenoar\.com' -- ':!changes' ':!CHANGELOG.md'` finds
  nothing (R7)
- [ ] `npm test` passes, with the 426 tests of `master`. `npm run check-changes` exits 0, and the command it
  prints is `node node_modules/agentrite/scripts/check-changes.mjs` (R8)
- [ ] On the host, with Docker: `./sandbox.sh --in-place --rebuild true` exits 0, and then
  `./sandbox-dev.sh --in-place npm ci` exits 0. The implementer runs both where its session has Docker, and asks
  the human to where it has none. What each printed at its end, and its exit status, go into `record.md` (R9)
- [ ] No line of a changed file passes 120 characters, but for those of `package-lock.json`, which npm writes

## Commit Points

- [ ] `feature-0044 Start the implementation`: `record.md` alone, with the status `in-progress`
- [ ] `feature-0044 Install the kit from the npm registry`, after task 6: `package.json`, `package-lock.json`, the
  eight wrappers, `sandbox.sh`, `AGENTS.md`, `.dockerignore` and `sandbox/compose.project.yml`
- [ ] `feature-0044 Say where the kit is installed from`, after task 8: `sandbox/compose.project.yml` and
  `CONTRIBUTING.md`
- [ ] The log of what "Verification" showed, in `record.md`, as the implementer's role has it
