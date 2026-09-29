import * as THREE from 'three';
import { toon } from '../core/toon.js';
import { glowTexture } from '../core/textures.js';

/*
 * 모든 구역(zone)이 지키는 약속:
 *   create() → { scene, camera, update(time, dt), setAspect(aspect) }
 * 허브는 이 네 가지만 알면 되므로 구역을 추가해도 허브 코드는 안 바뀐다.
 */
export function baseZone({ fov = 45 } = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 4 / 3, 0.1, 200);
  return {
    scene,
    camera,
    setAspect(aspect) {
      if (camera.aspect !== aspect) {
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      }
    },
  };
}

export function makeSky({ top, horizon, bottom, spread = 0.55 }) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(90, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        cTop: { value: new THREE.Color(top) },
        cHorizon: { value: new THREE.Color(horizon) },
        cBottom: { value: new THREE.Color(bottom) },
        uSpread: { value: spread },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 cTop, cHorizon, cBottom;
        uniform float uSpread;
        varying vec3 vDir;
        void main() {
          float h = normalize(vDir).y;
          vec3 col = h > 0.0 ? mix(cHorizon, cTop, smoothstep(0.0, uSpread, h)) : mix(cHorizon, cBottom, smoothstep(0.0, 0.3, -h));
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }
      `,
    })
  );
  mesh.renderOrder = -1;
  return mesh;
}

export function addLights(scene, { sky = 0xffffff, ground = 0x88aaff, sun = 0xffffff, intensity = 1.8, position = [5, 8, 6] } = {}) {
  scene.add(new THREE.HemisphereLight(sky, ground, 1.3));
  const dir = new THREE.DirectionalLight(sun, intensity);
  dir.position.set(...position);
  scene.add(dir);
  return dir;
}

let sharedGlow = null;
export function makeGlow(color, size) {
  sharedGlow ??= glowTexture();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sharedGlow, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  s.scale.setScalar(size);
  return s;
}

// 로우폴리 구름 (정이십면체 몇 개를 뭉쳐서)
export function makeCloud(color = 0xffffff) {
  const g = new THREE.Group();
  const mat = toon(color);
  [[0, 0, 0, 1], [0.9, -0.15, 0.1, 0.75], [-0.9, -0.2, 0, 0.7], [0.35, 0.45, -0.1, 0.7]].forEach(([x, y, z, r]) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat);
    m.position.set(x, y, z);
    g.add(m);
  });
  return g;
}

// 물 셰이더: 버텍스에서 파도를 만들고, 프래그먼트에서 툰 느낌 색 띠와 거품 링을 그린다
export function makeWater({ deep, shallow, foam, horizon, size = 90, segments = 72, amp = 0.12, ring = 2.6, ringStrength = 1 }) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: amp },
      uRing: { value: ring },
      uRingStrength: { value: ringStrength },
      uFar: { value: size / 2 },
      uDeep: { value: new THREE.Color(deep) },
      uShallow: { value: new THREE.Color(shallow) },
      uFoam: { value: new THREE.Color(foam) },
      uHorizon: { value: new THREE.Color(horizon) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime, uAmp;
      varying float vH;
      varying vec2 vXZ;
      void main() {
        vec3 p = position;
        float h = sin(p.x * 0.55 + uTime * 1.1) * 0.6
                + sin(p.z * 0.8 - uTime * 0.9) * 0.4
                + sin((p.x + p.z) * 1.3 + uTime * 1.7) * 0.2;
        p.y += h * uAmp;
        vH = h;
        vXZ = p.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uRing, uRingStrength, uFar;
      uniform vec3 uDeep, uShallow, uFoam, uHorizon;
      varying float vH;
      varying vec2 vXZ;
      void main() {
        float d = length(vXZ);
        vec3 c = mix(uShallow, uDeep, smoothstep(uRing, uRing + 9.0, d));
        c *= 1.0 + 0.12 * step(0.3, vH);
        float rings = step(0.86, 0.5 + 0.5 * sin(d * 4.0 - uTime * 1.6))
                    * (1.0 - smoothstep(uRing, uRing + 3.5, d)) * step(uRing - 0.3, d) * uRingStrength;
        float crest = step(1.02, vH);
        c = mix(c, uFoam, max(rings, crest * 0.8));
        c = mix(c, uHorizon, smoothstep(uFar * 0.35, uFar * 0.95, d));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, material);
  return {
    mesh,
    update(time) { material.uniforms.uTime.value = time; },
    // 물 위에 뜬 물체의 높이를 셰이더와 같은 식으로 계산
    heightAt(x, z, time) {
      const h = Math.sin(x * 0.55 + time * 1.1) * 0.6 + Math.sin(z * 0.8 - time * 0.9) * 0.4 + Math.sin((x + z) * 1.3 + time * 1.7) * 0.2;
      return h * amp;
    },
  };
}
