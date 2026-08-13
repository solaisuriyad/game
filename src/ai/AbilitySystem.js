// Executes monster abilities. Adding a new ability = add a handler here and
// reference it in data/abilities.js + data/monsters.js.
export class AbilitySystem {
  execute(monster, abilityId, params, game) {
    const handler = this['do_' + abilityId];
    if (handler) handler.call(this, monster, params, game);
  }

  _melee(monster, params, game, status) {
    const p = game.player;
    if (monster.distTo(p) > (params.range || 50)) return;
    const dmg = monster.damage * (params.damage || 1);
    game.combat.damagePlayer(dmg, monster, status);
    if (params.knockback) game.combat.knockbackPlayer(monster, params.knockback);
  }

  do_melee_basic(monster, params, game) {
    const status = params.poison ? { type: 'poison', duration: 4, magnitude: params.poison } : null;
    this._melee(monster, params, game, status);
  }
  do_bleeding_bite(monster, params, game) {
    this._melee(monster, params, game, { type: 'bleed', duration: 5, magnitude: 1 });
  }
  do_lunge(monster, params, game) {
    const p = game.player;
    if (monster.distTo(p) > params.range) return;
    const a = monster.angleTo(p);
    monster.dash = { dx: Math.cos(a), dy: Math.sin(a), t: 0.22, damage: monster.damage * params.damage, status: null, speed: params.speed };
  }
  do_pounce(monster, params, game) {
    const p = game.player;
    if (monster.distTo(p) > params.range) return;
    const a = monster.angleTo(p);
    monster.dash = { dx: Math.cos(a), dy: Math.sin(a), t: 0.28, damage: monster.damage * params.damage, status: { type: 'slow', duration: 1.5, magnitude: 1 }, speed: params.speed };
  }
  do_throw_rock(monster, params, game) {
    const p = game.player;
    if (monster.distTo(p) > params.range) return;
    this._spawnProjectile(monster, p, params, game, { kind: 'rock', color: '#8a8a7a', status: null });
  }
  do_web_shot(monster, params, game) {
    const p = game.player;
    if (monster.distTo(p) > params.range) return;
    this._spawnProjectile(monster, p, params, game, { kind: 'web', color: '#e8e8e8', status: { type: 'slow', duration: 2.5, magnitude: 1.2 } });
  }
  _spawnProjectile(monster, target, params, game, opts) {
    const a = monster.angleTo(target);
    const spd = params.speed || 240;
    game.projectiles.push(new (game.PProjectile)(monster.x, monster.y, Math.cos(a) * spd, Math.sin(a) * spd, {
      damage: monster.damage * params.damage, fromPlayer: false, status: opts.status, kind: opts.kind, color: opts.color, owner: monster
    }));
  }
  do_howl(monster, params, game) {
    game.audio.sfx('roar');
    // aggro nearby same-family allies
    for (const m of game.monsters) {
      if (m.dead || m === monster) continue;
      if (m.family === monster.family && m.distTo(monster) < params.range) {
        m.target = game.player; m.aggroTimer = 10;
        m.state = 'chase';
      }
    }
  }
  do_root_slam(monster, params, game) {
    const p = game.player;
    const d = monster.distTo(p);
    if (d <= (params.radius || 90)) {
      game.combat.damagePlayer(monster.damage * params.damage, monster, null);
      game.combat.knockbackPlayer(monster, 200);
    }
    game.camera.addShake(6);
    game.audio.sfx('hit');
  }
  do_regenerate(monster, params, game) {
    monster.hp = Math.min(monster.maxHp, monster.hp + (params.heal || 30));
    game.addFloatText(monster.x, monster.y - 30, '+' + (params.heal || 30), '#6fe06f');
  }
  do_rage(monster, params, game) {
    monster.buffs.rage = 8;
    game.addFloatText(monster.x, monster.y - 34, 'ENRAGED!', '#ff5050');
    game.audio.sfx('roar');
  }
  do_ground_slam(monster, params, game) {
    const p = game.player;
    if (monster.distTo(p) <= (params.radius || 100)) {
      game.combat.damagePlayer(monster.damage * params.damage, monster, null);
      game.combat.knockbackPlayer(monster, 220);
    }
    game.camera.addShake(8);
    game.audio.sfx('hit');
  }
  do_tail_swipe(monster, params, game) {
    const p = game.player;
    if (monster.distTo(p) <= (params.radius || 90)) {
      game.combat.damagePlayer(monster.damage * params.damage, monster, null);
      game.combat.knockbackPlayer(monster, 180);
    }
    game.audio.sfx('swing');
  }
  do_charge(monster, params, game) {
    const p = game.player;
    if (monster.distTo(p) > params.range) return;
    const a = monster.angleTo(p);
    monster.dash = { dx: Math.cos(a), dy: Math.sin(a), t: 0.3, damage: monster.damage * params.damage, status: { type: 'stun', duration: 0.4, magnitude: 1 }, speed: params.speed };
    game.audio.sfx('roar');
  }
  do_roar(monster, params, game) {
    const p = game.player;
    game.audio.sfx('roar');
    game.camera.addShake(6);
    if (monster.distTo(p) <= (params.range || 160)) {
      game.combat.damagePlayer(monster.damage * (params.damage || 0.2), monster, null);
      p.addStatus('stun', 0.7, 1);
    }
  }
  do_fire_breath(monster, params, game) {
    const p = game.player;
    if (monster.distTo(p) > params.range) return;
    this._breath(monster, p, params, game, 'rock', '#ff7a30', { type: 'burn', duration: 3, magnitude: 1 });
    game.audio.sfx('roar');
  }
  do_ice_breath(monster, params, game) {
    const p = game.player;
    if (monster.distTo(p) > params.range) return;
    this._breath(monster, p, params, game, 'web', '#9ac8ff', { type: 'slow', duration: 3, magnitude: 1.2 });
  }
  _breath(monster, p, params, game, kind, color, status) {
    const base = monster.angleTo(p);
    const spd = params.speed || 280;
    for (let i = -1; i <= 1; i++) {
      const a = base + i * 0.18;
      game.projectiles.push(new game.PProjectile(monster.x, monster.y, Math.cos(a) * spd, Math.sin(a) * spd, {
        damage: monster.damage * params.damage * 0.6, fromPlayer: false, status, kind, color, owner: monster
      }));
    }
  }
  do_air_slash(monster, params, game) {
    const p = game.player;
    if (monster.distTo(p) > (params.range || 260)) return;
    this._spawnProjectile(monster, p, params, game, { kind: 'web', color: '#d8f0ff', status: null });
    game.audio.sfx('swing');
  }
  do_fire_ball(monster, params, game) {
    const p = game.player;
    if (monster.distTo(p) > (params.range || 280)) return;
    this._spawnProjectile(monster, p, params, game, { kind: 'rock', color: '#ff7a30', status: { type: 'burn', duration: 3, magnitude: 1 } });
  }
  do_water_slash(monster, params, game) {
    const p = game.player;
    if (monster.distTo(p) > (params.range || 260)) return;
    this._spawnProjectile(monster, p, params, game, { kind: 'web', color: '#4aa8ff', status: { type: 'slow', duration: 1.5, magnitude: 0.6 } });
  }
  do_thunder_attack(monster, params, game) {
    const p = game.player;
    game.camera.addShake(7);
    game.audio.sfx('hit');
    if (monster.distTo(p) <= (params.radius || 160)) {
      game.combat.damagePlayer(monster.damage * (params.damage || 1.3), monster, null);
      if (Math.random() < 0.4) p.addStatus('stun', 0.6, 1);
      game.addFloatText(p.x, p.y - 30, '⚡ Thunder!', '#c8a0ff');
    }
  }
  do_fly(monster, params, game) {
    const p = game.player;
    monster.flyingNow = true;
    if (monster.distTo(p) > params.range) return;
    const a = monster.angleTo(p);
    monster.dash = { dx: Math.cos(a), dy: Math.sin(a), t: 0.4, damage: monster.damage * (params.damage || 1.2), status: null, speed: params.speed || 380 };
  }
  do_summon(monster, params, game) {
    const def = game.sim.findMonsterDef(params.summonId);
    if (!def) return;
    game.audio.sfx('roar');
    const count = params.count || 2;
    let spawned = 0;
    for (let i = 0; i < count * 3 && spawned < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 44 + Math.random() * 44;
      const x = monster.x + Math.cos(a) * d, y = monster.y + Math.sin(a) * d;
      if (game.world.circleBlocked(x, y, 14)) continue;
      const m = new game.AMonster(game, def, x, y);
      m.target = game.player; m.aggroTimer = 10; m.home = { x, y };
      game.monsters.push(m);
      spawned++;
    }
    game.addFloatText(monster.x, monster.y - 40, 'Summons minions!', '#ff7a30');
  }
}
