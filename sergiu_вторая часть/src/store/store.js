// Responsabil: Simin Sergiu
// =====================================================================
//  Store global + persistență + sincronizare în timp real între tab-uri.
//  Arhitectură: un singur obiect de stare, modificat doar prin dispatch(),
//  care rulează reducer-ul, apoi motorul de evaluare (abateri), salvează
//  în localStorage și difuzează noua stare pe un BroadcastChannel.
// =====================================================================
import { useSyncExternalStore, useEffect, useState } from 'react';
import { createSeed, SCHEMA_VERSION, initials } from '../data/seed.js';
import { authenticate } from '../logic/auth.js';
import { uid, positionOf, validatorId } from '../logic/rules.js';
import { nowWith, HOUR } from '../logic/time.js';
import { reducer, runEvaluation, firstName } from '../logic/reducer.js';

const KEY = 'yagi-tasks:state';
const SESSION_KEY = 'yagi-tasks:session';
const TAB_ID = uid('tab');

// ---------- stocare sigură (poate arunca excepții în mod privat) ----------
const safe = {
  get(store, k) { try { return store?.getItem(k) ?? null; } catch { return null; } },
  set(store, k, v) { try { store?.setItem(k, v); } catch { /* ignorat */ } },
  del(store, k) { try { store?.removeItem(k); } catch { /* ignorat */ } },
};
const ls = (() => { try { return window.localStorage; } catch { return null; } })();
const ss = (() => { try { return window.sessionStorage; } catch { return null; } })();

function load() {
  const raw = safe.get(ls, KEY);
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    return s.version === SCHEMA_VERSION ? s : null;
  } catch { return null; }
}

// ---------- starea ----------
let state = load() ?? createSeed(Date.now());
let session = safe.get(ss, SESSION_KEY);
const listeners = new Set();
const fxListeners = new Set();

const channel = (() => { try { return new BroadcastChannel('yagi-tasks'); } catch { return null; } })();

export const getNow = () => nowWith(state.clockOffset);

function notify() { for (const l of listeners) l(); }
export function emitFx(fx) { for (const l of fxListeners) l(fx); }

function commit(next, { broadcast = true } = {}) {
  state = next;
  safe.set(ls, KEY, JSON.stringify(state));
  if (broadcast) {
    channel?.postMessage({ type: 'state', from: TAB_ID, state });
  }
  notify();
}

/** Stare venită din alt tab (BroadcastChannel). */
function receiveRemote(remote) {
  if (!remote || remote.version !== SCHEMA_VERSION) return;
  const changed = new Set();
  const old = Object.fromEntries(state.tasks.map((t) => [t.id, t]));
  for (const t of remote.tasks) if (!old[t.id] || old[t.id].updatedAt !== t.updatedAt || old[t.id].status !== t.status) changed.add(t.id);
  const meBefore = state.users.find((u) => u.id === session);
  commit(remote, { broadcast: false });
  emitFx({ type: 'remote', changed: [...changed] });
  // evenimente care mă privesc, declanșate din alt tab (ex. managerul folosește Mașina Timpului)
  const meAfter = state.users.find((u) => u.id === session);
  if (meBefore && meAfter) {
    const events = [];
    for (let n = (meBefore.abateri ?? 0) + 1; n <= (meAfter.abateri ?? 0); n++) events.push({ type: 'abatere', userId: session, n });
    if (meBefore.status === 'activ' && meAfter.status === 'concediat') events.push({ type: 'fired', userId: session });
    if (events.length) emitFx({ type: 'events', events: events.filter((e) => !(e.type === 'abatere' && e.n >= 3)), state });
  }
}


/** Singurul punct prin care se modifică starea. */
export function dispatch(action) {
  const actor = session;
  const before = state;
  let next = reducer(state, action, nowWith(state.clockOffset), actor);
  const now = nowWith(next.clockOffset);
  const { state: evaluated, events } = runEvaluation(next, now);
  next = evaluated;
  commit(next);

  // efecte vizuale
  if (action.type === 'task/approve' || action.type === 'task/complete-personal') {
    const t = next.tasks.find((x) => x.id === action.id);
    emitFx({ type: 'completed', task: t, pp: t?.points ?? 0, origin: action.origin, who: t?.assigneeIds.map((id) => firstName(next, id)).join(', ') });
  }
  if (action.type === 'task/submit') emitFx({ type: 'submitted', origin: action.origin, validator: firstName(next, validatorId(next, next.tasks.find((x) => x.id === action.id))) });
  if (events.length) emitFx({ type: 'events', events, state: next });
  return next;
}

/** Evaluare periodică: termenele expiră și fără nicio acțiune a utilizatorului. */
export function tick() {
  const now = getNow();
  const { state: next, events } = runEvaluation(state, now);
  if (next !== state) {
    commit(next);
    if (events.length) emitFx({ type: 'events', events, state: next });
  }
}

export function resetDemo() {
  const fresh = createSeed(Date.now());
  commit(fresh);
  emitFx({ type: 'reset' });
}

// ---------- sesiune (per tab, ca să poți testa 2 utilizatori în 2 tab-uri) ----------
/** Autentificare cu email și parolă. Returnează { ok } sau { error }. */
export function login(email, password) {
  const r = authenticate(state.users, email, password);
  if (r.error) return { error: r.error };
  startSession(r.user.id);
  return { ok: true, user: r.user };
}
function startSession(userId) {
  session = userId;
  safe.set(ss, SESSION_KEY, userId);
  notify();
}
export const getSessionId = () => session;

/** Este `userId` în subordinea (directă sau indirectă) a lui `managerId`? Directorul vede tot. */
export function subordinatesOf(userId, managerId) {
  if (!managerId || userId === managerId) return false;
  const mgr = state.users.find((u) => u.id === managerId);
  if (mgr && positionOf(state, mgr)?.permissions.includes('scope.all')) return true;
  let u = state.users.find((x) => x.id === userId);
  while (u?.managerId) {
    if (u.managerId === managerId) return true;
    u = state.users.find((x) => x.id === u.managerId);
  }
  return false;
}

export function logout() {
  session = null;
  safe.del(ss, SESSION_KEY);
  notify();
}

// ---------- prezență (cine mai e online, în alte tab-uri) ----------
let presence = {};
let myView = 'panou';
function sendPresence() {
  if (!session) return;
  channel?.postMessage({ type: 'presence', from: TAB_ID, userId: session, view: myView, at: Date.now() });
}
export function setPresenceView(view) {
  myView = view;
  sendPresence();
}

if (channel) {
  channel.onmessage = (e) => {
    const m = e.data;
    if (!m || m.from === TAB_ID) return;
    if (m.type === 'state') receiveRemote(m.state);
    if (m.type === 'presence') {
      presence = { ...presence, [m.from]: { userId: m.userId, view: m.view, at: m.at } };
      notify();
    }
    if (m.type === 'hello') sendPresence();
    if (m.type === 'bye') {
      const { [m.from]: _, ...rest } = presence;
      presence = rest;
      notify();
    }
  };
  channel.postMessage({ type: 'hello', from: TAB_ID });
  setInterval(sendPresence, 4000);
  window.addEventListener('beforeunload', () => channel.postMessage({ type: 'bye', from: TAB_ID }));
}

// ---------- hook-uri React ----------
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
let snapshot = { state, session, presence };
const getSnapshot = () => {
  if (snapshot.state !== state || snapshot.session !== session || snapshot.presence !== presence) snapshot = { state, session, presence };
  return snapshot;
};

export function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).state;
}

export function useSession() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const user = snap.state.users.find((u) => u.id === snap.session);
  return user && user.status === 'activ' ? user : null;
}

/** Utilizatori online în alte tab-uri (ultimele 12 secunde). */
export function usePresence() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [, force] = useState(0);
  useEffect(() => { const i = setInterval(() => force((x) => x + 1), 5000); return () => clearInterval(i); }, []);
  const cutoff = Date.now() - 12000;
  return Object.values(snap.presence).filter((p) => p.at > cutoff);
}

/** „Acum”-ul aplicației, ținând cont de Mașina Timpului. Se actualizează la 20s. */
export function useNow() {
  const s = useStore();
  const [t, setT] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setT(Date.now()), 20000); return () => clearInterval(i); }, []);
  return Math.max(t, Date.now() - 1000) + s.clockOffset;
}

export function useFx(handler) {
  useEffect(() => { fxListeners.add(handler); return () => fxListeners.delete(handler); }, [handler]);
}

export { initials, positionOf, HOUR };
