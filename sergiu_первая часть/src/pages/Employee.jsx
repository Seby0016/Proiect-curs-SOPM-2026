// =====================================================================
//  Pagina „Dosar angajat” (#angajat-u2) — SCHELET (Etapa 1)
//  Responsabil: Simin Sergiu
// =====================================================================
import { useStore } from '../store/store.js';
import { positionOf, gradeName } from '../logic/rules.js';
import { Avatar } from '../components/ui.jsx';

export default function Employee({ id }) {
  const state = useStore();
  const u = state.users.find((x) => x.id === id);
  if (!u) return <section className="page"><h1>Angajat inexistent</h1></section>;
  return (
    <section className="page">
      <p className="eyebrow">Schelet · Simin Sergiu</p>
      <div className="row"><Avatar user={u} size={56} /><h1>{u.name}</h1></div>
      <p className="muted">{positionOf(state, u)?.title} · {gradeName(u.grade)} · {u.email}</p>
      <ul className="todo">
        <li>Dosarul de abateri (3 căsuțe) și istoricul (angajare, abateri, promovări)</li>
        <li>Activitățile angajatului, pe statusuri</li>
        <li>Calificativul trimestrial și punctele de performanță</li>
        <li>„Contul meu”: schimbarea parolei (parola veche + cea nouă, de 2 ori)</li>
      </ul>
    </section>
  );
}
