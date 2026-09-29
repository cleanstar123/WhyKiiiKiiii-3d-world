import * as THREE from 'three';
import { formatDate, formatTime } from '../core/clock.js';

const W = 640, H = 280;
const HEADER_H = 42;
const TEAR_X = 396;
const NAVY  = '#2a1f4a';
const PINK  = '#ff8fc7';
const LILAC = '#b9a6ff';
const CREAM = '#fffaf3';
const WHITE = '#ffffff';
const GRAY  = 'rgba(42,31,74,0.45)';

// ── 헬퍼 ─────────────────────────────────────────────────
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function lbl(ctx, x, y, text) {
  ctx.fillStyle = GRAY;
  ctx.font = '7px "Silkscreen", monospace';
  ctx.fillText(text, x, y);
}

function val(ctx, x, y, text, size = 11) {
  ctx.fillStyle = NAVY;
  ctx.font = `bold ${size}px "Silkscreen", monospace`;
  ctx.fillText(text, x, y);
}

function hline(ctx, x1, x2, y, color = 'rgba(42,31,74,0.12)') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
}

function drawQR(ctx, x, y, size, fg = NAVY, bg = WHITE) {
  const n = 9, cell = Math.floor(size / n);
  const pat = [
    [1,1,1,1,1,1,1,0,1],[1,0,0,0,0,0,1,0,0],[1,0,1,1,1,0,1,0,1],
    [1,0,1,0,1,0,1,1,0],[1,0,1,1,1,0,1,0,1],[1,0,0,0,0,0,1,1,0],
    [1,1,1,1,1,1,1,0,1],[0,1,0,1,0,0,0,1,0],[1,0,1,0,1,1,0,0,1],
  ];
  ctx.fillStyle = bg;
  ctx.fillRect(x - 2, y - 2, n * cell + 4, n * cell + 4);
  ctx.fillStyle = fg;
  pat.forEach((row, r) => row.forEach((c, col) => {
    if (c) ctx.fillRect(x + col * cell, y + r * cell, cell - 0.5, cell - 0.5);
  }));
}

function drawBarcode(ctx, x, y, w, h) {
  const widths = [3,1,2,1,3,1,2,1,1,2,1,3,1,1,2,1,2,2,1,3,1,1,2,3,1,2,1,1,3,2,1,1];
  let cx = x;
  widths.forEach((bw, i) => {
    if (i % 2 === 0) {
      ctx.fillStyle = i % 10 === 0 ? PINK : i % 6 === 0 ? LILAC : NAVY;
      ctx.fillRect(cx, y, bw * 3, h);
    }
    cx += bw * 3 + 1;
    if (cx > x + w) return;
  });
}

function drawHeader(ctx) {
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, HEADER_H);

  ctx.fillStyle = WHITE;
  ctx.font = '9px "Silkscreen", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('✈  GATES CLOSE 15 MIN BEFORE DEPARTURE', 14, 26);

  ctx.font = 'bold 11px "Silkscreen", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('✈ WHYKIIKII AIR', W - 14, 26);
  ctx.textAlign = 'left';
}

function drawTearLine(ctx, dashColor = 'rgba(42,31,74,0.25)') {
  ctx.strokeStyle = dashColor;
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(TEAR_X, 8); ctx.lineTo(TEAR_X, H - 8); ctx.stroke();
  ctx.setLineDash([]);
}

// ── 앞면 ─────────────────────────────────────────────────
function drawTicket(ctx, name) {
  const now  = new Date();
  const ML   = 16;
  const MR   = TEAR_X - 14;
  const SL   = TEAR_X + 14;
  const SW   = W - 10;

  ctx.clearRect(0, 0, W, H);
  ctx.save();
  roundRectPath(ctx, 0, 0, W, H, 14);
  ctx.clip();

  // 크림 배경
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, H);

  drawHeader(ctx);
  drawTearLine(ctx);
  // 헤더 구간은 네이비 배경이라 흰색으로 덧그려야 보임
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(TEAR_X, 8); ctx.lineTo(TEAR_X, HEADER_H); ctx.stroke();
  ctx.setLineDash([]);

  // ── 메인 섹션 (좌측) ────────────────────────────────────
  lbl(ctx, ML, HEADER_H + 14, 'NAME OF PASSENGER');
  if (name) {
    ctx.fillStyle = NAVY;
    ctx.font = 'bold 18px "Do Hyeon", sans-serif';
    ctx.fillText(name.toUpperCase(), ML, HEADER_H + 32);
  } else {
    val(ctx, ML, HEADER_H + 30, '____________________', 11);
  }

  hline(ctx, ML, MR, HEADER_H + 44);

  // FROM / TO
  lbl(ctx, ML, HEADER_H + 56, 'FROM');
  val(ctx, ML, HEADER_H + 68, 'SEOUL, KOR', 12);
  lbl(ctx, ML, HEADER_H + 82, 'TO');
  val(ctx, ML, HEADER_H + 94, 'WHYKIIKII WORLD', 12);

  // FLIGHT / CLASS (우측 컬럼)
  const RC = ML + 148;
  lbl(ctx, RC,      HEADER_H + 56, 'FLIGHT');
  val(ctx, RC,      HEADER_H + 68, 'WK-001');
  lbl(ctx, RC + 88, HEADER_H + 56, 'CLASS / DATE');
  val(ctx, RC + 88, HEADER_H + 68, `A / ${formatDate(now)}`);
  lbl(ctx, RC,      HEADER_H + 82, 'GROUP');
  val(ctx, RC,      HEADER_H + 94, 'A');

  hline(ctx, ML, MR, HEADER_H + 108);

  // 세부 그리드
  const gx = [ML, ML + 76, ML + 154, ML + 224, ML + 296];
  const gl = ['DATE', 'BOARDING', 'SEAT', 'GATE', 'TERMINAL'];
  const gv = [formatDate(now), formatTime(now), '20H', '3', 'T1'];
  gl.forEach((l, i) => { lbl(ctx, gx[i], HEADER_H + 120, l); val(ctx, gx[i], HEADER_H + 133, gv[i], 10); });

  hline(ctx, ML, MR, HEADER_H + 148);

  // 바코드
  drawBarcode(ctx, ML, HEADER_H + 154, MR - ML - 4, 16);
  lbl(ctx, ML, HEADER_H + 182, 'WHYKIIKII1234567890');

  // ── 스텁 섹션 (우측) ────────────────────────────────────
  lbl(ctx, SL, HEADER_H + 13, 'NAME OF PASSENGER');
  if (name) {
    ctx.fillStyle = NAVY;
    ctx.font = 'bold 11px "Do Hyeon", sans-serif';
    ctx.fillText(name.toUpperCase(), SL, HEADER_H + 26);
  } else {
    val(ctx, SL, HEADER_H + 24, '____________', 9);
  }

  lbl(ctx, SL, HEADER_H + 40, 'FROM');
  val(ctx, SL, HEADER_H + 50, 'SEOUL, KOR', 9);
  lbl(ctx, SL, HEADER_H + 63, 'TO');
  val(ctx, SL, HEADER_H + 73, 'WHYKIIKII WORLD', 9);

  hline(ctx, SL, SW, HEADER_H + 85);

  lbl(ctx, SL,      HEADER_H + 96,  'FLIGHT');     val(ctx, SL,      HEADER_H + 107, 'WK-001', 9);
  lbl(ctx, SL + 80, HEADER_H + 96,  'CLASS/DATE'); val(ctx, SL + 80, HEADER_H + 107, `A/${formatDate(now)}`, 9);

  hline(ctx, SL, SW, HEADER_H + 118);

  lbl(ctx, SL,      HEADER_H + 129, 'DATE');     val(ctx, SL,      HEADER_H + 140, formatDate(now), 9);
  lbl(ctx, SL + 80, HEADER_H + 129, 'BOARDING'); val(ctx, SL + 80, HEADER_H + 140, formatTime(now), 9);

  hline(ctx, SL, SW, HEADER_H + 151);

  lbl(ctx, SL,      HEADER_H + 162, 'SEAT'); val(ctx, SL,      HEADER_H + 173, '20H', 9);
  lbl(ctx, SL + 60, HEADER_H + 162, 'GATE'); val(ctx, SL + 60, HEADER_H + 173, '3',   9);

  // QR 코드 (스텁 우하단)
  const QR = 56;
  drawQR(ctx, SW - QR, H - QR - 12, QR);

  ctx.restore();
}

// ── 뒷면: 동영상 + 우측 스텁 ──────────────────────────────
function drawTicketBack(ctx, video) {
  const now = new Date();
  const SL  = TEAR_X + 14;
  const SW  = W - 10;

  ctx.clearRect(0, 0, W, H);
  ctx.save();
  roundRectPath(ctx, 0, 0, W, H, 14);
  ctx.clip();

  // 네이비 배경
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);

  // 동영상 (헤더 아래, 찢음선 좌측)
  if (video.readyState >= 2 && video.videoWidth > 0) {
    const vw = TEAR_X, vh = H - HEADER_H;
    const va = video.videoWidth / video.videoHeight;
    const ba = vw / vh;
    let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
    if (va > ba) { sw = sh * ba; sx = (video.videoWidth - sw) / 2; }
    else         { sh = sw / ba; sy = (video.videoHeight - sh) / 2; }
    ctx.drawImage(video, sx, sy, sw, sh, 0, HEADER_H, vw, vh);
    // 가독성을 위한 살짝 어두운 오버레이
    ctx.fillStyle = 'rgba(42,31,74,0.2)';
    ctx.fillRect(0, HEADER_H, TEAR_X, vh);
  }

  // 헤더 (동영상 위)
  drawHeader(ctx);

  // 찢음선 (밝은 버전)
  drawTearLine(ctx, 'rgba(255,255,255,0.3)');

  // 우측 스텁 — 흰 텍스트
  const wl = (x, y, t) => { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '7px "Silkscreen",monospace'; ctx.fillText(t, x, y); };
  const wv = (x, y, t, s = 10) => { ctx.fillStyle = WHITE; ctx.font = `bold ${s}px "Silkscreen",monospace`; ctx.fillText(t, x, y); };
  const wln = (x1, x2, y) => { ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); };

  wl(SL, HEADER_H + 18, 'FLIGHT');
  wv(SL, HEADER_H + 30, 'WK-001');
  wl(SL + 80, HEADER_H + 18, 'CLASS');
  wv(SL + 80, HEADER_H + 30, 'A');

  wln(SL, SW, HEADER_H + 44);

  wl(SL, HEADER_H + 56, 'DATE');
  wv(SL, HEADER_H + 68, formatDate(now));

  wln(SL, SW, HEADER_H + 82);

  wl(SL, HEADER_H + 94, 'GATE');
  wv(SL, HEADER_H + 106, '3');
  wl(SL + 60, HEADER_H + 94, 'SEAT');
  wv(SL + 60, HEADER_H + 106, '20H', 12);

  wln(SL, SW, HEADER_H + 120);

  wl(SL, HEADER_H + 132, 'BOARDING TIME');
  wv(SL, HEADER_H + 145, formatTime(now), 13);

  wln(SL, SW, HEADER_H + 162);

  // QR 코드 (네이비 배경에 흰 패턴)
  const QR = 56;
  drawQR(ctx, SW - QR, H - QR - 12, QR, WHITE, NAVY);

  ctx.restore();
}

// ── 셰이더 ───────────────────────────────────────────────
const ticketVert = /* glsl */ `
  uniform float uBend;
  uniform float uWave;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.z += sin(uv.x * 3.14159 + uWave) * uBend;
    pos.z += sin(uv.y * 3.14159 * 2.0 + uWave * 1.3) * uBend * 0.4;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;
const ticketFrag = /* glsl */ `
  uniform sampler2D uMap;
  varying vec2 vUv;
  void main() {
    gl_FragColor = texture2D(uMap, vUv);
    #include <colorspace_fragment>
  }
`;

// ── buildTicket ──────────────────────────────────────────
export function buildTicket() {
  const cvs = document.createElement('canvas');
  cvs.width = W; cvs.height = H;
  const ctx = cvs.getContext('2d');
  const tex = new THREE.CanvasTexture(cvs);

  const aspect = W / H;
  const ph = 3.2;
  const pw = ph * aspect;
  const geo = new THREE.PlaneGeometry(pw, ph, 12, 6);

  // 앞면
  const mat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: tex }, uBend: { value: 0 }, uWave: { value: 0 } },
    vertexShader: ticketVert, fragmentShader: ticketFrag,
    transparent: true, depthWrite: false, side: THREE.FrontSide,
  });
  const frontMesh = new THREE.Mesh(geo, mat);
  frontMesh.renderOrder = 10;

  // 동영상 소스
  const video = document.createElement('video');
  video.src = '/assets/video/SaveTwitter.Net_qIB0kyijdJBZJ74H_(2160p).mp4';
  video.loop = true; video.muted = true; video.playsInline = true; video.crossOrigin = 'anonymous';
  video.play().catch(() => {
    document.addEventListener('pointerdown', () => video.play().catch(() => {}), { once: true });
  });

  // 뒷면 캔버스
  const backCvs = document.createElement('canvas');
  backCvs.width = W; backCvs.height = H;
  const backCtx = backCvs.getContext('2d');
  const backTex = new THREE.CanvasTexture(backCvs);

  const backMat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: backTex }, uBend: mat.uniforms.uBend, uWave: mat.uniforms.uWave },
    vertexShader: ticketVert, fragmentShader: ticketFrag,
    transparent: true, depthWrite: false, side: THREE.FrontSide,
  });
  const backMesh = new THREE.Mesh(geo, backMat);
  backMesh.rotation.y = Math.PI;
  backMesh.renderOrder = 10;

  const mesh = new THREE.Group();
  mesh.add(frontMesh);
  mesh.add(backMesh);

  function redraw(name = '') { drawTicket(ctx, name); tex.needsUpdate = true; }
  function tickBack() { drawTicketBack(backCtx, video); backTex.needsUpdate = true; }

  redraw();
  tickBack();

  return { mesh, redraw, mat, tickBack };
}
