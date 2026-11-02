// Mercury — quick logging sheets
import { useState } from "react";
import { useApp, Sheet, Seg, Stepper, NumInput, Toggle } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import { todayKey, addDays, fmtTime, num, uid, kcalOf, haptic } from "../lib/data.js";
import { CARDIO_KINDS } from "../screens/train.jsx";
import { MEASURES } from "../screens/body.jsx";

// ---------- Weight ----------
export function WeightSheet({ onClose }) {
  const { store, setStore, flash } = useApp();
  const unit = store.settings.unit;
  const last = store.weights[store.weights.length - 1];
  const [v, setV] = useState(String(last ? last.value : unit === "kg" ? 80 : 175));
  const bump = d => setV(x => String(Math.round((num(x) + d) * 10) / 10));
  const [date, setDate] = useState(todayKey());
  const save = () => {
    const val = num(v);
    if (!(val > 20 && val < 1000)) { flash("Enter a valid weight", { icon: "info" }); return; }
    const value = Math.round(val * 10) / 10;
    setStore(p => ({ ...p, weights: [...p.weights.filter(w => w.date !== date), { date, value }].sort((a, b) => a.date.localeCompare(b.date)) }));
    haptic(20);
    flash(`${value} ${unit} logged`, { icon: "scale" });
    onClose();
  };
  return (
    <Sheet onClose={onClose} title="Log weight" subtitle="Weigh in the morning, after the bathroom, before food."
      footer={<button className="btn primary lg block" onClick={save}>Save</button>}>
      <div className="row gap-16" style={{ justifyContent: "center", padding: "12px 0 20px" }}>
        <button className="icon-btn round" style={{ width: 52, height: 52 }} onClick={() => bump(-0.1)} aria-label="Less"><Icon name="minus" size={22} /></button>
        <div style={{ textAlign: "center" }}>
          <NumInput value={v} onChange={setV} className="big-num" style={{ fontSize: 64, width: 210, textAlign: "center" }} aria-label="Weight" />
          <div className="caption" style={{ fontWeight: 600 }}>{unit}</div>
        </div>
        <button className="icon-btn round" style={{ width: 52, height: 52 }} onClick={() => bump(0.1)} aria-label="More"><Icon name="plus" size={22} /></button>
      </div>
      <div className="row gap-8" style={{ justifyContent: "center", marginBottom: 18 }}>
        {[-1, -0.5, 0.5, 1].map(d => <button key={d} className="chip num" onClick={() => bump(d)}>{d > 0 ? "+" : ""}{d}</button>)}
      </div>
      <label className="field-label">Date</label>
      <input type="date" className="field" value={date} max={todayKey()} onChange={e => setDate(e.target.value || todayKey())} />
    </Sheet>
  );
}

// ---------- Meal ----------
export function MealSheet({ payload, onClose }) {
  const { store, setStore, flash, undoable } = useApp();
  const date = payload.date || todayKey();
  const [m, setM] = useState({ meal: "", p: "", c: "", f: "" });
  const [fav, setFav] = useState(false);
  const [manage, setManage] = useState(!!payload.manage);
  const k = kcalOf({ p: num(m.p), c: num(m.c), f: num(m.f) });
  const saved = store.savedMeals || [];

  const add = (meal) => setStore(p => ({ ...p, macros: { ...p.macros, [date]: [...(p.macros[date] || []), { ...meal, id: uid() }] } }));
  const save = () => {
    if (!num(m.p) && !num(m.c) && !num(m.f)) { flash("Enter at least one macro", { icon: "info" }); return; }
    const meal = { meal: m.meal.trim() || "Meal", p: num(m.p), c: num(m.c), f: num(m.f) };
    add(meal);
    if (fav) setStore(p => ({ ...p, savedMeals: [...(p.savedMeals || []), { ...meal, id: uid() }] }));
    haptic(15);
    flash(`${meal.meal} · ${kcalOf(meal)} kcal`, { icon: "fuel" });
    onClose();
  };

  return (
    <Sheet onClose={onClose} title={manage ? "Quick add" : "Add meal"} right={saved.length > 0 && <button className="btn sm ghost" onClick={() => setManage(x => !x)}>{manage ? "New meal" : "Manage"}</button>}
      footer={!manage && <button className="btn primary lg block" onClick={save}>Log meal · {k} kcal</button>}>
      {manage ? (
        <div className="list">
          {saved.map(s => (
            <div key={s.id} className="list-row">
              <div className="flex1"><div style={{ fontWeight: 650 }}>{s.meal}</div><div className="caption num">{kcalOf(s)} kcal · {s.p}P {s.c}C {s.f}F</div></div>
              <button className="icon-btn sm ghost" aria-label="Delete" onClick={() => undoable("Removed from Quick add", p => ({ ...p, savedMeals: p.savedMeals.filter(x => x.id !== s.id) }))}><Icon name="trash" size={16} /></button>
            </div>
          ))}
        </div>
      ) : (
        <>
          {saved.length > 0 && (
            <>
              <div className="label" style={{ marginBottom: 8 }}>Quick add</div>
              <div className="hscroll" style={{ marginBottom: 18 }}>
                {saved.map(s => (
                  <button key={s.id} className="chip" onClick={() => { add({ meal: s.meal, p: s.p, c: s.c, f: s.f }); flash(`Added ${s.meal}`, { icon: "plus" }); onClose(); }}>
                    <Icon name="plus" size={14} /> {s.meal} <span className="num muted">{kcalOf(s)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <label className="field-label">Name</label>
          <input className="field" placeholder="e.g. Chicken bowl" value={m.meal} onChange={e => setM(x => ({ ...x, meal: e.target.value }))} style={{ marginBottom: 14 }} />
          <div className="grid-3">
            {[["p", "Protein", "var(--protein)"], ["c", "Carbs", "var(--carbs)"], ["f", "Fat", "var(--fat)"]].map(([key, l, c]) => (
              <label key={key}>
                <span className="field-label row gap-6"><span className="dot" style={{ background: c, width: 7, height: 7 }} />{l} g</span>
                <NumInput className="field center" placeholder="0" value={m[key]} onChange={v => setM(x => ({ ...x, [key]: v }))} />
              </label>
            ))}
          </div>
          <div className="row between" style={{ marginTop: 16 }}>
            <span style={{ fontWeight: 600 }}>Save to Quick add</span>
            <Toggle on={fav} onChange={setFav} label="Save to Quick add" />
          </div>
        </>
      )}
    </Sheet>
  );
}

// ---------- Targets ----------
export function TargetsSheet({ onClose }) {
  const { store, setStore, flash } = useApp();
  const mt = store.macroTargets;
  const [t, setT] = useState({ p: String(mt.p), c: String(mt.c), f: String(mt.f) });
  const [goal, setGoal] = useState(null);
  const kcal = kcalOf({ p: num(t.p), c: num(t.c), f: num(t.f) });
  const suggest = (g) => {
    setGoal(g);
    const bw = store.weights.length ? store.weights[store.weights.length - 1].value : null;
    if (!bw) { flash("Log your weight first", { icon: "info" }); return; }
    const lb = store.settings.unit === "kg" ? bw * 2.2046 : bw;
    const k = Math.round(lb * (g === "cut" ? 12 : g === "bulk" ? 16 : 14.5));
    const p = Math.round(lb * (g === "cut" ? 1.1 : 0.9));
    const f = Math.round(lb * 0.35);
    setT({ p: String(p), c: String(Math.max(50, Math.round((k - p * 4 - f * 9) / 4))), f: String(f) });
  };
  const save = () => {
    setStore(p => ({ ...p, macroTargets: { p: parseInt(t.p) || mt.p, c: parseInt(t.c) || mt.c, f: parseInt(t.f) || mt.f } }));
    flash("Targets saved", { icon: "check" });
    onClose();
  };
  return (
    <Sheet onClose={onClose} title="Daily targets" subtitle="Set macros directly or start from a goal."
      footer={<button className="btn primary lg block" onClick={save}>Save · {kcal.toLocaleString()} kcal</button>}>
      <div className="label" style={{ marginBottom: 8 }}>Start from a goal</div>
      <Seg value={goal} onChange={suggest} options={[["cut", "Lose fat"], ["maintain", "Maintain"], ["bulk", "Build"]]} style={{ marginBottom: 20 }} />
      <div className="grid-3">
        {[["p", "Protein", "var(--protein)"], ["c", "Carbs", "var(--carbs)"], ["f", "Fat", "var(--fat)"]].map(([k, l, c]) => (
          <label key={k}>
            <span className="field-label row gap-6"><span className="dot" style={{ background: c, width: 7, height: 7 }} />{l} g</span>
            <NumInput className="field center" decimal={false} value={t[k]} onChange={v => setT(x => ({ ...x, [k]: v }))} />
          </label>
        ))}
      </div>
      <div className="caption" style={{ marginTop: 14, lineHeight: 1.5 }}>Protein 0.8–1g per lb of body weight supports muscle; fat ~0.3–0.4g/lb; carbs fill the rest.</div>
    </Sheet>
  );
}

// ---------- Sleep ----------
const Q = ["", "Poor", "Fair", "OK", "Good", "Great"];
export function SleepSheet({ onClose }) {
  const { store, setStore, flash } = useApp();
  const tk = todayKey();
  const cur = store.sleep.find(s => s.date === tk);
  const [h, setH] = useState(cur ? cur.hours : 7.5);
  const [q, setQ] = useState(cur ? cur.quality : 4);
  const save = () => {
    setStore(p => ({ ...p, sleep: [...p.sleep.filter(s => s.date !== tk), { date: tk, hours: h, quality: q }].sort((a, b) => a.date.localeCompare(b.date)) }));
    flash(`${h}h sleep logged`, { icon: "moon" });
    onClose();
  };
  return (
    <Sheet onClose={onClose} title="Last night" footer={<button className="btn primary lg block" onClick={save}>Save</button>}>
      <div style={{ textAlign: "center", padding: "6px 0 18px" }}>
        <div className="big-num" style={{ fontSize: 64 }}>{h}<span className="caption" style={{ fontSize: 18 }}> h</span></div>
        <input type="range" min="3" max="12" step="0.25" value={h} onChange={e => setH(parseFloat(e.target.value))} style={{ width: "100%", marginTop: 12, accentColor: "var(--accent)" }} aria-label="Hours" />
      </div>
      <div className="label" style={{ marginBottom: 8 }}>Quality</div>
      <Seg value={q} onChange={setQ} options={[1, 2, 3, 4, 5].map(i => [i, Q[i]])} />
    </Sheet>
  );
}

// ---------- Measurements ----------
export function MeasureSheet({ onClose }) {
  const { store, setStore, flash } = useApp();
  const len = store.settings.unit === "kg" ? "cm" : "in";
  const last = (store.measurements || []).slice(-1)[0] || {};
  const [v, setV] = useState({});
  const save = () => {
    const e = { date: todayKey() };
    let any = false;
    MEASURES.forEach(([k]) => { const x = parseFloat(v[k]); if (x > 0) { e[k] = x; any = true; } });
    if (!any) { flash("Enter at least one value", { icon: "info" }); return; }
    setStore(p => ({ ...p, measurements: [...(p.measurements || []).filter(m => m.date !== e.date), e].sort((a, b) => a.date.localeCompare(b.date)) }));
    flash("Measurements saved", { icon: "ruler" });
    onClose();
  };
  return (
    <Sheet onClose={onClose} title="Measurements" subtitle="Morning, relaxed, tape level. Waist at the navel."
      footer={<button className="btn primary lg block" onClick={save}>Save</button>}>
      <div className="grid-2">
        {MEASURES.map(([k, l]) => (
          <label key={k}>
            <span className="field-label">{l} · {k === "bf" ? "%" : len}</span>
            <NumInput className="field center" placeholder={last[k] ? String(last[k]) : "—"} value={v[k] || ""} onChange={val => setV(x => ({ ...x, [k]: val }))} />
          </label>
        ))}
      </div>
    </Sheet>
  );
}

// ---------- Cardio ----------
export function CardioSheet({ onClose }) {
  const { store, setStore, flash } = useApp();
  const dist = store.settings.unit === "kg" ? "km" : "mi";
  const [kind, setKind] = useState("run");
  const [min, setMin] = useState("");
  const [d, setD] = useState("");
  const [hr, setHr] = useState("");
  const [date, setDate] = useState(todayKey());
  const [note, setNote] = useState("");
  const pace = num(d) && num(min) ? num(min) / num(d) : null;
  const save = () => {
    if (!num(min)) { flash("Enter minutes", { icon: "info" }); return; }
    setStore(p => ({ ...p, cardio: [...(p.cardio || []), { id: uid(), date, kind, minutes: num(min), distance: num(d), avgHR: parseInt(hr) || 0, note: note.trim() }] }));
    flash(`${num(min)} min logged`, { icon: "heart" });
    onClose();
  };
  return (
    <Sheet onClose={onClose} title="Log cardio" footer={<button className="btn primary lg block" onClick={save}>Save session</button>}>
      <div className="grid-3" style={{ gap: 8, marginBottom: 18 }}>
        {CARDIO_KINDS.map(k => (
          <button key={k.id} onClick={() => setKind(k.id)} className="tap"
            style={{ height: 68, borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, fontWeight: 600,
              background: kind === k.id ? "var(--accent)" : "var(--card-2)", color: kind === k.id ? "var(--on-accent)" : "var(--t2)" }}>
            <Icon name={k.icon} size={20} />{k.label}
          </button>
        ))}
      </div>
      <div className="grid-3" style={{ marginBottom: 12 }}>
        <label><span className="field-label">Minutes</span><NumInput className="field center" value={min} onChange={setMin} /></label>
        <label><span className="field-label">Distance · {dist}</span><NumInput className="field center" value={d} onChange={setD} /></label>
        <label><span className="field-label">Avg HR</span><NumInput className="field center" decimal={false} value={hr} onChange={setHr} /></label>
      </div>
      {pace && <div className="pill accent num" style={{ marginBottom: 12 }}>Pace {fmtTime(pace * 60)} / {dist}</div>}
      <div className="grid-2">
        <label><span className="field-label">Date</span><input type="date" className="field" value={date} max={todayKey()} onChange={e => setDate(e.target.value || todayKey())} /></label>
        <label><span className="field-label">Note</span><input className="field" placeholder="Zone 2…" value={note} onChange={e => setNote(e.target.value)} /></label>
      </div>
    </Sheet>
  );
}

// ---------- Rest day ----------
export function RestDaySheet({ onClose }) {
  const { store, setStore, flash } = useApp();
  const tk = todayKey();
  const cur = (store.restDays || {})[tk];
  const kinds = [
    { id: "rest", icon: "walk", label: "Active recovery", sub: "Walk, mobility, easy cardio" },
    { id: "deload", icon: "rest", label: "Deload", sub: "Planned easy week" },
    { id: "sick", icon: "heart", label: "Sick", sub: "Listening to your body" },
    { id: "travel", icon: "calendar", label: "Travel", sub: "Out of routine" },
  ];
  const log = id => { setStore(p => ({ ...p, restDays: { ...(p.restDays || {}), [tk]: id } })); flash("Rest day logged · streak safe", { icon: "check" }); onClose(); };
  const clear = () => { setStore(p => { const r = { ...(p.restDays || {}) }; delete r[tk]; return { ...p, restDays: r }; }); flash("Rest day cleared"); onClose(); };
  return (
    <Sheet onClose={onClose} title="Rest day" subtitle="Planned rest keeps your streak going.">
      <div className="list">
        {kinds.map(k => (
          <button key={k.id} className="list-row tap" onClick={() => log(k.id)}>
            <span className="row-icon" style={cur === k.id ? { background: "var(--accent)", color: "var(--on-accent)" } : undefined}><Icon name={k.icon} size={18} /></span>
            <div className="flex1" style={{ textAlign: "left" }}><div style={{ fontWeight: 650 }}>{k.label}</div><div className="caption">{k.sub}</div></div>
            {cur === k.id && <Icon name="check" size={18} stroke={2.4} style={{ color: "var(--accent-ink)" }} />}
          </button>
        ))}
      </div>
      {cur && <button className="btn ghost block" style={{ marginTop: 10 }} onClick={clear}>Clear today's rest</button>}
    </Sheet>
  );
}

// ---------- Timer ----------
export function TimerSheet({ onClose }) {
  const { store, startRest } = useApp();
  return (
    <Sheet onClose={onClose} title="Rest timer" subtitle="Starts automatically when you tick a set.">
      <div className="grid-3" style={{ gap: 8 }}>
        {[45, 60, 90, 120, 150, 180, 240, 300, 420].map(s => (
          <button key={s} className={"btn lg num" + (s === store.settings.restDefault ? " primary" : "")} onClick={() => { startRest(s); onClose(); }}>{fmtTime(s)}</button>
        ))}
      </div>
    </Sheet>
  );
}
