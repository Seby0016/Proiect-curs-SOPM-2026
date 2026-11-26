// =====================================================================
//  Pagina „Evaluare trimestrială” (#evaluare) — SCHELET (Etapa 1)
//  Responsabil: Iordache Sebastian
// =====================================================================
/** Eticheta calificativului; o folosește și Dosarul angajat. TODO Etapa 2. */
export const RatingPill = ({ rating }) => <span className="badge">{rating?.label}</span>;

export default function Evaluation() {
  return (
    <section className="page">
      <p className="eyebrow">Schelet · Iordache Sebastian</p>
      <h1>Evaluare trimestrială</h1>
      <ul className="todo">
        <li>Calificativul meu: Excepțional / Peste așteptări / Conform / Sub așteptări</li>
        <li>Cum se câștigă punctele (pe prioritate, la timp vs. târziu)</li>
        <li>Echipa mea (doar pentru superiori) + „Propune la promovare”</li>
        <li>Promovări de aprobat (director)</li>
      </ul>
    </section>
  );
}
