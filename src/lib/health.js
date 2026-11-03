// Mercury — Health Connect (Android): finished workouts and weigh-ins go to the phone's
// health hub (OHealth, Google Fit, Samsung Health…). Write-only; nothing is read back.
import { registerPlugin } from "@capacitor/core";
import { isNative } from "./native.js";
import { num, parseKey } from "./data.js";

const HealthSync = registerPlugin("HealthSync");
const SENT_KEY = "mercury_hc_sent";
const LB = 0.45359237;
// Calorie estimate for lifting: ~5 METs × body weight (kg) × hours
const LIFT_MET = 5;

// "available" | "update" | "unavailable"
export async function healthAvailability() {
  if (!isNative) return "unavailable";
  try { return (await HealthSync.availability()).status; } catch { return "unavailable"; }
}

export async function healthHasAccess() {
  try { return !!(await HealthSync.hasAccess()).granted; } catch { return false; }
}

export async function requestHealthAccess() {
  try { return !!(await HealthSync.requestAccess()).granted; } catch { return false; }
}

export function openHealthSettings() {
  HealthSync.openSettings().catch(() => {});
}

function loadSent() {
  try { const s = JSON.parse(localStorage.getItem(SENT_KEY)); if (s && s.s && s.w) return s; } catch {}
  return { s: [], w: {} };
}
function saveSent(s) {
  try { localStorage.setItem(SENT_KEY, JSON.stringify(s)); } catch {}
}

// Sessions logged before start times were kept: assume an evening workout
function sessionStart(s) {
  if (s.start) return s.start;
  const d = parseKey(s.date);
  d.setHours(17, 0, 0, 0);
  return d.getTime();
}

function bodyKg(store) {
  const w = store.weights && store.weights[store.weights.length - 1];
  if (!w || !num(w.value)) return 0;
  return store.settings.unit === "kg" ? num(w.value) : num(w.value) * LB;
}

// Sends whatever hasn't been sent yet. → { sent: n } | { error: "no-access" | "failed" }
export async function syncHealth(store) {
  if (!isNative || !store.settings.health) return { sent: 0 };
  const sent = loadSent();
  const done = new Set(sent.s);
  const kg = bodyKg(store);
  const workouts = (store.sessHist || []).filter(s => s.id && !done.has(s.id)).map(s => {
    const start = sessionStart(s);
    const secs = Math.max(60, s.duration || 3600);
    return {
      id: s.id, start, end: start + secs * 1000,
      title: s.day ? `${s.day} · Mercury` : "Strength training",
      kcal: kg ? Math.round(LIFT_MET * kg * (secs / 3600)) : 0,
    };
  });
  const toKg = v => (store.settings.unit === "kg" ? num(v) : Math.round(num(v) * LB * 100) / 100);
  const weights = (store.weights || []).filter(w => num(w.value) > 0 && sent.w[w.date] !== num(w.value)).map(w => {
    const d = parseKey(w.date);
    d.setHours(8, 0, 0, 0);
    return { date: w.date, time: d.getTime(), kg: toKg(w.value), version: Date.now() };
  });
  try {
    if (workouts.length) await HealthSync.writeWorkouts({ workouts });
    workouts.forEach(w => sent.s.push(w.id));
    if (weights.length) await HealthSync.writeWeights({ weights });
    (store.weights || []).forEach(w => { if (num(w.value) > 0) sent.w[w.date] = num(w.value); });
    sent.s = sent.s.slice(-2000);
    saveSent(sent);
    return { sent: workouts.length + weights.length };
  } catch (e) {
    saveSent(sent);
    return { error: e && e.code === "NO_ACCESS" ? "no-access" : "failed" };
  }
}
