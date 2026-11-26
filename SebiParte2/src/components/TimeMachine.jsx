// Responsabil: Iordache Sebastian
// Mașina Timpului (funcție extra): avansează ceasul aplicației ca să poți
// demonstra live regula de abateri — restanțe → abatere → penalizări → concediere.
import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuX, LuFastForward, LuRotateCcw, LuTriangleAlert, LuUserX, LuFlame, LuClock, LuRadar } from 'react-icons/lu';
import { dispatch, useFx, useNow, useStore, HOUR } from '../store/store.js';
import { DAY, formatLong, relativeDue } from '../logic/time.js';
import { effectiveStatus } from '../logic/rules.js';
import { Avatar } from './ui.jsx';

const pad = (n) => String(n).padStart(2, '0');

function Flip({ value }) {
  return <span key={value} className="cell tick">{value}</span>;
}

export default function TimeMachine({ onClose }) {
  const state = useStore();
  const now = useNow();
  const [log, setLog] = useState([]);
  const d = new Date(now);
  const offsetDays = state.clockOffset / DAY;

  useFx(useCallback((fx) => {
    if (fx.type !== 'events') return;
    const name = (id) => fx.state.users.find((u) => u.id === id)?.name ?? '';
    const items = fx.events.filter((e) => e.type !== 'penalty').map((e) => ({
      id: Math.random(),
      kind: e.type,
      text: e.type === 'overdue' ? `${name(e.userId)}: „${e.title}” a devenit restantă`
        : e.type === 'abatere' ? `${name(e.userId)} primește abaterea ${e.n}/3 și +2 activități de penalizare`
          : `${name(e.userId)} este concediat automat (3 abateri)`,
    }));
    setLog((l) => [...items.reverse(), ...l].slice(0, 30));
  }, []));

  const jump = (ms) => dispatch({ type: 'time/advance', ms });

  // radar: următoarele termene care vor declanșa ceva
  const upcoming = state.tasks
    .filter((t) => effectiveStatus(t, now) === 'upcoming')
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, 5)
    .map((t) => {
      const u = state.users.find((x) => x.id === t.assigneeIds[0]);
      const willAbatere = u && u.status === 'activ' && (u.restante % 3) === 2;
      const willFire = willAbatere && u.abateri === 2;
      return { t, u, willAbatere, willFire };
    });

  return createPortal(
    <div className="tm" role="dialog" aria-label="Mașina Timpului">
      <div className="tm-head">
        <div>
          <div className="eyebrow" style={{ color: 'var(--accent-2)' }}>Simulator · funcție extra</div>
          <h2 style={{ color: 'var(--ink)', marginTop: 4 }}>Mașina Timpului</h2>
          <p>Avansează ceasul aplicației și urmărește cum regula de abateri lucrează singură.</p>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Închide"><LuX /></button>
      </div>

      <div className="flip" aria-live="polite">
        <Flip value={pad(d.getDate())} /><span className="sep">.</span><Flip value={pad(d.getMonth() + 1)} />
        <span style={{ width: 10 }} />
        <Flip value={pad(d.getHours())} /><span className="sep">:</span><Flip value={pad(d.getMinutes())} />
      </div>
      <div className="tm-date">{formatLong(now)}{offsetDays > 0.01 && <> · <b style={{ color: 'var(--warn)' }}>+{offsetDays < 1 ? `${Math.round(offsetDays * 24)} h` : `${offsetDays.toFixed(1).replace('.0', '')} zile`}</b></>}</div>

      <div className="tm-actions">
        <button onClick={() => jump(HOUR)}>+1 oră</button>
        <button onClick={() => jump(6 * HOUR)}>+6 ore</button>
        <button onClick={() => jump(DAY)}>+1 zi</button>
        <button onClick={() => jump(3 * DAY)}>+3 zile</button>
        <button className="wide" onClick={() => jump(7 * DAY)}><LuFastForward style={{ verticalAlign: -2 }} /> +1 săptămână</button>
        <button className="wide" onClick={() => dispatch({ type: 'time/reset' })} disabled={!state.clockOffset} style={{ opacity: state.clockOffset ? 1 : 0.4 }}><LuRotateCcw style={{ verticalAlign: -2 }} /> Înapoi în prezent</button>
      </div>
      {state.clockOffset > 0 && <div className="tm-warn">Revenirea în prezent nu șterge abaterile deja înregistrate. Pentru o demonstrație nouă folosește „Resetează datele demo”.</div>}

      <div className="tm-log">
        <div className="row" style={{ color: 'var(--ink-3)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}><LuRadar /> Radar termene</div>
        {upcoming.map(({ t, u, willAbatere, willFire }, i) => (
          <div key={t.id} className={`ev ${willFire ? 'fired' : willAbatere ? 'abatere' : ''}`} style={{ '--i': i }}>
            <Avatar user={u} size="sm" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 650 }}>{t.title}</div>
              <div style={{ opacity: 0.75, fontSize: 12 }}>{u?.name.split(' ')[0]} · {relativeDue(t.dueDate, now)}
                {willFire ? ' · ratarea duce la CONCEDIERE' : willAbatere ? ' · ratarea duce la o abatere' : ''}</div>
            </div>
          </div>
        ))}
        {log.length > 0 && <div className="row" style={{ color: 'var(--ink-3)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 8 }}><LuClock /> Ce s-a întâmplat</div>}
        {log.map((e, i) => (
          <div key={e.id} className={`ev ${e.kind}`} style={{ '--i': i }}>
            {e.kind === 'fired' ? <LuUserX /> : e.kind === 'abatere' ? <LuFlame /> : <LuTriangleAlert />}
            <span>{e.text}</span>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}
