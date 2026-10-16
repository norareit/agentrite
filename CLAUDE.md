# Claude Code Configuration

This project uses the [AGENTS.md](https://agents.md/) convention as the canonical source of coding agent instructions.
All instructions are maintained in AGENTS.md files throughout the repository, apart from those every project follows,
which are in the kit's instruction files.

When updating or adding new instructions, always edit the appropriate AGENTS.md file, or the kit's instruction files
at the root for one that every project follows, not this file or `.claude/rules/`. This CLAUDE.md file exists solely
as a bridge that imports the kit's instruction files and `AGENTS.md` into Claude Code.

## Repository Instructions

@node_modules/agentrite/process.md
@AGENTS.md
