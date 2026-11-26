// =====================================================================
//  Pagina „Panou” (#panou) — SCHELET (Etapa 1)
//  Responsabil: Iordache Sebastian
// =====================================================================
/** Refolosite de Dosar angajat și Kanban. TODO Etapa 2. */
export const AbateriCard = ({ user }) => <div className="card">Abateri: {user?.abateri ?? 0}/3</div>;
export const WeekChart = () => null;
export const Feed = () => null;

export default function Dashboard() {
  return (
    <section className="page">
      <p className="eyebrow">Schelet · Iordache Sebastian</p>
      <h1>Panou</h1>
      <ul className="todo">
        <li>Salut personalizat + calificativul trimestrului</li>
        <li>4 cifre mari: Urmează, Restante, Complete, Anulate</li>
        <li>Coada „De validat” pentru manageri</li>
        <li>Dosarul de abateri (3 căsuțe) și graficul săptămânii</li>
        <li>Fluxul de activitate al echipei</li>
      </ul>
    </section>
  );
}
