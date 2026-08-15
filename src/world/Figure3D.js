// Figure3D — shared low-poly human figures for the 3D renderers.
//
// Builds a more human, gender-distinct figure out of primitives:
//   - male   → broad shoulders, trousers, short hair
//   - female → slimmer torso, flared dress + slender legs, long hair, subtle bust
//   - neutral→ medium build, trousers, mid-length hair
//   - children → smaller scale, round head, short hair
// Plus: a face (eyes, nose, brows, mouth), a neck, hands and feet, occupation
// clothing (guard helm, blacksmith apron, healer robe, farmer hat, …), and a
// walking animation (swinging arms/legs via hip/shoulder pivots).
//
// "Forward" is +X so the figure works with `rotation.y = -facing` (like the
// beast/dragon models). Colors come from skinTone/hairColor/clothColor.
import * as THREE from '../../vendor/three.module.js';

const _mats = new Map();
function mat(hex) {
  const h = hex || '#7a6a4a';
  if (!_mats.has(h)) {
    _mats.set(h, new THREE.MeshStandardMaterial({ color: parseInt(h.slice(1), 16), roughness: 0.9 }));
  }
  return _mats.get(h);
}
function darken(hex) {
  const n = parseInt((hex || '#7a6a4a').slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 255) - 40);
  const g = Math.max(0, ((n >> 8) & 255) - 40);
  const b = Math.max(0, (n & 255) - 40);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
const browMat = new THREE.MeshStandardMaterial({ color: 0x2a1c12 });
const skin2 = (hex) => { const n = parseInt((hex || '#e8c39a').slice(1), 16); const r = Math.min(255, ((n >> 16) & 255) + 14); const g = Math.min(255, ((n >> 8) & 255) + 14); const b = Math.min(255, (n & 255) + 14); return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); };

// occupation → outfit tweaks (visible job roles)
function outfitFor(occ) {
  switch (occ) {
    case 'guard': return { top: '#5a6a7a', helmet: true, breastplate: true };
    case 'blacksmith': case 'carpenter': case 'craftsman': return { apron: '#4a3626' };
    case 'cook': return { apron: '#e8e8e0', chef: true };
    case 'healer': case 'nurse': return { robe: '#f0f0ea' };
    case 'herbalist': return { robe: '#7a9a6a' };
    case 'priest': case 'elder': return { robe: '#8a8a92', hood: true };
    case 'teacher': case 'guildclerk': return { robe: '#6a6a8a' };
    case 'farmer': case 'fisherman': case 'woodcutter': case 'miner': case 'stablehand': return { hat: true };
    default: return {};
  }
}

export function makeFigure(opts = {}) {
  const g = new THREE.Group();
  const female = opts.gender === 'female';
  const child = opts.age != null && opts.age < 14;
  const s = (opts.scale || 1) * (child ? 0.72 : 1);
  const occ = outfitFor(opts.occupation);

  const skin = mat(opts.skinTone || '#e8c39a');
  const skinL = mat(skin2(opts.skinTone));
  const cloth = mat(occ.top || opts.clothColor || '#7a6a4a');
  const dark = mat(darken(occ.top || opts.clothColor));
  const hair = mat(opts.hairColor || '#4a3624');

  const add = (geo, m, x, y, z, rz = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x * s, y * s, z * s);
    mesh.rotation.z = rz;
    g.add(mesh);
    return mesh;
  };

  // ---- lower body ----
  let lLeg, rLeg;
  if (female && !child) {
    // flared dress / skirt
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(2.4 * s, 6.8 * s, 11 * s, 12), cloth);
    skirt.position.y = 9 * s;
    g.add(skirt);
    // slender legs below the skirt (with hip pivots for walking)
    lLeg = new THREE.Group(); lLeg.position.set(0, 5 * s, -1.8 * s);
    lLeg.add(makeLimb(new THREE.CylinderGeometry(1.1 * s, 1.1 * s, 4.5 * s, 6), skin, 4.5 * s));
    g.add(lLeg);
    rLeg = new THREE.Group(); rLeg.position.set(0, 5 * s, 1.8 * s);
    rLeg.add(makeLimb(new THREE.CylinderGeometry(1.1 * s, 1.1 * s, 4.5 * s, 6), skin, 4.5 * s));
    g.add(rLeg);
  } else {
    lLeg = new THREE.Group(); lLeg.position.set(0, 8 * s, -2 * s);
    lLeg.add(makeLimb(new THREE.CylinderGeometry(1.8 * s, 2.0 * s, 9 * s, 6), dark, 9 * s));
    g.add(lLeg);
    rLeg = new THREE.Group(); rLeg.position.set(0, 8 * s, 2 * s);
    rLeg.add(makeLimb(new THREE.CylinderGeometry(1.8 * s, 2.0 * s, 9 * s, 6), dark, 9 * s));
    g.add(rLeg);
  }
  // feet
  add(new THREE.BoxGeometry(2.6 * s, 1.6 * s, 4.4 * s), dark, 1.2, 0.8, 0);

  // ---- torso ----
  if (female && !child) {
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(3.5 * s, 7 * s, 4, 8), cloth);
    torso.position.y = 15 * s;
    g.add(torso);
    add(new THREE.SphereGeometry(1.7 * s, 6, 5), cloth, 1.2, 20, -1.6);
    add(new THREE.SphereGeometry(1.7 * s, 6, 5), cloth, 1.2, 20, 1.6);
  } else {
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(4.4 * s, 8 * s, 4, 8), cloth);
    torso.position.y = 15 * s;
    g.add(torso);
  }
  // robe (long garment over the legs for healers/priests/scholars)
  if (occ.robe) {
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(3.4 * s, 5.6 * s, 13 * s, 12), mat(occ.robe));
    robe.position.y = 11 * s;
    g.add(robe);
  }
  // apron (blacksmith / cook)
  if (occ.apron) {
    const apron = new THREE.Mesh(new THREE.BoxGeometry(1.4 * s, 8 * s, 5.6 * s), mat(occ.apron));
    apron.position.set(2.6 * s, 13 * s, 0);
    g.add(apron);
  }
  // breastplate (guard)
  if (occ.breastplate) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.8 * s, 7 * s, 6.4 * s), mat('#7a8a9a'));
    plate.position.set(2.2 * s, 15 * s, 0);
    g.add(plate);
  }

  // ---- arms (shoulder pivots, hanging down) ----
  const lArm = new THREE.Group(); lArm.position.set(0, 21 * s, -4.6 * s);
  const la = new THREE.Mesh(new THREE.CylinderGeometry(1.2 * s, 1.1 * s, 9 * s, 6), skin);
  la.position.y = -4.5 * s; la.rotation.z = 0.18;
  lArm.add(la);
  const lHand = new THREE.Mesh(new THREE.SphereGeometry(1.3 * s, 6, 5), skinL);
  lHand.position.y = -9 * s; lArm.add(lHand);
  g.add(lArm);

  const rArm = new THREE.Group(); rArm.position.set(0, 21 * s, 4.6 * s);
  const ra = new THREE.Mesh(new THREE.CylinderGeometry(1.2 * s, 1.1 * s, 9 * s, 6), skin);
  ra.position.y = -4.5 * s; ra.rotation.z = -0.18;
  rArm.add(ra);
  const rHand = new THREE.Mesh(new THREE.SphereGeometry(1.3 * s, 6, 5), skinL);
  rHand.position.y = -9 * s; rArm.add(rHand);
  g.add(rArm);

  // ---- neck + head ----
  add(new THREE.CylinderGeometry(1.6 * s, 1.8 * s, 3 * s, 6), skin, 0.4, 23.5, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(4.6 * s, 12, 10), skin);
  head.position.set(0.8 * s, 27 * s, 0);
  g.add(head);

  // ---- face (front = +X): eyes, nose, brows, mouth ----
  add(new THREE.SphereGeometry(0.55 * s, 4, 4), eyeMat, 4.4, 27.4, -1.7);
  add(new THREE.SphereGeometry(0.55 * s, 4, 4), eyeMat, 4.4, 27.4, 1.7);
  // brows
  add(new THREE.BoxGeometry(0.4 * s, 0.4 * s, 1.6 * s), browMat, 4.3, 28.5, -1.7);
  add(new THREE.BoxGeometry(0.4 * s, 0.4 * s, 1.6 * s), browMat, 4.3, 28.5, 1.7);
  // nose
  add(new THREE.ConeGeometry(0.7 * s, 1.6 * s, 5), skin, 5.1, 26.6, 0, -Math.PI / 2);
  // mouth
  add(new THREE.BoxGeometry(0.35 * s, 0.4 * s, 1.8 * s), browMat, 5.0, 24.9, 0);

  // ---- hair (gender-distinct) ----
  if (female && !child) {
    const top = new THREE.Mesh(new THREE.SphereGeometry(4.8 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    top.position.set(0.8 * s, 27.4 * s, 0);
    g.add(top);
    add(new THREE.CylinderGeometry(1.5 * s, 1.5 * s, 12 * s, 6), hair, -2.2, 20, -2);
    add(new THREE.CylinderGeometry(1.5 * s, 1.5 * s, 12 * s, 6), hair, -2.2, 20, 2);
  } else if (child) {
    const top = new THREE.Mesh(new THREE.SphereGeometry(4.8 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    top.position.set(0.8 * s, 27.4 * s, 0);
    g.add(top);
  } else if (opts.gender === 'male') {
    const top = new THREE.Mesh(new THREE.SphereGeometry(4.7 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
    top.position.set(0.8 * s, 27 * s, 0);
    g.add(top);
  } else {
    const top = new THREE.Mesh(new THREE.SphereGeometry(4.7 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    top.position.set(0.8 * s, 27.4 * s, 0);
    g.add(top);
    const back = new THREE.Mesh(new THREE.SphereGeometry(3.6 * s, 8, 7), hair);
    back.position.set(-1.6 * s, 23.5 * s, 0);
    g.add(back);
  }

  // ---- occupation headwear ----
  if (occ.helmet) {
    const helm = new THREE.Mesh(new THREE.SphereGeometry(4.9 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), mat('#7a8a9a'));
    helm.position.set(0.8 * s, 27.4 * s, 0);
    g.add(helm);
  } else if (occ.hood) {
    const hood = new THREE.Mesh(new THREE.SphereGeometry(5.1 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.7), mat('#6a6a72'));
    hood.position.set(0.8 * s, 27.2 * s, 0);
    g.add(hood);
  } else if (occ.chef) {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(3.4 * s, 3.4 * s, 2.6 * s, 12), mat('#ffffff'));
    hat.position.set(0.8 * s, 29.6 * s, 0);
    g.add(hat);
  } else if (occ.hat) {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(5.6 * s, 5.6 * s, 0.7 * s, 14), mat('#c8a86a'));
    brim.position.set(0.8 * s, 29.4 * s, 0);
    g.add(brim);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.6 * s, 3.4 * s, 12), mat('#d8b878'));
    cone.position.set(0.8 * s, 31.2 * s, 0);
    g.add(cone);
  }

  // ---- walk animation (swing arms + legs via pivots) ----
  g.userData.anim = { lArm, rArm, lLeg, rLeg };
  g.userData.walk = (t) => {
    const sw = Math.sin(t);
    lLeg.rotation.z = sw * 0.55;
    rLeg.rotation.z = -sw * 0.55;
    lArm.rotation.z = -sw * 0.45;
    rArm.rotation.z = sw * 0.45;
  };
  g.userData.idle = () => {
    lLeg.rotation.z = 0; rLeg.rotation.z = 0;
    lArm.rotation.z = 0; rArm.rotation.z = 0;
  };

  return g;
}

// a limb mesh hanging DOWN from its pivot (top at 0, extending -Y)
function makeLimb(geo, m, length) {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.y = -length / 2;
  return mesh;
}
