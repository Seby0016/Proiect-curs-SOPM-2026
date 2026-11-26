// Responsabil: Simin Sergiu
// Dosarul angajatului: abateri, istoric, activități, calificativ și „Contul meu” (schimbarea parolei).
import { LuArrowLeft, LuPlus, LuUserCheck, LuMail, LuHistory, LuAward, LuListTodo, LuTrendingUp, LuKeyRound } from 'react-icons/lu';
import { dispatch, emitFx, useNow, useSession, useStore } from '../store/store.js';
import { assignableUsers, can, departmentOf, effectiveStatus, evaluation, gradeName, isSuperiorOf, performance, positionOf, subordinates } from '../logic/rules.js';
import { formatDateTime } from '../logic/time.js';
import { Avatar, Empty, Ring, AnimatedNumber } from '../components/ui.jsx';
import TaskCard from '../components/TaskCard.jsx';
import { useUI } from '../components/context.js';
import { AbateriCard } from './Dashboard.jsx';
import { RatingPill } from './Evaluation.jsx';
import { useState } from 'react';
import { authenticate, passwordProblem } from '../logic/auth.js';

function ChangePassword({ me, users }) {
  const [f, setF] = useState({ old: '', pw: '', pw2: '' });
  const [err, setErr] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (authenticate(users, me.email, f.old).error) return setErr('Parola actuală nu este corectă.');
    const p = passwordProblem(f.pw);
    if (p) return setErr(p);
    if (f.pw !== f.pw2) return setErr('Parolele noi nu coincid.');
    dispatch({ type: 'user/password', password: f.pw });
    setF({ old: '', pw: '', pw2: '' }); setErr('');
    emitFx({ type: 'toast', kind: 'completed', title: 'Parola a fost schimbată', text: 'Folosește parola nouă la următoarea autentificare.' });
  };
  return (
    <form className="card card-pad grid" style={{ gap: 12 }} onSubmit={submit}>
      <h3 className="row" style={{ gap: 8 }}><LuKeyRound /> Contul meu</h3>
      <p className="muted" style={{ fontSize: 13.5 }}>Te autentifici cu <b className="mono">{me.email}</b>.</p>
      <input id="pw-old" className="input" type="password" placeholder="Parola actuală" autoComplete="current-password" value={f.old} onChange={(e) => setF({ ...f, old: e.target.value })} />
      <input id="pw-new" className="input" type="password" placeholder="Parola nouă (min. 8, litere și cifre)" autoComplete="new-password" value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} />
      <input id="pw-new2" className="input" type="password" placeholder="Repetă parola nouă" autoComplete="new-password" value={f.pw2} onChange={(e) => setF({ ...f, pw2: e.target.value })} />
      {err && <p className="login-error">{err}</p>}
      <button className="btn" style={{ justifySelf: 'start' }}>Schimbă parola</button>
    </form>
  );
}

export default function Employee({ id }) {
  const state = useStore();
  const me = useSession();
  const now = useNow();
  const ui = useUI();
  const u = state.users.find((x) => x.id === id);
  if (!u) return <div className="card"><Empty title="Angajatul nu există" /></div>;
  const allowed = u.id === me.id || can(state, me, 'scope.all') || subordinates(state, me.id).some((s) => s.id === u.id);
  if (!allowed) return <div className="card"><Empty title="Nu ai acces la acest dosar">Poți vedea doar dosarele subordonaților tăi.</Empty></div>;

  const p = performance(state, u, now);
  const ev = evaluation(state, u, now);
  const pendingPromo = (state.promotions ?? []).some((x) => x.userId === u.id && x.status === 'pending');
  const canPropose = ev.promotable && !pendingPromo && can(state, me, 'promo.propose') && (can(state, me, 'scope.all') || isSuperiorOf(state, me.id, u.id));
  const manager = state.users.find((x) => x.id === u.managerId);
  const fired = u.status === 'concediat';
  const canAssign = assignableUsers(state, me).some((x) => x.id === u.id) && u.id !== me.id;
  const tasks = state.tasks.filter((t) => t.assigneeIds.includes(u.id)).sort((a, b) => {
    const o = { overdue: 0, upcoming: 1, completed: 2, canceled: 3 };
    return o[effectiveStatus(a, now)] - o[effectiveStatus(b, now)] || a.dueDate - b.dueDate;
  });

  return (
    <div className="page grid" style={{ gap: 20 }}>
      {can(state, me, 'team.view') && <a href="#echipa" className="btn ghost sm" style={{ justifySelf: 'start' }}><LuArrowLeft /> Echipă</a>}
      <section className="card card-pad" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="row wrap" style={{ gap: 20 }}>
          <Avatar user={u} size="xl" />
          <div style={{ flex: '1 1 260px', minWidth: 0 }}>
            <div className="eyebrow">{departmentOf(state, u)?.name}</div>
            <h1 style={{ marginTop: 4 }}>{u.name}</h1>
            <p className="muted" style={{ marginTop: 4 }}>{positionOf(state, u)?.title} · <b>{gradeName(u.grade)}</b>{manager && <> · raportează lui <a href={`#angajat-${manager.id}`} style={{ color: 'var(--accent)' }}>{manager.name}</a></>}</p>
            <p className="muted row" style={{ gap: 6, marginTop: 4, fontSize: 13 }}><LuMail /> <span className="mono">{u.email}</span></p>
            <div className="row wrap" style={{ marginTop: 14 }}>
              {canPropose && !fired && <button className="btn" onClick={() => dispatch({ type: 'promo/propose', userId: u.id, reason: `Calificativ ${ev.rating.label} în ${ev.quarter.label}` })}><LuTrendingUp /> Propune promovare la {gradeName(u.grade + 1)}</button>}
              {pendingPromo && <span className="tag">Propunere de promovare în așteptare</span>}
              {canAssign && !fired && <button className="btn primary" onClick={() => ui.newTask({ assigneeIds: [u.id] })}><LuPlus /> Atribuie activitate</button>}
              {fired && can(state, me, 'positions.manage') && <button className="btn" onClick={() => dispatch({ type: 'user/reinstate', id: u.id })}><LuUserCheck /> Reactivează contul</button>}
            </div>
          </div>
          {fired ? (
            <div className="stamp" style={{ mixBlendMode: 'normal', fontSize: 26 }}>Concediat</div>
          ) : (
            <div className="row" style={{ gap: 16 }}>
              <Ring value={p.score / 100} size={92} stroke={9} color={p.score >= 80 ? 'var(--completed)' : p.score >= 55 ? 'var(--warn)' : 'var(--overdue)'} label={<AnimatedNumber value={p.score} />} sub="scor" />
              <div className="eval-mini">
                <small>{ev.quarter.label}</small>
                <RatingPill rating={ev.rating} />
                <b className="mono">{ev.pp} PP</b>
                <span>{ev.rating.effect}</span>
              </div>
            </div>
          )}
        </div>
        {fired && <p className="callout danger" style={{ marginTop: 16 }}>Cont dezactivat automat pe {formatDateTime(u.firedAt)} după a 3-a abatere.</p>}
      </section>

      <div className="grid two-col" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', alignItems: 'start' }}>
        <section className="card card-pad">
          <h3 className="row" style={{ gap: 8, marginBottom: 14 }}><LuListTodo /> Activități ({tasks.length})</h3>
          <div className="task-list">
            {tasks.map((t, i) => <TaskCard key={t.id} task={t} state={state} me={me} now={now} index={Math.min(i, 10)} showAssignee={t.assigneeIds.length > 1} />)}
            {!tasks.length && <Empty title="Nicio activitate" />}
          </div>
        </section>
        <div className="grid" style={{ gap: 18 }}>
          <AbateriCard user={u} />
          {u.id === me.id && <ChangePassword me={me} users={state.users} />}
          <section className="card card-pad">
            <h3 className="row" style={{ gap: 8, marginBottom: 16 }}><LuHistory /> Dosar</h3>
            <div className="timeline">
              {[...u.dosar].sort((a, b) => b.at - a.at).map((d, i) => (
                <div key={d.id} className={`tl-item ${d.type}`} style={{ '--i': i }}>
                  <small>{formatDateTime(d.at)} · {d.type}</small>
                  <p>{d.text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
