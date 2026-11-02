// Mercury — programs: active split, saved programs, library, builder
import { useState } from "react";
import { useApp, Sheet, Seg, Empty, Stat, NumInput } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import { MARKET_PROGRAMS } from "../lib/programs.js";
import { todayKey, fmtDate, dayKeys, programToWo, withIds, normMuscles, EXERCISE_LIBRARY, MUSCLES, MUSCLE_LABEL } from "../lib/data.js";

export function ProgramsSheet({ payload, onClose }) {
  const { store, setStore, flash, undoable, open, setTab, ask } = useApp();
  const [tab, setTabL] = useState(payload.tab || "mine");
  const [focus, setFocus] = useState(null);
  const keys = dayKeys(store.wo);

  const activate = async (name, days) => {
    if (!(await ask({ title: `Start ${name}?`, message: "Your history and records stay. Train will show this program's days.", confirm: "Start program", icon: "book" }))) return;
    undoable(`Now running ${name}`, p => ({ ...p, wo: programToWo(days), activeProgram: name, activeSession: null }));
    onClose(); setTab("train");
  };
  const saveCurrent = async () => {
    const name = await ask({ title: "Save program", message: "Keep this split so you can switch back anytime.", input: { value: store.activeProgram || "My program" }, confirm: "Save", icon: "download" });
    if (!name) return;
    setStore(p => ({ ...p, programs: [...p.programs.filter(x => x.name !== name.trim()), { name: name.trim(), days: keys.map(k => ({ label: p.wo[k].label, exercises: JSON.parse(JSON.stringify(p.wo[k].exercises)) })), created: todayKey() }] }));
    flash("Program saved", { icon: "check" });
  };

  if (focus) {
    return (
      <Sheet onClose={onClose} tall eyebrow={focus.author} title={focus.name}
        right={<button className="btn sm ghost" onClick={() => setFocus(null)}><Icon name="chev-l" size={15} /> Library</button>}
        footer={<><button className="btn lg" onClick={() => { setStore(p => ({ ...p, programs: [...p.programs, { name: focus.name, days: JSON.parse(JSON.stringify(focus.schedule)), created: todayKey() }] })); flash("Saved to My programs", { icon: "check" }); }}>Save copy</button>
          <button className="btn primary lg flex1" onClick={() => activate(focus.name, focus.schedule)}>Start program</button></>}>
        <ProgramDetail prog={focus} />
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose} tall title="Programs">
      <Seg value={tab} onChange={setTabL} options={[["mine", "My programs"], ["library", "Library"]]} style={{ marginBottom: 16 }} />
      {tab === "mine" ? (
        <>
          <div className="card hero" style={{ padding: 18, marginBottom: 14 }}>
            <div className="row gap-8" style={{ marginBottom: 6 }}><span className="live" /><span className="label" style={{ color: "var(--accent-ink)" }}>Active</span></div>
            <div className="h-title">{store.activeProgram || "Custom split"}</div>
            <div className="row gap-6" style={{ flexWrap: "wrap", margin: "12px 0 16px" }}>
              {keys.map((k, i) => <span key={k} className="pill"><span className="num muted">{i + 1}</span> {store.wo[k].label}</span>)}
            </div>
            <div className="row gap-8">
              <button className="btn flex1" onClick={() => { onClose(); open("builder", { fromCurrent: true }); }}><Icon name="edit" size={16} /> Edit split</button>
              <button className="btn flex1" onClick={saveCurrent}><Icon name="download" size={16} /> Save</button>
            </div>
          </div>
          <button className="btn primary lg block" style={{ marginBottom: 18 }} onClick={() => { onClose(); open("builder", {}); }}><Icon name="plus" size={18} stroke={2.2} /> Build a new program</button>
          <div className="label" style={{ margin: "0 2px 8px" }}>Saved</div>
          {store.programs.length === 0 ? <div className="card"><Empty icon="book" title="Nothing saved yet">Save your split or a library program to switch between them anytime.</Empty></div> : (
            <div className="list">
              {store.programs.map((p, i) => {
                const n = p.days.reduce((a, d) => a + d.exercises.length, 0);
                return (
                  <div key={i} className="list-row">
                    <div className="flex1">
                      <div className="row gap-8"><span style={{ fontWeight: 650 }}>{p.name}</span>{p.name === store.activeProgram && <span className="pill accent">Active</span>}</div>
                      <div className="caption num">{p.days.length} days · {n} exercises · {fmtDate(p.created)}</div>
                    </div>
                    <button className="icon-btn sm" onClick={() => { onClose(); open("builder", { program: p, index: i }); }} aria-label="Edit"><Icon name="edit" size={15} /></button>
                    <button className="btn sm primary" onClick={() => activate(p.name, p.days)}>Load</button>
                    <button className="icon-btn sm ghost" onClick={() => undoable(`Deleted ${p.name}`, s => ({ ...s, programs: s.programs.filter((_, j) => j !== i) }))} aria-label="Delete"><Icon name="trash" size={15} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="stack gap-10">
          {MARKET_PROGRAMS.map(p => (
            <button key={p.id} className="card tap" style={{ padding: 18, textAlign: "left", position: "relative", overflow: "hidden" }} onClick={() => setFocus(p)}>
              <div style={{ position: "absolute", right: -40, top: -40, width: 140, height: 140, borderRadius: 99, background: p.accent, opacity: 0.16, filter: "blur(10px)" }} />
              <div className="row between" style={{ marginBottom: 8 }}>
                <span className="pill" style={{ background: `color-mix(in srgb, ${p.accent} 18%, transparent)`, color: p.accent }}>{p.level}</span>
                <span className="caption num">{p.days} days · {p.weeks} wks</span>
              </div>
              <div className="h-card" style={{ fontSize: 18 }}>{p.name}</div>
              <div className="caption" style={{ marginTop: 4, lineHeight: 1.45 }}>{p.tagline}</div>
              <div className="caption muted" style={{ marginTop: 8, fontSize: 12 }}>{p.author} · {p.focus}</div>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

function ProgramDetail({ prog }) {
  const [openDay, setOpenDay] = useState(0);
  return (
    <>
      <div className="caption" style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 16 }}>{prog.tagline}</div>
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <Stat label="Days / wk" value={prog.days} />
        <Stat label="Weeks" value={prog.weeks} />
        <Stat label="Level" value={<span style={{ fontSize: 15 }}>{prog.level}</span>} />
      </div>
      <div className="list">
        {prog.schedule.map((d, i) => (
          <div key={i}>
            <button className="list-row tap" onClick={() => setOpenDay(openDay === i ? -1 : i)}>
              <span className="row-icon num" style={{ fontWeight: 700, fontSize: 13 }}>{i + 1}</span>
              <span className="flex1" style={{ fontWeight: 650, textAlign: "left" }}>{d.label}</span>
              <span className="caption">{d.exercises.length} exercises</span>
              <Icon name={openDay === i ? "chev-u" : "chev-d"} size={16} style={{ color: "var(--t3)" }} />
            </button>
            {openDay === i && (
              <div style={{ padding: "0 16px 12px 64px" }}>
                {d.exercises.map((ex, j) => (
                  <div key={j} className="row between" style={{ padding: "7px 0", fontSize: 13.5, borderTop: j ? "1px solid var(--line)" : "none" }}>
                    <span>{ex.name}{ex.note ? <span className="muted"> · {ex.note}</span> : null}</span>
                    <span className="num caption">{ex.sets} × {ex.reps}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ---------- Builder ----------
export function BuilderSheet({ payload, onClose }) {
  const { store, setStore, flash, undoable, setTab } = useApp();
  const mode = payload.fromCurrent ? "current" : payload.program ? "edit" : "new";
  const keys = dayKeys(store.wo);
  const [name, setName] = useState(mode === "current" ? (store.activeProgram || "") : mode === "edit" ? payload.program.name : "");
  const [days, setDays] = useState(() => mode === "current" ? keys.map(k => JSON.parse(JSON.stringify({ label: store.wo[k].label, exercises: store.wo[k].exercises })))
    : mode === "edit" ? JSON.parse(JSON.stringify(payload.program.days)) : [{ label: "Day 1", exercises: [] }]);
  const [ad, setAd] = useState(0);
  const cur = days[ad] || days[0];

  const upDay = (i, p) => setDays(d => d.map((x, j) => j === i ? { ...x, ...p } : x));
  const setEx = exs => upDay(ad, { exercises: exs });
  const upEx = (i, p) => setEx(cur.exercises.map((e, j) => j === i ? { ...e, ...p } : e));
  const moveEx = (i, d) => { const j = i + d; if (j < 0 || j >= cur.exercises.length) return; const a = [...cur.exercises]; [a[i], a[j]] = [a[j], a[i]]; setEx(a); };
  const moveDay = d => { const j = ad + d; if (j < 0 || j >= days.length) return; const a = [...days]; [a[ad], a[j]] = [a[j], a[ad]]; setDays(a); setAd(j); };

  const clean = () => days.map(d => ({ ...d, label: (d.label || "").trim() || "Day", exercises: d.exercises.filter(e => e.name.trim()).map(e => ({ ...e, name: e.name.trim(), sets: Math.max(1, parseInt(e.sets) || 3) })) }));
  const valid = () => {
    if (mode !== "current" && !name.trim()) { flash("Give your program a name", { icon: "info" }); return null; }
    const c = clean();
    if (c.every(d => !d.exercises.length)) { flash("Add at least one exercise", { icon: "info" }); return null; }
    return c;
  };
  const apply = () => {
    const c = valid(); if (!c) return;
    const wo = {}; c.forEach((d, i) => { wo["d" + i] = { label: d.label, muscle: d.muscle || "", exercises: d.exercises }; });
    undoable("Split updated", p => ({ ...p, wo: withIds(wo), activeProgram: name.trim() || p.activeProgram }));
    onClose();
  };
  const save = load => {
    const c = valid(); if (!c) return;
    const prog = { name: name.trim(), days: c.map(d => ({ ...d, exercises: d.exercises.map(({ id, ...r }) => r) })), created: mode === "edit" ? payload.program.created : todayKey() };
    setStore(p => {
      const programs = [...p.programs];
      if (mode === "edit") programs[payload.index] = prog; else programs.push(prog);
      return load ? { ...p, programs, wo: programToWo(prog.days), activeProgram: prog.name, activeSession: null } : { ...p, programs };
    });
    flash(load ? `Now running ${prog.name}` : "Program saved", { icon: "check" });
    onClose();
    if (load) setTab("train");
  };

  return (
    <Sheet onClose={onClose} tall title={mode === "current" ? "Edit split" : mode === "edit" ? "Edit program" : "New program"}
      footer={mode === "current" ? <button className="btn primary lg block" onClick={apply}>Apply to Train</button>
        : <><button className="btn lg" onClick={() => save(false)}>Save</button><button className="btn primary lg flex1" onClick={() => save(true)}>Save & start</button></>}>
      <datalist id="exlib-b">{EXERCISE_LIBRARY.map(e => <option key={e.n} value={e.n} />)}</datalist>
      <label className="field-label">Program name</label>
      <input className="field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Winter strength block" style={{ marginBottom: 18 }} />

      <div className="row between" style={{ marginBottom: 8 }}>
        <span className="label">Days</span>
        <button className="link" onClick={() => { setDays(d => [...d, { label: `Day ${d.length + 1}`, exercises: [] }]); setAd(days.length); }}>+ Add day</button>
      </div>
      <div className="hscroll" style={{ marginBottom: 14 }}>
        {days.map((d, i) => <button key={i} className={"chip" + (i === ad ? " on" : "")} onClick={() => setAd(i)}><span className="num" style={{ opacity: 0.6 }}>{i + 1}</span> {d.label || "Day"}</button>)}
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div className="row gap-6" style={{ marginBottom: 12 }}>
          <input className="field flex1" value={cur.label} onChange={e => upDay(ad, { label: e.target.value })} placeholder="Day name" style={{ fontWeight: 650 }} />
          <button className="icon-btn" disabled={ad === 0} onClick={() => moveDay(-1)} aria-label="Move day earlier"><Icon name="chev-l" size={17} /></button>
          <button className="icon-btn" disabled={ad === days.length - 1} onClick={() => moveDay(1)} aria-label="Move day later"><Icon name="chev-r" size={17} /></button>
          {days.length > 1 && <button className="icon-btn" style={{ color: "var(--bad)" }} onClick={() => { const nd = days.filter((_, j) => j !== ad); setDays(nd); setAd(Math.max(0, Math.min(ad, nd.length - 1))); }} aria-label="Delete day"><Icon name="trash" size={17} /></button>}
        </div>
        {cur.exercises.length === 0 && <Empty icon="dumbbell">No exercises yet.</Empty>}
        <div className="stack gap-10">
          {cur.exercises.map((ex, i) => <BuilderRow key={ex.id || i} ex={ex} i={i} n={cur.exercises.length} onChange={p => upEx(i, p)} onMove={d => moveEx(i, d)} onRemove={() => setEx(cur.exercises.filter((_, j) => j !== i))} />)}
        </div>
        <button className="btn outline block" style={{ marginTop: 12, borderStyle: "dashed" }} onClick={() => setEx([...cur.exercises, { name: "", sets: 3, reps: "8-10", note: "", primary: [], isSuperset: false }])}><Icon name="plus" size={16} /> Add exercise</button>
      </div>
    </Sheet>
  );
}

function BuilderRow({ ex, i, n, onChange, onMove, onRemove }) {
  const muscles = normMuscles(ex.primary && ex.primary.length ? ex.primary : ex.muscle ? [ex.muscle] : []);
  const [more, setMore] = useState(!ex.name);
  const onName = v => {
    const lib = EXERCISE_LIBRARY.find(e => e.n.toLowerCase() === v.trim().toLowerCase());
    onChange(lib && !muscles.length ? { name: v, primary: lib.m } : { name: v });
  };
  return (
    <div className="tile" style={{ padding: 12 }}>
      <div className="row gap-6" style={{ marginBottom: 8 }}>
        <span className="num muted" style={{ width: 18, fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
        <input className="field flex1" style={{ height: 42, background: "var(--card)" }} list="exlib-b" value={ex.name} onChange={e => onName(e.target.value)} placeholder="Exercise" />
        <button className="icon-btn sm ghost" disabled={i === 0} onClick={() => onMove(-1)} aria-label="Up"><Icon name="up" size={15} /></button>
        <button className="icon-btn sm ghost" disabled={i === n - 1} onClick={() => onMove(1)} aria-label="Down"><Icon name="down" size={15} /></button>
        <button className="icon-btn sm ghost" onClick={onRemove} aria-label="Remove"><Icon name="x" size={15} /></button>
      </div>
      <div className="grid-3" style={{ gap: 6 }}>
        <label><span className="field-label">Sets</span><NumInput decimal={false} className="field center" style={{ height: 40, background: "var(--card)" }} value={ex.sets} onChange={v => onChange({ sets: v })} /></label>
        <label><span className="field-label">Reps</span><input className="field center" style={{ height: 40, background: "var(--card)" }} value={ex.reps} onChange={e => onChange({ reps: e.target.value })} /></label>
        <label><span className="field-label">Rest s</span><NumInput decimal={false} className="field center" style={{ height: 40, background: "var(--card)" }} placeholder="auto" value={ex.rest || ""} onChange={v => onChange({ rest: parseInt(v) || undefined })} /></label>
      </div>
      <button className="caption row gap-6" style={{ marginTop: 10, fontWeight: 600 }} onClick={() => setMore(m => !m)}>
        <Icon name={more ? "chev-d" : "chev-r"} size={14} /> Muscles & superset {muscles.length > 0 && <span className="muted">· {muscles.map(m => MUSCLE_LABEL[m]).join(", ")}</span>}
      </button>
      {more && (
        <div style={{ marginTop: 10 }}>
          <div className="row gap-6" style={{ flexWrap: "wrap", marginBottom: 10 }}>
            {MUSCLES.map(m => {
              const on = muscles.includes(m);
              return <button key={m} className={"chip" + (on ? " accent" : "")} style={{ height: 30, fontSize: 12 }} onClick={() => onChange({ primary: on ? muscles.filter(x => x !== m) : [...muscles, m], muscle: undefined })}>{MUSCLE_LABEL[m]}</button>;
            })}
          </div>
          <label className="row gap-8" style={{ fontSize: 13.5, fontWeight: 600 }}>
            <input type="checkbox" checked={!!ex.isSuperset} onChange={e => onChange({ isSuperset: e.target.checked })} style={{ accentColor: "var(--accent)", width: 18, height: 18 }} /> Superset
          </label>
          {ex.isSuperset && <input className="field" style={{ height: 42, marginTop: 8, background: "var(--card)" }} list="exlib-b" placeholder="Paired exercise" value={ex.nameB || ""} onChange={e => onChange({ nameB: e.target.value })} />}
        </div>
      )}
    </div>
  );
}
