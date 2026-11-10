# 0106 OpenCode in the sandbox is given the host's local model providers

## Context

Unit 0104 admits the local model server's port in a project whose `agentrite.json` holds `"modelServer": true`. The
port alone does not let a harness use the server. OpenCode finds a local model through a provider in its
configuration, and a developer who uses one on the host has that provider in the host's
`~/.config/opencode/opencode.json` or `~/.config/opencode/opencode.jsonc`, with a `baseURL` such as
`http://localhost:11434/v1`. The sandbox reads nothing of that file, so OpenCode in the sandbox lists no local model
until the developer writes a provider again in the sandbox's home volume, with `host.docker.internal` in place of
`localhost`, since `localhost` in the container is the container itself. The human did that by hand to try unit
0104, and it is to be the sandbox's work instead.

The host's file can hold more than local providers: providers of cloud models with their API keys, written inline or
as `{env:...}` and `{file:...}` references, plugins, MCP servers and permissions. Most of that would not work in the
container either: the references name variables and files the container does not have, the plugins and local MCP
servers name programs of the host, and the hosts of cloud providers and remote MCP servers are not on the allowlist.

The human decided that the sandbox takes the local providers alone, and of each only the keys this spec names. What
else of OpenCode a developer wants in the sandbox, an API key among it, they set in the sandbox's home volume, where
it stays, so that a secret crosses only because the developer put it there. A copy of the whole file, and a prompt
at each start asking whether to copy it with a choice remembered in `agentrite.json`, were weighed and rejected, as
"Decisions" says.

### The adversary and the supported usage

The adversary is the agent of the sandbox as "What the sandbox defends against" of `SANDBOX.md` describes it: one
that may have been misled, and that runs any program as the agent's user in the container. The unit bounds what such
an agent can read of the host's OpenCode configuration: the keys of the local providers that this spec names, and
nothing else of the file. It does not defend against a secret that the developer wrote into one of those keys, such
as into a model's `options`, which crosses as written, and `SANDBOX.md` names that for the developer.

The supported usage is a developer whose OpenCode configuration on the host is at `~/.config/opencode/`, a model
server that serves an API OpenCode reaches through a provider's `baseURL` on the host's loopback address, at the port
of the local model server that `container/compose.yml` sets, and a sandbox started through the project's
`sandbox.sh`.

## Requirements

Which starts read the host's file:

1. A start of the sandbox reads the host's OpenCode configuration only in a project whose `agentrite.json` holds
   `"modelServer": true` and whose `harnesses` names `opencode`. Any other start reads nothing of it, and is not
   refused for anything the file holds. `--connect` reads nothing of it
2. The file is read at each start, so a change to it holds from the next start, with no rebuild of the image

What is read and what crosses:

3. The host's file is `opencode.json` or `opencode.jsonc` in `~/.config/opencode/` of the home the start runs with.
   It is read as OpenCode reads it, with the comments and the trailing commas that OpenCode accepts
4. A provider of the file is a local provider when its `options.baseURL` is an `http` URL whose host is `localhost`,
   `127.0.0.1` or `[::1]`, and whose port is the port of the local model server. No other provider crosses, nor
   anything of it
5. Of a local provider, only these cross: `npm`, `name`, `options.baseURL`, and `models`, of each model in it only
   `name`, `limit`, `options` and `variants`. Each crosses as the file holds it, but for the host of `baseURL`, which
   becomes the host of the local model server that `container/compose.yml` sets, `host.docker.internal`, with the
   scheme, the port and the path unchanged. Every other key, `apiKey` and `headers` among them, at any level, does
   not cross
6. Nothing else of the file crosses: no other top-level key, such as `model`, `plugin`, `mcp` or `permission`, and
   the file itself is not mounted
7. OpenCode in the container has the local providers in the kit's configuration, the file OpenCode gives the highest
   precedence, beside `"autoupdate": false`, which it still holds. The bell's plugin of OpenCode still loads with
   `"bell": true`. The agent's user cannot write that configuration
8. With no file, or with a file that holds no local provider, the start goes on, and OpenCode in the container has
   no provider of the kit's
9. A start that reads the file prints one line before the container starts: the file it read and the name of each
   local provider handed to OpenCode, or that the file holds no local provider, or, with no file, that there is no
   file at `~/.config/opencode/`

What is refused:

10. A start that reads the file refuses, starting nothing and before it asks Docker or npm anything, a file that
    cannot be read, one that is not a JSON object once its comments and trailing commas are taken out, and a home
    whose `~/.config/opencode/` holds both `opencode.json` and `opencode.jsonc`. The message names the file or the
    two files, what is wrong, and what to do, and the start exits 1
11. A local provider whose `models`, or a model of it, is not a JSON object is refused in the same way, with a message
    that names the file, the provider and the model

The documents:

12. "The local model server" of `SANDBOX.md` says that with `"modelServer": true` OpenCode in the sandbox is given the
    host's local providers, read at each start; which providers are local; what crosses of them, with the host of
    `baseURL` replaced; that nothing else of the file crosses, API keys among it; that a secret written into a key
    that crosses, such as a model's `options`, crosses as written; and that what else of OpenCode the developer wants
    in the sandbox, an API key among it, they set in the home volume's `~/.config/opencode/opencode.json`, where it
    stays for the project, with a provider of the same name in the kit's configuration standing above it
13. "What the sandbox defends against" of `SANDBOX.md` gives the host's OpenCode configuration among what crosses of
    the host: not mounted, and of it the keys of the local providers alone
14. When a start writes the local providers into a file of the project's log directory, "Where things are kept on
    the host" of `SANDBOX.md` names that file and where it is mounted, as it names the others there
15. "sandbox.sh" of `COMMANDS.md` says what a start reads of the host's OpenCode configuration and when, the line it
    prints of it, and what it refuses

Tests:

16. Tests show: that a start reads nothing of the host's file with `"modelServer": false`, or without `opencode`, also
    when the file is not valid; that a local provider crosses with its kept keys and the host of `baseURL` replaced,
    for each of `localhost`, `127.0.0.1` and `[::1]`, from `opencode.json` and from `opencode.jsonc` with comments and
    trailing commas; that a provider on another host or another port, and every key that is not kept, `apiKey` and
    `headers` of a local provider among them, do not cross; that the kit's configuration still holds
    `"autoupdate": false`; that a start with no file or no local provider goes on; that the line of requirement 9 names
    the file and the providers handed, or that there are none, or that there is no file; and that each refusal of
    requirements 10 and 11 is made with its message, before Docker and npm are asked anything

## Decisions

* **The host's file, not the project's `opencode.json`.** The provider is the developer's, of their own machine, and
  the host already has it. A provider committed in the project would repeat it in every project, would name the
  host's `localhost` for OpenCode on the host and so still need rewriting, and would be the team's file for one
  developer's setup. A provider built by the kit from the model server's list of models was rejected too: it ties
  the kit to one server's API, and loses what the developer set, such as a model's context limit and its variants
* **Local providers alone, by an allowlist of keys.** The file can hold API keys and other secrets, and the agent can
  read whatever crosses. A provider that does not point at the local model server cannot work in the container
  anyway, and the keys kept are the ones a local provider needs. A key the kit does not know is dropped rather than
  passed on, so that a new key of OpenCode that holds a secret does not cross by default. A model's `options` and
  `variants` are open objects that cross whole: they hold settings such as `reasoningEffort`, and the human took the
  risk of a secret written there over losing those settings, with `SANDBOX.md` saying so
* **No copy of the whole file, and no prompt at the start.** A whole copy would bring the secrets across and still
  not bring the host's OpenCode, for the reasons of "Context". A prompt at each start with a choice remembered in
  `agentrite.json` was rejected on two counts: `agentrite.json` is committed, so one developer's consent to copy
  their own secrets would hold for every developer of the project, and a project could commit it; and a headless run
  and a unit run of the orchestrator have no one to answer. What a developer wants in the sandbox besides, they set
  in the home volume, which is their own and stays for the project
* **Only with `"modelServer": true`.** Without the port a local provider cannot be reached, and OpenCode would list a
  model whose every request hangs, as the drop policy of the firewall makes it. Reading the file only then also
  keeps a start of a project that uses no model server free of anything the host's OpenCode file holds
* **The kit's configuration, which stands above the others.** OpenCode's documentation gives
  `/etc/opencode/opencode.json` the highest precedence of its files, and the kit's configuration is already there, for
  `"autoupdate": false`. Putting the local providers in it needs no new source of configuration. A provider of the
  same name in the home volume or the project then loses its conflicting settings to the kit's, and keeps the rest,
  as OpenCode merges; a developer who wants another provider of a local server gives it another name
* **A file at fault refuses the start.** It is how a start treats the host's `~/.claude/settings.json` when its
  `cleanupPeriodDays` is at fault, and only a start that reads the file can be refused for it. Both `opencode.json`
  and `opencode.jsonc` in the directory is refused rather than merged, since which of the two OpenCode takes over
  the other was not established, and the developer keeps one

## Non-goals

* Copying anything of the host's OpenCode configuration but the local providers, the default `model` among it, and
  any way for a secret of the host to cross. The developer sets those in the home volume
* Claude Code and Codex, which configure a local model otherwise, each a unit of its own if asked for
* `XDG_CONFIG_HOME` and `OPENCODE_CONFIG` on the host: the file is read at `~/.config/opencode/` alone
* A project's `opencode.json`, which the sandbox reads under `/work` as it does today, and which this unit neither
  reads on the host nor rewrites
* More than one model server, or one at another host or port than the one `container/compose.yml` sets, as unit
  0104 left them

## Beyond the request

1. More keys of a model kept, such as `id`, `reasoning`, `tool_call`, `attachment` and `modalities`, which OpenCode
   uses to name the model the server serves and what it can do. Cost: the list grows by those names and their tests,
   each one more open key the agent reads. Without it, a model that relies on `id` to name the server's model reaches
   the wrong model or none, which shows on the first request, and the developer sets that model in the home volume
2. A file of the developer's own on the host, outside every project, that crosses whole into the sandbox at each
   start, as a place for what the developer wants in every project's sandbox, an API key among it. Its being there is
   the consent, with nothing committed and no prompt. Cost: a new mount, its documentation and its tests. Without it,
   the developer sets those things in each project's home volume, once per project
