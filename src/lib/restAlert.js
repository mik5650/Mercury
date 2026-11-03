// Mercury — what the native rest-end alert (Android) needs to know.
import { todayKey, setKey, entryDone, num, parseRepRange, lastPerformance, suggestNext } from "./data.js";

const ACCENT_HEX = { volt: "#C6F432", ember: "#FF6B3D", ocean: "#4C8DFF", violet: "#9B7BFF", rose: "#FF4F7B", mint: "#34E0A1" };

export function restAlertState(store) {
  const S = store.settings;
  const rest = store.activeRest;
  return {
    restEndAt: rest ? rest.endAt : 0,
    restTotal: rest ? rest.total : 0,
    restAlert: !!S.notify,
    accent: ACCENT_HEX[S.accent] || ACCENT_HEX.volt,
    next: nextSetText(store),
  };
}

// "Back Squat · Set 3 · 275 lb × 7" — the first set of today's workout not ticked yet
function nextSetText(store) {
  const session = store.activeSession;
  const day = session && store.wo[session.dayKey];
  if (!day) return "";
  const S = store.settings;
  const tk = todayKey();
  const log = store.log[tk] || {};
  for (const ex of day.exercises) {
    const hasB = !!(ex.isSuperset && ex.nameB);
    for (let si = 0; si < ex.sets; si++) {
      for (const isB of hasB ? [false, true] : [false]) {
        const e = log[setKey(ex.id, si, isB)];
        if (entryDone(e)) continue;
        const name = isB ? ex.nameB : ex.name;
        const lp = lastPerformance(store, name, tk);
        const prev = lp ? (lp.sets[si] || lp.sets[lp.sets.length - 1]) : null;
        const sug = isB ? null : suggestNext(store, ex.name, ex.reps, S.unit);
        const range = parseRepRange(ex.reps);
        const w = e && e.w ? e.w : sug ? sug.w : prev ? prev.w : "";
        const r = e && e.r ? e.r : sug && sug.r ? sug.r : prev ? prev.r : range ? range[0] : "";
        const weight = num(w) > 0 ? `${w} ${S.unit}` : "BW";
        return `${name} · Set ${si + 1} · ${weight}${r ? ` × ${r}` : ""}`;
      }
    }
  }
  return "";
}
