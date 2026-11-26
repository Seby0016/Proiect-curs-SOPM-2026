// =====================================================================
//  Utilitare de timp — SCHELET (Etapa 1)
//  Responsabil: Sarca Yanis
//  Totul lucrează cu milisecunde (Date.now()), ca să fie ușor de comparat.
// =====================================================================

export const HOUR = 3600 * 1000;
export const DAY = 24 * HOUR;

/** „Acum”-ul aplicației: ora reală + decalajul Mașinii Timpului. */
export const nowWith = (offset = 0) => Date.now() + offset;

export function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const addDays = (ts, n) => ts + n * DAY;
export const atHour = (ts, h, m = 0) => { const d = new Date(ts); d.setHours(h, m, 0, 0); return d.getTime(); };

const fmt = (o) => (ts) => new Date(ts).toLocaleString('ro-RO', o);
export const formatShort = fmt({ day: 'numeric', month: 'short' });
export const formatLong = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
export const formatDateTime = fmt({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

// TODO Etapa 2: endOfDay, startOfWeek, endOfWeek, formatTime, formatWeekday
// TODO Etapa 2: relativeDue(due, now)  → „în 3 zile”, „azi la 17:00”, „restant de 2 zile”
// TODO Etapa 2: timeAgo(ts, now)       → „acum 5 min”
export const relativeDue = (due) => formatDateTime(due);
export const timeAgo = (ts) => formatDateTime(ts);

export function greeting(now) {
  const h = new Date(now).getHours();
  return h < 12 ? 'Bună dimineața' : h < 18 ? 'Bună ziua' : 'Bună seara';
}
