// Mercury — UI kit
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useId } from "react";
import { Icon } from "./icons.jsx";
import { fmtDate, cleanNum } from "../lib/data.js";

export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

// ---------- Sheet ----------
export function Sheet({ onClose, title, subtitle, eyebrow, right, children, footer, tall, bodyStyle }) {
  useEffect(() => {
    const k = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  // Drag-to-dismiss on the grabber/header
  const ref = useRef(null);
  const drag = useRef(null);
  const onDown = e => {
    // Let buttons/inputs in the header receive their own taps
    if (e.target.closest("button, input, a, select, textarea, [role=button]")) return;
    drag.current = { y: e.clientY, dy: 0 };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = e => {
    if (!drag.current) return;
    const dy = Math.max(0, e.clientY - drag.current.y);
    drag.current.dy = dy;
    if (ref.current) { ref.current.style.transform = `translateY(${dy}px)`; ref.current.style.transition = "none"; }
  };
  const onUp = () => {
    if (!drag.current) return;
    const dy = drag.current.dy;
    drag.current = null;
    if (!ref.current) return;
    ref.current.style.transition = "transform 0.3s cubic-bezier(0.22,1,0.36,1)";
    if (dy > 110) { ref.current.style.transform = "translateY(100%)"; setTimeout(onClose, 220); }
    else ref.current.style.transform = "";
  };
  return (
    <div className="backdrop" onClick={onClose}>
      <div ref={ref} className={"sheet" + (tall ? " tall" : "")} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{ touchAction: "none", cursor: "grab" }}>
          <div className="grabber" />
          {(title || eyebrow) && (
            <div className="sheet-head">
              <div className="flex1">
                {eyebrow && <div className="label" style={{ marginBottom: 4 }}>{eyebrow}</div>}
                {title && <div className="h-title">{title}</div>}
                {subtitle && <div className="caption" style={{ marginTop: 4 }}>{subtitle}</div>}
              </div>
              {right}
              <button className="icon-btn sm round" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
            </div>
          )}
        </div>
        <div className="sheet-body" style={bodyStyle}>{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Segmented control with sliding thumb ----------
export function Seg({ value, onChange, options, style, small }) {
  const wrap = useRef(null);
  const [thumb, setThumb] = useState(null);
  const idx = options.findIndex(o => o[0] === value);
  useLayoutEffect(() => {
    const measure = () => {
      const el = wrap.current && wrap.current.querySelectorAll("button")[idx];
      setThumb(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [idx, options.length]);
  return (
    <div className="seg" ref={wrap} style={style} role="tablist">
      {thumb && <div className="thumb" style={{ left: thumb.left, width: thumb.width }} />}
      {options.map(([k, l]) => (
        <button key={String(k)} role="tab" aria-selected={value === k} className={value === k ? "on" : ""} onClick={() => onChange(k)} style={small ? { height: 30, fontSize: 12 } : undefined}>{l}</button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      style={{ width: 51, height: 31, borderRadius: 99, background: on ? "var(--accent)" : "var(--card-3)", position: "relative", transition: "background 0.25s", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 2, left: on ? 22 : 2, width: 27, height: 27, borderRadius: 99, background: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,0.25)", transition: "left 0.25s cubic-bezier(0.22,1,0.36,1)" }} />
    </button>
  );
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 999, format }) {
  return (
    <div className="row gap-6" style={{ background: "var(--card-2)", borderRadius: 12, padding: 3 }}>
      <button className="icon-btn sm" style={{ background: "var(--card)" }} onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} aria-label="Decrease"><Icon name="minus" size={14} /></button>
      <span className="num" style={{ minWidth: 48, textAlign: "center", fontSize: 14.5, fontWeight: 650 }}>{format ? format(value) : value}</span>
      <button className="icon-btn sm" style={{ background: "var(--card)" }} onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))} aria-label="Increase"><Icon name="plus" size={14} /></button>
    </div>
  );
}

// ---------- Rings ----------
export function Ring({ pct, size = 64, stroke = 7, color = "var(--accent)", track = "var(--card-3)", children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct || 0));
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)" }} />
      </svg>
      {children && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>{children}</div>}
    </div>
  );
}

// Concentric activity rings
export function MultiRing({ rings, size = 132, stroke = 13, gap = 3 }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {rings.map((rg, i) => {
        const s = size - i * 2 * (stroke + gap);
        return (
          <div key={i} style={{ position: "absolute", left: (size - s) / 2, top: (size - s) / 2 }}>
            <Ring pct={rg.pct} size={s} stroke={stroke} color={rg.color} track={`color-mix(in srgb, ${rg.color} 16%, transparent)`} />
          </div>
        );
      })}
    </div>
  );
}

// ---------- Charts ----------
export function AreaChart({ data, trend, height = 120, color = "var(--accent)", showDots = false }) {
  const id = useId().replace(/:/g, "");
  if (!data || data.length < 2) return null;
  const all = data.map(d => d.value).concat(trend ? trend.map(t => t.value) : []);
  let min = Math.min(...all), max = Math.max(...all);
  const pad = (max - min) * 0.15 || 1;
  min -= pad; max += pad;
  const W = 340, H = height;
  const xy = arr => arr.map((d, i) => [(i / (arr.length - 1)) * W, H - ((d.value - min) / (max - min)) * H]);
  const smooth = pts => pts.reduce((acc, p, i, a) => {
    if (!i) return `M${p[0]},${p[1]}`;
    const prev = a[i - 1];
    const cx = (prev[0] + p[0]) / 2;
    return acc + ` C${cx},${prev[1]} ${cx},${p[1]} ${p[0]},${p[1]}`;
  }, "");
  const main = trend || data;
  const mp = xy(main);
  const line = smooth(mp);
  const raw = trend ? xy(data) : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${W},${H} L0,${H} Z`} fill={`url(#${id})`} />
      {raw && raw.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="1.8" fill="var(--t3)" vectorEffect="non-scaling-stroke" />)}
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {showDots && mp.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={color} />)}
    </svg>
  );
}

export function LineChart({ points, height = 160, suffix = "" }) {
  const [hover, setHover] = useState(null);
  if (!points || points.length < 2) return <Empty icon="chart" title="Not enough data">Log this lift twice to see a trend.</Empty>;
  const W = 340, H = height, T = 14, B = 22, L = 4, R = 4;
  const vals = points.map(p => p.value);
  let min = Math.min(...vals), max = Math.max(...vals);
  const pad = (max - min) * 0.2 || 2;
  min -= pad; max += pad;
  const x = i => L + (i / (points.length - 1)) * (W - L - R);
  const y = v => T + (H - T - B) * (1 - (v - min) / (max - min));
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const sel = hover !== null ? points[hover] : points[points.length - 1];
  const si = hover !== null ? hover : points.length - 1;
  const onMove = e => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };
  return (
    <div>
      <div className="row between" style={{ marginBottom: 8 }}>
        <div>
          <span className="big-num" style={{ fontSize: 28 }}>{sel.value}</span>
          <span className="caption" style={{ marginLeft: 6 }}>{suffix}</span>
        </div>
        <span className="caption num">{fmtDate(sel.date, { month: "short", day: "numeric", year: "2-digit" })}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", touchAction: "pan-y" }}
        onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        {[0.25, 0.5, 0.75].map(f => <line key={f} x1={0} x2={W} y1={T + (H - T - B) * f} y2={T + (H - T - B) * f} stroke="var(--line)" />)}
        <path d={`${d} L${x(points.length - 1)},${H - B} L${x(0)},${H - B} Z`} fill="var(--accent-soft)" />
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <line x1={x(si)} x2={x(si)} y1={T - 6} y2={H - B} stroke="var(--t4)" strokeDasharray="3 3" />
        <circle cx={x(si)} cy={y(sel.value)} r="5" fill="var(--accent)" stroke="var(--card)" strokeWidth="2.5" />
        <text x={L} y={H - 4} fontSize="10" fill="var(--t3)" fontFamily="Inter, sans-serif">{fmtDate(points[0].date)}</text>
        <text x={W - R} y={H - 4} fontSize="10" fill="var(--t3)" textAnchor="end" fontFamily="Inter, sans-serif">{fmtDate(points[points.length - 1].date)}</text>
      </svg>
    </div>
  );
}

export function Bars({ data, height = 120, goal, format = v => v, highlightLast = true, onSelect, selected }) {
  const max = Math.max(goal || 0, ...data.map(d => d.value), 1);
  return (
    <div style={{ position: "relative" }}>
      {goal ? <div style={{ position: "absolute", left: 0, right: 0, bottom: 20 + (goal / max) * (height - 38), borderTop: "1.5px dashed var(--t4)" }} /> : null}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height }}>
        {data.map((d, i) => {
          const on = selected !== undefined ? selected === i : highlightLast && i === data.length - 1;
          const Tag = onSelect ? "button" : "div";
          return (
            <Tag key={i} onClick={onSelect ? () => onSelect(i) : undefined} aria-label={onSelect ? `${d.label}: ${d.value}` : undefined}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0, height: "100%", justifyContent: "flex-end", cursor: onSelect ? "pointer" : "default" }}>
              {d.top !== undefined && <span className="num" style={{ fontSize: 10, fontWeight: 650, color: on ? "var(--accent-ink)" : "var(--t3)" }}>{d.top}</span>}
              <div style={{ width: "100%", maxWidth: 30, height: Math.max(4, (d.value / max) * (height - 38)), borderRadius: 7, background: on ? "var(--accent)" : "var(--card-3)", transition: "height 0.6s cubic-bezier(0.22,1,0.36,1)" }} />
              <span style={{ fontSize: 10.5, fontWeight: 600, color: on ? "var(--t1)" : "var(--t3)" }}>{d.label}</span>
            </Tag>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Small pieces ----------
export function Empty({ icon = "sparkle", title, children, action }) {
  return (
    <div className="empty">
      <div className="empty-ic"><Icon name={icon} size={22} /></div>
      {title && <div className="empty-title">{title}</div>}
      <div>{children}</div>
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

export function Section({ title, children, style }) {
  return (
    <div className="section" style={style}>
      <h3>{title}</h3>
      <div className="row gap-12">{children}</div>
    </div>
  );
}

export function Stat({ label, value, unit, sub, color, big }) {
  return (
    <div className="card pad flat" style={{ padding: 16 }}>
      <div className="label">{label}</div>
      <div className="row" style={{ alignItems: "baseline", gap: 4, marginTop: 8 }}>
        <span className="big-num" style={{ fontSize: big ? 34 : 26, color: color || "var(--t1)" }}>{value}</span>
        {unit && <span className="caption" style={{ fontWeight: 600 }}>{unit}</span>}
      </div>
      {sub && <div className="caption" style={{ marginTop: 6, fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

export function ScreenHeader({ title, subtitle, right }) {
  return (
    <div className="row between rise" style={{ alignItems: "flex-end", marginBottom: 18, gap: 12 }}>
      <div className="flex1">
        {subtitle && <div className="caption" style={{ fontWeight: 600, marginBottom: 2 }}>{subtitle}</div>}
        <div className="h-display">{title}</div>
      </div>
      {right && <div className="row gap-8">{right}</div>}
    </div>
  );
}

export function Toast({ toast, onAction }) {
  if (!toast) return null;
  return (
    <div className="toast" role="status" key={toast.id}>
      <span className="toast-ic"><Icon name={toast.icon || "check"} size={13} stroke={2.6} /></span>
      <span className="flex1">{toast.msg}</span>
      {toast.action && <button onClick={onAction}>{toast.action}</button>}
    </div>
  );
}

export function Confetti({ show }) {
  const bits = useMemo(() => Array.from({ length: 48 }).map(() => ({
    left: Math.random() * 100, size: 5 + Math.random() * 7, round: Math.random() > 0.5,
    dur: 1.6 + Math.random() * 1.6, delay: Math.random() * 0.35, hue: Math.floor(Math.random() * 4),
  })), [show]);
  if (!show) return null;
  const colors = ["var(--accent)", "var(--t1)", "var(--protein)", "var(--carbs)"];
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 250, overflow: "hidden" }}>
      {bits.map((b, i) => (
        <div key={i} className="confetti-dot" style={{
          left: b.left + "%", top: -20, background: colors[b.hue], width: b.size, height: b.size * (b.round ? 1 : 0.5),
          borderRadius: b.round ? "50%" : 2, animation: `confettiFall ${b.dur}s cubic-bezier(0.2,0.6,0.4,1) ${b.delay}s forwards`,
        }} />
      ))}
    </div>
  );
}

export function SearchField({ value, onChange, placeholder, autoFocus }) {
  return (
    <div style={{ position: "relative" }}>
      <span style={{ position: "absolute", left: 14, top: 14, color: "var(--t3)" }}><Icon name="search" size={18} /></span>
      <input className="field" style={{ paddingLeft: 42 }} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} autoFocus={autoFocus} />
    </div>
  );
}

// Numeric field that accepts "," or "." and never rejects input on French keyboards
export function NumInput({ value, onChange, decimal = true, ...rest }) {
  return (
    <input type="text" inputMode={decimal ? "decimal" : "numeric"} autoComplete="off" enterKeyHint="done"
      value={value ?? ""} onChange={e => onChange(cleanNum(e.target.value, decimal))} {...rest} />
  );
}

// In-app confirm / prompt dialog (replaces window.confirm / window.prompt)
export function Dialog({ dialog, onDone }) {
  const [val, setVal] = useState(dialog.input ? (dialog.input.value || "") : "");
  const inputRef = useRef(null);
  useEffect(() => {
    if (dialog.input) setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 60);
    const k = e => { if (e.key === "Escape") onDone(dialog.input ? null : false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  const ok = () => onDone(dialog.input ? (val.trim() || null) : true);
  return (
    <div className="backdrop" style={{ zIndex: 400, justifyContent: "center", alignItems: "center", padding: 24 }} onClick={() => onDone(dialog.input ? null : false)}>
      <div className="card" role="alertdialog" aria-modal="true" onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 340, padding: 22, background: "var(--bg-elev)", borderRadius: 26, boxShadow: "var(--shadow-lg)", animation: "pop 0.3s var(--ease)" }}>
        {dialog.icon && <div className="row-icon" style={{ marginBottom: 14, background: dialog.danger ? "rgba(255,69,58,0.14)" : "var(--accent-soft)", color: dialog.danger ? "var(--bad)" : "var(--accent-ink)" }}><Icon name={dialog.icon} size={19} /></div>}
        <div className="h-title" style={{ fontSize: 20 }}>{dialog.title}</div>
        {dialog.message && <div className="caption" style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>{dialog.message}</div>}
        {dialog.input && (
          <input ref={inputRef} className="field" style={{ marginTop: 16 }} value={val} placeholder={dialog.input.placeholder || ""}
            onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && ok()} maxLength={40} />
        )}
        <div className="stack gap-8" style={{ marginTop: 20 }}>
          <button className={"btn lg block " + (dialog.danger ? "danger" : "primary")} onClick={ok}>{dialog.confirm || "OK"}</button>
          {dialog.alt && <button className="btn lg block" onClick={() => onDone("alt")}>{dialog.alt}</button>}
          <button className="btn lg block ghost" onClick={() => onDone(dialog.input ? null : false)}>{dialog.cancel || "Cancel"}</button>
        </div>
      </div>
    </div>
  );
}
