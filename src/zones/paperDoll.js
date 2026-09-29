import * as THREE from 'three';

/*
 * 캐리어를 끄는 납작한 종이인형 (오리지널 디자인).
 * 캔버스에 그린 그림을 평면에 붙여서 3D 공간 속 2D 요소로 쓴다.
 * 흰 테두리를 두껍게 먼저 칠해 '오려 붙인 스티커' 느낌을 낸다.
 */
function drawDoll(ctx, W, H) {
  const shapes = [];
  const add = (fill, path) => shapes.push({ fill, path });
  const roundRect = (x, y, w, h, r) => (c) => { c.roundRect(x, y, w, h, r); };
  const circle = (x, y, r) => (c) => { c.arc(x, y, r, 0, Math.PI * 2); };

  // 캐리어
  add('#7fe3f0', roundRect(166, 250, 78, 104, 14));
  add('#2a1f4a', roundRect(196, 222, 16, 34, 6));
  // 다리
  add('#2a1f4a', roundRect(100, 300, 18, 70, 8));
  add('#2a1f4a', roundRect(134, 300, 18, 70, 8));
  // 원피스
  add('#fff27a', (c) => { c.moveTo(126, 170); c.lineTo(70, 310); c.quadraticCurveTo(126, 330, 182, 310); c.closePath(); });
  // 팔 (캐리어 손잡이 쪽으로)
  add('#ffd9c7', (c) => { c.moveTo(160, 200); c.quadraticCurveTo(190, 214, 204, 226); c.lineTo(196, 236); c.quadraticCurveTo(180, 224, 152, 214); c.closePath(); });
  // 머리카락 뒤 + 똥머리 두 개
  add('#b9a6ff', circle(126, 116, 70));
  add('#b9a6ff', circle(70, 60, 26));
  add('#b9a6ff', circle(182, 60, 26));
  // 얼굴
  add('#ffe3d4', circle(126, 128, 52));
  // 앞머리
  add('#b9a6ff', (c) => { c.moveTo(74, 118); c.quadraticCurveTo(126, 50, 178, 118); c.quadraticCurveTo(150, 96, 126, 104); c.quadraticCurveTo(100, 96, 74, 118); c.closePath(); });

  // 1단계: 흰 테두리
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 22;
  for (const s of shapes) { ctx.beginPath(); s.path(ctx); ctx.stroke(); }
  // 2단계: 색 채우기
  for (const s of shapes) { ctx.beginPath(); s.path(ctx); ctx.fillStyle = s.fill; ctx.fill(); }

  // 원피스 물방울 무늬
  ctx.fillStyle = '#ff8fc7';
  [[110, 230], [140, 260], [100, 285], [150, 295], [126, 205]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); });
  // 캐리어 스티커
  ctx.fillStyle = '#ff8fc7'; ctx.beginPath(); ctx.arc(190, 282, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff27a'; ctx.fillRect(208, 310, 22, 14);
  // 하트 선글라스
  ctx.fillStyle = '#ff3b8a';
  const heart = (x, y, s) => {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.3);
    ctx.bezierCurveTo(x, y - s * 0.3, x - s, y - s * 0.3, x - s, y + s * 0.3);
    ctx.bezierCurveTo(x - s, y + s * 0.8, x, y + s, x, y + s * 1.3);
    ctx.bezierCurveTo(x, y + s, x + s, y + s * 0.8, x + s, y + s * 0.3);
    ctx.bezierCurveTo(x + s, y - s * 0.3, x, y - s * 0.3, x, y + s * 0.3);
    ctx.fill();
  };
  heart(104, 118, 17);
  heart(148, 118, 17);
  ctx.fillRect(116, 124, 20, 5);
  // 입
  ctx.strokeStyle = '#2a1f4a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(126, 150, 12, 0.2, Math.PI - 0.2); ctx.stroke();
}

export function makePaperDoll() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  drawDoll(canvas.getContext('2d'), canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(1.0, 1.5);
  geo.translate(0, 0.75, 0); // 원점을 발밑으로
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
}
