// Responsabil: Iordache Sebastian
// Paleta de comenzi Ctrl/⌘ + K (funcție extra): navigare, căutare și acțiuni rapide.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LuSearch, LuLayoutDashboard, LuListTodo, LuFolderKanban, LuUsers, LuTrophy, LuBriefcase, LuPlus,
  LuClock, LuMoon, LuLogOut, LuRotateCcw, LuSparkles, LuCircleDot,
} from 'react-icons/lu';
import { dispatch, logout, resetDemo, useNow, useSession, useStore } from '../store/store.js';
import { can, effectiveStatus, STATUS_META, assignableUsers } from '../logic/rules.js';
import { parseQuickAdd } from '../logic/parse.js';
import { go, Avatar } from './ui.jsx';
import { useUI } from './context.js';

const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function CommandPalette({ onClose }) {
  const state = useStore();
  const me = useSession();
  const now = useNow();
  const ui = useUI();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const listRef = useRef(null);

  const items = useMemo(() => {
    const k = strip(q.trim());
    const match = (s) => !k || strip(s).includes(k);
    const out = [];
    const pages = [
      { label: 'Panou', icon: <LuLayoutDashboard />, run: () => go('panou') },
      { label: 'Activități', icon: <LuListTodo />, run: () => go('sarcini') },
      { label: 'Proiecte de grup', icon: <LuFolderKanban />, run: () => go('proiecte') },
      { label: 'Evaluare trimestrială', icon: <LuTrophy />, run: () => go('evaluare') },
      can(state, me, 'team.view') && { label: 'Echipă & monitorizare', icon: <LuUsers />, run: () => go('echipa') },
      can(state, me, 'positions.manage') && { label: 'Posturi & angajări', icon: <LuBriefcase />, run: () => go('posturi') },
    ].filter(Boolean);
    const actions = [
      { label: 'Activitate nouă', icon: <LuPlus />, hint: 'N', run: () => ui.newTask() },
      can(state, me, 'time.machine') && { label: 'Mașina Timpului', icon: <LuClock />, hint: 'T', run: () => ui.timeMachine() },
      { label: 'Comută tema luminoasă / întunecată', icon: <LuMoon />, run: () => ui.toggleTheme() },
      can(state, me, 'positions.manage') && { label: 'Resetează datele demo', icon: <LuRotateCcw />, run: () => resetDemo() },
      { label: 'Deconectare', icon: <LuLogOut />, run: () => logout() },
    ].filter(Boolean);

    if (k) {
      const parsed = parseQuickAdd(q, now, assignableUsers(state, me));
      if (parsed.title) out.push({ group: 'Creează', label: `Adaugă „${parsed.title}”`, icon: <LuSparkles />, sub: parsed.chips.map((c) => c.label).join(' · '), run: () => dispatch({ type: 'task/add', task: { title: parsed.title, priority: parsed.priority, tags: parsed.tags, dueDate: parsed.dueDate, assigneeIds: [parsed.assigneeId ?? me.id] } }) });
    }
    pages.filter((p) => match(p.label)).forEach((p) => out.push({ group: 'Navigare', ...p }));
    actions.filter((p) => match(p.label)).forEach((p) => out.push({ group: 'Acțiuni', ...p }));
    if (k) {
      const visible = can(state, me, 'scope.all') ? state.tasks : state.tasks.filter((t) => t.assigneeIds.includes(me.id) || t.createdBy === me.id || (t.projectId && state.projects.find((p) => p.id === t.projectId)?.memberIds.includes(me.id)));
      visible.filter((t) => match(t.title)).slice(0, 6).forEach((t) => {
        const st = effectiveStatus(t, now);
        out.push({ group: 'Activități', label: t.title, icon: <LuCircleDot style={{ color: `var(--${st})` }} />, sub: STATUS_META[st].ro, run: () => ui.openTask(t.id) });
      });
      state.projects.filter((p) => match(p.name) || match(p.code)).forEach((p) => out.push({ group: 'Proiecte', label: p.name, icon: <LuFolderKanban />, sub: p.code, run: () => go(`proiect-${p.id}`) }));
      if (can(state, me, 'team.view')) state.users.filter((u) => match(u.name)).slice(0, 5).forEach((u) => out.push({ group: 'Oameni', label: u.name, icon: <Avatar user={u} size="sm" />, sub: u.status === 'concediat' ? 'Concediat' : '', run: () => go(`angajat-${u.id}`) }));
    }
    return out;
  }, [q, state, me, now, ui]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => { listRef.current?.querySelector('.on')?.scrollIntoView({ block: 'nearest' }); }, [sel]);

  const run = (it) => { onClose(); setTimeout(it.run, 0); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    if (e.key === 'Enter' && items[sel]) { e.preventDefault(); run(items[sel]); }
    if (e.key === 'Escape') onClose();
  };

  let lastGroup = null;
  return createPortal(
    <>
      <div className="overlay" onClick={onClose} style={{ zIndex: 149 }} />
      <div className="palette" role="dialog" aria-label="Paletă de comenzi">
        <div className="palette-in">
          <LuSearch />
          <input id="palette-q" autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Caută activități, oameni, pagini sau scrie o activitate nouă…" />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list" ref={listRef}>
          {items.map((it, i) => {
            const head = it.group !== lastGroup ? <div className="palette-group">{it.group}</div> : null;
            lastGroup = it.group;
            return (
              <div key={i}>
                {head}
                <button className={`palette-item ${i === sel ? 'on' : ''}`} onMouseMove={() => setSel(i)} onClick={() => run(it)}>
                  {it.icon}
                  <span className="grow">{it.label}</span>
                  {it.sub && <span className="muted" style={{ fontSize: 12 }}>{it.sub}</span>}
                  {it.hint && <kbd>{it.hint}</kbd>}
                </button>
              </div>
            );
          })}
          {!items.length && <div className="empty"><b>Niciun rezultat</b></div>}
        </div>
        <div className="palette-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> navighează</span><span><kbd>Enter</kbd> deschide</span><span><kbd>Ctrl</kbd>+<kbd>K</kbd> oriunde</span></div>
      </div>
    </>,
    document.body,
  );
}
