import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { connect } from 'node:tls';
import { test } from 'node:test';
import { parseClientHello } from '../container/sni.mjs';

// A ClientHello built by hand, so that each field can be made wrong on its own.
function uint16(value) {
  return Buffer.from([value >> 8, value & 0xff]);
}

function extension(type, body) {
  return Buffer.concat([uint16(type), uint16(body.length), body]);
}

function serverName(hostname) {
  const name = Buffer.from(hostname, 'ascii');
  const entry = Buffer.concat([Buffer.from([0]), uint16(name.length), name]);
  return extension(0x0000, Buffer.concat([uint16(entry.length), entry]));
}

function helloBody(extensions) {
  const joined = Buffer.concat(extensions);
  return Buffer.concat([
    uint16(0x0303),
    Buffer.alloc(32),
    Buffer.from([0]),
    uint16(2), uint16(0x1301),
    Buffer.from([1, 0]),
    uint16(joined.length), joined,
  ]);
}

function handshake(body, type = 1) {
  return Buffer.concat([Buffer.from([type, 0, body.length >> 8, body.length & 0xff]), body]);
}

function record(fragment, type = 22) {
  return Buffer.concat([Buffer.from([type]), uint16(0x0301), uint16(fragment.length), fragment]);
}

function clientHello(extensions) {
  return record(handshake(helloBody(extensions)));
}

// A real ClientHello from Node's own TLS client, captured on a local listener.
async function captureNodeHello(options) {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const captured = new Promise((resolve) => {
    server.once('connection', (socket) => socket.once('data', (data) => {
      resolve(data);
      socket.destroy();
    }));
  });
  const client = connect({ host: '127.0.0.1', port: server.address().port, ...options });
  client.on('error', () => {});
  const hello = await captured;
  client.destroy();
  server.close();
  return hello;
}

// Captured from Playwright's Chromium loading https://fonts.googleapis.com/. It carries the
// encrypted_client_hello extension (0xfe0d) as GREASE, which Chromium sends on every
// connection for which it has no ECH configuration.
const chromiumHello = Buffer.from(
  readFileSync(new URL('fixtures/chromium-client-hello.hex', import.meta.url), 'utf8').replace(/\s/g, ''),
  'hex',
);

test('parseClientHello reads the hostname from a hello with SNI', () => {
  assert.deepEqual(parseClientHello(clientHello([serverName('api.example.com')])),
    { kind: 'hostname', hostname: 'api.example.com' });
});

test('parseClientHello reads the hostname from a real Node TLS hello', async () => {
  const hello = await captureNodeHello({ servername: 'registry.example.org' });
  assert.deepEqual(parseClientHello(hello), { kind: 'hostname', hostname: 'registry.example.org' });
});

test('parseClientHello lowercases the hostname', () => {
  assert.deepEqual(parseClientHello(clientHello([serverName('API.Example.COM')])),
    { kind: 'hostname', hostname: 'api.example.com' });
});

test('parseClientHello finds SNI among other extensions', () => {
  const hello = clientHello([extension(0x000a, Buffer.from([0, 2, 0, 0x1d])), serverName('a.example'),
    extension(0x002b, Buffer.from([2, 3, 4]))]);
  assert.deepEqual(parseClientHello(hello), { kind: 'hostname', hostname: 'a.example' });
});

test('parseClientHello reports a hello with no SNI extension', () => {
  assert.deepEqual(parseClientHello(clientHello([extension(0x000a, Buffer.from([0, 2, 0, 0x1d]))])),
    { kind: 'no-hostname' });
});

test('parseClientHello reports a real Node TLS hello to an address, which carries no SNI', async () => {
  const hello = await captureNodeHello({ rejectUnauthorized: false });
  assert.deepEqual(parseClientHello(hello), { kind: 'no-hostname' });
});

test('parseClientHello reports a hello with no extensions at all', () => {
  const body = helloBody([]).subarray(0, -2);
  assert.deepEqual(parseClientHello(record(handshake(body))), { kind: 'no-hostname' });
});

test('parseClientHello asks for more bytes at every split of a hello across TCP segments', () => {
  const hello = clientHello([serverName('split.example')]);
  for (let length = 0; length < hello.length; length += 1) {
    assert.deepEqual(parseClientHello(hello.subarray(0, length)), { kind: 'incomplete' }, `at ${length} bytes`);
  }
  assert.deepEqual(parseClientHello(hello), { kind: 'hostname', hostname: 'split.example' });
});

test('parseClientHello reassembles a hello fragmented across TLS records', () => {
  const message = handshake(helloBody([serverName('fragmented.example')]));
  const hello = Buffer.concat([record(message.subarray(0, 3)), record(message.subarray(3, 40)),
    record(message.subarray(40))]);
  assert.deepEqual(parseClientHello(hello), { kind: 'hostname', hostname: 'fragmented.example' });
  assert.deepEqual(parseClientHello(hello.subarray(0, hello.length - 1)), { kind: 'incomplete' });
});

test('parseClientHello judges a hello offering ECH by its outer hostname', () => {
  const hello = clientHello([serverName('public.example'), extension(0xfe0d, Buffer.alloc(40, 7))]);
  assert.deepEqual(parseClientHello(hello), { kind: 'hostname', hostname: 'public.example' });
});

test('parseClientHello reads the hostname from Chromium, which offers ECH as GREASE', () => {
  assert.deepEqual(parseClientHello(chromiumHello), { kind: 'hostname', hostname: 'fonts.googleapis.com' });
});

test('parseClientHello ignores bytes that follow the hello', () => {
  const hello = Buffer.concat([clientHello([serverName('a.example')]), record(Buffer.from([1]), 20)]);
  assert.deepEqual(parseClientHello(hello), { kind: 'hostname', hostname: 'a.example' });
});

test('parseClientHello rejects a first record that is not a handshake', () => {
  assert.equal(parseClientHello(Buffer.from('GET / HTTP/1.1\r\n\r\n')).kind, 'invalid');
  assert.equal(parseClientHello(record(handshake(helloBody([])), 23)).kind, 'invalid');
});

test('parseClientHello rejects a handshake message that is not a ClientHello', () => {
  assert.equal(parseClientHello(record(handshake(helloBody([serverName('a.example')]), 2))).kind, 'invalid');
});

test('parseClientHello rejects a non-handshake record in the middle of a fragmented hello', () => {
  const message = handshake(helloBody([serverName('a.example')]));
  const hello = Buffer.concat([record(message.subarray(0, 10)), record(message.subarray(10), 23)]);
  assert.equal(parseClientHello(hello).kind, 'invalid');
});

test('parseClientHello rejects an empty record', () => {
  assert.equal(parseClientHello(record(Buffer.alloc(0))).kind, 'invalid');
});

test('parseClientHello rejects a record longer than TLS allows', () => {
  const header = Buffer.concat([Buffer.from([22]), uint16(0x0301), uint16(0x4001)]);
  assert.equal(parseClientHello(header).kind, 'invalid');
});

test('parseClientHello rejects a ClientHello larger than it will buffer', () => {
  const header = Buffer.from([1, 0x01, 0x00, 0x00]);
  assert.equal(parseClientHello(record(header)).kind, 'invalid');
});

test('parseClientHello rejects a length that overruns its container', () => {
  const body = helloBody([serverName('a.example')]);
  const overrun = Buffer.from(body);
  overrun.writeUInt16BE(0xffff, 2 + 32 + 1 + 4 + 2);
  assert.equal(parseClientHello(record(handshake(overrun))).kind, 'invalid');
});

test('parseClientHello rejects a message whose body does not fill its declared length', () => {
  const body = helloBody([serverName('a.example')]);
  assert.equal(parseClientHello(record(handshake(body.subarray(0, 20)))).kind, 'invalid');
});

test('parseClientHello rejects trailing bytes inside the ClientHello', () => {
  const body = Buffer.concat([helloBody([serverName('a.example')]), Buffer.from([0])]);
  assert.equal(parseClientHello(record(handshake(body))).kind, 'invalid');
});

test('parseClientHello rejects a server_name extension whose list overruns it', () => {
  const broken = extension(0x0000, Buffer.concat([uint16(50), Buffer.from([0, 0, 1, 0x61])]));
  assert.equal(parseClientHello(clientHello([broken])).kind, 'invalid');
});

test('parseClientHello rejects a hostname that is not a valid DNS name', () => {
  for (const hostname of ['', 'bad host.example', 'a..example', '-a.example', 'a.example.', 'a/b.example']) {
    assert.equal(parseClientHello(clientHello([serverName(hostname)])).kind, 'invalid', hostname);
  }
});

test('parseClientHello rejects two server_name extensions', () => {
  const hello = clientHello([serverName('allowed.example'), serverName('other.example')]);
  assert.equal(parseClientHello(hello).kind, 'invalid');
});

test('parseClientHello rejects a server_name list with more than one host_name', () => {
  const first = Buffer.from('allowed.example');
  const second = Buffer.from('other.example');
  const list = Buffer.concat([Buffer.from([0]), uint16(first.length), first, Buffer.from([0]), uint16(second.length),
    second]);
  const hello = clientHello([extension(0x0000, Buffer.concat([uint16(list.length), list]))]);
  assert.equal(parseClientHello(hello).kind, 'invalid');
});
