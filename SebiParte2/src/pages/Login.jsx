// Responsabil: Iordache Sebastian
// Autentificarea cu email și parolă, conturile demo și posterul animat.
import { useRef, useState } from 'react';
import { LuTriangleAlert, LuRotateCcw, LuMonitorSmartphone, LuEye, LuEyeOff, LuLogIn } from 'react-icons/lu';
import { DEMO_PASSWORD } from '../logic/auth.js';
import { login, resetDemo, useNow, useStore } from '../store/store.js';
import { effectiveStatus, positionOf } from '../logic/rules.js';
import { Avatar, AnimatedNumber } from '../components/ui.jsx';

/** Compoziție-poster Bauhaus animată: formele ierarhiei se așază pe pagină. */
function Composition() {
  return (
    <svg className="composition" viewBox="0 0 600 720" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      <rect className="c-bar c1" x="300" y="40" width="300" height="18" fill="#111111" />
      <g className="c-orbit"><circle cx="470" cy="310" r="210" fill="none" stroke="#111111" strokeWidth="3" strokeDasharray="4 14" /></g>
      <circle className="c-sun" cx="470" cy="310" r="170" fill="#1F3FBF" />
      <path className="c-half" d="M300 310 A170 170 0 0 1 640 310 Z" fill="#D7261E" />
      <rect className="c-sq" x="505" y="78" width="66" height="66" fill="#F5F3EE" stroke="#111111" strokeWidth="3" />
      <polygon className="c-tri" points="340,720 490,450 640,720" fill="#111111" />
      <circle className="c-dot d1" cx="330" cy="108" r="16" fill="#D7261E" />
      <circle className="c-dot d2" cx="374" cy="108" r="16" fill="#111111" />
      <circle className="c-dot d3" cx="418" cy="108" r="16" fill="#F5F3EE" stroke="#111111" strokeWidth="3" />
      <rect className="c-bar c2" x="0" y="700" width="260" height="20" fill="#1F3FBF" />
    </svg>
  );
}

export default function Login() {
  const state = useStore();
  const now = useNow();
  const counts = { upcoming: 0, overdue: 0, completed: 0, canceled: 0 };
  for (const t of state.tasks) counts[effectiveStatus(t, now)]++;

  const groups = [
    { title: 'Conducere', level: 1 },
    { title: 'Manageri de departament', level: 2 },
    { title: 'Angajați', level: 3 },
  ];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [tries, setTries] = useState(0);
  const emailRef = useRef(null);
  const pwRef = useRef(null);

  const submit = (e) => {
    e.preventDefault();
    const r = login(email, password);
    if (r.error) {
      setError(r.error);
      setTries((t) => t + 1);
      document.querySelector('.login-form')?.classList.remove('shake');
      requestAnimationFrame(() => document.querySelector('.login-form')?.classList.add('shake'));
    }
  };
  const pick = (u) => {
    setEmail(u.email);
    setError('');
    setPassword(DEMO_PASSWORD);
    pwRef.current?.focus();
  };

  let i = 0;
  return (
    <div className="login">
      <section className="login-hero">
        <Composition />
        <div className="brand" style={{ padding: 0 }}>
          <span className="brand-mark">Y</span>
          <div><b>Yagi Tasks</b><small>Echipa Yagi · SOPM</small></div>
        </div>
        <div>
          <h1>Fiecare activitate, la locul ei în <em>ierarhie</em>.</h1>
          <p>Activități pe roluri, validate de superiorul ierarhic. Restanțele le marchează sistemul: 3 restanțe aduc o abatere, a treia abatere dezactivează contul.</p>
        </div>
        <div className="hero-stats">
          {['upcoming', 'overdue', 'completed', 'canceled'].map((s, k) => (
            <span key={s} className={`status ${s}`} style={{ '--i': k }}>
              <AnimatedNumber value={counts[s]} /> {{ upcoming: 'Urmează', overdue: 'Restante', completed: 'Complete', canceled: 'Anulate' }[s]}
            </span>
          ))}
        </div>
      </section>

      <section className="login-panel">
        <form className="login-form" onSubmit={submit} noValidate>
          <div>
            <div className="eyebrow">Autentificare</div>
            <h2 style={{ marginTop: 6 }}>Intră în <span className="hl">cont</span></h2>
            <p className="muted" style={{ marginTop: 6 }}>Folosește adresa de serviciu. Fiecare cont vede activitățile postului și departamentului său.</p>
          </div>
          <label className="field"><span>Email</span>
            <input id="login-email" ref={emailRef} className="input" type="email" autoComplete="username" placeholder="prenume.nume@yagi.ro" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} />
          </label>
          <label className="field"><span>Parolă</span>
            <span className="pw-wrap">
              <input id="login-password" ref={pwRef} className="input" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Ascunde parola' : 'Arată parola'}>{showPw ? <LuEyeOff /> : <LuEye />}</button>
            </span>
          </label>
          {error && <p className="login-error" role="alert" key={error + tries}><LuTriangleAlert /> {error}</p>}
          <button className="btn primary login-submit" type="submit"><LuLogIn /> Intră în cont</button>
        </form>

        <details className="demo-accounts" open>
          <summary>Conturi demo · parola pentru toate: <code className="mono">{DEMO_PASSWORD}</code></summary>
          <p className="muted" style={{ fontSize: 13, margin: '8px 0 12px' }}>Apasă pe un cont ca să-i completezi emailul, apoi „Intră în cont”.</p>
          {groups.map((g) => {
            const users = state.users.filter((u) => positionOf(state, u)?.level === g.level);
            if (!users.length) return null;
            return (
              <div className="account-group" key={g.level}>
                <h4>{g.title}</h4>
                <div className="accounts">
                  {users.map((u) => {
                    const fired = u.status === 'concediat';
                    return (
                      <button key={u.id} type="button" className={`account ${email === u.email ? 'picked' : ''}`} style={{ '--i': i++ }} onClick={() => pick(u)} title={fired ? 'Cont dezactivat după 3 abateri' : `Completează ${u.email}`}>
                        <Avatar user={u} />
                        <div>
                          <b>{u.name}</b>
                          <small className="mono">{u.email}</small>
                        </div>
                        {fired ? <span className="badge-fired">Concediat</span> : u.abateri > 0 && <span className="warn-ic" title={`${u.abateri} abateri`}><LuTriangleAlert /> <b className="mono" style={{ fontSize: 12, display: 'inline' }}>{u.abateri}/3</b></span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </details>
        <div className="callout" style={{ background: 'var(--accent-soft)' }}>
          <LuMonitorSmartphone style={{ color: 'var(--accent)' }} />
          <span>Deschide aplicația în două tab-uri și intră cu conturi diferite: orice modificare apare instant în celălalt tab.</span>
        </div>
        <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={resetDemo}><LuRotateCcw /> Resetează datele demo</button>
      </section>
    </div>
  );
}
