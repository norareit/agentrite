# Claude Code Configuration

This project uses the [AGENTS.md](https://agents.md/) convention as the canonical source of coding agent instructions.
This CLAUDE.md file exists solely as a bridge to import that content into Claude Code.

Instructions live in two places, and never in this file or `.claude/rules/`:

* [`node_modules/@ritenoar/agent-kit/process.md`](node_modules/@ritenoar/agent-kit/process.md)
  for anything that is the same in every project, which reaches this project through the kit package
* [`AGENTS.md`](AGENTS.md) for anything specific to this one

## Repository Instructions

@AGENTS.md
