// =====================================================================
//  Componente UI de bază — SCHELET (Etapa 1)
//  Responsabil: Iordache Decebal
//  Piesele mici refolosite peste tot: avatar, formele statusurilor,
//  butoane, fereastră modală, sertar lateral, rutarea după #hash.
//  Numele exportate RĂMÂN aceleași în Etapa 2 (le importă alte fișiere).
// =====================================================================
import { useEffect, useState } from 'react';
import { initials } from '../data/seed.js';
import { STATUS_META, PRIORITY_META } from '../logic/rules.js';

/** Culoarea unei persoane/unui proiect din nuanța (hue) lui. */
export const swatch = (hue = 220) => `hsl(${hue} 70% 45%)`;

/** Statusurile se recunosc după FORMĂ, nu doar după culoare (accesibilitate). */
export const STATUS_SHAPE = { upcoming: 'circle', overdue: 'triangle', completed: 'square', canceled: 'cross' };
const GLYPH = { circle: '●', triangle: '▲', square: '■', cross: '✕' };
export function Shape({ kind = 'circle' }) { return <span aria-hidden="true">{GLYPH[kind]}</span>; }

export function Avatar({ user, size = 34 }) {
  if (!user) return null;
  return <span className="avatar" style={{ width: size, height: size, background: swatch(user.hue) }} title={user.name}>{initials(user.name)}</span>;
}
export function AvatarStack({ users = [] }) { return <span className="row">{users.slice(0, 4).map((u) => <Avatar key={u.id} user={u} size={26} />)}</span>; }

export function StatusBadge({ status }) {
  return <span className={`badge ${status}`}><Shape kind={STATUS_SHAPE[status]} /> {STATUS_META[status]?.ro}</span>;
}
export function Priority({ value }) { return <span className="muted">{PRIORITY_META[value]?.ro}</span>; }

export function Empty({ title = 'Nimic aici', text }) {
  return <div className="empty"><b>{title}</b>{text && <p className="muted">{text}</p>}</div>;
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="card modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="row" style={{ justifyContent: 'space-between' }}><h2>{title}</h2><button className="btn ghost" onClick={onClose}>Închide</button></div>
        {children}
      </div>
    </div>
  );
}
export function Drawer({ onClose, children }) {
  return <div className="overlay" onClick={onClose}><aside className="card drawer" onClick={(e) => e.stopPropagation()}>{children}</aside></div>;
}

// TODO Etapa 2: animații (cifre care se rotesc, inel de progres, segmente)
export const AnimatedNumber = ({ value }) => <>{value}</>;
export const Ring = ({ value = 0 }) => <span className="mono">{Math.round(value * 100)}%</span>;
export const ScoreText = ({ value }) => <span className="mono">{value}</span>;
export const CheckButton = ({ onClick, label = 'Bifează' }) => <button className="btn" onClick={onClick}>{label}</button>;
export function Segmented({ value, options, onChange }) {
  return <div className="row">{options.map(([v, l]) => <button key={v} className={`btn ${v === value ? 'primary' : 'ghost'}`} onClick={() => onChange(v)}>{l}</button>)}</div>;
}

/** Rutare simplă: #panou, #sarcini, #proiect-p1, #angajat-u2 ... */
export function useHashRoute() {
  const read = () => window.location.hash.replace('#', '') || 'panou';
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const h = () => setRoute(read());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  return route;
}
export const go = (r) => { window.location.hash = r; };
