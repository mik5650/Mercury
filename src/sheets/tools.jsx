// Mercury — tools, settings, year view, photos
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp, Sheet, Seg, Stepper, Toggle, Empty, Stat, NumInput } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import {
  todayKey, dkey, addDays, weekStart, parseKey, daysBetween, fmtDate, fmtTime, num, platesFor, warmupSets, epley1RM,
  allSets, convertUnits, migrate, freshStore, unlockAudio, beep, STORAGE_KEY, SET_TYPES,
} from "../lib/data.js";
import { saveFile, isNative, notificationPermission, requestNotifications } from "../lib/native.js";
import { healthAvailability, healthHasAccess, requestHealthAccess, openHealthSettings } from "../lib/health.js";

export const ACCENTS = [
  ["volt", "#C6F432", "Volt"], ["ember", "#FF6B3D", "Ember"], ["ocean", "#4C8DFF", "Ocean"],
  ["violet", "#9B7BFF", "Violet"], ["rose", "#FF4F7B", "Rose"], ["mint", "#34E0A1", "Mint"],
];

// ---------- Tools ----------
export function ToolsSheet({ payload, onClose }) {
  const { store } = useApp();
  const [tool, setTool] = useState(payload.tool || "plates");
  return (
    <Sheet onClose={onClose} tall title="Gym tools">
      <Seg value={tool} onChange={setTool} style={{ marginBottom: 18 }} options={[["plates", "Plates"], ["orm", "1RM"], ["warmup", "Warm-up"], ["convert", "lb⇄kg"]]} />
      {tool === "plates" && <Plates store={store} />}
      {tool === "orm" && <OneRM store={store} />}
      {tool === "warmup" && <Warmup store={store} />}
      {tool === "convert" && <Convert />}
    </Sheet>
  );
}

const PLATE = { 45: ["#E5484D", 120], 25: ["#E5484D", 120], 35: ["#F5C451", 108], 20: ["#4C8DFF", 114], 15: ["#F5C451", 100], 10: ["#30D158", 86], 5: ["#E8E8ED", 66], 2.5: ["#8E8E93", 52], 1.25: ["#636366", 44] };

function Barbell({ plates }) {
  return (
    <div className="row" style={{ justifyContent: "center", height: 140 }}>
      <div style={{ width: 60, height: 10, background: "var(--t3)", borderRadius: 3 }} />
      <div style={{ width: 10, height: 30, background: "var(--t2)", borderRadius: 3 }} />
      {plates.map((p, i) => {
        const [c, h] = PLATE[p] || ["#888", 50];
        return <div key={i} className="plate" style={{ width: p >= 10 ? 20 : 13, height: h, background: c, marginLeft: 2, color: p === 5 ? "#111" : "#fff", animation: `rise 0.3s ${i * 0.04}s both` }}>{p}</div>;
      })}
      <div style={{ width: 36, height: 10, background: "var(--t3)", marginLeft: 2, borderRadius: 3 }} />
    </div>
  );
}

function Plates({ store }) {
  const unit = store.settings.unit;
  const bars = unit === "kg" ? [20, 15, 10] : [45, 35, 15];
  const [bar, setBar] = useState(store.settings.bar || bars[0]);
  const [t, setT] = useState(unit === "kg" ? "100" : "225");
  const res = platesFor(t, unit, bar);
  const step = unit === "kg" ? 2.5 : 5;
  return (
    <>
      <div className="row gap-12" style={{ justifyContent: "center", marginBottom: 6 }}>
        <button className="icon-btn round" style={{ width: 50, height: 50 }} onClick={() => setT(String(Math.max(bar, num(t) - step)))} aria-label="Less"><Icon name="minus" size={20} /></button>
        <div style={{ textAlign: "center" }}>
          <NumInput className="big-num" value={t} onChange={setT} style={{ fontSize: 56, width: 180, textAlign: "center" }} aria-label="Target weight" />
          <div className="caption" style={{ fontWeight: 600 }}>{unit} total</div>
        </div>
        <button className="icon-btn round" style={{ width: 50, height: 50 }} onClick={() => setT(String(num(t) + step))} aria-label="More"><Icon name="plus" size={20} /></button>
      </div>
      <div className="card" style={{ padding: "6px 12px 16px", margin: "14px 0" }}>
        <Barbell plates={res.plates} />
        <div style={{ textAlign: "center" }}>
          <div className="label">Each side</div>
          <div className="big-num" style={{ fontSize: 24, marginTop: 6 }}>{res.plates.length ? res.plates.join(" + ") : num(t) <= bar ? "Empty bar" : "—"}</div>
          {res.rest > 0 && <div className="pill warn" style={{ marginTop: 10 }}>{res.rest} {unit} short — closest is {num(t) - res.rest}</div>}
        </div>
      </div>
      <label className="field-label">Bar</label>
      <Seg value={bar} onChange={setBar} options={bars.map(b => [b, `${b} ${unit}`])} />
    </>
  );
}

function OneRM({ store }) {
  const unit = store.settings.unit;
  const [w, setW] = useState("");
  const [r, setR] = useState("5");
  const W = num(w), R = num(r);
  const orm = W && R ? Math.round(((R === 1 ? W : W * (1 + R / 30)) + (R < 37 ? W * 36 / (37 - R) : 0)) / 2) : 0;
  const inc = unit === "kg" ? 2.5 : 5;
  return (
    <>
      <div className="grid-2" style={{ marginBottom: 14 }}>
        <label><span className="field-label">Weight · {unit}</span><NumInput className="field center" value={w} onChange={setW} placeholder="185" /></label>
        <label><span className="field-label">Reps</span><NumInput className="field center" decimal={false} value={r} onChange={setR} /></label>
      </div>
      <div className="card hero" style={{ padding: 22, textAlign: "center", marginBottom: 14 }}>
        <div className="label">Estimated 1RM</div>
        <div className="big-num" style={{ fontSize: 64, marginTop: 8 }}>{orm || "—"}<span className="caption" style={{ fontSize: 16 }}> {unit}</span></div>
        {R > 12 && <div className="pill warn" style={{ marginTop: 8 }}>Less accurate above 12 reps</div>}
      </div>
      {orm > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {[95, 90, 85, 80, 75, 70, 65, 60].map(p => (
            <div key={p} className="tile" style={{ padding: "10px 4px", textAlign: "center" }}>
              <div className="caption" style={{ fontSize: 11, fontWeight: 600 }}>{p}%</div>
              <div className="num" style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{Math.round(orm * p / 100 / inc) * inc}</div>
              <div className="caption muted" style={{ fontSize: 10.5 }}>~{Math.max(1, Math.round(30 * (100 / p - 1)))} reps</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Warmup({ store }) {
  const { unit, bar } = store.settings;
  const [w, setW] = useState(unit === "kg" ? "100" : "225");
  const sets = warmupSets(num(w), unit, bar);
  return (
    <>
      <label className="field-label">Working weight · {unit}</label>
      <NumInput className="field center" value={w} onChange={setW} style={{ fontSize: 20, height: 54, marginBottom: 14 }} />
      {sets.length === 0 ? <div className="card"><Empty icon="info">Working weight is at or below the bar.</Empty></div> : (
        <div className="list">
          {[...sets, { w: num(w), r: "Work", pct: "Work" }].map((s, i) => {
            const p = platesFor(s.w, unit, bar);
            const work = i === sets.length;
            return (
              <div key={i} className="list-row" style={work ? { background: "var(--accent-soft)" } : undefined}>
                <span className="pill" style={{ width: 48, justifyContent: "center" }}>{s.pct}</span>
                <span className="num flex1" style={{ fontSize: 18, fontWeight: 700 }}>{s.w} <span className="caption">× {s.r}</span></span>
                <span className="caption num">{p.plates.length ? p.plates.join("+") : "bar"}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="caption" style={{ marginTop: 12, lineHeight: 1.5 }}>~60s between warm-ups. Keep them crisp — practice, not work.</div>
    </>
  );
}

function Convert() {
  const [lb, setLb] = useState("225");
  const kg = lb === "" ? "" : (num(lb) * 0.45359237).toFixed(1);
  return (
    <>
      <div className="grid-2">
        <label><span className="field-label">Pounds</span><NumInput className="field center" value={lb} onChange={setLb} style={{ fontSize: 22, height: 58 }} /></label>
        <label><span className="field-label">Kilograms</span><NumInput className="field center" value={kg} onChange={v => setLb(v === "" ? "" : String(Math.round(num(v) * 22.0462262) / 10))} style={{ fontSize: 22, height: 58 }} /></label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 14 }}>
        {[45, 95, 135, 185, 225, 275, 315, 405].map(v => (
          <button key={v} className="tile tap" style={{ padding: "10px 4px", textAlign: "center" }} onClick={() => setLb(String(v))}>
            <div className="num" style={{ fontWeight: 700 }}>{v}</div><div className="caption num" style={{ fontSize: 11 }}>{(v * 0.45359237).toFixed(1)} kg</div>
          </button>
        ))}
      </div>
    </>
  );
}

// ---------- Settings ----------
function Row({ label, sub, children }) {
  return (
    <div className="list-row">
      <div className="flex1"><div style={{ fontWeight: 600 }}>{label}</div>{sub && <div className="caption" style={{ fontSize: 12 }}>{sub}</div>}</div>
      {children}
    </div>
  );
}

export function SettingsSheet({ onClose }) {
  const { store, setStore, flash, ask, autoBackup } = useApp();
  const S = store.settings;
  const file = useRef(null);
  const set = p => setStore(s => ({ ...s, settings: { ...s.settings, ...p } }));
  const [notifPerm, setNotifPerm] = useState("prompt");
  useEffect(() => { notificationPermission().then(setNotifPerm); }, []);
  const notifSub = notifPerm === "denied"
    ? (isNative ? "Blocked — allow in Android Settings › Apps › Mercury" : "Blocked by the browser for this site")
    : "Alerts you when rest ends while you're away";
  const toggleNotify = async v => {
    if (!v) { set({ notify: false }); return; }
    const p = await requestNotifications();
    setNotifPerm(p);
    set({ notify: p !== "denied" });
    if (p === "denied") flash("Notifications are blocked in system settings", { icon: "info" });
  };
  // Health Connect
  const [hc, setHc] = useState("unavailable");
  useEffect(() => { healthAvailability().then(setHc); }, []);
  const toggleHealth = async v => {
    if (!v) { set({ health: false }); return; }
    if (hc === "update") { openHealthSettings(); flash("Install or update Health Connect, then try again", { icon: "info" }); return; }
    const ok = (await healthHasAccess()) || (await requestHealthAccess());
    if (!ok) { flash("Health Connect access wasn't granted", { icon: "info" }); return; }
    set({ health: true });
    flash("Health Connect on — sending your workouts", { icon: "check" });
  };
  const size = useMemo(() => { try { return (localStorage.getItem(STORAGE_KEY) || "").length; } catch { return 0; } }, [store]);

  const unitChange = async u => {
    if (u === S.unit) return;
    const r = await ask({ title: `Switch to ${u}?`, message: `Convert every logged weight, or only change the label if your numbers are already in ${u}.`, confirm: "Convert my data", alt: "Only change the label", icon: "swap" });
    if (r === true) setStore(s => convertUnits(s, u));
    else if (r === "alt") set({ unit: u, bar: u === "kg" ? 20 : 45 });
    else return;
    flash(`Units: ${u}`);
  };
  const exportJSON = async () => {
    try { await saveFile(`mercury-backup-${todayKey()}.json`, JSON.stringify(store)); if (!isNative) flash("Backup downloaded", { icon: "download" }); }
    catch { flash("Backup cancelled", { icon: "info" }); }
  };
  const exportCSV = () => {
    const rows = [["date", "exercise", "set", "type", "weight", "reps", "rpe", "unit", "e1rm"]];
    allSets(store, true).sort((a, b) => a.date.localeCompare(b.date) || a.si - b.si).forEach(s => rows.push([
      s.date, `"${String(s.ex).replace(/"/g, '""')}"`, s.si + 1, s.t ? SET_TYPES[s.t].label : "Working", s.w, s.r, s.rpe, S.unit, s.t === "w" ? "" : epley1RM(s.w, s.r),
    ]));
    saveFile(`mercury-sets-${todayKey()}.csv`, rows.map(r => r.join(",")).join("\n"), "text/csv")
      .then(() => { if (!isNative) flash("CSV downloaded", { icon: "download" }); }).catch(() => {});
  };
  const importJSON = e => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    const r = new FileReader();
    r.onload = async () => {
      let d;
      try { d = JSON.parse(r.result); if (!d || !d.wo || !d.log) throw 0; }
      catch { flash("That file isn't a Mercury backup", { icon: "info" }); return; }
      if (!(await ask({ title: "Restore backup?", message: "Everything currently in the app will be replaced.", confirm: "Restore", danger: true, icon: "upload" }))) return;
      setStore(migrate(d)); flash("Backup restored", { icon: "upload" }); onClose();
    };
    r.readAsText(f);
  };
  const reset = async demo => {
    const ok = await ask(demo
      ? { title: "Load demo data?", message: "Your current data will be replaced by two months of sample training.", confirm: "Load demo", danger: true, icon: "sparkle" }
      : { title: "Erase everything?", message: "All workouts, meals, weights and photos will be deleted. Export a backup first if unsure.", confirm: "Erase all data", danger: true, icon: "trash" });
    if (!ok) return;
    const fresh = { ...freshStore(demo), settings: { ...S, unit: "lb", bar: 45, onboarded: true } };
    setStore(S.unit === "kg" ? convertUnits(fresh, "kg") : fresh);
    flash(demo ? "Demo data loaded" : "Fresh start"); onClose();
  };

  return (
    <Sheet onClose={onClose} tall title="Settings">
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={importJSON} />

      <div className="card hero" style={{ padding: 16, marginBottom: 18 }}>
        <div className="row gap-12">
          <div className="avatar" style={{ width: 52, height: 52, fontSize: 20, background: "var(--accent)", color: "var(--on-accent)", border: "none" }}>{S.name ? S.name[0].toUpperCase() : <Icon name="user" size={22} />}</div>
          <div className="flex1">
            <input className="field" style={{ height: 42, background: "var(--card-2)" }} placeholder="Your first name" value={S.name} onChange={e => set({ name: e.target.value.slice(0, 24) })} aria-label="Name" />
          </div>
        </div>
      </div>

      <div className="label" style={{ margin: "0 2px 10px" }}>Appearance</div>
      <div className="card" style={{ padding: 16, marginBottom: 10 }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          {ACCENTS.map(([id, c, l]) => (
            <button key={id} className={"swatch tap" + (S.accent === id ? " on" : "")} onClick={() => set({ accent: id })} aria-label={l} title={l}>
              <span style={{ width: 32, height: 32, borderRadius: 99, background: c, display: "flex", alignItems: "center", justifyContent: "center", color: id === "volt" || id === "mint" ? "#0A0A0C" : "#fff" }}>
                {S.accent === id && <Icon name="check" size={16} stroke={2.8} />}
              </span>
            </button>
          ))}
        </div>
        <Seg value={S.theme} onChange={v => set({ theme: v })} options={[["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]]} />
      </div>

      <div className="label" style={{ margin: "18px 2px 10px" }}>Training</div>
      <div className="list" style={{ marginBottom: 10 }}>
        <Row label="Units"><Seg value={S.unit} onChange={unitChange} small options={[["lb", "lb"], ["kg", "kg"]]} style={{ width: 110 }} /></Row>
        <Row label="Default rest"><Stepper value={S.restDefault} onChange={v => set({ restDefault: v })} step={15} min={15} max={600} format={fmtTime} /></Row>
        <Row label="Auto-start rest" sub="When you tick a set"><Toggle on={S.autoRest} onChange={v => set({ autoRest: v })} label="Auto-start rest" /></Row>
        <Row label="Rest sound"><Toggle on={S.sound} onChange={v => { set({ sound: v }); if (v) { unlockAudio(); beep(1); } }} label="Rest sound" /></Row>
        <Row label="Rest notification" sub={notifSub}><Toggle on={S.notify && notifPerm !== "denied"} onChange={toggleNotify} label="Rest notification" /></Row>
        {isNative && hc !== "unavailable" && (
          <Row label="Health Connect" sub={S.health ? "Workouts and weigh-ins are sent automatically" : "Send workouts, calories and weigh-ins to your health app"}>
            <Toggle on={!!S.health} onChange={toggleHealth} label="Health Connect" />
          </Row>
        )}
        {isNative && S.health && (
          <button className="list-row" style={{ width: "100%", textAlign: "left" }} onClick={openHealthSettings}>
            <div className="flex1" style={{ fontWeight: 600 }}>Manage Health Connect access</div>
            <Icon name="chev-r" size={18} />
          </button>
        )}
        <Row label="Bar weight"><Stepper value={S.bar} onChange={v => set({ bar: v })} step={5} min={0} max={60} format={v => `${v}`} /></Row>
        <Row label="Weekly goal" sub="Sessions per week"><Stepper value={S.weeklyGoal} onChange={v => set({ weeklyGoal: v })} min={1} max={7} /></Row>
      </div>

      <div className="label" style={{ margin: "18px 2px 10px" }}>Body & fuel</div>
      <div className="list" style={{ marginBottom: 10 }}>
        <Row label="Goal weight"><NumInput className="field center" style={{ width: 96, height: 38 }} placeholder="—" value={S.weightGoal} onChange={v => set({ weightGoal: v })} aria-label="Goal weight" /></Row>
        <Row label="Water goal"><Stepper value={S.waterGoal} onChange={v => set({ waterGoal: v })} min={1} max={20} format={v => `${v} cups`} /></Row>
      </div>

      <div className="label" style={{ margin: "18px 2px 10px" }}>Data</div>
      <div className="card" style={{ padding: 14, marginBottom: 8 }}>
        <div className="row between caption" style={{ marginBottom: 8 }}><span>Stored on this device</span><span className="num">{(size / 1048576).toFixed(2)} / ~5 MB</span></div>
        <div className="bar"><div style={{ width: `${Math.min(100, size / 52428.8)}%`, background: size > 4e6 ? "var(--bad)" : "var(--good)" }} /></div>
      </div>
      {isNative && (
        <div className="list" style={{ marginBottom: 8 }}>
          <Row label="Weekly auto-backup" sub={S.lastAutoBackup ? `Last ${fmtDate(dkey(new Date(S.lastAutoBackup)), { month: "short", day: "numeric" })} · Documents/Mercury` : "Saved to Documents/Mercury on your phone"}>
            <Toggle on={S.autoBackup} onChange={v => set({ autoBackup: v })} label="Weekly auto-backup" />
          </Row>
          <button className="list-row" style={{ width: "100%", textAlign: "left" }} onClick={async () => {
            const path = await autoBackup(true);
            flash(path ? "Backup saved to Documents/Mercury" : "Couldn't save the backup", { icon: path ? "check" : "info" });
          }}>
            <div className="flex1"><div style={{ fontWeight: 600 }}>Back up now</div><div className="caption" style={{ fontSize: 12 }}>Restore picks it up from Documents/Mercury</div></div>
            <Icon name="download" size={18} />
          </button>
        </div>
      )}
      <div className="grid-2" style={{ gap: 8, marginBottom: 8 }}>
        <button className="btn" onClick={exportJSON}><Icon name="download" size={16} /> Backup</button>
        <button className="btn" onClick={() => file.current?.click()}><Icon name="upload" size={16} /> Restore</button>
        <button className="btn" onClick={exportCSV}><Icon name="note" size={16} /> Export CSV</button>
        <button className="btn" onClick={() => reset(true)}><Icon name="sparkle" size={16} /> Demo data</button>
      </div>
      <button className="btn danger block" onClick={() => reset(false)}>Erase everything</button>
      <div className="caption" style={{ textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>Mercury 3.3 · Your data stays on this device.<br />Back up before clearing browser data or switching phones.</div>
    </Sheet>
  );
}

// ---------- Year ----------
export function YearSheet({ onClose }) {
  const { store, open } = useApp();
  const tk = todayKey();
  const start = addDays(weekStart(), -7 * 52);
  const cells = [];
  for (let k = start; k <= addDays(weekStart(), 6); k = addDays(k, 1)) cells.push(k);
  const rest = store.restDays || {};
  const past = cells.filter(k => k <= tk);
  const trained = past.filter(k => store.hist[k]).length;
  const first = past.find(k => store.hist[k]);
  const span = first ? Math.max(1, Math.min(52, Math.ceil((daysBetween(first, tk) + 1) / 7))) : 1;
  const months = [];
  for (let w = 0; w < cells.length / 7; w++) { const d = parseKey(cells[w * 7]); if (d.getDate() <= 7) months.push({ w, l: d.toLocaleDateString("en-US", { month: "short" }) }); }
  const sc = useRef(null);
  useEffect(() => { if (sc.current) sc.current.scrollLeft = 9999; }, []);
  return (
    <Sheet onClose={onClose} title="Your year">
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <Stat label="Trained" value={trained} unit="days" color="var(--accent-ink)" />
        <Stat label="Rest" value={past.filter(k => rest[k]).length} unit="days" />
        <Stat label="Per week" value={(trained / span).toFixed(1)} />
      </div>
      <div ref={sc} style={{ overflowX: "auto", paddingBottom: 8 }}>
        <div style={{ position: "relative", height: 16, width: "max-content", minWidth: "100%" }}>
          {months.map(m => <span key={m.w} className="caption" style={{ position: "absolute", left: m.w * 15, fontSize: 10.5 }}>{m.l}</span>)}
        </div>
        <div style={{ display: "grid", gridTemplateRows: "repeat(7, 12px)", gridAutoFlow: "column", gridAutoColumns: "12px", gap: 3, width: "max-content" }}>
          {cells.map(k => (
            <button key={k} disabled={k > tk} title={fmtDate(k)} onClick={() => { onClose(); open("day", { date: k }); }}
              style={{ width: 12, height: 12, borderRadius: 3, opacity: k > tk ? 0.2 : 1, background: store.hist[k] ? "var(--accent)" : rest[k] ? "rgba(48,209,88,0.4)" : "var(--card-3)", outline: k === tk ? "1.5px solid var(--t1)" : "none" }} />
          ))}
        </div>
      </div>
    </Sheet>
  );
}

// ---------- Photos ----------
export function PhotoCompareSheet({ onClose }) {
  const { store } = useApp();
  const ph = store.photos;
  const [a, setA] = useState(ph[0]);
  const [b, setB] = useState(ph[ph.length - 1]);
  const [x, setX] = useState(50);
  const box = useRef(null);
  const drag = useRef(false);
  const move = cx => { const r = box.current.getBoundingClientRect(); setX(Math.max(0, Math.min(100, (cx - r.left) / r.width * 100))); };
  if (!a || !b || ph.length < 2) return <Sheet onClose={onClose} title="Compare"><Empty icon="camera">Add at least two photos.</Empty></Sheet>;
  return (
    <Sheet onClose={onClose} tall title="Compare" subtitle={`${daysBetween(a.date, b.date)} days apart`}>
      <div ref={box} onPointerDown={e => { drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); move(e.clientX); }} onPointerMove={e => drag.current && move(e.clientX)} onPointerUp={() => { drag.current = false; }}
        style={{ position: "relative", aspectRatio: "3/4", borderRadius: 20, overflow: "hidden", background: "#000", touchAction: "none", cursor: "ew-resize", marginBottom: 16 }}>
        <img src={a.data} alt="Before" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 0 0 ${x}%)` }}><img src={b.data} alt="After" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${x}%`, width: 3, marginLeft: -1.5, background: "#fff" }}>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 40, height: 40, borderRadius: 99, background: "#fff", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}><Icon name="swap" size={18} /></div>
        </div>
        <span className="pill" style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.55)", color: "#fff" }}>{fmtDate(a.date)}</span>
        <span className="pill" style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.55)", color: "#fff" }}>{fmtDate(b.date)}</span>
      </div>
      {[["Before", a, setA], ["After", b, setB]].map(([l, v, sv]) => (
        <div key={l} style={{ marginBottom: 12 }}>
          <div className="label" style={{ marginBottom: 8 }}>{l}</div>
          <div className="hscroll">{ph.map((p, i) => (
            <button key={p.id || i} onClick={() => sv(p)} style={{ width: 54, height: 72, flexShrink: 0, borderRadius: 12, overflow: "hidden", outline: v === p ? "2.5px solid var(--accent)" : "none", outlineOffset: -2.5, opacity: v === p ? 1 : 0.6 }}>
              <img src={p.data} alt={fmtDate(p.date)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}</div>
        </div>
      ))}
    </Sheet>
  );
}

function dataURLtoBlob(d) {
  const [h, b] = d.split(",");
  const bin = atob(b); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: h.match(/:(.*?);/)[1] });
}

export function PhotoSheet({ payload, onClose }) {
  const { undoable } = useApp();
  const p = payload.photo;
  return (
    <Sheet onClose={onClose} title={fmtDate(p.date, { month: "long", day: "numeric", year: "numeric" })}
      footer={<><button className="btn danger lg" onClick={() => { onClose(); undoable("Photo deleted", s => ({ ...s, photos: s.photos.filter(x => p.id ? x.id !== p.id : x.data !== p.data) })); }}><Icon name="trash" size={17} /></button>
        <button className="btn lg flex1" onClick={() => saveFile(`mercury-${p.date}.jpg`, dataURLtoBlob(p.data), "image/jpeg").catch(() => {})}><Icon name="download" size={17} /> Save image</button></>}>
      <img src={p.data} alt="" style={{ width: "100%", borderRadius: 20 }} />
    </Sheet>
  );
}
