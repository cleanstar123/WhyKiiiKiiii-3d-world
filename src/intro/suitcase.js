import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// 힌트 위치 계산용 (수트케이스 상단 높이 추정)
export const LID_TOP_Y = 1.7;

// 뚜껑으로 간주할 노드 이름 후보 (Blender 관례 기준)
const LID_NAMES = ['Lid', 'lid', 'Top', 'top', 'Cover', 'cover', 'Upper', 'upper', 'Hood', 'hood'];

export function buildSuitcase() {
  const root = new THREE.Group();

  // lidGroup은 동기적으로 반환 → GLB 로드 후 뚜껑이 자식으로 편입됨
  // 위치는 로드 후 뚜껑 하단(힌지 라인)으로 재설정
  const lidGroup = new THREE.Group();
  root.add(lidGroup);

  new GLTFLoader().load(
    '/assets/models/suitcase.glb',
    (gltf) => {
      const model = gltf.scene;

      // ── 1. 크기 정규화: 가로 1.8 world units ─────────────
      const box0 = new THREE.Box3().setFromObject(model);
      const size = box0.getSize(new THREE.Vector3());
      const s = 2.0 / size.x;
      model.scale.setScalar(s);

      // ── 2. 바닥 y=0, x/z 중앙 정렬 ───────────────────────
      const box1 = new THREE.Box3().setFromObject(model);
      const c = box1.getCenter(new THREE.Vector3());
      model.position.set(-c.x, -box1.min.y, -c.z);
      root.add(model);
      root.updateMatrixWorld(true);

      // ── 3. 뚜껑 노드 탐색 ────────────────────────────────
      // 콘솔에서 노드 이름을 확인하려면: model.traverse(o => console.log(o.name))
      let lidNode = null;
      for (const name of LID_NAMES) {
        lidNode = model.getObjectByName(name);
        if (lidNode) break;
      }

      if (!lidNode) {
        // 뚜껑을 찾지 못하면 모든 노드 이름을 출력해 확인할 수 있게 함
        console.warn('[suitcase] 뚜껑 노드를 찾지 못했습니다. 아래 이름 중 하나를 LID_NAMES에 추가하세요:');
        model.traverse((o) => { if (o.name) console.log(' -', o.name); });
        return;
      }

      // ── 4. 뚜껑 월드 변환 저장 ───────────────────────────
      lidNode.updateWorldMatrix(true, false);
      const wPos   = new THREE.Vector3();
      const wQuat  = new THREE.Quaternion();
      const wScale = new THREE.Vector3();
      lidNode.matrixWorld.decompose(wPos, wQuat, wScale);
      const origWorldMatrix = new THREE.Matrix4().compose(wPos, wQuat, wScale);

      // ── 5. 힌지 위치 = 뚜껑 바운딩박스 하단 ─────────────
      const lidBox = new THREE.Box3().setFromObject(lidNode);
      lidGroup.position.set(0, lidBox.min.y, 0);
      lidGroup.updateMatrixWorld(true);

      // ── 6. 뚜껑을 lidGroup 자식으로 재배치 ───────────────
      lidNode.removeFromParent();
      lidGroup.add(lidNode);

      // 원래 월드 위치를 lidGroup 로컬 공간으로 역변환
      const invLidGroup = new THREE.Matrix4().copy(lidGroup.matrixWorld).invert();
      const localMatrix = new THREE.Matrix4().multiplyMatrices(invLidGroup, origWorldMatrix);
      localMatrix.decompose(lidNode.position, lidNode.quaternion, lidNode.scale);
    },
    undefined,
    (err) => console.error('[suitcase] GLB 로드 실패:', err)
  );

  return { root, lidGroup };
}
