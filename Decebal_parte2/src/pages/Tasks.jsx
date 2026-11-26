// Responsabil: Iordache Decebal
// Lista de activități: filtre pe statusuri, „De validat”, departament, căutare.
import { useMemo, useState } from 'react';
import { LuSearch, LuPlus, LuInbox, LuUser, LuBuilding2, LuUsers, LuGlobe, LuClipboardCheck } from 'react-icons/lu';
import { useNow, useSession, useStore } from '../store/store.js';
import { PRIORITIES, can, canValidate, departmentOf, effectiveStatus, inReview, subordinates } from '../logic/rules.js';
import { Empty, Segmented } from '../components/ui.jsx';
import TaskCard from '../components/TaskCard.jsx';
import { QuickAdd } from '../components/NewTask.jsx';
import { useUI } from '../components/context.js';

let pendingFilter = null;
export const setTasksFilter = (f) => { pendingFilter = f; };

const STATUS_ORDER = { overdue: 0, upcoming: 1, completed: 2, canceled: 3 };

export default function Tasks() {
  const state = useStore();
  const me = useSession();
  const now = useNow();
  const ui = useUI();
  const [scope, setScope] = useState('mine');
  const [status, setStatus] = useState(() => { const f = pendingFilter ?? 'open'; pendingFilter = null; return f; });
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('due');

  const dept = departmentOf(state, me);
  const toValidate = state.tasks.filter((t) => canValidate(state, me, t));
  const scopes = [
    { value: 'mine', label: 'Ale mele', icon: <LuUser /> },
    toValidate.length > 0 && { value: 'validate', label: 'De validat', icon: <LuClipboardCheck />, count: toValidate.length },
    { value: 'dept', label: dept?.name ?? 'Departament', icon: <LuBuilding2 /> },
    can(state, me, 'task.assign') && !can(state, me, 'scope.all') && { value: 'team', label: 'Echipa mea', icon: <LuUsers /> },
    can(state, me, 'scope.all') && { value: 'all', label: 'Toată firma', icon: <LuGlobe /> },
  ].filter(Boolean);

  const scoped = useMemo(() => {
    if (scope === 'mine') return state.tasks.filter((t) => t.assigneeIds.includes(me.id));
    if (scope === 'validate') return state.tasks.filter((t) => canValidate(state, me, t));
    if (scope === 'dept') {
      const ids = new Set(state.users.filter((u) => departmentOf(state, u)?.id === dept?.id).map((u) => u.id));
      return state.tasks.filter((t) => t.assigneeIds.some((id) => ids.has(id)));
    }
    if (scope === 'team') {
      const ids = new Set(subordinates(state, me.id).map((u) => u.id));
      return state.tasks.filter((t) => t.assigneeIds.some((id) => ids.has(id)));
    }
    return state.tasks;
  }, [scope, state, me, dept]);

  const counts = { open: 0, review: 0, upcoming: 0, overdue: 0, completed: 0, canceled: 0, all: scoped.length };
  for (const t of scoped) {
    const s = effectiveStatus(t, now);
    counts[s]++;
    if (s === 'upcoming' || s === 'overdue') counts.open++;
    if (inReview(t)) counts.review++;
  }

  const k = q.trim().toLowerCase();
  const list = scoped
    .filter((t) => {
      const s = effectiveStatus(t, now);
      if (status === 'open' && !(s === 'upcoming' || s === 'overdue')) return false;
      if (scope === 'validate') return !k || t.title.toLowerCase().includes(k);
      if (status === 'review' && !inReview(t)) return false;
      if (!['open', 'all', 'review'].includes(status) && s !== status) return false;
      return !k || t.title.toLowerCase().includes(k) || t.tags.some((x) => x.includes(k));
    })
    .sort((a, b) => {
      if (sort === 'priority') return PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority) || a.dueDate - b.dueDate;
      if (sort === 'recent') return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      return STATUS_ORDER[effectiveStatus(a, now)] - STATUS_ORDER[effectiveStatus(b, now)] || a.dueDate - b.dueDate;
    });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Lista de activități</div>
          <h1 style={{ marginTop: 6 }}>Activități</h1>
          <p>Când termini o activitate primită, o trimiți spre validare. Superiorul o validează (devine Complet și primești punctele) sau o respinge cu motiv. Restanțele le marchează doar sistemul, la expirarea termenului, iar 3 restanțe înseamnă o abatere.</p>
        </div>
        <button className="btn primary" onClick={() => ui.newTask()}><LuPlus /> Activitate nouă</button>
      </div>

      <div className="grid" style={{ gap: 14 }}>
        <Segmented label="Domeniu" options={scopes} value={scope} onChange={setScope} />
        {scope === 'mine' && <QuickAdd />}
        <div className="row wrap" style={{ gap: 12 }}>
          <Segmented
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'open', label: 'Deschise', count: counts.open },
              { value: 'upcoming', label: 'Urmează', count: counts.upcoming },
              { value: 'review', label: 'În validare', count: counts.review },
              { value: 'overdue', label: 'Restante', count: counts.overdue },
              { value: 'completed', label: 'Complete', count: counts.completed },
              { value: 'canceled', label: 'Anulate', count: counts.canceled },
              { value: 'all', label: 'Toate', count: counts.all },
            ]}
          />
          <span className="spacer" />
          <label className="quick" style={{ padding: '4px 10px', flex: '1 1 220px', maxWidth: 320 }}>
            <LuSearch style={{ color: 'var(--ink-3)' }} />
            <input id="task-search" placeholder="Caută după titlu sau etichetă" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Caută" />
          </label>
          <select id="task-sort" className="select" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sortare">
            <option value="due">După termen</option>
            <option value="priority">După prioritate</option>
            <option value="recent">Cele mai noi</option>
          </select>
        </div>

        <div className="task-list" key={scope + status}>
          {list.map((t, i) => <TaskCard key={t.id} task={t} state={state} me={me} now={now} index={Math.min(i, 12)} flash={ui.flash.has(t.id)} showAssignee={scope !== 'mine' || t.assigneeIds.length > 1} />)}
          {!list.length && <div className="card"><Empty icon={<LuInbox />} title="Nicio activitate aici">{k ? 'Încearcă alt termen de căutare.' : 'Schimbă filtrul sau adaugă o activitate nouă.'}</Empty></div>}
        </div>
      </div>
    </div>
  );
}
