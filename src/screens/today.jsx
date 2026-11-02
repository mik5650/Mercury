// Mercury — Today (home dashboard)
import { useMemo } from "react";
import { useApp, MultiRing, Section, Empty } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import {
  todayKey, addDays, weekStart, parseKey, fmtDate, fmtTime, fmtVol, weekDays, getStreak,
  suggestedDay, dayKeys, daySetCount, estimateMinutes, dayMuscles, MUSCLE_LABEL, greeting,
  kcalOf, buildInsights, haptic, entryDone,
} from "../lib/data.js";

export function TodayScreen() {
  const { store, setStore, open, setTab, now, flash } = useApp();
  const S = store.settings;
  const tk = todayKey();
  const keys = dayKeys(store.wo);
  const nextKey = suggestedDay(store);
  const next = store.wo[nextKey];
  const session = store.activeSession;
  const trainedToday = !!store.hist[tk];
  const todaySess = (store.sessHist || []).find(s => s.date === tk);
  const restToday = (store.restDays || {})[tk];
  const streak = getStreak(store.hist, store.restDays || {});

  const wk = weekDays(store.hist);
  const meals = store.macros[tk] || [];
  const kcal = meals.reduce((a, m) => a + kcalOf(m), 0);
  const target = kcalOf(store.macroTargets);
  const water = store.water[tk] || 0;
  const lastW = store.weights[store.weights.length - 1];
  const sleep = store.sleep.find(s => s.date === tk);
  const insights = useMemo(() => buildInsights(store), [store.log, store.weights, store.sleep, store.hist]);
  const recentPRs = Object.entries(store.prs || {}).filter(([, p]) => !p.first && p.date >= addDays(tk, -30)).sort((a, b) => b[1].date.localeCompare(a[1].date)).slice(0, 8);
  const doneToday = Object.values(store.log[tk] || {}).filter(entryDone).length;

  const ws = weekStart();
  const week = Array.from({ length: 7 }).map((_, i) => addDays(ws, i));

  const start = () => {
    haptic(30);
    if (!session) setStore(prev => ({ ...prev, activeSession: { start: Date.now(), dayKey: nextKey } }));
    setTab("train");
  };

  const rings = [
    { label: "Training", color: "var(--accent)", pct: wk / Math.max(1, S.weeklyGoal), value: `${wk}/${S.weeklyGoal}`, unit: "this week" },
    { label: "Fuel", color: "var(--carbs)", pct: kcal / Math.max(1, target), value: kcal.toLocaleString(), unit: `/ ${target.toLocaleString()} kcal` },
    { label: "Water", color: "var(--water)", pct: water / Math.max(1, S.waterGoal), value: `${water}/${S.waterGoal}`, unit: "cups" },
  ];

  return (
    <>
      {/* Header */}
      <div className="row between rise" style={{ marginBottom: 20 }}>
        <div className="flex1">
          <div className="caption" style={{ fontWeight: 600 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
          <div className="h-display" style={{ marginTop: 2, fontSize: 28 }}>{greeting(S.name)}</div>
        </div>
        <button className="avatar tap" onClick={() => open("settings")} aria-label="Settings">
          {S.name ? S.name[0].toUpperCase() : <Icon name="user" size={18} />}
        </button>
      </div>

      {/* Week strip */}
      <div className="card rise-1" style={{ padding: "14px 10px", marginBottom: 12 }}>
        <div className="row between" style={{ padding: "0 6px 10px" }}>
          <span className="label">This week</span>
          <span className="caption num" style={{ fontWeight: 600 }}>
            <Icon name="flame" size={13} style={{ verticalAlign: -2, color: "var(--accent-ink)", marginRight: 4 }} />
            {streak} day streak
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {week.map(d => {
            const trained = !!store.hist[d];
            const rest = (store.restDays || {})[d];
            const isToday = d === tk;
            const future = d > tk;
            return (
              <button key={d} onClick={() => !future && open("day", { date: d })} disabled={future} className="tap" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: future ? 0.4 : 1 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: isToday ? "var(--t1)" : "var(--t3)" }}>{parseKey(d).toLocaleDateString("en-US", { weekday: "narrow" })}</span>
                <span className="num" style={{
                  width: 34, height: 34, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13.5, fontWeight: 650,
                  background: trained ? "var(--accent)" : "transparent",
                  color: trained ? "var(--on-accent)" : isToday ? "var(--t1)" : "var(--t2)",
                  border: trained ? "none" : rest ? "2px solid var(--good)" : isToday ? "2px solid var(--t1)" : "1.5px solid var(--line-2)",
                }}>
                  {trained ? <Icon name="check" size={16} stroke={2.6} /> : parseKey(d).getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Up next */}
      {next && (
        <div className="card hero rise-2" style={{ padding: 20, marginBottom: 12 }}>
          <div className="row between" style={{ marginBottom: 10 }}>
            {session ? (
              <span className="pill accent"><span className="live" style={{ width: 6, height: 6 }} /> In progress · {fmtTime(Math.floor((now - session.start) / 1000))}</span>
            ) : trainedToday ? (
              <span className="pill good"><Icon name="check" size={12} stroke={2.6} /> Trained today</span>
            ) : restToday ? (
              <span className="pill good">Rest day</span>
            ) : (
              <span className="pill">Up next · Day {keys.indexOf(nextKey) + 1} of {keys.length}</span>
            )}
            <button className="link" onClick={() => setTab("train")}>Change</button>
          </div>
          <div className="big-num" style={{ fontSize: 34, marginBottom: 6 }}>{next.label}</div>
          <div className="caption" style={{ marginBottom: 14 }}>
            {dayMuscles(next).slice(0, 4).map(m => MUSCLE_LABEL[m]).join(" · ") || "Custom day"}
          </div>
          <div className="row gap-16" style={{ marginBottom: 16 }}>
            {[["Exercises", next.exercises.length], ["Sets", daySetCount(next)], ["Est.", `${estimateMinutes(next, S.restDefault)}m`]].map(([l, v]) => (
              <div key={l}>
                <div className="big-num" style={{ fontSize: 22 }}>{v}</div>
                <div className="caption" style={{ fontSize: 11.5, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
          <div className="stack gap-6" style={{ marginBottom: 18 }}>
            {next.exercises.slice(0, 4).map(ex => (
              <div key={ex.id} className="row between" style={{ fontSize: 13.5 }}>
                <span className="ellipsis" style={{ color: "var(--t2)" }}>{ex.name}</span>
                <span className="num muted" style={{ fontSize: 12.5, marginLeft: 10 }}>{ex.sets} × {ex.reps}</span>
              </div>
            ))}
            {next.exercises.length > 4 && <div className="caption muted">+{next.exercises.length - 4} more</div>}
          </div>
          <button className="btn primary lg block" onClick={start}>
            <Icon name="play" size={16} />
            {session ? "Continue workout" : doneToday ? "Resume workout" : "Start workout"}
          </button>
          {todaySess && !session && (
            <button className="btn ghost block" style={{ marginTop: 6 }} onClick={() => open("day", { date: tk })}>
              View today · {fmtVol(todaySess.volume)} {S.unit} · {Math.round(todaySess.duration / 60)} min
            </button>
          )}
        </div>
      )}

      {/* Rings */}
      <div className="card rise-3" style={{ padding: 18, marginBottom: 12, display: "flex", alignItems: "center", gap: 20 }}>
        <MultiRing rings={rings} size={124} stroke={12} gap={3} />
        <div className="stack gap-12 flex1">
          {rings.map(r => (
            <div key={r.label}>
              <div className="row gap-6"><span className="dot" style={{ background: r.color }} /><span className="caption" style={{ fontWeight: 600 }}>{r.label}</span></div>
              <div className="num" style={{ fontSize: 17, fontWeight: 700, marginTop: 2, letterSpacing: "-0.02em" }}>
                {r.value} <span className="caption" style={{ fontWeight: 500, fontSize: 12 }}>{r.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick log */}
      <div className="grid-2 rise-4">
        <QuickTile icon="scale" color="var(--protein)" label="Weight" value={lastW ? `${lastW.value}` : "—"} unit={lastW ? S.unit : ""}
          sub={lastW ? (lastW.date === tk ? "Logged today" : `Last ${fmtDate(lastW.date)}`) : "Tap to log"} onClick={() => open("weight")} />
        <QuickTile icon="drop" color="var(--water)" label="Water" value={water} unit={`/ ${S.waterGoal}`} sub="Tap + for a cup"
          onClick={() => setTab("fuel")}
          action={<button className="icon-btn sm round" style={{ background: "var(--water)", color: "#fff" }} aria-label="Add a cup of water"
            onClick={e => { e.stopPropagation(); haptic(10); setStore(p => ({ ...p, water: { ...p.water, [tk]: (p.water[tk] || 0) + 1 } })); flash(`${water + 1} cups today`, { icon: "drop" }); }}>
            <Icon name="plus" size={16} stroke={2.4} /></button>} />
        <QuickTile icon="fuel" color="var(--carbs)" label="Fuel" value={Math.max(0, target - kcal).toLocaleString()} unit="left" sub={`${meals.length} meal${meals.length === 1 ? "" : "s"} logged`} onClick={() => open("meal")} />
        <QuickTile icon="moon" color="var(--sleep)" label="Sleep" value={sleep ? sleep.hours : "—"} unit={sleep ? "h" : ""} sub={sleep ? ["", "Poor", "Fair", "OK", "Good", "Great"][sleep.quality] : "Log last night"} onClick={() => open("sleep")} />
      </div>
      <div className="row gap-8" style={{ marginTop: 10 }}>
        <button className="btn flex1" onClick={() => open("cardio")}><Icon name="run" size={17} /> Log cardio</button>
        <button className="btn flex1" onClick={() => open("restDay")}><Icon name="rest" size={17} /> {restToday ? "Rest logged" : "Rest day"}</button>
      </div>

      {/* Insights */}
      <Section title="Insights" />
      {insights.length === 0 ? (
        <div className="card"><Empty icon="sparkle" title="Insights appear as you log">Train a few sessions and Mercury will spot trends for you.</Empty></div>
      ) : (
        <div className="stack gap-8">
          {insights.map((it, i) => {
            const c = it.kind === "up" ? "var(--good)" : it.kind === "warn" ? "var(--warn)" : "var(--protein)";
            return (
              <div key={i} className="card" style={{ padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div className="row-icon" style={{ background: `color-mix(in srgb, ${c} 16%, transparent)`, color: c }}><Icon name={it.icon} size={18} /></div>
                <div className="flex1">
                  <div style={{ fontWeight: 650, fontSize: 14.5 }}>{it.title}</div>
                  <div className="caption" style={{ marginTop: 2, lineHeight: 1.45 }}>{it.body}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PRs */}
      {recentPRs.length > 0 && (
        <>
          <Section title="Recent records"><button className="link" onClick={() => setTab("progress")}>See all</button></Section>
          <div className="hscroll">
            {recentPRs.map(([n, p]) => (
              <button key={n} className="card tap" onClick={() => open("exercise", { name: n })} style={{ padding: 14, minWidth: 150, textAlign: "left" }}>
                <div className="row-icon" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)", width: 30, height: 30, borderRadius: 9, marginBottom: 10 }}><Icon name="trophy" size={15} /></div>
                <div className="caption ellipsis" style={{ fontWeight: 600, maxWidth: 140 }}>{n}</div>
                <div className="big-num" style={{ fontSize: 22, marginTop: 4 }}>{p.w}<span className="caption" style={{ fontSize: 13 }}> × {p.r}</span></div>
                <div className="caption muted" style={{ fontSize: 11.5, marginTop: 4 }}>{fmtDate(p.date)}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function QuickTile({ icon, color, label, value, unit, sub, onClick, action }) {
  return (
    <div className="card tap" role="button" tabIndex={0} onClick={onClick} onKeyDown={e => e.key === "Enter" && onClick()} style={{ padding: 14, cursor: "pointer" }}>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div className="row gap-8">
          <span style={{ color }}><Icon name={icon} size={18} /></span>
          <span className="caption" style={{ fontWeight: 600 }}>{label}</span>
        </div>
        {action}
      </div>
      <div className="row" style={{ alignItems: "baseline", gap: 4 }}>
        <span className="big-num" style={{ fontSize: 26 }}>{value}</span>
        <span className="caption" style={{ fontWeight: 600 }}>{unit}</span>
      </div>
      <div className="caption muted" style={{ fontSize: 11.5, marginTop: 4 }}>{sub}</div>
    </div>
  );
}
