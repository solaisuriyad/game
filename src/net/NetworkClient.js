// Thin WebSocket wrapper. Resolves on open, exposes JSON message callbacks.
export class NetworkClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.onMessage = null;
    this.onClose = null;
    this.onError = null;
  }
  connect(url, timeoutMs = 6000) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = (e) => { if (!settled) { settled = true; reject(e); } };
      let ws;
      try { ws = new WebSocket(url); } catch (e) { return fail(e); }
      this.ws = ws;
      const timer = setTimeout(() => { if (!this.connected) { try { ws.close(); } catch (e) {} fail(new Error('Connection timed out')); } }, timeoutMs);
      ws.onopen = () => { this.connected = true; clearTimeout(timer); if (!settled) { settled = true; resolve(); } };
      ws.onmessage = (ev) => { if (this.onMessage) this.onMessage(JSON.parse(ev.data)); };
      ws.onclose = () => { this.connected = false; if (this.onClose) this.onClose(); };
      ws.onerror = (e) => { fail(new Error('WebSocket error')); if (this.onError) this.onError(e); };
    });
  }
  send(obj) { if (this.connected && this.ws) this.ws.send(JSON.stringify(obj)); }
  close() { try { this.ws && this.ws.close(); } catch (e) {} this.connected = false; }
}
