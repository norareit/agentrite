# Changelog

What each release of AgentRite changed, newest first, and what is worth knowing before a project updates to it.
The numbers in parentheses are change units. Each is a directory under `changes/` in the kit's own repository, which
holds the reasoning and is not in the package. The changelog begins at 2.3.0, and first shipped in the release after
it.

## 3.0.0

### What changed

* A run of the sandbox says what it mounts at `/work`, and there is no default. `./agent.sh <unit>` mounts a clone
  of the unit's branch, `./agent.sh --in-place` mounts the project as it is on the host, which is what every run
  did before, and `./agent.sh --workdir DIR` mounts `DIR` as before. A command that says none of the three starts
  nothing and names the forms (0029)
* A unit run, `./agent.sh 0029 claude`, is the way to implement and to review a unit. The unit is a local branch,
  by its name or by the number its name holds. The wrapper clones the repository under
  `~/.local/state/agentrite/<Compose project>/<branch>`, mounts the clone and the host's `.reviews`, and names the
  container after the branch, so that two units run side by side and two runs never work on one branch. When the
  container exits it fetches the branch back as `sandbox/<branch>`, fast-forwards the host's branch when it can,
  and removes the clone unless it holds work the host lacks. A new file of the kit's, `container/unit-clone.sh`,
  holds the git work, and the README's "Working on a clone" says what the clone protects and what it does not
  (0029)
* The kit names no version of Claude Code or OpenCode any more. For each harness on its own, the image holds the
  version the project's `agent/compose.project.yml` gives as `CLAUDE_CODE_VERSION` or `OPENCODE_VERSION` under
  `services.agent.build.args`, or else the version installed on the host, or else the latest published at the time
  the image is built, which the wrapper names in a line. Release 2.3.0 gave 2.1.266 and 1.18.30 to every sandbox
  (0027, 0030)
* The wrapper compares, at each start, the versions it wants with those the image was built with, which the image
  holds as two labels, and builds the image again by itself when they differ, saying which harness and why. No
  flag is needed after a harness is updated on the host (0027)
* The README has new sections on running the sandbox: "Starting it", "Working on a clone", "Another working
  directory", "Extra directories", "The harness versions" and "The local model server" (0026, 0027, 0029, 0030)
* `CHANGELOG.md`, this file, is in the package, at `node_modules/@ritenoar/agentrite/CHANGELOG.md` after the
  install, and the README's part on updating the kit points at it (0025)
* The package holds 25 files, two more than 2.3.0: `CHANGELOG.md` (0025) and `container/unit-clone.sh` (0029)
* Not in the package: `RELEASING.md` and the `/release` skill, by which a release of the kit is made, and the
  refusal of `deploy.sh` to release a version that has no section here (0025, 0028), and the kit repository's own
  dependency on release 2.3.0 (0024)

### Worth knowing when you update

* `./agent.sh` with no argument, and `./agent.sh <command>` such as `./agent.sh claude`, `./agent.sh npm test` and
  `./agent.sh -- npm ci`, no longer start a sandbox. The first word that is not an option is now taken as a unit,
  so a command is refused with `'<command>' names no local branch, by its name or as a unit's number`. Add
  `--in-place` for what these did before: `./agent.sh --in-place claude`. A script, an alias or a line of the
  project's own documents that runs the sandbox needs that edit. `./agent.sh --workdir DIR` and `--mount` work as
  they did, and `--rebuild` needs one of the three forms beside it (0029)
* No file of the project's needs an edit, and `refresh` writes what it wrote in 2.3.0 (0027, 0029, 0030)
* The first start after the update builds the image again, by itself, because the image of 2.3.0 records no
  harness versions. That start needs the network, and when the build fails the sandbox does not start, although
  an image exists (0027, 0030)
* The harnesses in the sandbox are no longer 2.1.266 and 1.18.30. On a host that has a harness, the sandbox gets
  the host's version, and follows it at the first start after each update on the host. The host's version is what
  `claude --version` and `opencode --version` print for the command on the `PATH` of whoever runs `./agent.sh`: a
  harness reached only through a shell alias counts as not installed. Two developers on one project so run what
  their own hosts have, until the project holds a version in its `agent/compose.project.yml` (0027)
* On a host without a harness, that harness in the sandbox is the latest published version of the day the image
  is built, and stays until the image is built again: `./agent.sh --in-place --rebuild` brings a newer one. Such a
  build runs `npm view <package> version` on the host, so it needs `npm` on the `PATH` and the registry in reach.
  With neither, the start stops with two lines that say how to get past it, and does not fall back to the image
  that exists. No time limit is set on that question: on a network that swallows the connection the start hangs
  until it is interrupted, which was not tried (0030)
* The kit checks no version of either harness. That both harnesses start with the kit's allowlist alone, that
  OpenCode's login method for a ChatGPT account has the name the README gives, that the status line shows and
  that self-update is switched off were checked for the versions 2.3.0 pinned, and are promised for no version
  now. The confinement depends on no harness's version. When a version breaks one of these, add the refused host
  to the project's `ALLOWLIST` or hold a version that works in `agent/compose.project.yml`; the README's "The
  harness versions" says what a developer sees then (0027, 0030)
* The wrapper now runs `node` on the host at every start, to read the configuration Compose merges, and `git` on
  the host for a unit run (0027, 0029)
* Each rebuild leaves the image it replaced behind, untagged, at about 0.6 GB. `docker image prune` removes them
  (0027)
* A clone holds what is committed and nothing else: no uncommitted work, no ignored file such as a `.env`, and no
  `node_modules`. The first command in a new clone is `npm ci`, which needs the registry on the project's
  `ALLOWLIST`, and a project whose suite reads an ignored file does not find it in a unit run (0029)
* A unit run writes outside the sandbox, which no run did before: the clone under `~/.local/state/agentrite`, or
  under `$XDG_STATE_HOME`; a `.reviews` directory in the project root, made when it is not there; and the host's
  repository, where the unit's branch is fast-forwarded, whether or not it is checked out, or the commits are
  left at `sandbox/<branch>`. The files of a checked-out branch change with it (0029)
* The image, the allowlist, the limits and the harness versions of a unit run are those of the checkout the
  command is run from, not those of the unit's branch. A unit that changes `agent/compose.project.yml` runs
  without its own change until its branch is checked out on the host (0029)
* A unit run does not defend the host against what a commit contains once it is checked out and run, against
  what a review file says, or against a flaw in git's handling of a fetch from a hostile repository. A run with
  `--in-place` or `--workdir` is as exposed as every run was before (0029)
* Not tested, for any of this: Docker Desktop for macOS, and the bash 3.2 that macOS ships, on which the wrapper's
  additions were not run. The wrapper was tried on Linux with bash 5.2 and Docker Engine only. Not tried either: a
  unit run at an interactive terminal and an interrupt typed into one; a stopped container left under a unit's
  name by a crash; two starts for one branch in the same moment; a project with Playwright under the new wrapper;
  and a project's file that gives an empty value for a harness version (0027, 0029, 0030)
* The README says that on a Linux host whose firewall denies incoming traffic, `ufw` for example, the Docker
  bridge subnets have to be allowed to the local model server's port. That the container cannot reach the model
  on such a host was seen; that `ufw` is the cause, and that the rule repairs it, was not established (0026)

## 2.3.0

### What changed

* The sandbox admits four more hosts itself, through the kit's own allowlist, with no change to a file of the
  project's: `platform.claude.com`, without which Claude Code does not start in a sandbox that holds no saved login,
  and `models.opencode.ai`, from which OpenCode fetches its model catalog (0015); `auth.openai.com` and
  `chatgpt.com`, which OpenCode needs to log in with a ChatGPT account and to send its prompts (0023)
* A developer's own Claude Code status line is shown in the sandbox. When `~/.claude/statusline-command.sh` is a
  file on the host, the wrapper mounts it read-only, together with a new file of the kit's,
  `container/claude-managed-settings.json`, whose one setting runs it. With no such file on the host, nothing is
  mounted (0022)
* The README has a new section, "Logging in to a model provider": a login that sends the browser back to
  `localhost` cannot complete in the sandbox, and OpenCode's login with a ChatGPT account is
  `opencode auth login -p openai -m "ChatGPT Pro/Plus (headless)"` (0023)
* A spec has a new section, "Beyond the request", for what the planner would add and the request does not need. It
  is in `process.md`, `roles/planner.md` and the spec template (0019)
* The comment above `ALLOWLIST` in the compose file `init` writes for a project names the four new hosts among the
  kit's own (0015, 0023)
* The package holds 23 files, one more than 2.2.1: `container/claude-managed-settings.json` (0022)
* Not in the package: `./agent-dev.sh`, which runs the sandbox from the kit's working copy and which the README
  describes (0021), and the kit repository's own sandbox files and its dependency on a released kit (0016, 0018)

### Worth knowing when you update

* The update needs nothing but the install. No command or option changed, `refresh` writes what it wrote in 2.2.1,
  and the image needs no rebuild: the changes take effect when the sandbox next starts
* Every sandbox now admits `auth.openai.com` and `chatgpt.com`, whether or not the project uses OpenAI. `chatgpt.com`
  serves the whole of ChatGPT, not only what OpenCode uses, and data can leave a sandbox through any host it admits
  (0023)
* The sandbox checks at start-up that every host it admits can be reached, the kit's own among them, and refuses to
  start when one cannot. On a network that blocks one of the four new hosts, a sandbox that started under 2.2.1
  therefore stops with `allowlisted host <host> is not reachable`. This was read from the entrypoint and not tried
  on such a network (0015, 0023)
* For a developer who has `~/.claude/statusline-command.sh` on the host, that script now runs inside the sandbox,
  where it finds only the tools of the image, `jq` and `git` among them. While the host file exists it replaces a
  status line set inside the sandbox (0022)
* A project's own `agent/compose.project.yml` is never rewritten, so the comment above its `ALLOWLIST` still lists
  the kit's hosts as they were when `init` wrote it (0015, 0023)
* A spec written before this release has no "Beyond the request" section and needs none. The change check does not
  look for it (0019)
