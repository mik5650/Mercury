// Mercury — app shell
import { useCallback, useEffect, useRef, useState } from "react";
import { AppCtx, Toast, Confetti, Ring, Dialog } from "./ui/kit.jsx";
import { Icon } from "./ui/icons.jsx";
import { loadStore, saveStore, beep, haptic, unlockAudio, fmtTime } from "./lib/data.js";
import { TodayScreen } from "./screens/today.jsx";
import { TrainScreen } from "./screens/train.jsx";
import { ProgressScreen } from "./screens/progress.jsx";
import { FuelScreen } from "./screens/fuel.jsx";
import { BodyScreen } from "./screens/body.jsx";
import { SheetRouter } from "./sheets/router.jsx";
import { Onboarding } from "./sheets/onboarding.jsx";

const TABS = [
  { id: "today", label: "Today", icon: "home" },
  { id: "train", label: "Train", icon: "dumbbell" },
  { id: "progress", label: "Progress", icon: "chart" },
  { id: "fuel", label: "Fuel", icon: "fuel" },
  { id: "body", label: "Body", icon: "body" },
];

function resolveTheme(pref) {
  if (pref === "dark" || pref === "light") return pref;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function App() {
  const [store, setStoreRaw] = useState(() => loadStore());
  const storeRef = useRef(store);
  const [tab, setTabRaw] = useState(() => { try { return sessionStorage.getItem("m3_tab") || "today"; } catch { return "today"; } });
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [confetti, setConfetti] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [restFull, setRestFull] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [now, setNow] = useState(Date.now());
  const scrollRef = useRef(null);

  const setStore = useCallback((updater) => {
    setStoreRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      storeRef.current = next;
      saveStore(next);
      return next;
    });
  }, []);

  const flash = useCallback((msg, opts = {}) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, icon: opts.icon, action: opts.action, onAction: opts.onAction, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), opts.action ? 4200 : 2000);
  }, []);

  const undoable = useCallback((msg, updater) => {
    const snapshot = storeRef.current;
    setStore(updater);
    flash(msg, { icon: "trash", action: "Undo", onAction: () => { setStore(snapshot); flash("Restored", { icon: "history" }); } });
  }, [setStore, flash]);

  const celebrate = useCallback(() => { setConfetti(true); setTimeout(() => setConfetti(false), 2800); }, []);
  const open = useCallback((kind, payload = {}) => setSheet({ kind, payload }), []);
  const close = useCallback(() => setSheet(null), []);
  // ask({ title, message, confirm, cancel, alt, danger, icon, input }) → Promise<true|false|"alt"|string|null>
  const ask = useCallback(opts => new Promise(resolve => setDialog({ ...opts, resolve })), []);
  const setTab = useCallback((t) => {
    setTabRaw(t);
    try { sessionStorage.setItem("m3_tab", t); } catch {}
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);

  // Theme + accent
  const { theme, accent } = store.settings;
  useEffect(() => {
    const apply = () => {
      const t = resolveTheme(theme);
      document.documentElement.setAttribute("data-theme", t);
      document.documentElement.setAttribute("data-accent", accent || "volt");
      const m = document.querySelector('meta[name="theme-color"]');
      if (m) m.content = t === "dark" ? "#08080A" : "#F2F2F5";
    };
    apply();
    if (theme !== "auto" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener ? mq.addEventListener("change", apply) : mq.addListener(apply);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", apply) : mq.removeListener(apply); };
  }, [theme, accent]);

  useEffect(() => {
    const full = () => flash("Storage is full — export a backup and remove old photos", { icon: "info" });
    window.addEventListener("mercury-storage-full", full);
    return () => window.removeEventListener("mercury-storage-full", full);
  }, [flash]);

  // ===== Clock for live session + rest (timestamp based → survives tab switches, sleep, reloads) =====
  const rest = store.activeRest;
  const session = store.activeSession;
  useEffect(() => {
    if (!rest && !session) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [!!rest, !!session]);

  const restLeft = rest ? Math.max(0, Math.ceil((rest.endAt - now) / 1000)) : 0;
  useEffect(() => {
    if (!rest || rest.endAt > Date.now()) return;
    const stale = Date.now() - rest.endAt > 5000;
    setStore(prev => ({ ...prev, activeRest: null }));
    setRestFull(false);
    if (!stale) {
      if (store.settings.sound) beep(3);
      haptic([120, 60, 120]);
      flash("Rest complete — next set", { icon: "bolt" });
    }
  }, [restLeft, rest]);

  const startRest = useCallback((sec) => {
    unlockAudio();
    setStore(prev => ({ ...prev, activeRest: { endAt: Date.now() + sec * 1000, total: sec } }));
  }, [setStore]);
  const adjustRest = useCallback((d) => {
    setStore(prev => prev.activeRest ? ({ ...prev, activeRest: { endAt: Math.max(Date.now() + 1000, prev.activeRest.endAt + d * 1000), total: Math.max(1, prev.activeRest.total + d) } }) : prev);
  }, [setStore]);
  const skipRest = useCallback(() => { setStore(prev => ({ ...prev, activeRest: null })); setRestFull(false); }, [setStore]);

  const ctx = { store, setStore, flash, undoable, celebrate, open, close, ask, startRest, setTab, tab, now };

  const showMini = !!rest || (!!session && tab !== "train");
  const elapsed = session ? Math.floor((now - session.start) / 1000) : 0;
  const sessionLabel = session && store.wo[session.dayKey] ? store.wo[session.dayKey].label : "Workout";

  return (
    <AppCtx.Provider value={ctx}>
      <div className="stage">
        <div className="device">
          <div ref={scrollRef} className="scroller">
            <div className={"screen" + (showMini ? " with-mini" : "")} key={tab}>
              {tab === "today" && <TodayScreen />}
              {tab === "train" && <TrainScreen />}
              {tab === "progress" && <ProgressScreen />}
              {tab === "fuel" && <FuelScreen />}
              {tab === "body" && <BodyScreen />}
            </div>
          </div>

          {showMini && (
            <div className="mini">
              {rest && <div className="fill" style={{ width: `${(restLeft / Math.max(1, rest.total)) * 100}%` }} />}
              <button className="row gap-12 flex1" style={{ position: "relative", height: "100%" }}
                onClick={() => rest ? setRestFull(true) : setTab("train")}>
                {rest ? (
                  <Ring pct={restLeft / Math.max(1, rest.total)} size={34} stroke={4}>
                    <Icon name="timer" size={14} />
                  </Ring>
                ) : <span className="live" style={{ marginLeft: 4 }} />}
                <div className="flex1" style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t2)" }}>{rest ? "Resting" : sessionLabel}</div>
                  <div className="num" style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: rest && restLeft <= 10 ? "var(--accent-ink)" : "var(--t1)" }}>
                    {rest ? fmtTime(restLeft) : fmtTime(elapsed)}
                    {rest && session && <span className="caption" style={{ marginLeft: 8, fontWeight: 500 }}>· {sessionLabel} {fmtTime(elapsed)}</span>}
                  </div>
                </div>
              </button>
              {rest ? (
                <div className="row gap-6" style={{ position: "relative" }}>
                  <button className="btn sm" onClick={() => adjustRest(15)}>+15</button>
                  <button className="btn sm primary" onClick={skipRest}>Skip</button>
                </div>
              ) : (
                <button className="btn sm primary" style={{ position: "relative" }} onClick={() => setTab("train")}>Open</button>
              )}
            </div>
          )}

          <nav className="nav" aria-label="Main">
            {TABS.map(t => (
              <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => { setTab(t.id); haptic(5); }} aria-current={tab === t.id ? "page" : undefined}>
                <span className="nav-ic"><Icon name={t.icon} size={22} stroke={tab === t.id ? 2.1 : 1.8} /></span>
                <span>{t.label}</span>
                {t.id === "train" && session && tab !== "train" && <span className="live-dot" />}
              </button>
            ))}
          </nav>

          {rest && restFull && <RestFull left={restLeft} total={rest.total} onAdjust={adjustRest} onSkip={skipRest} onClose={() => setRestFull(false)} />}

          <Toast toast={toast} onAction={() => { toast?.onAction?.(); setToast(null); }} />
          <Confetti show={confetti} />
          {sheet && <SheetRouter sheet={sheet} />}
          {!store.settings.onboarded && <Onboarding />}
          {dialog && <Dialog dialog={dialog} onDone={v => { const r = dialog.resolve; setDialog(null); r(v); }} />}
        </div>
      </div>
    </AppCtx.Provider>
  );
}

function RestFull({ left, total, onAdjust, onSkip, onClose }) {
  const pct = left / Math.max(1, total);
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 95, background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, animation: "fade 0.25s ease" }}>
      <button className="icon-btn round" onClick={onClose} style={{ position: "absolute", top: "calc(18px + env(safe-area-inset-top, 0px))", right: 18 }} aria-label="Minimize"><Icon name="chev-d" size={20} /></button>
      <div className="label" style={{ marginBottom: 26 }}>Rest</div>
      <Ring pct={pct} size={260} stroke={12}>
        <div className="big-num" style={{ fontSize: 72, color: left <= 10 ? "var(--accent-ink)" : "var(--t1)" }}>{fmtTime(left)}</div>
        <div className="caption" style={{ marginTop: 6 }}>of {fmtTime(total)}</div>
      </Ring>
      <div className="row gap-8" style={{ marginTop: 34, width: "100%", maxWidth: 340 }}>
        <button className="btn lg flex1" onClick={() => onAdjust(-15)}>−15s</button>
        <button className="btn lg flex1" onClick={() => onAdjust(15)}>+15s</button>
        <button className="btn lg flex1" onClick={() => onAdjust(30)}>+30s</button>
      </div>
      <button className="btn lg primary block" style={{ marginTop: 10, maxWidth: 340 }} onClick={onSkip}>Skip rest</button>
    </div>
  );
}
