import * as THREE from 'three';
import { buildSuitcase, LID_TOP_Y } from './suitcase.js';
import { buildTicket } from './ticket.js';
import { damp, animate, ease, smoothstep } from '../core/tween.js';

// 수트케이스 로컬 좌표 (0.05, 1.2, 0.75) × scale 1.5 + suitcaseRoot.y=-1.8
// → 월드 (0.075, 0, 1.125) : 티켓 초기 위치
const TICKET_WORLD_X = 0.075;
const TICKET_WORLD_Z = 1.125;

export class Intro {
  constructor({ scene, camera, quality, reducedMotion }) {
    this.scene = scene;
    this.camera = camera;
    this.quality = quality;
    this.reducedMotion = reducedMotion;

    this.state = 'name';
    this.raycaster = new THREE.Raycaster();
    this._hovered = false;
    this._hoverScale = 0;       // 처음엔 0 → 수트케이스 등장 후 1.5로 damp
    this._suitcaseShowing = false;
    this._glitch = 0;

    this._ticketDragging = false;
    this._ticketRotVelX = 0;
    this._ticketRotVelY = 0;
    this._ticketTargetRotY = 0.05;

    this._hintEl = document.getElementById('check-hint');
    this._hintEl.hidden = true;

    this._attendantSized = false;
    this._logoSized = false;

    this._flyActive = false;
    this._flyT = 0;
    this._flyDone = false;

    this.overlayScene = new THREE.Scene();
    this._buildObjects();
  }

  _buildObjects() {
    // ── 수트케이스: 처음엔 숨김 ──────────────────────────
    const { root, lidGroup } = buildSuitcase();
    this.suitcaseRoot = root;
    this.lidGroup = lidGroup;
    this.suitcaseRoot.position.y = -2.2; // 나중에 update()가 덮지만 초기값 맞춤
    this.suitcaseRoot.visible = false;
    this.suitcaseRoot.scale.setScalar(0);
    this.scene.add(root);

    // ── 티켓: 씬 직속 (수트케이스 자식 아님) ─────────────
    const { mesh, redraw, mat, tickBack } = buildTicket();
    this.ticketMesh = mesh;
    this.ticketRedraw = redraw;
    this.ticketMat = mat;
    this._ticketTickBack = tickBack;

    // 수트케이스가 보였을 때 티켓이 있어야 할 월드 위치
    this.ticketMesh.position.set(TICKET_WORLD_X, 0, TICKET_WORLD_Z);
    this.ticketMesh.rotation.set(-0.2, 0.05, 0.09);
    this.ticketMesh.renderOrder = 10;
    this.scene.add(this.ticketMesh);

    // ── 승무원 캐릭터: 3D 플레인 (VhsPass 그레인 영향받음) ──
    const atTex = new THREE.TextureLoader().load('/assets/images/FlightAttendant.png');
    atTex.colorSpace = THREE.SRGBColorSpace;
    this.attendantMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: atTex, transparent: true, alphaTest: 0.05 })
    );
    this.attendantMesh.renderOrder = 0;
    this.overlayScene.add(this.attendantMesh);

    // ── 인트로 상단 로고: 3D 플레인 ──────────────────────────
    const logoTex = new THREE.TextureLoader().load('/assets/images/IntroHeaderLogo.png');
    logoTex.colorSpace = THREE.SRGBColorSpace;
    this.logoMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, alphaTest: 0.05 })
    );
    this.logoMesh.renderOrder = 1;
    this.overlayScene.add(this.logoMesh);

  }

  async submitName(name, onDone) {
    if (this.state !== 'name') return;
    this.ticketRedraw(name);
    await new Promise((r) => setTimeout(r, 500));
    this._startFly(onDone);
  }

  _startFly(onDone) {
    // 티켓은 이미 씬 직속 → 현재 위치/회전만 기록
    this._flyStartPos = this.ticketMesh.position.clone();
    this._flyStartRotX = this.ticketMesh.rotation.x;
    this._flyStartRotZ = this.ticketMesh.rotation.z;

    this._flyActive = true;
    this._flyT = 0;
    this._flyDone = false;
    this._flyOnDone = onDone;
    this._flySpeed = this.reducedMotion ? 1.6 : 2.8;
    this._flyDir = new THREE.Vector3(
      (Math.random() > 0.5 ? 1 : -1) * (0.7 + Math.random() * 0.5),
      0.4 + Math.random() * 0.3,
      -0.4
    ).normalize();
  }

  _updateFly(dt) {
    if (!this._flyActive || this._flyDone) return;
    this._flyT += dt;
    const t = this._flyT;
    const s = this.reducedMotion ? 0.5 : 1;

    const d = this._flyDir.clone().multiplyScalar(t * this._flySpeed + t * t * 1.2);
    this.ticketMesh.position.copy(this._flyStartPos).add(d);

    this.ticketMesh.rotation.x = this._flyStartRotX + t * 3.2 * s;
    this.ticketMesh.rotation.z = this._flyStartRotZ + t * 2.0 * s;

    this.ticketMat.uniforms.uBend.value = Math.min(t * 0.3 * s, 0.18 * s);
    this.ticketMat.uniforms.uWave.value = t * 6;

    if (t > (this.reducedMotion ? 0.9 : 1.4)) {
      this._flyDone = true;
      this._flyActive = false;
      this.scene.remove(this.ticketMesh);
      this._showSuitcase();           // 수트케이스 등장
      this.state = 'check';
      this._showCheckHint();
      if (this._flyOnDone) this._flyOnDone();
    }
  }

  _showSuitcase() {
    this.suitcaseRoot.visible = true;
    this._suitcaseShowing = true;
    if (this.logoMesh) this.overlayScene.remove(this.logoMesh);
  }

  _showCheckHint() {
    this._hintEl.hidden = false;
    this._hintEl.classList.add('check-hint--visible');
  }

  _hideCheckHint() {
    this._hintEl.hidden = true;
    this._hintEl.classList.remove('check-hint--visible');
  }

  pick(ndc) {
    if (this.state !== 'check') return false;
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.intersectObject(this.suitcaseRoot, true).length > 0;
  }

  pickTicket(ndc) {
    if (this.state !== 'name') return false;
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.intersectObjects([this.ticketMesh], true).length > 0;
  }

  startTicketDrag() {
    this._ticketDragging = true;
    this._ticketRotVelX = 0;
    this._ticketRotVelY = 0;
  }

  moveTicketDrag(dx, dy) {
    const s = 0.007;
    this.ticketMesh.rotation.y += dx * s;
    this.ticketMesh.rotation.x += dy * s;
    this._ticketRotVelX = dy * s;
    this._ticketRotVelY = dx * s;
  }

  endTicketDrag() {
    this._ticketDragging = false;
    // 드롭 시점의 rotation.y에서 가장 가까운 안정 면(앞/뒤)을 타겟으로 설정
    const y = this.ticketMesh.rotation.y;
    const nearestFront = Math.round(y / (Math.PI * 2)) * Math.PI * 2;
    const nearestBack  = Math.round((y - Math.PI) / (Math.PI * 2)) * Math.PI * 2 + Math.PI;
    this._ticketTargetRotY = Math.abs(y - nearestFront) <= Math.abs(y - nearestBack)
      ? nearestFront + 0.05
      : nearestBack;
  }

  playSuckIn(onGlitchPeak) {
    if (this.state !== 'check') return Promise.resolve();
    this.state = 'suck';
    this._hideCheckHint();
    return this._animateSuckIn(onGlitchPeak);
  }

  async _animateSuckIn(onGlitchPeak) {
    const s = this.reducedMotion ? 0.4 : 1;

    await animate(0.55 * s, (e) => {
      this.lidGroup.rotation.x = -e * Math.PI * 0.8;
    }, ease.outCubic);

    const startPos = this.camera.position.clone();
    const targetPos = new THREE.Vector3(
      this.suitcaseRoot.position.x,
      this.suitcaseRoot.position.y + 1.5,
      this.suitcaseRoot.position.z
    );

    await animate(1.1 * s, (e, p) => {
      this.camera.position.lerpVectors(startPos, targetPos, e);
      this.camera.rotation.z = Math.sin(p * Math.PI * 2) * 0.12 * s;
      this._glitch = smoothstep(0.3, 1.0, p);
    }, ease.inCubic);

    if (onGlitchPeak) onGlitchPeak();
    this.state = 'done';
  }

  get glitch() { return this._glitch; }

  _updateHintPos() {
    if (this._hintEl.hidden) return;
    const v = new THREE.Vector3();
    this.suitcaseRoot.getWorldPosition(v);
    v.y += LID_TOP_Y * 1.5 + 0.8;
    v.project(this.camera);
    if (v.z > 1) { this._hintEl.style.opacity = '0'; return; }
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    this._hintEl.style.left = `${x}px`;
    this._hintEl.style.top = `${y}px`;
  }

  update(time, dt) {
    // ── 뒷면 동영상 캔버스 갱신 ─────────────────────────────
    if (this._ticketTickBack) this._ticketTickBack();

    // ── 승무원 3D 플레인: 첫 프레임에 카메라 기준으로 크기 결정 ──
    if (!this._attendantSized && this.attendantMesh) {
      this.camera.updateMatrixWorld();
      const refZ = new THREE.Vector3(TICKET_WORLD_X, 0, TICKET_WORLD_Z + 0.25)
        .project(this.camera).z;
      const bl = new THREE.Vector3(-1, -1, refZ).unproject(this.camera);
      const tl = new THREE.Vector3(-1,  1, refZ).unproject(this.camera);
      const atH = (tl.y - bl.y) * 0.80;
      const aspect = 1; // 정사각형; 텍스처 로드 후 실제 비율로 보정은 onLoad에서
      this.attendantMesh.geometry.dispose();
      this.attendantMesh.geometry = new THREE.PlaneGeometry(atH * aspect, atH);
      this._attendantBaseX = bl.x + atH * 0.32;
      this._attendantBaseY = bl.y + atH * 0.5 - atH * 0.08;
      this.attendantMesh.position.set(
        this._attendantBaseX,
        this._attendantBaseY,
        TICKET_WORLD_Z + 0.25
      );
      // 텍스처 로드 완료 시 실제 이미지 비율 적용
      const mat = this.attendantMesh.material;
      if (mat.map?.image?.complete && mat.map.image.naturalWidth) {
        const imgAspect = mat.map.image.naturalWidth / mat.map.image.naturalHeight;
        this.attendantMesh.geometry.dispose();
        this.attendantMesh.geometry = new THREE.PlaneGeometry(atH * imgAspect, atH);
        this.attendantMesh.position.x = bl.x + (atH * imgAspect) * 0.5;
        this._attendantBaseX = this.attendantMesh.position.x;
        this._attendantSized = true;
      } else {
        mat.map?.addEventListener?.('update', () => {});
        // 다음 프레임에 재시도
      }
    }
    if (this._attendantSized && this.attendantMesh && (this.state === 'name' || this.state === 'check')) {
      this.attendantMesh.position.y = this._attendantBaseY + Math.sin(time * 0.8 + 1.0) * 0.07;
    }

    // ── 인트로 로고 3D 플레인: 첫 프레임에 상단 가운데 배치 ──
    if (!this._logoSized && this.logoMesh) {
      this.camera.updateMatrixWorld();
      const refZ = new THREE.Vector3(0, 0, TICKET_WORLD_Z).project(this.camera).z;
      const tc = new THREE.Vector3( 0,  1, refZ).unproject(this.camera); // 상단 가운데
      const bc = new THREE.Vector3( 0, -1, refZ).unproject(this.camera); // 하단 가운데
      const screenH = tc.y - bc.y;
      const logoH = screenH * 0.14; // 화면 높이의 14%
      const mat = this.logoMesh.material;
      if (mat.map?.image?.complete && mat.map.image.naturalWidth) {
        const imgAspect = mat.map.image.naturalWidth / mat.map.image.naturalHeight;
        this.logoMesh.geometry.dispose();
        this.logoMesh.geometry = new THREE.PlaneGeometry(logoH * imgAspect, logoH);
        this._logoBaseY = tc.y - logoH * 0.65;
        this.logoMesh.position.set(0, this._logoBaseY, TICKET_WORLD_Z);
        this._logoSized = true;
      }
    }
    if (this._logoSized && this.logoMesh && this.state === 'name') {
      this.logoMesh.position.y = this._logoBaseY + Math.sin(time * 0.6) * 0.04;
    }

    // ── 수트케이스 부유 (보이든 안 보이든 위치는 계속 갱신) ──
    this.suitcaseRoot.position.y = -2.2 + Math.sin(time * 0.8) * 0.1;
    this.suitcaseRoot.rotation.y = Math.sin(time * 0.4) * 0.08;

    // ── 티켓 독립 부유 (name 상태, 날기 전) ──────────────
    if (this.state === 'name' && !this._flyActive) {
      this.ticketMesh.position.y = Math.sin(time * 0.8) * 0.12;
      this.ticketMesh.rotation.z = 0.09 + Math.sin(time * 0.9) * 0.025;
      if (!this._ticketDragging) {
        this._ticketRotVelX *= 0.92;
        this._ticketRotVelY *= 0.92;
        this.ticketMesh.rotation.x += this._ticketRotVelX;
        this.ticketMesh.rotation.y += this._ticketRotVelY;
        this.ticketMesh.rotation.x += (-0.2 - this.ticketMesh.rotation.x) * 0.025;
        this.ticketMesh.rotation.y += (this._ticketTargetRotY - this.ticketMesh.rotation.y) * 0.025;
      }
    }

    this._updateFly(dt);

    // ── 수트케이스 scale (등장 전엔 0 고정, 등장 후 1.5로 damp) ──
    if (this._suitcaseShowing) {
      const targetScale = this._hovered ? 1.5 * 1.07 : 1.5;
      this._hoverScale = damp(this._hoverScale, targetScale, 10, dt);
      this.suitcaseRoot.scale.setScalar(this._hoverScale);
    }

    this._updateHintPos();
  }

  setHovered(hovered) { this._hovered = hovered; }

  dispose() {
    this.scene.remove(this.suitcaseRoot);
    this.scene.remove(this.ticketMesh);
    if (this.attendantMesh) { this.overlayScene.remove(this.attendantMesh); this.attendantMesh = null; }
    if (this.logoMesh) { this.overlayScene.remove(this.logoMesh); this.logoMesh = null; }
    this._hideCheckHint();
  }
}
