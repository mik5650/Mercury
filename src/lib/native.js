// Mercury — platform layer: Android (Capacitor) vs. browser.
// Rest notifications, file export/share, back button, system bar style.
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { App as CapApp } from "@capacitor/app";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export const isNative = Capacitor.isNativePlatform();
const REST_ID = 4201;
const CHANNEL = "rest-timer";

// ---------- Setup ----------
export async function initNative() {
  if (!isNative) return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL, name: "Rest timer", description: "Tells you when your rest is over",
      importance: 5, visibility: 1, vibration: true, lights: true, lightColor: "#C6F432",
    });
  } catch {}
}

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
export async function notificationPermission() {
  if (isNative) {
    try { return (await LocalNotifications.checkPermissions()).display; } catch { return "denied"; }
  }
  if (!("Notification" in window)) return "denied";
  return Notification.permission === "default" ? "prompt" : Notification.permission;
}

export async function requestNotifications() {
  if (isNative) {
    try { return (await LocalNotifications.requestPermissions()).display; } catch { return "denied"; }
  }
  if (!("Notification" in window)) return "denied";
  try { const r = await Notification.requestPermission(); return r === "default" ? "prompt" : r; } catch { return "denied"; }
}

// Android: schedule a real alarm-backed notification for when the rest ends,
// so it fires even if the app is in the background or the screen is off.
export async function scheduleRestEnd(endAt, body) {
  if (!isNative) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REST_ID }] });
    if (endAt - Date.now() < 1500) return;
    await LocalNotifications.schedule({
      notifications: [{
        id: REST_ID, channelId: CHANNEL,
        title: "Rest complete", body: body || "Time for your next set.",
        schedule: { at: new Date(endAt), allowWhileIdle: true },
        smallIcon: "ic_stat_mercury", iconColor: "#C6F432", autoCancel: true,
      }],
    });
  } catch {}
}

export async function cancelRestEnd() {
  if (!isNative) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REST_ID }] });
    await LocalNotifications.removeAllDeliveredNotifications();
  } catch {}
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
