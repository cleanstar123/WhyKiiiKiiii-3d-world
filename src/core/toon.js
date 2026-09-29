import * as THREE from 'three';

// 툰 셰이딩: 빛의 밝기를 3단계 계단으로 끊어주는 그라디언트 맵
let gradientMap = null;
export function getGradientMap() {
  if (!gradientMap) {
    const data = new Uint8Array([90, 175, 255]);
    gradientMap = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.generateMipmaps = false;
    gradientMap.needsUpdate = true;
  }
  return gradientMap;
}

export function toon(color, extra = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: getGradientMap(), ...extra });
}

// 외곽선: 같은 모양을 살짝 키워서 뒷면만 진한 색으로 그리는 '인버티드 헐' 방식
const outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x2a1f4a, side: THREE.BackSide });
const box = new THREE.Box3();
const size = new THREE.Vector3();
const center = new THREE.Vector3();

export function withOutline(mesh, thickness = 0.035) {
  const geo = mesh.geometry;
  geo.computeBoundingBox();
  box.copy(geo.boundingBox);
  box.getSize(size);
  box.getCenter(center);
  const s = (v) => (v > 1e-3 ? (v + thickness * 2) / v : 1);
  const outline = new THREE.Mesh(geo, outlineMaterial);
  outline.scale.set(s(size.x), s(size.y), s(size.z));
  // 중심이 원점이 아닌 지오메트리도 제자리에서 커지도록 보정
  outline.position.set(center.x * (1 - outline.scale.x), center.y * (1 - outline.scale.y), center.z * (1 - outline.scale.z));
  outline.userData.isOutline = true;
  outline.raycast = () => {}; // 클릭 판정에서 제외
  mesh.add(outline);
  return mesh;
}
