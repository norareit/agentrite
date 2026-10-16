# Development Guidelines

How work is done here is not specific to this project. It lives in AgentRite, installed as the npm package
`agentrite`, and the files [`.agentrite/instructions.md`](.agentrite/instructions.md) names are **required reading**
before any change: the kit's `process.md`, the project's standards, and the file of each role. `process.md` holds the
changes process in `changes/`, the status progression and the freeze, and the commit prefixes; the standards hold the
rules on text, documentation, commits, code and tests. The kit writes the list from `agentrite.json`. This file holds
only what is specific to this project, and nothing is stated in both places.

Read [README.md](README.md) before making changes. It is the source of truth for the project itself.

The kit is a dependency: `npm ci` installs it, on the host or inside the sandbox, and moving to a newer release is a
change to `package.json` and `package-lock.json`. An improvement to it is made in the kit repository, never under
`node_modules/`.

## Roles

[`.agentrite/instructions.md`](.agentrite/instructions.md) names the file of each of the four roles that do the work
in `changes/`. The harnesses reach them through the role wrappers in these directories. Each wrapper is a pointer to
one role file and holds no instructions of its own:

{{role_wrapper_directories}}

## Changes in this project

The change check is `npm run check-changes`, which runs the kit's script.

## Specific to this project

<!--
What is specific to this project goes here, under headings of its own: for example its house style, the rules its
code follows, and how its tests are run. Everything that holds for every project is in the files
.agentrite/instructions.md names already.
-->
