// Figure3D — shared low-poly human figures for the 3D renderers.
//
// Builds a more human-like, clearly gender-distinct figure out of primitives:
//   - male   → broad shoulders, trousers (two legs), short hair
//   - female → slimmer torso, flared dress + slender legs, long hair, slight bust
//   - neutral→ medium build, trousers, mid-length hair
//   - children → smaller scale, round head, short hair
//
// "Forward" is +X so the figure works with `rotation.y = -facing` (like the
// beast/dragon models). Colors come from the entity's skinTone/hairColor/clothColor.
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

export function makeFigure(opts = {}) {
  const g = new THREE.Group();
  const female = opts.gender === 'female';
  const child = opts.age != null && opts.age < 14;
  const s = (opts.scale || 1) * (child ? 0.72 : 1);

  const skin = mat(opts.skinTone || '#e8c39a');
  const cloth = mat(opts.clothColor || '#7a6a4a');
  const dark = mat(darken(opts.clothColor));
  const hair = mat(opts.hairColor || '#4a3624');

  const add = (geo, m, x, y, z, rz = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x * s, y * s, z * s);
    mesh.rotation.z = rz;
    g.add(mesh);
    return mesh;
  };

  // ---- lower body ----
  if (female && !child) {
    // flared dress / skirt
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(2.4 * s, 6.6 * s, 11 * s, 12), cloth);
    skirt.position.y = 9 * s;
    g.add(skirt);
    // slender legs below the skirt
    add(new THREE.CylinderGeometry(1.2 * s, 1.2 * s, 5 * s, 6), skin, 0, 2.4, -1.8);
    add(new THREE.CylinderGeometry(1.2 * s, 1.2 * s, 5 * s, 6), skin, 0, 2.4, 1.8);
  } else {
    // trousers (two legs)
    add(new THREE.CylinderGeometry(1.8 * s, 2.0 * s, 12 * s, 6), dark, 0, 6, -2);
    add(new THREE.CylinderGeometry(1.8 * s, 2.0 * s, 12 * s, 6), dark, 0, 6, 2);
  }

  // ---- torso ----
  if (female && !child) {
    // slimmer torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(3.5 * s, 7 * s, 4, 8), cloth);
    torso.position.y = 15 * s;
    g.add(torso);
    // slight bust (front = +X)
    add(new THREE.SphereGeometry(1.7 * s, 6, 5), cloth, 1.2, 20, -1.6);
    add(new THREE.SphereGeometry(1.7 * s, 6, 5), cloth, 1.2, 20, 1.6);
  } else {
    // broad shoulders (male / neutral)
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(4.4 * s, 8 * s, 4, 8), cloth);
    torso.position.y = 15 * s;
    g.add(torso);
  }

  // ---- arms ----
  add(new THREE.CylinderGeometry(1.2 * s, 1.2 * s, 9 * s, 6), skin, 0, 15, -5, 0.25);
  add(new THREE.CylinderGeometry(1.2 * s, 1.2 * s, 9 * s, 6), skin, 0, 15, 5, -0.25);

  // ---- head (slightly forward) ----
  const head = new THREE.Mesh(new THREE.SphereGeometry(4.6 * s, 12, 10), skin);
  head.position.set(0.8 * s, 25 * s, 0);
  g.add(head);

  // ---- hair (gender-distinct) ----
  if (female && !child) {
    // long hair: top + two strands flowing down the back (-X side)
    const top = new THREE.Mesh(new THREE.SphereGeometry(4.8 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    top.position.set(0.8 * s, 25.4 * s, 0);
    g.add(top);
    add(new THREE.CylinderGeometry(1.5 * s, 1.5 * s, 12 * s, 6), hair, -2.2, 19, -2);
    add(new THREE.CylinderGeometry(1.5 * s, 1.5 * s, 12 * s, 6), hair, -2.2, 19, 2);
  } else if (child) {
    const top = new THREE.Mesh(new THREE.SphereGeometry(4.8 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    top.position.set(0.8 * s, 25.4 * s, 0);
    g.add(top);
  } else if (opts.gender === 'male') {
    // short hair
    const top = new THREE.Mesh(new THREE.SphereGeometry(4.7 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
    top.position.set(0.8 * s, 25 * s, 0);
    g.add(top);
  } else {
    // neutral: mid-length hair (top + a short back cap)
    const top = new THREE.Mesh(new THREE.SphereGeometry(4.7 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    top.position.set(0.8 * s, 25.4 * s, 0);
    g.add(top);
    const back = new THREE.Mesh(new THREE.SphereGeometry(3.6 * s, 8, 7), hair);
    back.position.set(-1.6 * s, 21.5 * s, 0);
    g.add(back);
  }

  // ---- eyes (front = +X) ----
  add(new THREE.SphereGeometry(0.5 * s, 4, 4), eyeMat, 4.4, 25.4, -1.7);
  add(new THREE.SphereGeometry(0.5 * s, 4, 4), eyeMat, 4.4, 25.4, 1.7);

  return g;
}
