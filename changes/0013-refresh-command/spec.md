# 0013 A command that brings the kit's own files in a project up to date

## Context

`agentrite init` writes ten files into a project, and by unit 0010's decision each is the project's own once
written: `init` never writes one that exists. That is right for the files a project edits, `AGENTS.md` and
`agent/compose.project.yml`. It leaves no way to update the files a project does not edit.

Two kinds of generated file hold nothing but what the kit put there. A role wrapper holds the role's description,
copied from the kit, and one line pointing at the kit's role file. `agent.sh` execs the kit's wrapper by its path.
When a release changes a description, the pointer or the shim, the copies in every project are stale, and nothing
says so. The rename to AgentRite, in 0011, changed the installed path in all seven files at once. Moving Norareit to
it meant deleting them by hand and running `init` again, which is the only way there is.

The one edit the README invites a project to make in a wrapper is to pin a model for the role, as a key in the
wrapper's frontmatter. Deleting a wrapper and writing it again loses that.

## Requirements

1. `npx agentrite refresh <harness>...`, run from the project root, takes the harnesses `init` takes. With none, or
   with an unknown one, it prints the usage of `refresh`, writes nothing and exits 2, as `init` does
2. `agentrite` with no command, or with one that is neither `init` nor `refresh`, prints a usage that names both
   commands and exits 2. `init` behaves as before in every other respect
3. For each harness given, `refresh` makes each of its role wrappers what this release writes for that role, with
   one exception, requirement 4. A wrapper that does not exist is written
4. A line in an existing wrapper's frontmatter that opens with `model:` at the left margin is kept, as it is
   written, after the release's own keys. That is how a model pinned for a role survives a refresh
5. Everything else in an existing wrapper is replaced by what the release writes: its keys, anything else a project
   added to the frontmatter, and the whole body. A wrapper with no frontmatter is replaced whole
6. `refresh` makes `agent.sh` what this release writes, and executable, whether or not it existed
7. `refresh` creates and changes nothing else. `AGENTS.md`, `CLAUDE.md`, `agent/compose.project.yml`,
   `package.json` and `.dockerignore` are byte for byte what they were, and one that is missing stays missing
8. It prints one line for each file, saying whether it was written, refreshed or already up to date, and exits 0.
   A second run straight after the first reports every file as up to date and changes nothing
9. A path where a file would go that holds something other than a regular file, such as a symbolic link or a
   directory, is left as it is and named on standard error. The other files are still handled, and the exit status
   is 1
10. It needs neither a `name` in `package.json` nor Playwright in the lockfile, and runs in a project that has
    neither file
11. The README describes the command where it describes moving a project to a newer release, says which files it
    rewrites and which it never touches, and says that a model pinned in a wrapper's frontmatter survives while
    anything else added to a wrapper or to `agent.sh` does not
12. The new logic is unit tested, and the command is tested end to end in a temporary project, as `init` is
13. Withdrawn. It defined a form of frontmatter that `refresh` read
14. Withdrawn. It had `refresh` refuse a wrapper whose frontmatter was not in that form

## Decisions

* **The wrappers and `agent.sh` are the kit's, and the other generated files are the project's.** This narrows
  0010's rule that every generated file is the project's own once written. That rule still holds for `init`, which
  never overwrites, and for the three files `refresh` never touches. It no longer holds for the seven that carry
  only the kit's content. `CLAUDE.md` is left out although the README calls it best left as written: Norareit has
  already added a line of its own to it, and little in it can go stale, since it names only `AGENTS.md` and the
  kit's `process.md`
* **One command that rewrites, not a command that deletes followed by `init`.** A delete has to know the same list
  of files a rewrite does, and leaves a state in between where the project has no wrappers. Rewriting in one step
  can also keep what the project added and say what changed. The names "install" and "clean install" were
  rejected because they read as `npm install` and `npm ci`, which do something else
* **Only the pinned model is kept, by its line, and no YAML is read.** The human decided this on 2026-10-02, after
  three reviews. Pinning a model is the one edit to a wrapper the README invites, and it is one line. The unit first
  set out to keep every key a project might add, which meant reading YAML without a parser, the kit having no
  dependency to parse with. Three review rounds each found input the reading got wrong: keys in quotes dropped, a
  line inside a quoted value taken for a key, a bracket inside a comment counted as closing a list. Each fix was
  more code, a stated form of frontmatter with a refusal for the rest, and a comparison against a real parser, for
  a benefit nobody had asked for. The human's reasoning ended it: the wrappers are tracked files, so whatever a
  project put in one is in its git history; the worst a refresh can do is overwrite it, which `git diff` shows; and
  a project that loses something it needed says so, and that case is dealt with then, knowing what it is. So
  `refresh` looks for a line that opens with `model:` and keeps it as written, whatever its value, and replaces the
  rest. Keeping nothing at all was rejected, since the documented edit would then be undone by every kit update. A
  YAML parser as a dependency was rejected: the kit's first, in every project, for one line
* **`refresh` is told the harnesses, like `init`.** Detecting them from the directories that exist was rejected:
  a project may keep a `.claude/` directory for other reasons, and an explicit list also writes the wrappers of a
  harness the project is adding
* **`package.json` and `.dockerignore` are not refreshed.** Both hold the installed path, in the check script and
  in the build context's exception, and both would be stale after a rename of the package. But both are files the
  project owns and edits, `init` already adds what is missing, and a path that changes with the package's name has
  happened once. Rewriting a line inside a file the project owns is a different kind of command
* **A path that is not a regular file is refused, and the run goes on.** Writing through a symbolic link would
  change a file outside the project, which 0010 already refuses for `init`. Stopping at the first one would leave
  the other files stale for a reason that has nothing to do with them, so the rest are handled and the exit
  status says that something was left
* **`agentrite-roles` is unchanged.** It still writes the wrappers into a project that has none and refuses to
  overwrite. `refresh` is a subcommand of `agentrite`, beside `init`, because it handles the shim too

## Non-goals

* Reporting that a project's files are stale without changing them, or that a newer release exists
* Updating `AGENTS.md`, `CLAUDE.md` or `agent/compose.project.yml`, or telling the project what a release changed
  in their templates
* Updating the check script's path or the `.dockerignore` exception
* Removing the wrappers of a harness the project no longer uses
* Running `refresh` automatically when the kit is installed. A package that rewrites a project's tracked files from
  an install script would surprise, and npm may not run install scripts at all
* Moving Norareit to the command. Its move to 2.0.0 is done by hand, in its own unit
