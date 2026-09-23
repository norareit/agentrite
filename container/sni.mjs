// Reads the hostname a TLS client asks for from the ClientHello it opens with. The
// hostname travels in the clear in the server_name extension, so it can be read without
// terminating TLS or holding any certificate. Pure: bytes in, a verdict out.
//
// The verdict is one of:
//   { kind: 'hostname', hostname }  the SNI hostname, lowercased
//   { kind: 'no-hostname' }         a well-formed ClientHello that names no host
//   { kind: 'incomplete' }          a valid prefix; call again with more bytes
//   { kind: 'invalid', reason }     not a ClientHello this parser will vouch for
//
// Encrypted ClientHello needs no case of its own. The server_name read here is the outer
// one: the real hostname for a client that only GREASEs the extension, as Chromium does,
// and the provider's public name for a genuine ECH connection.

const HANDSHAKE_RECORD = 22;
const CLIENT_HELLO = 1;
const SERVER_NAME_EXTENSION = 0x0000;
const HOST_NAME = 0;
const RECORD_HEADER_LENGTH = 5;
const MAX_RECORD_LENGTH = 16384;
// A ClientHello is a few kilobytes even with post-quantum key shares. Anything larger
// is refused rather than buffered on the sender's say-so.
const MAX_HELLO_LENGTH = 16384;
const DNS_LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

class Invalid extends Error {}

export function parseClientHello(bytes) {
  try {
    const message = reassembleHandshake(bytes);
    if (message === undefined) return { kind: 'incomplete' };
    return readClientHello(message);
  } catch (error) {
    if (error instanceof Invalid) return { kind: 'invalid', reason: error.message };
    throw error;
  }
}

// Concatenates the fragments of the first handshake message, which a client may split
// across several records. Returns undefined until the whole message has arrived.
function reassembleHandshake(bytes) {
  const fragments = [];
  let collected = 0;
  let offset = 0;
  while (true) {
    if (collected >= 4) {
      const messageLength = 4 + readUint24(Buffer.concat(fragments), 1);
      if (messageLength - 4 > MAX_HELLO_LENGTH) throw new Invalid('ClientHello is larger than allowed');
      if (collected >= messageLength) return Buffer.concat(fragments).subarray(0, messageLength);
    }
    if (bytes.length < offset + RECORD_HEADER_LENGTH) return undefined;
    if (bytes[offset] !== HANDSHAKE_RECORD) throw new Invalid('record is not a handshake');
    const length = bytes.readUInt16BE(offset + 3);
    if (length === 0) throw new Invalid('empty handshake record');
    if (length > MAX_RECORD_LENGTH) throw new Invalid('record is longer than TLS allows');
    const start = offset + RECORD_HEADER_LENGTH;
    const fragment = bytes.subarray(start, Math.min(start + length, bytes.length));
    fragments.push(fragment);
    collected += fragment.length;
    if (fragment.length < length) {
      // A partial record is enough to check the message header, so that an oversized
      // hello is refused as soon as its length arrives.
      if (collected >= 4 && readUint24(Buffer.concat(fragments), 1) > MAX_HELLO_LENGTH) {
        throw new Invalid('ClientHello is larger than allowed');
      }
      return undefined;
    }
    offset = start + length;
  }
}

function readClientHello(message) {
  if (message[0] !== CLIENT_HELLO) throw new Invalid('handshake message is not a ClientHello');
  const hello = new Reader(message.subarray(4));
  hello.skip(2 + 32);
  hello.skip(hello.uint8());
  hello.skip(hello.uint16());
  hello.skip(hello.uint8());
  if (hello.done()) return { kind: 'no-hostname' };

  const extensions = new Reader(hello.bytes(hello.uint16()));
  if (!hello.done()) throw new Invalid('bytes follow the extensions');
  let hostname;
  while (!extensions.done()) {
    const type = extensions.uint16();
    const body = extensions.bytes(extensions.uint16());
    if (type !== SERVER_NAME_EXTENSION) continue;
    if (hostname !== undefined) throw new Invalid('more than one server_name extension');
    hostname = readServerName(body);
  }
  return hostname === undefined ? { kind: 'no-hostname' } : { kind: 'hostname', hostname };
}

// RFC 6066 permits one name of each type, and host_name is the only type defined, so a
// second host_name is refused rather than one of the two chosen.
function readServerName(body) {
  const extension = new Reader(body);
  const list = new Reader(extension.bytes(extension.uint16()));
  if (!extension.done()) throw new Invalid('bytes follow the server_name list');
  let hostname;
  while (!list.done()) {
    const type = list.uint8();
    const name = list.bytes(list.uint16());
    if (type !== HOST_NAME) continue;
    if (hostname !== undefined) throw new Invalid('more than one host_name');
    hostname = validHostname(name.toString('latin1').toLowerCase());
  }
  if (hostname === undefined) throw new Invalid('server_name extension names no host');
  return hostname;
}

function validHostname(hostname) {
  if (hostname.length > 253 || !hostname.split('.').every((label) => DNS_LABEL.test(label))) {
    throw new Invalid('server_name is not a valid hostname');
  }
  return hostname;
}

function readUint24(bytes, offset) {
  return (bytes[offset] << 16) | (bytes[offset + 1] << 8) | bytes[offset + 2];
}

// Bounds-checked reads over a buffer. Every length a ClientHello declares is checked
// against the bytes it actually has, and an overrun is invalid rather than incomplete,
// because by the time the reader runs the whole message has arrived.
class Reader {
  constructor(bytes) {
    this.buffer = bytes;
    this.offset = 0;
  }

  bytes(length) {
    if (this.offset + length > this.buffer.length) throw new Invalid('a length overruns its container');
    const slice = this.buffer.subarray(this.offset, this.offset + length);
    this.offset += length;
    return slice;
  }

  skip(length) {
    this.bytes(length);
  }

  uint8() {
    return this.bytes(1)[0];
  }

  uint16() {
    return this.bytes(2).readUInt16BE(0);
  }

  done() {
    return this.offset === this.buffer.length;
  }
}
