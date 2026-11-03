// Mercury — workout sheets
import { useEffect, useMemo, useState } from "react";
import { useApp, Sheet, Seg, Stepper, Toggle, LineChart, Empty, SearchField, Stat } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import {
  todayKey, addDays, fmtDate, fmtTime, fmtTimeLong, fmtVol, num, uid, entryDone, entryVol, epley1RM, SET_TYPES,
  exerciseSessions, suggestNext, allSets, EXERCISE_LIBRARY, MUSCLES, MUSCLE_LABEL, guessMuscles,
  getStreak, sessionTopSets, recomputePRs,
} from "../lib/data.js";
import { saveFile, shareImage, isNative } from "../lib/native.js";
import { CARDIO_KINDS } from "../screens/train.jsx";

// ---------- Exercise history ----------
export function ExerciseSheet({ payload, onClose }) {
  const { store } = useApp();
  const name = payload.name;
  const unit = store.settings.unit;
  const [metric, setMetric] = useState("e1rm");
  const sessions = useMemo(() => exerciseSessions(store, name), [store.log, name]);
  const pr = store.prs[name];
  const best = sessions.length ? Math.max(...sessions.map(s => s.best1RM)) : 0;
  const reps = payload.reps || (() => { for (const d of Object.values(store.wo)) for (const ex of d.exercises) if (ex.name === name) return ex.reps; return null; })();
  const sug = suggestNext(store, name, reps, unit, addDays(todayKey(), 1));
  const pts = [...sessions].reverse().slice(-24).map(s => ({ date: s.date, value: metric === "e1rm" ? s.best1RM : metric === "top" ? s.topW : Math.round(s.vol) }));
  const lib = EXERCISE_LIBRARY.find(e => e.n === name);
  const muscles = lib ? lib.m : guessMuscles(name);

  return (
    <Sheet onClose={onClose} tall title={name} eyebrow={muscles.map(m => MUSCLE_LABEL[m]).join(" · ") || "Exercise"}>
      <div className="grid-3" style={{ marginBottom: 12 }}>
        <Stat label="Best e1RM" value={best || "—"} unit={best ? unit : ""} color="var(--accent-ink)" />
        <Stat label="Best set" value={pr ? `${pr.w}×${pr.r}` : "—"} sub={pr ? fmtDate(pr.date) : null} />
        <Stat label="Sessions" value={sessions.length} sub={sessions[0] ? `Last ${fmtDate(sessions[0].date)}` : null} />
      </div>

      {sug && (
        <div className="card hero" style={{ padding: 16, marginBottom: 12 }}>
          <div className="row gap-8"><Icon name="sparkle" size={16} style={{ color: "var(--accent-ink)" }} /><span className="label" style={{ color: "var(--accent-ink)" }}>Next session</span></div>
          <div className="big-num" style={{ fontSize: 34, margin: "8px 0 4px" }}>{sug.w} × {sug.r}</div>
          <div className="caption" style={{ lineHeight: 1.45 }}>{sug.why}</div>
        </div>
      )}

      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <Seg value={metric} onChange={setMetric} small style={{ marginBottom: 14 }} options={[["e1rm", "Est. 1RM"], ["top", "Top weight"], ["vol", "Volume"]]} />
        <LineChart points={pts} suffix={unit} />
      </div>

      {best > 0 && (
        <>
          <div className="label" style={{ margin: "18px 2px 8px" }}>Estimated rep maxes</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 6 }}>
            {[1, 3, 5, 8, 10, 12].map(r => (
              <div key={r} className="tile" style={{ padding: "10px 2px", textAlign: "center" }}>
                <div className="caption" style={{ fontSize: 10.5, fontWeight: 600 }}>{r}RM</div>
                <div className="num" style={{ fontWeight: 700, marginTop: 2 }}>{Math.round(best / (1 + (r === 1 ? 0 : r / 30)))}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="label" style={{ margin: "18px 2px 8px" }}>History</div>
      {sessions.length === 0 ? <div className="card"><Empty icon="history">No completed sets yet.</Empty></div> : (
        <div className="list">
          {sessions.slice(0, 40).map(s => (
            <div key={s.date} className="list-row" style={{ alignItems: "flex-start", flexDirection: "column", gap: 6, padding: "12px 16px" }}>
              <div className="row between" style={{ width: "100%" }}>
                <span style={{ fontWeight: 650, fontSize: 14 }}>{fmtDate(s.date, { weekday: "short", month: "short", day: "numeric" })}</span>
                <span className="caption num">e1RM {s.best1RM} · {fmtVol(s.vol)}</span>
              </div>
              <div className="row gap-6" style={{ flexWrap: "wrap" }}>
                {s.sets.map((x, i) => <span key={i} className="pill num" style={{ height: 24, fontSize: 12 }}>{x.w || "BW"} × {x.r}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}

// ---------- Day detail ----------
export function DaySheet({ payload, onClose }) {
  const { store, open, ask, undoable } = useApp();
  const date = payload.date;
  const unit = store.settings.unit;
  const sess = (store.sessHist || []).filter(s => s.date === date);
  const sets = Object.values(store.log[date] || {}).filter(entryDone).sort((a, b) => (a.si || 0) - (b.si || 0));
  const vol = sets.reduce((a, e) => a + entryVol(e), 0) || sess.reduce((a, s) => a + (s.volume || 0), 0);
  const by = {};
  sets.forEach(e => (by[e.ex] = by[e.ex] || []).push(e));
  const rest = (store.restDays || {})[date];
  const cardio = (store.cardio || []).filter(c => c.date === date);
  const title = sess.length ? sess.map(s => s.day).join(" + ") : sets.length ? "Training" : rest ? "Rest day" : "No training";
  const isToday = date === todayKey();
  const del = async () => {
    const ok = await ask({ title: "Delete this workout?", message: "Its sets, volume and any records set that day will be removed.", confirm: "Delete workout", danger: true, icon: "trash" });
    if (!ok) return;
    onClose();
    undoable("Workout deleted", p => {
      const log = { ...p.log }; delete log[date];
      const hist = { ...p.hist }; delete hist[date];
      const volHist = { ...p.volHist }; delete volHist[date];
      const rec = recomputePRs(log);
      const prs = {};
      Object.entries(p.prs).forEach(([n, pr]) => { if (pr.date !== date) prs[n] = pr; else if (rec[n]) prs[n] = rec[n]; });
      const muscleHist = {};
      Object.entries(p.muscleHist).forEach(([k, d]) => { if (d !== date) muscleHist[k] = d; });
      return { ...p, log, hist, volHist, prs, muscleHist, sessHist: (p.sessHist || []).filter(s => s.date !== date), activeSession: isToday ? null : p.activeSession };
    });
  };

  return (
    <Sheet onClose={onClose} eyebrow={fmtDate(date, { weekday: "long", month: "long", day: "numeric" })} title={title}
      footer={(sess.length > 0 || sets.length > 0) && <button className="btn danger block" onClick={del}><Icon name="trash" size={16} /> Delete workout</button>}
      right={sess[0] && <button className="icon-btn sm round" onClick={() => { onClose(); open("share", { session: sess[0] }); }} aria-label="Share"><Icon name="share" size={16} /></button>}>
      {(sets.length > 0 || sess.length > 0) && (
        <div className="grid-3" style={{ marginBottom: 14 }}>
          <Stat label="Sets" value={sets.length || sess.reduce((a, s) => a + (s.sets || 0), 0) || "—"} />
          <Stat label="Volume" value={fmtVol(vol)} unit={unit} />
          <Stat label="Time" value={sess.length ? Math.round(sess.reduce((a, s) => a + (s.duration || 0), 0) / 60) : "—"} unit={sess.length ? "min" : ""} />
        </div>
      )}
      {rest && <div className="pill good" style={{ marginBottom: 12, textTransform: "capitalize" }}><Icon name="check" size={12} stroke={2.6} /> Rest logged · {rest}</div>}
      {Object.keys(by).length > 0 ? (
        <div className="list">
          {Object.entries(by).map(([n, arr]) => (
            <button key={n} className="list-row tap" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6, padding: "12px 16px" }} onClick={() => { onClose(); open("exercise", { name: n }); }}>
              <span style={{ fontWeight: 650 }}>{n}</span>
              <div className="row gap-6" style={{ flexWrap: "wrap" }}>{arr.map((e, i) => (
                <span key={i} className="pill num" style={{ height: 24, fontSize: 12, opacity: e.t === "w" ? 0.55 : 1 }}>
                  {e.t && <b style={{ color: "var(--accent-ink)", marginRight: 4 }}>{SET_TYPES[e.t].short}</b>}{num(e.w) || "BW"} × {num(e.r)}{e.rpe ? ` @${e.rpe}` : ""}
                </span>
              ))}</div>
            </button>
          ))}
        </div>
      ) : sess.length ? <div className="card"><Empty icon="info">Set details weren't recorded for this session.</Empty></div>
        : !rest && !cardio.length && <div className="card"><Empty icon="moon" title="A quiet day">Nothing logged.</Empty></div>}
      {cardio.length > 0 && (
        <>
          <div className="label" style={{ margin: "16px 2px 8px" }}>Cardio</div>
          <div className="list">{cardio.map(c => (
            <div key={c.id} className="list-row"><span className="row-icon"><Icon name={(CARDIO_KINDS.find(k => k.id === c.kind) || CARDIO_KINDS[5]).icon} size={17} /></span>
              <span className="flex1" style={{ fontWeight: 600, textTransform: "capitalize" }}>{c.kind}</span><span className="num caption">{c.minutes} min{c.distance ? ` · ${c.distance}` : ""}</span></div>
          ))}</div>
        </>
      )}
    </Sheet>
  );
}

// ---------- Add / swap exercise ----------
export function AddExerciseSheet({ payload, onClose }) {
  const { store, setStore, flash } = useApp();
  const { dayKey, replaceIndex } = payload;
  const replacing = replaceIndex !== undefined;
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState("all");
  const [picked, setPicked] = useState(null);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState("8-10");
  const recent = useMemo(() => {
    const seen = new Set();
    return allSets(store).sort((a, b) => b.date.localeCompare(a.date)).map(s => s.ex).filter(n => n && n !== "Unknown" && !seen.has(n) && seen.add(n)).slice(0, 10);
  }, [store.log]);
  const ql = q.trim().toLowerCase();
  const results = EXERCISE_LIBRARY.filter(e => (muscle === "all" || e.m.includes(muscle)) && (!ql || e.n.toLowerCase().includes(ql)));
  const exact = EXERCISE_LIBRARY.some(e => e.n.toLowerCase() === ql);
  const dayLabel = store.wo[dayKey] ? store.wo[dayKey].label : "";

  const choose = (name, m) => {
    if (replacing) {
      setStore(p => { const exs = [...p.wo[dayKey].exercises]; exs[replaceIndex] = { ...exs[replaceIndex], name, primary: m }; return { ...p, wo: { ...p.wo, [dayKey]: { ...p.wo[dayKey], exercises: exs } } }; });
      flash(`Swapped to ${name}`, { icon: "swap" });
      onClose();
    } else setPicked({ name, m });
  };
  const add = () => {
    setStore(p => ({ ...p, wo: { ...p.wo, [dayKey]: { ...p.wo[dayKey], exercises: [...p.wo[dayKey].exercises, { id: uid(), name: picked.name, sets, reps: reps || "8-10", note: "", isSuperset: false, primary: picked.m }] } } }));
    flash(`Added ${picked.name}`, { icon: "plus" });
    onClose();
  };

  if (picked) return (
    <Sheet onClose={onClose} eyebrow={`Add to ${dayLabel}`} title={picked.name}
      right={<button className="btn sm ghost" onClick={() => setPicked(null)}><Icon name="chev-l" size={15} /> Back</button>}
      footer={<button className="btn primary lg block" onClick={add}>Add exercise</button>}>
      <div className="row between" style={{ marginBottom: 18 }}><span style={{ fontWeight: 650 }}>Sets</span><Stepper value={sets} onChange={setSets} min={1} max={12} /></div>
      <label className="field-label">Rep target</label>
      <input className="field center" value={reps} onChange={e => setReps(e.target.value)} placeholder="8-10" />
      <div className="row gap-6" style={{ flexWrap: "wrap", marginTop: 10 }}>
        {["3-5", "5", "6-8", "8-10", "10-12", "12-15", "15-20"].map(r => <button key={r} className={"chip num" + (reps === r ? " on" : "")} onClick={() => setReps(r)}>{r}</button>)}
      </div>
    </Sheet>
  );

  return (
    <Sheet onClose={onClose} tall eyebrow={replacing ? "Swap exercise" : `Add to ${dayLabel}`} title="Exercise library">
      <div style={{ marginBottom: 10 }}><SearchField value={q} onChange={setQ} placeholder="Search or create" autoFocus /></div>
      <div className="hscroll" style={{ marginBottom: 14 }}>
        {["all", ...MUSCLES].map(m => <button key={m} className={"chip" + (muscle === m ? " on" : "")} onClick={() => setMuscle(m)}>{m === "all" ? "All" : MUSCLE_LABEL[m]}</button>)}
      </div>
      {ql && !exact && (
        <button className="card tap row gap-12" style={{ padding: 14, width: "100%", marginBottom: 10, border: "1.5px dashed var(--accent)" }} onClick={() => choose(q.trim(), guessMuscles(q))}>
          <span className="row-icon" style={{ background: "var(--accent)", color: "var(--on-accent)" }}><Icon name="plus" size={18} /></span>
          <span style={{ fontWeight: 650 }}>Create "{q.trim()}"</span>
        </button>
      )}
      {!ql && muscle === "all" && recent.length > 0 && (
        <>
          <div className="label" style={{ margin: "0 2px 8px" }}>Recent</div>
          <div className="hscroll" style={{ marginBottom: 16 }}>{recent.map(n => <button key={n} className="chip" onClick={() => choose(n, guessMuscles(n))}>{n}</button>)}</div>
        </>
      )}
      <div className="list">
        {results.map(e => (
          <button key={e.n} className="list-row tap" onClick={() => choose(e.n, e.m)}>
            <div className="flex1" style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 600 }}>{e.n}</div>
              <div className="caption" style={{ textTransform: "capitalize" }}>{e.m.map(m => MUSCLE_LABEL[m]).join(" · ")} · {e.eq}</div>
            </div>
            <span className="icon-btn sm round"><Icon name={replacing ? "swap" : "plus"} size={16} /></span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

// ---------- Edit exercise ----------
export function EditExerciseSheet({ payload, onClose }) {
  const { store, setStore, undoable, open } = useApp();
  const { dayKey, ei } = payload;
  const ex = store.wo[dayKey] && store.wo[dayKey].exercises[ei];
  const [f, setF] = useState(() => ex ? { name: ex.name, sets: ex.sets, reps: ex.reps, note: ex.note || "", rest: ex.rest || store.settings.restDefault, ss: !!ex.isSuperset, nameB: ex.nameB || "" } : null);
  if (!ex || !f) return null;
  const set = p => setF(x => ({ ...x, ...p }));
  const save = () => {
    setStore(p => {
      const exs = [...p.wo[dayKey].exercises];
      exs[ei] = { ...exs[ei], name: f.name.trim() || ex.name, sets: f.sets, reps: f.reps || "8-10", note: f.note.trim(),
        rest: f.rest === p.settings.restDefault ? undefined : f.rest, isSuperset: f.ss && !!f.nameB.trim(), nameB: f.nameB.trim() || undefined };
      return { ...p, wo: { ...p.wo, [dayKey]: { ...p.wo[dayKey], exercises: exs } } };
    });
    onClose();
  };
  const remove = () => { onClose(); undoable(`Removed ${ex.name}`, p => ({ ...p, wo: { ...p.wo, [dayKey]: { ...p.wo[dayKey], exercises: p.wo[dayKey].exercises.filter((_, j) => j !== ei) } } })); };
  return (
    <Sheet onClose={onClose} eyebrow={`${store.wo[dayKey].label} · #${ei + 1}`} title={ex.name}
      footer={<><button className="btn danger" onClick={remove}><Icon name="trash" size={16} /></button><button className="btn primary lg flex1" onClick={save}>Save changes</button></>}>
      <div className="grid-3" style={{ marginBottom: 18 }}>
        <button className="btn" onClick={() => { onClose(); open("exercise", { name: ex.name, reps: ex.reps }); }}><Icon name="chart" size={16} /> Stats</button>
        <button className="btn" onClick={() => { onClose(); open("addExercise", { dayKey, replaceIndex: ei }); }}><Icon name="swap" size={16} /> Swap</button>
        <button className="btn" onClick={() => { onClose(); open("tools", { tool: "plates" }); }}><Icon name="plate" size={16} /> Plates</button>
      </div>
      <label className="field-label">Name</label>
      <input className="field" value={f.name} onChange={e => set({ name: e.target.value })} list="exlib" style={{ marginBottom: 14 }} />
      <datalist id="exlib">{EXERCISE_LIBRARY.map(e => <option key={e.n} value={e.n} />)}</datalist>
      <div className="list" style={{ marginBottom: 14 }}>
        <div className="list-row"><span className="flex1" style={{ fontWeight: 600 }}>Sets</span><Stepper value={f.sets} onChange={v => set({ sets: v })} min={1} max={12} /></div>
        <div className="list-row"><span className="flex1" style={{ fontWeight: 600 }}>Rest</span><Stepper value={f.rest} onChange={v => set({ rest: v })} step={15} min={15} max={600} format={fmtTime} /></div>
        <div className="list-row"><span className="flex1" style={{ fontWeight: 600 }}>Superset</span><Toggle on={f.ss} onChange={v => set({ ss: v })} label="Superset" /></div>
      </div>
      {f.ss && <input className="field" placeholder="Paired exercise" list="exlib" value={f.nameB} onChange={e => set({ nameB: e.target.value })} style={{ marginBottom: 14 }} />}
      <div className="grid-2">
        <label><span className="field-label">Reps</span><input className="field center" value={f.reps} onChange={e => set({ reps: e.target.value })} /></label>
        <label><span className="field-label">Cue</span><input className="field" placeholder="3s lowering" value={f.note} onChange={e => set({ note: e.target.value })} /></label>
      </div>
    </Sheet>
  );
}

// ---------- Session summary ----------
export function SummarySheet({ payload, onClose }) {
  const { store, open } = useApp();
  const { session, prs } = payload;
  const unit = store.settings.unit;
  const prev = (store.sessHist || []).find(s => s.date < session.date && (s.dayKey === session.dayKey || s.day === session.day));
  const delta = prev && prev.volume ? Math.round((session.volume - prev.volume) / prev.volume * 100) : null;
  return (
    <Sheet onClose={onClose}
      footer={<><button className="btn lg" onClick={onClose}>Done</button><button className="btn primary lg flex1" onClick={() => { onClose(); open("share", { session }); }}><Icon name="share" size={17} /> Share</button></>}>
      <div style={{ textAlign: "center", padding: "10px 0 20px" }}>
        <div style={{ width: 64, height: 64, borderRadius: 22, background: "var(--accent)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", animation: "pop 0.5s var(--spring)" }}>
          <Icon name="check" size={32} stroke={2.8} />
        </div>
        <div className="caption" style={{ fontWeight: 600 }}>Workout complete</div>
        <div className="h-display" style={{ marginTop: 4 }}>{session.day}</div>
      </div>
      <div className="grid-2" style={{ marginBottom: 12 }}>
        <Stat label="Duration" value={fmtTimeLong(session.duration)} />
        <Stat label="Volume" value={fmtVol(session.volume)} unit={unit} sub={delta !== null ? `${delta >= 0 ? "+" : ""}${delta}% vs last time` : null} color={delta > 0 ? "var(--good)" : undefined} />
        <Stat label="Sets" value={session.sets} />
        <Stat label="Exercises" value={session.exercises} />
      </div>
      {prs.length > 0 ? (
        <div className="card hero" style={{ padding: 16 }}>
          <div className="row gap-8" style={{ marginBottom: 10 }}><Icon name="trophy" size={17} style={{ color: "var(--accent-ink)" }} /><span style={{ fontWeight: 700 }}>{prs.length} new record{prs.length > 1 ? "s" : ""}</span></div>
          {prs.map(([n, p]) => (
            <div key={n} className="row between" style={{ padding: "6px 0" }}><span className="ellipsis">{n}</span><span className="num" style={{ fontWeight: 700, color: "var(--accent-ink)" }}>{p.w} × {p.r}</span></div>
          ))}
        </div>
      ) : <div className="caption" style={{ textAlign: "center" }}>Consistency compounds. See you next session.</div>}
    </Sheet>
  );
}

// ---------- Share card (PNG) ----------
async function renderShareCard(session, store) {
  try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 800))]); } catch {}
  const cs = getComputedStyle(document.documentElement);
  const accent = cs.getPropertyValue("--accent").trim() || "#C6F432";
  const onAccent = cs.getPropertyValue("--on-accent").trim() || "#0A0A0C";
  const W = 1080, H = 1350;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  const unit = store.settings.unit;
  const sets = Object.values(store.log[session.date] || {}).filter(entryDone);
  const vol = session.volume || Math.round(sets.reduce((a, e) => a + entryVol(e), 0));
  const top = sessionTopSets(store, session.date).slice(0, 4);

  g.fillStyle = "#0A0A0C"; g.fillRect(0, 0, W, H);
  const grad = g.createRadialGradient(W, 0, 0, W, 0, 900);
  grad.addColorStop(0, accent + "55"); grad.addColorStop(1, "transparent");
  g.fillStyle = grad; g.fillRect(0, 0, W, H);

  const F = (w, s, fam = "Inter") => `${w} ${s}px '${fam}', -apple-system, sans-serif`;
  g.fillStyle = accent; g.beginPath(); g.roundRect ? g.roundRect(90, 96, 58, 58, 16) : g.rect(90, 96, 58, 58); g.fill();
  g.strokeStyle = onAccent; g.lineWidth = 6; g.lineCap = "round";
  [[108, 112, 108, 138], [130, 112, 130, 138], [108, 125, 130, 125]].forEach(([a, b, x, y]) => { g.beginPath(); g.moveTo(a, b); g.lineTo(x, y); g.stroke(); });
  g.fillStyle = "#F5F5F7"; g.font = F(700, 34, "Inter Tight"); g.fillText("Mercury", 168, 137);
  g.fillStyle = "rgba(235,235,245,0.6)"; g.font = F(500, 30); g.textAlign = "right";
  g.fillText(new Date(session.date + "T12:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }), W - 90, 137); g.textAlign = "left";

  g.fillStyle = "rgba(235,235,245,0.6)"; g.font = F(600, 36); g.fillText("Workout complete", 90, 330);
  let size = 150; g.font = F(800, size, "Inter Tight");
  while (g.measureText(session.day).width > W - 180 && size > 60) { size -= 6; g.font = F(800, size, "Inter Tight"); }
  g.fillStyle = "#F5F5F7"; g.fillText(session.day, 84, 330 + size);

  const stats = [["Volume", fmtVol(vol), unit], ["Time", fmtTimeLong(session.duration || 0), ""], ["Sets", String(sets.length || session.sets || "—"), ""], ["Streak", String(getStreak(store.hist, store.restDays || {})), "days"]];
  stats.forEach(([l, v, u], i) => {
    const x = 90 + (i % 2) * 460, y = 640 + Math.floor(i / 2) * 190;
    g.fillStyle = "rgba(255,255,255,0.06)"; g.beginPath(); g.roundRect ? g.roundRect(x, y, 440, 165, 32) : g.rect(x, y, 440, 165); g.fill();
    g.fillStyle = "rgba(235,235,245,0.55)"; g.font = F(600, 28); g.fillText(l, x + 32, y + 54);
    g.fillStyle = i === 3 ? accent : "#F5F5F7"; g.font = F(700, 64, "Inter Tight"); g.fillText(v, x + 32, y + 128);
    if (u) { const w = g.measureText(v).width; g.fillStyle = "rgba(235,235,245,0.5)"; g.font = F(600, 28); g.fillText(u, x + 44 + w, y + 128); }
  });

  g.fillStyle = "rgba(235,235,245,0.55)"; g.font = F(600, 28); g.fillText("Top sets", 90, 1050);
  top.forEach(([n, s], i) => {
    const y = 1110 + i * 54;
    g.fillStyle = "#F5F5F7"; g.font = F(600, 32);
    let label = n; while (g.measureText(label).width > 640 && label.length > 4) label = label.slice(0, -2);
    g.fillText(label === n ? n : label + "…", 90, y);
    g.fillStyle = accent; g.font = F(700, 32); g.textAlign = "right"; g.fillText(`${s.w || "BW"} × ${s.r}`, W - 90, y); g.textAlign = "left";
  });
  return new Promise(res => c.toBlob(b => res({ blob: b, url: c.toDataURL("image/png") }), "image/png"));
}

export function ShareSheet({ payload, onClose }) {
  const { store, flash } = useApp();
  const s = payload.session;
  const [img, setImg] = useState(null);
  useEffect(() => {
    let live = true;
    renderShareCard(s, store).then(r => live && setImg(r)).catch(e => { console.error("share card", e); if (live) setImg({ error: true }); });
    return () => { live = false; };
  }, []);
  const fname = `mercury-${s.date}.png`;
  const share = async () => {
    if (!img) return;
    try { await shareImage(fname, img.blob, s.day); }
    catch (e) { if (!e || e.name !== "AbortError") flash("Couldn't share the image", { icon: "info" }); }
  };
  const save = async () => {
    if (!img) return;
    try { await saveFile(fname, img.blob, "image/png"); if (!isNative) flash("Image saved", { icon: "download" }); }
    catch { flash("Couldn't save the image", { icon: "info" }); }
  };
  return (
    <Sheet onClose={onClose} title="Share" footer={<><button className="btn lg" onClick={save} aria-label="Save image"><Icon name="download" size={17} /></button><button className="btn primary lg flex1" onClick={share}><Icon name="share" size={17} /> Share</button></>}>
      <div style={{ aspectRatio: "4/5", borderRadius: 20, overflow: "hidden", background: "var(--card-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {img ? <img src={img.url} alt="Share card" style={{ width: "100%", height: "100%" }} /> : <span className="caption">Rendering…</span>}
      </div>
    </Sheet>
  );
}
