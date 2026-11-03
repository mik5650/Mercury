// Mercury — data layer, utilities, seed, migrations
// Exposes everything to window for cross-script access in JSX islands.

// ============ IDs & dates (local time, never UTC) ============
export function uid() { return Math.random().toString(36).slice(2, 9); }

export function dkey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
export function parseKey(k) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
export function todayKey() { return dkey(new Date()); }
export function addDays(dateStr, n) {
  const d = parseKey(dateStr);
  d.setDate(d.getDate() + n);
  return dkey(d);
}
export function daysBetween(a, b) {
  return Math.round((parseKey(b) - parseKey(a)) / 86400000);
}
// Weeks start on Monday
export function weekStart(dateStr = todayKey()) {
  const d = parseKey(dateStr);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return dkey(d);
}

export function fmtTime(s) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60);
  const r = String(s % 60).padStart(2, "0");
  return m + ":" + r;
}
export function fmtTimeLong(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? h + "h " + m + "m" : m + "m";
}
export function fmtDate(dateStr, opts = { month: "short", day: "numeric" }) {
  return parseKey(dateStr).toLocaleDateString("en-US", opts);
}
export function fmtNum(n, dp = 0) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return Number(n).toLocaleString("en-US", { maximumFractionDigits: dp, minimumFractionDigits: 0 });
}
export function fmtVol(v) {
  if (!v) return "0";
  if (v >= 10000) return Math.round(v / 1000) + "k";
  if (v >= 1000) return (v / 1000).toFixed(1) + "k";
  return String(Math.round(v));
}

// ============ Muscles ============
export const MUSCLES = ["chest", "delts", "triceps", "biceps", "forearms", "lats", "traps", "abs", "quads", "hamstrings", "glutes", "calves"];
export const MUSCLE_LABEL = {
  chest: "Chest", delts: "Shoulders", triceps: "Triceps", biceps: "Biceps", forearms: "Forearms",
  lats: "Lats", traps: "Upper back", abs: "Core", quads: "Quads", hamstrings: "Hamstrings",
  glutes: "Glutes", calves: "Calves",
};
export const MUSCLE_ALIAS = {
  chest: ["chest"], pec: ["chest"], pecs: ["chest"],
  shoulder: ["delts"], shoulders: ["delts"], delt: ["delts"], delts: ["delts"],
  tricep: ["triceps"], triceps: ["triceps"],
  bicep: ["biceps"], biceps: ["biceps"],
  forearm: ["forearms"], forearms: ["forearms"],
  back: ["lats", "traps"], lats: ["lats"], lat: ["lats"], traps: ["traps"], trap: ["traps"],
  abs: ["abs"], core: ["abs"],
  quad: ["quads"], quads: ["quads"],
  hamstring: ["hamstrings"], hamstrings: ["hamstrings"], ham: ["hamstrings"], hams: ["hamstrings"],
  glute: ["glutes"], glutes: ["glutes"],
  calf: ["calves"], calves: ["calves"],
};
export function normMuscles(list) {
  const out = new Set();
  (list || []).forEach(m => (MUSCLE_ALIAS[String(m).toLowerCase()] || []).forEach(x => out.add(x)));
  return [...out];
}

// ============ Exercise library ============
// m: primary muscles (canonical keys), eq: equipment
export const EXERCISE_LIBRARY = [
  // Chest
  { n: "Barbell Bench Press", m: ["chest", "triceps", "delts"], eq: "barbell" },
  { n: "Incline Barbell Bench", m: ["chest", "delts", "triceps"], eq: "barbell" },
  { n: "Close-Grip Bench", m: ["triceps", "chest"], eq: "barbell" },
  { n: "Incline DB Press", m: ["chest", "delts"], eq: "dumbbell" },
  { n: "Flat DB Press", m: ["chest", "triceps"], eq: "dumbbell" },
  { n: "Cable Flye", m: ["chest"], eq: "cable" },
  { n: "Pec Deck", m: ["chest"], eq: "machine" },
  { n: "Machine Chest Press", m: ["chest", "triceps"], eq: "machine" },
  { n: "Dip", m: ["chest", "triceps"], eq: "bodyweight" },
  { n: "Push-up", m: ["chest", "triceps"], eq: "bodyweight" },
  // Back
  { n: "Deadlift", m: ["hamstrings", "glutes", "lats", "traps"], eq: "barbell" },
  { n: "Barbell Row", m: ["lats", "traps", "biceps"], eq: "barbell" },
  { n: "Pendlay Row", m: ["lats", "traps"], eq: "barbell" },
  { n: "Pull-up", m: ["lats", "biceps"], eq: "bodyweight" },
  { n: "Chin-up", m: ["lats", "biceps"], eq: "bodyweight" },
  { n: "Lat Pulldown", m: ["lats", "biceps"], eq: "cable" },
  { n: "Cable Row", m: ["lats", "traps"], eq: "cable" },
  { n: "Chest-Supported Row", m: ["traps", "lats"], eq: "machine" },
  { n: "DB Row", m: ["lats", "traps"], eq: "dumbbell" },
  { n: "Face Pull", m: ["delts", "traps"], eq: "cable" },
  { n: "Shrug", m: ["traps"], eq: "barbell" },
  { n: "Back Extension", m: ["hamstrings", "glutes"], eq: "bodyweight" },
  // Shoulders
  { n: "Overhead Press", m: ["delts", "triceps"], eq: "barbell" },
  { n: "DB Shoulder Press", m: ["delts", "triceps"], eq: "dumbbell" },
  { n: "DB Lateral Raise", m: ["delts"], eq: "dumbbell" },
  { n: "Cable Lateral Raise", m: ["delts"], eq: "cable" },
  { n: "Cable Front Raise", m: ["delts"], eq: "cable" },
  { n: "Rear Delt Fly", m: ["delts", "traps"], eq: "dumbbell" },
  { n: "Arnold Press", m: ["delts"], eq: "dumbbell" },
  { n: "Upright Row", m: ["delts", "traps"], eq: "barbell" },
  // Arms
  { n: "Barbell Curl", m: ["biceps"], eq: "barbell" },
  { n: "EZ-Bar Curl", m: ["biceps"], eq: "barbell" },
  { n: "DB Curl", m: ["biceps"], eq: "dumbbell" },
  { n: "Hammer Curl", m: ["biceps", "forearms"], eq: "dumbbell" },
  { n: "Incline DB Curl", m: ["biceps"], eq: "dumbbell" },
  { n: "Preacher Curl", m: ["biceps"], eq: "machine" },
  { n: "Cable Curl", m: ["biceps"], eq: "cable" },
  { n: "Tricep Pushdown", m: ["triceps"], eq: "cable" },
  { n: "Overhead Tricep Ext", m: ["triceps"], eq: "cable" },
  { n: "Skullcrusher", m: ["triceps"], eq: "barbell" },
  { n: "Wrist Curl", m: ["forearms"], eq: "barbell" },
  { n: "Farmer's Carry", m: ["forearms", "traps"], eq: "dumbbell" },
  // Legs
  { n: "Back Squat", m: ["quads", "glutes"], eq: "barbell" },
  { n: "Front Squat", m: ["quads", "glutes"], eq: "barbell" },
  { n: "Hack Squat", m: ["quads"], eq: "machine" },
  { n: "Leg Press", m: ["quads", "glutes"], eq: "machine" },
  { n: "Bulgarian Split Squat", m: ["quads", "glutes"], eq: "dumbbell" },
  { n: "Walking Lunge", m: ["quads", "glutes"], eq: "dumbbell" },
  { n: "Goblet Squat", m: ["quads", "glutes"], eq: "dumbbell" },
  { n: "Romanian Deadlift", m: ["hamstrings", "glutes"], eq: "barbell" },
  { n: "Stiff-Leg Deadlift", m: ["hamstrings", "glutes"], eq: "barbell" },
  { n: "Sumo Deadlift", m: ["glutes", "hamstrings", "quads"], eq: "barbell" },
  { n: "Hip Thrust", m: ["glutes"], eq: "barbell" },
  { n: "Leg Extension", m: ["quads"], eq: "machine" },
  { n: "Leg Curl", m: ["hamstrings"], eq: "machine" },
  { n: "Standing Calf Raise", m: ["calves"], eq: "machine" },
  { n: "Seated Calf Raise", m: ["calves"], eq: "machine" },
  // Core
  { n: "Plank", m: ["abs"], eq: "bodyweight" },
  { n: "Hanging Leg Raise", m: ["abs"], eq: "bodyweight" },
  { n: "Ab Wheel", m: ["abs"], eq: "bodyweight" },
  { n: "Cable Crunch", m: ["abs"], eq: "cable" },
];
export const LIB_INDEX = {};
EXERCISE_LIBRARY.forEach(e => { LIB_INDEX[e.n.toLowerCase()] = e; });

// Guess muscles for an exercise from its name when it's not in the library
export function guessMuscles(name) {
  const n = String(name || "").toLowerCase();
  if (LIB_INDEX[n]) return LIB_INDEX[n].m;
  const rules = [
    [/bench|chest|pec|fly|flye|push-?up|dip/, ["chest", "triceps"]],
    [/squat|leg press|lunge|extension/, ["quads", "glutes"]],
    [/rdl|romanian|stiff|leg curl|hamstring|good morning/, ["hamstrings", "glutes"]],
    [/deadlift/, ["hamstrings", "glutes", "lats"]],
    [/row|pulldown|pull-?up|chin|lat/, ["lats", "biceps"]],
    [/shrug|face pull/, ["traps"]],
    [/press|raise|delt|shoulder/, ["delts"]],
    [/curl/, ["biceps"]],
    [/tricep|pushdown|skull/, ["triceps"]],
    [/calf/, ["calves"]],
    [/thrust|glute/, ["glutes"]],
    [/plank|crunch|ab |abs|core|leg raise/, ["abs"]],
    [/wrist|forearm|carry/, ["forearms"]],
  ];
  for (const [re, m] of rules) if (re.test(n)) return m;
  return [];
}
export function exerciseMuscles(ex) {
  const declared = ex && (ex.primary && ex.primary.length ? ex.primary : ex.muscle ? [ex.muscle] : []);
  const fromEx = normMuscles(declared);
  if (fromEx.length) return fromEx;
  return guessMuscles(ex && ex.name);
}

// ============ Default split ============
export const DEFAULT_WO = {
  d0: { label: "Push", muscle: "chest", exercises: [
    { name: "Barbell Bench Press", sets: 3, reps: "6-8", note: "4s eccentric", isSuperset: false, primary: ["chest", "triceps", "delts"] },
    { name: "Incline DB Press", sets: 3, reps: "8-10", note: "", isSuperset: false, primary: ["chest", "delts"] },
    { name: "Cable Flye", sets: 2, reps: "12-15", note: "", isSuperset: true, nameB: "Push-up", primary: ["chest"] },
    { name: "Tricep Pushdown", sets: 3, reps: "10-12", note: "", isSuperset: false, primary: ["triceps"] },
  ]},
  d1: { label: "Pull", muscle: "back", exercises: [
    { name: "Barbell Row", sets: 3, reps: "6-8", note: "heavy", isSuperset: false, primary: ["lats", "traps", "biceps"] },
    { name: "Lat Pulldown", sets: 3, reps: "8-10", note: "", isSuperset: false, primary: ["lats", "biceps"] },
    { name: "Cable Row", sets: 2, reps: "10-12", note: "", isSuperset: true, nameB: "Face Pull", primary: ["lats", "traps", "delts"] },
    { name: "DB Curl", sets: 3, reps: "10-12", note: "", isSuperset: false, primary: ["biceps"] },
  ]},
  d2: { label: "Legs", muscle: "quad", exercises: [
    { name: "Back Squat", sets: 4, reps: "5-8", note: "heavy", isSuperset: false, primary: ["quads", "glutes"] },
    { name: "Romanian Deadlift", sets: 3, reps: "8-10", note: "", isSuperset: false, primary: ["hamstrings", "glutes"] },
    { name: "Leg Extension", sets: 2, reps: "12-15", note: "", isSuperset: true, nameB: "Walking Lunge", primary: ["quads"] },
    { name: "Standing Calf Raise", sets: 3, reps: "12-15", note: "", isSuperset: false, primary: ["calves"] },
  ]},
  d3: { label: "Shoulders", muscle: "shoulder", exercises: [
    { name: "Overhead Press", sets: 3, reps: "6-8", note: "4s eccentric", isSuperset: false, primary: ["delts", "triceps"] },
    { name: "DB Lateral Raise", sets: 3, reps: "12-15", note: "partials", isSuperset: false, primary: ["delts"] },
    { name: "Cable Front Raise", sets: 2, reps: "12-15", note: "", isSuperset: true, nameB: "Rear Delt Fly", primary: ["delts"] },
  ]},
  d4: { label: "Arms", muscle: "bicep", exercises: [
    { name: "Close-Grip Bench", sets: 3, reps: "8-10", note: "", isSuperset: false, primary: ["triceps", "chest"] },
    { name: "Barbell Curl", sets: 3, reps: "8-10", note: "", isSuperset: false, primary: ["biceps"] },
    { name: "Overhead Tricep Ext", sets: 2, reps: "12-15", note: "", isSuperset: true, nameB: "Hammer Curl", primary: ["triceps", "biceps"] },
    { name: "Wrist Curl", sets: 2, reps: "15-20", note: "", isSuperset: false, primary: ["forearms"] },
  ]},
};

// Give every exercise a stable id (log keys are built from it)
export function withIds(wo) {
  const out = {};
  Object.keys(wo).forEach(k => {
    out[k] = { ...wo[k], exercises: (wo[k].exercises || []).map(ex => ({
      ...ex,
      id: ex.id || uid(),
      sets: Math.max(1, parseInt(ex.sets) || 3),
      reps: ex.reps || "8-10",
      note: ex.note || "",
      primary: normMuscles(ex.primary).length ? normMuscles(ex.primary) : exerciseMuscles(ex),
    })) };
  });
  return out;
}

// ============ Set helpers ============
// Log entry: { ex, si, w: "185", r: "8", done: true, b?: true }
export function setKey(exId, si, isB) { return `${exId}${isB ? "-b" : ""}-${si}`; }
export function num(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
export function entryDone(e) { return !!(e && e.done && (num(e.r) > 0)); }
export function entryVol(e) { return entryDone(e) ? num(e.w) * num(e.r) : 0; }
export function epley1RM(w, r) {
  w = num(w); r = num(r);
  if (!w || !r) return 0;
  return r === 1 ? w : Math.round(w * (1 + r / 30));
}
export function parseRepRange(reps) {
  const m = String(reps || "").match(/(\d+)\s*(?:-|–|to)\s*(\d+)/);
  if (m) return [parseInt(m[1]), parseInt(m[2])];
  const n = parseInt(reps);
  return isNaN(n) ? null : [n, n];
}

// All completed sets in the log, flattened
export function allSets(store) {
  const out = [];
  Object.entries(store.log || {}).forEach(([date, dayLog]) => {
    Object.entries(dayLog || {}).forEach(([key, e]) => {
      if (entryDone(e)) out.push({ date, key, ex: e.ex, si: e.si || 0, w: num(e.w), r: num(e.r) });
    });
  });
  return out;
}

// Sessions for one exercise, newest first: [{date, sets:[{w,r}], best1RM, topW, vol}]
export function exerciseSessions(store, name, beforeDate) {
  const byDate = {};
  Object.entries(store.log || {}).forEach(([date, dayLog]) => {
    if (beforeDate && date >= beforeDate) return;
    Object.values(dayLog || {}).forEach(e => {
      if (e && e.ex === name && entryDone(e)) {
        (byDate[date] = byDate[date] || []).push({ w: num(e.w), r: num(e.r), si: e.si || 0 });
      }
    });
  });
  return Object.entries(byDate)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, sets]) => {
      sets.sort((a, b) => a.si - b.si);
      return {
        date, sets,
        best1RM: Math.max(...sets.map(s => epley1RM(s.w, s.r))),
        topW: Math.max(...sets.map(s => s.w)),
        vol: sets.reduce((a, s) => a + s.w * s.r, 0),
      };
    });
}

// Last performance of an exercise before a date → array indexed by set number
export function lastPerformance(store, name, beforeDate) {
  const sess = exerciseSessions(store, name, beforeDate);
  if (!sess.length) return null;
  return { date: sess[0].date, sets: sess[0].sets };
}

// Double-progression suggestion for the next session
export function suggestNext(store, name, reps, unit, beforeDate = todayKey()) {
  const sess = exerciseSessions(store, name, beforeDate);
  if (!sess.length) return null;
  const last = sess[0];
  const range = parseRepRange(reps);
  const inc = unit === "kg" ? 2.5 : 5;
  const topW = last.topW;
  const working = last.sets.filter(s => s.w === topW);
  if (!range || !topW) {
    return { w: topW, r: working[0] ? working[0].r : null, why: "Match last session, beat it by one rep.", kind: "hold" };
  }
  const [lo, hi] = range;
  const allTop = working.every(s => s.r >= hi);
  const anyLow = working.some(s => s.r < lo);
  if (allTop) return { w: topW + inc, r: lo, why: `All sets hit ${hi}. Add ${inc} ${unit} and restart at ${lo}.`, kind: "up" };
  const prev = sess[1];
  if (anyLow && prev && prev.topW === topW && prev.sets.some(s => s.r < lo)) {
    const dw = Math.round((topW * 0.9) / inc) * inc;
    return { w: dw, r: hi, why: `Stalled twice below ${lo}. Drop ~10% and build back up.`, kind: "down" };
  }
  const minR = Math.min(...working.map(s => s.r));
  return { w: topW, r: Math.min(hi, minR + 1), why: `Same weight. Push every set toward ${hi} reps.`, kind: "hold" };
}

export function warmupSets(work, unit, bar) {
  const inc = unit === "kg" ? 2.5 : 5;
  if (!work || work <= bar) return [];
  const pcts = [[0.4, 8], [0.6, 5], [0.8, 3]];
  const out = [{ w: bar, r: 10, pct: "Bar" }];
  pcts.forEach(([p, r]) => {
    const w = Math.max(bar, Math.round((work * p) / inc) * inc);
    if (w > out[out.length - 1].w && w < work) out.push({ w, r, pct: Math.round(p * 100) + "%" });
  });
  return out;
}

// Greedy plate loading per side
export function platesFor(target, unit, bar) {
  const sizes = unit === "kg" ? [25, 20, 15, 10, 5, 2.5, 1.25] : [45, 35, 25, 10, 5, 2.5];
  let side = (num(target) - bar) / 2;
  if (side <= 0) return { plates: [], rest: 0 };
  const plates = [];
  sizes.forEach(p => {
    while (side >= p - 1e-9) { plates.push(p); side -= p; }
  });
  return { plates, rest: Math.round(side * 2 * 100) / 100 };
}

export function haptic(ms = 10) {
  try { navigator.vibrate && navigator.vibrate(ms); } catch {}
}

// Short beep — used when rest ends
let _audioCtx = null;
export function beep(times = 2) {
  try {
    _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.22;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.start(t); o.stop(t + 0.18);
    }
  } catch {}
}
export function unlockAudio() {
  try {
    _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (_audioCtx.state === "suspended") _audioCtx.resume();
  } catch {}
}

// ============ Streaks & aggregates ============
export function getStreak(hist, restDays = {}) {
  // A rest day preserves the streak without incrementing it; today may still be pending.
  let s = 0;
  let k = todayKey();
  for (let i = 0; i < 730; i++) {
    if (hist[k]) s++;
    else if (restDays[k]) { /* preserve */ }
    else if (i > 0) break;
    k = addDays(k, -1);
  }
  return s;
}
export function weekDays(hist) {
  const ws = weekStart();
  return Object.keys(hist).filter(k => k >= ws && hist[k]).length;
}
export function weekVol(volHist) {
  const ws = weekStart();
  return Object.entries(volHist).filter(([k]) => k >= ws).reduce((s, [, v]) => s + v, 0);
}
// Consecutive weeks (ending this or last week) with >= goal sessions
export function weekStreak(hist, goal) {
  let ws = weekStart();
  const count = (start) => {
    let c = 0;
    for (let i = 0; i < 7; i++) if (hist[addDays(start, i)]) c++;
    return c;
  };
  let s = 0;
  if (count(ws) >= goal) s++;
  ws = addDays(ws, -7);
  for (let i = 0; i < 104; i++) {
    if (count(ws) >= goal) { s++; ws = addDays(ws, -7); } else break;
  }
  return s;
}

// Days since each split day was trained
export function muscleRecovery(muscleHist, woKeys) {
  const r = {};
  woKeys.forEach(k => {
    const last = muscleHist[k];
    r[k] = last ? daysBetween(last, todayKey()) : null;
  });
  return r;
}

// Hard sets per muscle over the last N days (primary muscle = 1 set, secondary = 0.5)
export function setsPerMuscle(store, days = 7) {
  const cutoff = addDays(todayKey(), -(days - 1));
  const nameToMuscles = {};
  Object.values(store.wo || {}).forEach(d => d.exercises.forEach(ex => {
    nameToMuscles[ex.name] = exerciseMuscles(ex);
    if (ex.nameB) nameToMuscles[ex.nameB] = guessMuscles(ex.nameB);
  }));
  const out = {};
  allSets(store).forEach(s => {
    if (s.date < cutoff) return;
    const ms = nameToMuscles[s.ex] || guessMuscles(s.ex);
    ms.forEach((m, i) => { out[m] = (out[m] || 0) + (i === 0 ? 1 : 0.5); });
  });
  return out;
}

// ============ Seed (demo data that looks lived-in) ============
export function seedHistory(wo) {
  const today = todayKey();
  const hist = {}, volHist = {}, muscleHist = {}, sessHist = [], weights = [], sleep = [], log = {};
  const base = {
    "Barbell Bench Press": 175, "Incline DB Press": 60, "Cable Flye": 35, "Push-up": 0, "Tricep Pushdown": 55,
    "Barbell Row": 165, "Lat Pulldown": 130, "Cable Row": 120, "Face Pull": 40, "DB Curl": 30,
    "Back Squat": 255, "Romanian Deadlift": 225, "Leg Extension": 110, "Walking Lunge": 40, "Standing Calf Raise": 180,
    "Overhead Press": 115, "DB Lateral Raise": 20, "Cable Front Raise": 20, "Rear Delt Fly": 15,
    "Close-Grip Bench": 155, "Barbell Curl": 80, "Overhead Tricep Ext": 50, "Hammer Curl": 35, "Wrist Curl": 60,
  };
  const keys = Object.keys(wo);
  let rot = 0;
  let rng = 7;
  const rand = () => { rng = (rng * 9301 + 49297) % 233280; return rng / 233280; };

  for (let i = 60; i >= 1; i--) {
    const k = addDays(today, -i);
    const dow = parseKey(k).getDay();
    const progress = (60 - i) / 60;
    if (dow !== 0 && rand() < 0.78) {
      const dk = keys[rot % keys.length];
      rot++;
      const day = wo[dk];
      const dayLog = {};
      let vol = 0;
      day.exercises.forEach(ex => {
        const [lo, hi] = parseRepRange(ex.reps) || [8, 10];
        const mk = (name, isB) => {
          const b0 = base[name] !== undefined ? base[name] : 50;
          const step = b0 > 100 ? 5 : 2.5;
          const w = b0 === 0 ? 0 : Math.round((b0 * (1 + progress * 0.08)) / step) * step;
          for (let si = 0; si < ex.sets; si++) {
            const r = b0 === 0 ? 12 + Math.floor(rand() * 6) : Math.max(lo, hi - si - Math.floor(rand() * 2));
            dayLog[setKey(ex.id, si, isB)] = { ex: name, si, w: String(w), r: String(r), done: true, ...(isB ? { b: true } : {}) };
            vol += w * r;
          }
        };
        mk(ex.name, false);
        if (ex.isSuperset && ex.nameB) mk(ex.nameB, true);
      });
      log[k] = dayLog;
      hist[k] = true;
      volHist[k] = Math.round(vol);
      muscleHist[dk] = k;
      sessHist.unshift({
        date: k, day: day.label, dayKey: dk,
        duration: 2700 + Math.floor(rand() * 1500),
        volume: Math.round(vol), exercises: day.exercises.length, id: uid(),
      });
    }
    if (i % 2 === 0) weights.push({ date: k, value: Math.round((182 - progress * 4 + (rand() - 0.5) * 1.4) * 10) / 10 });
    if (rand() < 0.85) sleep.push({ date: k, hours: Math.round((6.5 + rand() * 2) * 2) / 2, quality: 2 + Math.floor(rand() * 4) });
  }
  return { hist, volHist, muscleHist, sessHist, weights, sleep, log };
}

export function recomputePRs(log) {
  const prs = {};
  Object.entries(log).sort((a, b) => a[0].localeCompare(b[0])).forEach(([date, dayLog]) => {
    Object.values(dayLog).forEach(e => {
      if (!entryDone(e) || !num(e.w)) return;
      const e1 = epley1RM(e.w, e.r);
      const old = prs[e.ex];
      if (!old || e1 > old.e1rm) prs[e.ex] = { w: num(e.w), r: num(e.r), date, e1rm: e1, ...(old ? {} : { first: true }) };
    });
  });
  return prs;
}

export const DEFAULT_SETTINGS = {
  unit: "lb", theme: "auto", restDefault: 90, autoRest: true, sound: true,
  bar: 45, waterGoal: 8, weeklyGoal: 4, weightGoal: "",
  accent: "volt", name: "", onboarded: false, notify: true,
};

export function freshStore(withDemo = true) {
  const wo = withIds(DEFAULT_WO);
  const tk = todayKey();
  const s = withDemo ? seedHistory(wo) : { hist: {}, volHist: {}, muscleHist: {}, sessHist: [], weights: [], sleep: [], log: {} };
  return {
    v: 3,
    settings: { ...DEFAULT_SETTINGS },
    wo,
    activeProgram: "Push · Pull · Legs +",
    weights: s.weights,
    measurements: [],
    macroTargets: { p: 200, c: 280, f: 75 },
    macros: withDemo ? { [tk]: [{ meal: "Breakfast", p: 42, c: 65, f: 18, id: uid() }] } : {},
    savedMeals: withDemo ? [
      { meal: "Greek yogurt + berries", p: 25, c: 30, f: 4, id: uid() },
      { meal: "Chicken, rice, veg", p: 50, c: 75, f: 12, id: uid() },
      { meal: "Whey shake", p: 25, c: 4, f: 2, id: uid() },
    ] : [],
    water: withDemo ? { [tk]: 3 } : {},
    hist: s.hist, muscleHist: s.muscleHist, volHist: s.volHist,
    prs: recomputePRs(s.log),
    sleep: s.sleep,
    photos: [], programs: [],
    sessHist: s.sessHist,
    log: s.log,
    restDays: {}, cardio: [],
    activeSession: null, activeRest: null,
  };
}

// v1 → v2: log values were "185×8" strings keyed "d0-1-2"; dates were UTC.
export function migrate(st) {
  if (!st || typeof st !== "object") return freshStore();
  if (st.v === 2 || st.v === 3) {
    const wasV2 = st.v === 2;
    st.settings = { ...DEFAULT_SETTINGS, ...(wasV2 ? { onboarded: true } : {}), ...(st.settings || {}) };
    st.v = 3;
    return st;
  }
  const oldWo = st.wo || DEFAULT_WO;
  const wo = withIds(oldWo);
  const log = {};
  Object.entries(st.log || {}).forEach(([date, dayLog]) => {
    const out = {};
    Object.entries(dayLog || {}).forEach(([k, v]) => {
      if (v && typeof v === "object") { out[k] = v; return; }
      const m = String(k).match(/^(d\d+)-(\d+)(-b)?-(\d+)$/);
      const sv = String(v || "");
      const wr = sv.match(/(\d+\.?\d*)\s*[×x]\s*(\d+)/i);
      const w = wr ? wr[1] : (parseFloat(sv) > 0 ? sv : "");
      const r = wr ? wr[2] : (parseFloat(sv) > 0 ? "1" : "");
      if (!w && !r) return;
      if (m && wo[m[1]] && wo[m[1]].exercises[+m[2]]) {
        const ex = wo[m[1]].exercises[+m[2]];
        const isB = !!m[3];
        const name = isB ? (ex.nameB || ex.name + " B") : ex.name;
        out[setKey(ex.id, +m[4], isB)] = { ex: name, si: +m[4], w, r, done: true, ...(isB ? { b: true } : {}) };
      } else {
        out[k] = { ex: "Unknown", si: 0, w, r, done: true };
      }
    });
    log[date] = out;
  });
  const prs = { ...(st.prs || {}) };
  Object.keys(prs).forEach(n => { prs[n] = { ...prs[n], e1rm: prs[n].e1rm || epley1RM(prs[n].w, prs[n].r) }; });
  const rec = recomputePRs(log);
  Object.entries(rec).forEach(([n, p]) => { if (!prs[n] || p.e1rm > prs[n].e1rm) prs[n] = p; });
  return {
    ...freshStore(false),
    ...st,
    v: 3,
    settings: { ...DEFAULT_SETTINGS, onboarded: true, ...(st.settings || {}) },
    wo, log, prs,
    measurements: st.measurements || [],
    savedMeals: st.savedMeals || [],
    cardio: st.cardio || [],
    restDays: st.restDays || {},
    programs: st.programs || [],
    photos: st.photos || [],
    activeSession: null, activeRest: null,
    activeProgram: st.activeProgram || "Push · Pull · Legs +",
  };
}

// ============ Storage ============
export const STORAGE_KEY = "mercury_v1";
export function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const st = closeStaleSession(migrate(JSON.parse(raw)));
      saveStore(st);
      return st;
    }
  } catch {}
  const init = freshStore(true);
  saveStore(init);
  return init;
}
export function saveStore(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    window.dispatchEvent(new CustomEvent("mercury-storage-full"));
    return false;
  }
}

export function downloadFile(name, content, type = "application/json") {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Downscale an image file to a JPEG data URL (keeps localStorage small)
export function compressImage(file, maxSide = 900, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

// Convert every stored weight between lb and kg
export function convertUnits(st, to) {
  const f = to === "kg" ? 0.45359237 : 2.20462262;
  const rw = (v, step) => Math.round((num(v) * f) / step) * step;
  const step = to === "kg" ? 0.5 : 1;
  const log = {};
  Object.entries(st.log || {}).forEach(([d, day]) => {
    log[d] = {};
    Object.entries(day).forEach(([k, e]) => {
      log[d][k] = { ...e, w: e.w === "" || e.w === undefined ? e.w : String(rw(e.w, step)) };
    });
  });
  const prs = {};
  Object.entries(st.prs || {}).forEach(([n, p]) => { prs[n] = { ...p, w: rw(p.w, step), e1rm: rw(p.e1rm, step) }; });
  const volHist = {};
  Object.entries(st.volHist || {}).forEach(([d, v]) => { volHist[d] = Math.round(v * f); });
  return {
    ...st,
    log, prs, volHist,
    weights: (st.weights || []).map(w => ({ ...w, value: Math.round(w.value * f * 10) / 10 })),
    sessHist: (st.sessHist || []).map(s => ({ ...s, volume: Math.round((s.volume || 0) * f) })),
    cardio: (st.cardio || []).map(c => ({ ...c, distance: c.distance ? Math.round(c.distance * (to === "kg" ? 1.609344 : 0.621371) * 100) / 100 : c.distance })),
    settings: { ...st.settings, unit: to, bar: to === "kg" ? 20 : 45, weightGoal: st.settings.weightGoal ? String(Math.round(num(st.settings.weightGoal) * f)) : "" },
  };
}


// ============ v3 helpers ============
export function dayKeys(wo) {
  return Object.keys(wo || {}).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
}

// Which split day is up next: today's if already trained, else the one after the last session
export function suggestedDay(store) {
  const keys = dayKeys(store.wo);
  const tk = todayKey();
  if (store.activeSession && store.wo[store.activeSession.dayKey]) return store.activeSession.dayKey;
  const today = keys.find(k => store.muscleHist[k] === tk);
  if (today) return today;
  const last = (store.sessHist || []).find(s => s.date < tk);
  if (last) {
    const lk = last.dayKey || keys.find(k => store.wo[k].label === last.day);
    const i = keys.indexOf(lk);
    if (i >= 0) return keys[(i + 1) % keys.length];
  }
  return keys[0];
}

// Recompute a date's aggregates after a log change
export function withDayAggregates(st, date, dayKey) {
  const day = st.log[date] || {};
  const done = Object.values(day).filter(entryDone);
  const vol = done.reduce((a, e) => a + entryVol(e), 0);
  const hist = { ...st.hist };
  const volHist = { ...st.volHist };
  if (done.length) { hist[date] = true; volHist[date] = Math.round(vol); }
  else if (!(st.sessHist || []).some(s => s.date === date)) { delete hist[date]; delete volHist[date]; }
  const muscleHist = done.length && dayKey ? { ...st.muscleHist, [dayKey]: date } : st.muscleHist;
  return { ...st, hist, volHist, muscleHist };
}

export function daySetCount(day) {
  return (day.exercises || []).reduce((a, ex) => a + ex.sets * (ex.isSuperset ? 2 : 1), 0);
}
// ~45s per set of work + rest between sets
export function estimateMinutes(day, restDefault = 90) {
  const secs = (day.exercises || []).reduce((a, ex) => a + ex.sets * ((ex.isSuperset ? 90 : 45) + (ex.rest || restDefault)), 0);
  return Math.max(10, Math.round((secs / 60 + 8) / 5) * 5);
}
export function dayMuscles(day) {
  const set = new Set();
  (day.exercises || []).forEach(ex => exerciseMuscles(ex).slice(0, 2).forEach(m => set.add(m)));
  return [...set];
}

export function weightTrend(weights, alpha = 0.25) {
  let ema = null;
  return weights.map(w => {
    ema = ema === null ? w.value : ema + alpha * (w.value - ema);
    return { date: w.date, value: Math.round(ema * 10) / 10 };
  });
}

export function programToWo(days) {
  const wo = {};
  days.forEach((d, i) => {
    wo["d" + i] = {
      label: d.label, muscle: d.muscle || "",
      exercises: (d.exercises || []).map(ex => ({ ...ex, id: undefined, isSuperset: !!ex.isSuperset })),
    };
  });
  return withIds(wo);
}

export function sessionTopSets(store, date) {
  const top = {};
  Object.values(store.log[date] || {}).forEach(e => {
    if (!entryDone(e)) return;
    const cur = top[e.ex];
    if (!cur || epley1RM(e.w, e.r) > epley1RM(cur.w, cur.r)) top[e.ex] = { w: num(e.w), r: num(e.r) };
  });
  return Object.entries(top);
}

export function greeting(name) {
  const h = new Date().getHours();
  const part = h < 5 ? "Late night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name}` : part;
}

export function kcalOf(m) { return Math.round(m.p * 4 + m.c * 4 + m.f * 9); }

// Plain-language observations computed from the log
export function buildInsights(store) {
  const out = [];
  const tk = todayKey();
  const unit = store.settings.unit;
  // Strength trend on most-trained lifts
  const counts = {};
  allSets(store).forEach(s => { if (s.w > 0) counts[s.ex] = (counts[s.ex] || 0) + 1; });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n]) => n);
  let bestGain = null;
  top.forEach(n => {
    const sess = exerciseSessions(store, n);
    const recent = sess.filter(s => s.date >= addDays(tk, -14));
    const old = sess.filter(s => s.date < addDays(tk, -28) && s.date >= addDays(tk, -60));
    if (!recent.length || !old.length) return;
    const a = Math.max(...old.map(s => s.best1RM)), b = Math.max(...recent.map(s => s.best1RM));
    const pct = (b - a) / a * 100;
    if (!bestGain || pct > bestGain.pct) bestGain = { n, pct, b };
  });
  if (bestGain && bestGain.pct >= 1) out.push({ kind: "up", icon: "trend", title: `${bestGain.n} is climbing`, body: `Estimated 1RM up ${bestGain.pct.toFixed(0)}% this month — now ${bestGain.b} ${unit}.` });
  // PRs this month
  const prs30 = Object.values(store.prs || {}).filter(p => !p.first && p.date >= addDays(tk, -30)).length;
  if (prs30 >= 2) out.push({ kind: "up", icon: "trophy", title: `${prs30} personal records`, body: "Set in the last 30 days. Momentum is real." });
  // Under-trained muscles
  const spm = setsPerMuscle(store, 7);
  const low = MUSCLES.filter(m => (spm[m] || 0) > 0 && (spm[m] || 0) < 8 && !["forearms", "abs"].includes(m));
  const trainedAny = Object.keys(spm).length > 0;
  if (trainedAny && low.length) out.push({ kind: "warn", icon: "body", title: `${MUSCLE_LABEL[low[0]]} could use more`, body: `${Math.round(spm[low[0]] || 0)} hard sets this week — 10+ drives growth.` });
  // Weight trend
  const tr = weightTrend(store.weights || []);
  if (tr.length > 5) {
    const last = tr[tr.length - 1];
    const prev = tr.filter(t => t.date <= addDays(last.date, -14)).slice(-1)[0];
    if (prev) {
      const rate = (last.value - prev.value) / (daysBetween(prev.date, last.date) / 7);
      if (Math.abs(rate) >= 0.15) out.push({ kind: "info", icon: "weight", title: `Weight trending ${rate < 0 ? "down" : "up"}`, body: `${rate > 0 ? "+" : ""}${rate.toFixed(1)} ${unit}/week over the last two weeks.` });
    }
  }
  // Sleep
  const sl = (store.sleep || []).filter(s => s.date >= addDays(tk, -7));
  if (sl.length >= 3) {
    const avg = sl.reduce((a, s) => a + s.hours, 0) / sl.length;
    if (avg < 7) out.push({ kind: "warn", icon: "moon", title: "Sleep is running short", body: `${avg.toFixed(1)}h average this week. Recovery peaks at 7–9h.` });
  }
  // Consistency
  const wk = weekDays(store.hist);
  if (wk >= store.settings.weeklyGoal) out.push({ kind: "up", icon: "check", title: "Weekly goal hit", body: `${wk} sessions this week. Anything more is a bonus.` });
  return out.slice(0, 4);
}

// Accepts "82,5" (French keyboards) as well as "82.5"; strips anything else
export function cleanNum(v, decimal = true) {
  let s = String(v ?? "").replace(/,/g, ".").replace(decimal ? /[^0-9.]/g : /[^0-9]/g, "");
  if (decimal) { const i = s.indexOf("."); if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, ""); }
  return s;
}

// A session left open for hours (forgotten overnight) is closed and saved with its sets.
export const STALE_SESSION_MS = 6 * 3600 * 1000;
export function closeStaleSession(st) {
  const s = st.activeSession;
  if (!s || Date.now() - s.start < STALE_SESSION_MS) return st;
  const date = dkey(new Date(s.start));
  const done = Object.values(st.log[date] || {}).filter(entryDone);
  const day = st.wo[s.dayKey];
  let sessHist = st.sessHist || [];
  if (done.length && !sessHist.some(h => h.date === date && (h.dayKey === s.dayKey || (day && h.day === day.label)))) {
    sessHist = [{
      date, day: day ? day.label : "Workout", dayKey: s.dayKey,
      duration: Math.min(2 * 3600, Math.round((Date.now() - s.start) / 1000)),
      volume: Math.round(done.reduce((a, e) => a + entryVol(e), 0)),
      exercises: new Set(done.map(e => e.ex)).size, sets: done.length, id: uid(),
    }, ...sessHist];
  }
  return { ...st, activeSession: null, activeRest: null, sessHist };
}
