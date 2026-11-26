// =====================================================================
//  App — SCHELET (Etapa 1)
//  Responsabil: Iordache Sebastian
//  Rama aplicației: dacă nu e nimeni logat arată Login, altfel meniul
//  din stânga + pagina aleasă după #hash. Tot aici stau acțiunile globale
//  (deschide activitate, activitate nouă, Ctrl+K, Mașina Timpului, tema).
// =====================================================================
import { useMemo, useState } from 'react';
import { logout, useNow, useSession, useStore } from './store/store.js';
import { can, positionOf, gradeName } from './logic/rules.js';
import { Avatar, useHashRoute } from './components/ui.jsx';
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

function Shell({ route, me, state, ui }) {
  const items = [
    ['panou', 'Panou'],
    ['sarcini', 'Activități'],
    ['proiecte', 'Proiecte'],
    can(state, me, 'team.view') && ['echipa', 'Echipă'],
    ['evaluare', 'Evaluare'],
    can(state, me, 'positions.manage') && ['posturi', 'Posturi'],
  ].filter(Boolean);

  let page;
  if (route.startsWith('proiect-')) page = <ProjectBoard id={route.slice(8)} />;
  else if (route.startsWith('angajat-')) page = <Employee id={route.slice(8)} />;
  else page = { panou: <Dashboard />, sarcini: <Tasks />, proiecte: <Projects />, echipa: <Team />, evaluare: <Evaluation />, posturi: <Positions /> }[route] ?? <Dashboard />;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">Y</span><div><b>Yagi Tasks</b><small>Management ierarhic</small></div></div>
        <nav className="nav" aria-label="Navigare principală">
          {items.map(([id, label]) => <a key={id} href={`#${id}`} className={route === id ? 'active' : ''}>{label}</a>)}
        </nav>
        <div className="sidebar-foot">
          <Avatar user={me} />
          <div style={{ flex: 1 }}><b>{me.name}</b><br /><small>{positionOf(state, me)?.title} · {gradeName(me.grade)}</small></div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn ghost" onClick={ui.palette}>Caută… (Ctrl K)</button>
          <div className="row">
            {can(state, me, 'time.machine') && <button className="btn" onClick={ui.timeMachine}>Mașina Timpului</button>}
            <button className="btn primary" onClick={() => ui.newTask()}>+ Activitate</button>
            <button className="btn ghost" onClick={logout}>Ieșire</button>
          </div>
        </header>
        <main className="content" key={route}>{page}</main>
      </div>
    </div>
  );
}

export default function App() {
  const state = useStore();
  const me = useSession();
  useNow();
  const route = useHashRoute();
  const [taskId, setTaskId] = useState(null);
  const [newTask, setNewTask] = useState(null);
  const [palette, setPalette] = useState(false);
  const [tm, setTm] = useState(false);

  // Contextul UI: orice componentă poate deschide o activitate sau o fereastră.
  const ui = useMemo(() => ({
    openTask: (id) => setTaskId(id),
    newTask: (defaults = {}) => setNewTask(defaults),
    palette: () => setPalette(true),
    timeMachine: () => setTm((x) => !x),
    toggleTheme: () => {}, // TODO Etapa 2: tema întunecată
    dark: false,
    flash: new Set(),
  }), []);
  // TODO Etapa 2: scurtături (Ctrl+K, N, T), tick() la 15 s, tranziția între pagini

  return (
    <UICtx.Provider value={ui}>
      {me ? <Shell route={route} me={me} state={state} ui={ui} /> : <Login />}
      {me && taskId && <TaskDrawer taskId={taskId} onClose={() => setTaskId(null)} />}
      {me && newTask && <NewTaskModal defaults={newTask} onClose={() => setNewTask(null)} />}
      {me && palette && <CommandPalette onClose={() => setPalette(false)} />}
      {me && tm && <TimeMachine onClose={() => setTm(false)} />}
      <Effects state={state} onFlash={() => {}} />
    </UICtx.Provider>
  );
}
