import assert from 'node:assert/strict';
import { once } from 'node:events';
import { connect, createServer } from 'node:net';
import { test } from 'node:test';
import { createEgressProxy } from '../container/egress-proxy.mjs';

function uint16(value) {
  return Buffer.from([value >> 8, value & 0xff]);
}

// The smallest ClientHello the parser accepts, naming one host.
function clientHello(hostname) {
  const name = Buffer.from(hostname, 'ascii');
  const entry = Buffer.concat([Buffer.from([0]), uint16(name.length), name]);
  const list = Buffer.concat([uint16(entry.length), entry]);
  const extensions = Buffer.concat([uint16(0), uint16(list.length), list]);
  const body = Buffer.concat([uint16(0x0303), Buffer.alloc(32), Buffer.from([0]), uint16(2), uint16(0x1301),
    Buffer.from([1, 0]), uint16(extensions.length), extensions]);
  const message = Buffer.concat([Buffer.from([1, 0]), uint16(body.length), body]);
  return Buffer.concat([Buffer.from([22]), uint16(0x0301), uint16(message.length), message]);
}

const UNRECOGNIZED_NAME_ALERT = Buffer.from([21, 3, 3, 0, 2, 2, 112]);

// An upstream standing in for the origin: it records what arrives and answers each
// connection with a fixed reply once the client half-closes.
async function startUpstream() {
  const connections = [];
  const server = createServer({ allowHalfOpen: true }, (socket) => {
    const received = [];
    const connection = { received: () => Buffer.concat(received) };
    connections.push(connection);
    socket.on('data', (data) => received.push(data));
    socket.on('end', () => socket.end('reply from upstream'));
    socket.on('error', () => {});
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { server, connections, port: server.address().port };
}

async function startProxy(options) {
  const lines = [];
  const proxy = createEgressProxy({ helloTimeoutMs: 2000, log: (line) => lines.push(line), ...options });
  proxy.listen(0, '127.0.0.1');
  await once(proxy, 'listening');
  return { proxy, lines, port: proxy.address().port };
}

// Sends each chunk in its own write, half-closes, and collects everything the proxy sends
// back until it closes the connection.
async function exchange(port, chunks, { halfClose = true } = {}) {
  const socket = connect({ port, host: '127.0.0.1', allowHalfOpen: true });
  await once(socket, 'connect');
  const received = [];
  // Listened for before writing, because a refusal can close the socket between writes.
  const closed = once(socket, 'close');
  socket.on('data', (data) => received.push(data));
  socket.on('end', () => socket.end());
  socket.on('error', () => {});
  for (const chunk of chunks) {
    socket.write(chunk);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  if (halfClose && !socket.destroyed) socket.end();
  await closed;
  return Buffer.concat(received);
}

async function withServers(options, body) {
  const upstream = await startUpstream();
  const resolved = [];
  const resolve = options.resolve ?? (async (hostname) => {
    resolved.push(hostname);
    return ['127.0.0.1'];
  });
  const started = await startProxy({ upstreamPort: upstream.port, ...options, resolve });
  try {
    await body({ ...started, upstream, resolved });
  } finally {
    started.proxy.close();
    upstream.server.close();
  }
}

test('forwards an allowlisted connection with every byte unchanged, in both directions', async () => {
  await withServers({ allowlist: ['allowed.example'] }, async ({ port, upstream }) => {
    const hello = clientHello('allowed.example');
    const after = Buffer.from([23, 3, 3, 0, 3, 1, 2, 3]);
    const reply = await exchange(port, [hello.subarray(0, 10), hello.subarray(10), after]);
    assert.equal(reply.toString(), 'reply from upstream');
    assert.equal(upstream.connections.length, 1);
    assert.deepEqual(upstream.connections[0].received(), Buffer.concat([hello, after]));
  });
});

test('matches the allowlist regardless of case', async () => {
  await withServers({ allowlist: ['Allowed.Example'] }, async ({ port, upstream }) => {
    await exchange(port, [clientHello('ALLOWED.example')]);
    assert.equal(upstream.connections.length, 1);
  });
});

test('connects to the address the validated hostname resolves to', async () => {
  await withServers({ allowlist: ['allowed.example'] }, async ({ port, upstream, resolved }) => {
    await exchange(port, [clientHello('allowed.example')]);
    assert.deepEqual(resolved, ['allowed.example']);
    assert.equal(upstream.connections.length, 1);
  });
});

test('tries the next resolved address when one cannot be reached', async () => {
  // The upstream listens on 127.0.0.1 only, so the same port on 127.0.0.2 refuses.
  const resolve = async () => ['127.0.0.2', '127.0.0.1'];
  await withServers({ allowlist: ['allowed.example'], resolve }, async ({ port, upstream }) => {
    const reply = await exchange(port, [clientHello('allowed.example')]);
    assert.equal(reply.toString(), 'reply from upstream');
    assert.equal(upstream.connections.length, 1);
  });
});

test('refuses a hostname that is not allowlisted, with an unrecognized_name alert, and never resolves it',
  async () => {
    await withServers({ allowlist: ['allowed.example'] }, async ({ port, upstream, resolved, lines }) => {
      const reply = await exchange(port, [clientHello('other.example')], { halfClose: false });
      assert.deepEqual(reply, UNRECOGNIZED_NAME_ALERT);
      assert.deepEqual(resolved, []);
      assert.equal(upstream.connections.length, 0);
      assert.ok(lines.some((line) => /refused other\.example/.test(line)), lines.join('\n'));
    });
  });

test('refuses a subdomain of an allowlisted host', async () => {
  await withServers({ allowlist: ['allowed.example'] }, async ({ port, upstream }) => {
    await exchange(port, [clientHello('sub.allowed.example')], { halfClose: false });
    assert.equal(upstream.connections.length, 0);
  });
});

test('refuses a connection that is not TLS', async () => {
  await withServers({ allowlist: ['allowed.example'] }, async ({ port, upstream, lines }) => {
    const reply = await exchange(port, [Buffer.from('GET / HTTP/1.1\r\nHost: allowed.example\r\n\r\n')],
      { halfClose: false });
    assert.equal(reply.length, 0);
    assert.equal(upstream.connections.length, 0);
    assert.ok(lines.some((line) => /refused/.test(line)), lines.join('\n'));
  });
});

test('refuses a connection that sends no ClientHello before the timeout', async () => {
  await withServers({ allowlist: ['allowed.example'], helloTimeoutMs: 100 }, async ({ port, upstream }) => {
    const hello = clientHello('allowed.example');
    const reply = await exchange(port, [hello.subarray(0, 20)], { halfClose: false });
    assert.equal(reply.length, 0);
    assert.equal(upstream.connections.length, 0);
  });
});

test('refuses a connection that closes before its ClientHello is complete', async () => {
  await withServers({ allowlist: ['allowed.example'] }, async ({ port, upstream }) => {
    await exchange(port, [clientHello('allowed.example').subarray(0, 20)]);
    assert.equal(upstream.connections.length, 0);
  });
});

test('closes the connection when the allowlisted hostname does not resolve', async () => {
  const resolve = async () => {
    throw new Error('ENOTFOUND');
  };
  await withServers({ allowlist: ['allowed.example'], resolve }, async ({ port, upstream, lines }) => {
    const reply = await exchange(port, [clientHello('allowed.example')], { halfClose: false });
    assert.equal(reply.length, 0);
    assert.equal(upstream.connections.length, 0);
    assert.ok(lines.some((line) => /allowed\.example/.test(line) && /ENOTFOUND/.test(line)), lines.join('\n'));
  });
});

test('closes the connection when no resolved address can be reached', async () => {
  const resolve = async () => ['127.0.0.2'];
  await withServers({ allowlist: ['allowed.example'], resolve }, async ({ port, upstream }) => {
    const reply = await exchange(port, [clientHello('allowed.example')], { halfClose: false });
    assert.equal(reply.length, 0);
    assert.equal(upstream.connections.length, 0);
  });
});

test('logs each allowed connection with the address it reached', async () => {
  await withServers({ allowlist: ['allowed.example'] }, async ({ port, lines }) => {
    await exchange(port, [clientHello('allowed.example')]);
    assert.ok(lines.some((line) => /allowed allowed\.example -> 127\.0\.0\.1/.test(line)), lines.join('\n'));
  });
});
