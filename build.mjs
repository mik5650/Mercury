// Mercury build — bundles src/ into a single self-contained dist/index.html
// Usage: node build.mjs [--watch]
import { context, build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const watch = process.argv.includes("--watch");
const out = "dist";

const options = {
  entryPoints: ["src/main.jsx"],
  bundle: true,
  minify: !watch,
  format: "iife",
  target: ["es2019", "safari14"],
  jsx: "automatic",
  write: false,
  outdir: out,
  define: { "process.env.NODE_ENV": watch ? '"development"' : '"production"' },
  legalComments: "none",
  logLevel: "info",
};

function emit(result) {
  const js = result.outputFiles.find(f => f.path.endsWith(".js")).text.replace(/<\/script/gi, "<\\/script");
  const cssFile = result.outputFiles.find(f => f.path.endsWith(".css"));
  const css = cssFile ? cssFile.text : "";
  const tpl = fs.readFileSync("src/index.html", "utf8");
  const html = tpl.replace("/*__CSS__*/", () => css).replace("/*__JS__*/", () => js);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "index.html"), html);
  for (const f of fs.readdirSync("public")) fs.copyFileSync(path.join("public", f), path.join(out, f));
  console.log(`dist/index.html  ${(html.length / 1024).toFixed(0)} KB`);
}

if (watch) {
  const ctx = await context({
    ...options,
    plugins: [{ name: "emit", setup(b) { b.onEnd(r => { if (!r.errors.length) emit(r); }); } }],
  });
  await ctx.watch();
  console.log("watching src/ …");
} else {
  emit(await build(options));
}
