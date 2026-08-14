// Accounts — name + password login with server-side persistence.
//
// Zero-dependency: uses Node's built-in crypto (scrypt) for password hashing and
// fs for storage. The store is pluggable: by default it writes a JSON file, but
// free hosts with ephemeral disks can swap `store`/`load` for a remote DB.
//
//   VERDANT_SAVE_FILE — override the save file path (default: data/accounts.json)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SAVE_FILE = process.env.VERDANT_SAVE_FILE || path.join(process.cwd(), 'data', 'accounts.json');

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

export class AccountStore {
  constructor(file = SAVE_FILE) {
    this.file = file;
    this.accounts = new Map(); // nameLower -> { name, salt, hash, data, updatedAt }
    this._dirty = false;
    this._writeTimer = null;
    this._load();
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      const list = JSON.parse(raw);
      for (const a of (Array.isArray(list) ? list : [])) {
        if (a && a.name) this.accounts.set(a.name.toLowerCase(), a);
      }
    } catch (e) {
      this.accounts = new Map(); // no file yet (or corrupt) — start fresh
    }
  }

  _persistSoon() {
    this._dirty = true;
    if (this._writeTimer) return;
    this._writeTimer = setTimeout(() => { this._writeTimer = null; this._flush(); }, 400);
  }

  _flush() {
    if (!this._dirty) return;
    this._dirty = false;
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const list = [...this.accounts.values()].map((a) => ({ name: a.name, salt: a.salt, hash: a.hash, data: a.data, updatedAt: a.updatedAt }));
      fs.writeFileSync(this.file + '.tmp', JSON.stringify(list));
      fs.renameSync(this.file + '.tmp', this.file);
    } catch (e) {
      console.error('[accounts] failed to write saves:', e.message);
    }
  }

  _newSalt() { return crypto.randomBytes(16).toString('hex'); }

  // register a new account (error if the name is taken)
  register(name, password) {
    const key = name.toLowerCase();
    if (this.accounts.has(key)) return { ok: false, error: 'That name is already taken.' };
    const salt = this._newSalt();
    const acc = { name, salt, hash: hashPassword(password, salt), data: null, updatedAt: Date.now() };
    this.accounts.set(key, acc);
    this._persistSoon();
    return { ok: true, account: acc };
  }

  // log in; returns { ok, data } or { ok:false, error }
  login(name, password) {
    const key = name.toLowerCase();
    const acc = this.accounts.get(key);
    if (!acc) return { ok: false, error: 'No account with that name. First time? Enter a password to create it.' };
    const h = Buffer.from(hashPassword(password, acc.salt), 'hex');
    const stored = Buffer.from(acc.hash, 'hex');
    if (h.length !== stored.length || !crypto.timingSafeEqual(h, stored)) {
      return { ok: false, error: 'Wrong password.' };
    }
    return { ok: true, data: acc.data };
  }

  save(name, data) {
    const key = name.toLowerCase();
    const acc = this.accounts.get(key);
    if (!acc) return false;
    acc.data = data;
    acc.updatedAt = Date.now();
    this._persistSoon();
    return true;
  }

  get(name) {
    const acc = this.accounts.get(name.toLowerCase());
    return acc ? acc.data : null;
  }

  flush() { this._flush(); }
}
