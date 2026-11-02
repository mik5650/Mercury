import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./app.jsx";

createRoot(document.getElementById("root")).render(<App />);

if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol) && location.hostname !== "localhost") {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
