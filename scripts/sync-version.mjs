// 构建前同步版本号：把 package.json 的 version 写入 public/version.json，
// 并把 public/sw.js 里的 __APP_VERSION__ 占位符替换为当前版本。
// 这样每次部署 sw.js 内容都会随版本变化，浏览器才能在 update() 时检测到新 Service Worker。
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;

// 1) version.json —— 前端「关于应用」读取、检查更新时与远程比对。
writeFileSync(
  join(root, "public", "version.json"),
  JSON.stringify({ version }, null, 2) + "\n",
  "utf8"
);

// 2) sw.js —— 注入版本，使缓存名与内容随版本变化。
const swPath = join(root, "public", "sw.js");
let sw = readFileSync(swPath, "utf8");
sw = sw.replace(/const APP_VERSION = "[^"]*";/, `const APP_VERSION = "${version}";`);
writeFileSync(swPath, sw, "utf8");

console.log(`[sync-version] version -> ${version}`);
