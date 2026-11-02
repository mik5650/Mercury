// Mercury — Fuel: calories, macros, water, meals
import { useState } from "react";
import { useApp, Ring, Section, Empty, Bars } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import { todayKey, addDays, fmtDate, uid, kcalOf, haptic } from "../lib/data.js";

const MACROS = [["p", "Protein", "var(--protein)"], ["c", "Carbs", "var(--carbs)"], ["f", "Fat", "var(--fat)"]];

export function FuelScreen() {
  const { store, setStore, flash, undoable, open } = useApp();
  const tk = todayKey();
  const [date, setDate] = useState(tk);
  const meals = store.macros[date] || [];
  const mt = store.macroTargets;
  const tot = meals.reduce((a, m) => ({ p: a.p + m.p, c: a.c + m.c, f: a.f + m.f }), { p: 0, c: 0, f: 0 });
  const kcal = kcalOf(tot);
  const target = kcalOf(mt);
  const left = target - kcal;
  const water = store.water[date] || 0;
  const goal = store.settings.waterGoal || 8;
  const isToday = date === tk;
  const prevDay = store.macros[addDays(date, -1)] || [];

  const addMeal = m => setStore(p => ({ ...p, macros: { ...p.macros, [date]: [...(p.macros[date] || []), { ...m, id: uid() }] } }));
  const setWater = v => { haptic(8); setStore(p => ({ ...p, water: { ...p.water, [date]: Math.max(0, v) } })); };

  const week = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(date, i - 6);
    const k = (store.macros[d] || []).reduce((a, m) => a + kcalOf(m), 0);
    return { d, label: fmtDate(d, { weekday: "narrow" }), value: k };
  });
  const avg = Math.round(week.filter(w => w.value).reduce((a, w) => a + w.value, 0) / Math.max(1, week.filter(w => w.value).length));

  return (
    <>
      <div className="row between rise" style={{ alignItems: "flex-end", marginBottom: 16 }}>
        <div className="h-display">Fuel</div>
        <button className="btn sm" onClick={() => open("targets")}><Icon name="sliders" size={15} /> Targets</button>
      </div>

      <div className="row between rise-1" style={{ marginBottom: 12, background: "var(--card-2)", borderRadius: 14, padding: 4 }}>
        <button className="icon-btn sm" style={{ background: "transparent" }} onClick={() => setDate(addDays(date, -1))} aria-label="Previous day"><Icon name="chev-l" size={18} /></button>
        <button onClick={() => setDate(tk)} style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 650, fontSize: 14.5 }}>{isToday ? "Today" : date === addDays(tk, -1) ? "Yesterday" : fmtDate(date, { weekday: "long" })}</div>
          <div className="caption" style={{ fontSize: 11.5 }}>{fmtDate(date, { month: "long", day: "numeric" })}</div>
        </button>
        <button className="icon-btn sm" style={{ background: "transparent" }} disabled={isToday} onClick={() => setDate(addDays(date, 1))} aria-label="Next day"><Icon name="chev-r" size={18} /></button>
      </div>

      {/* Hero */}
      <div className="card rise-2" style={{ padding: 18, marginBottom: 10 }}>
        <div className="row gap-16">
          <Ring pct={kcal / Math.max(1, target)} size={128} stroke={12} color={left < 0 ? "var(--bad)" : "var(--accent)"}>
            <span className="big-num" style={{ fontSize: 28 }}>{Math.abs(left).toLocaleString()}</span>
            <span className="caption" style={{ fontSize: 11.5 }}>{left >= 0 ? "kcal left" : "kcal over"}</span>
          </Ring>
          <div className="stack gap-12 flex1">
            {MACROS.map(([k, l, c]) => (
              <div key={k}>
                <div className="row between" style={{ marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{l}</span>
                  <span className="caption num" style={{ fontSize: 12 }}><b style={{ color: "var(--t1)" }}>{Math.round(tot[k])}</b> / {mt[k]}g</span>
                </div>
                <div className="bar"><div style={{ width: `${Math.min(100, tot[k] / Math.max(1, mt[k]) * 100)}%`, background: c }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="divider" style={{ margin: "16px 0 12px" }} />
        <div className="row between caption num">
          <span>Eaten <b style={{ color: "var(--t1)" }}>{kcal.toLocaleString()}</b></span>
          <span>Goal <b style={{ color: "var(--t1)" }}>{target.toLocaleString()}</b></span>
          <span>{meals.length} meals</span>
        </div>
      </div>

      {/* Water */}
      <div className="card rise-3" style={{ padding: 16, marginBottom: 10 }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <div className="row gap-8">
            <span style={{ color: "var(--water)" }}><Icon name="drop" size={20} /></span>
            <span style={{ fontWeight: 650 }}>Water</span>
            <span className="caption num">{water} / {goal} cups</span>
          </div>
          <div className="row gap-6">
            <button className="icon-btn sm" onClick={() => setWater(water - 1)} aria-label="Remove a cup"><Icon name="minus" size={15} /></button>
            <button className="icon-btn sm" style={{ background: "var(--water)", color: "#fff" }} onClick={() => setWater(water + 1)} aria-label="Add a cup"><Icon name="plus" size={15} stroke={2.4} /></button>
          </div>
        </div>
        <div className="row" style={{ gap: 5 }}>
          {Array.from({ length: Math.max(goal, water) }).map((_, i) => (
            <button key={i} onClick={() => setWater(i + 1 === water ? i : i + 1)} aria-label={`${i + 1} cups`}
              style={{ flex: 1, height: 30, borderRadius: 8, background: i < water ? "var(--water)" : "var(--card-3)", opacity: i < water ? (i >= goal ? 0.6 : 1) : 1, transition: "background 0.25s" }} />
          ))}
        </div>
      </div>

      {/* Quick add */}
      {(store.savedMeals || []).length > 0 && (
        <>
          <Section title="Quick add"><button className="link" onClick={() => open("meal", { date, manage: true })}>Manage</button></Section>
          <div className="hscroll">
            {store.savedMeals.map(s => (
              <button key={s.id} className="card tap" style={{ padding: "12px 14px", minWidth: 150, textAlign: "left" }}
                onClick={() => { addMeal({ meal: s.meal, p: s.p, c: s.c, f: s.f }); haptic(10); flash(`Added ${s.meal}`, { icon: "plus" }); }}>
                <div className="row between gap-8"><span className="ellipsis" style={{ fontWeight: 650, fontSize: 13.5, maxWidth: 130 }}>{s.meal}</span><Icon name="plus" size={15} style={{ color: "var(--accent-ink)" }} /></div>
                <div className="caption num" style={{ marginTop: 4, fontSize: 12 }}>{kcalOf(s)} kcal · {s.p}g P</div>
              </button>
            ))}
          </div>
        </>
      )}

      <Section title="Meals"><button className="link" onClick={() => open("meal", { date })}>+ Add</button></Section>
      {meals.length === 0 ? (
        <div className="card">
          <Empty icon="fuel" title="Nothing logged" action={
            <div className="row gap-8" style={{ justifyContent: "center" }}>
              <button className="btn primary sm" onClick={() => open("meal", { date })}><Icon name="plus" size={14} /> Add meal</button>
              {prevDay.length > 0 && <button className="btn sm" onClick={() => { prevDay.forEach(m => addMeal({ meal: m.meal, p: m.p, c: m.c, f: m.f })); flash(`Copied ${prevDay.length} meals`, { icon: "copy" }); }}><Icon name="copy" size={14} /> Copy previous day</button>}
            </div>
          }>Track meals to see macros fill up.</Empty>
        </div>
      ) : (
        <div className="list">
          {meals.map(m => {
            const fav = (store.savedMeals || []).some(s => s.meal === m.meal && s.p === m.p && s.c === m.c && s.f === m.f);
            return (
              <div key={m.id} className="list-row">
                <div className="flex1">
                  <div className="ellipsis" style={{ fontWeight: 650 }}>{m.meal}</div>
                  <div className="row gap-10 caption num" style={{ fontSize: 12, marginTop: 2 }}>
                    {MACROS.map(([k, l, c]) => <span key={k} className="row gap-6"><span className="dot" style={{ width: 6, height: 6, background: c }} />{m[k]}g</span>)}
                  </div>
                </div>
                <span className="num" style={{ fontWeight: 700 }}>{kcalOf(m)}</span>
                <button className="icon-btn sm ghost" style={{ color: fav ? "var(--carbs)" : "var(--t3)" }} aria-label="Save to quick add"
                  onClick={() => { if (!fav) { setStore(p => ({ ...p, savedMeals: [...(p.savedMeals || []), { meal: m.meal, p: m.p, c: m.c, f: m.f, id: uid() }] })); flash("Saved to Quick add", { icon: "star" }); } }}>
                  <Icon name="star" size={17} />
                </button>
                <button className="icon-btn sm ghost" aria-label="Remove meal" onClick={() => undoable("Meal removed", p => ({ ...p, macros: { ...p.macros, [date]: (p.macros[date] || []).filter(x => x.id !== m.id) } }))}><Icon name="x" size={16} /></button>
              </div>
            );
          })}
        </div>
      )}

      <Section title="Last 7 days"><span className="caption num">avg {avg.toLocaleString()} kcal</span></Section>
      <div className="card" style={{ padding: 16 }}>
        <Bars data={week} height={120} goal={target} selected={6} onSelect={i => setDate(week[i].d)} />
      </div>
    </>
  );
}
