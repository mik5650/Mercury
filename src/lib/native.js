// Mercury — platform layer: Android (Capacitor) vs. browser.
// Rest-end alerts (native RestAlerts plugin), file export/share,
// back button, system bar style.
import { Capacitor, SystemBars, SystemBarsStyle, registerPlugin } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export const isNative = Capacitor.isNativePlatform();
const RestAlerts = registerPlugin("RestAlerts");

// Edge-to-edge (WebView ≥ 140): bars sit over the app, so icons follow the theme.
// Older WebViews get opaque dark bars (zero insets) — keep the icons light there.
export function setSystemBarsTheme(theme) {
  if (!isNative) return;
  const apply = () => {
    const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe-area-inset-top")) || 0;
    const style = theme === "dark" || top === 0 ? SystemBarsStyle.Dark : SystemBarsStyle.Light;
    SystemBars.setStyle({ style }).catch(() => {});
  };
  apply();
  setTimeout(apply, 800);
}

export function onBackButton(handler) {
  if (!isNative) return () => {};
  const p = CapApp.addListener("backButton", handler);
  return () => { p.then(h => h.remove()); };
}
export function minimizeApp() { if (isNative) CapApp.minimizeApp().catch(() => {}); }

// ---------- Notifications ----------
const normPerm = p => (p === "granted" || p === "denied" ? p : "prompt");

export async function notificationPermission() {
  if (isNative) {
    try { return normPerm((await RestAlerts.checkPermissions()).notifications); } catch { return "denied"; }
  }
  if (!("Notification" in window)) return "denied";
  return Notification.permission === "default" ? "prompt" : Notification.permission;
}

export async function requestNotifications() {
  if (isNative) {
    try { return normPerm((await RestAlerts.requestPermissions()).notifications); } catch { return "denied"; }
  }
  if (!("Notification" in window)) return "denied";
  try { const r = await Notification.requestPermission(); return r === "default" ? "prompt" : r; } catch { return "denied"; }
}

// ---------- Rest-end alert (Android) ----------
// The native side schedules an exact alarm and posts the alert itself, so it fires on time
// with the app in the background or the screen off.
export function syncRestAlert(state) {
  if (isNative) RestAlerts.update({ state }).catch(() => {});
}
// event: "resume" | "pause"
export function onAppState(event, cb) {
  if (!isNative) return () => {};
  const p = RestAlerts.addListener(event, cb);
  return () => { p.then(h => h.remove()); };
}

// Browser: the page shows its own notification when the rest ends while the tab is hidden.
export async function showWebRestNotification(body) {
  if (isNative || !("Notification" in window) || Notification.permission !== "granted") return;
  const opts = { body: body || "Time for your next set.", icon: "icon.svg", badge: "icon.svg", tag: "rest", renotify: true, vibrate: [120, 60, 120] };
  try {
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    if (reg) { await reg.showNotification("Rest complete", opts); return; }
  } catch {}
  try { new Notification("Rest complete", opts); } catch {}
}

// ---------- Files ----------
function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = rej;
    r.onload = () => res(String(r.result).split(",")[1]);
    r.readAsDataURL(blob);
  });
}

// Saves a file: browser download, or Android share sheet (Drive, Files, WhatsApp…)
export async function saveFile(name, content, type = "application/json") {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  if (isNative) {
    const data = await blobToBase64(blob);
    const { uri } = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache });
    await Share.share({ title: name, files: [uri], dialogTitle: "Save or send" });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Shares an image (share card): native share sheet, Web Share, or download as fallback.
export async function shareImage(name, blob, title) {
  if (isNative) return saveFile(name, blob, "image/png");
  const file = new File([blob], name, { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title });
    return;
  }
  return saveFile(name, blob, "image/png");
}
