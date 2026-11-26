// Responsabil: Sarca Yanis
// Date demo pentru firma fictivă „Yagi Systems”. Datele sunt generate relativ
// la momentul primei încărcări, ca termenele să fie mereu realiste.
import { DAY, HOUR, addDays, atHour, endOfWeek, startOfDay } from '../logic/time.js';
import { RULES, uid, pointsFor } from '../logic/rules.js';
import { DEMO_PASSWORD, emailFor, hashPassword } from '../logic/auth.js';

export const SCHEMA_VERSION = 5;

export const departments = [
  { id: 'd-dir', name: 'Conducere', short: 'DIR', hue: 260 },
  { id: 'd-ing', name: 'Inginerie Software', short: 'ING', hue: 220 },
  { id: 'd-qa', name: 'Calitate & Testare', short: 'QA', hue: 165 },
  { id: 'd-des', name: 'Design Produs', short: 'DES', hue: 330 },
];

const ALL = ['task.assign', 'task.cancel', 'task.validate', 'team.view', 'project.create', 'promo.propose', 'positions.manage', 'time.machine', 'scope.all'];
const MANAGER = ['task.assign', 'task.cancel', 'task.validate', 'team.view', 'project.create', 'promo.propose', 'time.machine'];

export const positions = [
  {
    id: 'p-dir', title: 'Director General', departmentId: 'd-dir', level: 1, permissions: ALL,
    templates: [
      { title: 'Revizuire raport lunar de performanță', priority: 'high', days: 5 },
      { title: 'Aprobare buget trimestrial', priority: 'medium', days: 10 },
    ],
  },
  {
    id: 'p-mgr-ing', title: 'Manager Inginerie', departmentId: 'd-ing', level: 2, permissions: MANAGER,
    templates: [
      { title: 'Planificare sprint cu echipa', priority: 'high', days: 2 },
      { title: 'Revizuire arhitectură și decizii tehnice', priority: 'medium', days: 6 },
    ],
  },
  {
    id: 'p-mgr-qa', title: 'Manager QA & Integrări', departmentId: 'd-qa', level: 2, permissions: MANAGER,
    templates: [
      { title: 'Plan de testare pentru release-ul curent', priority: 'high', days: 3 },
      { title: 'Verificare contract API web ↔ mobil', priority: 'medium', days: 5 },
    ],
  },
  {
    id: 'p-dev', title: 'Inginer Software', departmentId: 'd-ing', level: 3, permissions: [],
    templates: [
      { title: 'Code review pentru 2 pull request-uri', priority: 'medium', days: 2 },
      { title: 'Scriere teste unitare pentru modulul curent', priority: 'medium', days: 4 },
      { title: 'Actualizare documentație API', priority: 'low', days: 6 },
    ],
  },
  {
    id: 'p-fe', title: 'Dezvoltator Frontend React', departmentId: 'd-ing', level: 3, permissions: [],
    templates: [
      { title: 'Implementare componentă din kit-ul de design', priority: 'medium', days: 3 },
      { title: 'Verificare afișare pe mobil și tabletă', priority: 'low', days: 5 },
    ],
  },
  {
    id: 'p-qa', title: 'Inginer QA', departmentId: 'd-qa', level: 3, permissions: [],
    templates: [
      { title: 'Rulare suită de teste de regresie', priority: 'high', days: 2 },
      { title: 'Raportare bug-uri în tracker', priority: 'medium', days: 3 },
      { title: 'Testare pe dispozitive iOS și Android', priority: 'medium', days: 5 },
    ],
  },
  {
    id: 'p-des', title: 'Designer UI/UX', departmentId: 'd-des', level: 3, permissions: [],
    templates: [
      { title: 'Actualizare kit de componente Figma', priority: 'medium', days: 3 },
      { title: 'Test de utilizabilitate cu 3 utilizatori', priority: 'high', days: 6 },
    ],
  },
];

// restante = numărul total de activități restante din istoric
const people = [
  { id: 'u1', name: 'Sebastian Iordache', positionId: 'p-dir', managerId: null, hue: 262, restante: 0, pp: 380, grade: 4 },
  { id: 'u2', name: 'Yanis Sarca', positionId: 'p-mgr-ing', managerId: 'u1', hue: 215, restante: 0, pp: 340, grade: 3 },
  { id: 'u4', name: 'Sergiu Simin', positionId: 'p-mgr-qa', managerId: 'u1', hue: 170, restante: 1, pp: 240, grade: 3 },
  { id: 'u3', name: 'Decebal Iordache', positionId: 'p-fe', managerId: 'u2', hue: 28, restante: 1, pp: 260, grade: 2 },
  { id: 'u5', name: 'Andreea Popescu', positionId: 'p-dev', managerId: 'u2', hue: 340, restante: 0, pp: 420, grade: 2 },
  { id: 'u6', name: 'Radu Pavel', positionId: 'p-dev', managerId: 'u2', hue: 45, restante: 8, pp: 20, grade: 1 },
  { id: 'u7', name: 'Ioana Marin', positionId: 'p-qa', managerId: 'u4', hue: 190, restante: 2, pp: 150, grade: 1 },
  { id: 'u8', name: 'Mihai Stan', positionId: 'p-qa', managerId: 'u4', hue: 120, restante: 4, pp: 90, grade: 2 },
  { id: 'u9', name: 'Elena Dobre', positionId: 'p-des', managerId: 'u1', hue: 300, restante: 0, pp: 310, grade: 3 },
  { id: 'u10', name: 'Victor Lazăr', positionId: 'p-dev', managerId: 'u2', hue: 0, restante: 9, pp: 0, grade: 1 },
];

export const initials = (name) => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export function createSeed(now) {
  const at = (days, hour = 17, min = 0) => atHour(addDays(startOfDay(now), days), hour, min);
  const inH = (h) => now + h * HOUR;

  const projects = [
    {
      id: 'p1', code: 'YAG-MOB', name: 'Aplicație mobilă React Native', hue: 215,
      description: 'Versiunea pentru iOS și Android a platformei, sincronizată cu aplicația web prin același cont.',
      memberIds: ['u2', 'u3', 'u4', 'u7', 'u8', 'u9'], leadId: 'u2', createdAt: at(-20, 9), deadline: at(21),
    },
    {
      id: 'p2', code: 'YAG-DB', name: 'Migrare bază de date PostgreSQL', hue: 165,
      description: 'Mutarea datelor istorice din sistemul vechi și optimizarea interogărilor pentru panoul de monitorizare.',
      memberIds: ['u2', 'u5', 'u6'], leadId: 'u2', createdAt: at(-14, 9), deadline: at(10),
    },
    {
      id: 'p3', code: 'YAG-UX', name: 'Redesign panou manager', hue: 330,
      description: 'Panou nou de monitorizare a echipei: performanță, abateri și progres pe proiecte, dintr-o privire.',
      memberIds: ['u1', 'u3', 'u9'], leadId: 'u1', createdAt: at(-10, 9), deadline: at(14),
    },
  ];

  const tasks = [];
  const T = (title, o) => {
    const t = {
      id: uid('t'),
      title,
      description: o.desc ?? '',
      assigneeIds: o.to,
      createdBy: o.by ?? people.find((x) => x.id === o.to[0])?.managerId ?? o.to[0],
      projectId: o.project ?? null,
      priority: o.p ?? 'medium',
      status: o.status ?? 'upcoming',
      dueDate: o.due,
      createdAt: o.created ?? Math.min(o.due - 5 * DAY, now - (6 + tasks.length * 2) * HOUR),
      isPenalty: !!o.penalty,
      tags: o.tags ?? [],
      checklist: (o.check ?? []).map(([text, done]) => ({ id: uid('c'), text, done })),
      comments: (o.comments ?? []).map(([userId, text, ago]) => ({ id: uid('m'), userId, text, at: now - ago * HOUR })),
    };
    if (t.status === 'completed') {
      t.completedAt = o.doneAt ?? Math.min(now - HOUR, t.dueDate - HOUR);
      t.submittedAt = t.completedAt;
      if (t.completedAt > t.dueDate) t.overdueAt = t.dueDate;
      t.points = pointsFor(t, t.completedAt);
    } else if (o.submitted) {
      t.submittedAt = now - o.submitted * HOUR;
      t.checklist = t.checklist.map((c) => ({ ...c, done: true }));
    } else if (t.status !== 'canceled' && t.dueDate < now) {
      t.overdueAt = t.dueDate;
    }
    tasks.push(t);
    return t;
  };

  // ---- Sebastian (Director)
  T('Aprobare Project Charter v2', { to: ['u1'], p: 'high', status: 'completed', due: at(-5), doneAt: at(-6, 15), tags: ['sopm'] });
  T('Revizuire WBS și plan de sprint', { to: ['u1'], status: 'completed', due: at(-1), doneAt: at(-2, 11), tags: ['sopm'] });
  T('Prezentare progres la ședința 4', {
    to: ['u1'], p: 'high', due: at(1, 18), tags: ['sopm'],
    desc: 'Demo live: aplicația web React, panoul de manager și algoritmul de abateri.',
    check: [['Slide-uri actualizate', true], ['Demo cu Mașina Timpului', false], ['Documentație exportată', false]],
  });
  T('Evaluare performanță trimestrială echipă', { to: ['u1'], due: at(4) });

  // ---- Yanis (Manager Inginerie)
  T('Schema bazei de date: users, tasks, projects', { to: ['u2'], project: 'p2', p: 'high', status: 'completed', due: at(-3), doneAt: at(-4, 16), tags: ['db'] });
  T('Definire flux de evaluare a abaterilor', { to: ['u2'], p: 'high', status: 'completed', due: at(0, 23, 0), doneAt: at(-1, 14), tags: ['business'] });
  T('Index-uri și migrare date istorice', {
    to: ['u2', 'u5'], by: 'u2', project: 'p2', p: 'high', due: at(3), tags: ['db'],
    check: [['Export din sistemul vechi', true], ['Script de transformare', true], ['Validare număr de rânduri', false], ['Index pe dueDate', false]],
    comments: [['u5', 'Am rulat exportul pe staging, durează cam 4 minute.', 20], ['u2', 'Perfect, facem migrarea finală joi.', 6]],
  });
  T('Code review PR #42 – sincronizare în timp real', { to: ['u2'], due: at(1, 12) });

  // ---- Decebal (Frontend React)
  T('Layout panou manager în React', { to: ['u3'], by: 'u1', project: 'p3', p: 'high', status: 'completed', due: at(-4), doneAt: at(-3, 10) });
  T('Componenta TaskCard cu animații', { to: ['u3'], project: 'p3', status: 'completed', due: at(0, 23, 30), doneAt: at(-1, 17), tags: ['react'] });
  T('Temă întunecată pentru aplicația web', { to: ['u3'], p: 'low', status: 'completed', due: at(2), doneAt: now - 2 * HOUR, tags: ['react'] });
  T('Kanban drag & drop pentru proiecte', {
    to: ['u3'], by: 'u1', project: 'p3', p: 'high', due: at(2), tags: ['react'],
    check: [['Coloane pe status', true], ['Drag & drop HTML5', true], ['Sincronizare între tab-uri', false]],
    comments: [['u9', 'Am pus în Figma și starea de hover pentru coloane.', 30]],
  });
  T('Ecran de autentificare în React Native', { to: ['u3'], by: 'u2', project: 'p1', p: 'high', due: at(5), tags: ['mobile'], submitted: 5,
    comments: [['u3', 'Gata, am pus și validarea câmpurilor. Aștept feedback.', 5]] });
  T('Navigare cu tab-uri în React Native', { to: ['u3'], by: 'u2', project: 'p1', p: 'low', due: at(7), tags: ['mobile'] });

  // ---- Sergiu (Manager QA & Integrări)
  T('Contract API: endpoint-uri /tasks și /users', { to: ['u4'], p: 'high', status: 'completed', due: at(-4), doneAt: at(-5, 13), tags: ['api'] });
  T('Plan de testare pentru aplicația mobilă', { to: ['u4'], project: 'p1', status: 'completed', due: at(-1), doneAt: at(-2, 12) });
  T('Testare sincronizare web ↔ mobil', {
    to: ['u4', 'u7'], by: 'u4', project: 'p1', p: 'high', due: at(2), tags: ['api'],
    check: [['Același cont pe 2 dispozitive', false], ['Modificare offline + reconectare', false]],
  });
  T('Raport săptămânal QA', { to: ['u4'], due: at(4) });

  // ---- Andreea (Inginer Software, performer de top)
  T('Fix: notificări duplicate la asignare', { to: ['u5'], p: 'high', status: 'completed', due: at(1), doneAt: now - 3 * HOUR });
  T('Optimizare interogări pentru lista de activități', { to: ['u5'], project: 'p2', status: 'completed', due: at(0, 23), doneAt: at(-1, 15) });
  T('Scriere teste unitare pentru modulul de autentificare', { to: ['u5'], status: 'completed', due: at(-1), doneAt: at(-2, 16) });
  T('Actualizare documentație API', { to: ['u5'], p: 'low', status: 'completed', due: at(-2), doneAt: at(-3, 11) });
  T('Endpoint export rapoarte CSV', { to: ['u5'], by: 'u2', p: 'high', due: at(3), submitted: 2,
    check: [['Endpoint GET /reports.csv', true], ['Teste de integrare', true]] });
  T('Pregătire notițe pentru daily stand-up', { to: ['u5'], by: 'u5', p: 'low', due: inH(14), desc: 'Activitate personală: nu se validează și nu aduce puncte.' });

  // ---- Radu (2 abateri — o singură restanță îl desparte de concediere)
  T('Migrare tabele vechi în PostgreSQL', { to: ['u6'], by: 'u2', project: 'p2', p: 'high', due: at(-2), tags: ['db'],
    comments: [['u2', 'Radu, te rog actualizează statusul până diseară.', 26]] });
  T('Scriere teste unitare pentru modulul de import', { to: ['u6'], by: 'u2', status: 'completed', due: at(-6), doneAt: at(-5, 12) });
  T('Raport de recuperare pentru sarcinile restante', { to: ['u6'], by: 'system', penalty: true, created: at(-3, 18), p: 'high', status: 'completed', due: endOfWeek(now), doneAt: at(-1, 10), tags: ['penalizare'],
    desc: 'Activitate suplimentară atribuită automat ca penalizare pentru abaterea 2.' });
  T('Revizuire proces personal de lucru', { to: ['u6'], by: 'system', penalty: true, created: at(-3, 18), p: 'high', due: Math.max(endOfWeek(now), now + 30 * HOUR), tags: ['penalizare'],
    desc: 'Activitate suplimentară atribuită automat ca penalizare pentru abaterea 2.' });
  T('Script de backup automat pentru baza de date', { to: ['u6'], by: 'u2', project: 'p2', p: 'critical', due: inH(20), tags: ['db'] });

  // ---- Ioana (QA) — 2 restanțe, încă una = prima abatere
  T('Rulare suită de teste de regresie', { to: ['u7'], by: 'u4', p: 'high', due: at(-1, 12) });
  T('Raportare bug-uri în tracker', { to: ['u7'], status: 'completed', due: at(0, 23), doneAt: at(-1, 16) });
  T('Verificare accesibilitate formulare', { to: ['u7'], status: 'completed', due: at(-5), doneAt: at(-4, 10) });
  T('Testare pe dispozitive iOS și Android', { to: ['u7'], by: 'u4', project: 'p1', due: inH(30), tags: ['mobile'] });
  T('Test de încărcare: 500 de utilizatori simultan', { to: ['u7'], by: 'u4', p: 'high', due: at(6) });

  // ---- Mihai (QA) — 1 abatere
  T('Automatizare teste end-to-end', { to: ['u8'], by: 'u4', due: at(-3) });
  T('Raportare bug-uri în tracker', { to: ['u8'], status: 'completed', due: at(-1), doneAt: at(-2, 15) });
  T('Testare scenarii speciale: cont dezactivat', { to: ['u8'], by: 'u4', project: 'p1', due: at(2), submitted: 3,
    desc: 'Un angajat concediat nu se mai poate autentifica nici pe web, nici pe mobil.' });
  T('Notificări push pentru termene limită', { to: ['u8', 'u2'], by: 'u2', project: 'p1', p: 'critical', due: at(8), tags: ['mobile'] });

  // ---- Elena (Design)
  T('Actualizare kit de componente Figma', { to: ['u9'], project: 'p3', status: 'completed', due: at(0, 23), doneAt: at(-1, 13) });
  T('Prototip ecrane mobile', { to: ['u9'], project: 'p1', p: 'high', status: 'completed', due: at(-2), doneAt: at(-3, 17) });
  T('Test de utilizabilitate cu 3 utilizatori', { to: ['u9', 'u3'], by: 'u9', project: 'p3', p: 'high', due: at(3) });
  T('Ilustrații pentru stările goale', { to: ['u9'], p: 'low', due: at(5) });
  T('Revizuire contrast pentru tema veche', { to: ['u9'], status: 'canceled', due: at(1), desc: 'Anulată: tema veche este înlocuită complet.' });

  // ---- Victor (concediat)
  T('Integrare autentificare SSO', { to: ['u10'], by: 'u2', p: 'high', due: at(-9) });
  T('Refactorizare modul de rapoarte', { to: ['u10'], by: 'u2', due: at(-7) });
  T('Curățare cod mort din API', { to: ['u10'], by: 'u2', status: 'canceled', due: at(-2) });

  // ---- utilizatori + dosar
  const users = people.map((p) => {
    const abateri = Math.min(RULES.MAX_ABATERI, Math.floor(p.restante / RULES.OVERDUE_PER_ABATERE));
    const dosar = [{ id: uid('d'), at: at(-60, 9), type: 'angajare', text: `Angajat pe postul ${positions.find((x) => x.id === p.positionId).title}. Activitățile postului au fost atribuite automat.` }];
    for (let i = 1; i <= abateri; i++) {
      const when = at(-4 * (abateri - i) - 3, 18);
      dosar.push({ id: uid('d'), at: when, type: 'abatere', text: `Abaterea ${i}/${RULES.MAX_ABATERI}: ${i * 3} activități restante acumulate.` });
      if (i < RULES.MAX_ABATERI) dosar.push({ id: uid('d'), at: when + 1000, type: 'penalizare', text: `+${RULES.PENALTY_TASKS} activități de penalizare atribuite pentru săptămâna curentă.` });
    }
    const fired = abateri >= RULES.MAX_ABATERI;
    if (fired) dosar.push({ id: uid('d'), at: at(-3, 18, 1), type: 'concediere', text: 'Cont dezactivat automat: a 3-a abatere. Angajatul este marcat ca concediat.' });
    return {
      id: p.id,
      name: p.name,
      email: emailFor(p.name),
      passwordHash: hashPassword(DEMO_PASSWORD, emailFor(p.name)),
      positionId: p.positionId,
      managerId: p.managerId,
      hue: p.hue,
      pp: p.pp,
      grade: p.grade,
      restante: p.restante,
      abateri,
      status: fired ? 'concediat' : 'activ',
      firedAt: fired ? at(-3, 18, 1) : null,
      hiredAt: at(-60, 9),
      dosar,
    };
  });

  // ---- activitate
  const name = (id) => users.find((u) => u.id === id)?.name.split(' ')[0];
  const activity = [];
  for (const t of tasks) {
    if (t.status === 'completed') activity.push({ id: uid('a'), at: t.completedAt, userId: t.assigneeIds[0], kind: 'completed', text: `a finalizat „${t.title}”`, projectId: t.projectId, taskId: t.id });
    if (t.createdBy !== t.assigneeIds[0] && t.createdBy !== 'system') activity.push({ id: uid('a'), at: t.createdAt, userId: t.createdBy, kind: 'assigned', text: `i-a atribuit lui ${name(t.assigneeIds[0])} „${t.title}”`, projectId: t.projectId, taskId: t.id });
    for (const c of t.comments) activity.push({ id: uid('a'), at: c.at, userId: c.userId, kind: 'comment', text: `a comentat la „${t.title}”`, projectId: t.projectId, taskId: t.id });
  }
  activity.push({ id: uid('a'), at: at(-3, 18, 1), userId: 'system', kind: 'fired', text: 'Contul lui Victor Lazăr a fost dezactivat după a 3-a abatere' });
  activity.sort((a, b) => b.at - a.at);

  const notifications = [
    { id: uid('n'), userId: 'u6', at: at(-1, 18), kind: 'abatere', read: false, text: 'Ai 2 abateri din 3. Încă 1 restanță duce la dezactivarea contului.' },
    { id: uid('n'), userId: 'u2', at: at(-1, 18), kind: 'abatere', read: false, text: 'Radu Pavel are 2 abateri. Următoarea restanță îi dezactivează contul.' },
    { id: uid('n'), userId: 'u7', at: now - 5 * HOUR, kind: 'overdue', read: false, text: '„Rulare suită de teste de regresie” a devenit restantă (2/3 până la o abatere).' },
    { id: uid('n'), userId: 'u3', at: now - 30 * HOUR, kind: 'comment', read: true, text: 'Elena a comentat la „Kanban drag & drop pentru proiecte”.' },
    { id: uid('n'), userId: 'u1', at: at(-3, 18, 1), kind: 'fired', read: false, text: 'Victor Lazăr a fost concediat automat (3 abateri).' },
  ];

  return {
    version: SCHEMA_VERSION,
    clockOffset: 0,
    createdAt: now,
    departments,
    positions,
    users,
    tasks,
    projects,
    activity,
    notifications,
    promotions: [],
  };
}
