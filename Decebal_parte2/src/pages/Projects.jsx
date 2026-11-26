// Responsabil: Iordache Decebal
// Proiectele de grup: progres pe statusuri, membri, proiect nou.
import { useState } from 'react';
import { LuFolderPlus, LuCalendar, LuFolderKanban } from 'react-icons/lu';
import { dispatch, useNow, usePresence, useSession, useStore } from '../store/store.js';
import { can, effectiveStatus } from '../logic/rules.js';
import { formatShort, addDays, startOfDay, atHour } from '../logic/time.js';
import { AvatarStack, Avatar, Empty, Modal, Ring, go, swatch } from '../components/ui.jsx';
import { toLocalInput, fromLocalInput } from '../components/TaskDrawer.jsx';

export function projectStats(state, p, now) {
  const tasks = state.tasks.filter((t) => t.projectId === p.id);
  const c = { upcoming: 0, overdue: 0, completed: 0, canceled: 0 };
  for (const t of tasks) c[effectiveStatus(t, now)]++;
  const active = tasks.length - c.canceled;
  return { tasks, c, progress: active ? c.completed / active : 0, total: tasks.length };
}

export function StackBar({ c }) {
  const total = c.upcoming + c.overdue + c.completed + c.canceled || 1;
  return (
    <div style={{ display: 'flex', height: 8, borderRadius: 8, overflow: 'hidden', background: 'var(--line-2)', gap: 2 }}>
      {['completed', 'upcoming', 'overdue', 'canceled'].map((s) => c[s] > 0 && (
        <i key={s} title={`${c[s]}`} style={{ width: `${(c[s] / total) * 100}%`, background: `var(--${s})`, transition: 'width .6s' }} />
      ))}
    </div>
  );
}

function NewProject({ onClose }) {
  const state = useStore();
  const me = useSession();
  const now = useNow();
  const [f, setF] = useState({ name: '', code: 'YAG-', description: '', memberIds: [me.id], deadline: toLocalInput(atHour(addDays(startOfDay(now), 14), 17)), hue: 250 });
  const toggle = (id) => setF((x) => ({ ...x, memberIds: x.memberIds.includes(id) ? x.memberIds.filter((m) => m !== id) : [...x.memberIds, id] }));
  const valid = f.name.trim() && f.code.trim().length > 4;
  return (
    <Modal eyebrow="Proiect de inginerie în grup" title="Proiect nou" onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Renunță</button><button className="btn primary" disabled={!valid} onClick={() => { dispatch({ type: 'project/add', project: { ...f, name: f.name.trim(), code: f.code.trim().toUpperCase(), deadline: fromLocalInput(f.deadline) } }); onClose(); }}>Creează proiectul</button></>}>
      <div className="form-grid">
        <label className="field full"><span>Nume</span><input id="np-name" className="input" autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="ex. Integrare notificări push" /></label>
        <label className="field"><span>Cod</span><input id="np-code" className="input mono" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></label>
        <label className="field"><span>Termen final</span><input id="np-deadline" type="datetime-local" className="input" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></label>
        <label className="field full"><span>Descriere</span><textarea id="np-desc" className="textarea" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
        <div className="field full"><span>Culoare</span>
          <div className="row">{[215, 330, 45, 165].map((h) => <button key={h} type="button" aria-label={`Nuanța ${h}`} onClick={() => setF({ ...f, hue: h })} style={{ width: 30, height: 30, borderRadius: 9, border: f.hue === h ? '3px solid var(--ink)' : '3px solid transparent', outline: '2px solid var(--paper)', outlineOffset: -5, background: swatch(h) }} />)}</div>
        </div>
        <div className="field full"><span>Membri (acces partajat)</span>
          <div className="row wrap" style={{ gap: 6 }}>
            {state.users.filter((u) => u.status === 'activ').map((u) => (
              <button type="button" key={u.id} className={`perm ${f.memberIds.includes(u.id) ? 'on' : ''}`} onClick={() => u.id !== me.id && toggle(u.id)} aria-pressed={f.memberIds.includes(u.id)}>
                <Avatar user={u} size="sm" /> {u.id === me.id ? 'Eu' : u.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function Projects() {
  const state = useStore();
  const me = useSession();
  const now = useNow();
  const presence = usePresence();
  const [creating, setCreating] = useState(false);
  const all = can(state, me, 'scope.all');
  const projects = state.projects.filter((p) => all || p.memberIds.includes(me.id));

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Funcție extra</div>
          <h1 style={{ marginTop: 6 }}>Proiecte de inginerie în grup</h1>
          <p>Spațiu comun de lucru: toți membrii au acces la aceleași activități de grup, iar modificările se sincronizează în timp real.</p>
        </div>
        {can(state, me, 'project.create') && <button className="btn primary" onClick={() => setCreating(true)}><LuFolderPlus /> Proiect nou</button>}
      </div>
      <div className="projects stagger">
        {projects.map((p, i) => {
          const s = projectStats(state, p, now);
          const members = p.memberIds.map((id) => state.users.find((u) => u.id === id)).filter(Boolean);
          const live = presence.filter((x) => x.view === `proiect-${p.id}`);
          return (
            <a key={p.id} href={`#proiect-${p.id}`} className="project-card" style={{ '--h': p.hue, '--pc': swatch(p.hue), '--i': i }}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div className="project-code">{p.code}</div>
                  <h2 style={{ marginTop: 6 }}>{p.name}</h2>
                </div>
                <span className="spacer" />
                <Ring value={s.progress} size={58} stroke={6} color={swatch(p.hue)} label={<span style={{ fontSize: 14 }}>{Math.round(s.progress * 100)}%</span>} />
              </div>
              <p className="muted" style={{ fontSize: 14 }}>{p.description}</p>
              <StackBar c={s.c} />
              <div className="row wrap" style={{ fontSize: 12.5, gap: 12 }}>
                <span><b style={{ color: 'var(--completed)' }}>{s.c.completed}</b> <span className="muted">complete</span></span>
                <span><b style={{ color: 'var(--upcoming)' }}>{s.c.upcoming}</b> <span className="muted">urmează</span></span>
                {s.c.overdue > 0 && <span><b style={{ color: 'var(--overdue)' }}>{s.c.overdue}</b> <span className="muted">restante</span></span>}
              </div>
              <div className="row" style={{ marginTop: 'auto' }}>
                <AvatarStack users={members} max={5} />
                {live.length > 0 && <span className="live-pill">{live.length} online</span>}
                <span className="spacer" />
                <span className="muted row" style={{ fontSize: 12.5, gap: 5 }}><LuCalendar /> {formatShort(p.deadline)}</span>
              </div>
            </a>
          );
        })}
      </div>
      {!projects.length && <div className="card"><Empty icon={<LuFolderKanban />} title="Nu faci parte din niciun proiect">Managerul tău te poate adăuga într-un proiect de grup.</Empty></div>}
      {creating && <NewProject onClose={() => setCreating(false)} />}
    </div>
  );
}
