This document contains critical instructions for coding agents working in this repository. Follow these guidelines
precisely.

We eat our own dog food: this project uses AgentRite [
`node_modules/@ritenoar/agentrite/process.md`](node_modules/@ritenoar/agentrite/process.md) is **required reading**
before any change: the changes process in `changes/`, the status progression and the freeze, the commit conventions, the
documentation rules, and the code and testing standards. This file holds only what is specific to this project, and
nothing is stated in both places.

Read [README.md](README.md) before making changes. It is the source of truth for the project overview, architecture,
local development, testing, content authoring, and deployment.

## General guidelines

### Line limit

The default line wrapping of IntelliJ is used: 120 characters. Make sure all code and text are wrapped at 120
characters.

## Releasing

`CHANGELOG.md` holds one section per release and ships in the package. A section is written when a release is made,
for all the units in it at once, and never by a unit as it is implemented: a unit cannot know which version it will
be released in, and one summary of a whole release reads better than lines written apart.

How a release is made, the release notes among it, is in [`RELEASING.md`](RELEASING.md). Read it when asked to make
a release or to write the release notes, and follow it. Start neither unasked.
