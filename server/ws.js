// Minimal RFC 6455 WebSocket server — zero dependencies.
// Handles the HTTP upgrade handshake and text/binary frame send + receive,
// including client masking, ping/pong, and close. Fragmented frames are
// reassembled; messages are delivered as UTF-8 strings.
import { createHash } from 'node:crypto';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export class WebSocket {
  constructor(socket) {
    this.socket = socket;
    this.readyState = 1; // OPEN
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    this._buf = Buffer.alloc(0);
    this._frag = null; // pending fragmented message
    socket.on('data', (d) => this._onData(d));
    socket.on('close', () => { this.readyState = 3; this.onclose && this.onclose(); });
    socket.on('error', (e) => { this.onerror && this.onerror(e); });
  }

  _onData(data) {
    this._buf = Buffer.concat([this._buf, data]);
    let frame;
    while ((frame = this._parseFrame())) {
      const { fin, opcode, payload } = frame;
      if (opcode === 0x8) { // close
        this._sendFrame(0x8, Buffer.alloc(0));
        this.readyState = 3;
        try { this.socket.end(); } catch (e) {}
        this.onclose && this.onclose();
        return;
      }
      if (opcode === 0x9) { this._sendFrame(0xA, payload); continue; } // ping -> pong
      if (opcode === 0xA) continue; // pong
      if (opcode === 0x1 || opcode === 0x2) {
        if (fin) {
          this._deliver(payload);
        } else {
          this._frag = Buffer.from(payload);
        }
      } else if (opcode === 0x0 && this._frag) { // continuation
        this._frag = Buffer.concat([this._frag, payload]);
        if (fin) { this._deliver(this._frag); this._frag = null; }
      }
    }
  }
  _deliver(payload) {
    if (this.onmessage) this.onmessage({ data: payload.toString('utf8') });
  }
  _parseFrame() {
    const buf = this._buf;
    if (buf.length < 2) return null;
    const fin = (buf[0] & 0x80) !== 0;
    const opcode = buf[0] & 0x0f;
    const masked = (buf[1] & 0x80) !== 0;
    let len = buf[1] & 0x7f;
    let off = 2;
    if (len === 126) { if (buf.length < 4) return null; len = buf.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (buf.length < 10) return null; len = Number(buf.readBigUInt64BE(2)); off = 10; }
    let mask = null;
    if (masked) { if (buf.length < off + 4) return null; mask = buf.subarray(off, off + 4); off += 4; }
    if (buf.length < off + len) return null;
    let payload = buf.subarray(off, off + len);
    if (masked) {
      const out = Buffer.alloc(len);
      for (let i = 0; i < len; i++) out[i] = payload[i] ^ mask[i & 3];
      payload = out;
    }
    this._buf = buf.subarray(off + len);
    return { fin, opcode, payload };
  }
  send(str) { this._sendFrame(0x1, Buffer.from(String(str), 'utf8')); }
  sendBinary(buf) { this._sendFrame(0x2, buf); }
  _sendFrame(opcode, payload) {
    const len = payload.length;
    let header;
    if (len < 126) { header = Buffer.alloc(2); header[1] = len; }
    else if (len < 65536) { header = Buffer.alloc(4); header[1] = 126; header.writeUInt16BE(len, 2); }
    else { header = Buffer.alloc(10); header[1] = 127; header.writeBigUInt64BE(BigInt(len), 2); }
    header[0] = 0x80 | opcode; // FIN + opcode, server frames are unmasked
    if (this.socket.writable) this.socket.write(Buffer.concat([header, payload]));
  }
  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    try { this._sendFrame(0x8, Buffer.alloc(0)); } catch (e) {}
    try { this.socket.end(); } catch (e) {}
  }
}

// Perform the HTTP upgrade handshake; returns a WebSocket on success, null on failure.
export function handleUpgrade(req, socket) {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return null; }
  const accept = createHash('sha1').update(key + GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
  );
  return new WebSocket(socket);
}
