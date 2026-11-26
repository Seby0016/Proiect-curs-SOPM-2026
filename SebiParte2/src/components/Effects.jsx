// Responsabil: Iordache Sebastian
// Efecte vizuale globale: toast-uri, confetti, puncte câștigate, alerte de abatere/concediere/nivel.
import { useCallback, useEffect, useRef, useState } from 'react';
import { LuTriangleAlert, LuCircleCheck, LuUserX, LuRadio, LuZap, LuFlame, LuCrown, LuRotateCcw } from 'react-icons/lu';
import { getSessionId, logout, useFx, subordinatesOf } from '../store/store.js';

let toastSeq = 0;

/** Confetti pe canvas (fără biblioteci). */
function useConfetti() {
  const canvasRef = useRef(null);
  const parts = useRef([]);
  const raf = useRef(0);
  const loop = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== innerWidth * dpr) { c.width = innerWidth * dpr; c.height = innerHeight * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts.current = parts.current.filter((p) => p.life > 0);
    for (const p of parts.current) {
      p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life / 30);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 0) ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
      else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.s / 2.4, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.beginPath(); ctx.moveTo(0, -p.s / 2); ctx.lineTo(p.s / 2, p.s / 2); ctx.lineTo(-p.s / 2, p.s / 2); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    if (parts.current.length) raf.current = requestAnimationFrame(loop);
    else ctx.clearRect(0, 0, innerWidth, innerHeight);
  }, []);
  const burst = useCallback((x, y, n = 90, spread = 1) => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const colors = ['#2f5bff', 'var(--accent-2)', 'var(--completed)', 'var(--warn)', 'var(--overdue)', '#c39bff'];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1 * spread;
      const v = 6 + Math.random() * 9;
      parts.current.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, s: 7 + Math.random() * 7, color: colors[i % colors.length], life: 90 + Math.random() * 50, shape: i % 3 });
    }
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(loop);
  }, [loop]);
  return { canvasRef, burst };
}

export default function Effects({ state, onFlash }) {
  const [toasts, setToasts] = useState([]);
  const [floats, setFloats] = useState([]);
  const [alert, setAlert] = useState(null);
  const [vignette, setVignette] = useState(0);
  const { canvasRef, burst } = useConfetti();
  const lastSync = useRef(0);

  const toast = useCallback((t) => {
    const id = ++toastSeq;
    const ttl = t.ttl ?? 4200;
    setToasts((x) => [...x.slice(-3), { ...t, id, ttl }]);
    setTimeout(() => setToasts((x) => x.map((y) => (y.id === id ? { ...y, out: true } : y))), ttl);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), ttl + 320);
  }, []);

  const handler = useCallback((fx) => {
    const me = getSessionId();
    const name = (id) => fx.state?.users.find((u) => u.id === id)?.name ?? '';
    const mine = (id) => id === me || subordinatesOf(id, me);

    if (fx.type === 'completed') {
      const o = fx.origin ?? { x: innerWidth / 2, y: innerHeight / 2 };
      burst(o.x, o.y, fx.task?.priority === 'critical' ? 140 : 80);
      if (fx.pp) {
        const id = ++toastSeq;
        setFloats((f) => [...f, { id, x: o.x, y: o.y, pp: fx.pp }]);
        setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1500);
        toast({ kind: 'completed', icon: <LuCircleCheck />, title: 'Activitate validată', text: `${fx.who} ${fx.who?.includes(',') ? 'primesc' : 'primește'} +${fx.pp} puncte de performanță.`, ttl: 3200 });
      }
    }
    if (fx.type === 'submitted') {
      toast({ kind: 'sync', icon: <LuCircleCheck />, title: 'Trimisă spre validare', text: `Așteaptă decizia lui ${fx.validator || 'superiorului'}. Cât e la validare, nu devine restantă.`, ttl: 3600 });
    }

    if (fx.type === 'events') {
      const meFired = fx.events.some((e) => e.type === 'fired' && e.userId === me);
      for (const e of fx.events) {
        if (e.type === 'overdue' && mine(e.userId)) {
          toast({ kind: 'overdue', icon: <LuTriangleAlert />, title: e.userId === me ? 'Activitate restantă' : `Restanță: ${name(e.userId)}`, text: `„${e.title}” a depășit termenul limită.` });
        }
        if (e.type === 'abatere') {
          if (e.userId === me && meFired) {
            setVignette((v) => v + 1);
          } else if (e.userId === me) {
            setVignette((v) => v + 1);
            document.querySelector('.main')?.classList.remove('shake');
            requestAnimationFrame(() => document.querySelector('.main')?.classList.add('shake'));
            setTimeout(() => setAlert({ kind: 'abatere', n: e.n }), 450);
          } else if (mine(e.userId) && e.n < 3) {
            toast({ kind: 'abatere', icon: <LuFlame />, title: `Abatere ${e.n}/3: ${name(e.userId)}`, text: '3 activități restante. Au fost atribuite 2 activități de penalizare.', ttl: 6000 });
          }
        }
        if (e.type === 'fired') {
          if (e.userId === me) setAlert({ kind: 'fired', name: name(e.userId) });
          else toast({ kind: 'overdue', icon: <LuUserX />, title: 'Cont dezactivat', text: `${name(e.userId)} a fost concediat automat la a 3-a abatere.`, ttl: 7000 });
        }
      }
    }

    if (fx.type === 'remote') {
      onFlash?.(fx.changed);
      if (Date.now() - lastSync.current > 6000) {
        lastSync.current = Date.now();
        toast({ kind: 'sync', icon: <LuRadio />, title: 'Sincronizat în timp real', text: 'Modificări primite de la alt dispozitiv/tab.', ttl: 2600 });
      }
    }
    if (fx.type === 'reset') toast({ kind: 'completed', icon: <LuRotateCcw />, title: 'Date demo resetate', text: 'Toate conturile și activitățile au revenit la starea inițială.' });
    if (fx.type === 'toast') toast(fx);
  }, [burst, toast, onFlash]);
  useFx(handler);

  useEffect(() => {
    if (alert?.kind === 'level') burst(innerWidth / 2, innerHeight / 2 + 60, 160, 2);
  }, [alert, burst]);

  return (
    <>
      <canvas ref={canvasRef} className="confetti-canvas" style={{ width: '100vw', height: '100vh' }} aria-hidden="true" />
      {floats.map((f) => <div key={f.id} className="xp-float" style={{ left: f.x, top: f.y - 10 }}>+{f.pp} PP</div>)}
      {vignette > 0 && <div key={vignette} className="alarm-vignette" />}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind} ${t.out ? 'out' : ''}`}>
            <span className="ic">{t.icon ?? <LuCircleCheck />}</span>
            <div><b>{t.title}</b>{t.text && <p>{t.text}</p>}</div>
            <span className="bar" style={{ animationDuration: `${t.ttl}ms` }} />
          </div>
        ))}
      </div>

      {alert?.kind === 'abatere' && (
        <div className="big-alert warn" role="alertdialog" aria-label="Abatere înregistrată">
          <div className="box">
            <div className="emblem"><LuTriangleAlert /></div>
            <div className="eyebrow" style={{ color: 'var(--warn)' }}>Regula de abateri</div>
            <h2 style={{ fontSize: 26, marginTop: 6 }}>Abatere {alert.n} din 3</h2>
            <div className="dots">{[1, 2, 3].map((i) => <i key={i} className={i <= alert.n ? 'on' : ''} style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
            <p>Ai acumulat 3 activități restante. Ți-au fost atribuite automat <b style={{ color: 'var(--ink)' }}>2 activități de penalizare</b> pentru săptămâna curentă.
              {alert.n === 2 && <> La a 3-a abatere contul se dezactivează.</>}</p>
            <button className="btn primary" style={{ marginTop: 22, width: '100%' }} onClick={() => setAlert(null)}>Am înțeles</button>
          </div>
        </div>
      )}
      {alert?.kind === 'fired' && (
        <div className="big-alert" role="alertdialog" aria-label="Cont dezactivat">
          <div className="box">
            <div className="stamp">Concediat</div>
            <h2 style={{ fontSize: 24 }}>Contul tău a fost dezactivat</h2>
            <p>A 3-a abatere a fost înregistrată. Conform regulii de business, contul lui {alert.name} este marcat ca concediat în baza de date și nu mai poate fi folosit.</p>
            <button className="btn" style={{ marginTop: 22, width: '100%' }} onClick={() => { setAlert(null); logout(); }}>Înapoi la autentificare</button>
          </div>
        </div>
      )}
      {alert?.kind === 'level' && (
        <div className="big-alert level" role="alertdialog" aria-label="Nivel nou" onClick={() => setAlert(null)}>
          <div className="box">
            <div className="emblem"><LuCrown /></div>
            <div className="eyebrow" style={{ color: 'var(--accent-2)' }}>Nivel nou</div>
            <h2 style={{ fontSize: 30, marginTop: 6 }}>Nivelul {alert.level.level}</h2>
            <p>Acum ești <b style={{ color: 'var(--ink)' }}>{alert.level.title}</b>. Mai ai {alert.level.toNext} XP până la următorul nivel.</p>
            <button className="btn primary" style={{ marginTop: 22, width: '100%' }} onClick={() => setAlert(null)}><LuZap /> Continuă</button>
          </div>
        </div>
      )}
    </>
  );
}
