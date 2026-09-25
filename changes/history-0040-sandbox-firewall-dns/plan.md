# 0040 Sandbox firewall blocks its own DNS

## Approach

The fix is two firewall rules and a corrected comment in the kit's `container/entrypoint.sh`. It is written on a kit
branch, released by the human as the kit's next patch release, taken into this project as a dependency change, checked
against the release itself, and then reviewed. The spec's decision put a check from a tarball of the kit branch and
the review before the release; the human released first, so neither gated it, and `record.md` logs the change of
order. A finding that needs the kit to change therefore needs a further release.

The regression check is manual, as the spec decides. The failing case is the reproduction already logged in
`record.md` on kit `dc27d56`, whose entrypoint release 1.0.1 still carries.

The work spans both repositories, and the kit has no `changes/` of its own yet, so kit commits are named in
`record.md` by their message.

## Files

In `~/projects/agent-kit`:

- `container/entrypoint.sh`: the uid 0 owner rules for UDP and TCP port 53, and the comment above the DNS rules

In this repository:

- `package.json`, `package-lock.json`: the `@ritenoar/agent-kit` dependency, moved to the release carrying the fix

## Tasks

Kit repository, on the kit branch `bugfix-0040-sandbox-firewall-dns`:

- [x] Add rules accepting UDP and TCP port 53 to any destination only from sockets owned by uid 0, ahead of the
      unchanged rules for the `/etc/resolv.conf` nameservers (R1, R2, R4)
- [x] Rewrite the comment above the DNS rules to say that the embedded resolver forwards from inside the network
      namespace, that its upstream is not in `/etc/resolv.conf`, and why matching the owner keeps the agent out (R5)

Release:

- [x] The human bumps the version with `npm version patch` and runs the kit's `deploy.sh` on the host, which prints
      the release's URL (R6)

This repository, after the release:

- [x] Install the release by its URL with `npm install <url>`, which moves `package.json` and `package-lock.json` to
      it (R6)
- [x] Check requirements 1 to 4 with the release installed (R1, R2, R3, R4, R6)

Review:

- [x] Review the unit, the kit commit included, and settle every blocking finding. A finding that needs the kit to
      change needs a further kit release

## Verification

- [x] The kit's `npm test` passes on the kit commit
- [x] R1: `./agent.sh --rebuild` passes every start-up check and drops to the `agent` user, whose uid is not 0
- [x] R2: as the agent, `dig` answers for an allowlisted host over UDP, and `dig +tcp` answers through the embedded
      resolver
- [x] R3: as the agent, `dig` sent straight to `1.1.1.1`, over UDP and over TCP, gets no answer
- [x] R4: `iptables -S OUTPUT` in a running sandbox, read with `docker exec -u 0`, lists no port 53 rule other than
      the two uid 0 owner rules and the rules for the `/etc/resolv.conf` nameservers
- [x] R5: the comment above the DNS rules reads as the task above describes
- [x] R6: `package.json` and `package-lock.json` name the release carrying the fix, and R1 to R4 hold with it
- [x] `npm run test:unit` and `npm run check:changes` pass on the final tree

## Commit Points

- [x] `bugfix-0040 Admit the embedded resolver's forwarded DNS` (kit: `container/entrypoint.sh`)
- [x] `bugfix-0040 Move to the agent kit release with the DNS fix` (`package.json`, `package-lock.json`)
