// Responsabil: Iordache Sebastian
// Evaluare trimestrială: punctele de performanță (PP) au sens doar prin ce produc
// în firmă: calificativ → bonus, propunere de promovare sau plan de îmbunătățire.
import { useState } from 'react';
import { LuLock, LuTrendingUp, LuCheck, LuX, LuCalculator, LuListOrdered } from 'react-icons/lu';
import { dispatch, useNow, useSession, useStore } from '../store/store.js';
import { PRIORITIES, PRIORITY_META, RATINGS, RULES, can, evaluation, gradeName, isSuperiorOf, positionOf, GRADES } from '../logic/rules.js';
import { formatShort } from '../logic/time.js';
import { Avatar, Ring, AnimatedNumber, Shape, ScoreText } from '../components/ui.jsx';

const RATING_SHAPE = { exceptional: ['square', 'var(--yellow)'], peste: ['circle', 'var(--blue)'], conform: ['circle', 'var(--grey)'], sub: ['triangle', 'var(--red)'] };

export function RatingPill({ rating }) {
  const [shape, color] = RATING_SHAPE[rating.id];
  return <span className={`rating-pill ${rating.id}`}><Shape kind={shape} size={10} color={color} /> {rating.label}</span>;
}

function MyEvaluation({ ev }) {
  const target = ev.next ? ev.next.min.pp : RATINGS[0].min.pp;
  return (
    <section className="card card-pad my-eval">
      <div className="row wrap" style={{ gap: 24, alignItems: 'center' }}>
        <Ring value={ev.score / 100} size={110} stroke={12} color={ev.score >= 75 ? 'var(--blue)' : ev.score >= 55 ? 'var(--yellow)' : 'var(--red)'} label={<AnimatedNumber value={ev.score} />} sub="livrare" />
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div className="eyebrow">Evaluarea ta · {ev.quarter.label}</div>
          <h2 style={{ fontSize: 34, marginTop: 8 }}>{ev.rating.label}</h2>
          <p style={{ marginTop: 6, fontSize: 16 }}>{ev.rating.effect}.</p>
          <div className="pp-bar" style={{ marginTop: 14 }}>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <b className="mono"><AnimatedNumber value={ev.pp} /> PP</b>
              <span className="muted">{ev.next ? (ev.blockedByAbateri ? 'Bonus blocat: ai abateri în acest trimestru' : `${ev.toNext} PP până la „${ev.next.label}”${ev.score < ev.next.min.score ? ` (și scor ≥ ${ev.next.min.score})` : ''}`) : 'Nivelul maxim al trimestrului'}</span>
            </div>
            <div className="progress"><i style={{ width: `${Math.min(100, (ev.pp / target) * 100)}%` }} /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Evaluation() {
  const state = useStore();
  const me = useSession();
  const now = useNow();
  const [reason, setReason] = useState({});
  const myEv = evaluation(state, me, now);
  const all = can(state, me, 'scope.all');
  const team = state.users
    .filter((u) => u.id !== me.id && u.status === 'activ' && (all || isSuperiorOf(state, me.id, u.id)))
    .map((u) => ({ u, ev: evaluation(state, u, now) }))
    .sort((a, b) => b.ev.pp - a.ev.pp);
  const promos = (state.promotions ?? []).filter((p) => all || p.by === me.id || p.userId === me.id || isSuperiorOf(state, me.id, p.userId));
  const pending = (id) => (state.promotions ?? []).some((p) => p.userId === id && p.status === 'pending');
  const user = (id) => state.users.find((u) => u.id === id);

  return (
    <div className="page grid" style={{ gap: 22 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <div className="eyebrow">Evaluare trimestrială · {myEv.quarter.label}</div>
          <h1>Evaluare</h1>
          <p>Punctele de performanță (PP) se primesc doar când superiorul validează o activitate. La final de trimestru, punctele și scorul de livrare dau calificativul, iar calificativul decide bonusul și promovarea.</p>
        </div>
      </div>

      <MyEvaluation ev={myEv} />

      <div className="grid two-col" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', alignItems: 'start' }}>
        <section className="card card-pad">
          <h3 className="row" style={{ gap: 8, marginBottom: 14 }}><LuCalculator /> Cum se câștigă punctele</h3>
          <table className="pp-table">
            <thead><tr><th>Prioritate</th><th>La timp</th><th>Cu întârziere</th></tr></thead>
            <tbody>
              {PRIORITIES.map((p) => (
                <tr key={p}><td>{PRIORITY_META[p].ro}</td><td className="mono">+{Math.round(PRIORITY_META[p].pp * RULES.ON_TIME)}</td><td className="mono">+{Math.round(PRIORITY_META[p].pp * RULES.LATE)}</td></tr>
              ))}
              <tr className="neg"><td>Abatere (3 restanțe)</td><td className="mono" colSpan={2}>−{RULES.ABATERE_PP} PP și bonus blocat în trimestru</td></tr>
              <tr className="zero"><td>Activitate personală / penalizare</td><td className="mono" colSpan={2}>0 PP</td></tr>
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Activitățile de grup aduc punctele întregi fiecărui membru asignat. Dacă o activitate validată e redeschisă, punctele se retrag.</p>
        </section>

        <section className="card card-pad">
          <h3 className="row" style={{ gap: 8, marginBottom: 14 }}><LuListOrdered /> Calificative și consecințe</h3>
          <div className="ladder">
            {RATINGS.map((r) => (
              <div key={r.id} className={`rung ${r.id} ${myEv.rating.id === r.id ? 'me' : ''}`}>
                <RatingPill rating={r} />
                <span className="cond">{r.min ? `scor ≥ ${r.min.score}${r.min.pp ? ` și ≥ ${r.min.pp} PP` : ''}, fără abateri` : 'sub praguri sau cu abateri'}</span>
                <b>{r.effect}</b>
                {myEv.rating.id === r.id && <span className="you">tu</span>}
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Grade: {GRADES.join(' → ')}. Promovarea se face cu un grad, la propunerea managerului și cu aprobarea directorului.</p>
        </section>
      </div>

      {team.length > 0 ? (
        <section className="card">
          <div className="card-head"><h3>Echipa ta în {myEv.quarter.label}</h3><span className="muted" style={{ fontSize: 13 }}>{team.length} angajați</span></div>
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table className="tbl" style={{ minWidth: 860 }}>
              <thead><tr><th>Angajat</th><th>Grad</th><th>PP</th><th>Scor</th><th>Abateri T</th><th>Calificativ</th><th>Consecință</th><th /></tr></thead>
              <tbody>
                {team.map(({ u, ev }, i) => (
                  <tr key={u.id} style={{ '--i': i, cursor: 'default' }}>
                    <td><a href={`#angajat-${u.id}`} className="row" style={{ textDecoration: 'none' }}><Avatar user={u} size="sm" /><div><b style={{ fontSize: 14 }}>{u.name}</b><div className="muted" style={{ fontSize: 12 }}>{positionOf(state, u)?.title}</div></div></a></td>
                    <td>{gradeName(u.grade)}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{ev.pp}</td>
                    <td><ScoreText value={ev.score} /></td>
                    <td className="mono" style={{ color: ev.abateriQ ? 'var(--red)' : undefined }}>{ev.abateriQ}</td>
                    <td><RatingPill rating={ev.rating} /></td>
                    <td style={{ fontSize: 13 }}>{ev.rating.effect}</td>
                    <td>
                      {pending(u.id) ? <span className="tag">Propunere trimisă</span>
                        : ev.promotable && can(state, me, 'promo.propose') ? (
                          <form className="row" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); dispatch({ type: 'promo/propose', userId: u.id, reason: reason[u.id]?.trim() || `Calificativ ${ev.rating.label} în ${ev.quarter.label}` }); }}>
                            <input id={`promo-${u.id}`} className="input" style={{ width: 170, padding: '5px 8px', fontSize: 13 }} placeholder="Motiv (opțional)" value={reason[u.id] ?? ''} onChange={(e) => setReason({ ...reason, [u.id]: e.target.value })} />
                            <button className="btn sm primary"><LuTrendingUp /> Propune la {gradeName(u.grade + 1)}</button>
                          </form>
                        ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="callout" style={{ background: 'var(--paper-2)' }}><LuLock /> <span>Evaluările colegilor sunt confidențiale. Le văd doar superiorii ierarhici.</span></section>
      )}

      {promos.length > 0 && (
        <section className="card card-pad">
          <h3 className="row" style={{ gap: 8, marginBottom: 12 }}><LuTrendingUp /> Propuneri de promovare</h3>
          <div className="feed">
            {promos.map((p) => (
              <div key={p.id} className="feed-item" style={{ alignItems: 'center' }}>
                <Avatar user={user(p.userId)} size="sm" />
                <p style={{ flex: 1 }}><b>{user(p.userId)?.name}</b>: {gradeName(p.from)} → {gradeName(p.to)}. Propusă de {user(p.by)?.name.split(' ')[0]} pe {formatShort(p.at)}. <span className="muted">„{p.reason}”</span></p>
                {p.status === 'pending' && can(state, me, 'positions.manage') ? (
                  <span className="row" style={{ gap: 6 }}>
                    <button className="btn sm primary" onClick={() => dispatch({ type: 'promo/decide', id: p.id, approve: true })}><LuCheck /> Aprobă</button>
                    <button className="btn sm" onClick={() => dispatch({ type: 'promo/decide', id: p.id, approve: false })}><LuX /> Respinge</button>
                  </span>
                ) : <span className={`tag ${p.status === 'approved' ? 'pp' : p.status === 'rejected' ? 'rejected' : ''}`}>{{ pending: 'În așteptare', approved: 'Aprobată', rejected: 'Respinsă' }[p.status]}</span>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
