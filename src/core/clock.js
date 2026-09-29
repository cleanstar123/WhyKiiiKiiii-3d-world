const pad = (n) => String(n).padStart(2, '0');

export function clockText(zone, elapsed) {
  const [h, m] = zone.time.split(':').map(Number);
  let s = Math.floor(h * 3600 + m * 60 + elapsed) % 86400;
  const hh = Math.floor(s / 3600);
  s -= hh * 3600;
  const mm = Math.floor(s / 60);
  const ss = s - mm * 60;
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
}

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

export function formatDate(d) {
  return `${MONTHS[d.getMonth()]}.${pad(d.getDate())} ${d.getFullYear()}`;
}

export function formatTime(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function addDays(d, days) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export function randomTime(d) {
  const r = new Date(d);
  r.setHours(Math.floor(Math.random() * 24));
  r.setMinutes(Math.floor(Math.random() * 60));
  return r;
}
