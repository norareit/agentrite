# 0091 One contract per harness

## Context

The human wants to add another harness to the kit soon, and asked how to know every feature a harness must support.
Today there is no way to know it. What the kit knows of each harness in code is spread over registries of their own,
each keyed by the harness's name, and nothing fails when a harness lacks an entry in one of them:

* `HARNESSES` of the roles module: the harness's title, the directory of its role wrappers, how a wrapper is
  rendered, and the names of the harness's own agents. `HARNESS_NAMES`, the list of the harnesses the commands
  take, is derived from it
* `STARTS` of the run command: the harness's command, its flag that ends its questions about permissions, and how
  the options and the prompt are laid out for a session and for a headless run
* `HEADLESS` of the headless module: the arguments that make the harness print JSON events and that start or resume
  a session, how its final response and its session's id are read from what it printed, and what `--follow` shows of
  each line it prints, with a map of tool names per harness, `CLAUDE_TOOLS` and `OPENCODE_TOOLS`
* How the kit's instructions reach the harness, in the instructions module and in `init` and `refresh`: for Claude
  Code the lines `CLAUDE.md` must hold, and the notices for a `CLAUDE.md` that lacks them or still imports the kit's
  standards; for OpenCode the writing, amending and judging of `opencode.json`, and its notices. `init` and `refresh`
  each test `harnesses.includes('claude')` and `harnesses.includes('opencode')` to reach them

Outside code, what the kit knows of each harness is in the sandbox: its install and the version held in the image,
the choice of that version from the project's compose file, the host or the latest published, turning off its own
updates, the directories of its logs, its login, the hosts the egress allowlist admits for it, the bell, the status
line, and the trailers it adds to a commit message. It is also in the default settings, this repository's own
configuration, the documents, the components diagram of `diagrams/` and the tests. Since unit 0094 the documents
that name each harness are `README.md`, `COMMANDS.md`, `ORCHESTRATOR.md`, `SETUP.md` and `SANDBOX.md`.

The human chose two fixes together. In code, one module per harness, each implementing one contract, with a test
that every harness the kit knows implements all of it, so that a feature added to the contract fails the test for
each harness that lacks it. Outside code, a checklist in `CONTRIBUTING.md` of what adding a harness takes in the
places a test does not reach.

Unit `0090-a-stop-names-the-refused-permissions`, a `draft` feature, adds a reading per harness of the tool calls a
step was refused, beside `HEADLESS`. It is another feature of the kind this unit gathers.

## Requirements

1. Each harness the kit knows, `claude` and `opencode`, has one module of its own that holds what the kit's code
   knows of that harness, and each of the two implements one contract, the harness contract. The contract has these
   members, each as today's code has it for that harness:
    * its name, as the commands take it, and its title
    * its role wrappers: the directory they are written to, how a wrapper is rendered from a role, and the names of
      the harness's own agents
    * its start: its command, its flag that ends its questions about permissions, and how the options and the prompt
      are laid out for a session and for a headless run
    * its headless run: the arguments that make it print JSON events and that start or resume a session, the reading
      of its final response and its session's id, and what `--follow` shows of a line it printed, its tool names
      among it
    * how the kit's instructions reach it: the file it reads them from, the judging of that file, what `init` writes
      or amends of it, and the notices `init` and `refresh` print for it
2. The contract is defined once in code, as a value the test of requirement 4 reads, with the member's name, its kind
   and what it is for, beside the JSDoc type the harness modules are annotated with
3. One list of the harness modules, in the order `claude`, `opencode`, is the kit's only list of its harnesses.
   `HARNESS_NAMES`, and everything that goes over the harnesses, take them from it in that order. Outside the harness
   modules, no code of the kit's commands tests the name of a harness or holds a value that belongs to one harness,
   but for the two exceptions of the decisions: help texts that name harnesses as examples, and the `CLAUDE.md` that
   `init` writes into every project. Such code reaches a harness only through the contract, by its name
4. A test goes over every harness of the list of requirement 3 and every member of the contract of requirement 2, and
   fails, naming the harness and the member, for each member the harness lacks or has of another kind. A member added
   to the contract therefore fails the test for every harness that does not implement it
5. The commands behave as before this unit: what each prints, its exit status, the files it writes and their content,
   and the command and arguments each harness is started with are unchanged. The existing tests pass, changed in
   nothing but what they import and where they import it from
6. The package holds the harness modules and the module that defines the contract and lists the harnesses, so that
   the installed kit runs, and the test of the package's files names them
7. `CONTRIBUTING.md` has a section "Adding a harness". It opens with the contract: a module that implements it and
   its place in the list of requirement 3, with the tests of requirements 4 and 10 as the check of that part. It
   then has one entry for each place outside the harness modules where the kit holds knowledge of a harness, naming
   the file or the section and saying what is to be done there for a new harness. It covers at the least:
    * the image: installing the harness at the version a build argument without a default gives, and the label that
      records it
    * the wrapper's choice of that version, from the project's compose file, the host's `--version` or the latest
      published, with the build arguments of the sandbox's compose file, the shape of a version the wrapper accepts,
      and its comparison with the image's label at each start
    * turning off the harness's own updates in the image
    * the directories of its logs: made and owned in the image, owned at the entrypoint, mounted by the wrapper from
      the project's log directory on the host, and outside the home volume
    * its login: where it is kept, and a login that needs no callback into the sandbox
    * the hosts the egress allowlist admits for it, in the sandbox's compose file and the comment of the project's
      compose template
    * the bell: the hook or plugin that rings it, and its wiring in the wrapper
    * the status line, which only Claude Code has
    * the trailers it adds to a commit message, which the commit-message check refuses
    * the terminal variables the wrapper passes on, which were added for OpenCode
    * the default `harnesses` of the settings template, this repository's own `agentrite.json`, wrappers and
      instruction files, and the table of `CONTRIBUTING.md` that lists them
    * the help texts that name harnesses, in the usage of `agentrite run`
    * the sections of `README.md`, `COMMANDS.md`, `ORCHESTRATOR.md`, `SETUP.md` and `SANDBOX.md` that name each
      harness, the keywords of `package.json`, and the text of the `agentrite-roles` pointer package
    * the components diagram, whose Mermaid source in `diagrams/` names each harness and the directory of its role
      wrappers, and whose SVG is generated from it with `npm run diagrams` and committed with it
    * the tests that hold a case for each harness, such as those of the run command, of the orchestrator with fake
      harnesses, of `init` and `refresh`, of the harness versions, of the log directories, of the bell and of the
      allowlists
8. A search of the repository for `claude` and for `opencode`, ignoring case, outside `changes/`, `CHANGELOG.md`,
   `.git`, `node_modules` and the harness modules, finds no file that holds knowledge of a harness and that the
   checklist of requirement 7 does not account for. A file that names a harness only as a model's id, an example of
   a log entry or the author of a commit is not such knowledge
9. When this unit is built after unit 0090 is implemented, the reading of refused tool calls that 0090 adds is a
   member of the contract, in the headless run, and the error text by which OpenCode's refusal is known is in the
   OpenCode module
10. The harness modules are in a directory of their own that holds nothing else, one file per harness. A test
    compares the files of that directory with the list of requirement 3, and fails, naming the file or the entry,
    for a harness module that the list does not hold and for an entry of the list that has no file there

## Decisions

* **The kind is feature.** The work needs decisions: what the contract holds, how its completeness is enforced, and
  what stays outside it
* **A refactoring that changes no behaviour.** The standards ask that a commit change what the code does or how it is
  written, not both. This unit only changes how the code is written, and adds a test and a section of a document, so
  requirement 5 holds the commands to what they do today and lets the reviewer check exactly that
* **Completeness is enforced by a test, not by a compiler.** The project has no type checker: its types are JSDoc,
  and `npm test` runs node's test runner. A test is the one check that fails on every run for a harness that lacks a
  member. Adding a type checker was rejected as a larger change than the request, with a configuration and a new
  dependency of its own
* **The contract is a value beside its JSDoc type.** The test cannot read a JSDoc type, so the contract the test
  checks is a value in code. The type documents the members for the editor and the reader. The two encode one
  decision, which the standards would have extracted, but a JSDoc type cannot be derived from a value. Keeping them
  side by side in one module, so that they change together, was chosen over a type alone, which nothing would check
* **The test checks the members and their kinds, not their behaviour.** The behaviour of each harness is tested by
  the tests of the commands, as today, and a new harness gets its cases there, as the checklist says. A test of each
  member's behaviour against every harness is under "Beyond the request"
* **One module per harness, and one list of them.** That is the shape the human chose, and the one the standards
  name for open/closed: a new harness is a new module and an entry in the list, and the code that goes over the
  harnesses does not change. The order of the list is the order the kit has today, which `init` writes the harnesses
  of `agentrite.json` in and the usage of the commands lists them in
* **What the harnesses share stays shared.** The helpers that the readings of both harnesses use, such as reading a
  JSON line or making a followed tool call from a call's input and the harness's tool names, are not per-harness
  knowledge and stay in a module both harness modules use
* **The harness modules are found by their directory.** The human took the test that every harness module is in the
  list. The test needs to know which modules are harness modules, and a directory that holds them and nothing else
  tells that without a list of its own, which would be a second list of the harnesses for the test alone. The shared
  helpers and the module that defines the contract therefore stay outside that directory. A naming convention of the
  files, among the other modules, was rejected: it is a rule a reader has to know, where a directory shows it
* **Help texts that name harnesses as examples stay as written.** The usage of `agentrite run` names a model id of
  each harness and what each flag of `--skip-permissions` does, wrapped by hand. Building that text from the modules
  while printing it unchanged would take a wrapping of its own for one text. It is an entry of the checklist instead
* **`CLAUDE.md` is written into every project, as today.** `init` writes it whatever the harnesses, and reads it
  only with `claude` among them. Gathering it into the Claude Code module would write it only with `claude`, which
  changes behaviour. Its reading, judging and notices go into the Claude Code module, and its writing stays where it
  is, which the checklist names
* **The sandbox stays as it is, and the checklist covers it.** Its knowledge of each harness is in shell, the
  Dockerfile and the compose file, which a module of JavaScript cannot hold without a generator. The human chose a
  checklist for it
* **The checklist is in `CONTRIBUTING.md`.** Adding a harness is work on the kit, which that document is for, and the
  human named it. It says what to do in each place, and why a place holds harness knowledge only where that is not
  obvious from the place
* **Unit 0090 and this unit: whichever is built second puts the reading of refused calls under the contract.** 0090
  adds a reading per harness beside `HEADLESS`, and keeps OpenCode's error text in one place beside what else the
  command reads of OpenCode's output, which an OpenCode module is. Built after 0090, this unit moves that reading
  into the modules and makes it a member of the contract, as requirement 9 says. Built before it, 0090 is planned
  against the contract, adds the reading as a member and implements it in both modules, and the test of requirement
  4 holds it to that. Neither unit's spec changes for the other: this unit's requirement 9 is conditional, and 0090's
  requirements hold either way

## Non-goals

* Adding a harness. This unit prepares for one
* A script that runs the real harnesses through the behaviours the kit relies on, such as headless JSON output, the
  resume of a session, the refusal of a permission or the bell, to check a new harness or a new version of one. The
  human declined it for this unit
* Moving the sandbox's knowledge of a harness, in the Dockerfile, the entrypoint, the wrapper and the compose file,
  into the harness modules or generating it from them
* A type checker, or a TypeScript build
* Any change to what a command prints, refuses, writes or starts, to the default settings, or to the default
  orchestrator
* The feature of unit 0090, apart from where its reading lives when it is already built

## Beyond the request

1. Taken by the human, as requirement 10. **A test that every harness module is in the list.** A test that the
   modules of the harnesses and the entries of the list of requirement 3 are the same set. It costs one small test.
   Without it, a module that was written and not listed is unknown to the commands, which refuse its name at once, so
   the mistake is seen on the first try
2. **A test that the checklist is complete.** A test that searches the repository for the name of each harness and
   fails for a file the checklist does not name, with a list of the files that name a harness only as an example. It
   costs the test and that list, kept up to date by every unit that mentions a harness anywhere. Without it, a place
   the checklist misses is found when the next harness is added, and the checklist is amended then
3. **Behaviour tests of the contract run for every harness.** Tests written once against the contract, such as that
   the headless arguments without a session give a session or none, and that the reading of an empty output gives no
   response, run for each harness of the list. It costs a shared suite beside the per-harness tests that exist.
   Without it, a new harness's module is held to having its members and not to how they behave, until its own cases
   are written, which the standards ask of any new logic
4. **Help texts built from the modules.** The model id and the meaning of `--skip-permissions` for each harness in
   the usage of `agentrite run` taken from its module, with the text wrapped by the code. It costs a member of the
   contract and a wrapping of the usage. Without it, the text is an entry of the checklist and is edited by hand when
   a harness is added
