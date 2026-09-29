import * as THREE from 'three';
import { buildCamcorder } from './camcorders.js';
import { createLcd } from './lcdMaterial.js';
import { toon } from '../core/toon.js';
import { sparkleTexture } from '../core/textures.js';
import { damp } from '../core/tween.js';

const SCREEN_ASPECT = 4 / 3;

const SKY_DEFAULT = { top: 0xff9fd0, mid: 0xc4b2ff, low: 0x9fe9f5, blob: 0xfff6a0 };


export class Hub {
  constructor({ renderer, zones, quality }) {
    this.renderer = renderer;
    this.quality = quality;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xd9c4ff, 18, 48);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 150);
    this.homePos = new THREE.Vector3(0, 0, 12);
    this.lookTarget = new THREE.Vector3(0, 0, 0);
    this.parallax = new THREE.Vector2();
    this.hovered = -1;
    this.raycaster = new THREE.Raycaster();
    this.pickables = [];
    this.frame = 0;
    this.started = false;

    this._buildEnvironment();
    this.entries = zones.map((zone, i) => this._buildEntry(zone, i));
  }

  _buildEnvironment() {
    const scene = this.scene;

    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(80, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          cTop: { value: new THREE.Color(SKY_DEFAULT.top) },
          cMid: { value: new THREE.Color(SKY_DEFAULT.mid) },
          cLow: { value: new THREE.Color(SKY_DEFAULT.low) },
          cBlob: { value: new THREE.Color(SKY_DEFAULT.blob) },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 cTop, cMid, cLow, cBlob;
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            float h = d.y * 0.5 + 0.5;
            vec3 col = mix(cLow, cMid, smoothstep(0.25, 0.55, h));
            col = mix(col, cTop, smoothstep(0.55, 0.9, h));
            float blob = sin(d.x * 3.0 + uTime * 0.15) * sin(d.y * 4.0 - uTime * 0.1) * sin(d.z * 3.0 + uTime * 0.12);
            col = mix(col, cBlob, smoothstep(0.2, 0.6, blob) * 0.45);
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }
        `,
      })
    );
    this.sky.renderOrder = -1;
    scene.add(this.sky);

    this._skyDefault = {
      top: new THREE.Color(SKY_DEFAULT.top),
      mid: new THREE.Color(SKY_DEFAULT.mid),
      low: new THREE.Color(SKY_DEFAULT.low),
      blob: new THREE.Color(SKY_DEFAULT.blob),
    };

    scene.add(new THREE.HemisphereLight(0xfff0fa, 0x8fd8ff, 1.4));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(4, 7, 6);
    scene.add(sun);

    const count = this.quality.low ? 180 : 360;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 24;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30 - 4;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.8, depthWrite: false }));
    scene.add(this.dust);

    const tex = sparkleTexture();
    const tints = [0xffffff, 0xfff27a, 0x7fe3f0, 0xff8fc7];
    this.stickers = [];
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: tints[i % tints.length], transparent: true, depthWrite: false }));
      s.position.set((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 12, -3 - Math.random() * 10);
      s.userData.base = 0.35 + Math.random() * 0.5;
      s.userData.phase = Math.random() * 10;
      this.stickers.push(s);
      scene.add(s);
    }

    this.bubbles = [];
    const bubbleColors = [0xff8fc7, 0x7fe3f0, 0xfff27a, 0xb9a6ff];
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.4 + Math.random() * 0.7, 0),
        toon(bubbleColors[i % bubbleColors.length], { transparent: true, opacity: 0.55 })
      );
      m.position.set((Math.random() - 0.5) * 26, (Math.random() - 0.5) * 14, -8 - Math.random() * 10);
      m.userData.speed = 0.2 + Math.random() * 0.3;
      this.bubbles.push(m);
      scene.add(m);
    }
  }

  _buildEntry(zone, index) {
    if (zone.sky && !(zone.sky.top instanceof THREE.Color)) {
      zone.sky = {
        top: new THREE.Color(zone.sky.top),
        mid: new THREE.Color(zone.sky.mid),
        low: new THREE.Color(zone.sky.low),
        blob: new THREE.Color(zone.sky.blob),
      };
    }

    const rtW = this.quality.low ? 256 : 384;
    const rt = new THREE.WebGLRenderTarget(rtW, Math.round(rtW / SCREEN_ASPECT), { type: THREE.HalfFloatType });
    const world = zone.create();
    const cam = buildCamcorder(zone.camcorder, zone.palette);
    const lcd = createLcd({ sceneTexture: rt.texture, zone });
    cam.screen.material = lcd.material;

    const root = new THREE.Group();
    root.add(cam.group);
    this.scene.add(root);

    let recLamp = null;
    cam.group.traverse((o) => {
      if (o.isMesh && !o.userData.isOutline) {
        o.userData.entryIndex = index;
        this.pickables.push(o);
      }
      if (o.userData.recLamp) recLamp = o;
    });

    return {
      zone, world, rt, lcd, root, recLamp,
      model: cam.group,
      screen: cam.screen,
      home: new THREE.Vector3(),
      baseScale: zone.hubScale ?? 1,
      layoutScale: 1,
      phase: index * 1.7,
      hover: 0,
      motion: 1,
      frozen: false,
      glitch: 0,
      userRotX: 0,
      userRotY: 0,
      dragging: false,
      dragLerp: 1,
    };
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    const n = this.entries.length;
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    let halfW, halfH;
    if (aspect >= 0.9) {
      const spacing = 3.4;
      this.entries.forEach((e, i) => {
        e.home.set((i - (n - 1) / 2) * spacing, i % 2 ? -0.6 : 0.7, i % 2 ? 0.4 : -0.4);
        e.layoutScale = 0.78;
      });
      halfW = ((n - 1) / 2) * spacing + 2.4;
      halfH = 2.4;
    } else {
      const spacing = 2.4;
      this.entries.forEach((e, i) => {
        e.home.set(i % 2 ? 0.7 : -0.7, ((n - 1) / 2 - i) * spacing, i % 2 ? 0.4 : -0.4);
        e.layoutScale = 0.7;
      });
      halfW = 2.0;
      halfH = ((n - 1) / 2) * spacing + 1.2;
    }
    halfH += aspect >= 0.9 ? 1.0 : 1.6;
    const dist = Math.max(halfH / tan, halfW / (tan * aspect));
    this.homePos.set(0, 0, dist);
    if (!this.started) {
      this.camera.position.copy(this.homePos);
      this.camera.lookAt(this.lookTarget);
      this.started = true;
    }
  }

  pick(ndc) {
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObjects(this.pickables, false)[0];
    return hit ? hit.object.userData.entryIndex : -1;
  }

  setFrozen(index, frozen) {
    this.entries[index].frozen = frozen;
  }

  startDrag(index) {
    if (index < 0 || index >= this.entries.length) return;
    this.entries[index].dragging = true;
  }

  dragMove(dx, dy) {
    const sens = 0.012;
    for (const e of this.entries) {
      if (!e.dragging) continue;
      e.userRotY += dx * sens;
      e.userRotX += dy * sens;
    }
  }

  endDrag() {
    for (const e of this.entries) e.dragging = false;
  }

  // intro → hub 전환 시 캠코더를 숨기거나 팝업 등장시킨다
  showCamcorders(visible) {
    this.entries.forEach((e, i) => {
        if (visible) {
          e.root.visible = true;
          // 약간 시차를 두고 scale 0 → 1 로 팝업
          e.root.scale.setScalar(0);
          e._popT = -(i * 0.12); // 마이너스 = 지연
        } else {
          e.root.visible = false;
          e._popT = null;
        }
    });
  }

  getScreenFrame(index, out) {
    const s = this.entries[index].screen;
    s.updateWorldMatrix(true, false);
    s.getWorldPosition(out.pos);
    s.getWorldQuaternion(out.quat);
    out.normal.set(0, 0, 1).applyQuaternion(out.quat);
    s.getWorldScale(out.scale);
    out.width = s.geometry.parameters.width * out.scale.x;
    out.height = s.geometry.parameters.height * out.scale.y;
    return out;
  }

  update(time, dt, mode) {
    const motionAmount = this.quality.reducedMotion ? 0.3 : 1;
    this.sky.material.uniforms.uTime.value = time;

    const skyPal = (this.hovered >= 0 && mode === 'hub' && this.entries[this.hovered].zone.sky)
      ? this.entries[this.hovered].zone.sky
      : this._skyDefault;
    const sk = this.sky.material.uniforms;
    const skSpeed = Math.min(1, dt * 2.5);
    sk.cTop.value.lerp(skyPal.top, skSpeed);
    sk.cMid.value.lerp(skyPal.mid, skSpeed);
    sk.cLow.value.lerp(skyPal.low, skSpeed);
    sk.cBlob.value.lerp(skyPal.blob, skSpeed);

    this.dust.rotation.y = time * 0.01;
    for (const s of this.stickers) {
      const k = 0.6 + 0.4 * Math.sin(time * 2 + s.userData.phase);
      s.scale.setScalar(s.userData.base * k);
      s.material.rotation = time * 0.3 + s.userData.phase;
    }
    for (const b of this.bubbles) {
      b.position.y += b.userData.speed * dt * motionAmount;
      if (b.position.y > 9) b.position.y = -9;
      b.rotation.x += dt * 0.2;
      b.rotation.y += dt * 0.3;
    }

    this.entries.forEach((e, i) => {
      e.motion = damp(e.motion, e.frozen ? 0 : 1, 4, dt);
      e.dragLerp = damp(e.dragLerp, e.dragging ? 0 : 1, 6, dt);
      const isHovered = i === this.hovered && mode === 'hub' && !e.dragging;
      e.hover = damp(e.hover, isHovered ? 1 : 0, 12, dt);
      const m = e.motion * motionAmount;
      const fm = m * e.dragLerp;
      e.root.position.copy(e.home);
      e.root.position.y += Math.sin(time * 0.9 + e.phase) * 0.22 * fm;
      if (!e.dragging) {
        e.userRotX = damp(e.userRotX, 0, 1.2, dt);
        e.userRotY = damp(e.userRotY, 0, 1.2, dt);
      }
      e.model.rotation.set(
        Math.sin(time * 0.7 + e.phase * 1.3) * 0.08 * fm + e.userRotX,
        Math.sin(time * 0.5 + e.phase) * 0.3 * fm - e.home.x * 0.045 * e.dragLerp + e.userRotY,
        Math.sin(time * 0.6 + e.phase * 0.7) * 0.05 * fm
      );
      // 팝업 등장 애니메이션 (_popT !== null 이면 진행 중)
      if (e._popT !== null && e._popT !== undefined) {
        e._popT += dt;
        const p = Math.max(0, Math.min(e._popT / 0.45, 1));
        const pop = p < 1 ? p * p * (3 - 2 * p) : 1; // smoothstep
        e.root.scale.setScalar(e.baseScale * e.layoutScale * pop * (1 + 0.07 * e.hover));
        if (p >= 1) e._popT = null;
      } else {
        e.root.scale.setScalar(e.baseScale * e.layoutScale * (1 + 0.07 * e.hover));
      }
      if (e.recLamp) e.recLamp.visible = Math.floor(time * 2) % 2 === 0;
      e.lcd.update(time, e.glitch, e.hover);
    });

    // 인트로 중에는 캠코더 렌더타깃 업데이트 생략 (성능)
    if (mode !== 'intro') {
      const every = this.quality.low ? 2 : 1;
      this.entries.forEach((e, i) => {
        e.world.update(time, dt);
        if ((this.frame + i) % every !== 0) return;
        e.world.setAspect(SCREEN_ASPECT);
        this.renderer.setRenderTarget(e.rt);
        this.renderer.render(e.world.scene, e.world.camera);
      });
      this.renderer.setRenderTarget(null);
    }

    if (mode === 'hub') {
      const tx = this.homePos.x + this.parallax.x * 0.9 * motionAmount;
      const ty = this.homePos.y + this.parallax.y * 0.5 * motionAmount;
      const c = this.camera.position;
      c.set(damp(c.x, tx, 3, dt), damp(c.y, ty, 3, dt), damp(c.z, this.homePos.z, 3, dt));
      this.camera.lookAt(this.lookTarget);
    }
    this.frame++;
  }
}
