const { transformFileSync } = require("@babel/core");
const fs = require("fs");
const path = require("path");

const DIST = path.join(__dirname, "dist");

// JSX files to compile (order matters for the HTML script tags)
const JSX_FILES = [
  "shared-components.jsx",
  "erasmus-learning-agreement.jsx",
  "sinav-otomasyonu.jsx",
  "ders-muafiyet.jsx",
  "yaz-okulu.jsx",
  "ogrenci-portali.jsx",
  "proje-modulu.jsx",
  "duyuru-entegrasyonu.jsx",
  "app-shell.jsx",
];

// Static files/dirs to copy into dist
const STATIC_ASSETS = ["logo.png", "duyurular"];

// ── helpers ──────────────────────────────────────────────
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    ensureDir(dest);
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// ── 1. Clean & create dist ──────────────────────────────
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true });
}
ensureDir(DIST);

// ── 2. Compile JSX → JS ────────────────────────────────
console.log("Compiling JSX files...");
let compiled = 0;
for (const file of JSX_FILES) {
  const src = path.join(__dirname, file);
  if (!fs.existsSync(src)) {
    console.error(`  ERROR: ${file} not found, skipping`);
    continue;
  }
  const result = transformFileSync(src, {
    presets: ["@babel/preset-react"],
  });
  const outName = file.replace(/\.jsx$/, ".js");
  fs.writeFileSync(path.join(DIST, outName), result.code, "utf8");
  compiled++;
  console.log(`  ${file} -> ${outName}`);
}

// ── 3. Generate production index.html ───────────────────
console.log("Generating production index.html...");
let html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

// Remove Babel standalone script tag (not needed in production)
html = html.replace(
  /\s*<!-- Babel Standalone.*?-->\s*<script src="https:\/\/unpkg\.com\/@babel\/standalone\/babel\.min\.js"><\/script>\s*/s,
  "\n"
);

// Replace the inline loader script with simple <script> tags for compiled JS
const scriptTags = JSX_FILES.map((f) => {
  const jsFile = f.replace(/\.jsx$/, ".js");
  return `  <script src="${jsFile}"></script>`;
}).join("\n");

// Replace everything from the module loader comment to the end of its script
html = html.replace(
  /\s*<script>\s*\/\/ ═+\s*\/\/ Optimized JSX Module Loader[\s\S]*?<\/script>\s*(<\/body>)/,
  `\n${scriptTags}\n\n  <script>\n    var root = ReactDOM.createRoot(document.getElementById('root'));\n    root.render(React.createElement(window.AppShell));\n  </script>\n$1`
);

// Clear the loading screen - replace with a simple root div
html = html.replace(
  /<div id="root">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,
  '<div id="root"></div>'
);

fs.writeFileSync(path.join(DIST, "index.html"), html, "utf8");

// ── 4. Copy static assets ──────────────────────────────
console.log("Copying static assets...");
for (const asset of STATIC_ASSETS) {
  const src = path.join(__dirname, asset);
  if (fs.existsSync(src)) {
    copyRecursive(src, path.join(DIST, asset));
    console.log(`  ${asset}`);
  }
}

console.log(`\nBuild complete! ${compiled} files compiled to dist/`);
