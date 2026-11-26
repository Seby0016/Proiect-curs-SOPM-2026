// =====================================================================
//  Sertarul cu detaliile unei activități — SCHELET (Etapa 1)
//  Responsabil: Iordache Decebal
// =====================================================================
import { useStore } from '../store/store.js';
import { Drawer } from './ui.jsx';

/** Conversie între timestamp și valoarea unui <input type="datetime-local">. */
export const toLocalInput = (ts) => {
  const d = new Date(ts);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
export const fromLocalInput = (v) => new Date(v).getTime();

export default function TaskDrawer({ taskId, onClose }) {
  const task = useStore().tasks.find((t) => t.id === taskId);
  return (
    <Drawer onClose={onClose}>
      <h2>{task?.title ?? 'Activitate'}</h2>
      <ul className="todo">
        <li>Traseul statusului: Urmează → La validare → Complet</li>
        <li>Butoane după rol: Trimite spre validare / Validează / Respinge cu motiv</li>
        <li>Checklist, comentarii, istoric</li>
      </ul>
    </Drawer>
  );
}
