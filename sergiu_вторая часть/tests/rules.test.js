// Responsabil: Simin Sergiu
// Teste pentru logica de business. Rulare: npm test  (node --test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveStatus, evaluate, RULES, pointsFor, evaluation, canDeleteTask, canCancelTask, canValidate, canSubmit, validatorId, isPersonal, assignableUsers } from '../src/logic/rules.js';
import { parseQuickAdd } from '../src/logic/parse.js';
import { createSeed } from '../src/data/seed.js';
import { DAY, HOUR, startOfDay } from '../src/logic/time.js';

const NOW = new Date(2026, 10, 5, 12, 0).getTime(); // joi, 5 nov 2026

const baseState = (userPatch = {}, tasks = []) => ({
  positions: [{ id: 'p', title: 'Dev', templates: [{ title: 'Șablon A' }, { title: 'Șablon B' }] }],
  users: [{ id: 'u', name: 'Test', positionId: 'p', status: 'activ', restante: 0, abateri: 0, dosar: [], ...userPatch }],
  tasks,
});
const task = (o = {}) => ({ id: Math.random().toString(36), title: 't', assigneeIds: ['u'], status: 'upcoming', dueDate: NOW + DAY, priority: 'medium', ...o });

test('statusul efectiv: termen depășit → Restant', () => {
  assert.equal(effectiveStatus(task({ dueDate: NOW - 1 }), NOW), 'overdue');
  assert.equal(effectiveStatus(task({ dueDate: NOW + 1 }), NOW), 'upcoming');
  assert.equal(effectiveStatus(task({ dueDate: NOW - 1, status: 'completed' }), NOW), 'completed');
  assert.equal(effectiveStatus(task({ dueDate: NOW - 1, status: 'canceled' }), NOW), 'canceled');
  assert.equal(effectiveStatus(task({ status: 'overdue' }), NOW), 'overdue');
});

test('2 restanțe nu declanșează abatere', () => {
  const s = baseState({}, [task({ dueDate: NOW - HOUR }), task({ dueDate: NOW - 2 * HOUR })]);
  const { state, events } = evaluate(s, NOW);
  assert.equal(state.users[0].restante, 2);
  assert.equal(state.users[0].abateri, 0);
  assert.equal(events.filter((e) => e.type === 'abatere').length, 0);
});

test('3 restanțe → 1 abatere + 2 task-uri de penalizare', () => {
  const s = baseState({}, [1, 2, 3].map((i) => task({ dueDate: NOW - i * HOUR })));
  const { state, events } = evaluate(s, NOW);
  const u = state.users[0];
  assert.equal(u.abateri, 1);
  const pen = state.tasks.filter((t) => t.isPenalty);
  assert.equal(pen.length, RULES.PENALTY_TASKS);
  assert.ok(pen.every((t) => t.dueDate > NOW && t.assigneeIds[0] === 'u'));
  assert.ok(events.some((e) => e.type === 'penalty'));
  assert.ok(u.dosar.some((d) => d.type === 'abatere'));
});

test('evaluarea este idempotentă', () => {
  const s = baseState({}, [1, 2, 3].map((i) => task({ dueDate: NOW - i * HOUR })));
  const first = evaluate(s, NOW).state;
  const second = evaluate(first, NOW);
  assert.equal(second.events.length, 0);
  assert.equal(second.state, first);
});

test('a 3-a abatere → cont concediat, fără penalizări noi', () => {
  const s = baseState({ restante: 8, abateri: 2 }, [task({ dueDate: NOW - HOUR })]);
  const { state, events } = evaluate(s, NOW);
  const u = state.users[0];
  assert.equal(u.abateri, 3);
  assert.equal(u.status, 'concediat');
  assert.ok(events.some((e) => e.type === 'fired'));
  assert.equal(state.tasks.filter((t) => t.isPenalty).length, 0);
});

test('angajații concediați nu mai acumulează restanțe', () => {
  const s = baseState({ status: 'concediat', restante: 9, abateri: 3 }, [task({ dueDate: NOW - HOUR })]);
  const { state } = evaluate(s, NOW);
  assert.equal(state.users[0].restante, 9);
});

test('task finalizat după termen rămâne contorizat o singură dată', () => {
  const s = baseState({}, [task({ id: 'x', dueDate: NOW - HOUR })]);
  const a = evaluate(s, NOW).state;
  const completed = { ...a, tasks: a.tasks.map((t) => ({ ...t, status: 'completed' })) };
  const b = evaluate(completed, NOW + DAY).state;
  assert.equal(b.users[0].restante, 1);
});

test('puncte de performanță: la timp ×1,5, întârziat ×0,25, personal 0', () => {
  const t = task({ priority: 'high', createdBy: 'mgr' });
  assert.equal(pointsFor(t, NOW), 53);
  assert.equal(pointsFor(t, NOW + 2 * DAY), 9);
  assert.equal(pointsFor(task({ createdBy: 'u' }), NOW), 0);
});

test('restanța nu poate fi pusă manual și nu apare cât timp activitatea e la validare', () => {
  const t = task({ dueDate: NOW - HOUR, submittedAt: NOW - 2 * HOUR });
  assert.equal(effectiveStatus(t, NOW), 'upcoming');
  assert.equal(effectiveStatus({ ...t, submittedAt: NOW }, NOW), 'overdue');
});

test('activitățile personale nu intră în dosarul de abateri', () => {
  const s = baseState({}, [1, 2, 3].map((i) => task({ dueDate: NOW - i * HOUR, createdBy: 'u' })));
  const { state } = evaluate(s, NOW);
  assert.equal(state.users[0].restante, 0);
});

test('abaterea scade 50 de puncte de performanță', () => {
  const s = baseState({ pp: 120 }, [1, 2, 3].map((i) => task({ dueDate: NOW - i * HOUR })));
  assert.equal(evaluate(s, NOW).state.users[0].pp, 70);
});

test('flux de validare: angajatul trimite, managerul care a atribuit validează', () => {
  const seed = createSeed(NOW);
  const yanis = seed.users.find((u) => u.id === 'u2');
  const andreea = seed.users.find((u) => u.id === 'u5');
  const t = seed.tasks.find((x) => x.title.startsWith('Endpoint export'));
  assert.equal(validatorId(seed, t), 'u2');
  assert.ok(canValidate(seed, yanis, t));
  assert.equal(canValidate(seed, andreea, t), false);
  const personal = seed.tasks.find((x) => x.title.startsWith('Pregătire notițe'));
  assert.ok(isPersonal(personal));
  assert.equal(canSubmit(seed, andreea, personal), false);
});

test('calificativ: abaterile din trimestru blochează bonusul', () => {
  const seed = createSeed(NOW);
  const ev = (id) => evaluation(seed, seed.users.find((u) => u.id === id), NOW);
  assert.equal(ev('u5').rating.id, 'exceptional');
  assert.equal(ev('u6').rating.id, 'sub');
  assert.ok(ev('u6').blockedByAbateri);
});

test('adăugare rapidă: dată, oră, prioritate, etichetă, persoană', () => {
  const r = parseQuickAdd('raport sprint mâine la 15 !mare #raport @andreea', NOW, [{ id: 'u5', name: 'Andreea Popescu' }]);
  assert.equal(r.title, 'Raport sprint');
  assert.equal(r.priority, 'high');
  assert.deepEqual(r.tags, ['raport']);
  assert.equal(r.assigneeId, 'u5');
  const d = new Date(r.dueDate);
  assert.equal(startOfDay(r.dueDate), startOfDay(NOW + DAY));
  assert.equal(d.getHours(), 15);
});

test('adăugare rapidă: zi a săptămânii și „în N zile”', () => {
  const luni = parseQuickAdd('Ședință luni', NOW);
  assert.equal(new Date(luni.dueDate).getDay(), 1);
  const n = parseQuickAdd('Demo în 3 zile', NOW);
  assert.equal(startOfDay(n.dueDate), startOfDay(NOW + 3 * DAY));
  assert.equal(n.title, 'Demo');
});

test('date demo: consistente la încărcare (fără evenimente fantomă)', () => {
  const seed = createSeed(NOW);
  const { events } = evaluate(seed, NOW);
  assert.equal(events.length, 0, JSON.stringify(events));
  const radu = seed.users.find((u) => u.id === 'u6');
  assert.equal(radu.abateri, 2);
  assert.equal(seed.users.find((u) => u.id === 'u10').status, 'concediat');
});

test('date demo: Radu e concediat după ce expiră scriptul de backup', () => {
  const seed = createSeed(NOW);
  const { state, events } = evaluate(seed, NOW + 2 * DAY);
  assert.equal(state.users.find((u) => u.id === 'u6').status, 'concediat');
  assert.ok(events.some((e) => e.type === 'fired' && e.userId === 'u6'));
});

test('permisiuni: angajatul nu poate șterge task-urile primite de la manager', () => {
  const seed = createSeed(NOW);
  const radu = seed.users.find((u) => u.id === 'u6');
  const yanis = seed.users.find((u) => u.id === 'u2');
  const t = seed.tasks.find((x) => x.title.startsWith('Script de backup'));
  assert.equal(canDeleteTask(seed, radu, t), false);
  assert.equal(canCancelTask(seed, radu, t), false);
  assert.equal(canDeleteTask(seed, yanis, t), true);
  assert.ok(assignableUsers(seed, yanis).some((u) => u.id === 'u6'));
  assert.equal(assignableUsers(seed, radu).length, 1);
});

import { authenticate, hashPassword, emailFor, passwordProblem, DEMO_PASSWORD } from '../src/logic/auth.js';

test('autentificare: parolă corectă, greșită, cont concediat', () => {
  const seed = createSeed(NOW);
  assert.equal(authenticate(seed.users, 'Sebastian.Iordache@yagi.ro', DEMO_PASSWORD).user.id, 'u1');
  assert.ok(authenticate(seed.users, 'sebastian.iordache@yagi.ro', 'gresita123').error);
  assert.match(authenticate(seed.users, 'victor.lazar@yagi.ro', DEMO_PASSWORD).error, /dezactivat/);
  assert.ok(seed.users.every((u) => u.passwordHash && u.passwordHash !== DEMO_PASSWORD));
});

test('conturi: email unic fără diacritice, parolă validată', () => {
  assert.equal(emailFor('Victor Lazăr'), 'victor.lazar@yagi.ro');
  assert.equal(emailFor('Ana Pop', ['ana.pop@yagi.ro']), 'ana.pop2@yagi.ro');
  assert.ok(passwordProblem('scurt1'));
  assert.equal(passwordProblem('parola2026'), null);
  assert.notEqual(hashPassword('x', 'a@b.ro'), hashPassword('x', 'c@b.ro'));
});
