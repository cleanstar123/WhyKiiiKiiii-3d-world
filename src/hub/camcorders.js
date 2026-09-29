import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { toon, withOutline } from '../core/toon.js';

const INK = 0x2a1f4a;
const SCREEN_W = 1.08;
const SCREEN_H = SCREEN_W * 0.75;

function part(geometry, color, outline = 0.035) {
  const mesh = new THREE.Mesh(geometry, toon(color));
  return outline ? withOutline(mesh, outline) : mesh;
}

// 캠코더 렌즈 — 배럴이 로컬 +X 방향을 향한다.
// 포커스 링 + 내부 원소 링 + 유리 + 반사광 포함
function lens(radius, length, trim, glassColor = INK) {
  const g = new THREE.Group();

  // 바깥쪽 포커스 링 (배럴보다 넓고, 뒤쪽에 위치)
  const focusRing = part(
    new THREE.CylinderGeometry(radius * 1.27, radius * 1.27, length * 0.22, 20),
    trim, 0.015
  );
  focusRing.rotation.z = Math.PI / 2;
  focusRing.position.x = -length * 0.18;
  g.add(focusRing);

  // 메인 배럴
  const barrel = part(new THREE.CylinderGeometry(radius, radius * 1.1, length, 20), trim);
  barrel.rotation.z = Math.PI / 2;
  g.add(barrel);

  // 앞면 유리 (어두운 원)
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.78, 24),
    new THREE.MeshBasicMaterial({ color: glassColor })
  );
  glass.rotation.y = Math.PI / 2;
  glass.position.x = length / 2 + 0.005;
  g.add(glass);

  // 내부 렌즈 원소 링
  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.52, radius * 0.76, 24),
    new THREE.MeshBasicMaterial({ color: 0x180e30, side: THREE.DoubleSide })
  );
  innerRing.rotation.y = Math.PI / 2;
  innerRing.position.x = length / 2 + 0.007;
  g.add(innerRing);

  // 렌즈 반사광
  const shine = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.17, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  shine.rotation.y = Math.PI / 2;
  shine.position.set(length / 2 + 0.012, radius * 0.28, radius * 0.22);
  g.add(shine);

  return g;
}

function screenMesh() {
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W, SCREEN_H));
  screen.userData.isScreen = true;
  return screen;
}

// ──────────────────────────────────────────────
// Sony Handycam DCR-TRV 스타일 — 가로형, 옆으로 펼친 LCD
// ──────────────────────────────────────────────
function buildHandycam(p) {
  const group = new THREE.Group();

  // 메인 바디
  group.add(part(new RoundedBoxGeometry(1.9, 1.0, 0.9, 3, 0.18), p.body));

  // 오른쪽 고무 그립 구역
  const grip = part(new RoundedBoxGeometry(0.52, 0.88, 0.84, 2, 0.1), p.accent, 0.02);
  grip.position.set(0.69, 0, 0);
  group.add(grip);

  // 렌즈 어셈블리
  const l = lens(0.36, 0.58, p.trim);
  l.position.set(1.18, 0.06, 0);
  group.add(l);

  // 스테레오 마이크 (상단 앞쪽)
  const mic = part(new RoundedBoxGeometry(0.28, 0.1, 0.14, 2, 0.03), p.trim, 0.01);
  mic.position.set(0.68, 0.58, 0.12);
  group.add(mic);

  // 뷰파인더 튜브
  const vf = part(new THREE.CylinderGeometry(0.13, 0.15, 0.5, 12), p.trim);
  vf.rotation.z = Math.PI / 2;
  vf.position.set(-0.76, 0.64, -0.15);
  group.add(vf);

  // 눈컵 고무 후드
  const eyecup = part(new THREE.CylinderGeometry(0.18, 0.13, 0.09, 12), INK, 0.01);
  eyecup.rotation.z = Math.PI / 2;
  eyecup.position.set(-1.02, 0.64, -0.15);
  group.add(eyecup);

  // 줌 레버 (상단)
  const zoomLever = part(new RoundedBoxGeometry(0.34, 0.07, 0.2, 2, 0.025), p.trim, 0.015);
  zoomLever.position.set(0.42, 0.565, 0.08);
  group.add(zoomLever);

  // REC 버튼 (빨간색)
  const recButton = part(new THREE.CylinderGeometry(0.092, 0.092, 0.075, 12), 0xff2e2e, 0.02);
  recButton.position.set(0.18, 0.57, 0.09);
  group.add(recButton);

  // 모드 전환 버튼
  const modeBtn = part(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10), p.trim, 0.01);
  modeBtn.position.set(-0.12, 0.56, 0.08);
  group.add(modeBtn);

  // 배터리·카세트 도어 (뒷면)
  const battDoor = part(new RoundedBoxGeometry(0.62, 0.7, 0.065, 2, 0.03), p.trim, 0.02);
  battDoor.position.set(-0.52, 0.0, -0.5);
  group.add(battDoor);

  // 손목 스트랩
  const strap = part(new RoundedBoxGeometry(1.2, 0.44, 0.12, 2, 0.05), p.accent);
  strap.position.set(0.1, -0.02, -0.52);
  group.add(strap);

  // 펼쳐진 LCD 패널
  const panel = new THREE.Group();
  panel.position.set(-0.08, 0.04, 0.58);
  panel.rotation.y = -0.12;
  panel.add(part(new RoundedBoxGeometry(SCREEN_W + 0.16, SCREEN_H + 0.16, 0.08, 2, 0.03), p.trim));
  const screen = screenMesh();
  screen.position.z = 0.045;
  panel.add(screen);
  group.add(panel);

  // LCD 힌지
  const hinge = part(new THREE.CylinderGeometry(0.06, 0.06, 0.72, 10), p.trim, 0.015);
  hinge.position.set(-0.72, 0.04, 0.5);
  group.add(hinge);

  return { group, screen };
}

// ──────────────────────────────────────────────
// JVC GR 어깨 탑재형 VHS — 대형 바디, 옆면 모니터
// ──────────────────────────────────────────────
function buildVhs(p) {
  const group = new THREE.Group();

  // 메인 바디
  group.add(part(new RoundedBoxGeometry(2.5, 1.25, 1.1, 3, 0.14), p.body));

  // 액센트 줄무늬
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.12, 1.12), toon(p.accent));
  stripe.position.y = -0.34;
  group.add(stripe);

  // 카세트 투입구 도어 (상단)
  const door = part(new RoundedBoxGeometry(1.12, 0.065, 0.76, 2, 0.03), p.trim, 0.015);
  door.position.set(0.12, 0.665, 0.02);
  group.add(door);

  // 도어 릴리즈 버튼
  const release = part(new THREE.CylinderGeometry(0.062, 0.062, 0.055, 10), p.accent, 0.01);
  release.position.set(0.66, 0.71, 0.18);
  group.add(release);

  // 상단 손잡이 아치
  const handle = part(new THREE.TorusGeometry(0.62, 0.1, 8, 24, Math.PI), p.trim, 0.025);
  handle.position.set(0.1, 0.6, 0);
  group.add(handle);

  // 손잡이 고무 그립
  const handleGrip = part(new RoundedBoxGeometry(0.68, 0.21, 0.21, 2, 0.05), p.accent, 0.015);
  handleGrip.position.set(0.1, 1.21, 0);
  group.add(handleGrip);

  // 렌즈 어셈블리
  const l = lens(0.46, 0.58, p.trim);
  l.position.set(1.47, 0.02, 0);
  group.add(l);

  // 아이리스·포커스 링 (렌즈 뒤쪽)
  const irisRing = part(new THREE.CylinderGeometry(0.55, 0.55, 0.2, 20), p.body, 0.015);
  irisRing.rotation.z = Math.PI / 2;
  irisRing.position.set(1.12, 0.02, 0);
  group.add(irisRing);

  // 렌즈 후드 (열린 원통)
  const hood = part(new THREE.CylinderGeometry(0.58, 0.5, 0.2, 20, 1, true), p.trim, 0.02);
  hood.material.side = THREE.DoubleSide;
  hood.rotation.z = Math.PI / 2;
  hood.position.set(1.82, 0.02, 0);
  group.add(hood);

  // 뷰파인더 (왼쪽 상단)
  const vf = part(new THREE.CylinderGeometry(0.17, 0.2, 0.78, 12), p.trim);
  vf.rotation.z = Math.PI / 2;
  vf.position.set(-1.1, 0.78, 0.35);
  group.add(vf);

  // 눈컵 고무
  const eyecup = part(new THREE.CylinderGeometry(0.23, 0.17, 0.1, 12), INK, 0.01);
  eyecup.rotation.z = Math.PI / 2;
  eyecup.position.set(-1.52, 0.78, 0.35);
  group.add(eyecup);

  // REC 표시 램프 (깜빡임)
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3b3b })
  );
  lamp.position.set(1.08, 0.68, 0.38);
  lamp.userData.recLamp = true;
  group.add(lamp);

  // 숄더 패드 (하단)
  const shoulder = part(new RoundedBoxGeometry(1.7, 0.065, 0.9, 2, 0.03), p.accent, 0.01);
  shoulder.position.set(0.1, -0.675, 0);
  group.add(shoulder);

  // 앞면 조작 버튼 2개
  [-0.08, 0.2].forEach((x, idx) => {
    const btn = part(
      new THREE.CylinderGeometry(0.052, 0.052, 0.06, 10),
      idx === 0 ? p.accent : p.trim,
      0.01
    );
    btn.position.set(x, -0.12, 0.57);
    group.add(btn);
  });

  // 옆면 모니터 베젤 + 스크린
  const bezel = part(new RoundedBoxGeometry(SCREEN_W + 0.18, SCREEN_H + 0.18, 0.08, 2, 0.03), INK, 0);
  bezel.position.set(-0.25, 0.08, 0.56);
  group.add(bezel);
  const screen = screenMesh();
  screen.position.set(-0.25, 0.08, 0.605);
  group.add(screen);

  return { group, screen };
}

// ──────────────────────────────────────────────
// Canon Optura / Sony DCR-PC 스타일 컴팩트 디지털 캠코더 — 납작한 바디, 뒷면 LCD
// ──────────────────────────────────────────────
function buildDigicam(p) {
  const group = new THREE.Group();

  // 메인 바디 (이전보다 약간 더 두껍게)
  group.add(part(new RoundedBoxGeometry(1.75, 1.15, 0.48, 3, 0.14), p.body));

  // 오른쪽 그립 돌출부
  const grip = part(new RoundedBoxGeometry(0.42, 1.02, 0.54, 2, 0.08), p.accent, 0.015);
  grip.position.set(0.67, -0.02, 0.04);
  group.add(grip);

  // 앞면 렌즈 배럴 (Z축 방향, 측면 각도에서 보임)
  const lensBarrel = part(new THREE.CylinderGeometry(0.22, 0.24, 0.18, 20), p.trim, 0.015);
  lensBarrel.rotation.x = Math.PI / 2;
  lensBarrel.position.set(-0.3, 0.18, -0.3);
  group.add(lensBarrel);

  const lensGlass = new THREE.Mesh(
    new THREE.CircleGeometry(0.17, 24),
    new THREE.MeshBasicMaterial({ color: INK })
  );
  lensGlass.rotation.x = Math.PI;
  lensGlass.position.set(-0.3, 0.18, -0.4);
  group.add(lensGlass);

  const lensInnerRing = new THREE.Mesh(
    new THREE.RingGeometry(0.1, 0.17, 20),
    new THREE.MeshBasicMaterial({ color: 0x18102e, side: THREE.DoubleSide })
  );
  lensInnerRing.rotation.x = Math.PI;
  lensInnerRing.position.set(-0.3, 0.18, -0.402);
  group.add(lensInnerRing);

  const lensShine = new THREE.Mesh(
    new THREE.CircleGeometry(0.055, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  lensShine.rotation.x = Math.PI;
  lensShine.position.set(-0.22, 0.24, -0.405);
  group.add(lensShine);

  // 플래시 유닛
  const flash = part(new RoundedBoxGeometry(0.22, 0.13, 0.065, 2, 0.025), 0xfffcf0, 0.01);
  flash.position.set(-0.3, -0.04, -0.27);
  group.add(flash);

  // 뒷면 LCD 베젤 + 스크린
  const bezel = part(new RoundedBoxGeometry(SCREEN_W + 0.12, SCREEN_H + 0.12, 0.04, 2, 0.015), INK, 0);
  bezel.position.set(-0.2, 0, 0.25);
  group.add(bezel);
  const screen = screenMesh();
  screen.position.set(-0.2, 0, 0.275);
  group.add(screen);

  // D-패드
  const pad = part(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16), p.accent, 0.02);
  pad.rotation.x = Math.PI / 2;
  pad.position.set(0.62, -0.06, 0.25);
  group.add(pad);
  [0.28, -0.38].forEach((y) => {
    const b = part(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12), p.trim, 0.015);
    b.rotation.x = Math.PI / 2;
    b.position.set(0.62, y, 0.25);
    group.add(b);
  });

  // 셔터 버튼 (상단)
  const shutter = part(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 14), p.accent, 0.02);
  shutter.position.set(0.5, 0.63, 0);
  group.add(shutter);

  // 모드 다이얼 (상단)
  const dial = part(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 16), p.trim, 0.02);
  dial.position.set(0.1, 0.64, 0);
  group.add(dial);

  // 줌 레버 (상단)
  const zoomLever = part(new RoundedBoxGeometry(0.28, 0.07, 0.16, 2, 0.025), p.trim, 0.015);
  zoomLever.position.set(-0.18, 0.64, 0);
  group.add(zoomLever);

  // 손목 스트랩 링
  const strapRing = part(new THREE.TorusGeometry(0.16, 0.04, 8, 16), p.accent, 0.015);
  strapRing.position.set(-0.95, 0.35, 0);
  strapRing.rotation.y = Math.PI / 2;
  group.add(strapRing);

  return { group, screen };
}

// ──────────────────────────────────────────────
// Sony DCR-TRV900 / Panasonic GS 시리즈 MiniDV 팜코더 — 세로형
// ──────────────────────────────────────────────
function buildMiniDV(p) {
  const group = new THREE.Group();

  // 메인 바디 (세로/포트레이트 비율)
  group.add(part(new RoundedBoxGeometry(1.3, 1.75, 0.62, 3, 0.16), p.body));

  // 하단 그립 구역 (고무 처리)
  const grip = part(new RoundedBoxGeometry(1.22, 0.72, 0.58, 2, 0.1), p.accent, 0.02);
  grip.position.set(0, -0.52, 0);
  group.add(grip);

  // 렌즈 어셈블리 (우상단, +X 방향)
  const l = lens(0.3, 0.52, p.trim);
  l.position.set(0.68, 0.46, 0.04);
  group.add(l);

  // 내장 마이크 (상단)
  const mic = part(new RoundedBoxGeometry(0.22, 0.1, 0.14, 2, 0.03), p.trim, 0.01);
  mic.position.set(0.18, 0.96, 0.08);
  group.add(mic);

  // 뷰파인더 튜브 (좌상단)
  const vf = part(new THREE.CylinderGeometry(0.11, 0.13, 0.36, 12), p.trim, 0.015);
  vf.rotation.z = Math.PI / 2;
  vf.position.set(-0.64, 0.67, -0.12);
  group.add(vf);

  // 뷰파인더 눈컵
  const eyecup = part(new THREE.CylinderGeometry(0.16, 0.11, 0.08, 12), INK, 0.01);
  eyecup.rotation.z = Math.PI / 2;
  eyecup.position.set(-0.84, 0.67, -0.12);
  group.add(eyecup);

  // REC 버튼 (오른쪽 측면)
  const recButton = part(new THREE.CylinderGeometry(0.08, 0.08, 0.07, 12), 0xff2e2e, 0.02);
  recButton.rotation.z = Math.PI / 2;
  recButton.position.set(0.68, 0.22, 0.1);
  group.add(recButton);

  // REC 표시 램프 (깜빡임)
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xff3b3b })
  );
  lamp.position.set(0.68, 0.38, 0.12);
  lamp.userData.recLamp = true;
  group.add(lamp);

  // 줌 레버 (오른쪽 측면)
  const zoomLever = part(new RoundedBoxGeometry(0.07, 0.32, 0.18, 2, 0.025), p.trim, 0.015);
  zoomLever.position.set(0.68, 0.0, 0.1);
  group.add(zoomLever);

  // 배터리 도어 (뒷면 하단)
  const battDoor = part(new RoundedBoxGeometry(0.88, 0.55, 0.065, 2, 0.028), p.trim, 0.02);
  battDoor.position.set(0, -0.52, -0.33);
  group.add(battDoor);

  // 카세트 도어 (뒷면 상단)
  const cassetteDoor = part(new RoundedBoxGeometry(0.82, 0.55, 0.065, 2, 0.028), p.trim, 0.015);
  cassetteDoor.position.set(0, 0.3, -0.33);
  group.add(cassetteDoor);

  // 손목 스트랩 링
  const strapRing = part(new THREE.TorusGeometry(0.11, 0.03, 8, 16), p.accent, 0.01);
  strapRing.rotation.y = Math.PI / 2;
  strapRing.position.set(0.68, -0.72, 0.08);
  group.add(strapRing);

  // 펼쳐진 LCD 패널 (+Z 면)
  const panel = new THREE.Group();
  panel.position.set(0.04, 0.12, 0.38);
  panel.rotation.y = -0.1;
  panel.add(part(new RoundedBoxGeometry(SCREEN_W + 0.14, SCREEN_H + 0.14, 0.07, 2, 0.028), p.trim));
  const screen = screenMesh();
  screen.position.z = 0.04;
  panel.add(screen);
  group.add(panel);

  // LCD 힌지
  const hinge = part(new THREE.CylinderGeometry(0.055, 0.055, 0.68, 10), p.trim, 0.012);
  hinge.position.set(-0.62, 0.12, 0.34);
  group.add(hinge);

  return { group, screen };
}

const builders = {
  handycam: buildHandycam,
  vhs: buildVhs,
  digicam: buildDigicam,
  minidv: buildMiniDV,
};

export function buildCamcorder(type, palette) {
  const build = builders[type];
  if (!build) throw new Error(`알 수 없는 캠코더 종류: ${type}`);
  return build(palette);
}
