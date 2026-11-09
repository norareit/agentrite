# 0104 The local model server, admitted only in a project that asks for it

## Context

The firewall of the sandbox admits one host and port outside the allowlist: the local model server, at
`MODEL_SERVER_HOST` on `MODEL_SERVER_PORT`, which `container/compose.yml` sets to `host.docker.internal` and `11434`.
It is admitted at every start of every project, whether or not the project uses a model server. "The local model
server" of `SANDBOX.md` says that it is reached, and nothing of what the server can do once reached.

The human decided that the port is admitted only in a project that asks for it, rather than in every project with a
line in `SANDBOX.md` saying what admitting it gives. A project that uses no model server, which is most of them, then
has nothing outside the allowlist but DNS to its resolvers, and a project that uses one says so in its committed
settings. It is the fix of a finding of the security reviewer, specified, as "Security findings" of `AGENTS.md` says,
by what will be true once it is done.

### The adversary and the supported usage

The adversary is the agent of the sandbox as "What the sandbox defends against" of `SANDBOX.md` describes it: one that
may have been misled, and that runs any program as the agent's user in the container. The unit bounds what such an
agent reaches outside the allowlist: nothing of the host in a project that does not ask for the model server, and the
server's port alone in one that does. It does not bound what the model server itself does once reached, which is the
server's, and which `SANDBOX.md` names for the developer who turns it on.

The supported usage is a project whose `agentrite.json` the developer commits, and a sandbox started through the
project's `sandbox.sh`.

## Requirements

The setting:

1. `agentrite.json` has a required key `modelServer`, `true` or `false`, not a string. It is judged as `bell` is: a
   file that lacks it, or whose `modelServer` holds anything else, is refused by every command that reads the whole
   file, with a message that names the file, the key, what it holds or that it is missing, and what it must hold
2. `npx agentrite config` and `npx agentrite init` write `"modelServer": false`
3. This repository's own `agentrite.json` holds `"modelServer": false`

The sandbox:

4. Every start of the sandbox but `--connect` reads `modelServer` beside `bell` and `harnesses`, at the same point,
   before it asks the host's harnesses, Docker or npm anything, and refuses, starting nothing, a file whose
   `modelServer` is missing or holds anything else, as it refuses one for `bell`. `bell` is judged first, then
   `modelServer`, then `harnesses`
5. With `"modelServer": false`, the firewall admits nothing of the host gateway: no address and no port of it is
   reachable from the container, by any user of it. The entrypoint logs that the local model server is not admitted,
   and that `modelServer` in `agentrite.json` admits it
6. With `"modelServer": true`, the firewall admits the model server's IPv4 address on its port, as it admits it in
   every start before this unit, and logs it as it does
7. The value is read at each start, so a change holds from the next start with no rebuild of the image
8. `--connect` joins the container with what its start admitted, and reads nothing of `modelServer`
9. Whatever carries the value from the wrapper into the container is the kit's to set. A
   `sandbox/compose.project.yml` that sets it is refused before anything is built, as one that sets `KIT_ALLOWLIST`
   is, with a message that names the file, what it sets and that `modelServer` in `agentrite.json` is the setting

The documents:

10. "The project's settings" of `SETUP.md` has `modelServer` in its table, in the default file, in the count of the
    keys and the list of the required ones, and with a line of what it does and when it is read
11. "agentrite config", "agentrite init" and "sandbox.sh" of `COMMANDS.md` say what they write and read of
    `modelServer`, and what a start refuses for it
12. "The local model server" of `SANDBOX.md` says that the port is admitted only with `"modelServer": true`, from the
    next start, and that the container then reaches the server's whole API, as any program on the host does: what the
    server does for a caller, such as pulling a model from a registry the caller names, it does from the host, beyond
    the allowlist and the firewall of the container
13. "Reaching more hosts" and "What the sandbox defends against" of `SANDBOX.md` give the model server as reachable
    only with `"modelServer": true`
14. The entry "The container cannot reach the model of the local model server" of "When something goes wrong" in
    `SANDBOX.md` names first a project whose `agentrite.json` lacks `"modelServer": true`, and then the host's
    firewall it names today

Tests:

15. Tests show that a start with `"modelServer": false` admits nothing of the gateway, that one with `true` admits its
    port alone, that a start refuses a missing or wrong `modelServer`, that `config` and `init` write `false`, and that
    a `sandbox/compose.project.yml` setting the value is refused

## Decisions

* **A key of `agentrite.json`, not a setting of `sandbox/compose.project.yml`.** It is a decision of the project about
  what the sandbox reaches, which is committed and reviewed with the project, and read at each start with no rebuild,
  as `bell` is. A variable of the project's compose file was rejected: the kit refuses a project's compose file that
  sets what the kit sets, and one place for the setting leaves no question of which wins
* **The key is required, as every key of the file is.** `bell` was added the same way. A project that updates the
  kit is refused at its next start, and at its next command that reads the whole file, until it adds the key, with
  a message that names it. An optional key with `false` as its default was rejected: the file has no optional key,
  and the refusal makes each project choose once rather than lose its model server without a word at an update
* **`config` and `init` write `false`.** Admitting the server is what a project asks for. A project that uses one
  sets `true`
* **The host and the port stay those of `container/compose.yml`.** The unit decides whether the port is admitted, and
  not which host or port. A project that needs another has the same choice it has today
* **What the server can do is described in `SANDBOX.md`, not limited.** A filter in front of the port that admits
  only the endpoints of inference was rejected: it would be a proxy of the kit's that follows the API of each model
  server. The developer who turns the port on is told what it gives

## Non-goals

* Admitting another host or port of the host, or more than one model server
* Changing what the model server does or which of its endpoints a caller reaches
* `--in-place` and `--workdir` behave as a unit run does here, since the firewall is the same for every form of start,
  and nothing about them changes beyond that
* The harnesses' configuration of a local model, which stays the project's own

## Beyond the request

None
