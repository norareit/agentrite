# Claude Code Configuration

This project uses the [AGENTS.md](https://agents.md/) convention as the canonical source of coding agent instructions.
This CLAUDE.md file exists solely as a bridge that imports the kit's `process.md` and `standards.md` and `AGENTS.md`
into Claude Code.

Instructions live in two places, and never in this file or `.claude/rules/`:

* [`node_modules/agentrite/process.md`](node_modules/agentrite/process.md) and
  [`node_modules/agentrite/standards.md`](node_modules/agentrite/standards.md)
  for anything that is the same in every project, which reaches this project through the kit package
* [`AGENTS.md`](AGENTS.md) for anything specific to this one

## Repository Instructions

@node_modules/agentrite/process.md
@node_modules/agentrite/standards.md
@AGENTS.md
