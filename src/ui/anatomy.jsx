// Mercury — muscle map: front + back figures, heat by weekly sets, tap a muscle for details.
// Each figure is drawn as its left half and mirrored, so it is perfectly symmetric.
import { useState } from "react";

// Body outline (left half, x ≤ 100). Arms are separated from the torso by the armpit notch.
const SILHOUETTE =
  "M100,64 C96,64 93,62 92,58 C82,62 68,63 58,69 C47,75 43,88 44,103 " +
  "C41,120 40,138 42,151 C38,170 35,189 35,203 C34,213 37,221 43,221 C49,221 51,213 51,205 " +
  "C55,189 58,171 60,156 C62,140 64,124 66,113 C66,131 68,150 70,166 C70,177 68,185 70,193 " +
  "C66,215 64,240 66,262 C66,277 70,288 72,296 C68,316 68,340 72,360 C72,372 70,381 74,387 " +
  "C79,391 88,391 90,387 C90,377 88,367 88,359 C90,339 92,317 90,297 C94,282 98,260 99,236 L100,206 Z";

const FRONT = [
  { m: "traps", d: "M92,58 C88,63 80,67 70,70 C80,72 88,72 94,70 C95,66 94,61 92,58 Z" },
  { m: "delts", d: "M68,70 C57,70 49,77 47,90 C46,98 48,106 51,111 C56,103 62,97 68,93 C72,86 73,77 68,70 Z" },
  { m: "chest", d: "M98,73 L98,104 C90,109 79,109 71,103 C67,97 67,87 70,80 C76,73 88,71 98,73 Z" },
  { m: "biceps", d: "M50,113 C46,123 45,136 47,148 C49,153 55,153 57,148 C60,136 61,123 59,113 C57,108 52,108 50,113 Z" },
  { m: "forearms", d: "M46,156 C42,170 40,185 40,198 C42,204 47,204 49,199 C53,187 56,171 57,158 C55,152 49,151 46,156 Z" },
  { m: "abs", d: "M88,111 L97,111 L97,124 L88,124 Q87,117 88,111 Z" },
  { m: "abs", d: "M88,127 L97,127 L97,140 L88,140 Z" },
  { m: "abs", d: "M88,143 L97,143 L97,156 L88,156 Z" },
  { m: "abs", d: "M88,159 L97,159 L97,180 Q92,182 89,176 Z" },
  { m: "abs", d: "M72,110 C74,128 76,148 80,168 C82,174 85,176 86,172 C86,150 86,128 86,111 C81,109 76,108 72,110 Z", soft: true },
  { m: "quads", d: "M75,197 C69,215 67,237 69,258 C70,268 74,276 80,280 C86,270 90,252 92,232 C94,214 92,200 88,194 C83,189 78,191 75,197 Z" },
  { m: "quads", d: "M93,214 C97,228 98,246 96,262 C95,272 92,280 87,284 C85,276 86,268 89,258 C92,244 93,228 93,214 Z" },
  { m: "calves", d: "M75,302 C70,320 70,340 74,358 C77,364 83,363 85,357 C88,338 88,318 85,303 C82,296 77,296 75,302 Z", soft: true },
];

const BACK = [
  { m: "traps", d: "M98,54 C94,61 84,67 69,71 C78,79 88,94 98,124 Z" },
  { m: "delts", d: "M68,70 C57,70 49,77 47,90 C46,98 48,106 51,111 C56,103 62,97 68,93 C72,86 73,77 68,70 Z" },
  { m: "lats", d: "M71,97 C67,113 67,134 72,156 C77,166 87,171 96,174 L96,138 C89,123 81,108 71,97 Z" },
  { m: "triceps", d: "M49,111 C45,123 44,137 46,149 C49,154 55,153 57,147 C60,134 60,120 58,110 C55,105 51,106 49,111 Z" },
  { m: "forearms", d: "M46,156 C42,170 40,185 40,198 C42,204 47,204 49,199 C53,187 56,171 57,158 C55,152 49,151 46,156 Z" },
  { m: "back-low", d: "M98,128 L98,182 C93,182 89,179 88,174 C88,158 90,142 98,128 Z" },
  { m: "glutes", d: "M99,188 C88,184 77,186 71,196 C67,208 71,223 83,227 C92,229 98,223 99,215 Z" },
  { m: "hamstrings", d: "M72,232 C68,251 70,270 76,284 C80,290 88,290 92,284 C96,268 98,249 96,232 C88,227 78,227 72,232 Z" },
  { m: "calves", d: "M75,300 C69,316 70,335 76,348 C80,353 86,351 88,345 C92,331 92,314 88,300 C84,293 78,294 75,300 Z" },
];

function Figure({ parts, fill, selected, onPick, back }) {
  const mirror = "translate(200,0) scale(-1,1)";
  const draw = (prefix) => parts.map((p, i) => {
    const on = selected === p.m;
    const tappable = p.m !== "back-low";
    return (
      <path key={prefix + i} d={p.d}
        fill={fill(p.m)} fillOpacity={p.soft ? 0.85 : 1}
        stroke={on ? "var(--t1)" : "var(--card-2)"} strokeWidth={on ? 1.6 : 1.4} strokeLinejoin="round"
        style={{ cursor: tappable ? "pointer" : "default", transition: "fill 0.5s ease" }}
        onClick={tappable ? () => onPick(p.m) : undefined} />
    );
  });
  return (
    <svg viewBox="28 0 144 400" width="100%" style={{ display: "block", maxHeight: 330 }} role="img" aria-label={back ? "Back muscles" : "Front muscles"}>
      <ellipse cx="100" cy="32" rx="16" ry="20" fill="var(--figure)" />
      <path d={back ? "M91,46 L109,46 L110,58 C104,62 96,62 90,58 Z" : "M92,48 L108,48 L109,60 C104,64 96,64 91,60 Z"} fill="var(--figure)" />
      <path d={SILHOUETTE} fill="var(--figure)" />
      <path d={SILHOUETTE} fill="var(--figure)" transform={mirror} />
      {draw("l")}
      <g transform={mirror}>{draw("r")}</g>
    </svg>
  );
}

const LABEL = {
  chest: "Chest", delts: "Shoulders", triceps: "Triceps", biceps: "Biceps", forearms: "Forearms",
  lats: "Lats", traps: "Traps & upper back", abs: "Core", quads: "Quads", hamstrings: "Hamstrings",
  glutes: "Glutes", calves: "Calves",
};

export function MuscleMap({ intensity = {}, sets = {} }) {
  const [sel, setSel] = useState(null);
  const heat = v => {
    if (!v || v < 0.05) return null;
    if (v < 0.34) return "rgba(var(--accent-rgb),0.38)";
    if (v < 0.67) return "rgba(var(--accent-rgb),0.68)";
    return "var(--accent)";
  };
  const fill = m => heat(intensity[m]) || "var(--figure-muscle)";
  const pick = m => setSel(s => (s === m ? null : m));
  const n = sel ? Math.round(sets[sel] || 0) : 0;
  const status = !sel ? null : n === 0 ? "Not trained in this period" : n < 10 ? "Below the growth range" : n <= 20 ? "In the growth range" : "High volume";

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "14px 6px 8px", borderRadius: 18, background: "radial-gradient(60% 55% at 50% 40%, rgba(var(--accent-rgb),0.07), transparent 70%), var(--card-2)" }}>
        {[["Front", FRONT, false], ["Back", BACK, true]].map(([l, parts, back]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <Figure parts={parts} fill={fill} selected={sel} onPick={pick} back={back} />
            <div className="caption" style={{ fontSize: 11.5, fontWeight: 600, marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>
      <div className="row between" style={{ marginTop: 12, minHeight: 40, padding: "0 4px" }}>
        {sel ? (
          <>
            <div>
              <div style={{ fontWeight: 650 }}>{LABEL[sel]}</div>
              <div className="caption" style={{ fontSize: 12 }}>{status}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="big-num" style={{ fontSize: 24 }}>{n}</span>
              <span className="caption"> sets / wk</span>
            </div>
          </>
        ) : (
          <>
            <span className="caption" style={{ fontSize: 12 }}>Tap a muscle for details</span>
            <div className="row gap-6">
              <span className="caption" style={{ fontSize: 11 }}>Less</span>
              {[0, 0.2, 0.5, 0.9].map(t => <span key={t} style={{ width: 16, height: 8, borderRadius: 4, background: heat(t) || "var(--figure-muscle)" }} />)}
              <span className="caption" style={{ fontSize: 11 }}>More</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
