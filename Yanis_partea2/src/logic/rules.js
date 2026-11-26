// Responsabil: Sarca Yanis
// =====================================================================
//  Logica de business (pură, fără React) — testată în tests/rules.test.js
// =====================================================================
import { DAY, HOUR, endOfWeek, startOfDay } from './time.js';

export const uid = (p = 'id') => `${p}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;

/** Cele 4 statusuri minimale cerute de temă și cine le stabilește. */
export const STATUSES = ['upcoming', 'overdue', 'completed', 'canceled'];
export const STATUS_META = {
  upcoming: { ro: 'Urmează', en: 'Upcoming', who: 'la atribuire' },
  overdue: { ro: 'Restant', en: 'Overdue', who: 'automat, la expirarea termenului' },
  completed: { ro: 'Complet', en: 'Completed', who: 'după validarea superiorului' },
  canceled: { ro: 'Anulat', en: 'Canceled', who: 'de superiorul ierarhic' },
};

export const PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const PRIORITY_META = {
  low: { ro: 'Scăzută', pp: 10 },
  medium: { ro: 'Medie', pp: 20 },
  high: { ro: 'Ridicată', pp: 35 },
  critical: { ro: 'Critică', pp: 50 },
};

/** Parametrii regulii de abateri (slide 6 din prezentare). */
export const RULES = {
  OVERDUE_PER_ABATERE: 3, // 3 activități restante = 1 abatere
  PENALTY_TASKS: 2, // +2 activități de penalizare pe săptămâna curentă
  MAX_ABATERI: 3, // la a 3-a abatere contul e dezactivat
  ABATERE_PP: 50, // o abatere scade 50 de puncte de performanță
  ON_TIME: 1.5, // livrat la timp: 150% din punctele priorității
  LATE: 0.25, // livrat cu întârziere: 25%
};

/** Activitate personală = creată de angajat pentru el însuși, în afara unui proiect. Nu se validează, nu aduce puncte. */
export function isPersonal(task) {
  return !task.isPenalty && !task.projectId && task.assigneeIds.length === 1 && task.createdBy === task.assigneeIds[0];
}
export const needsValidation = (task) => !isPersonal(task);
export const inReview = (task) => task.status === 'upcoming' && !!task.submittedAt;

/**
 * Statusul efectiv la momentul `now`. Nimeni nu poate pune manual „Restant”:
 * sistemul îl stabilește când termenul expiră. O activitate trimisă spre
 * validare înainte de termen nu devine restantă cât timp așteaptă șeful.
 */
export function effectiveStatus(task, now) {
  if (task.status === 'completed' || task.status === 'canceled') return task.status;
  if (task.status === 'overdue') return 'overdue';
  if (task.submittedAt && task.submittedAt <= task.dueDate) return 'upcoming';
  return task.dueDate < now ? 'overdue' : 'upcoming';
}

/** Puncte de performanță (PP) acordate la validare. */
export function pointsFor(task, deliveredAt) {
  if (isPersonal(task) || task.isPenalty) return 0;
  const base = PRIORITY_META[task.priority]?.pp ?? 20;
  const late = task.overdueAt || deliveredAt > task.dueDate;
  return Math.round(base * (late ? RULES.LATE : RULES.ON_TIME));
}

const POOL_FALLBACK = [
  'Raport de recuperare pentru activitățile restante',
  'Sesiune de planificare 1:1 cu managerul',
  'Revizuire proces personal de lucru',
];

function penaltyTitles(position, n, seed) {
  const pool = [...(position?.templates?.map((t) => t.title) ?? []), ...POOL_FALLBACK];
  const out = [];
  for (let i = 0; i < n; i++) out.push(pool[(seed + i * 3) % pool.length]);
  return out;
}

/**
 * Motorul de evaluare. Rulează la fiecare acțiune, periodic și la fiecare
 * salt al Mașinii Timpului. Idempotent: rulat de două ori la același `now`
 * nu produce evenimente noi.
 *
 *  1. Marchează cu `overdueAt` fiecare activitate devenită restantă și crește
 *     contorul `restante` al fiecărui angajat asignat.
 *  2. La fiecare serie de 3 restanțe: abatere în dosar, −50 PP și 2 activități
 *     de penalizare cu termen la sfârșitul săptămânii curente.
 *  3. La a 3-a abatere: contul este marcat „concediat”.
 */
export function evaluate(state, now) {
  const events = [];
  const users = state.users.map((u) => ({ ...u, dosar: [...(u.dosar ?? [])] }));
  const userById = Object.fromEntries(users.map((u) => [u.id, u]));
  let tasks = state.tasks;
  const newlyOverdue = [];

  tasks = tasks.map((t) => {
    if (t.overdueAt) return t;
    if (effectiveStatus(t, now) !== 'overdue') return t;
    newlyOverdue.push(t);
    return { ...t, overdueAt: t.status === 'overdue' ? now : Math.min(now, t.dueDate) };
  });

  for (const t of newlyOverdue) {
    if (isPersonal(t)) continue; // activitățile personale nu intră în dosar
    for (const aid of t.assigneeIds) {
      const u = userById[aid];
      if (!u || u.status !== 'activ') continue;
      u.restante = (u.restante ?? 0) + 1;
      events.push({ type: 'overdue', userId: aid, taskId: t.id, title: t.title });
    }
  }

  const created = [];
  for (const u of users) {
    if (u.status !== 'activ') continue;
    const target = Math.min(RULES.MAX_ABATERI, Math.floor((u.restante ?? 0) / RULES.OVERDUE_PER_ABATERE));
    while ((u.abateri ?? 0) < target) {
      u.abateri = (u.abateri ?? 0) + 1;
      u.pp = Math.max(0, (u.pp ?? 0) - RULES.ABATERE_PP);
      u.dosar.push({
        id: uid('d'), at: now, type: 'abatere',
        text: `Abaterea ${u.abateri}/${RULES.MAX_ABATERI}: ${u.abateri * RULES.OVERDUE_PER_ABATERE} activități restante acumulate. −${RULES.ABATERE_PP} puncte de performanță.`,
      });
      events.push({ type: 'abatere', userId: u.id, n: u.abateri });

      if (u.abateri >= RULES.MAX_ABATERI) {
        u.status = 'concediat';
        u.firedAt = now;
        u.dosar.push({ id: uid('d'), at: now, type: 'concediere', text: 'Cont dezactivat automat: a 3-a abatere. Angajatul este marcat ca concediat.' });
        events.push({ type: 'fired', userId: u.id });
        break;
      }

      const position = state.positions.find((p) => p.id === u.positionId);
      const due = Math.max(endOfWeek(now), now + 12 * HOUR);
      const ids = [];
      for (const title of penaltyTitles(position, RULES.PENALTY_TASKS, (u.restante ?? 0) + u.abateri)) {
        const id = uid('t');
        ids.push(id);
        created.push({
          id, title,
          description: `Activitate suplimentară atribuită automat ca penalizare pentru abaterea ${u.abateri}. Trebuie finalizată până la sfârșitul săptămânii și validată de manager. Nu aduce puncte de performanță.`,
          assigneeIds: [u.id], createdBy: 'system', projectId: null, priority: 'high', status: 'upcoming',
          dueDate: due, createdAt: now, isPenalty: true, tags: ['penalizare'], checklist: [], comments: [],
        });
      }
      u.dosar.push({ id: uid('d'), at: now, type: 'penalizare', text: `+${RULES.PENALTY_TASKS} activități de penalizare atribuite pentru săptămâna curentă.` });
      events.push({ type: 'penalty', userId: u.id, taskIds: ids });
    }
  }

  if (!newlyOverdue.length && !created.length && !events.length) return { state, events };
  return { state: { ...state, users, tasks: [...tasks, ...created] }, events };
}

// ---------------------------------------------------------------------
//  Performanță, calificativ trimestrial, grade
// ---------------------------------------------------------------------

export const GRADES = ['Junior', 'Mid', 'Senior', 'Principal'];
export const gradeName = (g = 1) => GRADES[Math.max(0, Math.min(GRADES.length - 1, g - 1))];

export function quarterOf(t) {
  const d = new Date(t);
  const q = Math.floor(d.getMonth() / 3);
  return { label: `T${q + 1} ${d.getFullYear()}`, start: new Date(d.getFullYear(), q * 3, 1).getTime(), end: new Date(d.getFullYear(), q * 3 + 3, 1).getTime() - 1 };
}

export function userTasks(state, userId) {
  return state.tasks.filter((t) => t.assigneeIds.includes(userId));
}

/**
 * Scor de livrare 0–100: rata de livrare la timp (doar activitățile de serviciu),
 * minus 10 puncte pentru fiecare abatere. Fără istoric → 100.
 */
export function performance(state, user, now) {
  const tasks = userTasks(state, user.id);
  const work = tasks.filter((t) => !isPersonal(t));
  const onTime = work.filter((t) => t.status === 'completed' && !t.overdueAt).length;
  const late = work.filter((t) => t.overdueAt).length;
  const counted = onTime + late;
  const rate = counted ? onTime / counted : 1;
  const score = Math.max(0, Math.min(100, Math.round(rate * 100 - (user.abateri ?? 0) * 10)));
  const counts = { upcoming: 0, overdue: 0, completed: 0, canceled: 0 };
  for (const t of tasks) counts[effectiveStatus(t, now)]++;
  const review = tasks.filter(inReview).length;
  return { score, onTime, late, counts, review, total: tasks.length };
}

/** Calificativele trimestriale și consecințele lor (politica firmei demo). */
export const RATINGS = [
  { id: 'exceptional', label: 'Excepțional', min: { score: 90, pp: 350 }, bonus: 15, effect: 'Bonus 15% + eligibil pentru promovare' },
  { id: 'peste', label: 'Peste așteptări', min: { score: 75, pp: 200 }, bonus: 8, effect: 'Bonus 8% din salariul de bază' },
  { id: 'conform', label: 'Conform așteptărilor', min: { score: 55, pp: 0 }, bonus: 0, effect: 'Fără bonus' },
  { id: 'sub', label: 'Sub așteptări', min: null, bonus: 0, effect: 'Plan de îmbunătățire a performanței (PIP)' },
];

export function evaluation(state, user, now) {
  const perf = performance(state, user, now);
  const q = quarterOf(now);
  const abateriQ = (user.dosar ?? []).filter((d) => d.type === 'abatere' && d.at >= q.start && d.at <= q.end).length;
  const pp = user.pp ?? 0;
  let rating = RATINGS[3];
  if (!abateriQ) rating = RATINGS.slice(0, 3).find((r) => perf.score >= r.min.score && pp >= r.min.pp) ?? RATINGS[3];
  const next = RATINGS[RATINGS.indexOf(rating) - 1];
  return {
    ...perf, pp, abateriQ, quarter: q, rating, next,
    toNext: next ? Math.max(0, next.min.pp - pp) : 0,
    blockedByAbateri: abateriQ > 0,
    promotable: rating.id === 'exceptional' && (user.grade ?? 1) < GRADES.length,
  };
}

// ---------------------------------------------------------------------
//  Ierarhie & permisiuni
// ---------------------------------------------------------------------

export const PERMISSIONS = {
  'task.assign': 'Atribuie activități subordonaților',
  'task.cancel': 'Anulează activități',
  'task.validate': 'Validează activitățile finalizate',
  'team.view': 'Vede panoul de monitorizare al echipei',
  'project.create': 'Creează proiecte de grup',
  'promo.propose': 'Propune promovări',
  'positions.manage': 'Gestionează posturi, angajări, aprobă promovări',
  'time.machine': 'Folosește simulatorul de timp',
  'scope.all': 'Vede toate departamentele',
};

export function positionOf(state, user) {
  return state.positions.find((p) => p.id === user?.positionId);
}

export function can(state, user, perm) {
  return !!positionOf(state, user)?.permissions?.includes(perm);
}

/** Toți subordonații (direcți și indirecți) ai unui utilizator. */
export function subordinates(state, userId) {
  const out = [];
  const walk = (id) => {
    for (const u of state.users) {
      if (u.managerId === id) {
        out.push(u);
        walk(u.id);
      }
    }
  };
  walk(userId);
  return out;
}

export function isSuperiorOf(state, managerId, userId) {
  return subordinates(state, managerId).some((u) => u.id === userId);
}

export function departmentOf(state, user) {
  const pos = positionOf(state, user);
  return state.departments.find((d) => d.id === pos?.departmentId);
}

/** Utilizatorii cărora `user` le poate atribui activități. */
export function assignableUsers(state, user) {
  const self = [user];
  if (!can(state, user, 'task.assign')) return self;
  const subs = can(state, user, 'scope.all') ? state.users.filter((u) => u.id !== user.id) : subordinates(state, user.id);
  return [...self, ...subs.filter((u) => u.status === 'activ')];
}

/** Cine validează activitatea: cel care a atribuit-o; altfel managerul asignatului. */
export function validatorId(state, task) {
  if (isPersonal(task)) return null;
  if (task.createdBy && task.createdBy !== 'system' && !task.assigneeIds.includes(task.createdBy)) return task.createdBy;
  const project = task.projectId && state.projects.find((p) => p.id === task.projectId);
  if (project && !task.assigneeIds.includes(project.leadId)) return project.leadId;
  const first = state.users.find((u) => u.id === task.assigneeIds[0]);
  return first?.managerId ?? null;
}

export function canValidate(state, user, task) {
  if (!inReview(task) || task.assigneeIds.includes(user.id)) return false;
  if (validatorId(state, task) === user.id) return true;
  if (can(state, user, 'scope.all')) return true;
  return can(state, user, 'task.validate') && task.assigneeIds.every((id) => isSuperiorOf(state, user.id, id));
}

/** Poate `user` lucra pe activitate (pași, trimitere spre validare)? */
export function canWork(state, user, task) {
  return task.assigneeIds.includes(user.id) && task.status === 'upcoming';
}

/** Poate modifica detaliile (titlu, termen, prioritate)? Doar cine a atribuit-o sau un superior. */
export function canManage(state, user, task) {
  if (task.createdBy === user.id) return true;
  if (can(state, user, 'scope.all')) return true;
  return can(state, user, 'task.assign') && task.assigneeIds.some((id) => isSuperiorOf(state, user.id, id));
}

// compatibilitate cu numele vechi
export const canEditTask = (state, user, task) => canWork(state, user, task) || canManage(state, user, task);

export function canSubmit(state, user, task) {
  return canWork(state, user, task) && needsValidation(task) && !task.submittedAt && task.checklist.every((c) => c.done);
}

/** Ștergerea: creatorul sau un superior; penalizările nu pot fi șterse de cel penalizat. */
export function canDeleteTask(state, user, task) {
  if (task.isPenalty) return can(state, user, 'task.cancel') && !task.assigneeIds.includes(user.id);
  if (task.createdBy === user.id) return true;
  return can(state, user, 'task.cancel') && canManage(state, user, task) && !task.assigneeIds.every((id) => id === user.id);
}

export function canCancelTask(state, user, task) {
  if (task.status === 'completed' || task.status === 'canceled') return false;
  if (isPersonal(task)) return task.createdBy === user.id;
  return can(state, user, 'task.cancel') && canManage(state, user, task) && !task.assigneeIds.includes(user.id);
}

/** Redeschiderea unei activități validate (retrage punctele): doar validatorul / superiorul. */
export function canReopen(state, user, task) {
  if (task.status !== 'completed') return false;
  if (isPersonal(task)) return task.createdBy === user.id;
  return !task.assigneeIds.includes(user.id) && (validatorId(state, task) === user.id || canManage(state, user, task));
}
