// =====================================================================
//  Tabla Kanban a unui proiect (#proiect-p1) — SCHELET (Etapa 1)
//  Responsabil: Iordache Sebastian
// =====================================================================
export default function ProjectBoard({ id }) {
  return (
    <section className="page">
      <p className="eyebrow">Schelet · Iordache Sebastian</p>
      <h1>Kanban · {id}</h1>
      <ul className="todo">
        <li>Coloane: Urmează · La validare · Restant · Complet · Anulat</li>
        <li>Drag &amp; drop care respectă fluxul (nu poți trage singur în Complet)</li>
        <li>Membrii proiectului, progresul, fluxul de activitate</li>
      </ul>
    </section>
  );
}
