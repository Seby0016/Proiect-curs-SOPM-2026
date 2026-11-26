// =====================================================================
//  Date demo — SCHELET (Etapa 1)
//  Responsabil: Sarca Yanis
//  Firma fictivă „Yagi Systems”. Momentan doar echipa noastră, ca să
//  meargă autentificarea. În Etapa 2 adăugăm angajați, proiecte, activități.
// =====================================================================
import { DEMO_PASSWORD, emailFor, hashPassword } from '../logic/auth.js';

export const SCHEMA_VERSION = 1; // crește la fiecare schimbare de structură

export const departments = [
  { id: 'd-dir', name: 'Conducere', short: 'DIR', hue: 260 },
  { id: 'd-ing', name: 'Inginerie Software', short: 'ING', hue: 220 },
  { id: 'd-qa', name: 'Calitate & Testare', short: 'QA', hue: 165 },
];

const ALL = ['task.assign', 'task.cancel', 'task.validate', 'team.view', 'project.create', 'promo.propose', 'positions.manage', 'time.machine', 'scope.all'];
const MANAGER = ['task.assign', 'task.cancel', 'task.validate', 'team.view', 'project.create', 'promo.propose', 'time.machine'];

export const positions = [
  { id: 'p-dir', title: 'Director General', departmentId: 'd-dir', level: 1, permissions: ALL, templates: [] },
  { id: 'p-mgr-ing', title: 'Manager Inginerie', departmentId: 'd-ing', level: 2, permissions: MANAGER, templates: [] },
  { id: 'p-mgr-qa', title: 'Manager QA & Integrări', departmentId: 'd-qa', level: 2, permissions: MANAGER, templates: [] },
  { id: 'p-fe', title: 'Dezvoltator Frontend React', departmentId: 'd-ing', level: 3, permissions: [], templates: [] },
];

export const initials = (name) => name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

export function createSeed(now) {
  const person = (id, name, positionId, managerId, hue, grade) => {
    const email = emailFor(name);
    return {
      id, name, email, passwordHash: hashPassword(DEMO_PASSWORD, email),
      positionId, managerId, hue, grade, pp: 0, restante: 0, abateri: 0,
      status: 'activ', hiredAt: now, dosar: [],
    };
  };
  return {
    version: SCHEMA_VERSION,
    clockOffset: 0,
    createdAt: now,
    departments,
    positions,
    users: [
      person('u1', 'Sebastian Iordache', 'p-dir', null, 260, 4),
      person('u2', 'Yanis Sarca', 'p-mgr-ing', 'u1', 220, 3),
      person('u3', 'Sergiu Simin', 'p-mgr-qa', 'u1', 165, 3),
      person('u4', 'Decebal Iordache', 'p-fe', 'u2', 330, 2),
    ],
    projects: [],   // TODO Etapa 2: 3 proiecte de grup
    tasks: [],      // TODO Etapa 2: ~40 de activități cu toate statusurile
    activity: [],
    notifications: [],
    promotions: [],
  };
}
