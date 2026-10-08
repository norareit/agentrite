#!/usr/bin/env bash
#
# The one script in the sandbox that holds logic. It runs as root at container start,
# installs a default-deny egress firewall, starts the egress proxy that admits TLS by
# hostname from the allowlist in the compose files, proves both in both directions, and
# then drops to the unprivileged agent user. It exists only because iptables rules cannot
# be baked into an image: they are kernel state in a network namespace that does not
# exist until the container runs.
set -euo pipefail

export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

log() { printf '[entrypoint] %s\n' "$*" >&2; }
die() { printf '[entrypoint] FATAL: %s\n' "$*" >&2; exit 1; }

# Inputs, all declared in the compose files.
#   KIT_ALLOWLIST     the hostnames the kit itself needs, in the kit's compose file
#   ALLOWLIST         the hostnames the project needs besides, in the project's; may be
#                     empty or missing. Both lists are newline-separated hostnames, with
#                     '#' comments and blank lines allowed
#   MODEL_SERVER_HOST host gateway alias the local model server listens on
#   MODEL_SERVER_PORT its port
#   FIREWALL_CANARY   a host that must stay unreachable, proving default-deny denies
#   FIREWALL_PROBE    a host that must be reachable, proving the allowlist allows
MODEL_SERVER_HOST="${MODEL_SERVER_HOST:-host.docker.internal}"
MODEL_SERVER_PORT="${MODEL_SERVER_PORT:-11434}"
FIREWALL_CANARY="${FIREWALL_CANARY:-example.com}"
FIREWALL_PROBE="${FIREWALL_PROBE:-api.anthropic.com}"

# The egress proxy: where it listens, the account it runs as, and where it logs one line
# per decision. The log is readable by the agent, which is how a refused connection can
# be diagnosed from inside, but only root and the proxy can write it.
PROXY_PORT=15443
PROXY_USER=egress-proxy
PROXY_LOG=/run/egress-proxy.log

[ "$(id -u)" -eq 0 ] || die "must start as root to install the firewall"

# Defense in depth against a root or shared account: the Dockerfile already refuses to
# build either, but a rebuilt or hand-rolled image could still have one. Dropping from
# root to root is a no-op that would leave the firewall capabilities in place, and an
# agent sharing the proxy's uid would inherit its exemption from the firewall.
agent_uid="$(id -u agent)"
agent_gid="$(id -g agent)"
proxy_uid="$(id -u "$PROXY_USER")" || die "the $PROXY_USER account is missing from the image"
[ "$agent_uid" -ne 0 ] && [ "$agent_gid" -ne 0 ] \
  || die "the agent account is uid/gid 0; refusing to drop into it as if it were unprivileged"
[ "$proxy_uid" -ne 0 ] && [ "$proxy_uid" -ne "$agent_uid" ] \
  || die "the $PROXY_USER account is uid $proxy_uid; it must be neither root nor the agent"

# How a home volume that the agent cannot write is recovered, which is what a refusal of
# one ends in.
home_volume_recovery() {
  cat <<'RECOVERY'
Recover by removing the project's agent-home volume, which discards Claude Code's saved login, and starting again.
The volume is named <project>_agent-home, where <project> is the Compose project's name, set as 'name:' in
agent/compose.project.yml. Find the exact name with docker volume ls, then:
  docker volume rm <project>_agent-home
RECOVERY
}

# The agent's home is a named volume, filled from the image only the first time it is
# mounted. Docker never changes its owner afterwards, so a volume filled by an image
# whose agent had another uid stays owned by that uid, and the agent then cannot write
# its own home: npm fails to create its cache and the harnesses cannot save their state,
# with nothing inside naming the cause. The container's root holds no CAP_CHOWN, so this
# entrypoint cannot repair it either. Fail loudly instead, before any of that happens.
# Comparing only the top of the home is enough for that: a volume filled by one image is
# owned throughout by one uid. What Docker makes in the volume later, for a mount inside
# it, is another matter, and check_log_directory_owners below looks at that.
check_home_owner() {
  local agent_uid="$1" home_path="$2"
  local home_owner
  home_owner="$(stat -c %u "$home_path")"
  if [ "$home_owner" -ne "$agent_uid" ]; then
    die "$home_path is owned by uid $home_owner, but the agent is uid $agent_uid, so the agent cannot write its home.
$(home_volume_recovery)"
  fi
}
check_home_owner "$agent_uid" /home/agent

# container/agent.sh mounts two directories of the host inside the home, for the
# harnesses' logs: .claude/projects and .local/share/opencode. The image holds both
# mount points as the agent's, so a home volume filled from it has them. A volume that
# an earlier release filled has them only when a harness made them, and where one is
# missing Docker makes it, and every missing directory above it, as root, before this
# script runs. The agent then cannot write beside the mount: Claude Code keeps its login
# and its settings in .claude. As above, root here cannot change an owner, so the start
# is refused, at the first such directory. The two mount points themselves are not
# compared: Docker Desktop shows the top of every mounted directory as root's while the
# agent writes it, so their owner says nothing.
#
# Each directory is read as the agent, not as root. Root here holds none of the
# capabilities that let root pass a file's permissions, so it enters a directory only as
# any other user would, and a tool that follows the XDG convention makes .local for its
# owner alone: root could then not look at .local/share in a home that is sound. The
# agent is who has to use these directories, and this script can become the agent. A
# directory that even the agent cannot read is refused too, in this script's words and
# with what the read said, rather than the script ending on the bare error of stat.
check_log_directory_owners() {
  local agent_uid="$1" home_path="$2"
  local name directory owner
  for name in .claude .local .local/share; do
    directory="$home_path/$name"
    owner="$(setpriv --reuid=agent --regid=agent --init-groups -- stat -c %u "$directory" 2>&1)" \
      || die "$directory could not be examined as the agent, so the agent cannot be shown to write it: $owner
$(home_volume_recovery)"
    [ "$owner" -eq "$agent_uid" ] \
      || die "$directory is owned by uid $owner, but the agent is uid $agent_uid, so the agent cannot write it.
The home volume was made by an earlier release, in which that directory was never made, so Docker made it as root
when it mounted the harnesses' logs inside it.
$(home_volume_recovery)"
  done
}
check_log_directory_owners "$agent_uid" /home/agent

# Every allowlist entry is a hostname, admitted by the proxy on 443 alone. A CIDR range
# is refused rather than ignored: there is no longer a rule that could admit one, and
# silently dropping an entry would leave the allowlist saying more than it does. A list
# is named rather than passed, so that an error says which list holds the entry.
# Appends the named list's hosts, lowercased, to hosts.
read_allowlist() {
  local name="$1" line
  while IFS= read -r line; do
    line="${line%%#*}"
    line="${line//[[:space:]]/}"
    [ -n "$line" ] || continue
    [[ ! "$line" =~ ^[0-9]+(\.[0-9]+){3}(/[0-9]+)?$ ]] \
      || die "$name entry $line is an address; egress is admitted by hostname only, so list the host"
    [ "${line,,}" != "${FIREWALL_CANARY,,}" ] \
      || die "the firewall canary $FIREWALL_CANARY is allowlisted in $name"
    hosts+=("${line,,}")
  done <<< "${!name:-}"
}
# Sets hosts to those of every named list together. A host in more than one list, or
# listed twice, is admitted once.
parse_allowlist() {
  local name
  hosts=()
  for name in "$@"; do
    read_allowlist "$name"
  done
  [ "${#hosts[@]}" -gt 0 ] || die "$* have no hostnames"
  mapfile -t hosts < <(printf '%s\n' "${hosts[@]}" | awk '!seen[$0]++')
}
# The kit's hosts come from its own compose file and the project's from the project's,
# so a project never lists a host the kit needs.
parse_allowlist KIT_ALLOWLIST ALLOWLIST

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

# DNS to whatever resolvers the container was handed, which allows an explicit external
# nameserver. Docker's embedded resolver on 127.0.0.11 is reached over loopback, but
# it forwards each query to its upstream from inside this network namespace, so the
# forwarded query crosses this OUTPUT chain too. That upstream is not listed in
# resolv.conf (Docker Desktop's is 192.168.65.7), so it is admitted by owner instead:
# the forwarding socket belongs to the Docker daemon, uid 0. Nothing else here holds
# uid 0 after the drop: the agent and the proxy are checked above to be neither root,
# and no-new-privileges keeps setuid binaries from making them so.
iptables -A OUTPUT -p udp --dport 53 -m owner --uid-owner 0 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -m owner --uid-owner 0 -j ACCEPT
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

# TLS by hostname. Every outbound connection to port 443 is redirected to the proxy,
# which reads the hostname from the ClientHello and connects to that host only if it is
# allowlisted. The proxy's own onward connections are exempt from the redirect, and are
# the only 443 traffic the filter admits. No rule admits an address because an
# allowlisted host resolves there: a shared edge serves other names on other ports, and
# plain HTTP by Host header, so any such rule would be a way around the proxy. The nat
# rules are appended, not flushed first: Docker's embedded resolver at 127.0.0.11 is
# reached through nat rules of its own in this namespace.
iptables -t nat -A OUTPUT -p tcp --dport 443 -m owner --uid-owner "$proxy_uid" -j RETURN
iptables -t nat -A OUTPUT -p tcp --dport 443 -d 127.0.0.0/8 -j RETURN
iptables -t nat -A OUTPUT -p tcp --dport 443 -j REDIRECT --to-ports "$PROXY_PORT"
# A redirected packet is rerouted to loopback, but the filter still sees the interface
# it was first routed to, so the loopback rule above does not admit it. This does.
iptables -A OUTPUT -p tcp -d 127.0.0.1 --dport "$PROXY_PORT" -j ACCEPT
iptables -A OUTPUT -p tcp --dport 443 -m owner --uid-owner "$proxy_uid" -j ACCEPT

# The host gateway address, on the local model server's port only.
gw_ip="$(getent hosts "$MODEL_SERVER_HOST" | awk '{print $1; exit}' || true)"
if [ -n "$gw_ip" ]; then
  iptables -A OUTPUT -p tcp -d "$gw_ip" --dport "$MODEL_SERVER_PORT" -j ACCEPT
  log "allowed local model server at $gw_ip:$MODEL_SERVER_PORT"
else
  log "WARNING: $MODEL_SERVER_HOST did not resolve; the local model server will be unreachable"
fi

# Start the proxy as its own account, with no capabilities, in a session of its own so
# that a signal sent to the agent's terminal does not reach it. It outlives this script:
# the exec at the end replaces the shell, not its children. If it dies, the redirect
# still points at its port and the filter still admits no other 443, so egress stops.
: > "$PROXY_LOG"
chmod 644 "$PROXY_LOG"
setsid setpriv --reuid="$PROXY_USER" --regid="$PROXY_USER" --clear-groups -- \
  node /usr/local/lib/egress-proxy/egress-proxy.mjs "$PROXY_PORT" "${hosts[@]}" \
  >> "$PROXY_LOG" 2>&1 < /dev/null &
proxy_pid=$!
# Checked through /proc rather than kill -0: root here holds no CAP_KILL, so it cannot
# signal a process of another uid, and kill -0 fails on a proxy that is running.
for _ in $(seq 50); do
  grep -q '\[egress-proxy\] listening' "$PROXY_LOG" && break
  [ -d "/proc/$proxy_pid" ] || die "the egress proxy exited at start-up: $(cat "$PROXY_LOG")"
  sleep 0.1
done
grep -q '\[egress-proxy\] listening' "$PROXY_LOG" || die "the egress proxy did not start listening"
log "egress proxy listening on 127.0.0.1:$PROXY_PORT as $PROXY_USER"

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
resolve_one() {
  dig +short A "$1" | grep -E '^[0-9]+(\.[0-9]+){3}$' | head -1
}
# A canary that fails to resolve, or whose connection fails for some other reason,
# proves nothing about the firewall: it could be wide open and still fail that way. The
# one thing a default-deny DROP policy actually produces is a TCP connect() that hangs
# until it times out; a REJECT, a refusal, or a reachable server all return before that.
# So resolve first, on its own, since a canary that does not resolve is a setup error
# rather than proof; then test the resolved address itself for that specific
# hang-until-killed signature, at the TCP level. Port 80, because 443 is redirected to
# the proxy and so connects locally whatever the destination.
blocked() {
  local host="$1" ip status
  ip="$(resolve_one "$host")"
  [ -n "$ip" ] || die "firewall canary $host does not resolve; nothing to prove blocked"
  timeout 6 bash -c "exec 3<>/dev/tcp/$ip/80" 2>/dev/null && status=0 || status=$?
  [ "$status" -eq 124 ]
}
# The hostname boundary: the canary's name, presented at the probe's own address, must
# be refused by the proxy. A failed request alone is not proof, since it could fail for
# reasons of its own, so the proxy's log must also record the refusal by name. The two
# connections differ only in the hostname, which is the whole of what this unit adds.
refused_at_probe_address() {
  local host="$1" probe_ip="$2"
  ! curl -4 -sS --connect-timeout 8 --max-time 25 -o /dev/null \
    --resolve "$host:443:$probe_ip" "https://$host" 2>/dev/null \
    && grep -qF "[egress-proxy] refused ${host,,}: not allowlisted" "$PROXY_LOG"
}

log "verifying the canary ($FIREWALL_CANARY) is blocked"
blocked "$FIREWALL_CANARY" \
  || die "$FIREWALL_CANARY is reachable on port 80; egress is not confined"

log "verifying every allowlisted host is reachable"
for host in "${hosts[@]}"; do
  reachable "$host" || die "allowlisted host $host is not reachable; see $PROXY_LOG"
done

log "verifying the probe ($FIREWALL_PROBE) is reachable"
reachable "$FIREWALL_PROBE" || die "$FIREWALL_PROBE is not reachable; the firewall is broken"

probe_ip="$(resolve_one "$FIREWALL_PROBE")"
[ -n "$probe_ip" ] || die "the probe $FIREWALL_PROBE does not resolve"
log "verifying $FIREWALL_CANARY is refused at $FIREWALL_PROBE's address ($probe_ip)"
refused_at_probe_address "$FIREWALL_CANARY" "$probe_ip" \
  || die "$FIREWALL_CANARY was not refused at an allowlisted address; egress is not bounded by hostname"

log "firewall verified; dropping to the agent user"
export HOME=/home/agent USER=agent LOGNAME=agent
exec setpriv --reuid=agent --regid=agent --init-groups -- "$@"
