const APP_VERSION = "2.12.4";
const CACHE = "clinical-care-v" + APP_VERSION;
const ASSETS = ["/", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
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
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  event.respondWith(
    caches.match(request, { cacheName: CACHE }).then((cached) => {
      // cache-first + 仅匹配当前版本缓存：旧版本期间始终返回已缓存内容，
      // 且不会误命中 waiting 新 SW 已预缓存的资源，确保「旧版本完整运行」；
      // 新版本激活后旧缓存被清除，首次请求即写入新缓存。
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
