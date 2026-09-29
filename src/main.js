import * as THREE from 'three';
import { ZONES } from './zones/index.js';
import { Hub } from './hub/Hub.js';
import { Intro } from './intro/Intro.js';
import { VhsPass } from './fx/VhsPass.js';
import { animate, updateTweens, ease, smoothstep } from './core/tween.js';
import { initUI } from './ui.js';

const canvas = document.getElementById('world');
const isTouch = matchMedia('(pointer: coarse)').matches;
const quality = {
  low: isTouch || (navigator.hardwareConcurrency ?? 8) <= 4,
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.low ? 1.5 : 2));

const vhs = new VhsPass(renderer, { samples: quality.low ? 0 : 4 });
const hub = new Hub({ renderer, zones: ZONES, quality });
const ui = initUI(ZONES, { onSelect: (i) => enter(i), onBack: () => exit() });

// 처음에는 캠코더 숨김
hub.showCamcorders(false);

// ── 인트로 ──────────────────────────────────────────────
const intro = new Intro({
  scene: hub.scene,
  camera: hub.camera,
  quality,
  reducedMotion: quality.reducedMotion,
});

// 이름 입력 UI
const nameInput = document.getElementById('intro-name');
const submitBtn = document.getElementById('intro-submit');
const errorEl   = document.getElementById('intro-error');

// localStorage에서 저장된 이름 불러오기
try {
  const saved = localStorage.getItem('introName');
  if (saved) nameInput.value = saved;
} catch (_) {}

function handleSubmit() {
  const name = nameInput.value.trim().slice(0, 12);
  if (!name) {
    errorEl.hidden = false;
    nameInput.focus();
    return;
  }
  errorEl.hidden = true;
  try { localStorage.setItem('introName', name); } catch (_) {}

  // 입력 UI 비활성화
  nameInput.disabled = true;
  submitBtn.disabled = true;

  intro.submitName(name, () => {
    // 티켓 날아간 후 → check 상태가 됨 (Intro 내부에서 처리)
  });
}

// 영어(A-Z)와 공백만 허용
nameInput.addEventListener('input', () => {
  const filtered = nameInput.value.replace(/[^A-Za-z ]/g, '');
  if (filtered !== nameInput.value) nameInput.value = filtered;
});

submitBtn.addEventListener('click', handleSubmit);
nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSubmit(); });

// ── 시간 태그 ────────────────────────────────────────────
const timeTags = ZONES.map((zone) => {
  const el = document.createElement('div');
  el.className = 'time-tag';
  el.innerHTML = `<span class="time-tag-t">${zone.time}</span><span class="time-tag-n">${zone.track}</span>`;
  document.body.appendChild(el);
  return el;
});
const _tv = new THREE.Vector3();

function updateTimeTags() {
  hub.camera.updateMatrixWorld();
  const show = mode === 'hub';
  timeTags.forEach((el, i) => {
    if (!show) { el.style.opacity = '0'; return; }
    const e = hub.entries[i];
    _tv.copy(e.root.position);
    _tv.y += 0.9 * e.root.scale.x;
    _tv.project(hub.camera);
    if (_tv.z > 1) { el.style.opacity = '0'; return; }
    const x = (_tv.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-_tv.y * 0.5 + 0.5) * window.innerHeight;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.opacity = '1';
    el.classList.toggle('is-hovered', hub.hovered === i);
  });
}

// ── YouTube 플레이어 ──────────────────────────────────────
let ytReady = false;
const ytPlayers = new Array(ZONES.length).fill(null);
let playingIndex = -1;

window.onYouTubeIframeAPIReady = () => {
  ytReady = true;
  ZONES.forEach((zone, i) => {
    if (!zone.youtubeId) return;
    const div = document.createElement('div');
    div.id = `yt-${i}`;
    div.style.cssText = 'position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;';
    document.body.appendChild(div);
    /* global YT */
    ytPlayers[i] = new YT.Player(`yt-${i}`, {
      videoId: zone.youtubeId,
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, rel: 0 },
    });
  });
};
const ytScript = document.createElement('script');
ytScript.src = 'https://www.youtube.com/iframe_api';
document.head.appendChild(ytScript);

function togglePlay(i) {
  if (!ytReady || !ytPlayers[i]) return;
  if (playingIndex === i) {
    ytPlayers[i].pauseVideo?.();
    playingIndex = -1;
  } else {
    if (playingIndex >= 0) ytPlayers[playingIndex]?.pauseVideo?.();
    ytPlayers[i].playVideo?.();
    playingIndex = i;
  }
}

// ── 재생 버튼 ────────────────────────────────────────────
const playBtns = ZONES.map((zone, i) => {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'cam-btn';
  el.setAttribute('aria-label', `${zone.track} 재생`);
  el.innerHTML = '<span class="btn-icon">▶</span>';
  el.addEventListener('click', (ev) => { ev.stopPropagation(); togglePlay(i); });
  document.body.appendChild(el);
  return el;
});
const _bv = new THREE.Vector3();

function updatePlayBtns() {
  hub.camera.updateMatrixWorld();
  const show = mode === 'hub';
  playBtns.forEach((btn, i) => {
    const playing = playingIndex === i;
    btn.querySelector('.btn-icon').textContent = playing ? '⏸' : '▶';
    btn.classList.toggle('is-playing', playing);
    if (!show) { btn.style.opacity = '0'; btn.style.pointerEvents = 'none'; return; }
    const e = hub.entries[i];
    _bv.copy(e.root.position);
    _bv.y -= 0.9 * e.root.scale.x;
    _bv.project(hub.camera);
    if (_bv.z > 1) { btn.style.opacity = '0'; btn.style.pointerEvents = 'none'; return; }
    const x = (_bv.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-_bv.y * 0.5 + 0.5) * window.innerHeight;
    btn.style.left = `${x}px`;
    btn.style.top = `${y}px`;
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
  });
}

// ── 상태 ─────────────────────────────────────────────────
const GLITCH_MAX = quality.reducedMotion ? 0.35 : 1;
// intro | hub | zooming | arriving | scene | leaving | returning
let mode = 'intro';
document.body.dataset.mode = 'intro';
let active = -1;
let glitch = 0;
let pendingExit = false;

function setMode(m) {
  mode = m;
  document.body.dataset.mode = m.startsWith('intro') ? 'intro' : m === 'hub' ? 'hub' : 'scene';
}

// ── 입력 ─────────────────────────────────────────────────
const pointer = new THREE.Vector2();
let pointerInside = false;
let downAt = null;
let isDragging = false;
let dragLast = null;
let ticketDragging = false;
let ticketDragLast = null;

function setPointer(e) {
  pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
}

canvas.addEventListener('pointermove', (e) => {
  setPointer(e);
  pointerInside = true;
  if (mode === 'intro') {
    if (ticketDragging && ticketDragLast) {
      intro.moveTicketDrag(e.clientX - ticketDragLast.x, e.clientY - ticketDragLast.y);
      ticketDragLast = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
    } else {
      const overSuitcase = intro.pick(pointer);
      const overTicket = intro.pickTicket(pointer);
      intro.setHovered(overSuitcase);
      canvas.style.cursor = overSuitcase ? 'pointer' : overTicket ? 'grab' : '';
    }
    return;
  }
  if (isDragging && dragLast) {
    hub.dragMove(e.clientX - dragLast.x, e.clientY - dragLast.y);
    dragLast = { x: e.clientX, y: e.clientY };
  }
});

canvas.addEventListener('pointerleave', () => { pointerInside = false; });

canvas.addEventListener('pointerdown', (e) => {
  setPointer(e);
  downAt = { x: e.clientX, y: e.clientY };
  if (mode === 'intro' && intro.pickTicket(pointer)) {
    ticketDragging = true;
    ticketDragLast = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
    intro.startTicketDrag();
    return;
  }
  if (mode === 'hub') {
    const i = hub.pick(pointer);
    if (i >= 0) {
      isDragging = true;
      dragLast = { x: e.clientX, y: e.clientY };
      hub.startDrag(i);
      canvas.setPointerCapture(e.pointerId);
    }
  }
});

canvas.addEventListener('pointerup', async (e) => {
  if (ticketDragging) {
    ticketDragging = false;
    ticketDragLast = null;
    intro.endTicketDrag();
    return;
  }
  // 인트로 클릭
  if (mode === 'intro') {
    setPointer(e);
    if (intro.state === 'check' && intro.pick(pointer)) {
      setMode('intro-suck');
      canvas.style.cursor = '';
      await intro.playSuckIn(() => {
        // 글리치 정점: 씬 전환
        hub.camera.position.copy(hub.homePos);
        hub.camera.lookAt(hub.lookTarget);
        hub.camera.rotation.z = 0;
        intro.dispose();
        hub.showCamcorders(true);
        setMode('hub');
        ui.setMode('hub', -1);
      });
      glitch = 0;
    }
    return;
  }

  isDragging = false;
  hub.endDrag();
  dragLast = null;
  if (!downAt) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
  downAt = null;
  if (moved > 8 || mode !== 'hub') return;
  setPointer(e);
  const i = hub.pick(pointer);
  if (i >= 0) enter(i);
});

canvas.addEventListener('pointercancel', () => {
  ticketDragging = false;
  ticketDragLast = null;
  if (mode === 'intro') intro.endTicketDrag();
  isDragging = false;
  hub.endDrag();
  dragLast = null;
  downAt = null;
});

window.addEventListener('keydown', (e) => { if (e.key === 'Escape') exit(); });

// ── 전환 ─────────────────────────────────────────────────
const frame = { pos: new THREE.Vector3(), normal: new THREE.Vector3(), quat: new THREE.Quaternion(), scale: new THREE.Vector3(), width: 0, height: 0 };
const zoomPos = new THREE.Vector3();
const zoomQuat = new THREE.Quaternion();
const lookMatrix = new THREE.Matrix4();

async function enter(i) {
  if (mode !== 'hub') return;
  setMode('zooming');
  active = i;
  hub.hovered = i;
  hub.setFrozen(i, true);
  ui.setMode('zooming', i);

  const cam = hub.camera;
  const fromPos = cam.position.clone();
  const fromQuat = cam.quaternion.clone();
  const tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));

  await animate(1.6, (e, p) => {
    hub.getScreenFrame(i, frame);
    const dist = Math.min(frame.height / 2 / tan, frame.width / 2 / (tan * cam.aspect)) * 0.9;
    zoomPos.copy(frame.pos).addScaledVector(frame.normal, dist);
    lookMatrix.lookAt(zoomPos, frame.pos, cam.up);
    zoomQuat.setFromRotationMatrix(lookMatrix);
    cam.position.lerpVectors(fromPos, zoomPos, e);
    cam.quaternion.slerpQuaternions(fromQuat, zoomQuat, e);
    hub.entries[i].glitch = smoothstep(0.45, 1, p);
    glitch = smoothstep(0.72, 1, p) * GLITCH_MAX;
  });

  setMode('arriving');
  ui.setMode('scene', i);
  await animate(0.8, (e) => { glitch = (1 - e) * GLITCH_MAX; }, ease.outCubic);
  glitch = 0;
  setMode('scene');
  if (pendingExit) { pendingExit = false; exit(); }
}

async function exit() {
  if (mode === 'arriving') { pendingExit = true; return; }
  if (mode !== 'scene') return;
  setMode('leaving');
  await animate(0.35, (e) => { glitch = e * GLITCH_MAX; }, ease.inCubic);

  setMode('returning');
  ui.setMode('returning');
  const i = active;
  const cam = hub.camera;
  cam.position.copy(zoomPos);
  cam.quaternion.copy(zoomQuat);
  lookMatrix.lookAt(hub.homePos, hub.lookTarget, cam.up);
  const homeQuat = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);

  await animate(1.3, (e, p) => {
    cam.position.lerpVectors(zoomPos, hub.homePos, e);
    cam.quaternion.slerpQuaternions(zoomQuat, homeQuat, e);
    glitch = (1 - smoothstep(0, 0.45, p)) * GLITCH_MAX;
    hub.entries[i].glitch = 1 - smoothstep(0.2, 0.8, p);
  });

  hub.setFrozen(i, false);
  glitch = 0;
  active = -1;
  setMode('hub');
  ui.setMode('hub', i);
}

// ── 크기 ─────────────────────────────────────────────────
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  vhs.setSize(w, h, renderer.getPixelRatio());
  hub.resize(w / h);
}
window.addEventListener('resize', resize);
resize();

// ── 루프 ─────────────────────────────────────────────────
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (mode === 'intro' || mode === 'intro-suck') {
    // 인트로: 허브 배경(하늘·먼지·스티커·버블)은 그대로 돌리되
    // 캠코더 렌더타깃 업데이트는 건너뜀
    hub.update(t, dt, 'intro');
    intro.update(t, dt);
    // 빨려들어가는 글리치 반영
    glitch = mode === 'intro-suck' ? intro.glitch * GLITCH_MAX : 0;
    updateTweens(dt);
    vhs.render(hub.scene, hub.camera, t, glitch, intro.overlayScene);
    return;
  }

  if (mode === 'hub' || mode === 'zooming' || mode === 'returning') {
    if (mode === 'hub') {
      if (isDragging) {
        canvas.style.cursor = 'grabbing';
      } else {
        hub.hovered = pointerInside && !isTouch ? hub.pick(pointer) : -1;
        ui.setHot(hub.hovered);
        canvas.style.cursor = hub.hovered >= 0 ? 'grab' : '';
      }
      hub.parallax.set(
        pointerInside && !isDragging ? pointer.x : 0,
        pointerInside && !isDragging ? pointer.y : 0
      );
    } else {
      ui.setHot(-1);
      canvas.style.cursor = '';
    }
    hub.update(t, dt, mode);
    updateTimeTags();
    updatePlayBtns();
    updateTweens(dt);
    vhs.render(hub.scene, hub.camera, t, glitch);
  } else {
    const world = hub.entries[active].world;
    world.setAspect(window.innerWidth / window.innerHeight);
    world.update(t, dt);
    updateTweens(dt);
    ui.tick(t);
    vhs.render(world.scene, world.camera, t, glitch);
  }
});
