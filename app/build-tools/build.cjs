const fs = require("fs"),
  path = require("path"),
  esbuild = require("esbuild"),
  cp = require("child_process");
const root = path.resolve(__dirname, "..");
fs.writeFileSync(
  path.join(__dirname, "tailwind.config.cjs"),
  `module.exports={content:[${JSON.stringify(path.join(root, "source/App.jsx"))}],theme:{extend:{}},plugins:[]};`,
);
cp.execFileSync(
  process.execPath,
  [
    require.resolve("tailwindcss/lib/cli.js"),
    "-c",
    path.join(__dirname, "tailwind.config.cjs"),
    "-i",
    path.join(root, "source/app.css"),
    "-o",
    path.join(root, "source/compiled.css"),
    "--minify",
  ],
  { stdio: "inherit" },
);
const result = esbuild.buildSync({
  entryPoints: [path.join(root, "source/App.jsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: ["safari14", "chrome90"],
  nodePaths: [path.join(__dirname, "node_modules")],
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "eof",
});
const css =
  fs.readFileSync(path.join(root, "source/original-style.css"), "utf8") +
  "\n" +
  fs.readFileSync(path.join(root, "source/compiled.css"), "utf8");
const html =
  '<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="application-name" content="10年磨一劍 P1"><title>10年磨一劍 · P2.0.0 整合驗收版</title><style>' +
  css +
  '</style></head><body><div id="root"></div><noscript>請啟用 JavaScript 開啟本機驗收版。</noscript><script>' +
  result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script") +
  "</script></body></html>";
fs.writeFileSync(path.join(root, "tenyear-salon-P2.0.0.html"), html);
fs.writeFileSync(path.join(root, "../index.html"), html);
console.log("Built", Buffer.byteLength(html), "bytes; no network dependencies");
