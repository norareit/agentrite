# 0015 The sandbox refuses two hosts its harnesses need

## Context

The sandbox image holds Claude Code and OpenCode at versions the kit pins, and the sandbox's egress is bounded to
the hosts on its allowlist. Two hosts those versions need are on no list, neither the kit's own nor what `init`
writes for a project:

* `platform.claude.com`, without which Claude Code does not start in a sandbox that holds no saved login. A project
  that sets its sandbox up on a new machine therefore cannot run Claude Code in it at all
* `models.opencode.ai`, from which OpenCode fetches its model catalog. The human's harness telemetry reads that
  catalog

It was found in Norareit on 2026-10-02, on the MacBook, the first time its sandbox was started there.

The first draft of this unit also covered a second failure found in the same session: OpenCode did not start,
because the sandbox's `/tmp` was mounted `noexec`. Unit 0020 found that from another side, fixed it, and release 2.2.1
holds the fix. This unit no longer covers it.

## Observed behavior

Seen again on 2026-10-03, on macOS with Docker Desktop, Docker Engine 24.0.7 and Compose 2.23.3, with Claude Code
2.1.266 and OpenCode 1.18.30, in a sandbox whose home volume holds no login for Claude Code.

`claude` shows its welcome banner and then:

```
Unable to connect to Anthropic services

Failed to connect to platform.claude.com: UNKNOWN_CERTIFICATE_VERIFICATION_ERROR
```

`opencode` starts. The egress proxy's log shows that it asked for its model catalog and was refused, five times
over one start and one `opencode models`:

```
[egress-proxy] refused platform.claude.com: not allowlisted
[egress-proxy] refused models.opencode.ai: not allowlisted
```

## Expected behavior

Claude Code starts in a sandbox that holds no saved login, and OpenCode's request for its model catalog is admitted.

## Steps to reproduce

In a project on kit 2.2.1, with a home volume that holds no login for Claude Code:

1. `./agent.sh`
2. `claude`, and observe the `platform.claude.com` error
3. `opencode`, and leave it again
4. `grep 'not allowlisted' /run/egress-proxy.log`, and observe both hosts refused

## Root cause

Both hosts are refused for the same reason: neither is on the kit's allowlist or the project's, and the egress
proxy admits a connection only when the hostname in its ClientHello is on one of them.

**`platform.claude.com`.** `curl https://platform.claude.com` in the sandbox fails with `tlsv1 unrecognized name`,
which is the alert the proxy sends in place of a ServerHello, and Claude Code 2.1.266 reports that alert as a
certificate error. `history-0039-sni-filtering-proxy` records that the host was reachable before it, only because it
is served from the same address as `api.anthropic.com`. The hostname boundary closed that, and no unit added the host
back.

**`models.opencode.ai`.** The code of OpenCode 1.18.30 requests `/api.json` from this host and keeps the answer as
`models.json` in its cache directory, treating a copy younger than five minutes as fresh. The environment variable
`OPENCODE_MODELS_URL` names another host. Fetched outside the sandbox, the file is 5.3 MB of JSON: 226 providers and,
for each model, fields such as `cost`, `limit` and `modalities`. Norareit's home volume holds a copy with the same
226 providers.

The host `init` writes into a project's allowlist for OpenCode is `models.dev`. The binary of 1.18.30 holds no URL
on that host, and in every run here the only connection to it was the start-up check that each allowlisted host is
reachable. So the catalog has moved, and the entry that was meant to admit it no longer does.

**Checked.** With both hosts added to the kit's allowlist, through an extra Compose file that changed no file of the
kit or of Norareit, Claude Code reaches its first-run screen, OpenCode starts, and the proxy's log holds no refusal
but the start-up check's own.

**Not established.**

* Whether logging in to Claude Code contacts a further host. No login was carried out
* Whether Claude Code with a saved login contacts `platform.claude.com` at all
* What makes OpenCode fetch a new copy when it already holds one. With the host admitted and a copy two days old,
  OpenCode ran for 25 seconds without contacting the host; with the host refused it did try. The copy in Norareit's
  home volume dates from the minute of an earlier run in which the host was admitted, which is the only sign here
  that the fetch succeeds
* What OpenCode does when it holds no copy and the host is refused
* The same in an image built from 2.2.1. The runs used Norareit's image, built from kit 2.1.0, under the base
  Compose file of 2.2.1. Both kit versions pin the same harness versions

## Fix description

The kit's own allowlist gains `platform.claude.com` and `models.opencode.ai`, and each place that lists the hosts
the kit admits itself names them.

## Requirements

1. In a sandbox whose home volume holds no login for Claude Code, `claude` reaches its first-run screen
2. After `claude` and `opencode` have each been started in the sandbox, the egress proxy's log records no refusal of
   `platform.claude.com` or of `models.opencode.ai`
3. Both hosts are admitted by the kit itself, so that a project gets them by moving to the release that holds this
   fix, with no change to a file of its own
4. A regression test in the suite fails on the tree before the fix and passes after it. The suite runs no Docker,
   so the test reads the kit's base Compose file and holds that the kit's own allowlist includes both hosts
5. Requirements 1 and 2 are checked for real on a host with Docker. What was seen is in the record, with the Docker
   and Compose versions
6. Each place where the kit's documentation, or a file it generates for a project, lists the hosts the kit admits
   itself names these two as well

## Decisions

* **Both hosts go in the kit's own allowlist, not in what `init` writes for a harness.** 0010 put `models.dev` in
  the project's generated allowlist, as a host the OpenCode harness needs. That route does not fix this bug: `init`
  writes a project's Compose file once and `refresh` does not touch it, so a host added there reaches no existing
  project. The image holds both harnesses for every project, at versions the kit pins, and what a pinned version
  contacts changes with the pin, as the move away from `models.dev` shows. That makes these hosts the kit's own, and
  0010's rule for those is that a release that needs a new host adds it with no change to any project. The price is
  that a project using only one harness admits the other's host
* **`models.opencode.ai` is admitted although OpenCode starts without it.** The human needs the catalog it serves,
  and the code shows that this host is where OpenCode gets it. The host serves nothing but OpenCode's own data
* **`raw.githubusercontent.com` is not admitted.** Claude Code was seen to contact it once at start-up, and the
  human's rule is that a host is admitted only once it is known to be necessary. It is not. Claude Code fetches its
  release notes from it and starts without them. OpenCode fetches syntax highlighting queries from it, and would
  need `github.com` for the grammars as well, which the kit does not admit either. Against that, the host serves the
  files of every public repository. A project that wants OpenCode's highlighting lists both hosts in its own
  allowlist
* **The regression test reads the Compose file as text.** The suite runs no Docker and the kit has no YAML parser
  among its dependencies, which is how 0020 decided the same question for its test

This unit loosens the sandbox, so its boundary is stated. The adversary and the supported usage are those of
`history-0039-sni-filtering-proxy` and of 0020, unchanged: the agent itself, and whatever it is tricked into
running, which reaches only the allowlisted hosts. This unit widens what the kit allowlists for every project by two
hosts, each serving its vendor's own content. It does not stop data leaving through either, which the README
already says of every allowlisted host, and it defends against nothing new.

## Non-goals

* The sandbox's `/tmp`, which 0020 fixed
* Changing the pinned versions of Claude Code or OpenCode
* Any host that a login, or a harness in use after start-up, turns out to need. The plan's verification looks for
  one, and a host found there is a new unit
* OpenCode's syntax highlighting in a sandbox, and Claude Code's release notes
* The release that holds the fix, which the human makes, and moving Norareit or any other project to it

## Beyond the request

* **Taking `models.dev` out of what `init` writes for OpenCode.** OpenCode 1.18.30 no longer contacts it, so new
  projects are given an entry that admits nothing they use. It would cost a change to `init` and to its test, and
  it rests on the binary of one version. Without it nothing fails: a
  project admits one host more than it needs, and the entry is in a tracked file that the project can edit
* **A test that `raw.githubusercontent.com` stays off the kit's allowlist.** The first draft had one. It guards
  against a mistake nobody has made. Without it, adding the host is a visible change to a tracked file, which a
  review would see
* **Finding out what makes OpenCode fetch a new catalog.** It would cost a reading of OpenCode's source. Without it,
  a catalog that stays stale in a sandbox shows up in the human's telemetry as old data, and is looked into then
