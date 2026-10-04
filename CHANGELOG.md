# Changelog

What each release of AgentRite changed, newest first, and what is worth knowing before a project updates to it.
The numbers in parentheses are change units. Each is a directory under `changes/` in the kit's own repository, which
holds the reasoning and is not in the package. The changelog begins at 2.3.0, and first shipped in the release after
it.

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
