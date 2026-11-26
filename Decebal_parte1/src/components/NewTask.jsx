// =====================================================================
//  Activitate nouă (fereastră + adăugare rapidă) — SCHELET (Etapa 1)
//  Responsabil: Iordache Decebal
// =====================================================================
import { assignableUsers } from '../logic/rules.js';
import { Modal } from './ui.jsx';

/** TODO Etapa 2: doar persoanele din subordine (sau tu, pentru activități personale). */
export const assigneeOptions = (state) => assignableUsers(state);

export function NewTaskModal({ onClose }) {
  return (
    <Modal title="Activitate nouă" onClose={onClose}>
      <ul className="todo">
        <li>Titlu, descriere, termen, prioritate</li>
        <li>Cui o atribui (doar subordonaților), proiect</li>
        <li>La salvare: dispatch({'{'} type: 'task/add', ... {'}'})</li>
      </ul>
    </Modal>
  );
}

/** TODO Etapa 2: câmp „scrie natural” → parseQuickAdd din logic/parse.js */
export function QuickAdd() {
  return <input className="input" placeholder="Adaugă rapid: „Raport mâine 14:00 !urgent”" disabled />;
}
