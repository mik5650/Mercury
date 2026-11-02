// Mercury — Body: weight trend, sleep, measurements, photos
import { useMemo, useRef, useState } from "react";
import { useApp, Seg, Section, Empty, AreaChart, Bars, Stat } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import { todayKey, addDays, daysBetween, fmtDate, num, uid, weightTrend, compressImage } from "../lib/data.js";

export const MEASURES = [["waist", "Waist"], ["chest", "Chest"], ["arm", "Arm"], ["thigh", "Thigh"], ["bf", "Body fat"]];

export function BodyScreen() {
  const { store, setStore, flash, undoable, open } = useApp();
  const S = store.settings;
  const unit = S.unit;
  const len = unit === "kg" ? "cm" : "in";
  const tk = todayKey();
  const [range, setRange] = useState("90");
  const [showAll, setShowAll] = useState(false);
  const photoRef = useRef(null);

  const weights = store.weights;
  const trend = useMemo(() => weightTrend(weights), [weights]);
  const from = range === "all" ? "0000" : addDays(tk, -parseInt(range));
  const shown = weights.filter(w => w.date >= from);
  const trendShown = trend.filter(t => t.date >= from);
  const cur = trend[trend.length - 1];
  const last = weights[weights.length - 1];
  const t28 = trend.filter(t => t.date <= addDays(tk, -28)).slice(-1)[0];
  const rate = cur && t28 ? (cur.value - t28.value) / (daysBetween(t28.date, cur.date) / 7) : null;
  const change = shown.length > 1 ? shown[shown.length - 1].value - shown[0].value : 0;
  const goal = num(S.weightGoal);

  const sleep7 = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(tk, i - 6);
    const s = store.sleep.find(x => x.date === d);
    return { label: fmtDate(d, { weekday: "narrow" }), value: s ? s.hours : 0, top: s ? s.hours : "" };
  });
  const slept = sleep7.filter(s => s.value);
  const sleepAvg = slept.length ? (slept.reduce((a, s) => a + s.value, 0) / slept.length).toFixed(1) : "—";

  const meas = store.measurements || [];
  const lm = meas[meas.length - 1], pm = meas[meas.length - 2];

  const onPhoto = async e => {
    const f = e.target.files[0]; e.target.value = "";
    if (!f) return;
    try {
      const data = await compressImage(f);
      setStore(p => ({ ...p, photos: [...p.photos, { date: tk, data, id: uid() }].slice(-40) }));
      flash("Photo saved", { icon: "camera" });
    } catch { flash("Couldn't read that image", { icon: "info" }); }
  };

  return (
    <>
      <input type="file" accept="image/*" ref={photoRef} hidden onChange={onPhoto} />
      <div className="row between rise" style={{ alignItems: "flex-end", marginBottom: 16 }}>
        <div className="h-display">Body</div>
        <button className="icon-btn" onClick={() => photoRef.current?.click()} aria-label="Add progress photo"><Icon name="camera" size={19} /></button>
      </div>

      {/* Weight */}
      <div className="card hero rise-1" style={{ padding: 18, marginBottom: 10 }}>
        {cur ? (
          <>
            <div className="row between" style={{ alignItems: "flex-start" }}>
              <div>
                <div className="label">Trend weight</div>
                <div className="row" style={{ alignItems: "baseline", gap: 6, marginTop: 6 }}>
                  <span className="big-num" style={{ fontSize: 48 }}>{cur.value}</span>
                  <span className="caption" style={{ fontWeight: 600, fontSize: 15 }}>{unit}</span>
                </div>
                <div className="caption num" style={{ marginTop: 4 }}>Scale {last.value} · {fmtDate(last.date)}</div>
              </div>
              {rate !== null && (
                <span className={"pill " + (Math.abs(rate) < 0.15 ? "" : rate < 0 ? "good" : "warn")}>
                  <Icon name={rate < 0 ? "down" : "up"} size={11} stroke={2.6} /> {Math.abs(rate).toFixed(1)} / wk
                </span>
              )}
            </div>
            <div style={{ margin: "18px -4px 12px" }}><AreaChart data={shown} trend={trendShown} height={110} /></div>
            <Seg value={range} onChange={setRange} small options={[["30", "1M"], ["90", "3M"], ["180", "6M"], ["all", "All"]]} />
          </>
        ) : (
          <Empty icon="scale" title="No weigh-ins yet">Log your morning weight — the trend line smooths daily swings.</Empty>
        )}
        <button className="btn primary lg block" style={{ marginTop: 14 }} onClick={() => open("weight")}><Icon name="plus" size={18} stroke={2.2} /> Log weight</button>
      </div>

      {cur && (
        <div className="grid-3" style={{ marginBottom: 10 }}>
          <Stat label="Change" value={`${change > 0 ? "+" : ""}${change.toFixed(1)}`} unit={unit} />
          <Stat label="Goal" value={goal || "—"} unit={goal ? unit : ""} />
          <Stat label="To go" value={goal ? Math.abs(cur.value - goal).toFixed(1) : "—"} unit={goal ? unit : ""} />
        </div>
      )}

      {/* Sleep */}
      <Section title="Sleep"><button className="link" onClick={() => open("sleep")}>Log</button></Section>
      <div className="card" style={{ padding: 16 }}>
        <div className="row between" style={{ marginBottom: 12 }}>
          <div className="row gap-8"><span style={{ color: "var(--sleep)" }}><Icon name="moon" size={18} /></span><span className="caption" style={{ fontWeight: 600 }}>7-day average</span></div>
          <span className="big-num" style={{ fontSize: 22 }}>{sleepAvg}<span className="caption"> h</span></span>
        </div>
        <Bars data={sleep7} height={110} goal={8} />
      </div>

      {/* Measurements */}
      <Section title="Measurements"><button className="link" onClick={() => open("measure")}>Log</button></Section>
      {lm ? (
        <div className="card" style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
          {MEASURES.map(([k, l]) => {
            const v = lm[k], d = pm && v && pm[k] ? v - pm[k] : null;
            return (
              <div key={k} style={{ textAlign: "center" }}>
                <div className="caption" style={{ fontSize: 11 }}>{l}</div>
                <div className="big-num" style={{ fontSize: 19, marginTop: 6 }}>{v || "—"}</div>
                <div className="caption num" style={{ fontSize: 10.5, marginTop: 2, color: d ? (d < 0 ? "var(--good)" : "var(--warn)") : "var(--t3)" }}>{d ? `${d > 0 ? "+" : ""}${d.toFixed(1)}` : k === "bf" ? "%" : len}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card"><Empty icon="ruler" title="No measurements">The tape catches progress the scale misses.</Empty></div>
      )}

      {/* Photos */}
      <Section title="Photos">
        {store.photos.length >= 2 && <button className="link" onClick={() => open("photos")}>Compare</button>}
        <button className="link" onClick={() => photoRef.current?.click()}>Add</button>
      </Section>
      {store.photos.length === 0 ? (
        <div className="card"><Empty icon="camera" title="No photos yet">Same light, same pose, every few weeks.</Empty></div>
      ) : (
        <div className="grid-3" style={{ gap: 6 }}>
          {[...store.photos].reverse().slice(0, 9).map((p, i) => (
            <button key={p.id || i} onClick={() => open("photo", { photo: p })} style={{ aspectRatio: "3/4", borderRadius: 14, overflow: "hidden", position: "relative", background: "var(--card-2)" }}>
              <img src={p.data} alt={`Progress ${fmtDate(p.date)}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <span className="num" style={{ position: "absolute", left: 6, bottom: 6, padding: "2px 7px", borderRadius: 8, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 10.5, fontWeight: 600 }}>{fmtDate(p.date)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Weigh-ins */}
      {weights.length > 0 && (
        <>
          <Section title="Weigh-ins"><span className="caption num">{weights.length}</span></Section>
          <div className="list">
            {[...weights].reverse().slice(0, showAll ? 60 : 6).map((w, i, arr) => {
              const nx = arr[i + 1];
              const d = nx ? w.value - nx.value : null;
              return (
                <div key={w.date} className="list-row">
                  <span className="flex1 caption" style={{ fontWeight: 600, color: "var(--t2)" }}>{fmtDate(w.date, { weekday: "short", month: "short", day: "numeric" })}</span>
                  {d !== null && <span className="caption num" style={{ color: d < 0 ? "var(--good)" : d > 0 ? "var(--warn)" : "var(--t3)" }}>{d > 0 ? "+" : ""}{d.toFixed(1)}</span>}
                  <span className="num" style={{ fontWeight: 700, minWidth: 64, textAlign: "right" }}>{w.value} <span className="caption">{unit}</span></span>
                  <button className="icon-btn sm ghost" aria-label="Delete" onClick={() => undoable("Weigh-in removed", p => ({ ...p, weights: p.weights.filter(x => x.date !== w.date) }))}><Icon name="x" size={15} /></button>
                </div>
              );
            })}
          </div>
          {weights.length > 6 && <button className="btn ghost block" style={{ marginTop: 6 }} onClick={() => setShowAll(s => !s)}>{showAll ? "Show less" : "Show all"}</button>}
        </>
      )}
    </>
  );
}
