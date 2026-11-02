// Mercury — builds the signed Android APK into apk/Mercury.apk
// Usage: npm run apk
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const root = process.cwd();
const toolchain = path.join(os.homedir(), ".mercury-toolchain");
const env = { ...process.env };
if (!env.JAVA_HOME && fs.existsSync(path.join(toolchain, "jdk21"))) env.JAVA_HOME = path.join(toolchain, "jdk21");
const sdk = env.ANDROID_HOME || env.ANDROID_SDK_ROOT || path.join(toolchain, "sdk");

const run = (cmd, cwd = root) => { console.log(`\n> ${cmd}`); execSync(cmd, { cwd, stdio: "inherit", env }); };

if (!fs.existsSync(path.join(root, "signing", "keystore.properties"))) {
  console.error("Missing signing/keystore.properties — the APK can't be signed. Restore the signing/ folder from your backup.");
  process.exit(1);
}
fs.writeFileSync(path.join(root, "android", "local.properties"), `sdk.dir=${sdk.replace(/\\/g, "/")}\n`);

run("node build.mjs");
run("npx cap sync android");
const androidDir = path.join(root, "android");
const gradlew = process.platform === "win32" ? `"${path.join(androidDir, "gradlew.bat")}"` : "./gradlew";
run(`${gradlew} assembleRelease --no-daemon`, androidDir);

const out = path.join(root, "android", "app", "build", "outputs", "apk", "release", "app-release.apk");
fs.mkdirSync(path.join(root, "apk"), { recursive: true });
fs.copyFileSync(out, path.join(root, "apk", "Mercury.apk"));
console.log(`\nAPK ready: apk/Mercury.apk (${(fs.statSync(out).size / 1048576).toFixed(1)} MB)`);
