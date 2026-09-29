import * as THREE from 'three';
import { toon, withOutline } from '../core/toon.js';
import { baseZone, makeSky, addLights, makeGlow, makeWater } from './common.js';

// Blue Hour 04:50 — 하루 끝의 여운. 잔잔한 새벽 바다, 꺼져가는 가로등, 떠가는 종이배
export function createBlueHourZone() {
  const zone = baseZone();
  const { scene, camera } = zone;
  scene.add(makeSky({ top: 0x1b2f7a, horizon: 0xf4a6c6, bottom: 0x1a2b66, spread: 0.2 }));
  addLights(scene, { sky: 0x9fb4ff, ground: 0x1a2b66, sun: 0xffc4dc, intensity: 1.1, position: [-6, 3, -4] });

  const water = makeWater({ deep: 0x142c6a, shallow: 0x2f55a8, foam: 0xc7d6ff, horizon: 0xf4a6c6, amp: 0.06, ring: 0, ringStrength: 0 });
  scene.add(water.mesh);

  // 별
  const count = 260;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.random() * 1.45;
    pos[i * 3] = Math.cos(th) * Math.sin(ph) * 60;
    pos[i * 3 + 1] = Math.cos(ph) * 60 * 0.8 + 4;
    pos[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * 60;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0.8, depthWrite: false }));
  scene.add(stars);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 12), new THREE.MeshBasicMaterial({ color: 0xfff4e0 }));
  moon.position.set(8, 9, -24);
  scene.add(moon);
  const moonGlow = makeGlow(0xc8d4ff, 8);
  moonGlow.position.copy(moon.position);
  scene.add(moonGlow);

  // 바위섬과 가로등
  const rock = withOutline(new THREE.Mesh(new THREE.DodecahedronGeometry(1.4, 0), toon(0x5a6aa8)), 0.05);
  rock.scale.set(1.3, 0.5, 1);
  rock.position.set(-1.6, -0.1, -1.2);
  scene.add(rock);
  const post = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.2, 8), toon(0x2a1f4a)), 0.02);
  post.position.set(-1.6, 1.4, -1.2);
  scene.add(post);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff27a });
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.28), lampMat);
  lamp.position.set(-1.6, 2.6, -1.2);
  scene.add(lamp);
  const lampGlow = makeGlow(0xfff27a, 2.4);
  lampGlow.position.copy(lamp.position);
  scene.add(lampGlow);

  // 종이배
  const boat = new THREE.Group();
  const hullGeo = new THREE.ConeGeometry(0.5, 0.35, 4, 1);
  hullGeo.rotateX(Math.PI);
  hullGeo.rotateY(Math.PI / 4);
  const hull = withOutline(new THREE.Mesh(hullGeo, toon(0xf7f3ff)), 0.02);
  hull.scale.set(1.6, 1, 0.6);
  boat.add(hull);
  const sailShape = new THREE.Shape();
  sailShape.moveTo(-0.35, 0);
  sailShape.lineTo(0.35, 0);
  sailShape.lineTo(0, 0.6);
  sailShape.closePath();
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape), toon(0xffffff, { side: THREE.DoubleSide }));
  sail.position.y = 0.15;
  boat.add(sail);
  scene.add(boat);

  zone.update = (t) => {
    water.update(t);
    stars.material.opacity = 0.55 + 0.25 * Math.sin(t * 1.3);
    const dim = 0.6 + 0.4 * Math.sin(t * 0.8) * Math.sin(t * 5.3); // 새벽이라 깜빡이며 꺼져가는 불빛
    lampMat.color.setRGB(1 * dim + 0.2, 0.95 * dim + 0.2, 0.48 * dim + 0.1);
    lampGlow.material.opacity = Math.max(dim, 0.1);

    const a = t * 0.15;
    const bx = Math.cos(a) * 2.6 + 0.6, bz = Math.sin(a) * 1.6 + 0.8;
    boat.position.set(bx, water.heightAt(bx, bz, t) + 0.12, bz);
    boat.rotation.set(Math.sin(t * 1.3) * 0.08, -a, Math.sin(t * 1.1) * 0.1);

    camera.position.set(Math.sin(t * 0.1) * 1.2, 1.6, 8.5);
    camera.lookAt(0, 1.0, 0);
  };
  return zone;
}
