import * as THREE from 'three';
import { clockText } from '../core/clock.js';

/*
 * 캠코더 액정 재질.
 * tScene   : 렌더 타깃에 실시간으로 그려진 미니 장면
 * tOverlay : 캔버스로 그린 액정 UI (● REC, 배터리, 날짜, 시간)
 * 셰이더에서 둘을 합치면서 스캔라인, 색수차, 가벼운 떨림을 얹는다.
 */
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D tScene;
  uniform sampler2D tOverlay;
  uniform float uTime;
  uniform float uGlitch;
  uniform float uHover;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    vec2 uv = vUv;
    float line = floor(uv.y * 48.0);
    uv.x += (hash(vec2(line, floor(uTime * 24.0))) - 0.5) * (0.0015 + 0.08 * uGlitch);

    // 볼록한 옛날 액정 느낌의 약한 배럴 왜곡
    vec2 c = uv - 0.5;
    uv = 0.5 + c * (1.0 - 0.08 * dot(c, c));

    float ca = 0.002 + 0.03 * uGlitch;
    vec3 col = vec3(
      texture2D(tScene, uv + vec2(ca, 0.0)).r,
      texture2D(tScene, uv).g,
      texture2D(tScene, uv - vec2(ca, 0.0)).b
    );

    col *= 0.8 + 0.2 * (0.5 + 0.5 * sin(vUv.y * 600.0));          // 스캔라인
    col += (hash(vUv * 480.0 + uTime) - 0.5) * (0.05 + 0.3 * uGlitch); // 노이즈
    col += 0.06 * smoothstep(0.05, 0.0, abs(vUv.y - fract(uTime * 0.15))); // 흐르는 밝은 줄
    vec2 d = vUv - 0.5;
    col *= 1.0 - dot(d, d) * 0.9;                                    // 비네팅

    vec4 ov = texture2D(tOverlay, vUv);
    col = mix(col, ov.rgb, ov.a);
    col *= 1.0 + uHover * 0.3;

    gl_FragColor = vec4(max(col, 0.0), 1.0);
    #include <colorspace_fragment>
  }
`;

export function createLcd({ sceneTexture, zone }) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  const overlay = new THREE.CanvasTexture(canvas);
  overlay.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      tScene: { value: sceneTexture },
      tOverlay: { value: overlay },
      uTime: { value: 0 },
      uGlitch: { value: 0 },
      uHover: { value: 0 },
    },
    vertexShader,
    fragmentShader,
    toneMapped: false,
  });

  function text(str, x, y, size, color, align = 'left') {
    ctx.font = `${size}px Silkscreen, "Courier New", monospace`;
    ctx.textAlign = align;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(str, x + 3, y + 3);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function draw(elapsed, blinkOn) {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = 'alphabetic';

    // 모서리 괄호
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 4;
    const m = 22, L = 30;
    [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(x, y + L * sy);
      ctx.lineTo(x, y);
      ctx.lineTo(x + L * sx, y);
      ctx.stroke();
    });

    // ● REC (깜빡임)
    if (blinkOn) {
      ctx.fillStyle = '#ff3b3b';
      ctx.beginPath();
      ctx.arc(54, 58, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    text('REC', 74, 68, 28, '#ffffff');
    text('SP', 170, 68, 20, '#ffffff');

    // 배터리
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(W - 110, 44, 58, 26);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(W - 52, 51, 5, 12);
    const bars = blinkOn ? 3 : 2;
    for (let i = 0; i < bars; i++) ctx.fillRect(W - 105 + i * 17, 49, 13, 16);

    // 날짜, 시간, 곡 이름
    text(zone.date, 48, H - 52, 22, '#fff27a');
    text(clockText(zone, elapsed), W - 48, H - 52, 26, '#ffffff', 'right');
    text(zone.track, W / 2, H - 92, 18, 'rgba(255,255,255,0.9)', 'center');
  }

  let lastTick = -1;
  return {
    material,
    update(elapsed, glitch, hover) {
      material.uniforms.uTime.value = elapsed;
      material.uniforms.uGlitch.value = glitch;
      material.uniforms.uHover.value = hover;
      const tick = Math.floor(elapsed * 2); // 0.5초마다 다시 그림
      if (tick !== lastTick) {
        lastTick = tick;
        draw(elapsed, tick % 2 === 0);
        overlay.needsUpdate = true;
      }
    },
  };
}
