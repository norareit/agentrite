# Development Guidelines

How work is done here is not specific to this project. It lives in AgentRite, installed as the npm package
`@ritenoar/agentrite`, and
[`node_modules/@ritenoar/agentrite/process.md`](node_modules/@ritenoar/agentrite/process.md)
is **required reading** before any change: the changes process in `changes/`, the status progression and the freeze,
the commit conventions, the documentation rules, and the code and testing standards. This file holds only what is
specific to this project, and nothing is stated in both places.

Read [README.md](README.md) before making changes. It is the source of truth for the project itself.

The kit is a dependency: `npm ci` installs it, on the host or inside the sandbox, and moving to a newer release is a
change to `package.json` and `package-lock.json`. An improvement to it is made in the kit repository, never under
`node_modules/`.

## Roles

The three roles that do the work in `changes/` are the kit's:

* [`node_modules/@ritenoar/agentrite/roles/planner.md`](node_modules/@ritenoar/agentrite/roles/planner.md)
* [`node_modules/@ritenoar/agentrite/roles/implementer.md`](node_modules/@ritenoar/agentrite/roles/implementer.md)
* [`node_modules/@ritenoar/agentrite/roles/reviewer.md`](node_modules/@ritenoar/agentrite/roles/reviewer.md)

The harnesses reach them through the role wrappers in these directories. Each wrapper is a pointer to one kit role
file and holds no instructions of its own:

{{role_wrapper_directories}}

## Changes in this project

The change check is `npm run check-changes`, which runs the kit's script.

## Specific to this project

<!--
What is specific to this project goes here, under headings of its own: for example its house style, the rules its
code follows, and how its tests are run. Everything that holds for every project is in the kit's process.md already.
-->
