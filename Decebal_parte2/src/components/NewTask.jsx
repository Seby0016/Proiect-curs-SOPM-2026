// Responsabil: Iordache Decebal
// Fereastra „Activitate nouă” și câmpul de adăugare rapidă în limbaj natural.
import { useMemo, useState } from 'react';
import { LuSparkles, LuCornerDownLeft, LuCalendar, LuFlag, LuUser, LuHash, LuClock } from 'react-icons/lu';
import { Modal, Avatar } from './ui.jsx';
import { dispatch, useNow, useSession, useStore } from '../store/store.js';
import { PRIORITIES, PRIORITY_META, assignableUsers } from '../logic/rules.js';
import { parseQuickAdd } from '../logic/parse.js';
import { addDays, atHour, startOfDay, formatDateTime } from '../logic/time.js';
import { toLocalInput, fromLocalInput } from './TaskDrawer.jsx';

/** Utilizatorii cărora le poți atribui o activitate (în proiect: toți membrii). */
export function assigneeOptions(state, me, projectId) {
  if (projectId) {
    const p = state.projects.find((x) => x.id === projectId);
    return state.users.filter((u) => p?.memberIds.includes(u.id) && u.status === 'activ');
  }
  return assignableUsers(state, me);
}

export function NewTaskModal({ defaults = {}, onClose }) {
  const state = useStore();
  const me = useSession();
  const now = useNow();
  const myProjects = state.projects.filter((p) => p.memberIds.includes(me.id) || can(me));
  function can(u) { return state.positions.find((p) => p.id === u.positionId)?.permissions.includes('scope.all'); }
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', projectId: defaults.projectId ?? '',
    assigneeIds: defaults.assigneeIds ?? [me.id], due: toLocalInput(atHour(addDays(startOfDay(now), 2), 17)), tags: '',
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const options = assigneeOptions(state, me, form.projectId);
  const toggle = (id) => setForm((f) => ({ ...f, assigneeIds: f.assigneeIds.includes(id) ? f.assigneeIds.filter((x) => x !== id) : [...f.assigneeIds, id] }));
  const valid = form.title.trim() && form.assigneeIds.length && form.due;

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    dispatch({
      type: 'task/add',
      task: {
        title: form.title.trim(), description: form.description.trim(), priority: form.priority,
        projectId: form.projectId || null, assigneeIds: form.assigneeIds.filter((id) => options.some((o) => o.id === id)),
        dueDate: fromLocalInput(form.due), tags: form.tags.split(/[\s,]+/).map((t) => t.replace('#', '').trim()).filter(Boolean),
      },
    });
    onClose();
  };

  return (
    <Modal
      eyebrow="Activitate nouă"
      title={form.projectId ? 'Activitate de grup' : 'Adaugă o activitate'}
      onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Renunță</button><button className="btn primary" form="new-task" disabled={!valid}>Adaugă activitatea</button></>}
    >
      <form id="new-task" className="form-grid" onSubmit={submit}>
        <label className="field full"><span>Titlu</span>
          <input id="nt-title" className="input" autoFocus value={form.title} onChange={set('title')} placeholder="ex. Testare flux de autentificare pe Android" />
        </label>
        <label className="field full"><span>Descriere</span>
          <textarea id="nt-desc" className="textarea" value={form.description} onChange={set('description')} placeholder="Detalii, criterii de acceptare…" />
        </label>
        <label className="field"><span>Termen limită</span>
          <input id="nt-due" type="datetime-local" className="input" value={form.due} onChange={set('due')} />
        </label>
        <label className="field"><span>Prioritate</span>
          <select id="nt-prio" className="select" value={form.priority} onChange={set('priority')}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].ro}</option>)}
          </select>
        </label>
        <label className="field"><span>Proiect de grup</span>
          <select id="nt-project" className="select" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value, assigneeIds: [me.id] }))}>
            <option value="">Fără proiect (personal)</option>
            {myProjects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Etichete</span>
          <input id="nt-tags" className="input" value={form.tags} onChange={set('tags')} placeholder="api, mobile" />
        </label>
        {!form.projectId && form.assigneeIds.length === 1 && form.assigneeIds[0] === me.id && (
          <p className="full muted" style={{ fontSize: 13 }}>Activitate personală: o bifezi singur, nu se validează și nu aduce puncte de performanță.</p>
        )}
        <div className="field full"><span>Asignați {options.length === 1 && <em className="muted" style={{ fontWeight: 500 }}>— doar superiorii pot atribui altora</em>}</span>
          <div className="row wrap" style={{ gap: 6 }}>
            {options.map((u) => (
              <button type="button" key={u.id} className={`perm ${form.assigneeIds.includes(u.id) ? 'on' : ''}`} onClick={() => toggle(u.id)} aria-pressed={form.assigneeIds.includes(u.id)}>
                <Avatar user={u} size="sm" /> {u.id === me.id ? 'Eu' : u.name}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

const CHIP_ICON = { date: <LuCalendar />, time: <LuClock />, priority: <LuFlag />, person: <LuUser />, tag: <LuHash /> };

/** Bara de adăugare rapidă cu limbaj natural (funcție extra). */
export function QuickAdd({ projectId = null }) {
  const state = useStore();
  const me = useSession();
  const now = useNow();
  const [text, setText] = useState('');
  const people = projectId ? assigneeOptions(state, me, projectId) : assignableUsers(state, me);
  const parsed = useMemo(() => (text.trim() ? parseQuickAdd(text, now, people) : null), [text, now, people]);

  const submit = (e) => {
    e.preventDefault();
    if (!parsed?.title) return;
    dispatch({
      type: 'task/add',
      task: { title: parsed.title, priority: parsed.priority, tags: parsed.tags, dueDate: parsed.dueDate, assigneeIds: [parsed.assigneeId ?? me.id], projectId },
    });
    setText('');
  };

  return (
    <form onSubmit={submit}>
      <div className="quick">
        <LuSparkles />
        <input
          id={`quick-add-${projectId ?? 'me'}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Adaugă rapid: „Raport sprint mâine la 15 !mare #raport @Andreea”"
          aria-label="Adăugare rapidă"
        />
        <button className="btn primary sm" disabled={!parsed?.title}><LuCornerDownLeft /> <span className="hide-mobile">Adaugă</span></button>
      </div>
      <div className="chips" aria-live="polite">
        {parsed ? (
          <>
            {parsed.chips.map((c, i) => <span key={i + c.label} className={`chip ${c.kind}`}>{CHIP_ICON[c.kind]} {c.label}</span>)}
            <span className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>→ termen {formatDateTime(parsed.dueDate)}</span>
          </>
        ) : (
          <span className="muted" style={{ fontSize: 12.5 }}>Înțelege: azi, mâine, luni, „în 3 zile”, 15.11, „la 14:30”, !urgent, #etichetă, @nume</span>
        )}
      </div>
    </form>
  );
}
