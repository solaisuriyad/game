// ChatUI — a lightweight in-game text chat (server-relayed). Enter opens the
// chat box, type a message, Enter sends, Esc (or Enter on empty) closes.
// Works alongside movement — the game keeps running while you chat.
export class ChatUI {
  constructor(game) {
    this.game = game;
    this.open_ = false;
    this._build();
  }

  _build() {
    // headless/test environments may lack document.body — degrade gracefully
    if (typeof document === 'undefined' || !document.body) return;

    const wrap = document.createElement('div');
    wrap.id = 'chat-ui';
    wrap.style.cssText = 'position:fixed;left:12px;bottom:44px;width:340px;max-height:46vh;z-index:40;display:none;flex-direction:column;pointer-events:auto;';

    const online = document.createElement('div');
    online.id = 'chat-online';
    online.style.cssText = 'background:rgba(10,8,6,0.7);color:#7ae07a;font:10px sans-serif;padding:3px 8px;border-radius:4px 4px 0 0;';

    const log = document.createElement('div');
    log.id = 'chat-log';
    log.style.cssText = 'background:rgba(10,8,6,0.72);color:#e8e0c8;font:12px/1.45 sans-serif;padding:6px 8px;overflow-y:auto;flex:1;min-height:90px;';

    const input = document.createElement('input');
    input.id = 'chat-input';
    input.type = 'text';
    input.maxLength = 200;
    input.placeholder = 'Say something… (Enter to send, Esc to close)';
    input.style.cssText = 'background:rgba(10,8,6,0.85);color:#f0e6d0;border:1px solid #6a4a2a;border-top:none;border-radius:0 0 4px 4px;padding:6px 8px;font:13px sans-serif;outline:none;';

    wrap.appendChild(online);
    wrap.appendChild(log);
    wrap.appendChild(input);
    document.body.appendChild(wrap);

    this.wrap = wrap;
    this.online = online;
    this.log = log;
    this.input = input;

    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const text = input.value.trim();
        if (text) {
          this.game.multiplayer.sendChat(text);
          this.addLine(this.game.player ? this.game.player.name : 'You', text, false);
        }
        input.value = '';
        this.close();
      } else if (e.key === 'Escape') {
        this.close();
      }
    });
  }

  get isOpen() { return this.open_; }

  open() {
    if (!this.game.multiplayer.connected) { this.game.toast('You are offline — join a shared world to chat.'); return; }
    this.open_ = true;
    if (!this.wrap) return;
    this.wrap.style.display = 'flex';
    this.input.focus();
    this._renderOnline();
  }

  close() {
    this.open_ = false;
    if (!this.wrap) return;
    this.wrap.style.display = 'none';
    this.input.value = '';
    this.input.blur();
  }

  onMessage(msg) { this.addLine(msg.name, msg.text, msg.system); }

  onOnline(list) {
    this._list = list;
    this._renderOnline();
  }

  _renderOnline() {
    if (!this.online) return;
    const n = this._list ? this._list.length : this.game.remotePlayers.length + 1;
    this.online.textContent = `Online · ${n} hunter${n === 1 ? '' : 's'}`;
  }

  addLine(name, text, system) {
    if (!this.log) return;
    const div = document.createElement('div');
    if (system) {
      div.style.color = '#b8a888';
      div.textContent = text;
    } else {
      const nm = document.createElement('span');
      nm.style.color = '#ffd76a';
      nm.style.fontWeight = 'bold';
      nm.textContent = name + ': ';
      div.appendChild(nm);
      div.appendChild(document.createTextNode(text));
    }
    this.log.appendChild(div);
    // keep the view scrolled to the latest message
    this.log.scrollTop = this.log.scrollHeight;
    while (this.log.children.length > 100) this.log.removeChild(this.log.firstChild);
  }
}
