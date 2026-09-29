import * as THREE from 'three';

function canvasTexture(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 4갈래 반짝이 (2D 스티커 느낌)
export function sparkleTexture() {
  return canvasTexture(128, (ctx, s) => {
    const c = s / 2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(c, 4);
    ctx.quadraticCurveTo(c, c, s - 4, c);
    ctx.quadraticCurveTo(c, c, c, s - 4);
    ctx.quadraticCurveTo(c, c, 4, c);
    ctx.quadraticCurveTo(c, c, c, 4);
    ctx.fill();
  });
}

export function heartTexture() {
  return canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const x = s / 2, y = s * 0.3;
    ctx.moveTo(x, y + 8);
    ctx.bezierCurveTo(x, y - 20, x - 56, y - 20, x - 56, y + 16);
    ctx.bezierCurveTo(x - 56, y + 44, x - 20, y + 60, x, y + 84);
    ctx.bezierCurveTo(x + 20, y + 60, x + 56, y + 44, x + 56, y + 16);
    ctx.bezierCurveTo(x + 56, y - 20, x, y - 20, x, y + 8);
    ctx.fill();
  });
}

// 가짜 빛번짐용 동그란 그라디언트 (블룸 후처리 대신 가볍게)
export function glowTexture() {
  return canvasTexture(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

// 종이 오려붙인 듯한 햇살 무늬
export function sunburstTexture() {
  return canvasTexture(256, (ctx, s) => {
    ctx.translate(s / 2, s / 2);
    ctx.fillStyle = '#ffffff';
    const rays = 14;
    for (let i = 0; i < rays; i++) {
      ctx.rotate((Math.PI * 2) / rays);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-14, s * 0.48);
      ctx.lineTo(14, s * 0.48);
      ctx.closePath();
      ctx.fill();
    }
  });
}
