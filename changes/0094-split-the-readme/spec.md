# 0094 Split the README into a landing page and references

## Context

`README.md` has grown to nearly 2000 lines. Most of it is reference: the commands with every option (about 650
lines with the exit statuses), the orchestrator (about 490), the installation in depth and the configuration of a
project (about 550), and "Running a role" (about 100), which describes `agentrite run` a second time beside its entry
under "Commands". The README's sandbox section largely repeats `SANDBOX.md`. A reader who wants to know what the kit
is and how to start has to find it among all of that.

The growth comes from the rules in "The documents" of `AGENTS.md`. They require every command to be described in
`README.md` with every argument, option and environment variable, and they give the README, `SANDBOX.md` and
`CONTRIBUTING.md` one shared purpose, so every unit that adds or changes something adds to the README. No rule says
what belongs in the README and what belongs elsewhere.

The human wants the README to answer what the kit is and how to start, with diagrams of the kit's components and of
the workflow the human uses. The reference goes into documents of its own, and the rules say clearly what goes
where. `COMMANDS.md` opens with a table that is a short reference of every command. Content is moved and not
shortened in this unit. Shortening is left to a later unit.

## Requirements

### The README

1. `README.md` holds these parts, in this order:
    * what the kit is, with "The name"
    * the components diagram
    * a quick start: installing the package, `npx agentrite init` with the harnesses, and the steps of a first unit
      from the spec to the merge, each with the command it runs, and a link to `SETUP.md` for everything else about
      installing
    * how it works: the unit, the roles table and what the roles do now under "How it works", the statuses, the
      workflow diagram, and the numbered workflow list as it is now
    * a map of the documents: `COMMANDS.md`, `ORCHESTRATOR.md`, `SETUP.md`, `SANDBOX.md`, `CHANGELOG.md` and
      `CONTRIBUTING.md`, each with the question its reader brings to it and a link
    * "What is here"
2. The README holds none of the sections that requirements 4, 7 and 8 move out of it. Of "The sandbox" it keeps a
   paragraph of at most five lines that says what the sandbox is, with a link to `SANDBOX.md`

### The commands

3. `COMMANDS.md` holds "Commands", with every command's section as it is in the README now, and "Exit statuses"
4. "Running a role" is merged into the section of `agentrite run` in `COMMANDS.md` and is a section no more.
   Every statement it makes that the section of `agentrite run` does not make is in that section afterwards. A
   statement both make is there once
5. `COMMANDS.md` opens with a table of every command, in the order of the sections, with one row per form of a
   command that has several, such as the forms of `sandbox.sh`. Each row holds:
    * the synopsis of the form, with every argument and option, as the command's section gives it
    * what the command does, in at most 60 characters
    * a link to the command's section
6. Every link to a section of "Commands" or to "Exit statuses", in the documents, the shipped code, the templates
   and the tests, points to `COMMANDS.md`

### The orchestrator and the setup

7. `ORCHESTRATOR.md` holds "The orchestrator" with all of its subsections
8. `SETUP.md` holds, in this order: "Installing it into a project" with its subsections, "Git hooks", "The
   project's settings", "Replacing a role or the standards", "Adding a role" and "Updating a project to a newer kit"
9. What the README's section "The sandbox" holds and `SANDBOX.md` does not is in `SANDBOX.md` afterwards, put in the
   section of what the reader is doing, as "The documents" in `AGENTS.md` requires

### Moving

10. Moved text keeps its wording. The only changes to it are:
    * the levels of its headings
    * a reference to a section that is now in another document, which names that document or links to it
    * the merge of requirement 4
11. `record.md` lists every section of the README as it was at the start of the unit and where each went, so that
    a reviewer can check that nothing was lost
12. Every link from one of the documents to another, and to a section of one, resolves to a heading that exists
13. Every message of the kit's code, its templates and `pointers/` that sends a reader to a section of the README
    that moved names the document the section is in now. The tests that check content of the README check it in
    the document it moved to

### The diagrams

14. `diagrams/` at the root of the repository holds, for each diagram, its Mermaid source `<name>.mmd` and the SVG
    generated from it `<name>.svg`. There are two diagrams:
    * the components: the process and the standards, the roles (the kit's four and a project's own), the change
      units in `changes/`, the role wrappers of the harnesses, `agentrite run`, the orchestrator and the sandbox,
      and how they relate: which runs or starts which, and which reads which
    * the workflow, as the human works now: specifying together with the human, the human's approval, the sandbox,
      planning, implementing, the review and its fixes as a loop, leaving the sandbox, and merging. The steps that
      need the human are marked apart from those an agent does, and the orchestrator is shown as the alternative
      that runs planning through the review and its fixes
15. The README shows each SVG by its absolute address on the default branch,
    `https://raw.githubusercontent.com/norareit/agentrite/master/diagrams/<name>.svg`, with alternative text that
    says what the diagram shows
16. Each SVG has a solid background, so it reads the same in a light and a dark theme
17. `npm run diagrams` generates every SVG in `diagrams/` from its Mermaid source. It runs a pinned version of the
    Mermaid command line through `npx`, and that is not a dependency of the repository, so `npm ci` installs nothing
    it did not install before. `CONTRIBUTING.md` describes the command under "Commands", including that it needs a
    browser that Mermaid's command line downloads and that it is run on the host
18. `diagrams/` is not in the package and is in the table "What the repository holds besides the package" of
    `CONTRIBUTING.md`

### The package and the rules

19. `COMMANDS.md`, `ORCHESTRATOR.md` and `SETUP.md` are in `files` of `package.json`, and in the table "What is
    here" of the README
20. "The documents" in `AGENTS.md` holds a table of `README.md`, `COMMANDS.md`, `ORCHESTRATOR.md`, `SETUP.md`,
    `SANDBOX.md` and `CONTRIBUTING.md`, each with the question its reader brings to it and what goes in it
21. "The documents" says that a unit changes the README only when it changes what the kit is, the quick start, a
    component or the workflow, and that it otherwise changes the README at most by a line of the map of the documents
22. The rule of "The documents" that every command is described with every argument, option and environment
    variable names `COMMANDS.md` in place of `README.md`, and says that a command added, changed or removed changes
    its row in the table of requirement 5 too. Its other rules keep their meaning and their strength, with the name
    of the document they hold for corrected where the content moved
23. "The documents" says that a unit that changes a Mermaid source in `diagrams/` generates its SVG with
    `npm run diagrams` and commits both in the same unit, and that a unit that changes a component or the workflow
    the diagrams show changes the diagram
24. No rule, test or check limits the number of lines of a document
25. "Line limit" in `AGENTS.md` says that a line of a Markdown table may be longer than 120 characters, in every
    document of the repository, and that every other line keeps the limit. The rule of "The documents" on tables in
    `SANDBOX.md` keeps that a table there is a Markdown table and holds no HTML, and no longer requires its lines to
    fit the line limit or what does not fit to be written as text
26. A test of the kit's own checks that every link in `README.md`, `COMMANDS.md`, `ORCHESTRATOR.md`, `SETUP.md`,
    `SANDBOX.md` and `CONTRIBUTING.md` to another of these documents, or to a section of one of them or of itself,
    names a document that exists and, where it names a section, a heading that the document holds. It fails naming
    the document, the link and what it does not find
27. `npm test` and `npm run check-changes` pass

## Decisions

- The new documents are at the root beside `SANDBOX.md`, and not in `docs/`. `SANDBOX.md` is already at the root,
  and the shipped code and the files `init` writes into a project name it there. Moving it would break those
  pointers in projects that installed the kit, and leaving it at the root with the others in `docs/` would give two
  conventions
- The installation in depth, the project's settings, replacing and adding roles, and updating go into one
  document, `SETUP.md`. They are all what a project does to set the kit up and keep it set up, and they refer to one
  another throughout. Splitting them into installing and configuring would make most of those references cross a
  document
- "Running a role" goes into `agentrite run`. All it says, how a run is stopped, how a session is resumed and in
  what order the harness gets its arguments, is about that one command, and half of its list of refusals repeats the
  command's entry
- This unit only moves content. A move that keeps the wording can be checked section by section against the old
  README, as the standards require when documentation is moved. Shortening is a separate unit, where a reviewer can
  judge each removal on its own
- The README aims at about 250 lines, as a goal of this unit and not as a requirement. No document gets a limit on
  its length: a document is as long as what it must say, and the rules of "The documents" are what keeps the README
  short
- A line of a Markdown table may pass the line limit of 120 characters, in every document. A row of Markdown cannot
  be wrapped, and a table such as the one at the top of `COMMANDS.md`, whose synopses with every option are longer
  than the limit by themselves, could otherwise only be kept within it by leaving out what it is for. The human
  chose to allow it for every table rather than for this one, so that no later table has to be cut down or turned
  into text to fit. That removes the requirement of `SANDBOX.md` that its tables fit the limit as well. Rejected:
  an exception for the table of `COMMANDS.md` alone, and a synopsis with its options shortened to `[options]`
- The diagrams are written in Mermaid and committed as SVG too. GitHub renders Mermaid in Markdown, but npmjs.com
  does not and would show the source as a code block. An SVG shows on both, and the Mermaid source keeps the diagram
  a text that a diff shows
- The SVGs are addressed by their absolute URL on the default branch, since npmjs.com does not resolve a relative
  image path. The page of a release on npmjs.com therefore shows the diagrams of the default branch, which may be
  newer than the release. An address by the release's tag would show the right one, at the cost of an edit to the
  README at every release
- The SVGs are generated by hand with `npm run diagrams`, and not automatically. Mermaid's command line renders in
  a headless Chrome that it downloads. The sandbox cannot reach the host Chrome is downloaded from, and a dependency
  of the repository would make `npm ci` download it, in the sandbox too. Running it through `npx` keeps it out of
  every install, and the command is run on the host when a diagram changes, which is rare

## Non-goals

- Shortening or rewording any section that is moved. That is a later unit
- Changing `SANDBOX.md` beyond what requirement 9 moves into it, and changing `CONTRIBUTING.md` beyond requirements
  17 and 18 and the references to moved sections
- Regenerating the SVGs in a hook, in the test suite or in the release
- Diagrams in any document other than the README
- Rewriting the numbered workflow list of the README. It is kept beside the workflow diagram as it is
- Reflowing a table that exists now. Requirement 25 allows a longer line of a table and asks no table to change

## Beyond the request

1. Declined by the human. A test that an SVG is not older than its source. `npm run diagrams` would write a hash
   of the Mermaid source into the SVG, and a test would compare the hash with the source, without rendering
   anything. Cost: a few lines in the command and a short test. Without it, a source changed without regenerating
   leaves an outdated picture in the README until someone notices, which is seen and fixed by running
   `npm run diagrams`
2. Taken by the human, as requirement 26. A test that every link between the documents, and to a section of one,
   resolves, as requirement 12 asks of this unit. Cost: a test that parses the Markdown links and headings of the
   shipped documents. Without it, a section renamed by a later unit can leave a link that leads to the top of the
   page, which a reader sees and is fixed when it is
