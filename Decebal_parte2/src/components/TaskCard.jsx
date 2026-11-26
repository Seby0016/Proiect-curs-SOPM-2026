// Responsabil: Iordache Decebal
// Cardul unei activități și bifa care face pasul următor din flux (primaryAction).
import { LuCalendarClock, LuListChecks, LuMessageSquare, LuTriangleAlert, LuCircleCheck, LuHourglass, LuUndo2 } from 'react-icons/lu';
import { Avatar, AvatarStack, CheckButton, Priority, StatusBadge, swatch } from './ui.jsx';
import { canSubmit, canValidate, canWork, effectiveStatus, inReview, isPersonal, validatorId } from '../logic/rules.js';
import { relativeDue, timeAgo } from '../logic/time.js';
import { dispatch, emitFx } from '../store/store.js';
import { useUI } from './context.js';

const originOf = (e) => {
  const r = e?.currentTarget?.getBoundingClientRect();
  return r ? { x: r.left + r.width / 2, y: r.top } : null;
};

/**
 * Bifa de pe card face pasul următor din flux, nu sare direct la „Complet”:
 *  - activitate personală → se bifează direct (nu aduce puncte);
 *  - activitate de serviciu → se trimite spre validare superiorului.
 */
export function primaryAction(state, me, task, e) {
  const origin = originOf(e);
  if (isPersonal(task) && canWork(state, me, task)) return dispatch({ type: 'task/complete-personal', id: task.id, origin });
  if (canSubmit(state, me, task)) return dispatch({ type: 'task/submit', id: task.id, origin });
  if (canWork(state, me, task) && task.checklist.some((c) => !c.done)) {
    return emitFx({ type: 'toast', kind: 'abatere', title: 'Mai ai pași nebifați', text: 'Bifează toți pașii activității înainte s-o trimiți spre validare.' });
  }
  return null;
}

export default function TaskCard({ task, state, me, now, index = 0, flash = false, showAssignee = true }) {
  const ui = useUI();
  const status = effectiveStatus(task, now);
  const review = inReview(task);
  const personal = isPersonal(task);
  const assignees = task.assigneeIds.map((id) => state.users.find((u) => u.id === id)).filter(Boolean);
  const project = task.projectId && state.projects.find((p) => p.id === task.projectId);
  const doneItems = task.checklist.filter((c) => c.done).length;
  const validator = state.users.find((u) => u.id === validatorId(state, task));
  const iValidate = canValidate(state, me, task);
  const actionable = (personal || !review) && canWork(state, me, task);

  return (
    <article
      className={`task ${status} ${review ? 'review' : ''} ${task.isPenalty ? 'penalty' : ''} ${flash ? 'flash' : ''}`}
      style={{ '--i': index }}
      onClick={() => ui.openTask(task.id)}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && ui.openTask(task.id)}
    >
      {review ? (
        <span className="check pending" title={`Așteaptă validarea lui ${validator?.name ?? 'superiorului'}`}><LuHourglass /></span>
      ) : (
        <CheckButton
          on={status === 'completed'}
          disabled={!actionable}
          label={personal ? 'Bifează activitatea personală' : 'Trimite spre validare'}
          onClick={(e) => { e.stopPropagation(); primaryAction(state, me, task, e); }}
        />
      )}
      <div style={{ minWidth: 0 }}>
        <div className="t-title">{task.title}</div>
        <div className="t-meta">
          {status === 'completed' && task.completedAt ? (
            <span className="due done"><LuCircleCheck /> {personal ? 'bifat' : 'validat'} {timeAgo(task.validatedAt ?? task.completedAt, now)}{task.overdueAt ? ' · cu întârziere' : ''}</span>
          ) : review ? (
            <span className="due review"><LuHourglass /> la validare la {validator?.name.split(' ')[0] ?? 'superior'}</span>
          ) : (
            <span className={`due ${status === 'overdue' ? 'late' : ''}`}>
              {status === 'overdue' ? <LuTriangleAlert /> : <LuCalendarClock />}
              {relativeDue(task.dueDate, now)}
            </span>
          )}
          <Priority value={task.priority} />
          {task.isPenalty && <span className="tag penalty">Penalizare</span>}
          {personal && <span className="tag">Personală</span>}
          {task.rejection && !review && status !== 'completed' && <span className="tag rejected"><LuUndo2 /> Respinsă</span>}
          {project && <span className="tag project" style={{ '--pc': swatch(project.hue) }}>{project.code}</span>}
          {task.checklist.length > 0 && <span className="row" style={{ gap: 4 }}><LuListChecks /> {doneItems}/{task.checklist.length}</span>}
          {task.comments.length > 0 && <span className="row" style={{ gap: 4 }}><LuMessageSquare /> {task.comments.length}</span>}
          {status === 'completed' && task.points > 0 && <span className="tag pp">+{task.points} PP</span>}
        </div>
      </div>
      <div className="t-right">
        {review ? <span className="status review">În validare</span> : <StatusBadge status={status} />}
        {iValidate && (
          <div className="row" style={{ gap: 6 }} onClick={(e) => e.stopPropagation()}>
            <button className="btn sm primary" onClick={(e) => dispatch({ type: 'task/approve', id: task.id, origin: originOf(e) })}>Validează</button>
            <button className="btn sm" onClick={() => ui.openTask(task.id, 'reject')}>Respinge</button>
          </div>
        )}
        {showAssignee && !iValidate && (assignees.length > 1 ? <AvatarStack users={assignees} /> : <Avatar user={assignees[0]} size="sm" />)}
      </div>
    </article>
  );
}
