// Responsabil: Simin Sergiu
// Autentificare locală pentru demo. Parolele NU se păstrează în clar, ci ca hash
// (cyrb53 cu sare = emailul). Pe server, în etapa următoare, se înlocuiește cu bcrypt/argon2.
export const DEMO_PASSWORD = 'yagi2026';

const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** prenume.nume@yagi.ro, fără diacritice; adaugă un număr dacă emailul e deja folosit. */
export function emailFor(name, taken = []) {
  const parts = strip(name).toLowerCase().replace(/[^a-z\s-]/g, '').trim().split(/\s+/);
  const base = parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0];
  let email = `${base}@yagi.ro`;
  for (let i = 2; taken.includes(email); i++) email = `${base}${i}@yagi.ro`;
  return email;
}

export function hashPassword(password, email) {
  const str = `${email.toLowerCase()}::${password}`;
  let h1 = 0xdeadbeef ^ 0x9e37;
  let h2 = 0x41c6ce57 ^ 0x9e37;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Verifică datele de autentificare. Returnează { user } sau { error }. */
export function authenticate(users, email, password) {
  const e = (email ?? '').trim().toLowerCase();
  if (!e || !password) return { error: 'Completează emailul și parola.' };
  const user = users.find((u) => u.email.toLowerCase() === e);
  if (!user || user.passwordHash !== hashPassword(password, user.email)) return { error: 'Email sau parolă greșită.' };
  if (user.status !== 'activ') return { error: 'Contul a fost dezactivat după a 3-a abatere. Doar directorul îl poate reactiva.' };
  return { user };
}

export function passwordProblem(pw) {
  if (!pw || pw.length < 8) return 'Parola trebuie să aibă cel puțin 8 caractere.';
  if (!/\d/.test(pw) || !/[A-Za-z\u00C0-\u024F]/.test(pw)) return 'Parola trebuie să conțină litere și cifre.';
  return null;
}
