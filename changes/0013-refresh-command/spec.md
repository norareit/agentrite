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
4. In an existing wrapper whose frontmatter `refresh` reads, by requirement 13, a key that this release does not
   write for that harness is kept, with its value, including a value that runs over several lines, and with the
   comment lines that stand directly above it. Kept keys follow the kit's own, in the order they had. A key this
   release does write is given the release's value, whatever the wrapper held
5. Everything else in such a wrapper is replaced: the kit's own keys and the whole body below the frontmatter. A
   wrapper that does not open with a line of `---` has no frontmatter and is replaced whole
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
    rewrites and which it never touches, and says that a key added to a wrapper's frontmatter survives while
    anything else added to a wrapper or to `agent.sh` does not. It describes the frontmatter `refresh` reads and
    what happens to a wrapper written otherwise
12. The new logic is unit tested, and the command is tested end to end in a temporary project, as `init` is
13. `refresh` reads frontmatter written as follows, and no other. Lines end in LF or in CRLF. The frontmatter is
    closed by a line of `---`. Every line at the left margin is a key, an item of a list that is the value of the
    key above it, a comment or a blank line. A key is a plain name of letters, digits, `_` and `-`, directly
    followed by a colon. Its value is on the same line, after one space, or on the indented lines and list items
    below it. Wherever a value stands, on the key's line or below it:
    * a text in single or double quotes starts and ends on one line
    * a list or a map in brackets or braces starts and ends on one line and holds no quote and no `#`
    * a text opened by `|` or `>` holds anything, on lines indented further than its key
    * any other text holds no quote, and does not open with an anchor or a tag
    * a nested key is plain, or a quoted text that starts and ends before its colon
    * indentation is spaces
    * a comment may follow a value that ends on its line, set off from it by a space
14. A wrapper whose frontmatter is not written that way is left byte for byte as it is. `refresh` names it on
    standard error with the number of the first line it did not read and why, still handles the other files, and
    exits 1. That covers, among others, a key in quotes or with space before its colon, a key written with `?`, a
    quoted text or a bracketed list that runs over several lines, an anchor, a tag, and frontmatter that is never
    closed. A second run reports the same and changes nothing

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
* **Frontmatter keys the kit does not write are kept; the rest is replaced.** Pinning a model is the one edit the
  README invites, and it is a frontmatter key, as are a harness's other per-agent settings, some of which take a
  nested value. Keeping every key the kit does not write covers them without the kit knowing any harness's list of
  keys. Keeping additions to the body was rejected: the kit cannot tell a line a project added from a line an
  older release wrote, so it would have to keep stale text as well, which is the thing the command exists to
  remove. Git shows what a refresh replaced, and the command names each file it changed
* **`refresh` reads one exact form of frontmatter and refuses the rest. It is not a YAML parser.** The human
  decided this on 2026-10-02, after two reviews. The command reads the frontmatter line by line, the kit having no
  dependency to parse YAML with. The first version took any line shaped like `name:` for a key, and the first
  review showed keys it missed, in quotes or with space before the colon, which were dropped without a word. The
  fix widened what counts as a key, and the second review showed the wider reading taking a line inside a quoted
  value for a key and cutting the value in two, leaving frontmatter that no longer parses. Each widening guesses
  at more of YAML and guesses wrong somewhere else. So the command does not guess: requirement 13 states the form
  it reads, chosen so that a line it takes for a key cannot be the inside of a value, and requirement 14 has it
  leave any other wrapper alone and say so. What it defends is a project's wrapper against being changed wrongly
  in silence. What it does not promise is to accept every valid YAML file: a wrapper written in a form it does not
  read is refused although it is valid, and is refreshed by hand or rewritten in the plain form. The supported
  usage is a wrapper as the kit writes it, with keys added in the plain form, which is how a model is pinned and
  how a harness's nested settings are written. A YAML parser as a dependency was rejected: it would be the kit's
  first, installed into every project, for input that is rare. Overwriting the wrapper whole was rejected: it loses
  the pinned model on every refresh. Stating the limits and still rewriting the wrappers outside them was
  rejected: the second review's case left a broken file and reported success
* **A bracketed list or map holds no `#`.** The third review showed `tools: [read, # ]` passing as closed, because
  the closing bracket inside the comment was counted. Where a `#` starts a comment inside brackets depends on what
  stands before it, and parsers differ at the edges, so telling a comment from a `#` inside a word would be a guess
  again. Refusing every `#` between the brackets needs none. After the closing bracket a comment is no risk and is
  allowed, as it is after a quoted text
* **A comment belongs to the key below it.** A project that explains its pinned model does so on the line above.
  Taken with the key above instead, that comment would be dropped whenever the key above is the kit's
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
