// =====================================================================
//  Autentificare — SCHELET (Etapa 1)
//  Responsabil: Simin Sergiu
//  Fiecare angajat are cont propriu: prenume.nume@yagi.ro
//  Parola NU se ține în clar, ci ca hash.
// =====================================================================

export const DEMO_PASSWORD = 'yagi2026';

const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** „Sebastian Iordache” → sebastian.iordache@yagi.ro */
export function emailFor(name, taken = []) {
  const parts = strip(name).toLowerCase().trim().split(/\s+/);
  let email = `${parts[0]}.${parts[parts.length - 1]}@yagi.ro`;
  for (let i = 2; taken.includes(email); i++) email = `${parts[0]}.${parts[parts.length - 1]}${i}@yagi.ro`;
  return email;
}

/** TODO Etapa 2: hash real (cyrb53 cu sare = emailul). Acum e doar un marcaj. */
export function hashPassword(password, email) {
  return `schelet:${email.toLowerCase()}:${password.length}`;
}

/** Întoarce { user } dacă datele sunt corecte, altfel { error }. */
export function authenticate(users, email, password) {
  const e = (email ?? '').trim().toLowerCase();
  if (!e || !password) return { error: 'Completează emailul și parola.' };
  const user = users.find((u) => u.email.toLowerCase() === e);
  if (!user || password !== DEMO_PASSWORD) return { error: 'Email sau parolă greșită.' };
  // TODO Etapa 2: compară hash-ul și refuză contul concediat
  return { user };
}

/** Regula de parolă: minim 8 caractere, litere și cifre. */
export function passwordProblem(pw) {
  if (pw.length < 8) return 'Parola trebuie să aibă minim 8 caractere.';
  if (!/[a-z]/i.test(pw) || !/\d/.test(pw)) return 'Parola trebuie să conțină litere și cifre.';
  return null;
}
