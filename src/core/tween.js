// 아주 작은 트윈 도구. animate(초, (이징된 진행값, 원래 진행률) => {...}) 는 끝나면 resolve 되는 Promise를 돌려준다.
const active = new Set();

export const ease = {
  linear: (t) => t,
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

export function animate(duration, onUpdate, easing = ease.inOutCubic) {
  return new Promise((resolve) => {
    active.add({ t: 0, duration, onUpdate, easing, resolve });
  });
}

export function updateTweens(dt) {
  for (const a of active) {
    a.t += dt;
    const p = Math.min(a.t / a.duration, 1);
    a.onUpdate(a.easing(p), p);
    if (p >= 1) {
      active.delete(a);
      a.resolve();
    }
  }
}

export function smoothstep(e0, e1, x) {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}

// 프레임레이트와 무관하게 부드럽게 따라가는 보간 (lerp의 dt 버전)
export function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}
