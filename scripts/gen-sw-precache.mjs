// 构建后脚本（next build 之后运行）：扫描 next export 产物 out/ 目录，
// 生成「全量预缓存清单」并注入 out/sw.js 的占位符 /*__PRECACHE_LIST__*/。
//
// 清单来源：
//   1) 所有 *.html 文件 → 路由路径（out/index.html → "/"，out/todos.html → "/todos"，
//      out/settings/rounding.html → "/settings/rounding"，out/patient.html → "/patient"）。
//   2) 所有 out/_next/static/** 文件 → 以 "/_next/static/..." 开头的路径。
//
// 排除项：sw.js 自身、version.json（需每次联网校验更新）、404.html（兜底页，不应被预缓存）。
//
// 注意：next export 的「拷贝 public/ → out/」可能在主构建进程退出后由导出 worker 异步完成，
// 因此本脚本先等待 out/sw.js 出现且含占位符（代表 Next 拷贝已完成），再注入，
// 确保注入结果不被后续拷贝覆盖。
import {
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "out");

if (!existsSync(outDir)) {
  console.error("[gen-sw-precache] 未找到 out/ 目录，请先运行 next build");
  process.exit(1);
}

// 不参与预缓存的文件（根目录级）。
const EXCLUDE = new Set(["sw.js", "version.json", "404.html"]);

const routes = new Set();

function walk(dir, base) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    const rel = base ? `${base}/${name}` : name;
    if (st.isDirectory()) {
      walk(full, rel);
      continue;
    }
    // 根目录下的排除文件（sw.js / version.json / 404.html）。
    if (EXCLUDE.has(name) && base === "") continue;
    if (rel.endsWith(".html")) {
      const r = rel.replace(/\.html$/, "");
      routes.add(r === "index" ? "/" : "/" + r);
    } else {
      routes.add("/" + rel.split("\\").join("/"));
    }
  }
}

walk(outDir, "");

const list = [...routes].sort();

const swPath = join(outDir, "sw.js");
const MARKER = "/*__PRECACHE_LIST__*/";

// 等待 Next 静态导出把 public/sw.js（含占位符）拷贝到 out/sw.js 完成。
// 占位符出现在 out/sw.js 即代表拷贝已完成，此时再注入可避免被后续拷贝覆盖。
async function waitForSw() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (existsSync(swPath)) {
      const content = readFileSync(swPath, "utf8");
      if (content.includes(MARKER)) return content;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

const existing = await waitForSw();
if (existing === null) {
  console.error(
    "[gen-sw-precache] 等待 out/sw.js 占位符超时（Next 静态导出可能尚未完成 public/ 拷贝）"
  );
  process.exit(1);
}

// 注入真实清单（替换全部占位符出现），替换后 out/sw.js 仍是合法 JS。
const sw = existing.replace(/\/\*__PRECACHE_LIST__\*\/\s*\[[^\]]*\]/, MARKER + JSON.stringify(list));
writeFileSync(swPath, sw, "utf8");

console.log(`[gen-sw-precache] 已注入 ${list.length} 个预缓存资源`);
