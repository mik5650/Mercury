// Mercury — Train: workout logger + cardio
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp, Seg, Empty, Section, Bars, Ring, NumInput } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import {
  todayKey, addDays, weekStart, fmtDate, fmtTime, fmtVol, num, uid, setKey, entryDone, entryVol, epley1RM,
  parseRepRange, lastPerformance, suggestNext, warmupSets, recomputePRs, haptic, unlockAudio,
  dayKeys, suggestedDay, withDayAggregates, daySetCount, estimateMinutes, exerciseMuscles, MUSCLE_LABEL,
  EXERCISE_LIBRARY,
} from "../lib/data.js";

export function TrainScreen() {
  const { store, open } = useApp();
  const [mode, setMode] = useState(() => { try { return sessionStorage.getItem("m3_train") || "strength"; } catch { return "strength"; } });
  const pick = m => { setMode(m); try { sessionStorage.setItem("m3_train", m); } catch {} };
  return (
    <>
      <div className="row between rise" style={{ alignItems: "flex-end", marginBottom: 16 }}>
        <div className="flex1">
          <div className="caption ellipsis" style={{ fontWeight: 600 }}>{store.activeProgram || "Custom split"}</div>
          <div className="h-display">Train</div>
        </div>
        <button className="icon-btn" onClick={() => open("tools")} aria-label="Gym tools"><Icon name="tools" size={19} /></button>
        <button className="icon-btn" style={{ marginLeft: 8 }} onClick={() => open("programs")} aria-label="Programs"><Icon name="book" size={19} /></button>
      </div>
      <Seg value={mode} onChange={pick} options={[["strength", "Strength"], ["cardio", "Cardio"]]} style={{ marginBottom: 18 }} />
      {mode === "strength" ? <Strength /> : <CardioPanel />}
    </>
  );
}

function Strength() {
  const { store, setStore, flash, undoable, celebrate, open, ask, startRest, now } = useApp();
  const keys = dayKeys(store.wo);
  const [dayKey, setDayKey] = useState(() => suggestedDay(store));
  const [editing, setEditing] = useState(false);
  const tk = todayKey();
  const S = store.settings;
  const unit = S.unit;
  const suggested = suggestedDay(store);

  useEffect(() => { if (!store.wo[dayKey]) setDayKey(keys[0]); }, [store.wo]);
  useEffect(() => { if (store.activeSession && store.wo[store.activeSession.dayKey]) setDayKey(store.activeSession.dayKey); }, [store.activeSession && store.activeSession.dayKey]);

  const workout = store.wo[dayKey] || { label: "—", exercises: [] };
  const log = store.log[tk] || {};
  const session = store.activeSession;
  const elapsed = session ? Math.floor((now - session.start) / 1000) : 0;

  let total = 0, done = 0;
  workout.exercises.forEach(ex => {
    for (let si = 0; si < ex.sets; si++) {
      total++; if (entryDone(log[setKey(ex.id, si, false)])) done++;
      if (ex.isSuperset) { total++; if (entryDone(log[setKey(ex.id, si, true)])) done++; }
    }
  });
  const pct = total ? done / total : 0;
  const todayVol = Object.values(log).reduce((a, e) => a + entryVol(e), 0);

  // ---- mutations ----
  const patchSet = (ex, si, isB, patch) => setStore(prev => {
    const key = setKey(ex.id, si, isB);
    const day = { ...(prev.log[tk] || {}) };
    const name = isB ? ex.nameB : ex.name;
    const cur = day[key] || { ex: name, si, w: "", r: "", done: false, ...(isB ? { b: true } : {}) };
    const next = { ...cur, ...patch, ex: name };
    if (next.w === "" && next.r === "" && !next.done) delete day[key]; else day[key] = next;
    return withDayAggregates({ ...prev, log: { ...prev.log, [tk]: day } }, tk, dayKey);
  });

  const toggleDone = (ex, si, isB, ph) => {
    unlockAudio();
    const key = setKey(ex.id, si, isB);
    const cur = log[key] || {};
    const name = isB ? ex.nameB : ex.name;
    if (cur.done) {
      setStore(prev => {
        const day = { ...(prev.log[tk] || {}) };
        day[key] = { ...day[key], done: false };
        const st = withDayAggregates({ ...prev, log: { ...prev.log, [tk]: day } }, tk, dayKey);
        const rec = recomputePRs(st.log);
        const prs = { ...st.prs };
        if (prs[name] && prs[name].date === tk) { if (rec[name]) prs[name] = rec[name]; else delete prs[name]; }
        return { ...st, prs };
      });
      haptic(6);
      return;
    }
    const w = cur.w !== undefined && cur.w !== "" ? cur.w : (ph.w !== "" && ph.w !== undefined && ph.w !== null ? String(ph.w) : "");
    const r = cur.r ? cur.r : (ph.r ? String(ph.r) : "");
    if (!num(r)) { flash("Enter reps first", { icon: "info" }); return; }
    const lib = EXERCISE_LIBRARY.find(e => e.n === name);
    if (w === "" && !(lib && lib.eq === "bodyweight")) { flash("Enter the weight first", { icon: "info" }); return; }
    const old = store.prs[name];
    const e1 = epley1RM(w, r);
    const isPR = num(w) > 0 && (!old || e1 > (old.e1rm || 0));
    setStore(prev => {
      const day = { ...(prev.log[tk] || {}) };
      day[key] = { ...(day[key] || {}), ex: name, si, w: String(w), r: String(r), done: true, ...(isB ? { b: true } : {}) };
      let st = withDayAggregates({ ...prev, log: { ...prev.log, [tk]: day } }, tk, dayKey);
      if (isPR) st = { ...st, prs: { ...st.prs, [name]: { w: num(w), r: num(r), date: tk, e1rm: e1, ...(old ? {} : { first: true }) } } };
      if (!st.activeSession) st = { ...st, activeSession: { start: Date.now(), dayKey } };
      return st;
    });
    haptic(20);
    if (isPR && old) { celebrate(); haptic([60, 40, 140]); flash(`New record · ${name} ${w}×${r}`, { icon: "trophy" }); }
    if (S.autoRest) startRest(ex.rest || S.restDefault);
  };

  const updateEx = (ei, fn) => setStore(prev => {
    const exs = [...prev.wo[dayKey].exercises];
    const res = fn(exs, ei);
    return { ...prev, wo: { ...prev.wo, [dayKey]: { ...prev.wo[dayKey], exercises: res || exs } } };
  });
  const setCount = (ei, d) => { updateEx(ei, exs => { exs[ei] = { ...exs[ei], sets: Math.max(1, Math.min(12, exs[ei].sets + d)) }; }); haptic(6); };
  const move = (ei, d) => updateEx(ei, exs => { const j = ei + d; if (j < 0 || j >= exs.length) return; [exs[ei], exs[j]] = [exs[j], exs[ei]]; });
  const remove = ei => undoable(`Removed ${workout.exercises[ei].name}`, prev => ({ ...prev, wo: { ...prev.wo, [dayKey]: { ...prev.wo[dayKey], exercises: prev.wo[dayKey].exercises.filter((_, j) => j !== ei) } } }));

  const startSession = () => { unlockAudio(); haptic(30); setStore(prev => ({ ...prev, activeSession: { start: Date.now(), dayKey } })); };
  const finish = () => {
    const doneSets = Object.values(log).filter(entryDone);
    if (!doneSets.length) { undoable("Workout discarded — no sets logged", prev => ({ ...prev, activeSession: null, activeRest: null })); return; }
    const duration = Math.max(60, elapsed);
    const vol = Math.round(doneSets.reduce((a, e) => a + entryVol(e), 0));
    const names = [...new Set(doneSets.map(e => e.ex))];
    const prs = Object.entries(store.prs).filter(([n, p]) => p.date === tk && !p.first && names.includes(n));
    const entry = { date: tk, day: workout.label, dayKey, duration, volume: vol, exercises: names.length, sets: doneSets.length, id: uid() };
    setStore(prev => ({
      ...prev, activeSession: null, activeRest: null,
      hist: { ...prev.hist, [tk]: true }, volHist: { ...prev.volHist, [tk]: vol },
      muscleHist: { ...prev.muscleHist, [dayKey]: tk },
      sessHist: [entry, ...(prev.sessHist || []).filter(s => !(s.date === tk && (s.dayKey === dayKey || s.day === workout.label)))].slice(0, 500),
    }));
    haptic(120);
    open("summary", { session: entry, prs });
  };
  const fillLast = () => {
    let n = 0;
    setStore(prev => {
      const day = { ...(prev.log[tk] || {}) };
      workout.exercises.forEach(ex => {
        [[ex.name, false], ...(ex.isSuperset && ex.nameB ? [[ex.nameB, true]] : [])].forEach(([name, isB]) => {
          const lp = lastPerformance(prev, name, tk);
          if (!lp) return;
          for (let si = 0; si < ex.sets; si++) {
            const k = setKey(ex.id, si, isB);
            const src = lp.sets[si] || lp.sets[lp.sets.length - 1];
            if (!day[k] && src) { day[k] = { ex: name, si, w: String(src.w), r: String(src.r), done: false, ...(isB ? { b: true } : {}) }; n++; }
          }
        });
      });
      return { ...prev, log: { ...prev.log, [tk]: day } };
    });
    flash(n ? "Filled from last session" : "Nothing to fill", { icon: "history" });
  };

  const addDay = async () => {
    const label = await ask({ title: "New day", message: "Name it after the focus, e.g. Push or Upper.", input: { value: `Day ${keys.length + 1}` }, confirm: "Add day", icon: "plus" });
    if (!label) return;
    const nk = "d" + (Math.max(-1, ...keys.map(k => parseInt(k.slice(1)))) + 1);
    setStore(prev => ({ ...prev, wo: { ...prev.wo, [nk]: { label: label.trim(), muscle: "", exercises: [] } } }));
    setDayKey(nk);
  };
  const renameDay = async () => {
    const label = await ask({ title: "Rename day", input: { value: workout.label }, confirm: "Save", icon: "edit" });
    if (label) setStore(prev => ({ ...prev, wo: { ...prev.wo, [dayKey]: { ...prev.wo[dayKey], label: label.trim() } } }));
  };
  const deleteDay = () => {
    if (keys.length <= 1) { flash("Keep at least one day", { icon: "info" }); return; }
    const k = dayKey;
    setDayKey(keys.find(x => x !== k));
    undoable(`Deleted ${workout.label}`, prev => { const wo = { ...prev.wo }; delete wo[k]; return { ...prev, wo }; });
  };

  return (
    <>
      {/* Day picker */}
      <div className="hscroll rise-1" style={{ marginBottom: 14 }}>
        {keys.map(k => {
          const trained = store.muscleHist[k] === tk;
          return (
            <button key={k} className={"chip" + (k === dayKey ? " on" : "")} onClick={() => { setDayKey(k); haptic(5); if (session && session.dayKey !== k) setStore(p => ({ ...p, activeSession: p.activeSession ? { ...p.activeSession, dayKey: k } : null })); }}>
              {trained && <Icon name="check" size={14} stroke={2.6} />}
              {store.wo[k].label}
              {k === suggested && !trained && k !== dayKey && <span className="dot" style={{ width: 6, height: 6, background: "var(--accent)" }} />}
            </button>
          );
        })}
        {editing && <button className="chip" style={{ color: "var(--accent-ink)" }} onClick={addDay}><Icon name="plus" size={14} /> Day</button>}
      </div>

      {/* Session card */}
      <div className={"card rise-2" + (session ? " hero" : "")} style={{ padding: 18, marginBottom: 12 }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <div className="flex1">
            {session ? (
              <div className="row gap-8"><span className="live" /><span className="label" style={{ color: "var(--accent-ink)" }}>Live session</span></div>
            ) : (
              <span className="label">{dayKey === suggested ? "Up next" : "Selected day"}</span>
            )}
            <div className="big-num" style={{ fontSize: session ? 40 : 28, marginTop: 6 }}>{session ? fmtTime(elapsed) : workout.label}</div>
          </div>
          <Ring pct={pct} size={58} stroke={6}>
            <span className="num" style={{ fontSize: 13, fontWeight: 700 }}>{Math.round(pct * 100)}%</span>
          </Ring>
        </div>
        <div className="row gap-16 caption" style={{ marginBottom: 16, fontWeight: 600 }}>
          <span><span className="num" style={{ color: "var(--t1)" }}>{done}</span>/{total} sets</span>
          <span><span className="num" style={{ color: "var(--t1)" }}>{fmtVol(todayVol)}</span> {unit}</span>
          {!session && <span>~{estimateMinutes(workout, S.restDefault)} min</span>}
        </div>
        {session ? (
          <div className="row gap-8">
            <button className="btn" onClick={() => undoable("Session timer cancelled", prev => ({ ...prev, activeSession: null }))}>Cancel</button>
            <button className="btn primary lg flex1" onClick={finish}><Icon name="check" size={18} stroke={2.4} /> Finish workout</button>
          </div>
        ) : (
          <button className="btn primary lg block" onClick={startSession}><Icon name="play" size={16} /> {done ? "Resume workout" : "Start workout"}</button>
        )}
      </div>

      <div className="hscroll" style={{ marginBottom: 6 }}>
        <button className="chip" onClick={fillLast}><Icon name="history" size={15} /> Fill from last</button>
        <button className="chip" onClick={() => open("timer")}><Icon name="timer" size={15} /> Timer</button>
        <button className={"chip" + (editing ? " on" : "")} onClick={() => setEditing(e => !e)}><Icon name="edit" size={15} /> {editing ? "Done editing" : "Edit day"}</button>
        <button className="chip" onClick={() => open("restDay")}><Icon name="rest" size={15} /> Rest day</button>
      </div>
      {editing && (
        <div className="row gap-8" style={{ marginTop: 8 }}>
          <button className="btn sm flex1" onClick={renameDay}><Icon name="edit" size={14} /> Rename</button>
          <button className="btn sm danger flex1" onClick={deleteDay}><Icon name="trash" size={14} /> Delete day</button>
        </div>
      )}

      <Section title="Exercises"><span className="caption num">{workout.exercises.length}</span></Section>
      {workout.exercises.length === 0 && (
        <div className="card"><Empty icon="dumbbell" title="No exercises yet" action={<button className="btn primary" onClick={() => open("addExercise", { dayKey })}><Icon name="plus" size={16} /> Add exercise</button>}>Build {workout.label} from the library.</Empty></div>
      )}
      <div className="stack gap-12">
        {workout.exercises.map((ex, ei) => (
          <ExerciseCard key={ex.id} ex={ex} ei={ei} n={workout.exercises.length} log={log} editing={editing}
            onPatch={patchSet} onToggle={toggleDone}
            onSets={d => setCount(ei, d)} onMove={d => move(ei, d)} onRemove={() => remove(ei)}
            onEdit={() => open("editExercise", { dayKey, ei })}
            onRest={() => startRest(ex.rest || S.restDefault)} />
        ))}
      </div>
      {workout.exercises.length > 0 && (
        <button className="btn outline block lg" style={{ marginTop: 12, borderStyle: "dashed" }} onClick={() => open("addExercise", { dayKey })}>
          <Icon name="plus" size={18} /> Add exercise
        </button>
      )}
      {session && done > 0 && (
        <button className="btn primary lg block" style={{ marginTop: 10 }} onClick={finish}>
          <Icon name="check" size={18} stroke={2.4} /> Finish workout · {done}/{total} sets
        </button>
      )}
    </>
  );
}

// ============ Exercise card ============
function ExerciseCard({ ex, ei, n, log, editing, onPatch, onToggle, onSets, onMove, onRemove, onEdit, onRest }) {
  const { store, setStore, open, flash } = useApp();
  const tk = todayKey();
  const unit = store.settings.unit;
  const [wuOpen, setWuOpen] = useState(false);
  const last = useMemo(() => lastPerformance(store, ex.name, tk), [store.log, ex.name]);
  const lastB = useMemo(() => ex.isSuperset && ex.nameB ? lastPerformance(store, ex.nameB, tk) : null, [store.log, ex.nameB, ex.isSuperset]);
  const sug = useMemo(() => suggestNext(store, ex.name, ex.reps, unit), [store.log, ex.name, ex.reps, unit]);
  const range = parseRepRange(ex.reps);
  const muscles = exerciseMuscles(ex);

  let dA = 0, dB = 0;
  for (let si = 0; si < ex.sets; si++) {
    if (entryDone(log[setKey(ex.id, si, false)])) dA++;
    if (ex.isSuperset && entryDone(log[setKey(ex.id, si, true)])) dB++;
  }
  const complete = dA === ex.sets && (!ex.isSuperset || dB === ex.sets);
  const pr = store.prs[ex.name];
  const prToday = pr && pr.date === tk && !pr.first && Object.values(log).some(e => e.ex === ex.name && e.done);
  const topW = sug ? sug.w : last ? Math.max(...last.sets.map(s => s.w)) : 0;
  const lib = EXERCISE_LIBRARY.find(e => e.n === ex.name);
  const barbell = lib ? lib.eq === "barbell" : /squat|press|deadlift|row|bench/i.test(ex.name);
  const wu = barbell ? warmupSets(topW, unit, store.settings.bar) : [];

  const ph = (lp, si, useSug) => {
    const prev = lp ? (lp.sets[si] || lp.sets[lp.sets.length - 1]) : null;
    return {
      prev,
      w: useSug && sug ? sug.w : prev ? prev.w : "",
      r: useSug && sug && sug.r ? sug.r : prev ? prev.r : range ? range[0] : "",
    };
  };

  const block = (isB) => (
    <>
      <div className="set-grid" style={{ marginBottom: 4 }}>
        <div className="set-head">Set</div><div className="set-head">Previous</div>
        <div className="set-head">{unit}</div><div className="set-head">Reps</div><div />
      </div>
      <FillBlock
        rows={Array.from({ length: ex.sets }).map((_, si) => {
          const e = log[setKey(ex.id, si, isB)] || {};
          const p = ph(isB ? lastB : last, si, !isB);
          return { w: e.w || (p.w === "" || p.w == null ? "" : String(p.w)), r: e.r || (p.r ? String(p.r) : ""), done: !!e.done };
        })}
        onFill={(col, from, to, value, rows) => {
          let count = 0;
          for (let i = from; i <= to; i++) if (!rows[i].done) { onPatch(ex, i, isB, { [col]: value }); if (i > from) count++; }
          if (!store.settings.fillTipSeen) setStore(p => ({ ...p, settings: { ...p.settings, fillTipSeen: true } }));
          flash(`${col === "w" ? "Weight" : "Reps"} ${value} copied to ${count} set${count === 1 ? "" : "s"}`, { icon: "copy" });
        }}
        render={fill => Array.from({ length: ex.sets }).map((_, si) => {
          const k = setKey(ex.id, si, isB);
          const p = ph(isB ? lastB : last, si, !isB);
          const inFill = fill && si >= fill.from && si <= fill.to && !(log[k] && log[k].done);
          return <SetRow key={k} idx={si + 1} entry={log[k]} ph={p}
            fill={inFill ? { col: fill.col, value: fill.value, src: si === fill.from } : null}
            onW={v => onPatch(ex, si, isB, { w: v })} onR={v => onPatch(ex, si, isB, { r: v })}
            onToggle={() => onToggle(ex, si, isB, p)} />;
        })} />
      {ei === 0 && !isB && !store.settings.fillTipSeen && ex.sets > 1 && (
        <div className="caption row gap-6" style={{ fontSize: 12, marginTop: 8 }}>
          <Icon name="copy" size={13} /> Tip: hold a weight or reps cell, then drag down to copy it.
        </div>
      )}
    </>
  );

  return (
    <div className="card ex-card" style={prToday ? { animation: "glowPulse 1.6s ease" } : undefined}>
      <div className="row" style={{ alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
        <button className="flex1" style={{ textAlign: "left" }} onClick={() => open("exercise", { name: ex.name, reps: ex.reps })}>
          <div className="row gap-8" style={{ flexWrap: "wrap" }}>
            <span className="h-card">{ex.name}</span>
            {complete && <span className="pill good"><Icon name="check" size={11} stroke={2.8} /> Done</span>}
            {prToday && <span className="pill solid"><Icon name="trophy" size={11} /> PR</span>}
          </div>
          {ex.isSuperset && <div className="caption" style={{ marginTop: 2 }}>Superset with <b style={{ color: "var(--t1)" }}>{ex.nameB}</b></div>}
          <div className="caption" style={{ marginTop: 4 }}>
            <span className="num" style={{ fontWeight: 650, color: "var(--t1)" }}>{ex.sets} × {ex.reps}</span>
            {muscles.length > 0 && <> · {muscles.slice(0, 2).map(m => MUSCLE_LABEL[m]).join(", ")}</>}
            {ex.note && <> · <i>{ex.note}</i></>}
          </div>
        </button>
        {editing ? (
          <div className="row gap-6">
            <button className="icon-btn sm" disabled={ei === 0} onClick={() => onMove(-1)} aria-label="Move up"><Icon name="up" size={15} /></button>
            <button className="icon-btn sm" disabled={ei === n - 1} onClick={() => onMove(1)} aria-label="Move down"><Icon name="down" size={15} /></button>
            <button className="icon-btn sm" style={{ color: "var(--bad)" }} onClick={onRemove} aria-label="Remove"><Icon name="trash" size={15} /></button>
          </div>
        ) : (
          <button className="icon-btn sm ghost" onClick={onEdit} aria-label="Exercise options"><Icon name="dots" size={18} /></button>
        )}
      </div>

      {sug && (
        <div className="coach">
          <span className="row-icon" style={{ width: 28, height: 28, borderRadius: 9, background: sug.kind === "up" ? "rgba(48,209,88,0.15)" : sug.kind === "down" ? "rgba(255,179,64,0.15)" : "var(--card-3)", color: sug.kind === "up" ? "var(--good)" : sug.kind === "down" ? "var(--warn)" : "var(--t2)" }}>
            <Icon name={sug.kind === "up" ? "up" : sug.kind === "down" ? "down" : "sparkle"} size={14} stroke={2.2} />
          </span>
          <div className="flex1">
            <div style={{ fontSize: 13.5, fontWeight: 650 }}>
              {sug.kind === "up" ? "Go up" : sug.kind === "down" ? "Reset" : "Today"}: <span className="num">{sug.w} × {sug.r}</span>
            </div>
            <div className="caption ellipsis" style={{ fontSize: 12 }}>{sug.why}</div>
          </div>
        </div>
      )}

      {wu.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <button className="caption row gap-6" style={{ fontWeight: 600 }} onClick={() => setWuOpen(o => !o)}>
            <Icon name={wuOpen ? "chev-d" : "chev-r"} size={14} /> Warm-up · {wu.length} sets to {topW}
          </button>
          {wuOpen && (
            <div className="row gap-6" style={{ marginTop: 8 }}>
              {wu.map((s, i) => (
                <div key={i} className="tile flex1" style={{ padding: "8px 4px", textAlign: "center" }}>
                  <div className="caption" style={{ fontSize: 10.5 }}>{s.pct}</div>
                  <div className="num" style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{s.w}<span className="muted" style={{ fontWeight: 500 }}>×{s.r}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {ex.isSuperset && <div className="label" style={{ margin: "2px 0 6px" }}>A · {ex.name}</div>}
      {block(false)}
      {ex.isSuperset && <><div className="label" style={{ margin: "14px 0 6px" }}>B · {ex.nameB}</div>{block(true)}</>}

      <div className="row gap-6" style={{ marginTop: 10 }}>
        <button className="btn sm ghost" onClick={() => onSets(1)}><Icon name="plus" size={15} /> Set</button>
        <button className="btn sm ghost" disabled={ex.sets <= 1} onClick={() => onSets(-1)}><Icon name="minus" size={15} /> Set</button>
        <div className="flex1" />
        <button className="btn sm" onClick={onRest}><Icon name="timer" size={15} /> <span className="num">{fmtTime(ex.rest || store.settings.restDefault)}</span></button>
      </div>
    </div>
  );
}

// Set row — top-level component so inputs keep focus while typing
function SetRow({ idx, entry, ph, fill, onW, onR, onToggle }) {
  const e = entry || {};
  const done = !!e.done;
  const prev = ph.prev ? `${ph.prev.w || "BW"} × ${ph.prev.r}` : "—";
  const cls = col => "set-in" + (fill && fill.col === col ? (fill.src ? " fill-src" : " filling") : "");
  const shown = (col, v) => (fill && fill.col === col ? fill.value : v || "");
  // The cell takes the touch while its field is idle (see .set-cell) and focuses it on tap
  const focusField = ev => { const f = ev.currentTarget.querySelector("input"); if (f && document.activeElement !== f) f.focus(); };
  return (
    <div className={"set-grid set-row" + (done ? " done" : "")} data-fill-idx={idx - 1}>
      <div className="set-idx">{idx}</div>
      <button className="set-prev" onClick={() => { if (ph.prev && !done) { onW(String(ph.prev.w)); onR(String(ph.prev.r)); } }} title="Copy previous">{prev}</button>
      <div className="set-cell" data-fill-col="w" onClick={focusField}>
        <NumInput className={cls("w")} aria-label={`Set ${idx} weight`}
          placeholder={ph.w === "" || ph.w === undefined ? "—" : String(ph.w)} value={shown("w", e.w)} onChange={onW} />
      </div>
      <div className="set-cell" data-fill-col="r" onClick={focusField}>
        <NumInput className={cls("r")} decimal={false} aria-label={`Set ${idx} reps`}
          placeholder={ph.r ? String(ph.r) : "—"} value={shown("r", e.r)} onChange={onR}
          onKeyDown={ev => { if (ev.key === "Enter") { ev.currentTarget.blur(); onToggle(); } }} />
      </div>
      <button className={"check" + (done ? " on" : "")} onClick={onToggle} aria-label={done ? `Undo set ${idx}` : `Complete set ${idx}`} aria-pressed={done}>
        <Icon name="check" size={20} stroke={2.6} />
      </button>
    </div>
  );
}

// ============ Cardio ============
export const CARDIO_KINDS = [
  { id: "run", label: "Run", icon: "run" },
  { id: "bike", label: "Bike", icon: "bike" },
  { id: "row", label: "Row", icon: "wave" },
  { id: "swim", label: "Swim", icon: "drop" },
  { id: "walk", label: "Walk", icon: "walk" },
  { id: "other", label: "Other", icon: "heart" },
];

function CardioPanel() {
  const { store, undoable, open } = useApp();
  const cardio = store.cardio || [];
  const dist = store.settings.unit === "kg" ? "km" : "mi";
  const ws = weekStart();
  const thisWeek = cardio.filter(c => c.date >= ws);
  const mins = thisWeek.reduce((a, c) => a + (c.minutes || 0), 0);
  const weeks = Array.from({ length: 8 }).map((_, i) => {
    const s = addDays(ws, -7 * (7 - i)), e = addDays(s, 6);
    const m = cardio.filter(c => c.date >= s && c.date <= e).reduce((a, c) => a + (c.minutes || 0), 0);
    return { label: i === 7 ? "Now" : fmtDate(s, { month: "numeric", day: "numeric" }), value: m, top: m || "" };
  });
  const sorted = [...cardio].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <div className="card hero rise-1" style={{ padding: 18, marginBottom: 12 }}>
        <div className="row gap-16" style={{ marginBottom: 16 }}>
          <Ring pct={mins / 150} size={84} stroke={9}>
            <span className="big-num" style={{ fontSize: 20 }}>{mins}</span>
            <span className="caption" style={{ fontSize: 10 }}>/150 min</span>
          </Ring>
          <div className="grid-2 flex1" style={{ gap: 12 }}>
            <div><div className="big-num" style={{ fontSize: 22 }}>{thisWeek.reduce((a, c) => a + (c.distance || 0), 0).toFixed(1)}</div><div className="caption">{dist} this week</div></div>
            <div><div className="big-num" style={{ fontSize: 22 }}>{thisWeek.length}</div><div className="caption">sessions</div></div>
          </div>
        </div>
        <Bars data={weeks} height={110} goal={150} />
      </div>
      <button className="btn primary lg block" onClick={() => open("cardio")}><Icon name="plus" size={18} stroke={2.2} /> Log cardio</button>

      <Section title="History"><span className="caption num">{cardio.length}</span></Section>
      {cardio.length === 0 ? (
        <div className="card"><Empty icon="heart" title="No cardio yet">Zone 2 work speeds up recovery between lifting days.</Empty></div>
      ) : (
        <div className="list">
          {sorted.slice(0, 50).map(c => {
            const k = CARDIO_KINDS.find(x => x.id === c.kind) || CARDIO_KINDS[5];
            const pace = c.distance && c.minutes && ["run", "walk"].includes(c.kind) ? c.minutes / c.distance : null;
            return (
              <div key={c.id} className="list-row">
                <div className="row-icon" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}><Icon name={k.icon} size={18} /></div>
                <div className="flex1">
                  <div style={{ fontWeight: 650 }}>{k.label} · <span className="num">{c.minutes} min</span></div>
                  <div className="caption ellipsis num">
                    {fmtDate(c.date, { weekday: "short", month: "short", day: "numeric" })}
                    {c.distance ? ` · ${c.distance} ${dist}` : ""}{pace ? ` · ${fmtTime(pace * 60)}/${dist}` : ""}{c.avgHR ? ` · ${c.avgHR} bpm` : ""}{c.note ? ` · ${c.note}` : ""}
                  </div>
                </div>
                <button className="icon-btn sm ghost" aria-label="Delete" onClick={() => undoable("Cardio removed", p => ({ ...p, cardio: p.cardio.filter(x => x.id !== c.id) }))}><Icon name="trash" size={16} /></button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// Hold a weight or reps cell, then drag down: the value is copied to the sets below.
// Touch: a 380 ms hold arms the gesture; moving earlier lets the page scroll as usual.
function FillBlock({ rows, onFill, render }) {
  const ref = useRef(null);
  const [fill, setFill] = useState(null);
  const live = useRef({ rows, onFill });
  live.current = { rows, onFill };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let g = null; // gesture: { x, y, col, from, to, value, active, timer }

    const begin = (target, x, y) => {
      const cell = target.closest && target.closest("[data-fill-col]");
      if (!cell || !el.contains(cell)) return false;
      const from = +cell.closest("[data-fill-idx]").dataset.fillIdx;
      const col = cell.dataset.fillCol;
      const value = live.current.rows[from] && live.current.rows[from][col];
      if (!value || from >= live.current.rows.length - 1) return false;
      g = { x, y, col, from, to: from, value, active: false };
      g.timer = setTimeout(() => {
        if (!g) return;
        g.active = true;
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        haptic(25);
        setFill({ col, from, to: from, value });
      }, 380);
      return true;
    };
    const move = (x, y) => {
      if (!g) return false;
      if (!g.active) {
        if (Math.hypot(x - g.x, y - g.y) > 8) { clearTimeout(g.timer); g = null; }
        return false;
      }
      let to = g.from;
      el.querySelectorAll("[data-fill-idx]").forEach(r => {
        if (y >= r.getBoundingClientRect().top) to = Math.max(to, +r.dataset.fillIdx);
      });
      if (to !== g.to) { g.to = to; haptic(8); setFill({ col: g.col, from: g.from, to, value: g.value }); }
      return true;
    };
    const end = () => {
      if (!g) return false;
      clearTimeout(g.timer);
      const was = g;
      g = null;
      if (!was.active) return false;
      setFill(null);
      if (was.to > was.from) live.current.onFill(was.col, was.from, was.to, was.value, live.current.rows);
      return true;
    };

    // A focused field gets touches itself: hold it back from Android's long-press text selection
    const ts = e => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (begin(e.target, t.clientX, t.clientY) && e.target === document.activeElement) { e.preventDefault(); g.refocus = e.target; }
    };
    const tm = e => { const t = e.touches[0]; if (t && move(t.clientX, t.clientY)) e.preventDefault(); };
    const te = e => {
      const tap = g && !g.active && g.refocus;
      if (end()) e.preventDefault();
      else if (tap) { tap.blur(); tap.focus(); } // a plain tap brings the keyboard back
    };
    const cm = e => { if (g) e.preventDefault(); };
    const md = e => {
      if (e.button !== 0 || !begin(e.target, e.clientX, e.clientY)) return;
      const mm = ev => move(ev.clientX, ev.clientY);
      const mu = () => { end(); window.removeEventListener("mousemove", mm); window.removeEventListener("mouseup", mu); };
      window.addEventListener("mousemove", mm);
      window.addEventListener("mouseup", mu);
    };

    el.addEventListener("touchstart", ts, { passive: false });
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("touchend", te, { passive: false });
    el.addEventListener("touchcancel", te);
    el.addEventListener("contextmenu", cm);
    el.addEventListener("mousedown", md);
    return () => {
      el.removeEventListener("touchstart", ts);
      el.removeEventListener("touchmove", tm);
      el.removeEventListener("touchend", te);
      el.removeEventListener("touchcancel", te);
      el.removeEventListener("contextmenu", cm);
      el.removeEventListener("mousedown", md);
    };
  }, []);

  return <div ref={ref} className="stack" style={{ gap: 4 }}>{render(fill)}</div>;
}
