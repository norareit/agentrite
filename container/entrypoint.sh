#!/usr/bin/env bash
#
# The one script in the sandbox that holds logic. It runs as root at container start,
# installs a default-deny egress firewall from the allowlist in the compose files,
# proves the firewall in both directions, and then drops to the unprivileged agent
# user. It exists only because iptables rules cannot be baked into an image: they are
# kernel state in a network namespace that does not exist until the container runs.
set -euo pipefail

export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

log() { printf '[entrypoint] %s\n' "$*" >&2; }
die() { printf '[entrypoint] FATAL: %s\n' "$*" >&2; exit 1; }

# Inputs, all declared in the compose files.
#   ALLOWLIST         newline-separated hostnames; '#' comments and blank lines allowed
#   MODEL_SERVER_HOST host gateway alias the local model server listens on
#   MODEL_SERVER_PORT its port
#   FIREWALL_CANARY   a host that must stay unreachable, proving default-deny denies
#   FIREWALL_PROBE    a host that must be reachable, proving the allowlist allows
ALLOWLIST="${ALLOWLIST:-}"
MODEL_SERVER_HOST="${MODEL_SERVER_HOST:-host.docker.internal}"
MODEL_SERVER_PORT="${MODEL_SERVER_PORT:-11434}"
FIREWALL_CANARY="${FIREWALL_CANARY:-example.com}"
FIREWALL_PROBE="${FIREWALL_PROBE:-api.anthropic.com}"

[ "$(id -u)" -eq 0 ] || die "must start as root to install the firewall"

# An allowlist entry is either a hostname, resolved once and probed at start-up, or a
# CIDR block, allowed verbatim. CIDRs exist for providers like Google Fonts whose
# frontend rotates through a range faster than a single resolve can track.
hosts=()
cidrs=()
while IFS= read -r line; do
  line="${line%%#*}"
  line="${line//[[:space:]]/}"
  [ -n "$line" ] || continue
  if [[ "$line" =~ ^[0-9]+(\.[0-9]+){3}/[0-9]+$ ]]; then
    cidrs+=("$line")
  else
    hosts+=("$line")
  fi
done <<< "$ALLOWLIST"
[ "${#hosts[@]}" -gt 0 ] || die "ALLOWLIST has no hostnames"

log "installing default-deny egress firewall"
iptables -F
iptables -X 2>/dev/null || true
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

iptables -A INPUT  -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT
iptables -A INPUT  -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# DNS to whatever resolvers the container was handed. Docker's embedded resolver sits
# on loopback and is already covered; this also allows an explicit external nameserver.
while read -r _ ns _; do
  [ -n "${ns:-}" ] || continue
  iptables -A OUTPUT -p udp -d "$ns" --dport 53 -j ACCEPT
  iptables -A OUTPUT -p tcp -d "$ns" --dport 53 -j ACCEPT
done < <(grep '^nameserver' /etc/resolv.conf || true)

# No allowlist entry covers IPv6, so deny it entirely apart from loopback. If the
# lockdown cannot be installed it is only safe to continue when the container has no
# IPv6 connectivity to leak through; otherwise the promised default-deny boundary has
# a hole and the container must not start.
lock_down_ipv6() {
  command -v ip6tables >/dev/null 2>&1 || return 1
  ip6tables -P INPUT DROP &&
  ip6tables -P FORWARD DROP &&
  ip6tables -P OUTPUT DROP &&
  ip6tables -A INPUT  -i lo -j ACCEPT &&
  ip6tables -A OUTPUT -o lo -j ACCEPT
}
if lock_down_ipv6; then
  log "IPv6 egress denied"
elif [ -n "$(ip -6 addr show scope global 2>/dev/null)" ] \
  || [ -n "$(ip -6 route show default 2>/dev/null)" ]; then
  die "the container has IPv6 connectivity but the IPv6 firewall could not be installed"
else
  log "IPv6 is not available in this container; its firewall was skipped"
fi

# Resolve each allowlisted host now and allow TCP to each address. A host that does not
# resolve is fatal: a silently empty allowlist is the false confidence this guards
# against. Plain per-address rules rather than an ipset, so NET_ADMIN stays the only
# capability the firewall needs (iptables' ipset match also wants NET_RAW).
for host in "${hosts[@]}"; do
  ips="$(dig +short A "$host" | grep -E '^[0-9]+(\.[0-9]+){3}$' || true)"
  [ -n "$ips" ] || die "cannot resolve allowlisted host: $host"
  while read -r ip; do
    [ -n "$ip" ] && iptables -A OUTPUT -p tcp -d "$ip" -j ACCEPT
  done <<< "$ips"
  log "allowlisted $host -> $(echo "$ips" | tr '\n' ' ')"
done

for cidr in "${cidrs[@]:-}"; do
  [ -n "$cidr" ] || continue
  iptables -A OUTPUT -p tcp -d "$cidr" -j ACCEPT
  log "allowlisted range $cidr"
done

# The host gateway address, on the local model server's port only.
gw_ip="$(getent hosts "$MODEL_SERVER_HOST" | awk '{print $1; exit}' || true)"
if [ -n "$gw_ip" ]; then
  iptables -A OUTPUT -p tcp -d "$gw_ip" --dport "$MODEL_SERVER_PORT" -j ACCEPT
  log "allowed local model server at $gw_ip:$MODEL_SERVER_PORT"
else
  log "WARNING: $MODEL_SERVER_HOST did not resolve; the local model server will be unreachable"
fi

# Prove the firewall before a human stops watching. Any failure here aborts the start.
# IPv4 only (IPv6 is dropped, and letting curl stall on it first would slow every
# start), a few retries so one dropped packet is not a false alarm.
reachable() {
  local host="$1" attempt
  for attempt in 1 2 3; do
    curl -4 -sS --connect-timeout 8 --max-time 25 -o /dev/null "https://$host" && return 0
    sleep 2
  done
  return 1
}
# A canary that fails to resolve, or whose TLS handshake or HTTP request fails for some
# other reason, proves nothing about the firewall: it could be wide open and still fail
# that way. The one thing a default-deny DROP policy actually produces is a TCP connect()
# that hangs until it times out; a REJECT, a refusal, or a reachable server all return
# before that. So resolve first, on its own, since a canary that does not resolve is a
# setup error rather than proof; then test the resolved address itself for that specific
# hang-until-killed signature, at the TCP level, before TLS or HTTP even start.
blocked() {
  local host="$1" ip status
  ip="$(dig +short A "$host" | grep -E '^[0-9]+(\.[0-9]+){3}$' | head -1)"
  [ -n "$ip" ] || die "firewall canary $host does not resolve; nothing to prove blocked"
  timeout 6 bash -c "exec 3<>/dev/tcp/$ip/443" 2>/dev/null && status=0 || status=$?
  [ "$status" -eq 124 ]
}

log "verifying the canary ($FIREWALL_CANARY) is blocked"
blocked "$FIREWALL_CANARY" \
  || die "$FIREWALL_CANARY is reachable but not allowlisted; egress is not confined"

log "verifying every allowlisted host is reachable"
for host in "${hosts[@]}"; do
  reachable "$host" || die "allowlisted host $host is not reachable; the allowlist is broken"
done

log "verifying the probe ($FIREWALL_PROBE) is reachable"
reachable "$FIREWALL_PROBE" || die "$FIREWALL_PROBE is not reachable; the firewall is broken"

# Defense in depth against a root "agent" account: the Dockerfile already refuses to
# build one, but a rebuilt or hand-rolled image could still have one, and dropping from
# root to root is a no-op that would leave the firewall capabilities in place.
agent_uid="$(id -u agent)"
agent_gid="$(id -g agent)"
[ "$agent_uid" -ne 0 ] && [ "$agent_gid" -ne 0 ] \
  || die "the agent account is uid/gid 0; refusing to drop into it as if it were unprivileged"

log "firewall verified; dropping to the agent user"
export HOME=/home/agent USER=agent LOGNAME=agent
exec setpriv --reuid=agent --regid=agent --init-groups -- "$@"
