# 0011 Rename the kit to AgentRite

## Approach

A rename has no new behavior to design, so the work is ordered by what can be checked on its own. Each step changes
the tests' expectations first, sees them fail, and then renames until they pass. The host and the stacks are the
exception, as the task for them says: no test reads those shipped values, so changing the expectations fails nothing.

First the package, the commands, the installed path and the environment variable, which the tests cover almost
entirely. Then the host and the stacks. Then the README, then the pointer packages, which are new code and get tests
of their own.

Four places in this repository keep the old name on purpose, by requirement 9: `AGENTS.md`, the `check-changes`
script in `package.json`, the devDependency on the 1.0.3 tarball with its entry in `package-lock.json`, and the
README section that describes that installed copy. Unit 0012 moves them. Leave the first three untouched here.

The replacements, wherever the old name appears outside `changes/` and outside those four:

| Old                                         | New                                             |
|---------------------------------------------|-------------------------------------------------|
| `@ritenoar/agent-kit`                       | `@ritenoar/agentrite`                           |
| `agent-kit`, `agent-kit-roles`              | `agentrite`, `agentrite-roles`                  |
| `agent-kit.ritenoar.com`                    | `agentrite.ritenoar.com`                        |
| `ritenoar-agent-kit-<version>.tgz`          | `ritenoar-agentrite-<version>.tgz`              |
| `AGENT_KIT_CONTAINER`                       | `AGENTRITE_CONTAINER`                           |
| `AgentKitCertStack`, `AgentKitHostingStack` | `AgentRiteCertStack`, `AgentRiteHostingStack`   |
| "agent kit" used as the name                | "AgentRite", or "the kit" where it reads better |

`KIT_ALLOWLIST`, `KIT_CONTAINER` and the plain noun "the kit" stay as they are.

### The README's opening

The README opens as follows. The existing first paragraph is kept, after the tagline, with the package name updated.

```markdown
# AgentRite

A kit for running coding agents by a fixed process.

The shared instructions and tooling that coding agents work under, in one place so that an improvement is made once
rather than once per project. Projects install it as the npm package `@ritenoar/agentrite` and keep only what is
specific to them.

## The name

A rite is a prescribed way of doing something, and that is what this kit is at its core. `process.md` lays down how
a change is specified, planned, recorded and frozen, and the roles and the sandbox exist so that agents follow it.

The name reads three ways, and all three are meant:

* a **rite** for agents: the process they work by
* agents done **right**
* agents that **write**

The "rite" is also Ritenoar's, whose projects carry it.
```

### The pointer packages

`pointers/agentrite/` and `pointers/agentrite-roles/` each hold a `package.json`, a `README.md` and a `pointer.mjs`.
The `package.json` has the name, version `1.0.0`, a description, `"type": "module"`, a `bin` mapping the package's
own name to `pointer.mjs`, and `files` listing `pointer.mjs`. It has no `dependencies`, no `scripts` and no
`private`. `pointer.mjs` reads the name from the `package.json` beside it, so the two copies are byte for byte the
same, prints this to standard error with the name filled in, and exits 1:

```
<name> is not installed in this project.
AgentRite is the package @ritenoar/agentrite. It is installed from a release URL, not from the npm registry.
The command to install it is in the README at https://bitbucket.org/ritenoar/agentrite
```

The `README.md` of each says the same in a few lines, since it is what the package's page on npm shows.

## Files

- `package.json`: `name`, the two `bin` entries, the two script paths under `files`. The `check-changes` script and
  the devDependency are left
- `package-lock.json`: the root entry's name and `bin`, regenerated with `npm install --package-lock-only`. The
  entry for the installed 1.0.3 is left
- `scripts/agent-kit.mjs` to `scripts/agentrite.mjs`, `scripts/agent-kit-roles.mjs` to `scripts/agentrite-roles.mjs`,
  with `git mv`: the installed path, the usage strings, the error prefix, the `.dockerignore` comment, the import
- `container/agent.sh`, `container/compose.yml`: the environment variable, the host in `KIT_ALLOWLIST` and its
  comment
- `templates/project/AGENTS.md`, `CLAUDE.md`, `agent.sh`, `agent/compose.project.yml`: the installed path and the
  prose
- `infra/bin/app.ts`: the subdomain and the two stack ids
- `infra/lib/certificate-stack.ts`, `infra/lib/hosting-stack.ts`, `infra/lib/record-name.ts`: the example host in
  the comments
- `deploy.sh`: the two stack names and the header comment
- `tests/agent-kit-init.test.mjs` to `tests/agentrite-init.test.mjs`, `tests/agent-kit-roles.test.mjs` to
  `tests/agentrite-roles.test.mjs`, with `git mv`
- `tests/agent-wrapper.test.mjs`, `tests/deploy.test.mjs`, `tests/entrypoint-allowlist.test.mjs`,
  `tests/record-name.test.mjs`, `tests/fixtures/claude-agents/*.md`: the expectations
- `tests/pointers.test.mjs`: new
- `pointers/agentrite/`, `pointers/agentrite-roles/`: new, three files each
- `README.md`: the opening above, and every name, path, host and command after it
- `changes/0011-rename-to-agentrite/record.md`: the log

## Tasks

- [x] Rename the two test files with `git mv`, and in them, in `tests/agent-wrapper.test.mjs` and in the three
  fixtures, change every expectation to the new package path, command names, usage lines, error prefix, temporary
  directory prefixes and `AGENTRITE_CONTAINER`, including `agentName('@ritenoar/agentrite')` giving
  `ritenoar-agentrite-agent`. Run `npm test` and see these fail (R2, R3, R4, R12)
- [x] Rename the two scripts with `git mv` and update them, `package.json`'s `name`, `bin` and `files`,
  `container/agent.sh`, the variable in `container/compose.yml`, and the four templates, until `npm test` passes.
  Regenerate the lockfile's root entry with `npm install --package-lock-only` and check that its diff touches
  nothing but the root entry's name and `bin` (R1, R2, R3, R4, R9)
- [x] Change the host in `tests/entrypoint-allowlist.test.mjs`, `tests/record-name.test.mjs` and
  `tests/deploy.test.mjs`, with the tarball and package names in the last. These tests pass before and after the
  next task: each supplies its own host list, arguments or stubs, and none reads the shipped `KIT_ALLOWLIST`, the
  subdomain or the stack names. Those shipped values are checked by the search in the last task and by synthesizing
  the stacks under Verification, not by the suite (R12)
- [x] Change the host in `KIT_ALLOWLIST` and its comment, the subdomain and the two stack ids in
  `infra/bin/app.ts`, the comments in the three files under `infra/lib/`, and the stack names and header comment in
  `deploy.sh`, until `npm test` and `npx tsc -p infra` pass (R5, R6)
- [x] Rewrite the top of `README.md` as given under "The README's opening", and update every name, path, host and
  command in the rest. The example release URLs become `ritenoar-agentrite-2.0.0.tgz` for installing and
  `ritenoar-agentrite-2.1.0.tgz` for updating. The section "The kit's own copy of the kit" names the path as it is
  on disk until 0012, `node_modules/@ritenoar/agent-kit/`, and says in one sentence that the copy is still the last
  release under the old name. Check the result against the old file section by section, so that nothing but names
  changed below the opening (R7, R8)
- [x] Write `tests/pointers.test.mjs`: for each of the two packages, the `package.json` has the name, a `bin` of
  that name, and no `dependencies`, `scripts` or `private`; running `pointer.mjs` exits 1 and its standard error
  names the package, `@ritenoar/agentrite` and the repository address; the two `pointer.mjs` files are identical.
  See it fail (R11)
- [x] Write the two pointer packages as described under "The pointer packages", until the test passes (R11)
- [x] Search the tracked files for what is left, and resolve each hit that is not one of the four kept
  self-references (R8, R9, R10):

  ```sh
  git grep -n -i -E 'agent[-_ ]?kit' -- . ':!changes'
  ```

  The hits that remain are in `AGENTS.md`, the `check-changes` script and the devDependency in `package.json`, the
  1.0.3 entry in `package-lock.json`, and the one section of `README.md` that describes that copy

## Human steps

These are the human's, in the order they have to happen around the tasks above. They are a numbered list and not
checkboxes because most of them come after this unit is implemented, and the change check counts every open box in
this file.

1. **Any time before step 4. Reserve the scope on npm.** Sign in at npmjs.com, or create an account, and turn on
   two-factor authentication. Create an organisation named `ritenoar` on the free plan. That alone reserves
   `@ritenoar/`; nothing is published under it
2. **After the review of this unit. Decide the findings, approve, and merge the branch into `master`.** The release
   is made from `master`
3. **Release 2.0.0.** On the host, in the repository root, with AWS credentials:

   ```sh
   npm version major
   ./deploy.sh
   ```

   `deploy.sh` creates `AgentRiteCertStack` and `AgentRiteHostingStack` from nothing, so this run waits for the
   certificate's DNS validation and for the new distribution, which takes several minutes. It ends by printing
   `"@ritenoar/agentrite": "https://agentrite.ritenoar.com/ritenoar-agentrite-2.0.0.tgz"`. The old stacks are not
   touched. Push `master` and the tag
4. **Publish the two pointer packages.**

   ```sh
   npm login
   (cd pointers/agentrite && npm publish)
   (cd pointers/agentrite-roles && npm publish)
   ```

   Then, in an empty directory, `npx agentrite` and `npx agentrite-roles` each print the pointer's message and exit
   non-zero
5. **Approve unit 0012**, which moves this repository's own dependency to 2.0.0. It runs on the host: a sandbox
   built from the old kit does not admit the new host
6. **Move Norareit**, as a unit of its own there, on the host for the same reason:
   * `npm uninstall @ritenoar/agent-kit`, then
     `npm install --save-dev https://agentrite.ritenoar.com/ritenoar-agentrite-2.0.0.tgz`
   * delete the six wrappers in `.claude/agents/` and `.opencode/agents/` and write them again with
     `npx agentrite-roles claude opencode`, carrying over any model pinned in them
   * change `node_modules/@ritenoar/agent-kit` to `node_modules/@ritenoar/agentrite` in `package.json`
     (`check:changes`), `agent.sh`, `.dockerignore`, `agent/compose.project.yml`, `AGENTS.md`, `CLAUDE.md`,
     `README.md` and `tests/unit/roles.test.ts`, and the host, the command names and the repository address in
     `README.md` and `AGENTS.md`. Leave `changes/` as it is
   * `./agent.sh --rebuild`, since the image copies the kit's files from the path that changed
7. **Destroy the old stacks**, once 0012 and Norareit's unit are on `master` and pulled on the laptop. After this,
   commits of either repository from before the move can no longer run `npm ci`:

   ```sh
   bucket="$(aws cloudformation describe-stacks --stack-name AgentKitHostingStack --region eu-west-1 \
     --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)"
   aws cloudformation delete-stack --stack-name AgentKitHostingStack --region eu-west-1
   aws cloudformation wait stack-delete-complete --stack-name AgentKitHostingStack --region eu-west-1
   aws cloudformation delete-stack --stack-name AgentKitCertStack --region us-east-1
   aws cloudformation wait stack-delete-complete --stack-name AgentKitCertStack --region us-east-1
   aws s3 rb "s3://$bucket" --force
   ```

   Read the bucket name first: the bucket is retained when its stack goes, and the stack's output is the only
   place its name is written down. The hosting stack goes before the certificate stack because it uses the
   certificate. `agent-kit.ritenoar.com` then no longer resolves
8. **Rename the repository on Bitbucket** to `agentrite`, in its settings. The clone address changes with it
9. **On this computer and on the laptop**, from a terminal outside the directory and with IntelliJ and both
   harnesses closed:

   ```sh
   git -C ~/projects/agent-kit remote set-url origin git@bitbucket.org:ritenoar/agentrite.git
   mv ~/projects/agent-kit ~/projects/agentrite
   mv ~/.claude/projects/-home-stef-projects-agent-kit ~/.claude/projects/-home-stef-projects-agentrite
   ```

   * The second `mv` keeps Claude Code's session history and memory for the project. Its per-path settings in
     `~/.claude.json` start fresh, so it asks once more whether the directory is trusted
   * IntelliJ: `.idea/` is not tracked. Either delete it and open the directory as a new project, or keep the
     workspace settings by renaming `.idea/agent-kit.iml` to `.idea/agentrite.iml` and changing the two paths in
     `.idea/modules.xml` to match. The entry under Recent Projects points at the old path and is removed by hand
   * OpenCode keeps its sessions in `~/.local/share/opencode/opencode.db`. Whether they follow a moved directory was
     not verified, so the old sessions may not reattach
   * Delete the untracked `ritenoar-agent-kit-1.0.3.tgz` in the repository root on this computer
   * Adjust the paths if the laptop keeps its projects elsewhere

## Verification

- [x] `npm test` passes
- [x] `npx tsc -p infra` passes
- [x] `npm pack --dry-run` names the tarball `ritenoar-agentrite-1.0.3.tgz`, lists `scripts/agentrite.mjs` and
  `scripts/agentrite-roles.mjs`, and lists nothing under `pointers/`
- [x] `(cd infra && npx cdk synth)` on the host lists `AgentRiteCertStack` and `AgentRiteHostingStack` and no other
  stack, or, where there are no AWS credentials, the record says it was not run
- [x] In a scratch project with the packed kit installed and `playwright` in its lockfile,
  `npx agentrite init claude opencode` writes files that name only `node_modules/@ritenoar/agentrite/`
- [x] The search in the last task prints only the kept self-references
- [x] `git diff master -- changes/` shows this unit, unit 0012 and the record of 0004, which 0012's planning
  changed, and nothing else
- [x] `npm run check-changes` passes

## Commit Points

- [x] The package, the commands, the installed path and the environment variable
- [x] The host, the stacks and `deploy.sh`
- [x] The README
- [x] The pointer packages
- [x] What the search turned up
