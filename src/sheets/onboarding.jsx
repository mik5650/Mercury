// Mercury — first-run onboarding
import { useState } from "react";
import { useApp, Seg, Stepper } from "../ui/kit.jsx";
import { Icon } from "../ui/icons.jsx";
import { freshStore, convertUnits } from "../lib/data.js";
import { ACCENTS } from "./tools.jsx";

export function Logo({ size = 64 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.3, background: "var(--accent)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 40px var(--accent-glow)" }}>
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></svg>
    </div>
  );
}

export function Onboarding() {
  const { store, setStore } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("lb");
  const [goal, setGoal] = useState(4);
  const accent = store.settings.accent;
  const setAccent = a => setStore(s => ({ ...s, settings: { ...s.settings, accent: a } }));

  const finish = demo => {
    const settings = { ...store.settings, name: name.trim(), weeklyGoal: goal, onboarded: true, unit: "lb", bar: 45 };
    let next = demo ? { ...store, settings } : { ...freshStore(false), settings };
    if (unit === "kg") next = convertUnits(next, "kg");
    setStore(next);
  };

  const feats = [
    ["dumbbell", "Log sets in one tap", "Previous numbers, smart progression, auto rest timer."],
    ["chart", "See real progress", "Strength curves, muscle volume, records, streaks."],
    ["fuel", "Fuel and body", "Macros, water, weight trend, sleep, photos."],
  ];

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 300, background: "radial-gradient(120% 60% at 50% 0%, rgba(var(--accent-rgb),0.16), transparent 60%), var(--bg)", display: "flex", flexDirection: "column", padding: "calc(40px + env(safe-area-inset-top, 0px)) 24px calc(24px + env(safe-area-inset-bottom, 0px))", animation: "fade 0.4s ease" }}>
      <div className="row gap-6" style={{ justifyContent: "center", marginBottom: 28 }}>
        {[0, 1, 2, 3].map(i => <span key={i} style={{ height: 4, width: i === step ? 24 : 8, borderRadius: 9, background: i <= step ? "var(--accent)" : "var(--card-3)", transition: "all 0.35s var(--ease)" }} />)}
      </div>

      <div className="flex1" key={step} style={{ animation: "rise 0.45s var(--ease) both", overflowY: "auto" }}>
        {step === 0 && (
          <>
            <Logo size={72} />
            <div className="h-display" style={{ fontSize: 40, marginTop: 26 }}>Mercury</div>
            <div className="caption" style={{ fontSize: 16, marginTop: 8, lineHeight: 1.5 }}>Train with intent. A calm, fast log for everything that makes you stronger.</div>
            <div className="stack gap-16" style={{ marginTop: 32 }}>
              {feats.map(([ic, t, s]) => (
                <div key={t} className="row gap-12" style={{ alignItems: "flex-start" }}>
                  <span className="row-icon" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}><Icon name={ic} size={19} /></span>
                  <div><div style={{ fontWeight: 650 }}>{t}</div><div className="caption" style={{ marginTop: 2 }}>{s}</div></div>
                </div>
              ))}
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <div className="h-display">About you</div>
            <div className="caption" style={{ marginTop: 6, marginBottom: 26 }}>Just the basics — change anytime in Settings.</div>
            <label className="field-label">First name</label>
            <input className="field" autoFocus placeholder="Optional" value={name} onChange={e => setName(e.target.value.slice(0, 24))} style={{ marginBottom: 20, height: 54, fontSize: 17 }} />
            <label className="field-label">Units</label>
            <Seg value={unit} onChange={setUnit} options={[["lb", "Pounds · lb"], ["kg", "Kilograms · kg"]]} style={{ marginBottom: 20 }} />
            <div className="card row between" style={{ padding: 16 }}>
              <div><div style={{ fontWeight: 650 }}>Weekly goal</div><div className="caption">Training sessions per week</div></div>
              <Stepper value={goal} onChange={setGoal} min={1} max={7} />
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="h-display">Make it yours</div>
            <div className="caption" style={{ marginTop: 6, marginBottom: 26 }}>Pick an accent. It follows you everywhere.</div>
            <div className="grid-3" style={{ gap: 10, marginBottom: 24 }}>
              {ACCENTS.map(([id, c, l]) => (
                <button key={id} className="card tap" onClick={() => setAccent(id)} style={{ padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, borderColor: accent === id ? c : "var(--line)", borderWidth: accent === id ? 2 : 1 }}>
                  <span style={{ width: 40, height: 40, borderRadius: 99, background: c, boxShadow: accent === id ? `0 6px 20px ${c}66` : "none" }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{l}</span>
                </button>
              ))}
            </div>
            <div className="card hero" style={{ padding: 18 }}>
              <div className="pill accent" style={{ marginBottom: 10 }}>Preview</div>
              <div className="big-num" style={{ fontSize: 28 }}>Push day</div>
              <div className="bar" style={{ margin: "14px 0" }}><div style={{ width: "62%" }} /></div>
              <button className="btn primary block">Start workout</button>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <div className="h-display">Ready{name.trim() ? `, ${name.trim()}` : ""}.</div>
            <div className="caption" style={{ marginTop: 6, marginBottom: 26 }}>How do you want to begin?</div>
            <button className="card tap" style={{ padding: 18, width: "100%", textAlign: "left", marginBottom: 10 }} onClick={() => finish(true)}>
              <div className="row gap-12"><span className="row-icon" style={{ background: "var(--accent)", color: "var(--on-accent)" }}><Icon name="sparkle" size={19} /></span>
                <div className="flex1"><div style={{ fontWeight: 650 }}>Explore with demo data</div><div className="caption">Two months of sample training to see every feature.</div></div><Icon name="chev-r" size={18} style={{ color: "var(--t3)" }} /></div>
            </button>
            <button className="card tap" style={{ padding: 18, width: "100%", textAlign: "left" }} onClick={() => finish(false)}>
              <div className="row gap-12"><span className="row-icon"><Icon name="plus" size={19} /></span>
                <div className="flex1"><div style={{ fontWeight: 650 }}>Start fresh</div><div className="caption">A clean slate with a Push · Pull · Legs split ready to go.</div></div><Icon name="chev-r" size={18} style={{ color: "var(--t3)" }} /></div>
            </button>
          </>
        )}
      </div>

      {step < 3 && (
        <div className="row gap-8" style={{ marginTop: 16 }}>
          {step > 0 && <button className="btn lg" onClick={() => setStep(s => s - 1)}><Icon name="chev-l" size={18} /></button>}
          <button className="btn primary lg flex1" onClick={() => setStep(s => s + 1)}>{step === 0 ? "Get started" : "Continue"}</button>
        </div>
      )}
    </div>
  );
}
