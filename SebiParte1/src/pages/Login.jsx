// =====================================================================
//  Autentificare — SCHELET (Etapa 1)
//  Responsabil: Iordache Sebastian
// =====================================================================
import { useState } from 'react';
import { login, useStore } from '../store/store.js';
import { DEMO_PASSWORD } from '../logic/auth.js';

export default function Login() {
  const state = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const r = login(email, password);
    if (r.error) setError(r.error);
  };
  return (
    <div className="login">
      <form className="card" onSubmit={submit}>
        <p className="eyebrow">Yagi Tasks</p>
        <h1>Intră în cont</h1>
        <input className="input" type="email" placeholder="prenume.nume@yagi.ro" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Parola" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="error">{error}</p>}
        <button className="btn primary">Autentificare</button>
        <p className="muted">Conturi de test (parola {DEMO_PASSWORD}):</p>
        {state.users.map((u) => (
          <button type="button" key={u.id} className="btn ghost" onClick={() => { setEmail(u.email); setPassword(DEMO_PASSWORD); }}>{u.name}</button>
        ))}
        {/* TODO Etapa 2: compoziția de poster animată, contul concediat refuzat */}
      </form>
    </div>
  );
}
