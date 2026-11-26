// Responsabil: Iordache Decebal
// Sertarul de detalii: traseul statusului, butoanele după rol, checklist, comentarii, istoric.
import { useState } from 'react';
import { LuTrash2, LuPlus, LuX, LuSend, LuTriangleAlert, LuHourglass, LuCheck, LuUndo2, LuBan, LuInfo } from 'react-icons/lu';
import { Avatar, Drawer, Priority, StatusBadge, Shape, STATUS_SHAPE } from './ui.jsx';
import { dispatch, useNow, useSession, useStore } from '../store/store.js';
import {
  STATUSES, STATUS_META, PRIORITIES, PRIORITY_META, RULES, canCancelTask, canDeleteTask, canManage, canReopen, canSubmit, canValidate,
  canWork, effectiveStatus, inReview, isPersonal, pointsFor, validatorId,
} from '../logic/rules.js';
import { formatDateTime, relativeDue, timeAgo } from '../logic/time.js';

export const toLocalInput = (ms) => {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
export const fromLocalInput = (v) => new Date(v).getTime();

const originOf = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top };
};

/** Cele 4 statusuri ca traseu: utilizatorul vede unde e activitatea și cine o mută mai departe. */
function StatusTrack({ status, review }) {
  return (
    <div className="track">
      {STATUSES.map((s) => (
        <div key={s} className={`track-step ${s} ${status === s ? 'on' : ''}`}>
          <Shape kind={STATUS_SHAPE[s]} size={12} />
          <b>{STATUS_META[s].ro}{status === s && s === 'upcoming' && review ? ' · în validare' : ''}</b>
          <small>{STATUS_META[s].who}</small>
        </div>
      ))}
    </div>
  );
}

export default function TaskDrawer({ taskId, mode, onClose }) {
  const state = useStore();
  const me = useSession();
  const now = useNow();
  const task = state.tasks.find((t) => t.id === taskId);
  const [newItem, setNewItem] = useState('');
  const [comment, setComment] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const [rejecting, setRejecting] = useState(mode === 'reject');
  const [reason, setReason] = useState('');
  const [canceling, setCanceling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (!task || !me) {
    return <Drawer onClose={onClose} head={<b>Activitate</b>}><p className="muted">Activitatea a fost ștearsă.</p></Drawer>;
  }

  const status = effectiveStatus(task, now);
  const review = inReview(task);
  const personal = isPersonal(task);
  const working = canWork(state, me, task) && !review;
  const manage = canManage(state, me, task);
  const user = (id) => state.users.find((u) => u.id === id);
  const creator = task.createdBy === 'system' ? null : user(task.createdBy);
  const validator = user(validatorId(state, task));
  const project = state.projects.find((p) => p.id === task.projectId);
  const done = task.checklist.filter((c) => c.done).length;
  const open = status === 'upcoming' || status === 'overdue';
  const ppOnTime = pointsFor({ ...task, overdueAt: null }, task.dueDate - 1);
  const ppLate = pointsFor({ ...task, overdueAt: null }, task.dueDate + 1);

  return (
    <Drawer
      onClose={onClose}
      head={<>{review ? <span className="status review">În validare</span> : <StatusBadge status={status} en />} {task.isPenalty && <span className="tag penalty">Penalizare automată</span>} {personal && <span className="tag">Personală</span>}</>}
    >
      <div>
        {project && <div className="eyebrow" style={{ marginBottom: 8 }}>{project.code} · {project.name}</div>}
        {manage && open ? (
          <input id="task-title" className="input title-input" defaultValue={task.title} key={task.id} aria-label="Titlu"
            onBlur={(e) => e.target.value.trim() && e.target.value !== task.title && dispatch({ type: 'task/update', id: task.id, patch: { title: e.target.value.trim() } })} />
        ) : <h2 style={{ fontSize: 26 }}>{task.title}</h2>}
        {task.description && <p className="muted" style={{ marginTop: 8 }}>{task.description}</p>}
      </div>

      <section>
        <h3 style={{ marginBottom: 10 }}>Status</h3>
        <StatusTrack status={status} review={review} />
      </section>

      {/* ---------- acțiunea potrivită rolului ---------- */}
      <section className="action-box">
        {status === 'completed' && (
          <>
            <p><LuCheck /> {personal ? <>Bifată pe {formatDateTime(task.completedAt)}. Activitate personală, nu intră în evaluare.</> : <>Validată de <b>{user(task.validatedBy)?.name ?? 'superior'}</b>{task.validatedAt ? ` pe ${formatDateTime(task.validatedAt)}` : ''}. Predată {task.overdueAt ? 'cu întârziere' : 'la timp'}: <b>+{task.points ?? 0} PP</b>.</>}</p>
            {canReopen(state, me, task) && <button className="btn" onClick={() => dispatch({ type: 'task/reopen', id: task.id })}><LuUndo2 /> Redeschide{task.points ? ` (retrage ${task.points} PP)` : ''}</button>}
          </>
        )}
        {status === 'canceled' && <p><LuBan /> Anulată de <b>{user(task.canceledBy)?.name ?? 'superiorul ierarhic'}</b>{task.canceledAt ? ` pe ${formatDateTime(task.canceledAt)}` : ''}. Nu contează în evaluare.</p>}

        {review && (
          canValidate(state, me, task) ? (
            !rejecting ? (
              <>
                <p><LuHourglass /> <b>{task.assigneeIds.map((id) => user(id)?.name.split(' ')[0]).join(', ')}</b> a predat-o pe {formatDateTime(task.submittedAt)}, {task.submittedAt <= task.dueDate ? 'la timp' : 'după termen'}. Verifică rezultatul și decide.</p>
                <div className="row wrap">
                  <button className="btn primary" onClick={(e) => dispatch({ type: 'task/approve', id: task.id, origin: originOf(e) })}><LuCheck /> Validează (+{pointsFor(task, task.submittedAt)} PP)</button>
                  <button className="btn" onClick={() => setRejecting(true)}><LuUndo2 /> Respinge</button>
                </div>
              </>
            ) : (
              <form className="grid" style={{ gap: 10 }} onSubmit={(e) => { e.preventDefault(); if (reason.trim().length < 5) return; dispatch({ type: 'task/reject', id: task.id, reason: reason.trim() }); setRejecting(false); setReason(''); }}>
                <label className="field"><span>Motivul respingerii</span>
                  <textarea id="reject-reason" className="textarea" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ex. Lipsesc testele pentru cazurile de eroare." /></label>
                <p className="muted" style={{ fontSize: 13 }}>Activitatea se întoarce la angajat. Termenul rămâne același, deci poate deveni restantă.</p>
                <div className="row"><button className="btn danger" disabled={reason.trim().length < 5}>Respinge activitatea</button><button type="button" className="btn ghost" onClick={() => setRejecting(false)}>Renunță</button></div>
              </form>
            )
          ) : task.assigneeIds.includes(me.id) ? (
            <>
              <p><LuHourglass /> Ai trimis-o spre validare pe {formatDateTime(task.submittedAt)}. Așteaptă decizia lui <b>{validator?.name ?? 'superiorului'}</b>. Cât timp e la validare, nu poate deveni restantă.</p>
              <button className="btn" onClick={() => dispatch({ type: 'task/withdraw', id: task.id })}><LuUndo2 /> Retrage trimiterea</button>
            </>
          ) : <p><LuHourglass /> Trimisă spre validare la <b>{validator?.name ?? 'superior'}</b>.</p>
        )}

        {open && !review && (
          working ? (
            personal ? (
              <>
                <p><LuInfo /> Activitate personală: o bifezi singur, nu se validează și nu aduce puncte.</p>
                <button className="btn primary" onClick={(e) => dispatch({ type: 'task/complete-personal', id: task.id, origin: originOf(e) })}><LuCheck /> Marchează ca finalizată</button>
              </>
            ) : (
              <>
                {task.rejection && <div className="callout danger" style={{ marginBottom: 10 }}><LuUndo2 /> <span>Respinsă de {user(task.rejection.by)?.name.split(' ')[0]}: „{task.rejection.reason}”</span></div>}
                <p>Când ai terminat, o trimiți spre validare lui <b>{validator?.name ?? 'superiorului'}</b>. Valoare: <b>{ppOnTime} PP</b> dacă o predai la timp, {ppLate} PP după termen{task.isPenalty ? ' (penalizările nu aduc puncte)' : ''}.</p>
                {status === 'overdue' && <p className="late-note"><LuTriangleAlert /> Termenul a expirat. Activitatea e deja contorizată ca restanță.</p>}
                <button className="btn primary" disabled={!canSubmit(state, me, task)} onClick={(e) => dispatch({ type: 'task/submit', id: task.id, origin: originOf(e) })}><LuSend /> Trimite spre validare</button>
                {task.checklist.some((c) => !c.done) && <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>Bifează mai întâi toți pașii ({done}/{task.checklist.length}).</p>}
              </>
            )
          ) : <p><LuInfo /> {task.assigneeIds.includes(me.id) ? 'Activitate închisă.' : `Lucrează la ea ${task.assigneeIds.map((id) => user(id)?.name.split(' ')[0]).join(', ')}. ${validator?.id === me.id ? 'Tu o vei valida când ți-o trimite.' : ''}`}</p>
        )}

        {canCancelTask(state, me, task) && (
          !canceling ? (
            <button className="btn ghost sm danger" style={{ marginTop: 6 }} onClick={() => setCanceling(true)}><LuBan /> Anulează activitatea</button>
          ) : (
            <form className="grid" style={{ gap: 8, marginTop: 8 }} onSubmit={(e) => { e.preventDefault(); dispatch({ type: 'task/cancel', id: task.id, reason: cancelReason.trim() }); setCanceling(false); }}>
              <input id="cancel-reason" className="input" autoFocus value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Motiv (opțional), ex. cerință scoasă din sprint" />
              <div className="row"><button className="btn danger sm">Anulează activitatea</button><button type="button" className="btn ghost sm" onClick={() => setCanceling(false)}>Renunță</button></div>
            </form>
          )
        )}
      </section>

      <dl className="kv">
        <dt>Asignat</dt>
        <dd className="row wrap">{task.assigneeIds.map((id) => <span key={id} className="row" style={{ gap: 6 }}><Avatar user={user(id)} size="sm" />{user(id)?.name}</span>)}</dd>
        <dt>Atribuită de</dt>
        <dd className="row" style={{ gap: 6 }}>{creator ? <><Avatar user={creator} size="sm" />{creator.name}{task.assigneeIds.includes(creator.id) ? (creator.id === me.id ? ' (tu, pentru tine)' : ' (lucrează și el la ea)') : ''}</> : <span className="tag penalty">Sistem · regula de abateri</span>}</dd>
        {!personal && <><dt>Validează</dt><dd className="row" style={{ gap: 6 }}><Avatar user={validator} size="sm" />{validator?.name ?? '—'}</dd></>}
        <dt>Termen limită</dt>
        <dd>
          {manage && open && !review ? (
            <input id="task-due" type="datetime-local" className="input" style={{ maxWidth: 240 }} value={toLocalInput(task.dueDate)}
              onChange={(e) => e.target.value && dispatch({ type: 'task/update', id: task.id, patch: { dueDate: fromLocalInput(e.target.value) } })} />
          ) : <span>{formatDateTime(task.dueDate)} <span className="muted">· {relativeDue(task.dueDate, now)}</span></span>}
        </dd>
        <dt>Prioritate</dt>
        <dd>
          {manage && open ? (
            <select id="task-prio" className="select" style={{ maxWidth: 240 }} value={task.priority} onChange={(e) => dispatch({ type: 'task/update', id: task.id, patch: { priority: e.target.value } })}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].ro} · {Math.round(PRIORITY_META[p].pp * RULES.ON_TIME)} PP</option>)}
            </select>
          ) : <Priority value={task.priority} />}
        </dd>
        {task.tags.length > 0 && <><dt>Etichete</dt><dd className="row wrap" style={{ gap: 6 }}>{task.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</dd></>}
      </dl>

      <section>
        <div className="row" style={{ marginBottom: 10 }}>
          <h3>Pași</h3>
          <span className="muted mono" style={{ fontSize: 12 }}>{done}/{task.checklist.length}</span>
        </div>
        {task.checklist.length > 0 && <div className="progress" style={{ marginBottom: 10 }}><i style={{ width: `${(done / task.checklist.length) * 100}%` }} /></div>}
        <div className="checklist">
          {task.checklist.map((c) => (
            <label key={c.id} className={c.done ? 'done' : ''}>
              <input type="checkbox" checked={c.done} disabled={!working} onChange={() => dispatch({ type: 'task/check-toggle', id: task.id, itemId: c.id })} />
              <span>{c.text}</span>
              {(working || (manage && open)) && <button className="rm" onClick={(e) => { e.preventDefault(); dispatch({ type: 'task/check-remove', id: task.id, itemId: c.id }); }} aria-label="Elimină pasul"><LuX /></button>}
            </label>
          ))}
          {!task.checklist.length && <p className="muted" style={{ fontSize: 13.5 }}>Fără pași definiți.</p>}
        </div>
        {(working || (manage && open)) && !review && (
          <form className="row" style={{ marginTop: 10 }} onSubmit={(e) => { e.preventDefault(); if (newItem.trim()) { dispatch({ type: 'task/check-add', id: task.id, text: newItem.trim() }); setNewItem(''); } }}>
            <input id="new-step" className="input" placeholder="Adaugă un pas…" value={newItem} onChange={(e) => setNewItem(e.target.value)} />
            <button className="btn sm" type="submit"><LuPlus /> Adaugă</button>
          </form>
        )}
      </section>

      <section>
        <h3 style={{ marginBottom: 12 }}>Comentarii <span className="muted mono" style={{ fontSize: 12 }}>{task.comments.length}</span></h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {task.comments.map((c) => (
            <div className="comment" key={c.id}>
              <Avatar user={user(c.userId)} size="sm" />
              <div className="bubble">
                <b>{user(c.userId)?.name}</b> <span className="muted" style={{ fontSize: 12 }}>· {timeAgo(c.at, now)}</span>
                <p>{c.text}</p>
              </div>
            </div>
          ))}
        </div>
        <form className="row" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); if (comment.trim()) { dispatch({ type: 'task/comment', id: task.id, text: comment.trim() }); setComment(''); } }}>
          <Avatar user={me} size="sm" />
          <input id="new-comment" className="input" placeholder="Scrie un comentariu…" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button className="icon-btn" type="submit" aria-label="Trimite"><LuSend /></button>
        </form>
      </section>

      {canDeleteTask(state, me, task) && (
        <section className="row wrap" style={{ paddingTop: 12, borderTop: '2px solid var(--rule)' }}>
          {!confirmDel ? (
            <button className="btn danger" onClick={() => setConfirmDel(true)}><LuTrash2 /> Șterge activitatea</button>
          ) : (
            <>
              <span style={{ fontWeight: 600 }}>Ștergi definitiv „{task.title}”?</span>
              <button className="btn danger" onClick={() => { dispatch({ type: 'task/delete', id: task.id }); onClose(); }}><LuTrash2 /> Da, șterge</button>
              <button className="btn ghost" onClick={() => setConfirmDel(false)}>Renunță</button>
            </>
          )}
        </section>
      )}
    </Drawer>
  );
}
