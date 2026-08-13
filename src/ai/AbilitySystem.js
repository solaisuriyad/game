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
}
