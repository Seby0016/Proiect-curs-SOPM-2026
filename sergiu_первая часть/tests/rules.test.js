// =====================================================================
//  Teste — SCHELET (Etapa 1)
//  Responsabil: Simin Sergiu
//  Rulează cu: npm test
// =====================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveStatus } from '../src/logic/rules.js';
import { authenticate, emailFor, passwordProblem, DEMO_PASSWORD } from '../src/logic/auth.js';
import { createSeed } from '../src/data/seed.js';
import { HOUR } from '../src/logic/time.js';

test('o activitate cu termen depășit devine automat Restant', () => {
  const now = Date.now();
  assert.equal(effectiveStatus({ status: 'upcoming', dueDate: now - HOUR }, now), 'overdue');
  assert.equal(effectiveStatus({ status: 'upcoming', dueDate: now + HOUR }, now), 'upcoming');
});

test('fiecare membru are cont prenume.nume@yagi.ro', () => {
  assert.equal(emailFor('Sebastian Iordache'), 'sebastian.iordache@yagi.ro');
  const { users } = createSeed(Date.now());
  assert.ok(authenticate(users, 'yanis.sarca@yagi.ro', DEMO_PASSWORD).user);
  assert.ok(authenticate(users, 'yanis.sarca@yagi.ro', 'gresit').error);
});

test('regula de parolă', () => {
  assert.ok(passwordProblem('scurt'));
  assert.equal(passwordProblem('parola2026'), null);
});

// TODO Etapa 2: 3 restanțe = 1 abatere; a 3-a abatere = concediere;
// fluxul de validare; punctele de performanță; calificativul trimestrial.
