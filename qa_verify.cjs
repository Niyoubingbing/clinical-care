const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = "D:/Document/OneDrive - uppingallthetime/Document/Project-Management/WorkRoom/PWA";
const out = path.join(root, "out");
const lines = [];
const log = (s) => lines.push(s);

// 1) precache injection
const sw = fs.readFileSync(path.join(out, "sw.js"), "utf8");
const m = sw.match(/\/\*__PRECACHE_LIST__\*\/\s*(\[[\s\S]*?\])/);
if (m) {
  const arr = JSON.parse(m[1]);
  log("PRECACHE_ENTRY_COUNT=" + arr.length);
  const htmlRoutes = arr.filter((x) => x === "/" || x.endsWith(".html") || x.startsWith("/todos") || x.startsWith("/settings") || x.startsWith("/patient"));
  const nextStatic = arr.filter((x) => x.startsWith("/_next/static"));
  log("HAS_NEXT_STATIC_ASSETS=" + nextStatic.length);
  log("HAS_HTML_OR_ROUTE_ENTRIES=" + htmlRoutes.length);
  log("HAS_MANIFEST=" + arr.includes("/manifest.json"));
  log("HAS_ICON=" + arr.includes("/icon.svg"));
  log("SAMPLE_FIRST6=" + JSON.stringify(arr.slice(0, 6)));
} else {
  log("PRECACHE_PLACEHOLDER_NOT_REPLACED=FAIL");
}

// 2) patient/[id] dynamic dir must NOT exist
const dynDir = path.join(out, "patient", "[id]");
log("PATIENT_ID_DIR_ABSENT=" + (!fs.existsSync(dynDir)));

// 3) static routes present
const htmls = [];
(function walk(d, base) {
  for (const n of fs.readdirSync(d)) {
    const full = path.join(d, n);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, base ? base + "/" + n : n);
    else if (n.endsWith(".html")) htmls.push(base ? base + "/" + n : n);
  }
})(out, "");
log("HTML_ROUTES=" + JSON.stringify(htmls.sort()));

fs.writeFileSync(path.join(root, "qa_verify.log"), lines.join("\n") + "\n", "utf8");
console.log("VERIFY_DONE");
