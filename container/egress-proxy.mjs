// The sandbox's egress proxy. entrypoint.sh redirects every outbound TCP connection to
// port 443 here, and this decides it by the hostname in the ClientHello: a connection
// naming an allowlisted host is spliced through to that host, and any other is closed.
// TLS is never terminated. The hello and everything after it are forwarded unchanged, so
// the client still validates the origin's own certificate.
//
// The client's own destination is never used. The proxy resolves the hostname it
// validated and connects there, so an allowlisted name presented to an address of the
// client's choosing does not reach that address. Resolving per connection is also what
// keeps a host whose addresses rotate reachable.
//
// Usage: node egress-proxy.mjs PORT HOSTNAME...
// It listens on 127.0.0.1:PORT and logs one line per decision to stdout.

import { lookup } from 'node:dns/promises';
import { connect, createServer } from 'node:net';
import { pathToFileURL } from 'node:url';
import { parseClientHello } from './sni.mjs';

// A fatal unrecognized_name alert, so that a refused client reports why it failed rather
// than a bare reset. It is sent in place of a ServerHello and carries no certificate.
const UNRECOGNIZED_NAME_ALERT = Buffer.from([21, 3, 3, 0, 2, 2, 112]);
const CONNECT_TIMEOUT_MS = 10000;

export function createEgressProxy({ allowlist, resolve, upstreamPort = 443, helloTimeoutMs = 10000, log }) {
  const allowed = new Set(allowlist.map((hostname) => hostname.toLowerCase()));
  return createServer({ allowHalfOpen: true }, (client) => {
    client.on('error', () => {});
    readHello(client, helloTimeoutMs).then(
      ({ verdict, bytes }) => decide(verdict, bytes),
      (error) => {
        log(`refused: ${error.message}`);
        client.destroy();
      },
    );

    function decide(verdict, bytes) {
      if (verdict.kind === 'invalid') {
        log(`refused: ${verdict.reason}`);
        client.destroy();
      } else if (verdict.kind === 'no-hostname') {
        log('refused: the ClientHello names no host');
        refuse();
      } else if (!allowed.has(verdict.hostname)) {
        log(`refused ${verdict.hostname}: not allowlisted`);
        refuse();
      } else {
        forward(verdict.hostname, bytes);
      }
    }

    function refuse() {
      client.end(UNRECOGNIZED_NAME_ALERT, () => client.destroy());
    }

    async function forward(hostname, hello) {
      let upstream;
      try {
        upstream = await connectToFirst(await resolve(hostname), upstreamPort);
      } catch (error) {
        log(`failed ${hostname}: ${error.message}`);
        client.destroy();
        return;
      }
      if (client.destroyed) {
        upstream.destroy();
        return;
      }
      log(`allowed ${hostname} -> ${upstream.remoteAddress}`);
      upstream.on('error', () => {});
      upstream.on('close', () => client.destroy());
      client.on('close', () => upstream.destroy());
      upstream.write(hello);
      client.pipe(upstream);
      upstream.pipe(client);
    }
  });
}

// Collects bytes until the parser reaches a verdict, then stops reading, so that nothing
// after the hello is consumed before there is somewhere to send it.
function readHello(client, timeoutMs) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const timer = setTimeout(() => finish(new Error(`no ClientHello within ${timeoutMs} ms`)), timeoutMs);
    const onData = (chunk) => {
      chunks.push(chunk);
      const bytes = Buffer.concat(chunks);
      const verdict = parseClientHello(bytes);
      if (verdict.kind !== 'incomplete') finish(undefined, { verdict, bytes });
    };
    const onEnd = () => finish(new Error('the connection closed before its ClientHello was complete'));
    function finish(error, result) {
      clearTimeout(timer);
      client.off('data', onData);
      client.off('end', onEnd);
      client.off('close', onEnd);
      client.pause();
      if (error) reject(error);
      else resolve(result);
    }
    client.on('data', onData);
    client.on('end', onEnd);
    client.on('close', onEnd);
  });
}

async function connectToFirst(addresses, port) {
  if (addresses.length === 0) throw new Error('resolved to no address');
  const failures = [];
  for (const address of addresses) {
    try {
      return await connectTo(address, port);
    } catch (error) {
      failures.push(`${address}: ${error.message}`);
    }
  }
  throw new Error(failures.join('; '));
}

function connectTo(address, port) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: address, port, allowHalfOpen: true });
    socket.setTimeout(CONNECT_TIMEOUT_MS, () => socket.destroy(new Error('connect timed out')));
    socket.once('error', reject);
    socket.once('connect', () => {
      socket.setTimeout(0);
      socket.off('error', reject);
      resolve(socket);
    });
  });
}

async function resolveIPv4(hostname) {
  const results = await lookup(hostname, { family: 4, all: true });
  return results.map((result) => result.address);
}

function main([portArgument, ...allowlist]) {
  const port = Number(portArgument);
  if (!Number.isInteger(port) || port < 1 || port > 65535 || allowlist.length === 0) {
    console.error('usage: egress-proxy.mjs PORT HOSTNAME...');
    process.exit(2);
  }
  const log = (line) => console.log(`[egress-proxy] ${line}`);
  const proxy = createEgressProxy({ allowlist, resolve: resolveIPv4, log });
  proxy.listen(port, '127.0.0.1', () => log(`listening on 127.0.0.1:${port} for ${allowlist.join(' ')}`));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
