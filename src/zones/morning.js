import * as THREE from 'three';
import { toon, withOutline } from '../core/toon.js';
import { sunburstTexture } from '../core/textures.js';
import { baseZone, makeSky, addLights, makeGlow, makeCloud } from './common.js';

// Ever2Late! 아침 07:30 — 떠 있는 작은 섬 위에서 늦었다고 울어대는 알람시계
export function createMorningZone() {
  const zone = baseZone();
  const { scene, camera } = zone;
  scene.add(makeSky({ top: 0x8fd3ff, horizon: 0xffe2b8, bottom: 0xffc6d9 }));
  addLights(scene, { sky: 0xfff6e8, ground: 0xa8d8ff, sun: 0xfff1c9, position: [4, 6, 5] });

  // 떠 있는 섬
  const grass = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(3, 2.9, 0.4, 14), toon(0x8ee07a)), 0.05);
  grass.position.y = -0.4;
  scene.add(grass);
  const dirt = new THREE.Mesh(new THREE.ConeGeometry(2.9, 1.8, 14), toon(0xd99a78));
  dirt.rotation.x = Math.PI;
  dirt.position.y = -1.5;
  scene.add(dirt);

  // 알람시계
  const clock = new THREE.Group();
  clock.position.y = 0.95;
  scene.add(clock);
  const body = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.45, 28), toon(0x7fe3c9)), 0.05);
  body.rotation.x = Math.PI / 2;
  clock.add(body);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.74, 28), toon(0xfffaf3));
  face.position.z = 0.231;
  clock.add(face);
  for (let i = 0; i < 12; i++) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.04, i % 3 ? 0.08 : 0.16, 0.01), new THREE.MeshBasicMaterial({ color: 0x2a1f4a }));
    const a = (i / 12) * Math.PI * 2;
    tick.position.set(Math.sin(a) * 0.62, Math.cos(a) * 0.62, 0.24);
    tick.rotation.z = -a;
    clock.add(tick);
  }
  const hand = (len, w) => {
    const pivot = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.02), new THREE.MeshBasicMaterial({ color: 0x2a1f4a }));
    m.position.y = len / 2;
    pivot.add(m);
    pivot.position.z = 0.25;
    clock.add(pivot);
    return pivot;
  };
  const hourHand = hand(0.36, 0.07);
  const minuteHand = hand(0.55, 0.045);
  [-1, 1].forEach((side) => {
    const bell = withOutline(new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xffd84d)), 0.03);
    bell.position.set(side * 0.52, 0.78, 0);
    bell.rotation.z = -side * 0.5;
    clock.add(bell);
    const leg = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.35, 8), toon(0x2a1f4a)), 0.02);
    leg.position.set(side * 0.5, -0.92, 0);
    leg.rotation.z = side * 0.4;
    clock.add(leg);
  });

  // 해 + 종이 햇살
  const sunGroup = new THREE.Group();
  sunGroup.position.set(4.5, 3.2, -9);
  scene.add(sunGroup);
  const rays = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5), new THREE.MeshBasicMaterial({ map: sunburstTexture(), color: 0xffe98a, transparent: true, depthWrite: false }));
  sunGroup.add(rays);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(1.3, 32), new THREE.MeshBasicMaterial({ color: 0xfff6b0 }));
  sun.position.z = 0.01;
  sunGroup.add(sun);
  sunGroup.add(makeGlow(0xfff2b0, 7));

  const clouds = [];
  [[-4, 2.6, -6], [3, 1.4, -5], [-1.5, 3.6, -10], [6.5, 0.4, -8]].forEach(([x, y, z], i) => {
    const c = makeCloud();
    c.position.set(x, y, z);
    c.scale.setScalar(0.7 + (i % 2) * 0.3);
    clouds.push(c);
    scene.add(c);
  });

  zone.update = (t, dt) => {
    minuteHand.rotation.z = -t * 3.0; // 시간이 너무 빨리 간다 (늦었다!)
    hourHand.rotation.z = -t * 0.25;
    const ringing = Math.sin(t * 0.9) > 0.35;
    clock.rotation.z = ringing ? Math.sin(t * 55) * 0.07 : 0;
    clock.position.y = 0.95 + (ringing ? Math.abs(Math.sin(t * 27)) * 0.05 : 0);
    rays.rotation.z = t * 0.15;
    sunGroup.position.y = 3.2 + Math.sin(t * 0.3) * 0.4;
    clouds.forEach((c, i) => {
      c.position.x += dt * (0.15 + i * 0.05);
      if (c.position.x > 9) c.position.x = -9;
    });
    camera.position.set(Math.sin(t * 0.15) * 1.8, 1.8, 7.5);
    camera.lookAt(0, 0.6, 0);
  };
  return zone;
}
