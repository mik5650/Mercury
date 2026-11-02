// Mercury — icon set (24px grid, rounded strokes)
const P = {
  home: <><path d="M3.5 10.5 12 4l8.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19z" /></>,
  dumbbell: <><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  trend: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  fuel: <><path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v6M7 6h4M17 21V3c-2 1.5-3 4-3 7s1 3 3 3" /></>,
  body: <><circle cx="12" cy="4.5" r="2" /><path d="M5 9l7 1.5L19 9M12 10.5V15M12 15l-3 6M12 15l3 6" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  minus: <><path d="M5 12h14" /></>,
  check: <><path d="M5 12.5l4.5 4.5L19 7.5" /></>,
  x: <><path d="M6 6l12 12M18 6 6 18" /></>,
  "chev-r": <><path d="M9 6l6 6-6 6" /></>,
  "chev-l": <><path d="M15 6l-6 6 6 6" /></>,
  "chev-d": <><path d="M6 9l6 6 6-6" /></>,
  "chev-u": <><path d="M6 15l6-6 6 6" /></>,
  play: <><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none" /></>,
  pause: <><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" /></>,
  stop: <><rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none" /></>,
  timer: <><circle cx="12" cy="13.5" r="7.5" /><path d="M12 10v3.5l2.5 1.5M9.5 2.5h5M19 6l1.5-1.5" /></>,
  flame: <><path d="M12 21.5c-4 0-7-2.7-7-6.6 0-3.2 2.2-5.2 3.5-7 .3 1.8 1.4 3 2.5 3.3C11 7.6 12.5 5 14.5 2.5c.6 3.4 4.5 6 4.5 11.4 0 4.6-3 7.6-7 7.6z" /></>,
  trophy: <><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  moon: <><path d="M20.5 14A8.5 8.5 0 1 1 10 3.5a6.5 6.5 0 0 0 10.5 10.5z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></>,
  drop: <><path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10 12 3 12 3z" /></>,
  scale: <><rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M8.5 9.5a5 5 0 0 1 7 0L12 12.5z" /></>,
  camera: <><path d="M3.5 8.5a2 2 0 0 1 2-2h2l1.5-2h6l1.5 2h2a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /><circle cx="12" cy="13" r="3.5" /></>,
  share: <><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8M5 13v5.5A2 2 0 0 0 7 20.5h10a2 2 0 0 0 2-2V13" /></>,
  download: <><path d="M12 3.5V15M7.5 10.5 12 15l4.5-4.5M5 20.5h14" /></>,
  upload: <><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8M5 20.5h14" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>,
  dots: <><circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" /></>,
  tools: <><path d="M14.5 6.5a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3l9-9a4 4 0 0 0-2-2z" /><path d="M14.5 6.5 17 4l3 3-2.5 2.5" /></>,
  plate: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2.5" /></>,
  copy: <><rect x="8.5" y="8.5" width="12" height="12" rx="3" /><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" /></>,
  star: <><path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.8l-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z" /></>,
  note: <><path d="M6 3.5h8.5L19 8v12.5H6z" /><path d="M14 3.5V8.5h5M9 13h6M9 16.5h4" /></>,
  swap: <><path d="M7 4 3.5 7.5 7 11M3.5 7.5H17M17 13l3.5 3.5L17 20M20.5 16.5H7" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  bolt: <><path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12z" /></>,
  heart: <><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z" /></>,
  run: <><circle cx="14.5" cy="4.5" r="1.8" /><path d="M7 21l3.5-5.5L13 17v4M6 11.5l3-3.5h4l2.5 3.5 3 1M10 8l-1.5 6 4 2.5" /></>,
  bike: <><circle cx="6" cy="16.5" r="3.5" /><circle cx="18" cy="16.5" r="3.5" /><path d="M6 16.5 10 9h5l3 7.5M9 6h3M12 16.5 10 9" /></>,
  wave: <><path d="M2.5 9c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 3-2M2.5 15.5c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 3-2" /></>,
  walk: <><circle cx="13" cy="4.5" r="1.8" /><path d="M9 21l2-6 2.5 2v4M8 12l2-4h3l2 4 2.5 1M11 8l-1 5" /></>,
  edit: <><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>,
  trash: <><path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13.5h10L18 7M10 11v6M14 11v6" /></>,
  up: <><path d="M12 19V5M6 11l6-6 6 6" /></>,
  down: <><path d="M12 5v14M6 13l6 6 6-6" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8v.2" /></>,
  sparkle: <><path d="M12 3c.7 4.5 2.5 6.3 7 7-4.5.7-6.3 2.5-7 7-.7-4.5-2.5-6.3-7-7 4.5-.7 6.3-2.5 7-7zM19 16c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5z" /></>,
  history: <><path d="M3.5 12a8.5 8.5 0 1 0 2.8-6.3M3.5 4v4.5H8M12 8v4.5l3 2" /></>,
  list: <><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></>,
  rest: <><path d="M4 18V8M4 14h16v4M20 14v-2.5a3 3 0 0 0-3-3h-6V14" /><circle cx="7.5" cy="10.5" r="1.5" /></>,
  ruler: <><path d="M4 16.5 16.5 4l3.5 3.5L7.5 20z" /><path d="M8 12.5l1.5 1.5M10.5 10l2 2M13 7.5l1.5 1.5" /></>,
  grid: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></>,
  book: <><path d="M4.5 5A1.5 1.5 0 0 1 6 3.5h13.5v15H6A1.5 1.5 0 0 0 4.5 20zM4.5 20A1.5 1.5 0 0 0 6 21.5h13.5v-3" /></>,
};

export function Icon({ name, size = 20, stroke = 1.8, style, className }) {
  const d = P[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style} className={className}>
      {d}
    </svg>
  );
}
