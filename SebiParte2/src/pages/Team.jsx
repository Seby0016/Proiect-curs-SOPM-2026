// Responsabil: Iordache Sebastian
// Echipa: organigrama și tabelul angajaților (cine e online, abateri, puncte).
import { LuNetwork, LuTable2 } from 'react-icons/lu';
import { useNow, useSession, useStore } from '../store/store.js';
import { can, departmentOf, performance, positionOf, subordinates } from '../logic/rules.js';
import { Avatar, ScoreText, go } from '../components/ui.jsx';

function OrgNode({ state, user, depth = 0 }) {
  const kids = state.users.filter((u) => u.managerId === user.id);
  return (
    <div className="org-node">
      <a href={`#angajat-${user.id}`} className={`org-card ${user.status === 'concediat' ? 'fired' : ''}`} style={{ animationDelay: `${depth * 0.12}s` }}>
        <Avatar user={user} size="sm" />
        <div>
          <b>{user.name}</b>
          <small>{user.status === 'concediat' ? 'Concediat' : positionOf(state, user)?.title}</small>
        </div>
        {user.abateri > 0 && user.status === 'activ' && <span className="mini-dots" title={`${user.abateri} abateri`}>{[1, 2, 3].map((n) => <i key={n} className={n <= user.abateri ? 'on' : ''} />)}</span>}
      </a>
      {kids.length > 0 && (
        <div className="org-children">
          {kids.map((k) => <OrgNode key={k.id} state={state} user={k} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

export default function Team() {
  const state = useStore();
  const me = useSession();
  const now = useNow();
  const all = can(state, me, 'scope.all');
  const people = all ? state.users.filter((u) => u.id !== me.id) : subordinates(state, me.id);
  const root = all ? state.users.find((u) => !u.managerId) : me;
  const rows = people
    .map((u) => ({ u, p: performance(state, u, now) }))
    .sort((a, b) => (a.u.status === b.u.status ? b.p.score - a.p.score : a.u.status === 'activ' ? -1 : 1));

  return (
    <div className="page grid" style={{ gap: 22 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <div className="eyebrow">Panou de monitorizare</div>
          <h1 style={{ marginTop: 6 }}>Echipă</h1>
          <p>Structura ierarhică și starea fiecărui angajat: scor de performanță, restanțe și abateri. Concedierea se face automat la a 3-a abatere.</p>
        </div>
      </div>

      <section className="card card-pad">
        <h3 className="row" style={{ gap: 8, marginBottom: 16 }}><LuNetwork /> Organigramă</h3>
        <div className="org"><OrgNode state={state} user={root} /></div>
      </section>

      <section className="card">
        <div className="card-head"><h3 className="row" style={{ gap: 8 }}><LuTable2 /> Monitorizare</h3><span className="muted" style={{ fontSize: 13 }}>{people.length} persoane</span></div>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="tbl">
            <thead>
              <tr><th>Angajat</th><th>Departament</th><th>Scor</th><th>Deschise</th><th>Restante</th><th>Spre abatere</th><th>Abateri</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map(({ u, p }, i) => (
                <tr key={u.id} className={u.status === 'concediat' ? 'fired' : ''} style={{ '--i': i }} onClick={() => go(`angajat-${u.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && go(`angajat-${u.id}`)}>
                  <td><div className="row"><Avatar user={u} size="sm" /><div><b style={{ fontSize: 14 }}>{u.name}</b><div className="muted" style={{ fontSize: 12 }}>{positionOf(state, u)?.title}</div></div></div></td>
                  <td>{departmentOf(state, u)?.name}</td>
                  <td><ScoreText value={p.score} /></td>
                  <td className="mono">{p.counts.upcoming + p.counts.overdue}</td>
                  <td className="mono" style={{ color: p.counts.overdue ? 'var(--overdue)' : undefined, fontWeight: p.counts.overdue ? 700 : 400 }}>{p.counts.overdue}</td>
                  <td>{u.status === 'activ' ? <span className="mono">{u.restante % 3}/3</span> : '—'}</td>
                  <td><span className="mini-dots">{[1, 2, 3].map((n) => <i key={n} className={n <= u.abateri ? 'on' : ''} />)}</span></td>
                  <td>{u.status === 'concediat' ? <span className="badge-fired">Concediat</span> : <span className="status completed" style={{ fontSize: 11.5 }}>Activ</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
