// Responsabil: Iordache Sebastian
// Tabla Kanban a unui proiect; drag & drop care respectă fluxul de validare.
import { useState } from 'react';
import { LuArrowLeft, LuCalendar, LuPlus, LuListChecks, LuMessageSquare, LuActivity } from 'react-icons/lu';
import { dispatch, emitFx, useNow, usePresence, useSession, useStore } from '../store/store.js';
import { STATUS_META, canCancelTask, canReopen, canSubmit, canValidate, canWork, effectiveStatus, can, inReview, isPersonal } from '../logic/rules.js';
import { formatShort, relativeDue } from '../logic/time.js';
import { Avatar, AvatarStack, Empty, Priority, Ring, swatch } from '../components/ui.jsx';
import { QuickAdd } from '../components/NewTask.jsx';
import { useUI } from '../components/context.js';
import { Feed } from './Dashboard.jsx';
import { StackBar, projectStats } from './Projects.jsx';

const COLS = ['upcoming', 'overdue', 'completed', 'canceled'];

export default function ProjectBoard({ id }) {
  const state = useStore();
  const me = useSession();
  const now = useNow();
  const ui = useUI();
  const presence = usePresence();
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const p = state.projects.find((x) => x.id === id);

  if (!p) return <div className="card"><Empty title="Proiectul nu există">Verifică linkul sau întoarce-te la lista de proiecte.</Empty></div>;
  const isMember = p.memberIds.includes(me.id) || can(state, me, 'scope.all');
  if (!isMember) return <div className="card"><Empty title="Nu ai acces la acest proiect">Doar membrii proiectului au acces partajat.</Empty></div>;

  const s = projectStats(state, p, now);
  const members = p.memberIds.map((m) => state.users.find((u) => u.id === m)).filter(Boolean);
  const liveIds = new Set(presence.filter((x) => x.view === `proiect-${p.id}`).map((x) => x.userId));
  const user = (uid) => state.users.find((u) => u.id === uid);

  const deny = (title, text) => emitFx({ type: 'toast', kind: 'abatere', title, text });
  const drop = (status, e) => {
    e.preventDefault();
    setOver(null);
    const t = state.tasks.find((x) => x.id === drag);
    setDrag(null);
    if (!t || effectiveStatus(t, now) === status) return;
    const origin = { x: e.clientX, y: e.clientY };
    if (status === 'overdue') return deny('Restanța nu se pune manual', 'Sistemul marchează activitatea ca restantă doar când îi expiră termenul.');
    if (status === 'canceled') return canCancelTask(state, me, t) ? dispatch({ type: 'task/cancel', id: t.id }) : deny('Nu poți anula', 'Doar superiorul ierarhic care a atribuit activitatea o poate anula.');
    if (status === 'completed') {
      if (canValidate(state, me, t)) return dispatch({ type: 'task/approve', id: t.id, origin });
      if (isPersonal(t) && canWork(state, me, t)) return dispatch({ type: 'task/complete-personal', id: t.id, origin });
      if (canSubmit(state, me, t)) return dispatch({ type: 'task/submit', id: t.id, origin });
      if (inReview(t)) return deny('Așteaptă validarea', 'Doar cel care a atribuit activitatea o poate trece la „Complet”.');
      if (canWork(state, me, t)) return deny('Mai ai pași nebifați', 'Bifează toți pașii înainte s-o trimiți spre validare.');
      return deny('Nu e activitatea ta', 'O poate preda doar persoana asignată.');
    }
    if (status === 'upcoming') return canReopen(state, me, t) ? dispatch({ type: 'task/reopen', id: t.id }) : deny('Nu se poate redeschide', 'Doar cel care a validat activitatea o poate redeschide.');
    return undefined;
  };

  return (
    <div className="page grid" style={{ gap: 20 }}>
      <a href="#proiecte" className="btn ghost sm" style={{ justifySelf: 'start' }}><LuArrowLeft /> Proiecte</a>
      <section className="card card-pad project-hero" style={{ '--pc': swatch(p.hue) }}>
        <div className="row wrap" style={{ alignItems: 'flex-start', gap: 20 }}>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div className="project-code">{p.code}</div>
            <h1 style={{ marginTop: 6 }}>{p.name}</h1>
            <p className="muted" style={{ marginTop: 8, maxWidth: '62ch' }}>{p.description}</p>
            <div className="row wrap" style={{ marginTop: 14, gap: 14 }}>
              <span className="live-pill">Sincronizare în timp real</span>
              <span className="muted row" style={{ gap: 6, fontSize: 13 }}><LuCalendar /> Termen final {formatShort(p.deadline)}</span>
              <span className="muted" style={{ fontSize: 13 }}>Lider: <b>{user(p.leadId)?.name}</b></span>
            </div>
          </div>
          <div className="row" style={{ gap: 18 }}>
            <div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Membri · <span style={{ color: 'var(--completed)' }}>{liveIds.size} online acum</span></div>
              <div className="avatar-stack">{members.map((u) => <Avatar key={u.id} user={u} live={liveIds.has(u.id) && u.id !== me.id} />)}</div>
            </div>
            <Ring value={s.progress} size={76} stroke={8} color={swatch(p.hue)} label={`${Math.round(s.progress * 100)}%`} sub="gata" />
          </div>
        </div>
        <div style={{ marginTop: 16 }}><StackBar c={s.c} /></div>
      </section>

      <div className="row wrap" style={{ gap: 12 }}>
        <div style={{ flex: '1 1 380px', minWidth: 0 }}><QuickAdd projectId={p.id} /></div>
        <button className="btn" onClick={() => ui.newTask({ projectId: p.id })} style={{ alignSelf: 'flex-start' }}><LuPlus /> Activitate de grup</button>
      </div>

      <div className="board" role="list">
        {COLS.map((c) => {
          const items = s.tasks.filter((t) => effectiveStatus(t, now) === c).sort((a, b) => a.dueDate - b.dueDate);
          return (
            <section
              key={c}
              className={`col ${c} ${over === c ? 'drop' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOver(c); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null); }}
              onDrop={(e) => drop(c, e)}
              aria-label={STATUS_META[c].ro}
            >
              <div className="col-head">{STATUS_META[c].ro} <span className="muted" style={{ fontWeight: 500, fontSize: 12 }}>{STATUS_META[c].en}</span><b>{items.length}</b></div>
              {items.map((t) => {
                const assignees = t.assigneeIds.map(user).filter(Boolean);
                const done = t.checklist.filter((x) => x.done).length;
                return (
                  <article
                    key={t.id}
                    className={`kcard ${drag === t.id ? 'dragging' : ''} ${ui.flash.has(t.id) ? 'flash' : ''}`}
                    draggable
                    onDragStart={(e) => { setDrag(t.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.id); }}
                    onDragEnd={() => { setDrag(null); setOver(null); }}
                    onClick={() => ui.openTask(t.id)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && ui.openTask(t.id)}
                  >
                    {inReview(t) && <span className="status review" style={{ marginBottom: 6 }}>În validare</span>}
                    <div className="t-title" style={c === 'completed' ? { textDecoration: 'line-through', color: 'var(--ink-3)' } : undefined}>{t.title}</div>
                    <div className="t-meta" style={{ marginTop: 6 }}>
                      <span className={`due ${c === 'overdue' ? 'late' : ''}`}>{relativeDue(t.dueDate, now)}</span>
                      <Priority value={t.priority} />
                    </div>
                    {t.checklist.length > 0 && <div className="progress" style={{ marginTop: 10 }}><i style={{ width: `${(done / t.checklist.length) * 100}%` }} /></div>}
                    <div className="k-foot">
                      <span className="row muted" style={{ gap: 10, fontSize: 12 }}>
                        {t.checklist.length > 0 && <span className="row" style={{ gap: 4 }}><LuListChecks />{done}/{t.checklist.length}</span>}
                        {t.comments.length > 0 && <span className="row" style={{ gap: 4 }}><LuMessageSquare />{t.comments.length}</span>}
                      </span>
                      <AvatarStack users={assignees} max={3} />
                    </div>
                  </article>
                );
              })}
              {!items.length && <div className="col-empty">{drag ? 'Plasează aici' : 'Nicio activitate'}</div>}
            </section>
          );
        })}
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: -8 }}>Trage un card în „Complet” ca să-l predai (dacă e al tău) sau să-l validezi (dacă tu l-ai atribuit). „Restant” se pune doar automat. Pe telefon, deschide cardul și folosește butoanele din detalii.</p>

      <section className="card card-pad">
        <h3 className="row" style={{ gap: 8, marginBottom: 6 }}><LuActivity /> Activitatea echipei pe proiect</h3>
        <Feed items={state.activity.filter((a) => a.projectId === p.id)} state={state} now={now} limit={10} />
      </section>
    </div>
  );
}
