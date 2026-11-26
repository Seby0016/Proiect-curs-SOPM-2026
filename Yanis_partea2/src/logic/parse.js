// Responsabil: Sarca Yanis
// Adăugare rapidă în limbaj natural (funcție extra).
// Exemplu: "Raport sprint mâine la 15 !mare #raport @Andreea"
//  → titlu "Raport sprint", termen mâine 15:00, prioritate ridicată,
//    eticheta "raport", asignat Andreei.
import { addDays, atHour, startOfDay } from './time.js';

const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const WEEKDAYS = ['duminica', 'luni', 'marti', 'miercuri', 'joi', 'vineri', 'sambata'];
const PRIORITY_WORDS = {
  mic: 'low', mica: 'low', scazut: 'low', scazuta: 'low', low: 'low',
  mediu: 'medium', medie: 'medium', medium: 'medium',
  mare: 'high', ridicat: 'high', ridicata: 'high', high: 'high', important: 'high',
  critic: 'critical', critica: 'critical', urgent: 'critical', critical: 'critical',
};

/**
 * @param {string} input
 * @param {number} now
 * @param {{id:string,name:string}[]} people
 * @returns {{title:string, dueDate:number, priority:string, tags:string[], assigneeId:string|null, chips:{kind:string,label:string}[]}}
 */
export function parseQuickAdd(input, now, people = []) {
  let text = ` ${input} `;
  const chips = [];
  let day = null;
  let hour = null;
  let minute = 0;
  let priority = 'medium';
  const tags = [];
  let assigneeId = null;

  const take = (re, fn) => {
    text = text.replace(re, (...m) => {
      fn(...m);
      return ' ';
    });
  };

  // prioritate: !mare, !urgent
  take(/\s!([A-Za-z\u00C0-\u024F]+)/gi, (_, w) => {
    const p = PRIORITY_WORDS[strip(w)];
    if (p) {
      priority = p;
      chips.push({ kind: 'priority', label: w });
    }
  });
  // etichete: #raport
  take(/\s#([A-Za-z\u00C0-\u024F\d_-]+)/gi, (_, w) => {
    tags.push(w.toLowerCase());
    chips.push({ kind: 'tag', label: `#${w}` });
  });
  // persoană: @Andreea
  take(/\s@([A-Za-z\u00C0-\u024F]+)/gi, (_, w) => {
    const key = strip(w);
    const p = people.find((x) => strip(x.name).split(' ').some((part) => part.startsWith(key)));
    if (p) {
      assigneeId = p.id;
      chips.push({ kind: 'person', label: p.name });
    }
  });
  // oră: "la 15", "la 15:30", "ora 9"
  take(/\s(?:la|ora)\s+(\d{1,2})(?:[:.](\d{2}))?(?=\s)/gi, (_, h, m) => {
    hour = Math.min(23, +h);
    minute = m ? Math.min(59, +m) : 0;
    chips.push({ kind: 'time', label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` });
  });
  // "în 3 zile"
  take(/\s[iî]n\s+(\d{1,3})\s+zile(?=\s)/gi, (_, n) => {
    day = addDays(startOfDay(now), +n);
    chips.push({ kind: 'date', label: `în ${n} zile` });
  });
  // "săptămâna viitoare"
  take(/\ss[ăa]pt[ăa]m[âa]na\s+viitoare(?=\s)/gi, () => {
    day = addDays(startOfDay(now), 7);
    chips.push({ kind: 'date', label: 'săptămâna viitoare' });
  });
  // dată: 15.11 sau 15/11
  take(/\s(\d{1,2})[./](\d{1,2})(?=\s)/g, (_, d, m) => {
    const ref = new Date(now);
    let dt = new Date(ref.getFullYear(), +m - 1, +d).getTime();
    if (dt < startOfDay(now)) dt = new Date(ref.getFullYear() + 1, +m - 1, +d).getTime();
    day = dt;
    chips.push({ kind: 'date', label: `${d}.${m}` });
  });
  // cuvinte cheie simple
  const words = text.split(/\s+/).filter(Boolean);
  const keep = [];
  for (const w of words) {
    const k = strip(w);
    if (day === null && (k === 'azi' || k === 'astazi')) {
      day = startOfDay(now);
      chips.push({ kind: 'date', label: 'azi' });
    } else if (day === null && k === 'maine') {
      day = addDays(startOfDay(now), 1);
      chips.push({ kind: 'date', label: 'mâine' });
    } else if (day === null && k === 'poimaine') {
      day = addDays(startOfDay(now), 2);
      chips.push({ kind: 'date', label: 'poimâine' });
    } else if (day === null && WEEKDAYS.includes(k)) {
      const target = WEEKDAYS.indexOf(k);
      const cur = new Date(now).getDay();
      const diff = (target - cur + 7) % 7 || 7;
      day = addDays(startOfDay(now), diff);
      chips.push({ kind: 'date', label: w });
    } else keep.push(w);
  }

  const title = keep.join(' ').trim().replace(/^./, (c) => c.toUpperCase());
  const baseDay = day ?? addDays(startOfDay(now), 1);
  let dueDate = atHour(baseDay, hour ?? 17, minute);
  if (dueDate < now) {
    // "azi" după ora 17 → până la miezul nopții; altfel mutăm pe ziua următoare
    dueDate = day !== null && hour === null ? atHour(baseDay, 23, 59) : atHour(addDays(baseDay, 1), hour ?? 17, minute);
    if (dueDate < now) dueDate = atHour(addDays(baseDay, 1), hour ?? 17, minute);
  }

  return { title, dueDate, priority, tags, assigneeId, chips };
}
