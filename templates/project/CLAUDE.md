# Claude Code Configuration

This project uses the [AGENTS.md](https://agents.md/) convention as the canonical source of coding agent instructions.
This CLAUDE.md file exists solely as a bridge that imports the kit's `process.md`, the project's standards and
`AGENTS.md` into Claude Code.

Instructions live in two places, and never in this file or `.claude/rules/`:

* the files [`.agentrite/instructions.md`](.agentrite/instructions.md) names, for anything that is the same in every
  project or that the project chose in `agentrite.json`: the kit's `process.md`, the standards and the role files
* [`AGENTS.md`](AGENTS.md) for anything specific to this one

## Repository Instructions

@node_modules/agentrite/process.md
@{{standards}}
@AGENTS.md
