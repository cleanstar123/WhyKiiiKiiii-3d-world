import * as THREE from 'three';

/*
 * 화면 전체 후처리 패스.
 * 1) 장면을 화면 크기 렌더 타깃에 먼저 그리고
 * 2) 그 결과를 전체 화면 사각형에 붙이면서 VHS 효과(찢어짐, 색수차, 스캔라인, 노이즈)를 입힌다.
 * uGlitch 0이면 은은한 필름 그레인만, 1이면 화면 전환용 강한 글리치.
 */
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform float uGlitch;
  uniform vec2 uResolution;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    vec2 uv = vUv;
    float g = uGlitch;

    // 가로 띠 단위로 화면이 찢어지는 트래킹 에러
    float band = floor(uv.y * 22.0 + floor(uTime * 11.0) * 3.0);
    float tear = step(1.0 - 0.45 * g, hash(vec2(band, floor(uTime * 16.0))));
    uv.x += (hash(vec2(band + 1.7, floor(uTime * 30.0))) - 0.5) * 0.16 * g * tear;
    uv.x += sin(uv.y * 38.0 + uTime * 22.0) * 0.004 * g;
    uv.y += g * g * 0.05 * sin(uTime * 7.0);

    // 색수차: RGB 채널을 좌우로 살짝 어긋나게 읽는다
    float split = 0.0012 + 0.022 * g;
    vec3 col;
    col.r = texture2D(tDiffuse, uv + vec2(split, 0.0)).r;
    col.g = texture2D(tDiffuse, uv).g;
    col.b = texture2D(tDiffuse, uv - vec2(split, 0.0)).b;

    // 스캔라인 (약 6px 간격)
    float scan = 0.5 + 0.5 * sin(vUv.y * uResolution.y * 1.0472);
    col *= 1.0 - (0.04 + 0.22 * g) * scan;

    // 노이즈와 밝은 트래킹 선
    float n = hash(vUv * uResolution + fract(uTime) * 91.0);
    col += (n - 0.5) * (0.03 + 0.4 * g);
    float y = fract(uTime * 0.7);
    col += g * 0.5 * smoothstep(0.025, 0.0, abs(vUv.y - y));

    // 비네팅과 전환 순간의 하얀 번쩍임
    vec2 d = vUv - 0.5;
    col *= 1.0 - dot(d, d) * 0.5;
    col = mix(col, vec3(1.0), smoothstep(0.85, 1.0, g) * 0.55);

    gl_FragColor = vec4(max(col, 0.0), 1.0);
    #include <colorspace_fragment>
  }
`;

export class VhsPass {
  constructor(renderer, { samples = 4 } = {}) {
    this.renderer = renderer;
    this.target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples });
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.target.texture },
        uTime: { value: 0 },
        uGlitch: { value: 0 },
        uResolution: { value: new THREE.Vector2(1, 1) },
      },
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(quad);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  setSize(width, height, pixelRatio) {
    const w = Math.floor(width * pixelRatio);
    const h = Math.floor(height * pixelRatio);
    this.target.setSize(w, h);
    this.material.uniforms.uResolution.value.set(w, h);
  }

  render(scene, camera, time, glitch, overlay) {
    const r = this.renderer;
    r.setRenderTarget(this.target);
    r.render(scene, camera);
    if (overlay) {
      r.clearDepth();
      r.autoClear = false;
      r.render(overlay, camera);
      r.autoClear = true;
    }
    r.setRenderTarget(null);
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uGlitch.value = glitch;
    r.render(this.scene, this.camera);
  }
}
