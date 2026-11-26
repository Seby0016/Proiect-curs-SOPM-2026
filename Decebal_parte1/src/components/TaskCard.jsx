// =====================================================================
//  Cardul unei activități — SCHELET (Etapa 1)
//  Responsabil: Iordache Decebal
// =====================================================================
import { effectiveStatus } from '../logic/rules.js';
import { relativeDue } from '../logic/time.js';
import { useNow } from '../store/store.js';
import { useUI } from './context.js';
import { StatusBadge } from './ui.jsx';

/** TODO Etapa 2: butonul principal depinde de rol (Trimite / Validează / Redeschide). */
export const primaryAction = () => null;

export default function TaskCard({ task }) {
  const now = useNow();
  const ui = useUI();
  return (
    <button className="card task-card" onClick={() => ui.openTask(task.id)}>
      <StatusBadge status={effectiveStatus(task, now)} />
      <b>{task.title}</b>
      <span className="muted">{relativeDue(task.dueDate, now)}</span>
      {/* TODO Etapa 2: prioritate, persoane, progres checklist, „la validare” */}
    </button>
  );
}
