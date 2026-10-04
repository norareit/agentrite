# 0023 OpenCode cannot log in to OpenAI in the sandbox

## Context

The sandbox image holds OpenCode at a version the kit pins, 1.18.30. A project whose agents run on an OpenAI model
has to log OpenCode in to OpenAI once, in the sandbox, since the login is kept in the sandbox's home volume. With a
ChatGPT account that login does not complete, and nothing in the kit says why or what to do instead.

It was found on 2026-10-04, in this repository's own sandbox, by the human, while carrying out the last
verification task of 0015 with a new, empty home volume. This repository's reviewer runs under OpenCode on an OpenAI
model, so its sandbox cannot run the reviewer until this is fixed. No sandbox on that machine has ever held an
OpenCode login to OpenAI.

## Observed behavior

Reported by the human on Linux, with Docker Engine 28.4.0 and Compose 2.39.2, in a sandbox of this repository whose
allowlist admits `models.dev` and `api.openai.com` besides the kit's hosts:

* OpenCode's login to OpenAI showed an address to open. Copying it out of OpenCode's terminal interface was
  awkward, because the interface captures the mouse
* After authenticating in the host's browser, the browser was sent to
  `http://localhost:1455/auth/callback?code=...&scope=openid+profile+email+offline_access&state=...` and showed
  `ERR_CONNECTION_REFUSED`
* Inside the container, `ss -ltn` showed a listener on `*:1455` while the login was pending
* The egress proxy's log held `refused auth.openai.com: not allowlisted`, once

Seen again by the planner on the same machine, in a container of its own with a new home volume, without logging in
to anything:

```
$ opencode auth login -p openai -m "ChatGPT Pro/Plus (browser)"
  Go to: https://auth.openai.com/oauth/authorize?response_type=code&client_id=...&redirect_uri=http%3A%2F%2F
  localhost%3A1455%2Fauth%2Fcallback&...
  Complete authorization in your browser. This window will close automatically.
  Waiting for authorization
```

and, for the method that needs no callback:

```
$ opencode auth login -p openai -m "ChatGPT Pro/Plus (headless)"
Error: Failed to authorize: Unable to connect. Is the computer able to access the url?
```

with `refused auth.openai.com: not allowlisted` in the proxy's log.

## Expected behavior

A project that has chosen OpenAI as a provider can log OpenCode in to it in the sandbox, with a ChatGPT account or
with an API key, by following what the kit's documentation says, and can then send a prompt to an OpenAI model. This
repository's own sandbox is such a project.

## Steps to reproduce

In this repository, with a built sandbox and a home volume that holds no OpenCode login:

1. `./agent.sh`
2. `opencode auth login -p openai -m "ChatGPT Pro/Plus (headless)"`, and observe `Unable to connect`
3. `opencode auth login -p openai -m "ChatGPT Pro/Plus (browser)"`, open the address it prints in the host's
   browser and authenticate, and observe the browser fail to reach `localhost:1455`
4. `grep 'not allowlisted' /run/egress-proxy.log`, and observe `auth.openai.com` refused

## Root cause

Three things, each established on Linux with Docker Engine 28.4.0 and Compose 2.39.2, from the binary of OpenCode
1.18.30 as the image holds it and from containers started with the base Compose file of `master`, this repository's
project Compose file and its existing image. The containers, volumes and networks had names of their own and were
removed afterwards.

**What OpenCode offers.** The binary holds three login methods for the provider `openai`, by these labels:

| Method                        | What it does, by the binary's code                                              |
|-------------------------------|---------------------------------------------------------------------------------|
| `ChatGPT Pro/Plus (browser)`  | Listens on port 1455, prints an address on `auth.openai.com` whose              |
|                               | `redirect_uri` is `http://localhost:1455/auth/callback`, waits five minutes for |
|                               | that callback, then posts the code to `https://auth.openai.com/oauth/token`     |
| `ChatGPT Pro/Plus (headless)` | Posts to `https://auth.openai.com/api/accounts/deviceauth/usercode`, prints     |
|                               | `https://auth.openai.com/codex/device` and a code to enter there, polls         |
|                               | `.../api/accounts/deviceauth/token`, then posts to `.../oauth/token`. It        |
|                               | listens on nothing                                                              |
| `Manually enter API Key`      | Stores a key. No host is contacted to log in                                    |

`opencode auth login -p openai -m "<label>"` starts a method from the shell and prints plain lines, which a terminal
selects without OpenCode's interface in the way. OpenCode's own documentation of the provider names the browser
method and the API key, and does not mention the headless one.

**The callback cannot arrive.** The browser method assumes the browser and OpenCode share a `localhost`. In the
sandbox they do not, and nothing connects the two:

* The container publishes no port: `docker inspect` shows no port bindings, the base Compose file declares none,
  and `docker compose run`, which the wrapper uses, publishes a service's ports only when asked
* The entrypoint's firewall drops inbound traffic. Its `INPUT` policy is `DROP`, with loopback and established
  connections admitted and nothing else. With the login pending and `*:1455` listening, a request from the host to
  the container's own address on port 1455 timed out, and the same request from inside the container, over
  loopback, was answered by OpenCode. So publishing the port would not deliver the callback either

A second `opencode auth login` with the browser method, while the first was pending in the same container, failed
with `Failed to start server. Is port 1455 in use?`.

**The hosts are on no list.** `auth.openai.com` is not on the kit's allowlist or this project's, and the egress
proxy admits a connection only by hostname. Every ChatGPT method needs it: the headless method for its first
request, which is the `Unable to connect` above, and by the binary's code both methods for the token exchange and
every later refresh of the token. The same code sends the prompts of a ChatGPT login to
`https://chatgpt.com/backend-api/codex/responses`, in place of the address on `api.openai.com` that a login with an
API key uses, and `chatgpt.com` is on no list either. The kit's documentation tells a project to add "the API host"
of a provider, giving `api.openai.com` as the example, which is not what a ChatGPT login contacts.

**Checked.** With `auth.openai.com` and `chatgpt.com` added to the project's allowlist, through an extra Compose
file that changed no file of the repository, the container started, which includes the entrypoint's check that both
hosts are reachable through the proxy. The headless method then printed `Go to: https://auth.openai.com/codex/device`
and `Enter code:` with a code, and waited. The proxy's log held `allowed auth.openai.com` and no refusal but the
start-up check's canary, and nothing listened on port 1455. The login was stopped there.

**Not established**, because completing a login needs the human's account, and the planner logged in to nothing:

* That the headless login completes. OpenAI may require an account or a workspace to switch device codes on before
  it accepts one; that is from memory of OpenAI's own client and was not checked
* That a prompt after a ChatGPT login is answered with these two hosts and no third. That prompts go to
  `chatgpt.com` is read from the binary and was not seen in a proxy log
* That the one refusal of `auth.openai.com` in the human's log was the browser method's token exchange. By the
  binary's code that exchange follows the callback, and no callback arrived, so it may have been something else.
  Delivering a callback by hand to find out was not done
* Whether a ChatGPT login still contacts `api.openai.com` for anything
* That a login with an API key works in the sandbox. It contacts no host to log in, and `api.openai.com` is already
  admitted here, but it was not tried
* The same on Docker Desktop for macOS

## Fix description

The kit's documentation says how a provider login works in the sandbox: that a login which sends the browser back
to a port on `localhost` cannot complete there, and, for OpenAI in OpenCode, which method to use and which hosts each
kind of login needs. The comment in the Compose file `init` writes for a project says the same in short. This
repository's own allowlist gains `auth.openai.com` and `chatgpt.com`. Nothing that confines the sandbox changes.

## Requirements

1. In this repository's sandbox, with a home volume that holds no OpenCode login,
   `opencode auth login -p openai -m "ChatGPT Pro/Plus (headless)"` prints the address of OpenAI's device page and a
   code to enter there
2. After the human has entered that code in the host's browser, the login completes: `opencode auth list` in the
   sandbox names OpenAI, and one prompt to an OpenAI model in OpenCode is answered
3. After requirements 1 and 2, the egress proxy's log records no refusal of `auth.openai.com` or of `chatgpt.com`
4. A regression test in the suite fails on the tree before the fix and passes after it. The suite runs no Docker,
   so the test reads this repository's project Compose file and holds that its allowlist includes `auth.openai.com`
   and `chatgpt.com`, and still includes `api.openai.com`
5. The README says that a provider login which redirects the browser to a port on `localhost` cannot complete in
   the sandbox, and why. For OpenAI in OpenCode it gives the command of requirement 1, and names the hosts a project
   adds to its allowlist: `auth.openai.com` and `chatgpt.com` for a ChatGPT account, `api.openai.com` for an API key
6. The comment that opens the allowlist in the Compose file `init` writes for a project says that a provider's login
   may need hosts besides its API host, and names the two a ChatGPT account needs. This repository's own copy of that
   comment says the same
7. The sandbox publishes no port, and the entrypoint's firewall admits no inbound connection it did not admit
   before. The kit's own allowlist is unchanged
8. Requirements 1 to 3 are checked for real on a host with Docker, the login and the prompt by the human. What was
   seen is in the record, with the Docker and Compose versions, and with every host the proxy refused for want of an
   allowlist entry during the login and the prompt

## Decisions

* **The headless method is the supported login, and the port stays closed.** Publishing port 1455 was the first
  idea, and it does not work as it stands: the firewall drops the connection, so it would need an inbound rule as
  well as a published port. It would be the sandbox's only way in from outside, for a login done once per home
  volume. Two sandboxes at once would collide on the host's port, and the wrapper would have to ask
  `docker compose run` to publish, which it does not do today. The headless method needs none of that: it is
  outbound HTTPS to one host, which is what the sandbox already knows how to admit
* **Delivering the callback by hand is not documented.** OpenCode does answer on loopback inside the container, so
  `docker exec <container> curl '<the address the browser was sent to>'` would probably reach it. It was not tried
  with a real code. It needs the container's name, the address copied from a browser's error page and all of it
  inside five minutes, and it buys nothing the headless method does not give
* **Both hosts go in the project's allowlist, not the kit's.** 0015 put the hosts the pinned harnesses need in the
  kit's own list, and left a model provider to the project, whose allowlist `init` and the README already tell it to
  extend. OpenAI is a provider a project chooses. A project on Anthropic alone would otherwise admit `chatgpt.com`,
  which serves far more than an API, for nothing
* **`init` writes neither host.** It takes harnesses, not providers, and OpenCode does not imply OpenAI. So the fix
  for other projects is what the documentation and the generated comment tell them, and an existing project, whose
  Compose file `init` and `refresh` never rewrite, learns it from the README of the release
* **`api.openai.com` stays in this repository's allowlist.** A login with an API key uses it, and whether a ChatGPT
  login still does is not established. Taking out a host is not what was asked
* **The regression test reads this repository's project Compose file as text.** The suite runs no Docker and the kit
  has no YAML parser among its dependencies, which is how 0020 and 0015 decided the same question. It guards this
  repository's sandbox, which is where the bug was found. What the kit gives other projects here is prose, and a
  test that a sentence exists would hold the wording and not the behavior, so requirements 5 and 6 are checked by
  the reviewer reading them
* **The README names OpenCode's method by its label and its command.** The label is a string of the pinned
  version, and a later version may rename it. The pin is the kit's, so the instruction is the kit's to keep true,
  and a project gets both by the same release

This unit loosens a sandbox, so its boundary is stated. The adversary and the supported usage are those of
`history-0039-sni-filtering-proxy`, unchanged: the agent itself, and whatever it is tricked into running, which
reaches only the allowlisted hosts. This unit admits two more hosts in this repository's sandbox and in no other,
and tells other projects that they may do the same. `auth.openai.com` serves OpenAI's sign-in. `chatgpt.com` serves
the whole of ChatGPT, not only the address OpenCode posts to, and after a login the home volume holds a token for
the human's ChatGPT account, which the agent can read. So an agent in a sandbox that admits these hosts can act as
that account towards `chatgpt.com`, and data can leave through it, as the README already says of every allowlisted
host. That is the price of running an agent on that account at all, and it is the project's to accept by listing
the hosts. Nothing inbound is opened, and the unit defends against nothing new.

## Non-goals

* Publishing a port from the sandbox, or any change to the firewall, the proxy or the base Compose file
* A login to any other provider, or in Claude Code, whose own login the human carried out in the sandbox under 0015
* The other hosts the proxy refused in the human's session: `mcp-proxy.anthropic.com`,
  `http-intake.logs.us5.datadoghq.com`, `downloads.claude.ai`, `github.com` and `raw.githubusercontent.com`. Claude
  Code logged in and answered a prompt without them
* Changing the pinned version of OpenCode
* Copying text out of OpenCode's terminal interface. The command of requirement 1 is run from the shell, where the
  address and the code are plain lines
* The release that holds the fix, which the human makes, and moving any other project to it

## Beyond the request

* **A provider argument to `init`**, so that a project naming OpenAI gets the hosts written for it. It would cost a
  new argument, a table of providers and their hosts to keep true, and tests. Without it a project adds two lines by
  hand, from the README
* **A wrapper command that delivers a browser callback into the container.** It would make the browser method work
  with no port. It would cost a new command in the wrapper and its tests, for a login that the headless method
  already completes if requirement 2 holds. If it does not hold, this is the next thing to try, in a new unit
* **Taking `api.openai.com` out of this repository's allowlist** once a ChatGPT login is seen not to use it. It
  would cost one more traced session. Without it the sandbox admits one host more than it may need
* **A start-up warning when OpenCode's port 1455 is listening**, or any other detection of a login that cannot
  complete. Nothing in the sandbox watches the agent's processes today, and the README now says what happens
