// Responsabil: Iordache Sebastian
// Posturi predefinite: fiecare post vine cu permisiuni și cu activitățile fișei postului,
// atribuite automat la angajare.
import { useState } from 'react';
import { LuUserPlus, LuBriefcase, LuListChecks, LuKeyRound, LuRotateCcw } from 'react-icons/lu';
import { dispatch, resetDemo, useStore, emitFx } from '../store/store.js';
import { PERMISSIONS, PRIORITY_META } from '../logic/rules.js';
import { go, swatch } from '../components/ui.jsx';
import { DEMO_PASSWORD, passwordProblem, emailFor } from '../logic/auth.js';

export default function Positions() {
  const state = useStore();
  const [name, setName] = useState('');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const pwErr = passwordProblem(password);
  const [positionId, setPositionId] = useState('p-dev');
  const pos = state.positions.find((p) => p.id === positionId);
  const managers = state.users.filter((u) => u.status === 'activ' && state.positions.find((p) => p.id === u.positionId)?.level < 3);
  const defaultMgr = managers.find((m) => state.positions.find((p) => p.id === m.positionId)?.departmentId === pos?.departmentId) ?? managers[0];
  const [managerId, setManagerId] = useState('');
  const mgr = managerId || defaultMgr?.id;

  const hire = (e) => {
    e.preventDefault();
    if (!name.trim() || pwErr) return;
    const before = new Set(state.users.map((u) => u.id));
    const next = dispatch({ type: 'user/hire', name: name.trim(), positionId, managerId: mgr, password });
    const created = next.users.find((u) => !before.has(u.id));
    emitFx({ type: 'toast', kind: 'completed', title: `${name.trim()} a fost angajat`, text: `Cont creat: ${created?.email}. ${pos.templates.length} activități din fișa postului au fost atribuite automat.`, ttl: 7000 });
    setName('');
    if (created) setTimeout(() => go(`angajat-${created.id}`), 400);
  };

  const togglePerm = (p, perm) => {
    if (p.id === 'p-dir') return;
    const has = p.permissions.includes(perm);
    dispatch({ type: 'position/update', id: p.id, patch: { permissions: has ? p.permissions.filter((x) => x !== perm) : [...p.permissions, perm] } });
  };

  return (
    <div className="page grid" style={{ gap: 22 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <div className="eyebrow">Posturi predefinite</div>
          <h1 style={{ marginTop: 6 }}>Posturi & angajări</h1>
          <p>Fiecare angajat primește automat permisiunile și activitățile fișei postului său. Modifică permisiunile cu un clic.</p>
        </div>
        <button className="btn" onClick={resetDemo}><LuRotateCcw /> Resetează datele demo</button>
      </div>

      <form className="card card-pad" onSubmit={hire}>
        <h3 className="row" style={{ gap: 8, marginBottom: 14 }}><LuUserPlus /> Angajează pe un post predefinit</h3>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <label className="field"><span>Nume complet</span><input id="hire-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Maria Ionescu" /></label>
          <label className="field"><span>Post</span>
            <select id="hire-pos" className="select" value={positionId} onChange={(e) => { setPositionId(e.target.value); setManagerId(''); }}>
              {state.positions.filter((p) => p.level > 1).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </label>
          <label className="field"><span>Parolă inițială</span>
            <input id="hire-pw" className="input mono" value={password} onChange={(e) => setPassword(e.target.value)} />
            {pwErr && <small style={{ color: 'var(--red)' }}>{pwErr}</small>}
          </label>
          <label className="field"><span>Superior ierarhic</span>
            <select id="hire-mgr" className="select" value={mgr} onChange={(e) => setManagerId(e.target.value)}>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
        </div>
        {pos && (
          <div className="callout" style={{ marginTop: 14, background: 'var(--accent-soft)' }}>
            <LuListChecks style={{ color: 'var(--accent)' }} />
            <span>Contul va fi <b className="mono">{name.trim() ? emailFor(name, state.users.map((u) => u.email)) : 'prenume.nume@yagi.ro'}</b>. Se vor atribui automat: {pos.templates.map((t) => `„${t.title}”`).join(', ')}.</span>
          </div>
        )}
        <div className="row" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
          <button className="btn primary" disabled={!name.trim() || !!pwErr}><LuUserPlus /> Angajează și creează contul</button>
        </div>
      </form>

      <div className="projects stagger" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {state.positions.map((p, i) => {
          const dept = state.departments.find((d) => d.id === p.departmentId);
          const count = state.users.filter((u) => u.positionId === p.id && u.status === 'activ').length;
          return (
            <section key={p.id} className="card card-pad" style={{ '--i': i, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <span className="b-ic" style={{ width: 38, height: 38, borderRadius: 0, display: 'grid', placeItems: 'center', background: swatch(dept?.hue), color: swatch(dept?.hue) === 'var(--yellow)' ? '#111' : '#fff', flex: 'none' }}><LuBriefcase /></span>
                <div style={{ minWidth: 0 }}>
                  <h3>{p.title}</h3>
                  <div className="muted" style={{ fontSize: 12.5 }}>{dept?.name} · nivel ierarhic {p.level} · {count} {count === 1 ? 'persoană' : 'persoane'}</div>
                </div>
              </div>
              <div>
                <div className="muted row" style={{ gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}><LuKeyRound /> Permisiuni</div>
                <div className="perm-list">
                  {Object.entries(PERMISSIONS).map(([k, label]) => (
                    <button key={k} type="button" className={`perm ${p.permissions.includes(k) ? 'on' : ''}`} onClick={() => togglePerm(p, k)} disabled={p.id === 'p-dir'} title={p.id === 'p-dir' ? 'Directorul are toate permisiunile' : 'Comută permisiunea'}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="muted row" style={{ gap: 6, fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}><LuListChecks /> Fișa postului</div>
                {p.templates.map((t) => (
                  <div key={t.title} className="row" style={{ padding: '7px 0', borderTop: '1px solid var(--line-2)', fontSize: 14 }}>
                    <span style={{ flex: 1, minWidth: 0 }}>{t.title}</span>
                    <span className="muted" style={{ fontSize: 12 }}>{PRIORITY_META[t.priority].ro} · {t.days} zile</span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
