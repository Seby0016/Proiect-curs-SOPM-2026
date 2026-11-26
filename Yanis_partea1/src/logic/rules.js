// =====================================================================
//  Regulile de business — SCHELET (Etapa 1)
//  Responsabil: Sarca Yanis
//  Aici stă „creierul” aplicației: statusuri, priorități, abateri,
//  puncte de performanță, permisiuni. Funcții PURE: primesc date,
//  întorc rezultate, nu ating interfața. De aceea se pot testa ușor.
// =====================================================================

let counter = 0;
export const uid = (p = 'id') => `${p}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

// ---------- statusuri (cele 4 din tema proiectului) ----------
export const STATUSES = ['upcoming', 'overdue', 'completed', 'canceled'];
export const STATUS_META = {
  upcoming: { ro: 'Urmează' },
  overdue: { ro: 'Restant' },
  completed: { ro: 'Complet' },
  canceled: { ro: 'Anulat' },
};

export const PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const PRIORITY_META = {
  low: { ro: 'Scăzută', pp: 10 },
  medium: { ro: 'Medie', pp: 20 },
  high: { ro: 'Ridicată', pp: 35 },
  critical: { ro: 'Critică', pp: 50 },
};

/** Constantele regulii de abateri (din tema proiectului). */
export const RULES = {
  OVERDUE_PER_ABATERE: 3, // 3 restanțe = 1 abatere
  MAX_ABATERI: 3,         // a 3-a abatere = concediere
  PENALTY_TASKS: 2,       // fiecare abatere aduce 2 activități de penalizare
  ABATERE_PP: 50,         // și −50 puncte de performanță
  ON_TIME: 1.5,           // multiplicator la timp
  LATE: 0.25,             // multiplicator cu întârziere
};

/**
 * Statusul „efectiv”: Restant NU se pune manual. Îl calculează sistemul
 * când termenul a trecut și activitatea nu e terminată.
 * TODO Etapa 2: o activitate aflată la validare nu devine restantă.
 */
export function effectiveStatus(task, now) {
  if (task.status === 'upcoming' && task.dueDate < now) return 'overdue';
  return task.status;
}

export const inReview = (task) => !!task.submittedAt && task.status === 'upcoming';
export const isPersonal = (task) => task.assigneeIds.length === 1 && task.createdBy === task.assigneeIds[0];

// ---------- grade și calificative ----------
export const GRADES = ['Junior', 'Mid', 'Senior', 'Principal'];
export const gradeName = (g = 1) => GRADES[Math.max(0, Math.min(GRADES.length - 1, g - 1))]; // gradul 1 = Junior

export const RATINGS = [
  { id: 'exceptional', label: 'Excepțional', min: { score: 90, pp: 350 }, effect: 'Bonus 15% și propunere de promovare' },
  { id: 'peste', label: 'Peste așteptări', min: { score: 75, pp: 200 }, effect: 'Bonus 8%' },
  { id: 'conform', label: 'Conform', min: { score: 55, pp: 0 }, effect: 'Fără bonus' },
  { id: 'sub', label: 'Sub așteptări', min: null, effect: 'Plan de îmbunătățire (PIP)' },
];

/** TODO Etapa 2: calculul real (PP din trimestru, scor, abateri, promovabil). */
export function evaluation(state, user) {
  return {
    quarter: { label: 'T4' },
    pp: user?.pp ?? 0,
    score: 0,
    rating: RATINGS[2],
    next: RATINGS[1],
    toNext: 200,
    counts: { upcoming: 0, overdue: 0, completed: 0, canceled: 0 },
  };
}

// ---------- ierarhie și permisiuni ----------
export function positionOf(state, user) {
  return state.positions.find((p) => p.id === user?.positionId) ?? null;
}

/** Are utilizatorul permisiunea `perm` prin postul lui? */
export function can(state, user, perm) {
  return !!positionOf(state, user)?.permissions.includes(perm);
}

export function departmentOf(state, user) {
  const pos = positionOf(state, user);
  return state.departments.find((d) => d.id === pos?.departmentId) ?? null;
}

// TODO Etapa 2 (le folosesc paginile lui Decebal și Sebastian):
//   pointsFor(task)            punctele primite la validare
//   evaluate(state, now)       motorul de abateri: restanțe → abatere → concediere
//   performance, quarterOf, userTasks, subordinates, isSuperiorOf, assignableUsers
//   validatorId, canValidate, canWork, canSubmit, canManage, canEditTask,
//   canDeleteTask, canCancelTask, canReopen, PERMISSIONS
export const canValidate = () => false;
export const subordinates = () => [];
export const assignableUsers = (state) => state.users.filter((u) => u.status === 'activ');
