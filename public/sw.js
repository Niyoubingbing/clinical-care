const APP_VERSION = "2.15.0";
const CACHE = "clinical-care-v" + APP_VERSION;
// 构建期由 scripts/gen-sw-precache.mjs 注入的全量预缓存清单（所有路由 HTML + /_next/static/*）。
// 源文件中 PRECACHE_LIST 的赋值保留占位符，构建时由脚本替换为真实数组，以便可重复构建。
// 默认值含核心路由壳：即便构建期注入脚本因故未执行（如部署平台跳过 npm 脚本链），
// 首页 / 待办 / 设置 / 病人详情 仍可离线命中；完整清单由 gen-sw-precache.mjs 注入覆盖。
const PRECACHE_LIST = /*__PRECACHE_LIST__*/["/", "/todos", "/settings", "/patient", "/manifest.json", "/icon.svg"];
// 通用病人详情壳的固定缓存键：与具体 id 无关，离线打开「任意未在线访问过的病人」时兜底。
const PATIENT_SHELL_KEY = CACHE + "::patient-shell";

// 判断是否为病人详情路由（/patient 或 /patient/xxx）。
function isPatientRoute(pathname) {
  return pathname === "/patient" || pathname.startsWith("/patient/");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE_LIST))
      .catch(() => {})
  );
  // 注意：不调用 skipWaiting。新版本安装后进入 waiting 状态，由旧 Service Worker
  // 继续控制页面，保证「旧版本完整运行」。只有收到 SKIP_WAITING 消息
  // （用户在「关于应用」点击更新）才激活新版本。
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        // 删除旧版本缓存，但保留当前版本的通用病人壳键（跨激活复用）。
        Promise.all(
          keys
            .filter((k) => k !== CACHE && k !== PATIENT_SHELL_KEY)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// 把病人详情路由的响应同时写入「通用壳键」，供离线打开任意病人兜底。
async function cachePatientShell(cache, res) {
  try {
    await cache.put(PATIENT_SHELL_KEY, res.clone());
  } catch {
    /* 忽略写入失败 */
  }
}

// 整页导航：优先命中预缓存（含 /patient 静态壳）→ 网络（写入缓存）→ 离线兜底。
async function handleNavigate(request, url) {
  const cached = await caches.match(request, { cacheName: CACHE });
  if (cached) return cached;
  try {
    const res = await fetch(request);
    // 仅当响应正常（2xx）才缓存并返回；否则视为未命中，走下方兜底而非把错误页透传。
    if (res && res.ok) {
      const copy = res.clone();
      const cache = await caches.open(CACHE);
      cache.put(request, copy);
      if (isPatientRoute(url.pathname)) {
        await cachePatientShell(cache, res);
      }
      return res;
    }
    throw new Error("navigate-bad-status-" + (res && res.status));
  } catch {
    // 离线/服务端错误兜底：病人详情路由优先用已缓存的通用壳（与具体 id 无关），
    // 否则回退到已缓存的首页 App Shell，避免「网址无法访问 / 裸 404」。
    if (isPatientRoute(url.pathname)) {
      const shell = await caches.match(PATIENT_SHELL_KEY, { cacheName: CACHE });
      if (shell) return shell;
    }
    const home = await caches.match("/", { cacheName: CACHE });
    return home || Response.error();
  }
}

// 静态资源：cache-first，并在成功响应时写入运行时缓存。
async function handleAsset(request, url) {
  const cached = await caches.match(request, { cacheName: CACHE });
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res && res.status === 200 && (res.type === "basic" || res.type === "cors")) {
      const copy = res.clone();
      const cache = await caches.open(CACHE);
      cache.put(request, copy);
      // 病人详情路由的文档同样写入通用壳键（首页播种也走此分支）。
      if (isPatientRoute(url.pathname)) {
        await cachePatientShell(cache, res);
      }
    }
    return res;
  } catch {
    return cached || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // 仅处理同源请求

  if (request.mode === "navigate") {
    event.respondWith(handleNavigate(request, url));
    return;
  }

  event.respondWith(handleAsset(request, url));
});
