import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toon, withOutline } from '../core/toon.js';
import { sparkleTexture, heartTexture } from '../core/textures.js';
import { baseZone, makeSky, addLights, makeGlow } from './common.js';

// Candy Pink Magic Hole Flip Phone 23:00 — 하이퍼팝 밤. 빙글도는 매직홀 주위를 폴더폰이 여닫으며 떠다닌다
export function createCandyZone() {
  const zone = baseZone();
  const { scene, camera } = zone;
  scene.add(makeSky({ top: 0x1b0b3a, horizon: 0xff5cc0, bottom: 0x2a0e52 }));
  addLights(scene, { sky: 0xffb8ec, ground: 0x6a3cff, sun: 0xffffff, intensity: 1.6, position: [3, 5, 6] });

  const grid = new THREE.GridHelper(60, 40, 0xff9ae0, 0xff9ae0);
  grid.position.y = -2.4;
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  scene.add(grid);

  // 매직홀: 도넛 + 소용돌이 셰이더 원판
  const hole = new THREE.Group();
  hole.position.set(0, 0.6, -1.5);
  scene.add(hole);
  const ring = withOutline(new THREE.Mesh(new THREE.TorusGeometry(2, 0.28, 12, 48), toon(0xff4fd8, { emissive: 0x5a0a48 })), 0.05);
  hole.add(ring);
  const swirl = new THREE.Mesh(
    new THREE.CircleGeometry(1.85, 48),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv - 0.5;
          float r = length(p) * 2.0;
          float a = atan(p.y, p.x);
          float s = sin(a * 5.0 + r * 12.0 - uTime * 4.0);
          vec3 c = mix(vec3(0.08, 0.0, 0.18), vec3(1.0, 0.25, 0.8), smoothstep(0.2, 0.9, s) * (1.0 - r * 0.6));
          c = mix(c, vec3(0.5, 0.95, 1.0), smoothstep(0.5, 1.0, s) * r * 0.6);
          c *= smoothstep(0.0, 0.35, r);
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }
      `,
    })
  );
  hole.add(swirl);
  const holeGlow = makeGlow(0xff6ad5, 7);
  holeGlow.position.z = -0.3;
  hole.add(holeGlow);

  // 폴더폰
  const phone = new THREE.Group();
  scene.add(phone);
  const lower = withOutline(new THREE.Mesh(new RoundedBoxGeometry(0.7, 1.05, 0.14, 2, 0.06), toon(0xd8b4ff)), 0.03);
  lower.position.y = -0.52;
  phone.add(lower);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      const key = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.03), toon(0xfffaf3));
      key.position.set((c - 1) * 0.19, -0.3 - r * 0.15, 0.075);
      phone.add(key);
    }
  }
  const hinge = new THREE.Group(); // 접히는 축
  hinge.position.set(0, 0, 0.07);
  phone.add(hinge);
  const upper = withOutline(new THREE.Mesh(new RoundedBoxGeometry(0.7, 1.05, 0.14, 2, 0.06), toon(0xff9ae0)), 0.03);
  upper.position.set(0, 0.52, -0.07);
  hinge.add(upper);
  const display = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.6), new THREE.MeshBasicMaterial({ color: 0x7ff6ff }));
  display.position.set(0, 0.58, 0.005);
  hinge.add(display);
  const antenna = withOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), toon(0xc0c0d8)), 0.015);
  antenna.position.set(0.24, 1.2, -0.07);
  hinge.add(antenna);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff27a }));
  tip.position.set(0.24, 1.42, -0.07);
  hinge.add(tip);

  // 떠다니는 2D 하트/반짝이 스티커
  const texs = [heartTexture(), sparkleTexture()];
  const tints = [0x7ff6ff, 0xfff27a, 0xff9ae0, 0xffffff];
  const floaters = [];
  for (let i = 0; i < 22; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texs[i % 2], color: tints[i % tints.length], transparent: true, depthWrite: false }));
    s.position.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 6, -1 - Math.random() * 6);
    s.userData = { size: 0.25 + Math.random() * 0.35, speed: 0.2 + Math.random() * 0.4, phase: Math.random() * 10 };
    floaters.push(s);
    scene.add(s);
  }

  zone.update = (t, dt) => {
    swirl.material.uniforms.uTime.value = t;
    ring.rotation.z = t * 0.4;
    ring.rotation.x = Math.sin(t * 0.7) * 0.15;

    const open = 0.5 + 0.5 * Math.sin(t * 1.2);
    hinge.rotation.x = THREE.MathUtils.lerp(2.95, 0.2, open * open * (3 - 2 * open));
    const a = t * 0.6;
    phone.position.set(Math.cos(a) * 2.9, Math.sin(a) * 1.5 + 0.6, 0.4 + Math.sin(t * 0.8) * 0.4);
    phone.rotation.set(Math.sin(t * 0.9) * 0.3, Math.sin(t * 0.5) * 0.6, Math.sin(t * 0.7) * 0.4);
    tip.visible = Math.floor(t * 3) % 2 === 0;

    floaters.forEach((s) => {
      s.position.y += s.userData.speed * dt;
      if (s.position.y > 3.5) s.position.y = -3.5;
      s.scale.setScalar(s.userData.size * (0.7 + 0.3 * Math.sin(t * 3 + s.userData.phase)));
    });

    camera.position.set(Math.sin(t * 0.3) * 1.5, 0.8, 7.5);
    camera.lookAt(0, 0.4, -1);
  };
  return zone;
}
