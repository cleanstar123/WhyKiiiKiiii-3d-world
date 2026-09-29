import * as THREE from 'three';
import { toon, withOutline } from '../core/toon.js';
import { baseZone, makeSky, addLights, makeGlow, makeCloud, makeWater } from './common.js';
import { makePaperDoll } from './paperDoll.js';

// Pop Off Pop Off 한낮 13:00 — 에메랄드 바다, 야자수, 종이인형, 비행기, 컨페티 (1구역 해변의 스케치)
export function createPopOffZone() {
  const zone = baseZone();
  const { scene, camera } = zone;
  scene.add(makeSky({ top: 0x3ec5ff, horizon: 0xc8f7ff, bottom: 0xffffff }));
  addLights(scene, { sky: 0xffffff, ground: 0x6fe0d0, sun: 0xfff4d6, intensity: 2.0, position: [-6, 10, 4] });

  const water = makeWater({ deep: 0x0fb5a4, shallow: 0x5ff2d6, foam: 0xffffff, horizon: 0xc8f7ff, ring: 2.7 });
  scene.add(water.mesh);

  const island = withOutline(new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 10), toon(0xffe08a)), 0.06);
  island.scale.y = 0.3;
  island.position.y = -0.2;
  scene.add(island);

  // 야자수
  const palm = new THREE.Group();
  palm.position.set(-0.7, 0.4, -0.6);
  scene.add(palm);
  const segs = 6;
  let top = new THREE.Vector3();
  for (let k = 0; k < segs; k++) {
    const r = 0.16 - k * 0.012;
    const seg = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.02, 0.5, 7), toon(k % 2 ? 0xc98a4b : 0xb07438)), 0.025);
    seg.position.set(k * k * 0.018, 0.25 + k * 0.46, 0);
    seg.rotation.z = -k * 0.05;
    palm.add(seg);
    top.set(k * k * 0.018, 0.25 + k * 0.46 + 0.25, 0);
  }
  const crown = new THREE.Group();
  crown.position.copy(top);
  palm.add(crown);
  for (let k = 0; k < 7; k++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (k / 7) * Math.PI * 2;
    const leafGeo = new THREE.ConeGeometry(0.22, 1.5, 4);
    leafGeo.rotateZ(-Math.PI / 2);
    leafGeo.translate(0.75, 0, 0);
    leafGeo.scale(1, 0.25, 1);
    const leaf = withOutline(new THREE.Mesh(leafGeo, toon(k % 2 ? 0x3ddc84 : 0x22c46e)), 0.02);
    leaf.rotation.z = -0.45;
    pivot.add(leaf);
    crown.add(pivot);
  }
  [0, 2, 4].forEach((k) => {
    const coco = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), toon(0x7a4a2a));
    coco.position.set(Math.cos(k) * 0.14, -0.1, Math.sin(k) * 0.14);
    crown.add(coco);
  });

  // 비치볼 (정점 색으로 줄무늬)
  const ballGeo = new THREE.SphereGeometry(0.3, 18, 12);
  const colors = [];
  const stripe = [0xff3b8a, 0xffffff, 0xfff27a, 0xffffff, 0x3ec5ff, 0xffffff].map((c) => new THREE.Color(c));
  const p = ballGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getZ(i), p.getX(i)) + Math.PI;
    const c = stripe[Math.floor((a / (Math.PI * 2)) * 6) % 6];
    colors.push(c.r, c.g, c.b);
  }
  ballGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const ball = withOutline(new THREE.Mesh(ballGeo, toon(0xffffff, { vertexColors: true })), 0.02);
  ball.position.set(1.2, 0.8, 0.6);
  scene.add(ball);

  // 캐리어 끄는 종이인형
  const doll = makePaperDoll();
  scene.add(doll);

  // 로우폴리 비행기
  const plane = new THREE.Group();
  const fuselage = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 1.6, 10), toon(0xffffff)), 0.03);
  fuselage.rotation.z = Math.PI / 2;
  plane.add(fuselage);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), toon(0xff8fc7));
  nose.position.x = 0.8;
  plane.add(nose);
  const wings = withOutline(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 2.2), toon(0xff8fc7)), 0.02);
  plane.add(wings);
  const fin = withOutline(new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.05), toon(0xff8fc7)), 0.02);
  fin.position.set(-0.7, 0.25, 0);
  plane.add(fin);
  scene.add(plane);

  // 해
  const sun = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 10), new THREE.MeshBasicMaterial({ color: 0xfff6a8 }));
  sun.position.set(-14, 11, -26);
  scene.add(sun);
  const glow = makeGlow(0xfff2b0, 10);
  glow.position.copy(sun.position);
  scene.add(glow);

  const clouds = [[-7, 5, -14], [6, 6.5, -18], [12, 4, -12]].map(([x, y, z]) => {
    const c = makeCloud();
    c.position.set(x, y, z);
    scene.add(c);
    return c;
  });

  // 컨페티: 인스턴싱으로 조각 140개를 드로우콜 1번에 그린다
  const CONFETTI = 140;
  const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.09, 0.15), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), CONFETTI);
  const palette = [0xff3b8a, 0xfff27a, 0x3ec5ff, 0x3ddc84, 0xb9a6ff, 0xff9a3b].map((c) => new THREE.Color(c));
  const bits = [];
  for (let i = 0; i < CONFETTI; i++) {
    confetti.setColorAt(i, palette[i % palette.length]);
    bits.push({
      x: (Math.random() - 0.5) * 8, y: Math.random() * 6, z: (Math.random() - 0.5) * 6,
      speed: 0.4 + Math.random() * 0.6, spin: Math.random() * 6, drift: Math.random() * 10,
    });
  }
  confetti.instanceColor.needsUpdate = true;
  scene.add(confetti);
  const dummy = new THREE.Object3D();

  zone.update = (t, dt) => {
    water.update(t);

    // 카메라: 섬 주위를 천천히 돈다
    const a = t * 0.1;
    camera.position.set(Math.sin(a) * 9.5, 3.4, Math.cos(a) * 9.5);
    camera.lookAt(0, 1.0, 0);

    crown.rotation.z = Math.sin(t * 1.4) * 0.06;
    ball.position.y = 0.8 + Math.abs(Math.sin(t * 2.2)) * 0.6;
    ball.rotation.x = t * 1.5;

    // 종이인형: 섬 가장자리를 왕복하며 통통, 방향이 바뀌면 종이처럼 뒤집힌다
    const walk = Math.sin(t * 0.45) * 1.0;
    doll.position.set(Math.sin(walk) * 1.55, 0.5 + Math.abs(Math.sin(t * 6)) * 0.08, Math.cos(walk) * 1.55);
    doll.rotation.y = Math.atan2(camera.position.x - doll.position.x, camera.position.z - doll.position.z);
    doll.scale.x = Math.cos(t * 0.45) >= 0 ? 1 : -1;

    // 비행기: 하늘을 크게 원 그리며 선회
    const pa = t * 0.35;
    plane.position.set(Math.cos(pa) * 11, 6.5 + Math.sin(pa * 2) * 0.4, Math.sin(pa) * 11 - 3);
    plane.rotation.set(0.35, -(pa + Math.PI / 2), 0);

    clouds.forEach((c) => {
      c.position.x += dt * 0.3;
      if (c.position.x > 16) c.position.x = -16;
    });

    for (let i = 0; i < CONFETTI; i++) {
      const b = bits[i];
      b.y -= b.speed * dt;
      if (b.y < 0) b.y = 6;
      dummy.position.set(b.x + Math.sin(t + b.drift) * 0.3, b.y, b.z);
      dummy.rotation.set(t * b.spin, t * b.spin * 0.7, 0);
      dummy.updateMatrix();
      confetti.setMatrixAt(i, dummy.matrix);
    }
    confetti.instanceMatrix.needsUpdate = true;
  };
  return zone;
}
