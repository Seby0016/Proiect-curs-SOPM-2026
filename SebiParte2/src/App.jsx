// Responsabil: Iordache Sebastian
// Rama aplicației: Login sau meniu + pagina aleasă după #hash, ferestrele globale, scurtăturile, tema.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LuLayoutDashboard, LuListTodo, LuFolderKanban, LuUsers, LuAward, LuBriefcase, LuHourglass, LuThumbsUp, LuUndo2, LuTrendingUp, LuSearch, LuBell,
  LuMoon, LuSun, LuLogOut, LuClock, LuPlus, LuTriangleAlert, LuUserX, LuMessageSquare, LuFolderPlus, LuCircleCheck, LuFlame, LuBan,
} from 'react-icons/lu';
import { dispatch, logout, setPresenceView, tick, useNow, useSession, useStore } from './store/store.js';
import { can, effectiveStatus, evaluation, positionOf, gradeName, RATINGS, canValidate } from './logic/rules.js';
import { formatDateTime, timeAgo } from './logic/time.js';
import { Avatar, go, useHashRoute, swatch } from './components/ui.jsx';
import { UICtx } from './components/context.js';
import Effects from './components/Effects.jsx';
import TaskDrawer from './components/TaskDrawer.jsx';
import { NewTaskModal } from './components/NewTask.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import TimeMachine from './components/TimeMachine.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Tasks from './pages/Tasks.jsx';
import Projects from './pages/Projects.jsx';
import ProjectBoard from './pages/ProjectBoard.jsx';
import Team from './pages/Team.jsx';
import Employee from './pages/Employee.jsx';
import Evaluation from './pages/Evaluation.jsx';
import Positions from './pages/Positions.jsx';

// ---------- temă ----------
const THEME_KEY = 'yagi-tasks:theme';
function readTheme() { try { return localStorage.getItem(THEME_KEY); } catch { return null; } }
function applyTheme(t) {
  if (t) document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
}
const isDark = () => {
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'dark'; // tema implicită: hârtie (luminoasă)
};


/** Efecte de interacțiune globale: lumină sub cursor, înclinare 3D, undă la clic. */
function useInteractionFx() {
  useEffect(() => {
    const SPOT = '.card, .task, .kpi, .project-card, .kcard, .account, .org-card, .badge';
    let raf = 0;
    const move = (e) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = e.target.closest?.(SPOT);
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        el.style.setProperty('--mx', `${x}px`);
        el.style.setProperty('--my', `${y}px`);
        if (el.classList.contains('project-card')) {
          el.style.setProperty('--rx', `${((y / r.height) - 0.5) * -7}deg`);
          el.style.setProperty('--ry', `${((x / r.width) - 0.5) * 9}deg`);
        }
      });
    };
    const leave = (e) => {
      const el = e.target.closest?.('.project-card');
      if (el && !el.contains(e.relatedTarget)) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); }
    };
    const down = (e) => {
      const b = e.target.closest?.('.btn, .tm-actions button');
      if (!b || b.disabled) return;
      const r = b.getBoundingClientRect();
      const s = document.createElement('span');
      s.className = 'ripple';
      s.style.left = `${e.clientX - r.left}px`;
      s.style.top = `${e.clientY - r.top}px`;
      if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
      b.style.overflow = 'hidden';
      b.appendChild(s);
      setTimeout(() => s.remove(), 650);
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerout', leave, { passive: true });
    window.addEventListener('pointerdown', down);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerout', leave); window.removeEventListener('pointerdown', down); };
  }, []);
}

const NOTIF_ICON = { overdue: <LuTriangleAlert />, abatere: <LuFlame />, penalty: <LuFlame />, fired: <LuUserX />, comment: <LuMessageSquare />, assigned: <LuPlus />, project: <LuFolderPlus />, canceled: <LuBan />, review: <LuHourglass />, approved: <LuThumbsUp />, rejected: <LuUndo2 />, promo: <LuTrendingUp /> };

function Notifications({ state, me, now }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const mine = state.notifications.filter((n) => n.userId === me.id).slice(0, 30);
  const unread = mine.filter((n) => !n.read).length;
  useEffect(() => {
    if (!open) return;
    const h = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', h);
    return () => document.removeEventListener('pointerdown', h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="icon-btn" aria-label={`Notificări (${unread} necitite)`} onClick={() => { setOpen(!open); if (!open && unread) setTimeout(() => dispatch({ type: 'notif/read-all', userId: me.id }), 1800); }}>
        <LuBell />
        {unread > 0 && <span className="dot" key={unread}>{unread}</span>}
      </button>
      {open && (
        <div className="notif-pop">
          <div className="row" style={{ padding: '14px 16px', borderBottom: '1px solid var(--line-2)' }}>
            <h3>Notificări</h3>
            <span className="spacer" />
            <span className="muted" style={{ fontSize: 12 }}>{unread} necitite</span>
          </div>
          {mine.map((n) => (
            <div key={n.id} className={`notif ${n.read ? '' : 'unread'}`}>
              <span className={`n-ic ${n.kind}`}>{NOTIF_ICON[n.kind] ?? <LuCircleCheck />}</span>
              <div style={{ minWidth: 0 }}>
                <p>{n.text}</p>
                <small className="muted">{timeAgo(n.at, now)}</small>
              </div>
            </div>
          ))}
          {!mine.length && <div className="empty"><LuBell /><b>Nicio notificare</b></div>}
        </div>
      )}
    </div>
  );
}


function navItems(state, me, now) {
  const myOverdue = state.tasks.filter((t) => t.assigneeIds.includes(me.id) && effectiveStatus(t, now) === 'overdue').length;
  const toValidate = state.tasks.filter((t) => canValidate(state, me, t)).length;
  return [
    { id: 'panou', label: 'Panou', icon: <LuLayoutDashboard /> },
    { id: 'sarcini', label: 'Activități', icon: <LuListTodo />, count: myOverdue || toValidate || null, hot: !!myOverdue },
    { id: 'proiecte', label: 'Proiecte', icon: <LuFolderKanban /> },
    can(state, me, 'team.view') && { id: 'echipa', label: 'Echipă', icon: <LuUsers /> },
    { id: 'evaluare', label: 'Evaluare', icon: <LuAward /> },
    can(state, me, 'positions.manage') && { id: 'posturi', label: 'Posturi', icon: <LuBriefcase /> },
  ].filter(Boolean);
}

function Shell({ route, me, state, now, ui }) {
  const items = navItems(state, me, now);
  const section = route.startsWith('proiect-') ? 'proiecte' : route.startsWith('angajat-') ? 'echipa' : route === 'clasament' ? 'evaluare' : route;
  const ev = evaluation(state, me, now);
  const pos = positionOf(state, me);
  const shifted = state.clockOffset > 0;

  let page;
  if (route.startsWith('proiect-')) page = <ProjectBoard id={route.slice(8)} />;
  else if (route.startsWith('angajat-')) page = <Employee id={route.slice(8)} />;
  else page = {
    panou: <Dashboard />,
    sarcini: <Tasks />,
    proiecte: <Projects />,
    echipa: can(state, me, 'team.view') ? <Team /> : <Dashboard />,
    evaluare: <Evaluation />,
    clasament: <Evaluation />,
    posturi: can(state, me, 'positions.manage') ? <Positions /> : <Dashboard />,
  }[route] ?? <Dashboard />;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">Y</span>
          <div><b>Yagi Tasks</b><small>Management ierarhic</small></div>
        </div>
        <nav className="nav" aria-label="Navigare principală">
          <div className="nav-label">Spațiu de lucru</div>
          {items.map((it) => (
            <a key={it.id} href={`#${it.id}`} style={{ animationDelay: `${items.indexOf(it) * 50}ms` }} className={section === it.id ? 'active' : ''} aria-current={section === it.id ? 'page' : undefined}>
              {it.icon}{it.label}
              {it.count ? <span className={`count ${it.hot ? 'hot' : ''}`}>{it.count}</span> : null}
            </a>
          ))}
          <div className="nav-label">Proiecte de grup</div>
          {state.projects.filter((p) => p.memberIds.includes(me.id) || can(state, me, 'scope.all')).map((p) => (
            <a key={p.id} href={`#proiect-${p.id}`} className={route === `proiect-${p.id}` ? 'active' : ''}>
              <span style={{ width: 18, display: 'grid', placeItems: 'center' }}><span style={{ width: 10, height: 10, background: swatch(p.hue), outline: '1.5px solid var(--side-ink)' }} /></span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="me-card">
            <Avatar user={me} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <b>{me.name}</b>
              <small>{pos?.title} · {gradeName(me.grade)}</small>
            </div>
            <button className="icon-btn" style={{ width: 32, height: 32, background: 'transparent', borderColor: 'var(--navy-line)', color: 'var(--navy-ink)' }} onClick={logout} aria-label="Deconectare" title="Deconectare"><LuLogOut /></button>
          </div>
          <div style={{ padding: '0 8px' }}>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ fontWeight: 650 }}>{ev.quarter.label} · {ev.rating.label}</span>
              <span className="mono">{ev.pp} PP</span>
            </div>
            <div className="xp-mini"><i style={{ width: `${Math.min(100, (ev.pp / RATINGS[0].min.pp) * 100)}%` }} /></div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="search-btn" onClick={ui.palette} aria-label="Caută (Ctrl+K)">
            <LuSearch /> <span>Caută sau comandă…</span> <kbd>Ctrl K</kbd>
          </button>
          <div className="top-actions">
            {can(state, me, 'time.machine') && (
              <button className={`clock-btn ${shifted ? 'shifted' : ''}`} onClick={ui.timeMachine} title="Mașina Timpului" aria-label="Mașina Timpului">
                <LuClock /> <span className="hide-mobile">{shifted ? formatDateTime(now) : 'Mașina Timpului'}</span>
              </button>
            )}
            <button className="icon-btn" onClick={ui.toggleTheme} aria-label="Comută tema">{ui.dark ? <LuSun /> : <LuMoon />}</button>
            <Notifications state={state} me={me} now={now} />
            <button className="btn primary" onClick={() => ui.newTask()}><LuPlus /> <span className="hide-mobile">Activitate</span></button>
          </div>
        </header>
        <div className="wipe" key={`w-${route}`} aria-hidden="true"><i /><i /><i /></div>
        <main className="content" key={route}>{page}</main>
      </div>

      <nav className="mobile-nav" aria-label="Navigare">
        {items.slice(0, 5).map((it) => (
          <a key={it.id} href={`#${it.id}`} className={section === it.id ? 'active' : ''}>
            {it.icon}{it.label}
            {it.count ? <span className="count">{it.count}</span> : null}
          </a>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  const state = useStore();
  const me = useSession();
  const now = useNow();
  const route = useHashRoute();
  const [taskId, setTaskId] = useState(null);
  const [taskMode, setTaskMode] = useState(null);
  const [newTask, setNewTask] = useState(null);
  const [palette, setPalette] = useState(false);
  const [tm, setTm] = useState(false);
  const [dark, setDark] = useState(false);
  const [flash, setFlash] = useState(() => new Set());
  useInteractionFx();

  useEffect(() => { applyTheme(readTheme()); setDark(isDark()); }, []);
  useEffect(() => { const i = setInterval(tick, 15000); tick(); return () => clearInterval(i); }, []);
  useEffect(() => { setPresenceView(route); }, [route, me?.id]);

  const onFlash = useCallback((ids) => {
    setFlash(new Set(ids));
    setTimeout(() => setFlash(new Set()), 1500);
  }, []);

  const ui = useMemo(() => ({
    openTask: (id, mode = null) => { setTaskId(id); setTaskMode(mode); },
    newTask: (defaults = {}) => setNewTask(defaults),
    palette: () => setPalette(true),
    timeMachine: () => setTm((x) => !x),
    toggleTheme: () => {
      const next = isDark() ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch { /* ignorat */ }
      setDark(next === 'dark');
    },
    dark,
    flash,
  }), [dark, flash]);

  // scurtături de tastatură
  useEffect(() => {
    const h = (e) => {
      const typing = /input|textarea|select/i.test(e.target.tagName) || e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); if (me) setPalette((p) => !p); return; }
      if (typing || e.ctrlKey || e.metaKey || e.altKey || !me) return;
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); setNewTask({}); }
      if (e.key.toLowerCase() === 't' && can(state, me, 'time.machine')) setTm((x) => !x);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [me, state]);

  return (
    <UICtx.Provider value={ui}>
      {me ? <Shell route={route} me={me} state={state} now={now} ui={ui} /> : <Login />}
      {me && taskId && <TaskDrawer key={taskId + (taskMode ?? '')} taskId={taskId} mode={taskMode} onClose={() => setTaskId(null)} />}
      {me && newTask && <NewTaskModal defaults={newTask} onClose={() => setNewTask(null)} />}
      {me && palette && <CommandPalette onClose={() => setPalette(false)} />}
      {me && tm && <TimeMachine onClose={() => setTm(false)} />}
      <Effects state={state} onFlash={onFlash} />
    </UICtx.Provider>
  );
}
