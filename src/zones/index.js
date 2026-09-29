import { createMorningZone } from './morning.js';
import { createPopOffZone } from './popOff.js';
import { createCandyZone } from './candy.js';
import { createBlueHourZone } from './blueHour.js';

/*
 * 구역 목록.
 * youtubeId: youtube.com/watch?v= 뒤의 11자리 문자만 넣는다 (&list=... 이후는 제외).
 */
export const ZONES = [
  {
    id: 'ever2late',
    track: 'Ever2Late!',
    time: '07:30',
    date: 'JUL.24 2026',
    camcorder: 'handycam',
    youtubeId: 'G6uhnkDPca8',
    palette: { body: 0x9ff0d8, trim: 0xfffaf3, accent: 0xff8fc7 },
    sky: { top: 0xffb060, mid: 0xffd49a, low: 0xfff4cc, blob: 0xff6b9d },
    create: createMorningZone,
  },
  {
    id: 'popoff',
    track: 'Pop Off Pop Off',
    time: '13:00',
    date: 'JUL.24 2026',
    camcorder: 'vhs',
    hubScale: 1.1,
    youtubeId: 'e1IH2q8QNLM',
    palette: { body: 0xfffaf3, trim: 0x8fa0c8, accent: 0xff5a8a },
    sky: { top: 0x7ec8ff, mid: 0xb0e0ff, low: 0xf0faff, blob: 0xffe066 },
    create: createPopOffZone,
  },
  {
    id: 'candy',
    track: 'Candy Pink Magic Hole Flip Phone',
    time: '23:00',
    date: 'JUL.24 2026',
    camcorder: 'digicam',
    youtubeId: 'Ta42YSMVePU',
    palette: { body: 0xffb3dd, trim: 0xe8e4f4, accent: 0xb9a6ff },
    sky: { top: 0x200840, mid: 0x4a1878, low: 0x0e0420, blob: 0xff2878 },
    create: createCandyZone,
  },
  {
    id: 'bluehour',
    track: 'Blue Hour',
    time: '04:50',
    date: 'JUL.25 2026',
    camcorder: 'minidv',
    hubScale: 0.92,
    youtubeId: 'mMzpqqCBon0',
    palette: { body: 0x9fb4ff, trim: 0xe4e9ff, accent: 0xfff27a },
    sky: { top: 0x080e30, mid: 0x102880, low: 0x060c28, blob: 0x4888ff },
    create: createBlueHourZone,
  },
];
