// =====================================================================
//  Pagina „Activități” (#sarcini) — SCHELET (Etapa 1)
//  Responsabil: Iordache Decebal
// =====================================================================
import { useSession, useStore } from '../store/store.js';
import TaskCard from '../components/TaskCard.jsx';
import { Empty } from '../components/ui.jsx';

/** Alte pagini pot deschide Activități direct pe un filtru (ex. Restante). */
let pendingFilter = null;
export const setTasksFilter = (f) => { pendingFilter = f; };

export default function Tasks() {
  const state = useStore();
  const me = useSession();
  const mine = state.tasks.filter((t) => t.assigneeIds.includes(me.id));
  return (
    <section className="page">
      <p className="eyebrow">Schelet · Iordache Decebal</p>
      <h1>Activități</h1>
      <ul className="todo">
        <li>Filtre pe cele 4 statusuri + „În validare”, căutare, sortare</li>
        <li>Ale mele / De validat / Departamentul meu</li>
      </ul>
      {mine.length ? mine.map((t) => <TaskCard key={t.id} task={t} />) : <Empty title="Nicio activitate încă" text="Datele demo vin în Etapa 2." />}
    </section>
  );
}
