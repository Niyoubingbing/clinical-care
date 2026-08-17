import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const src = readFileSync(join(root, "public", "sw.js"), "utf8");

let fetchBehavior = "404";
let okBody = "<html>todos</html>";

const sandbox = {
  self: {
    location: { origin: "https://example.com" },
    addEventListener: () => {},
  },
  caches: {
    open: async () => ({
      put: async () => {},
      addAll: async () => {},
      match: async () => null,
      delete: async () => {},
    }),
    match: async (request) => {
      if (request === "/") return new Response("<html>home</html>", { status: 200 });
      if (typeof request === "string" && request.endsWith("patient-shell")) return null;
      return null;
    },
    keys: async () => [],
    delete: async () => {},
  },
  fetch: async () => {
    if (fetchBehavior === "404") return new Response("not found", { status: 404 });
    return new Response(okBody, { status: 200 });
  },
  Response,
  Request,
  URL,
  TextEncoder,
  TextDecoder,
  console,
};

const code = src + "\n;globalThis.__hn = handleNavigate;";
const context = vm.createContext(sandbox);
vm.runInContext(code, context, { filename: "public/sw.js" });
const handleNavigate = sandbox.__hn;
console.log("handleNavigate type:", typeof handleNavigate);

async function run(label, path, behavior, body) {
  fetchBehavior = behavior;
  if (body) okBody = body;
  const req = new Request("https://example.com" + path);
  const url = new URL("https://example.com" + path);
  const res = await handleNavigate(req, url);
  const text = await res.text();
  console.log(`[${label}] path=${path} behavior=${behavior} status=${res.status} ok=${res.ok} body=${JSON.stringify(text)}`);
}

await run("A", "/todos", "404");
await run("B", "/todos", "ok", "<html>todos</html>");
await run("C", "/settings", "404");
await run("D", "/settings", "ok", "<html>settings</html>");
await run("E", "/patient/309W", "404");
