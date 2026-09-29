import { clockText } from './core/clock.js';

// DOM UI (하단 시간대 타임라인, 힌트, 장면 OSD)를 한 곳에서 관리한다
export function initUI(zones, { onSelect, onBack }) {
  const list = document.getElementById('timeline-list');
  const hint = document.getElementById('hint');
  const osd = document.getElementById('osd');
  const title = document.getElementById('osd-title');
  const time = document.getElementById('osd-time');
  const back = document.getElementById('osd-back');
  const defaultHint = hint.textContent;

  const buttons = zones.map((zone, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = `<span class="t">${zone.time}</span><span class="n">${zone.track}</span>`;
    btn.setAttribute('aria-label', `${zone.time} ${zone.track} 장면으로 들어가기`);
    btn.addEventListener('click', () => onSelect(i));
    li.appendChild(btn);
    list.appendChild(li);
    return btn;
  });
  back.addEventListener('click', onBack);

  let hot = -1;
  let activeZone = null;
  let lastText = '';

  return {
    setHot(i) {
      if (i === hot) return;
      hot = i;
      buttons.forEach((b, j) => b.classList.toggle('is-hot', j === i));
      hint.textContent = i >= 0 ? `${zones[i].time}  ${zones[i].track}  눌러서 들어가기` : defaultHint;
    },
    setMode(mode, index = -1) {
      document.body.dataset.mode = mode;
      if (mode === 'scene') {
        activeZone = zones[index];
        title.textContent = activeZone.track;
        osd.hidden = false;
        back.focus({ preventScroll: true });
      } else if (mode === 'returning' || mode === 'hub') {
        osd.hidden = true;
        if (mode === 'hub' && index >= 0) buttons[index].focus({ preventScroll: true });
      }
    },
    tick(elapsed) {
      if (!activeZone) return;
      const text = `${activeZone.date}\n${clockText(activeZone, elapsed)}`;
      if (text !== lastText) {
        lastText = text;
        time.innerText = text;
      }
    },
  };
}
