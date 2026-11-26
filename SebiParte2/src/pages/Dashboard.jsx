// Responsabil: Iordache Sebastian
// Panoul principal: cifrele pe statusuri, „De validat”, dosarul de abateri, graficul săptămânii, fluxul echipei.
import { LuCalendarClock, LuTriangleAlert, LuCircleCheck, LuBan, LuFlame, LuActivity, LuChartColumn, LuUsers, LuArrowRight, LuShieldAlert, LuZap } from 'react-icons/lu';
import { useNow, useSession, useStore } from '../store/store.js';
import { RULES, can, canValidate, departmentOf, effectiveStatus, evaluation, performance, positionOf, subordinates, gradeName } from '../logic/rules.js';
import { DAY, formatLong, formatWeekday, greeting, startOfDay, timeAgo } from '../logic/time.js';
import { AnimatedNumber, Avatar, Empty, Ring, ScoreText, go, Shape, STATUS_SHAPE } from '../components/ui.jsx';
import TaskCard from '../components/TaskCard.jsx';
import { QuickAdd } from '../components/NewTask.jsx';
import { setTasksFilter } from './Tasks.jsx';
import { useUI } from '../components/context.js';

export function AbateriCard({ user }) {
  const strikes = user.restante % RULES.OVERDUE_PER_ABATERE;
  const fired = user.status === 'concediat';
  return (
    <div className="card card-pad abateri">
      <div className="row">
        <h3 className="row" style={{ gap: 8 }}><LuShieldAlert style={{ color: user.abateri ? 'var(--overdue)' : 'var(--completed)' }} /> Dosar abateri</h3>
        <span className="spacer" />
        <span className="mono muted" style={{ fontSize: 12 }}>{user.restante} restanțe total</span>
      </div>
      <div className="abateri-dots">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`${n <= user.abateri ? 'on' : ''} ${n === 3 && user.abateri === 2 ? 'last' : ''}`} style={{ animationDelay: `${n * 0.1}s` }}>
            {n <= user.abateri ? `Abatere ${n}` : n === 3 ? 'Concediere' : `${n}`}
          </span>
        ))}
      </div>
      {!fired && (
        <div>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
            <span className="muted">Restanțe până la următoarea abatere</span>
            <b className="mono">{strikes}/{RULES.OVERDUE_PER_ABATERE}</b>
          </div>
          <div className="strikes">{[0, 1, 2].map((k) => <i key={k} className={k < strikes ? 'on' : ''} />)}</div>
        </div>
      )}
      {user.abateri === 2 && !fired && <div className="callout danger"><LuTriangleAlert /> <span>Încă {RULES.OVERDUE_PER_ABATERE - strikes} {RULES.OVERDUE_PER_ABATERE - strikes === 1 ? 'restanță' : 'restanțe'} și contul se dezactivează automat.</span></div>}
      {user.abateri === 0 && strikes === 0 && <p className="muted" style={{ fontSize: 13 }}>Dosar curat. Fiecare 3 activități restante adaugă o abatere și 2 activități de penalizare.</p>}
    </div>
  );
}

export function WeekChart({ tasks, now }) {
  const days = Array.from({ length: 7 }, (_, i) => startOfDay(now) - (6 - i) * DAY);
  const counts = days.map((d) => tasks.filter((t) => t.status === 'completed' && t.completedAt && startOfDay(t.completedAt) === d).length);
  const max = Math.max(3, ...counts);
  return (
    <div className="chart-bars" role="img" aria-label={`Activități finalizate în ultimele 7 zile: ${counts.join(', ')}`}>
      {days.map((d, i) => (
        <div className="b" key={d}>
          <em>{counts[i] || ''}</em>
          <i className={`${i === 6 ? 'today' : ''} ${counts[i] ? '' : 'zero'}`} style={{ height: `${(counts[i] / max) * 100}%`, '--i': i }} />
          <span>{i === 6 ? 'azi' : formatWeekday(d)}</span>
        </div>
      ))}
    </div>
  );
}

export function Feed({ items, state, now, limit = 8 }) {
  const user = (id) => state.users.find((u) => u.id === id);
  if (!items.length) return <Empty icon={<LuActivity />} title="Nicio activitate încă" />;
  return (
    <div className="feed">
      {items.slice(0, limit).map((a, i) => (
        <div className="feed-item" key={a.id} style={{ '--i': i }}>
          {a.userId === 'system' ? <span className="sys"><LuZap /></span> : <Avatar user={user(a.userId)} size="sm" />}
          <p><b>{a.userId === 'system' ? 'Sistem' : user(a.userId)?.name.split(' ')[0]}</b> {a.text} <span className="muted" style={{ fontSize: 12 }}>· {timeAgo(a.at, now)}</span></p>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const state = useStore();
  const me = useSession();
  const now = useNow();
  const ui = useUI();
  const perf = performance(state, me, now);
  const ev = evaluation(state, me, now);
  const queue = state.tasks.filter((t) => canValidate(state, me, t)).sort((a, b) => a.submittedAt - b.submittedAt);
  const pos = positionOf(state, me);
  const dept = departmentOf(state, me);
  const mine = state.tasks.filter((t) => t.assigneeIds.includes(me.id));
  const open = mine
    .filter((t) => ['upcoming', 'overdue'].includes(effectiveStatus(t, now)))
    .sort((a, b) => a.dueDate - b.dueDate);

  const team = can(state, me, 'team.view') ? (can(state, me, 'scope.all') ? state.users.filter((u) => u.id !== me.id) : subordinates(state, me.id)) : [];
  const atRisk = team.filter((u) => u.status === 'activ' && (u.abateri >= 2 || u.restante % 3 === 2));
  const teamOverdue = state.tasks.filter((t) => t.assigneeIds.some((id) => team.some((u) => u.id === id)) && effectiveStatus(t, now) === 'overdue').length;

  const visibleIds = new Set([me.id, ...team.map((u) => u.id), ...state.users.filter((u) => departmentOf(state, u)?.id === dept?.id).map((u) => u.id)]);
  const feed = state.activity.filter((a) => visibleIds.has(a.userId) || (a.userId === 'system' && can(state, me, 'team.view')) || (a.projectId && state.projects.find((p) => p.id === a.projectId)?.memberIds.includes(me.id)));

  const kpis = [
    { s: 'upcoming', label: 'Urmează', icon: <LuCalendarClock />, sub: 'Upcoming' },
    { s: 'overdue', label: 'Restante', icon: <LuTriangleAlert />, sub: 'Overdue' },
    { s: 'completed', label: 'Complete', icon: <LuCircleCheck />, sub: 'Completed' },
    { s: 'canceled', label: 'Anulate', icon: <LuBan />, sub: 'Canceled' },
  ];

  return (
    <div className="page grid" style={{ gap: 22 }}>
      <section className="hello">
        <span className="deco" aria-hidden="true"><i /><i /><i /><i /></span>
        <div>
          <div className="eyebrow" style={{ color: 'var(--accent-2)' }}>{formatLong(now)}</div>
          <h1 style={{ marginTop: 8 }}>{greeting(now)}, <span className="hl">{me.name.split(' ')[0]}</span></h1>
          <p>{pos?.title} {gradeName(me.grade)} · {dept?.name}. {open.length ? <>Ai <b style={{ color: 'var(--ink)' }}>{open.length}</b> activități deschise{perf.counts.overdue ? <>, dintre care <b style={{ color: '#ff8a8f' }}>{perf.counts.overdue} restante</b></> : null}.</> : 'Nu ai nicio activitate deschisă.'}</p>
          <div className="row wrap" style={{ gap: 8 }}>
            <a href="#evaluare" className="level-chip"><LuZap /> {ev.quarter.label}: {ev.rating.label} · {ev.pp} PP</a>
            {perf.review > 0 && <span className="level-chip">{perf.review} la validare</span>}
            {queue.length > 0 && <span className="level-chip hot">{queue.length} de validat de tine</span>}
          </div>
        </div>
        <Ring value={perf.score / 100} size={112} stroke={12} color={perf.score >= 80 ? 'var(--yellow)' : perf.score >= 55 ? '#ffffff' : 'var(--red)'} label={<AnimatedNumber value={perf.score} />} sub="scor" />
      </section>

      <section className="kpis stagger">
        {kpis.map((k, i) => (
          <button key={k.s} className={`kpi ${k.s}`} style={{ '--i': i }} onClick={() => { setTasksFilter(k.s); go('sarcini'); }}>
            <Shape kind={STATUS_SHAPE[k.s]} size={92} className="k-shape" />
            <div className="k-label">{k.icon} {k.label}</div>
            <div className="k-val"><AnimatedNumber value={perf.counts[k.s]} /></div>
            <div className="k-sub">{k.sub}</div>
          </button>
        ))}
      </section>

      <div className="grid dash-grid" style={{ gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)', alignItems: 'start' }}>
        <div className="grid" style={{ gap: 18 }}>
          {queue.length > 0 && (
            <div className="card card-pad queue">
              <div className="row" style={{ marginBottom: 6 }}>
                <h2>De validat</h2>
                <span className="spacer" />
                <span className="mono muted" style={{ fontSize: 13 }}>{queue.length}</span>
              </div>
              <p className="muted" style={{ fontSize: 14, marginBottom: 14 }}>Activități predate de echipă. Nu devin restante cât așteaptă decizia ta. Validarea acordă punctele de performanță.</p>
              <div className="task-list">
                {queue.map((t, i) => <TaskCard key={t.id} task={t} state={state} me={me} now={now} index={i} flash={ui.flash.has(t.id)} />)}
              </div>
            </div>
          )}
          <div className="card card-pad">
            <div className="row" style={{ marginBottom: 14 }}>
              <h2>Următoarele termene</h2>
              <span className="spacer" />
              <a className="btn ghost sm" href="#sarcini">Toate <LuArrowRight /></a>
            </div>
            <QuickAdd />
            <div className="task-list" style={{ marginTop: 8 }}>
              {open.slice(0, 6).map((t, i) => <TaskCard key={t.id} task={t} state={state} me={me} now={now} index={i} flash={ui.flash.has(t.id)} showAssignee={t.assigneeIds.length > 1} />)}
              {!open.length && <Empty icon={<LuCircleCheck />} title="Totul e la zi">Adaugă o activitate nouă sau așteaptă una de la manager.</Empty>}
            </div>
          </div>

          {team.length > 0 && (
            <div className="card card-pad">
              <div className="row" style={{ marginBottom: 14 }}>
                <h2 className="row" style={{ gap: 8 }}><LuUsers /> Echipa ta</h2>
                <span className="spacer" />
                <a className="btn ghost sm" href="#echipa">Monitorizare <LuArrowRight /></a>
              </div>
              <div className="row wrap" style={{ gap: 26, marginBottom: atRisk.length ? 16 : 0 }}>
                <div><div className="k-val" style={{ font: '700 28px var(--f-display)' }}><AnimatedNumber value={team.filter((u) => u.status === 'activ').length} /></div><div className="muted" style={{ fontSize: 13 }}>angajați activi</div></div>
                <div><div style={{ font: '700 28px var(--f-display)', color: teamOverdue ? 'var(--overdue)' : undefined }}><AnimatedNumber value={teamOverdue} /></div><div className="muted" style={{ fontSize: 13 }}>activități restante</div></div>
                <div><div style={{ font: '700 28px var(--f-display)', color: atRisk.length ? 'var(--warn)' : undefined }}><AnimatedNumber value={atRisk.length} /></div><div className="muted" style={{ fontSize: 13 }}>în risc de abatere</div></div>
              </div>
              {atRisk.map((u) => (
                <a key={u.id} href={`#angajat-${u.id}`} className="row" style={{ padding: '10px 0', borderTop: '1px solid var(--line-2)', textDecoration: 'none', color: 'inherit' }}>
                  <Avatar user={u} size="sm" />
                  <b style={{ fontSize: 14 }}>{u.name}</b>
                  <span className="muted" style={{ fontSize: 13 }}>{u.abateri}/3 abateri · {u.restante % 3}/3 restanțe</span>
                  <span className="spacer" />
                  <ScoreText value={performance(state, u, now).score} />
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="grid" style={{ gap: 18 }}>
          <AbateriCard user={me} />
          <div className="card card-pad">
            <div className="row" style={{ marginBottom: 6 }}>
              <h3 className="row" style={{ gap: 8 }}><LuChartColumn /> Ritmul tău</h3>
              <span className="spacer" />
              <span className="muted" style={{ fontSize: 12 }}>finalizate / zi</span>
            </div>
            <WeekChart tasks={mine} now={now} />
          </div>
          <div className="card card-pad">
            <h3 className="row" style={{ gap: 8, marginBottom: 6 }}><LuActivity /> Activitate recentă</h3>
            <Feed items={feed} state={state} now={now} limit={7} />
          </div>
        </div>
      </div>
    </div>
  );
}
