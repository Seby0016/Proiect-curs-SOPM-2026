// Responsabil: Sarca Yanis
// =====================================================================
//  Reducer-ul aplicației: logică pură, comună pentru web (React) și mobil
//  (React Native). Primește starea + o acțiune și întoarce starea nouă.
// =====================================================================
import { emailFor, hashPassword } from './auth.js';
import { evaluate, uid, pointsFor, positionOf, validatorId, isPersonal, gradeName } from './rules.js';
import { addDays, atHour, startOfDay, nowWith } from './time.js';

/** Transformă evenimentele motorului de evaluare în notificări + activitate. */
export function recordEvents(s, events, now) {
  if (!events.length) return s;
  const notifications = [...s.notifications];
  const activity = [...s.activity];
  const userById = Object.fromEntries(s.users.map((u) => [u.id, u]));
  const push = (userId, kind, text) => userId && notifications.unshift({ id: uid('n'), userId, at: now, kind, read: false, text });
  for (const e of events) {
    const u = userById[e.userId];
    if (!u) continue;
    const first = u.name.split(' ')[0];
    if (e.type === 'overdue') {
      push(u.id, 'overdue', `„${e.title}” a devenit restantă (${u.restante % 3 || 3}/3 până la o abatere).`);
      activity.unshift({ id: uid('a'), at: now, userId: 'system', kind: 'overdue', text: `„${e.title}” a devenit restantă pentru ${first}`, taskId: e.taskId });
    }
    if (e.type === 'abatere') {
      push(u.id, 'abatere', `Ai primit abaterea ${e.n}/3 pentru 3 activități restante.`);
      push(u.managerId, 'abatere', `${u.name} a primit abaterea ${e.n}/3.`);
      activity.unshift({ id: uid('a'), at: now, userId: 'system', kind: 'abatere', text: `${u.name} a primit abaterea ${e.n}/3` });
    }
    if (e.type === 'penalty') {
      push(u.id, 'penalty', 'Ți-au fost atribuite 2 activități de penalizare pentru săptămâna curentă.');
    }
    if (e.type === 'fired') {
      push(u.managerId, 'fired', `${u.name} a fost concediat automat (3 abateri).`);
      activity.unshift({ id: uid('a'), at: now, userId: 'system', kind: 'fired', text: `Contul lui ${u.name} a fost dezactivat după a 3-a abatere` });
    }
  }
  return { ...s, notifications: notifications.slice(0, 300), activity: activity.slice(0, 400) };
}

export function runEvaluation(s, now) {
  const { state: evaluated, events } = evaluate(s, now);
  return { state: recordEvents(evaluated, events, now), events };
}

// ---------- reducer ----------
function log(s, entry, now) {
  return { ...s, activity: [{ id: uid('a'), at: now, ...entry }, ...s.activity].slice(0, 400) };
}
function notifyUsers(s, userIds, text, kind, now, except) {
  const items = userIds.filter((id) => id && id !== except).map((userId) => ({ id: uid('n'), userId, at: now, kind, read: false, text }));
  return items.length ? { ...s, notifications: [...items, ...s.notifications].slice(0, 300) } : s;
}
const patchTask = (s, id, fn) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...fn(t), updatedAt: Date.now() } : t)) });
export const firstName = (s, id) => s.users.find((u) => u.id === id)?.name.split(' ')[0] ?? '';

export function reducer(s, a, now, actor) {
  switch (a.type) {
    case 'task/add': {
      const t = {
        id: uid('t'), description: '', projectId: null, priority: 'medium', tags: [], checklist: [], comments: [],
        status: 'upcoming', isPenalty: false, ...a.task, createdBy: actor, createdAt: now, updatedAt: Date.now(),
      };
      let next = { ...s, tasks: [...s.tasks, t] };
      const others = t.assigneeIds.filter((id) => id !== actor);
      next = log(next, {
        userId: actor, kind: others.length ? 'assigned' : 'created', projectId: t.projectId, taskId: t.id,
        text: others.length ? `i-a atribuit lui ${others.map((id) => firstName(s, id)).join(', ')} „${t.title}”` : `a adăugat „${t.title}”`,
      }, now);
      return notifyUsers(next, others, `${firstName(s, actor)} ți-a atribuit „${t.title}”.`, 'assigned', now, actor);
    }
    case 'task/update':
      return patchTask(s, a.id, (t) => ({ ...t, ...a.patch }));
    // --- fluxul de lucru: nimeni nu marchează singur „Restant” sau „Complet” ---
    case 'task/submit': {
      // angajatul predă activitatea; superiorul o validează
      const t = s.tasks.find((x) => x.id === a.id);
      if (!t || t.status !== 'upcoming' || t.submittedAt) return s;
      let next = patchTask(s, a.id, (x) => ({ ...x, submittedAt: now, rejection: null }));
      next = log(next, { userId: actor, kind: 'submitted', text: `a trimis spre validare „${t.title}”`, projectId: t.projectId, taskId: t.id }, now);
      return notifyUsers(next, [validatorId(s, t)], `${firstName(s, actor)} a trimis spre validare „${t.title}”.`, 'review', now, actor);
    }
    case 'task/withdraw': {
      const t = s.tasks.find((x) => x.id === a.id);
      if (!t?.submittedAt || t.status !== 'upcoming') return s;
      return log(patchTask(s, a.id, (x) => ({ ...x, submittedAt: null })), { userId: actor, kind: 'withdrawn', text: `a retras de la validare „${t.title}”`, projectId: t.projectId, taskId: t.id }, now);
    }
    case 'task/approve': {
      const t = s.tasks.find((x) => x.id === a.id);
      if (!t?.submittedAt || t.status !== 'upcoming') return s;
      const pts = pointsFor(t, t.submittedAt);
      let next = { ...s, users: s.users.map((u) => (t.assigneeIds.includes(u.id) ? { ...u, pp: (u.pp ?? 0) + pts } : u)) };
      next = patchTask(next, a.id, (x) => ({ ...x, status: 'completed', completedAt: x.submittedAt, validatedBy: actor, validatedAt: now, points: pts }));
      next = log(next, { userId: actor, kind: 'completed', text: `a validat „${t.title}”${pts ? ` (+${pts} PP)` : ''}`, projectId: t.projectId, taskId: t.id }, now);
      return notifyUsers(next, t.assigneeIds, `${firstName(s, actor)} a validat „${t.title}”.${pts ? ` +${pts} puncte de performanță.` : ''}`, 'approved', now, actor);
    }
    case 'task/reject': {
      const t = s.tasks.find((x) => x.id === a.id);
      if (!t?.submittedAt || t.status !== 'upcoming') return s;
      let next = patchTask(s, a.id, (x) => ({
        ...x, submittedAt: null, rejection: { by: actor, at: now, reason: a.reason }, rejections: (x.rejections ?? 0) + 1,
        comments: [...x.comments, { id: uid('m'), userId: actor, text: `Respins la validare: ${a.reason}`, at: now }],
      }));
      next = log(next, { userId: actor, kind: 'rejected', text: `a respins „${t.title}”`, projectId: t.projectId, taskId: t.id }, now);
      return notifyUsers(next, t.assigneeIds, `${firstName(s, actor)} a respins „${t.title}”: ${a.reason}`, 'rejected', now, actor);
    }
    case 'task/complete-personal': {
      const t = s.tasks.find((x) => x.id === a.id);
      if (!t || !isPersonal(t) || t.status !== 'upcoming') return s;
      return log(patchTask(s, a.id, (x) => ({ ...x, status: 'completed', completedAt: now, submittedAt: now, points: 0 })), { userId: actor, kind: 'completed', text: `a bifat „${t.title}”`, taskId: t.id }, now);
    }
    case 'task/reopen': {
      // retrage validarea și punctele acordate
      const t = s.tasks.find((x) => x.id === a.id);
      if (!t || t.status !== 'completed') return s;
      const pts = t.points ?? 0;
      let next = pts ? { ...s, users: s.users.map((u) => (t.assigneeIds.includes(u.id) ? { ...u, pp: Math.max(0, (u.pp ?? 0) - pts) } : u)) } : s;
      next = patchTask(next, a.id, (x) => ({ ...x, status: 'upcoming', completedAt: null, submittedAt: null, points: 0, validatedBy: null }));
      next = log(next, { userId: actor, kind: 'upcoming', text: `a redeschis „${t.title}”${pts ? ` (−${pts} PP)` : ''}`, projectId: t.projectId, taskId: t.id }, now);
      return notifyUsers(next, t.assigneeIds, `${firstName(s, actor)} a redeschis „${t.title}”.`, 'rejected', now, actor);
    }
    case 'task/cancel': {
      const t = s.tasks.find((x) => x.id === a.id);
      if (!t || t.status === 'completed' || t.status === 'canceled') return s;
      let next = patchTask(s, a.id, (x) => ({ ...x, status: 'canceled', canceledAt: now, canceledBy: actor, submittedAt: null }));
      next = log(next, { userId: actor, kind: 'canceled', text: `a anulat „${t.title}”`, projectId: t.projectId, taskId: t.id }, now);
      return notifyUsers(next, t.assigneeIds, `${firstName(s, actor)} a anulat „${t.title}”${a.reason ? `: ${a.reason}` : '.'}`, 'canceled', now, actor);
    }
    // --- promovări ---
    case 'promo/propose': {
      const u = s.users.find((x) => x.id === a.userId);
      if (!u || (s.promotions ?? []).some((p) => p.userId === a.userId && p.status === 'pending')) return s;
      const promo = { id: uid('pr'), userId: u.id, by: actor, at: now, status: 'pending', from: u.grade ?? 1, to: (u.grade ?? 1) + 1, reason: a.reason };
      let next = { ...s, promotions: [promo, ...(s.promotions ?? [])] };
      next = log(next, { userId: actor, kind: 'promo', text: `l-a propus pe ${u.name} pentru promovare la ${gradeName(promo.to)}` }, now);
      const directors = s.users.filter((x) => positionOf(s, x)?.permissions.includes('positions.manage')).map((x) => x.id);
      return notifyUsers(next, directors, `${firstName(s, actor)} propune promovarea lui ${u.name} la ${gradeName(promo.to)}.`, 'promo', now, actor);
    }
    case 'promo/decide': {
      const pr = (s.promotions ?? []).find((x) => x.id === a.id);
      if (!pr || pr.status !== 'pending') return s;
      const u = s.users.find((x) => x.id === pr.userId);
      let next = { ...s, promotions: s.promotions.map((x) => (x.id === a.id ? { ...x, status: a.approve ? 'approved' : 'rejected', decidedBy: actor, decidedAt: now } : x)) };
      if (a.approve) {
        next = { ...next, users: next.users.map((x) => (x.id === pr.userId ? { ...x, grade: pr.to, dosar: [...x.dosar, { id: uid('d'), at: now, type: 'promovare', text: `Promovat de la ${gradeName(pr.from)} la ${gradeName(pr.to)}.` }] } : x)) };
      }
      next = log(next, { userId: actor, kind: 'promo', text: `${a.approve ? 'a aprobat' : 'a respins'} promovarea lui ${u.name}` }, now);
      return notifyUsers(next, [pr.userId, pr.by], a.approve ? `Promovare aprobată: ${u.name} devine ${gradeName(pr.to)}.` : `Propunerea de promovare pentru ${u.name} a fost respinsă.`, a.approve ? 'approved' : 'rejected', now, actor);
    }
    case 'task/delete': {
      const t = s.tasks.find((x) => x.id === a.id);
      if (!t) return s;
      return log({ ...s, tasks: s.tasks.filter((x) => x.id !== a.id) }, { userId: actor, kind: 'deleted', text: `a șters „${t.title}”`, projectId: t.projectId }, now);
    }
    case 'task/check-toggle':
      return patchTask(s, a.id, (t) => ({ ...t, checklist: t.checklist.map((c) => (c.id === a.itemId ? { ...c, done: !c.done } : c)) }));
    case 'task/check-add':
      return patchTask(s, a.id, (t) => ({ ...t, checklist: [...t.checklist, { id: uid('c'), text: a.text, done: false }] }));
    case 'task/check-remove':
      return patchTask(s, a.id, (t) => ({ ...t, checklist: t.checklist.filter((c) => c.id !== a.itemId) }));
    case 'task/comment': {
      const t = s.tasks.find((x) => x.id === a.id);
      let next = patchTask(s, a.id, (x) => ({ ...x, comments: [...x.comments, { id: uid('m'), userId: actor, text: a.text, at: now }] }));
      next = log(next, { userId: actor, kind: 'comment', text: `a comentat la „${t.title}”`, projectId: t.projectId, taskId: t.id }, now);
      return notifyUsers(next, [...t.assigneeIds, t.createdBy], `${firstName(s, actor)} a comentat la „${t.title}”.`, 'comment', now, actor);
    }
    case 'project/add': {
      const p = { id: uid('p'), createdAt: now, leadId: actor, ...a.project };
      p.memberIds = [...new Set([actor, ...p.memberIds])];
      const next = log({ ...s, projects: [...s.projects, p] }, { userId: actor, kind: 'project', text: `a creat proiectul „${p.name}”`, projectId: p.id }, now);
      return notifyUsers(next, p.memberIds, `Ai fost adăugat în proiectul „${p.name}”.`, 'project', now, actor);
    }
    case 'user/hire': {
      const pos = s.positions.find((p) => p.id === a.positionId);
      const id = uid('u');
      const email = emailFor(a.name, s.users.map((u) => u.email));
      const user = {
        id, name: a.name, email, passwordHash: hashPassword(a.password, email),
        positionId: a.positionId, managerId: a.managerId, hue: Math.floor(Math.random() * 360), pp: 0, grade: 1, restante: 0, abateri: 0,
        status: 'activ', firedAt: null, hiredAt: now,
        dosar: [{ id: uid('d'), at: now, type: 'angajare', text: `Angajat pe postul ${pos.title}. Activitățile postului au fost atribuite automat.` }],
      };
      // Posturi predefinite: activitățile fișei postului se atribuie automat
      const tasks = (pos.templates ?? []).map((tp) => ({
        id: uid('t'), title: tp.title, description: `Activitate din fișa postului „${pos.title}”, atribuită automat la angajare.`,
        assigneeIds: [id], createdBy: actor, projectId: null, priority: tp.priority, status: 'upcoming',
        dueDate: atHour(addDays(startOfDay(now), tp.days), 17), createdAt: now, isPenalty: false, tags: ['fișa postului'], checklist: [], comments: [],
      }));
      const next = { ...s, users: [...s.users, user], tasks: [...s.tasks, ...tasks] };
      return log(next, { userId: actor, kind: 'hire', text: `l-a angajat pe ${a.name} ca ${pos.title} (${tasks.length} activități atribuite automat)` }, now);
    }
    case 'user/reinstate': {
      const u = s.users.find((x) => x.id === a.id);
      const users = s.users.map((x) => (x.id === a.id ? {
        ...x, status: 'activ', abateri: 0, restante: 0, firedAt: null,
        dosar: [...x.dosar, { id: uid('d'), at: now, type: 'reabilitare', text: 'Cont reactivat de conducere. Contorul de abateri a fost resetat.' }],
      } : x));
      return log({ ...s, users }, { userId: actor, kind: 'reinstate', text: `a reactivat contul lui ${u.name}` }, now);
    }
    case 'user/password': {
      const u = s.users.find((x) => x.id === actor);
      if (!u) return s;
      return { ...s, users: s.users.map((x) => (x.id === actor ? { ...x, passwordHash: hashPassword(a.password, x.email), passwordChangedAt: now } : x)) };
    }
    case 'position/update':
      return { ...s, positions: s.positions.map((p) => (p.id === a.id ? { ...p, ...a.patch } : p)) };
    case 'notif/read-all':
      return { ...s, notifications: s.notifications.map((n) => (n.userId === a.userId ? { ...n, read: true } : n)) };
    case 'time/advance':
      return { ...s, clockOffset: s.clockOffset + a.ms };
    case 'time/reset':
      return { ...s, clockOffset: 0 };
    default:
      return s;
  }
}


/**
 * Aplică o acțiune completă: reducer → motorul de abateri → notificări.
 * Întoarce { state, events }. Folosit identic de web și de mobil.
 */
export function applyAction(s, action, actor) {
  const next = reducer(s, action, nowWith(s.clockOffset), actor);
  return runEvaluation(next, nowWith(next.clockOffset));
}
