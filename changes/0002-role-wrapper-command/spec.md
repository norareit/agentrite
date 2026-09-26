# 0002 A command that writes the harness role wrappers

## Context

A project registers the kit's three roles with its harnesses through thin wrapper files. Each one names a role and
points at the role file under `node_modules/@ritenoar/agent-kit/roles/`, and holds no instruction of its own.
Norareit wrote them by hand: `.claude/agents/planner.md`, `implementer.md` and `reviewer.md` for Claude Code, and an
`agent` block in `opencode.json` for OpenCode. Every new project copies them from an existing one, and the README's
"Installing it into a project" section only tells the reader to create them.

Norareit's 0037 recorded kit-managed wrappers and a `bin` command as worth doing, and left them out for one undecided
question: where a per-role model lives once the kit writes the file that would hold it. The same unit named moving the
OpenCode roles out of `opencode.json` into markdown agent files. This unit does both, and settles the question under
Decisions.

What OpenCode 1.18.32, the local version one patch ahead of the sandbox's pinned 1.18.30, was observed to do:

* It loads markdown agents from both `.opencode/agents/` and `.opencode/agent/`. The file name is the agent's name,
  the frontmatter holds `description` and `mode`, and the body is the prompt
* It does not expand `{file:...}` in a markdown agent's body. `opencode debug agent` shows the literal text as the
  prompt, so the `{file:./node_modules/...}` form `opencode.json` uses does not carry over
* A markdown agent overrides an agent of the same name in `opencode.json`, silently

## Requirements

1. The kit's tarball ships an executable that a project runs with `npx`, as `npx agent-kit-roles <harness>...`, from
   the project root
2. It takes one or more harness names as arguments, each `claude` or `opencode`. Both may be given, in either order,
   and it writes the wrappers for every harness given
3. Given no harness, or any argument that is not a known harness name, it exits with a non-zero status, prints a
   usage message naming the accepted harnesses to standard error, and writes nothing
4. For `claude` it writes `.claude/agents/planner.md`, `implementer.md` and `reviewer.md` under the current working
   directory, and each is byte for byte the file of the same name in Norareit's `.claude/agents/` at its commit
   `610d564`
5. For `opencode` it writes `.opencode/agents/planner.md`, `implementer.md` and `reviewer.md` under the current
   working directory. Each carries the same description as its Claude Code counterpart and `mode: subagent`, and its
   body tells the agent to read the matching role file under `node_modules/@ritenoar/agent-kit/roles/` and follow it.
   `opencode debug agent <role>` in such a project reports the role with that description, `mode` `subagent`, and
   that body as its prompt
6. It creates the harness directory and its parents when they are missing, and leaves any other file already in
   them untouched
7. If any file it would write already exists, it exits with a non-zero status, names every such file on standard
   error, and writes nothing at all, for any harness given. It never overwrites a file
8. On success it prints each file it wrote, and exits with status zero
9. The kit's README describes setting up the role wrappers with the command, in place of writing them by hand
10. `npm test` covers requirements 2 to 8

## Decisions

* **One command, both harnesses as arguments.** The harness is a required argument rather than a default, because a
  project that uses only one harness would otherwise get files for a harness it does not have. Accepting both in one
  run keeps the common case to one command. Flags such as `--harness claude` were rejected: the arguments are the
  only input, and a positional list says the same with less to parse.
* **Fail hard, and fail before writing.** A wrapper is the project's file once written, and a project may have edited
  it, so overwriting would lose work silently. Checking every target before writing any of them means a refused run
  leaves the tree exactly as it was, rather than half populated for one harness and not the other. Each write is also
  exclusive, so a file that appears between the check and the write is still not overwritten. A `--force` flag was
  rejected: deleting the files first says the same thing, deliberately.
* **The per-role model lives in the project's wrapper, not in the kit.** This settles 0037's open question. The
  command only ever creates files, and never rewrites one, so a project that wants a model per role adds `model:` to
  its own wrapper and nothing the kit does later touches it. The generated wrappers name no model, so the harness's
  own default applies until a project chooses. The alternative, a model table in the kit or an argument per role,
  would make the kit decide something that differs per project and per machine.
* **OpenCode wrappers point at the role file the way Claude Code's do.** Since `{file:...}` is not expanded in a
  markdown agent, the body is the same one-line instruction to read the role file as the Claude Code stub. The prompt
  therefore costs the agent one file read, which is what Claude Code already pays.
* **`.opencode/agents/`, not `.opencode/agent/`.** Both load. The plural matches `.claude/agents/` and is the form
  OpenCode's current documentation uses.
* **`mode: subagent`, as Norareit has it.** Changing it to `all`, which would let a role be selected directly, changes
  how a project works rather than where its wrappers live, and is not asked for.
* **`opencode.json` is not read or edited.** It may be JSONC, and a project's other settings share the file. The
  markdown wrapper wins over a same-named `agent` entry, so a leftover block is dead configuration rather than a
  conflict. Deleting it is part of moving a project onto the command, which is that project's own change.
* **The current working directory is the target.** `npx` runs from where it is invoked, and the wrappers' paths into
  `node_modules` are relative to the project root, so the command is run from there. It does not search upward for a
  project root: a guess about which directory was meant is worse than writing where it was asked.
* **The role names and descriptions are stated once.** Both harnesses' wrappers are rendered from one list of roles,
  so a description changes in one place. A new harness is a new renderer over the same list.
* **Dependency-free ESM, like `check-changes.mjs`.** The kit ships no runtime dependencies, and a project with no
  build step can run it.

## Non-goals

* Updating, rewriting or deleting existing wrappers, and a `--force` flag
* Reading, editing or removing the `agent` block of a project's `opencode.json`
* Choosing a model or reasoning effort for any role
* Changing OpenCode's `mode` from `subagent`, or any change to the content of the roles
* Harnesses other than Claude Code and OpenCode
* Moving Norareit or any other project onto the command. Each project does that as its own change
* Making a release. The command reaches projects with the next release, which is the human's to make
