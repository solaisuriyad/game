// MobileControls — touch joysticks + action buttons for phones/tablets.
// Works for both 2D and 3D (?3d=1) modes. No external deps.

export class MobileControls {
  constructor(game) {
    this.game = game;
    this.enabled = this._detectMobile();
    this.left = { active: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0, nx: 0, ny: 0, force: 0 };
    this.right = { active: false, id: null, cx: 0, cy: 0, dx: 0, dy: 0, nx: 0, ny: 0 };
    this._els = null;
    this._attackHeld = false;
    if (this.enabled) this._createDOM();
  }

  _detectMobile() {
    try {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get('mobile') === '1' || qs.get('m') === '1') return true;
    } catch (e) {}
    try {
      if (typeof navigator !== 'undefined') {
        if (/Mobi|Android|iPhone|iPad|iPod|Touch/i.test(navigator.userAgent)) return true;
        if (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) return true;
      }
      if (typeof window !== 'undefined' && 'ontouchstart' in window) {
        // show on touch devices, but also allow desktop testing with ?mobile=1
        // we still return true if touch exists and screen is small
        if (window.innerWidth <= 1024) return true;
      }
    } catch (e) {}
    return false;
  }

  _createDOM() {
    if (typeof document === 'undefined') return;
    // inject CSS
    const style = document.createElement('style');
    style.id = 'mobile-controls-style';
    style.textContent = `
      #mobile-controls { position:fixed; inset:0; z-index:35; pointer-events:none; display:block; }
      .joy-base { position:absolute; width:130px; height:130px; border-radius:50%; background:rgba(20,20,30,0.28); border:2px solid rgba(255,255,255,0.18); pointer-events:auto; touch-action:none; }
      .joy-stick { position:absolute; left:50%; top:50%; width:58px; height:58px; margin-left:-29px; margin-top:-29px; border-radius:50%; background:rgba(255,255,255,0.32); border:2px solid rgba(255,255,255,0.4); box-shadow:0 2px 10px rgba(0,0,0,0.4); }
      #joy-left { left:18px; bottom:18px; }
      #joy-right { right:18px; bottom:18px; }
      .mob-btn { position:absolute; pointer-events:auto; touch-action:none; border-radius:50%; border:2px solid rgba(255,255,255,0.25); background:rgba(30,30,40,0.55); color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center; user-select:none; -webkit-user-select:none; }
      .mob-btn:active { background:rgba(80,80,100,0.75); }
      #btn-attack { right:150px; bottom:160px; width:86px; height:86px; font-size:28px; background:rgba(180,50,50,0.55); border-color:rgba(255,120,120,0.6); }
      #btn-interact { right:22px; bottom:160px; width:62px; height:62px; font-size:20px; background:rgba(50,150,80,0.5); }
      #btn-fly { right:22px; bottom:232px; width:56px; height:56px; font-size:18px; }
      #btn-sprint { left:160px; bottom:160px; width:56px; height:56px; font-size:14px; }
      #btn-jump { left:160px; bottom:90px; width:56px; height:56px; font-size:18px; }
      .mob-top { position:absolute; top:10px; display:flex; gap:8px; pointer-events:auto; }
      #mob-top-left { left:10px; }
      #mob-top-right { right:10px; }
      .mob-top .mob-mini { width:44px; height:36px; border-radius:8px; background:rgba(30,25,20,0.7); border:1px solid #6a4a2a; color:#f0e6d0; font-size:16px; }
      @media (max-width: 600px) {
        .joy-base { width:110px; height:110px; }
        .joy-stick { width:50px; height:50px; margin-left:-25px; margin-top:-25px; }
        #btn-attack { width:76px; height:76px; right:130px; bottom:140px; }
      }
    `;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'mobile-controls';
    root.innerHTML = `
      <div id="joy-left" class="joy-base"><div class="joy-stick"></div></div>
      <div id="joy-right" class="joy-base"><div class="joy-stick"></div></div>
      <div id="btn-attack" class="mob-btn">⚔️</div>
      <div id="btn-interact" class="mob-btn">E</div>
      <div id="btn-fly" class="mob-btn">✈️</div>
      <div id="btn-sprint" class="mob-btn">🏃</div>
      <div id="btn-jump" class="mob-btn">↗</div>
      <div id="mob-top-left" class="mob-top">
        <button class="mob-mini" id="mob-inv">🎒</button>
        <button class="mob-mini" id="mob-map">🗺️</button>
      </div>
      <div id="mob-top-right" class="mob-top">
        <button class="mob-mini" id="mob-char">👤</button>
        <button class="mob-mini" id="mob-menu">☰</button>
      </div>
    `;
    document.body.appendChild(root);

    this._els = {
      root,
      leftBase: root.querySelector('#joy-left'),
      leftStick: root.querySelector('#joy-left .joy-stick'),
      rightBase: root.querySelector('#joy-right'),
      rightStick: root.querySelector('#joy-right .joy-stick'),
      attack: root.querySelector('#btn-attack'),
      interact: root.querySelector('#btn-interact'),
      fly: root.querySelector('#btn-fly'),
      sprint: root.querySelector('#btn-sprint'),
      jump: root.querySelector('#btn-jump'),
      inv: root.querySelector('#mob-inv'),
      map: root.querySelector('#mob-map'),
      char: root.querySelector('#mob-char'),
      menu: root.querySelector('#mob-menu'),
    };

    this._attachJoystick(this._els.leftBase, this._els.leftStick, this.left);
    this._attachJoystick(this._els.rightBase, this._els.rightStick, this.right);
    this._attachButtons();
  }

  _attachJoystick(base, stick, state) {
    const getCenter = () => {
      const r = base.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, rad: r.width / 2 };
    };

    const onDown = (e) => {
      if (state.active) return;
      e.preventDefault();
      const id = e.pointerId ?? 0;
      state.active = true;
      state.id = id;
      const c = getCenter();
      state.cx = c.x; state.cy = c.y;
      try { base.setPointerCapture(id); } catch (err) {}
      this._updateStick(e, state, stick, c);
    };
    const onMove = (e) => {
      if (!state.active) return;
      if (state.id != null && e.pointerId !== state.id) return;
      e.preventDefault();
      const c = { x: state.cx, y: state.cy, rad: getCenter().rad };
      this._updateStick(e, state, stick, c);
    };
    const onUp = (e) => {
      if (!state.active) return;
      if (state.id != null && e.pointerId !== state.id) return;
      e.preventDefault();
      state.active = false;
      state.id = null;
      state.dx = 0; state.dy = 0; state.nx = 0; state.ny = 0; state.force = 0;
      stick.style.transform = `translate(0px, 0px)`;
      try { base.releasePointerCapture(e.pointerId); } catch (err) {}
    };

    base.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  _updateStick(e, state, stickEl, center) {
    const x = e.clientX, y = e.clientY;
    let dx = x - center.x;
    let dy = y - center.y;
    const dist = Math.hypot(dx, dy);
    const max = center.rad - 12; // keep stick inside base
    let nx = 0, ny = 0, force = 0;
    if (dist > 0.001) {
      if (dist > max) {
        const s = max / dist;
        dx *= s; dy *= s;
      }
      nx = dx / max;
      ny = dy / max;
      force = Math.min(1, dist / max);
    }
    state.dx = dx; state.dy = dy;
    state.nx = nx; state.ny = ny; state.force = force;
    stickEl.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  _attachButtons() {
    const g = this.game;
    const el = this._els;

    // Attack — hold = keep mouse button down (charges heavy attack)
    const atkDown = (e) => {
      e.preventDefault();
      this._attackHeld = true;
      try { g.input.mouse.buttons |= 1; } catch (err) {}
      if (el.attack) el.attack.style.background = 'rgba(220,70,70,0.85)';
    };
    const atkUp = (e) => {
      e.preventDefault();
      this._attackHeld = false;
      try { g.input.mouse.buttons &= ~1; } catch (err) {}
      if (el.attack) el.attack.style.background = '';
    };
    el.attack.addEventListener('pointerdown', atkDown);
    window.addEventListener('pointerup', (e) => { if (this._attackHeld) atkUp(e); });
    el.attack.addEventListener('pointercancel', atkUp);

    // Interact (E)
    el.interact.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { g.interact.interact(); } catch (err) {}
    });

    // Fly (X)
    el.fly.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      // simulate X press
      try {
        g.input._injectPressed('x');
      } catch (err) {
        // fallback direct call
        if (g.player && g.player.flyCd <= 0) {
          // trigger same logic as in Player.update X handling by setting a flag
          g._mobileFlyRequested = true;
        }
      }
    });

    // Sprint (R hold)
    const sprintDown = (e) => { e.preventDefault(); g._mobileSprint = true; };
    const sprintUp = (e) => { e.preventDefault(); g._mobileSprint = false; };
    el.sprint.addEventListener('pointerdown', sprintDown);
    el.sprint.addEventListener('pointerup', sprintUp);
    el.sprint.addEventListener('pointercancel', sprintUp);

    // Jump / dodge (Space)
    el.jump.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { g.input._injectPressed(' '); } catch (err) {}
    });

    // Top mini buttons
    el.inv.addEventListener('pointerdown', (e) => { e.preventDefault(); g.ui.openMenu('inventory'); });
    el.map.addEventListener('pointerdown', (e) => { e.preventDefault(); g.ui.openMenu('map'); });
    el.char.addEventListener('pointerdown', (e) => { e.preventDefault(); g.ui.openMenu('character'); });
    el.menu.addEventListener('pointerdown', (e) => { e.preventDefault(); g.ui._renderMainMenu(); });
  }

  // called each frame from Game.update
  update(dt) {
    if (!this.enabled) return;
    const g = this.game;
    const r3 = g.renderer3d;

    // hide joysticks when a menu/popup is open (so they don't block UI)
    if (this._els && this._els.root) {
      const blocked = !!(g.ui.open || (g.buildingInterior && g.buildingInterior.active) || g.state !== 'playing');
      this._els.root.style.display = blocked ? 'none' : 'block';
      if (blocked) {
        // reset virtual input when blocked
        try { g.input._virtual.x = 0; g.input._virtual.y = 0; g.input._virtualSprint = false; } catch (e) {}
        return;
      }
    }

    // 2D mode: feed virtual dir directly
    if (!g.mode3d) {
      if (this.left.active) {
        // left stick gives WASD — note y is up negative, but Input dirVector expects w=-1, s=+1
        g.input._virtual.x = this.left.nx;
        g.input._virtual.y = this.left.ny;
      } else {
        g.input._virtual.x = 0;
        g.input._virtual.y = 0;
      }
      return;
    }

    // 3D mode
    if (r3) {
      const TURN = 2.8;
      // left joystick: X = turn (A/D), Y = forward/back (W/S)
      if (this.left.active) {
        const tx = this.left.nx; // -1 left, +1 right
        const ty = this.left.ny; // -1 up, +1 down
        // turn: same sign as A/D logic (A=right=-, D=left=+), we derived +tx
        r3._targetYaw += tx * TURN * dt * 1.2;
        // forward/back -> virtual move Y
        g.input._virtual.y = ty;
        g.input._virtual.x = 0; // no strafe in 3D, but keep for completeness
      } else {
        g.input._virtual.y = 0;
        g.input._virtual.x = 0;
      }

      // right joystick: look yaw + pitch
      if (this.right.active) {
        const rx = this.right.nx;
        const ry = this.right.ny;
        // inverted sideways: right = turn left (as per v9.0)
        const sens = r3.lookSens || 1;
        r3._targetYaw += rx * 0.05 * sens; // tuned for touch
        r3._targetPitch = Math.max(-0.75, Math.min(0.95, r3._targetPitch - ry * 0.04 * sens));
      }

      // mobile sprint flag
      if (g._mobileSprint) {
        g.input._virtualSprint = true;
      } else {
        g.input._virtualSprint = false;
      }
    }
  }

  // helper for HUD: are we on mobile?
  isActive() { return this.enabled; }
}
