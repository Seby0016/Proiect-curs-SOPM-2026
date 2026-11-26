// Responsabil: Iordache Decebal
// Componente UI reutilizabile: avatar, formele statusurilor, ferestre, sertar, rutare după #hash.
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuX } from 'react-icons/lu';
import { STATUS_META, PRIORITY_META } from '../logic/rules.js';
import { initials } from '../data/seed.js';

/** Paleta Bauhaus: orice nuanță se mapează pe una din cele 4 culori plate. */
export function swatch(hue = 0) {
  const h = ((hue % 360) + 360) % 360;
  if (h >= 180 && h < 270) return 'var(--blue)';
  if (h >= 270 || h < 20) return 'var(--red)';
  if (h < 100) return 'var(--yellow)';
  return 'var(--ink)';
}
const onSwatch = (hue) => (swatch(hue) === 'var(--yellow)' ? '#111111' : swatch(hue) === 'var(--ink)' ? 'var(--paper)' : '#ffffff');

/** Formele care codifică statusurile: cerc, triunghi, pătrat, cruce. */
export function Shape({ kind = 'circle', size = 12, color = 'currentColor', className = '' }) {
  const s = size;
  return (
    <svg className={`shape ${className}`} width={s} height={s} viewBox="0 0 20 20" aria-hidden="true">
      {kind === 'circle' && <circle cx="10" cy="10" r="10" fill={color} />}
      {kind === 'triangle' && <polygon points="10,0 20,20 0,20" fill={color} />}
      {kind === 'square' && <rect width="20" height="20" fill={color} />}
      {kind === 'cross' && <path d="M3 0 10 7 17 0 20 3 13 10 20 17 17 20 10 13 3 20 0 17 7 10 0 3Z" fill={color} />}
    </svg>
  );
}
export const STATUS_SHAPE = { upcoming: 'circle', overdue: 'triangle', completed: 'square', canceled: 'cross' };

export function Avatar({ user, size = '', live = false, title }) {
  if (!user) return null;
  return (
    <span
      className={`avatar ${size} ${user.status === 'concediat' ? 'fired' : ''}`}
      style={{ '--h': user.hue, '--av': swatch(user.hue), '--avc': onSwatch(user.hue) }}
      title={title ?? user.name}
      aria-label={user.name}
    >
      {initials(user.name)}
      {live && <span className="live" />}
    </span>
  );
}

export function AvatarStack({ users, max = 4, size = 'sm' }) {
  const shown = users.slice(0, max);
  return (
    <span className="avatar-stack">
      {shown.map((u) => <Avatar key={u.id} user={u} size={size} />)}
      {users.length > max && <span className="more">+{users.length - max}</span>}
    </span>
  );
}

export function StatusBadge({ status, en = false }) {
  return (
    <span className={`status ${status}`}>
      <Shape kind={STATUS_SHAPE[status]} size={9} />
      {STATUS_META[status].ro}
      {en && <span className="en">· {STATUS_META[status].en}</span>}
    </span>
  );
}

export function Priority({ value }) {
  return (
    <span className={`prio ${value}`} title={`Prioritate ${PRIORITY_META[value].ro.toLowerCase()}`}>
      <i><b /><b /><b /></i>
      {PRIORITY_META[value].ro}
    </span>
  );
}

/** Număr care „numără” animat până la valoarea nouă. */
export function AnimatedNumber({ value, duration = 900, format = (n) => Math.round(n) }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 4);
      setShown(a + (value - a) * e);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); from.current = value; };
  }, [value, duration]);
  return <>{format(shown)}</>;
}

export function Ring({ value, size = 84, stroke = 8, color, label, sub }) {
  const gid = useId().replace(/:/g, '');
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [v, setV] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setV(value)); return () => cancelAnimationFrame(id); }, [value]);
  return (
    <span className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle className="bar" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} stroke={color ?? 'var(--blue)'} strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, v)))} />
      </svg>
      <span className="label"><span>{label}{sub && <small>{sub}</small>}</span></span>
    </span>
  );
}

/** Tab-uri cu indicator care alunecă sub opțiunea activă. */
export function Segmented({ options, value, onChange, label }) {
  const ref = useRef(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const el = ref.current?.querySelector('button.on');
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, [value, options]);
  return (
    <div className="seg" ref={ref} role="tablist" aria-label={label}>
      <span className="pill" style={pill} />
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.icon}{o.label}{o.count !== undefined && <b>{o.count}</b>}
        </button>
      ))}
    </div>
  );
}

function useEscape(onClose) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
}

export function Modal({ title, eyebrow, onClose, children, footer }) {
  useEscape(onClose);
  return createPortal(
    <>
      <div className="overlay" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            <h2 style={{ marginTop: 4 }}>{title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Închide"><LuX /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </>,
    document.body,
  );
}

export function Drawer({ onClose, head, children }) {
  useEscape(onClose);
  return createPortal(
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-head">
          {head}
          <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={onClose} aria-label="Închide"><LuX /></button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>,
    document.body,
  );
}

export function Empty({ icon, title, children }) {
  return (
    <div className="empty">
      {icon}
      <b>{title}</b>
      {children && <p>{children}</p>}
    </div>
  );
}

export function CheckButton({ on, disabled, onClick, label }) {
  return (
    <button type="button" className={`check ${on ? 'on' : ''}`} disabled={disabled} onClick={onClick} aria-pressed={on} aria-label={label}>
      <svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

export function ScoreText({ value }) {
  const cls = value >= 80 ? 'good' : value >= 55 ? 'mid' : 'bad';
  return <span className={`score ${cls}`}>{value}</span>;
}

/** Rută bazată pe hash (#panou, #proiect-p1 ...). */
export function useHashRoute() {
  const read = () => (window.location.hash.replace('#', '') || 'panou');
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const h = () => { setRoute(read()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  return route;
}
export const go = (r) => { window.location.hash = r; };
