# 0010 A command that sets up the kit in a project

## Context

Setting the kit up in a project is a list of hand-written files in the README's "Installing it into a project"
section: an `AGENTS.md` pointing at the kit, the role wrappers (which `agent-kit-roles` already writes), a command
running the change check, an `agent.sh` shim, an `agent/compose.project.yml`, and a `.dockerignore` exception. The
README names these files but shows the content of none of them, so a new project copies them from Norareit, the one
project that has them.

A generated file becomes the project's own once written, and the project may edit it. A later kit release can
still need something from the project, and a file written once never learns of it. Today that already happens with
the allowlist: the entrypoint's start-up check probes `api.anthropic.com` through the egress proxy, which admits only
allowlisted hosts, so a project that leaves that host out of its `ALLOWLIST` cannot start the sandbox. Nothing
documents it. Likewise a project file without `PLAYWRIGHT_VERSION` fails only at the Dockerfile's `FROM` line, with
Docker's error rather than the kit's.

The image copies Playwright's browsers at `PLAYWRIGHT_VERSION` and runs `playwright install-deps` against the
project's own lockfile, so the sandbox currently requires the project to depend on Playwright.

## Requirements

1. The kit's tarball ships an executable that a project runs with `npx`, as `npx agent-kit init <harness>...`, from
   the project root. The harness arguments are those `agent-kit-roles` accepts, with the same usage error for none or
   an unknown one, in which case it writes nothing
2. It writes the role wrappers for each harness given, with the same paths and content `agent-kit-roles` writes
3. It writes `AGENTS.md`, which tells an agent to read `node_modules/@ritenoar/agent-kit/process.md` and the three
   role files in the kit's `roles/`, and leaves room for what is specific to the project
4. When `claude` is among the harnesses, it writes `CLAUDE.md`, which imports `AGENTS.md` with `@AGENTS.md`
5. It writes `agent.sh`, executable, which runs `node_modules/@ritenoar/agent-kit/container/agent.sh` with the
   directory holding the shim as its first argument, passing on every other argument
6. It writes `agent/compose.project.yml` with a Compose project `name:` and an `image:` both derived from the `name`
   in the project's `package.json`, a `PLAYWRIGHT_VERSION` build argument equal to the `playwright` version resolved
   in the project's `package-lock.json`, the memory and CPU limits Norareit uses, overridable from the environment,
   and an `ALLOWLIST` holding only hosts the given harnesses need beyond those the kit supplies (requirement 10)
7. When `package-lock.json` resolves no `playwright`, it does not write `agent/compose.project.yml`, says on standard
   error that the sandbox requires the project to depend on Playwright, completes everything else, and exits non-zero
8. It adds a `check-changes` script, `node node_modules/@ritenoar/agent-kit/scripts/check-changes.mjs`, to the
   project's `package.json`, keeping every other key, their order, and the file's indentation
9. It writes a `.dockerignore` that keeps `node_modules` out of the build context except the kit's `container/`
   directory. When a `.dockerignore` exists and excludes `node_modules` without that exception, it appends the
   exception; otherwise it leaves the file alone
10. The sandbox admits the hosts the kit itself needs without the project listing them: the start-up probe host, the
    npm registry, and `agent-kit.ritenoar.com`. They are declared in the kit's `container/compose.yml`, and the
    entrypoint admits them together with the project's `ALLOWLIST`, applying the same validation to both. A project
    `ALLOWLIST` that is empty or missing is accepted
11. When the merged Compose configuration has no `PLAYWRIGHT_VERSION` build argument, `container/agent.sh` exits
    non-zero before building, and says that `agent/compose.project.yml` must supply it
12. It never overwrites or rewrites a file that exists, except for the additions requirements 8 and 9 describe. A
    file it would create that already exists is left as it is and reported as skipped. A `check-changes` script that
    already exists is left as it is
13. It prints each file it wrote, changed or skipped. It exits zero unless requirement 1 or 7 applies
14. The README's "Installing it into a project" section describes setting a project up with `npx agent-kit init`,
    what each generated file is for, and which of them the project may edit
15. `npm test` covers requirements 1 to 13

## Decisions

* **The project owns what is generated; the kit owns what is essential.** A generated file is written once and never
  regenerated, so a project's edits are never lost. Anything a kit release needs from every project is therefore not
  put in a generated file at all but kept in the kit, where a bump delivers it: the kit's own hosts move into the
  kit's `compose.yml` (requirement 10). What only the project can supply, such as `PLAYWRIGHT_VERSION`, is checked by
  the kit at run time (requirement 11), so a bump that needs something new says so. Regenerating or merging project
  files on a bump was rejected: it would either lose edits or need a merge of YAML and Markdown that a project could
  not predict.
* **Skip what exists rather than refuse the run.** `agent-kit-roles` refuses the whole run when any file exists,
  because it writes one kind of file. `init` writes several independent ones, and a project that already has some,
  such as role wrappers from `agent-kit-roles`, would otherwise be unable to add the rest. Every file it skips is
  named, so nothing is left unsaid. `agent-kit-roles` keeps its behavior.
* **`package.json` and `.dockerignore` are amended, not skipped.** Every project has a `package.json`, and many have
  a `.dockerignore`, so skipping them would leave the change check unwired and the build context unable to reach the
  kit. Each amendment only adds, and only what is missing.
* **One `agent-kit` command with subcommands.** `agent-kit init` leaves room for later subcommands under one name
  rather than an executable per task. `agent-kit-roles` stays as it is, so existing projects and instructions keep
  working.
* **The Playwright version comes from the lockfile.** It must match the version the project resolved so that
  committed screenshots still compare, and the lockfile is where that version is recorded.
* **A project without Playwright is refused the sandbox, not given a broken file.** Making Playwright optional in the
  image is a change to the container, out of this unit's scope. Writing a compose file with a guessed version would
  build an image the project's tests do not match.
* **Harness hosts in the generated allowlist.** `opencode` adds `models.dev`, which OpenCode fetches at start-up. The
  model providers' API hosts other than the probe host are the project's choice, so the generated file lists none
  and its comment says where to add them.
* **The kit's hosts are a separate variable, `KIT_ALLOWLIST`.** Keeping the project's `ALLOWLIST` for the project
  alone means a project never has to repeat a host the kit needs, and a kit release that needs a new host adds it
  without a change to any project. A project that already lists one of these hosts keeps working: duplicates are
  admitted once.

## Non-goals

* Making Playwright optional in the sandbox image
* Updating a project's generated files on a kit bump, or reporting how they differ from what `init` would write now
* Removing `agent-kit-roles`, or changing what it writes
* Editing an existing `AGENTS.md` or `CLAUDE.md` to point at the kit
* Installing the kit itself: `init` runs from an installed kit, after `npm install <release URL>`
