// Responsabil: Sarca Yanis
// Utilitare de timp. Toată aplicația folosește un "acum" care poate fi
// decalat de Mașina Timpului (state.clockOffset), deci funcțiile primesc
// momentul curent ca parametru în loc să apeleze Date.now() direct.

export const HOUR = 3600 * 1000;
export const DAY = 24 * HOUR;

export const nowWith = (offset = 0) => Date.now() + offset;

export function startOfDay(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(t) {
  const d = new Date(t);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Luni 00:00 a săptămânii care conține t. */
export function startOfWeek(t) {
  const d = new Date(startOfDay(t));
  const dow = (d.getDay() + 6) % 7; // 0 = luni
  d.setDate(d.getDate() - dow);
  return d.getTime();
}

/** Duminică 23:59:59 a săptămânii care conține t. */
export function endOfWeek(t) {
  const d = new Date(startOfWeek(t));
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function atHour(t, h, m = 0) {
  const d = new Date(t);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function addDays(t, n) {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

const fmtShort = new Intl.DateTimeFormat('ro-RO', { day: 'numeric', month: 'short' });
const fmtLong = new Intl.DateTimeFormat('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtTime = new Intl.DateTimeFormat('ro-RO', { hour: '2-digit', minute: '2-digit' });
const fmtWeekday = new Intl.DateTimeFormat('ro-RO', { weekday: 'short' });

export const formatShort = (t) => fmtShort.format(t);
export const formatLong = (t) => fmtLong.format(t);
export const formatTime = (t) => fmtTime.format(t);
export const formatDateTime = (t) => `${fmtShort.format(t)}, ${fmtTime.format(t)}`;
export const formatWeekday = (t) => fmtWeekday.format(t).replace('.', '');

/** Etichetă relativă pentru termen limită: "azi, 17:00", "mâine", "în 3 zile", "acum 2 zile". */
export function relativeDue(due, now) {
  const days = Math.round((startOfDay(due) - startOfDay(now)) / DAY);
  if (days === 0) return `azi, ${formatTime(due)}`;
  if (days === 1) return `mâine, ${formatTime(due)}`;
  if (days === -1) return 'ieri';
  if (days > 1 && days < 7) return `în ${days} zile`;
  if (days < -1 && days > -7) return `acum ${-days} zile`;
  return formatShort(due);
}

/** "acum 5 min", "acum 2 h", "ieri" — pentru fluxul de activitate. */
export function timeAgo(t, now) {
  const diff = now - t;
  if (diff < 60 * 1000) return 'chiar acum';
  if (diff < HOUR) return `acum ${Math.floor(diff / 60000)} min`;
  if (diff < DAY) return `acum ${Math.floor(diff / HOUR)} h`;
  const d = Math.floor(diff / DAY);
  if (d === 1) return 'ieri';
  if (d < 7) return `acum ${d} zile`;
  return formatShort(t);
}

export function greeting(t) {
  const h = new Date(t).getHours();
  if (h < 5) return 'Noapte bună';
  if (h < 12) return 'Bună dimineața';
  if (h < 18) return 'Bună ziua';
  return 'Bună seara';
}
