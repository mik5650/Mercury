// Mercury — Progress: overview, lifts, muscles, history
import { Fragment, useMemo, useState } from "react";
import { useApp, Seg, Section, Empty, Bars, AreaChart, SearchField, Stat } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import { MuscleMap } from "../ui/anatomy.jsx";
import { CARDIO_KINDS } from "./train.jsx";
import {
  todayKey, addDays, weekStart, parseKey, fmtDate, fmtTimeLong, fmtVol, getStreak, weekStreak, weekDays, weekVol,
  allSets, exerciseSessions, epley1RM, setsPerMuscle, muscleRecovery, MUSCLES, MUSCLE_LABEL, dayKeys,
} from "../lib/data.js";

export function ProgressScreen() {
  const [sec, setSec] = useState(() => { try { return sessionStorage.getItem("m3_prog") || "overview"; } catch { return "overview"; } });
  const pick = s => { setSec(s); try { sessionStorage.setItem("m3_prog", s); } catch {} };
  return (
    <>
      <div className="h-display rise" style={{ marginBottom: 16 }}>Progress</div>
      <Seg value={sec} onChange={pick} style={{ marginBottom: 18 }}
        options={[["overview", "Overview"], ["lifts", "Lifts"], ["muscles", "Muscles"], ["history", "History"]]} />
      {sec === "overview" && <Overview />}
      {sec === "lifts" && <Lifts />}
      {sec === "muscles" && <Muscles />}
      {sec === "history" && <History />}
    </>
  );
}

function Overview() {
  const { store, open } = useApp();
  const S = store.settings;
  const tk = todayKey();
  const streak = getStreak(store.hist, store.restDays || {});
  const wStreak = weekStreak(store.hist, S.weeklyGoal);
  const total = Object.keys(store.hist).filter(k => store.hist[k]).length;
  const recent = (store.sessHist || []).filter(s => s.date >= addDays(tk, -30));
  const avgDur = recent.length ? recent.reduce((a, s) => a + (s.duration || 0), 0) / recent.length : 0;
  const prs30 = Object.values(store.prs || {}).filter(p => !p.first && p.date >= addDays(tk, -30)).length;

  const ws = weekStart();
  const weeks = Array.from({ length: 8 }).map((_, i) => {
    const s = addDays(ws, -7 * (7 - i)), e = addDays(s, 6);
    let v = 0;
    Object.entries(store.volHist).forEach(([k, x]) => { if (k >= s && k <= e) v += x; });
    return { label: i === 7 ? "Now" : fmtDate(s, { month: "numeric", day: "numeric" }), value: v, top: v ? fmtVol(v) : "" };
  });
  const cur = weeks[7].value, prev = weeks[6].value;
  const delta = prev ? Math.round((cur - prev) / prev * 100) : null;

  // 12-week heatmap, Monday-aligned
  const start = addDays(ws, -7 * 11);
  const cells = Array.from({ length: 84 }).map((_, i) => addDays(start, i));
  const rest = store.restDays || {};

  return (
    <div className="rise-1">
      <div className="grid-2" style={{ marginBottom: 10 }}>
        <div className="card hero" style={{ padding: 16 }}>
          <div className="row gap-6"><Icon name="flame" size={16} style={{ color: "var(--accent-ink)" }} /><span className="label">Day streak</span></div>
          <div className="big-num" style={{ fontSize: 44, marginTop: 10 }}>{streak}</div>
          <div className="caption" style={{ marginTop: 4 }}>Rest days keep it alive</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div className="row gap-6"><Icon name="calendar" size={16} style={{ color: "var(--t2)" }} /><span className="label">Week streak</span></div>
          <div className="big-num" style={{ fontSize: 44, marginTop: 10 }}>{wStreak}</div>
          <div className="caption" style={{ marginTop: 4 }}>Weeks at {S.weeklyGoal}+ sessions</div>
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 10 }}>
        <div className="row between" style={{ marginBottom: 4 }}>
          <span className="label">Weekly volume</span>
          {prev > 0 && <span className="caption num">Last week {fmtVol(prev)}</span>}
        </div>
        <div className="row" style={{ alignItems: "baseline", gap: 6, marginBottom: 14 }}>
          <span className="big-num" style={{ fontSize: 30 }}>{fmtVol(cur)}</span>
          <span className="caption">{S.unit} this week</span>
        </div>
        <Bars data={weeks} height={130} />
      </div>

      <div className="grid-3" style={{ marginBottom: 10 }}>
        <Stat label="Sessions" value={total} />
        <Stat label="Avg time" value={avgDur ? Math.round(avgDur / 60) : "—"} unit="min" />
        <Stat label="PRs · 30d" value={prs30} color={prs30 ? "var(--accent-ink)" : undefined} />
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <span className="label">Consistency · 12 weeks</span>
          <button className="link" onClick={() => open("year")}>Full year</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "16px repeat(12, 1fr)", gap: 4 }}>
          {["M", "", "W", "", "F", "", "S"].map((d, row) => (
            <Fragment key={"r" + row}>
              <span className="caption" style={{ fontSize: 9.5, lineHeight: "18px" }}>{d}</span>
              {Array.from({ length: 12 }).map((_, w) => {
                const k = cells[w * 7 + row];
                const future = k > tk;
                const tr = !!store.hist[k];
                return (
                  <button key={k} disabled={future} onClick={() => open("day", { date: k })} aria-label={fmtDate(k)}
                    style={{ aspectRatio: "1", borderRadius: 5, opacity: future ? 0.25 : 1,
                      background: tr ? "var(--accent)" : rest[k] ? "rgba(48,209,88,0.35)" : "var(--card-3)",
                      outline: k === tk ? "2px solid var(--t1)" : "none", outlineOffset: 1 }} />
                );
              })}
            </Fragment>
          ))}
        </div>
        <div className="row gap-12" style={{ justifyContent: "flex-end", marginTop: 12 }}>
          {[["var(--accent)", "Trained"], ["rgba(48,209,88,0.35)", "Rest"], ["var(--card-3)", "Off"]].map(([c, l]) => (
            <span key={l} className="row gap-6 caption" style={{ fontSize: 11.5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Lifts() {
  const { store, open } = useApp();
  const [q, setQ] = useState("");
  const lifts = useMemo(() => {
    const by = {};
    allSets(store).forEach(s => {
      if (!s.ex || s.ex === "Unknown") return;
      const b = by[s.ex] = by[s.ex] || { name: s.ex, sets: 0, best: 0, last: "", dates: new Set() };
      b.sets++; b.best = Math.max(b.best, epley1RM(s.w, s.r)); if (s.date > b.last) b.last = s.date; b.dates.add(s.date);
    });
    return Object.values(by).sort((a, b) => b.dates.size - a.dates.size || b.last.localeCompare(a.last));
  }, [store.log]);
  const featured = lifts.filter(l => l.best > 0).slice(0, 4);
  const list = lifts.filter(l => l.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.last.localeCompare(a.last));
  const unit = store.settings.unit;

  if (!lifts.length) return <div className="card"><Empty icon="dumbbell" title="No lifts yet">Tick a set in Train and it shows up here.</Empty></div>;

  return (
    <div className="rise-1">
      {!q && (
        <div className="grid-2" style={{ marginBottom: 14 }}>
          {featured.map(l => <LiftCard key={l.name} lift={l} unit={unit} onClick={() => open("exercise", { name: l.name })} />)}
        </div>
      )}
      <div style={{ marginBottom: 12 }}><SearchField value={q} onChange={setQ} placeholder="Search lifts" /></div>
      <div className="list">
        {list.map(l => {
          const pr = store.prs[l.name];
          return (
            <button key={l.name} className="list-row tap" onClick={() => open("exercise", { name: l.name })}>
              <div className="flex1" style={{ textAlign: "left" }}>
                <div className="ellipsis" style={{ fontWeight: 650 }}>{l.name}</div>
                <div className="caption num">{l.dates.size} session{l.dates.size === 1 ? "" : "s"} · {fmtDate(l.last)}{pr ? ` · best ${pr.w}×${pr.r}` : ""}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="big-num" style={{ fontSize: 19 }}>{l.best || "BW"}</div>
                <div className="caption" style={{ fontSize: 10.5 }}>e1RM</div>
              </div>
              <Icon name="chev-r" size={16} style={{ color: "var(--t3)" }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LiftCard({ lift, unit, onClick }) {
  const { store } = useApp();
  const sess = useMemo(() => exerciseSessions(store, lift.name).reverse().slice(-12), [store.log, lift.name]);
  const pts = sess.map(s => ({ date: s.date, value: s.best1RM }));
  const first = pts[0], last = pts[pts.length - 1];
  const pct = first && last && first.value ? Math.round((last.value - first.value) / first.value * 100) : 0;
  return (
    <button className="card tap" onClick={onClick} style={{ padding: 14, textAlign: "left", overflow: "hidden" }}>
      <div className="caption ellipsis" style={{ fontWeight: 600 }}>{lift.name}</div>
      <div className="row" style={{ alignItems: "baseline", gap: 4, marginTop: 6 }}>
        <span className="big-num" style={{ fontSize: 24 }}>{lift.best}</span>
        <span className="caption">{unit}</span>
        {pct !== 0 && <span className={"pill " + (pct > 0 ? "good" : "warn")} style={{ marginLeft: "auto", height: 20, fontSize: 10.5 }}>{pct > 0 ? "+" : ""}{pct}%</span>}
      </div>
      <div style={{ margin: "10px -14px -14px" }}>{pts.length > 1 ? <AreaChart data={pts} height={46} /> : <div style={{ height: 46 }} />}</div>
    </button>
  );
}

function Muscles() {
  const { store } = useApp();
  const [days, setDays] = useState(7);
  const sets = useMemo(() => setsPerMuscle(store, days), [store.log, store.wo, days]);
  const max = Math.max(1, ...Object.values(sets));
  const intensity = {};
  Object.entries(sets).forEach(([m, v]) => { intensity[m] = v / max; });
  const weekly = v => (v / days) * 7;
  const weeklySets = {};
  Object.entries(sets).forEach(([m, v]) => { weeklySets[m] = weekly(v); });
  const keys = dayKeys(store.wo);
  const rec = muscleRecovery(store.muscleHist, keys);

  return (
    <div className="rise-1">
      <div className="card" style={{ padding: 14, marginBottom: 10 }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <span className="label">Muscle load</span>
          <Seg value={days} onChange={setDays} small options={[[7, "7d"], [14, "14d"], [28, "28d"]]} style={{ width: 150 }} />
        </div>
        <MuscleMap intensity={intensity} sets={weeklySets} />
      </div>

      <Section title="Weekly sets"><span className="caption">target 10–20</span></Section>
      <div className="card" style={{ padding: 16 }}>
        {MUSCLES.map(m => {
          const v = weekly(sets[m] || 0);
          const c = v === 0 ? "var(--card-3)" : v < 10 ? "var(--warn)" : v <= 20 ? "var(--good)" : "var(--accent)";
          return (
            <div key={m} style={{ display: "grid", gridTemplateColumns: "92px 1fr 30px", gap: 10, alignItems: "center", padding: "6px 0" }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{MUSCLE_LABEL[m]}</span>
              <div style={{ position: "relative", height: 8, background: "var(--card-3)", borderRadius: 99 }}>
                <div style={{ position: "absolute", left: "40%", width: "40%", top: -3, bottom: -3, borderLeft: "1.5px dashed var(--t4)", borderRight: "1.5px dashed var(--t4)" }} />
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 99, width: `${Math.min(100, v / 25 * 100)}%`, background: c, transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)" }} />
              </div>
              <span className="num" style={{ fontSize: 13, fontWeight: 700, textAlign: "right", color: v ? "var(--t1)" : "var(--t3)" }}>{Math.round(v)}</span>
            </div>
          );
        })}
      </div>

      <Section title="Recovery" />
      <div className="list">
        {keys.map(k => {
          const d = rec[k];
          const c = d === null ? "var(--t4)" : d <= 1 ? "var(--accent)" : d === 2 ? "var(--warn)" : "var(--good)";
          const l = d === null ? "No data" : d === 0 ? "Trained today" : d === 1 ? "Recovering" : d === 2 ? "Almost ready" : `Fresh · ${d} days`;
          return (
            <div key={k} className="list-row">
              <span className="dot" style={{ background: c, width: 10, height: 10 }} />
              <span className="flex1" style={{ fontWeight: 600 }}>{store.wo[k].label}</span>
              <span className="caption" style={{ fontWeight: 600 }}>{l}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function History() {
  const { store, open } = useApp();
  const unit = store.settings.unit;
  const dist = unit === "kg" ? "km" : "mi";
  const items = [
    ...(store.sessHist || []).map(s => ({ type: "lift", date: s.date, s })),
    ...(store.cardio || []).map(c => ({ type: "cardio", date: c.date, c })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 80);
  if (!items.length) return <div className="card"><Empty icon="history" title="No sessions yet">Finish a workout to see it here.</Empty></div>;
  const groups = [];
  items.forEach(it => {
    const m = fmtDate(it.date, { month: "long", year: "numeric" });
    if (!groups.length || groups[groups.length - 1].m !== m) groups.push({ m, items: [] });
    groups[groups.length - 1].items.push(it);
  });
  return (
    <div className="rise-1">
      {groups.map(g => (
        <div key={g.m} style={{ marginBottom: 18 }}>
          <div className="label" style={{ margin: "0 4px 8px" }}>{g.m}</div>
          <div className="list">
            {g.items.map((it, i) => it.type === "lift" ? (
              <div key={"l" + (it.s.id || i)} className="list-row">
                <button className="row gap-12 flex1 tap" style={{ textAlign: "left" }} onClick={() => open("day", { date: it.date })}>
                  <DateBadge date={it.date} />
                  <div className="flex1">
                    <div style={{ fontWeight: 650 }}>{it.s.day}</div>
                    <div className="caption num">{fmtTimeLong(it.s.duration || 0)} · {fmtVol(it.s.volume)} {unit}{it.s.sets ? ` · ${it.s.sets} set${it.s.sets === 1 ? "" : "s"}` : ""}</div>
                  </div>
                </button>
                <button className="icon-btn sm ghost" onClick={() => open("share", { session: it.s })} aria-label="Share"><Icon name="share" size={17} /></button>
              </div>
            ) : (
              <div key={"c" + it.c.id} className="list-row">
                <DateBadge date={it.date} />
                <div className="flex1">
                  <div style={{ fontWeight: 650 }}>{(CARDIO_KINDS.find(k => k.id === it.c.kind) || { label: "Cardio" }).label}</div>
                  <div className="caption num">{it.c.minutes} min{it.c.distance ? ` · ${it.c.distance} ${dist}` : ""}</div>
                </div>
                <span className="pill">Cardio</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DateBadge({ date }) {
  const d = parseKey(date);
  return (
    <div style={{ width: 40, height: 44, borderRadius: 12, background: "var(--card-2)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--accent-ink)", textTransform: "uppercase" }}>{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
      <span className="num" style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>{d.getDate()}</span>
    </div>
  );
}
