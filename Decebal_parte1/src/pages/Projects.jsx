// =====================================================================
//  Pagina „Proiecte” (#proiecte) — SCHELET (Etapa 1)
//  Responsabil: Iordache Decebal
// =====================================================================
import { useStore } from '../store/store.js';
import { Empty } from '../components/ui.jsx';

/** Câte activități are proiectul pe fiecare status. TODO Etapa 2. */
export function projectStats(state, project) {
  const tasks = state.tasks.filter((t) => t.projectId === project.id);
  return { total: tasks.length, counts: {}, progress: 0 };
}
/** Bara colorată cu proporția statusurilor. TODO Etapa 2. */
export const StackBar = () => <div className="stackbar" />;

export default function Projects() {
  const state = useStore();
  return (
    <section className="page">
      <p className="eyebrow">Schelet · Iordache Decebal</p>
      <h1>Proiecte de grup</h1>
      <ul className="todo">
        <li>Card pe proiect: cod, membri, termen, progres</li>
        <li>Proiect nou (doar managerii)</li>
      </ul>
      {!state.projects.length && <Empty title="Niciun proiect încă" />}
    </section>
  );
}
