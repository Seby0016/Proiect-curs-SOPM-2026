// =====================================================================
//  Store global — SCHELET (Etapa 1)
//  Responsabil: Simin Sergiu
//  Un singur obiect de stare pentru toată aplicația. Se modifică DOAR
//  prin dispatch(acțiune). Componentele React îl citesc cu useStore().
//  Se salvează în localStorage (datele rămân după refresh).
// =====================================================================
import { useSyncExternalStore, useEffect, useState } from 'react';
import { createSeed, SCHEMA_VERSION } from '../data/seed.js';
import { authenticate } from '../logic/auth.js';
import { positionOf } from '../logic/rules.js';
import { nowWith, HOUR } from '../logic/time.js';
import { reducer, runEvaluation } from '../logic/reducer.js';
import { initials } from '../data/seed.js';

const KEY = 'yagi-tasks:state';
const SESSION_KEY = 'yagi-tasks:session';

const read = (store, k) => { try { return store.getItem(k); } catch { return null; } };
const write = (store, k, v) => { try { v == null ? store.removeItem(k) : store.setItem(k, v); } catch { /* mod privat */ } };

function load() {
  try {
    const s = JSON.parse(read(localStorage, KEY));
    return s?.version === SCHEMA_VERSION ? s : null;
  } catch { return null; }
}

let state = load() ?? createSeed(Date.now());
let session = read(sessionStorage, SESSION_KEY); // per tab: 2 tab-uri = 2 utilizatori
const listeners = new Set();
const fxListeners = new Set();

const notify = () => listeners.forEach((l) => l());
export const emitFx = (fx) => fxListeners.forEach((l) => l(fx));
export const getNow = () => nowWith(state.clockOffset);

function commit(next) {
  state = next;
  write(localStorage, KEY, JSON.stringify(state));
  // TODO Etapa 2: BroadcastChannel → celelalte tab-uri văd schimbarea instant
  notify();
}

/** Singurul punct prin care se schimbă datele. */
export function dispatch(action) {
  const next = reducer(state, action, getNow(), session);
  const { state: evaluated } = runEvaluation(next, getNow());
  commit(evaluated);
  return evaluated;
}

/** TODO Etapa 2: verificare periodică a termenelor (restanțe → abateri). */
export function tick() {}

export function resetDemo() { commit(createSeed(Date.now())); }

// ---------- sesiune ----------
export function login(email, password) {
  const r = authenticate(state.users, email, password);
  if (r.error) return { error: r.error };
  session = r.user.id;
  write(sessionStorage, SESSION_KEY, session);
  notify();
  return { ok: true, user: r.user };
}
export function logout() {
  session = null;
  write(sessionStorage, SESSION_KEY, null);
  notify();
}
export const getSessionId = () => session;
export const subordinatesOf = () => false; // TODO Etapa 2
export function setPresenceView() {}       // TODO Etapa 2: cine e online și pe ce pagină

// ---------- hook-uri React ----------
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
let snapshot = { state, session };
const getSnapshot = () => {
  if (snapshot.state !== state || snapshot.session !== session) snapshot = { state, session };
  return snapshot;
};

export const useStore = () => useSyncExternalStore(subscribe, getSnapshot).state;

export function useSession() {
  const snap = useSyncExternalStore(subscribe, getSnapshot);
  return snap.state.users.find((u) => u.id === snap.session && u.status === 'activ') ?? null;
}

export const usePresence = () => []; // TODO Etapa 2

export function useNow() {
  const s = useStore();
  const [t, setT] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setT(Date.now()), 20000); return () => clearInterval(i); }, []);
  return t + s.clockOffset;
}

export function useFx(handler) {
  useEffect(() => { fxListeners.add(handler); return () => fxListeners.delete(handler); }, [handler]);
}

export { initials, positionOf, HOUR };
