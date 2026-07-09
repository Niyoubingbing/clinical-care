// @ts-nocheck
// Regression tests for the "Vercel clean URL 404" fix.
//
// This harness loads the real `public/sw.js` inside a `vm` sandbox so we can
// exercise the actual `handleNavigate` implementation (not a re-implementation).
// The service worker source uses top-level `const`/`function` declarations and
// calls `self.addEventListener` at registration time; the sandbox below mocks
// `self`, `caches`, and `fetch` so we can capture `handleNavigate` and drive it
// directly. We intentionally DO NOT execute `next build` and DO NOT modify any
// business source (vercel.json / sw.js / app / lib).

import { readFileSync } from "node:fs";
import vm from "node:vm";
import { test, expect } from "vitest";

// ---------------------------------------------------------------------------
// Test 1: vercel.json validity + rewrite-rule completeness (static assertions)
// ---------------------------------------------------------------------------

const ROOT = new URL(".", import.meta.url).pathname;

test("vercel.json: valid JSON, rewrites array, build/output fields intact", () => {
  const raw = readFileSync("vercel.json", "utf8");
  let cfg;
  expect(() => { cfg = JSON.parse(raw); }, "vercel.json must be valid JSON").not.toThrow();

  expect(Array.isArray(cfg.rewrites), "rewrites must be an array").toBe(true);

  // Existing fields must not have been clobbered by the fix.
  expect(cfg.buildCommand, "buildCommand should remain 'npm run build'").toBe("npm run build");
  expect(cfg.outputDirectory, "outputDirectory should remain 'out'").toBe("out");

  const expected = [
    { source: "/todos", destination: "/todos.html" },
    { source: "/settings", destination: "/settings.html" },
    { source: "/settings/:path*", destination: "/settings/:path*.html" },
    { source: "/patient/:path*", destination: "/patient.html" },
  ];

  // Must be exactly these four (the fix adds a controlled set of clean-URL rewrites).
  expect(cfg.rewrites.length, "there must be exactly 4 rewrite rules").toBe(expected.length);
  for (const rule of expected) {
    const found = cfg.rewrites.some(
      (r) => r.source === rule.source && r.destination === rule.destination
    );
    expect(found, `missing rewrite rule: ${JSON.stringify(rule)}`).toBe(true);
  }
});

// ---------------------------------------------------------------------------
// Test 2: public/sw.js handleNavigate no longer leaks a raw 404 (core regression)
// ---------------------------------------------------------------------------

const swSrc = readFileSync("public/sw.js", "utf8");

/**
 * Build a controlled sandbox that loads real sw.js and exposes handleNavigate.
 * caches.match returns null (no precache) so we exercise the offline fallback
 * branch; fetch is reconfigurable per-scenario via setFetch.
 */
function makeCtx() {
  let fetchImpl = async () => new Response("x", { status: 200 });

  const caches = {
    async open() {
      return { async put() {}, async match() { return null; } };
    },
    async match() {
      return null;
    },
  };

  const fetchMock = (...args) => fetchImpl(...args);

  const listeners = {};
  const selfMock = {
    location: { origin: "https://example.com" },
    addEventListener: (type, fn) => { listeners[type] = fn; },
    clients: { async claim() {} },
  };

  const context = {
    self: selfMock,
    caches,
    fetch: fetchMock,
    Response,
    Request,
    console,
    URL,
  };
  context.globalThis = context;

  vm.createContext(context);
  // Expose handleNavigate onto the context. Within a single runInContext call the
  // function declaration is lexically resolvable, so the assignment succeeds.
  vm.runInContext(swSrc + "\n;globalThis.__hn = handleNavigate;", context);

  return {
    context,
    get hn() { return context.__hn; },
    setFetch(fn) { fetchImpl = fn; },
  };
}

test("sw handleNavigate: 404 from server is NOT passed through (todos)", async () => {
  const ctx = makeCtx();
  const bad = new Response("not found", { status: 404 });
  ctx.setFetch(async () => bad);

  const req = new Request("https://example.com/todos");
  const url = new URL("https://example.com/todos");

  const result = await ctx.hn(req, url);
  // Core evidence of the fix: the SW must not return the leaked 404 object.
  expect(result, "handleNavigate must not return the raw 404 response object").not.toBe(bad);
  // Defensive: the fallback response must not carry a 404 status.
  expect(result.status, "fallback response must not have status 404").not.toBe(404);
});

test("sw handleNavigate: 200 response is returned as-is (todos)", async () => {
  const ctx = makeCtx();
  ctx.setFetch(async () => new Response("<html>todos</html>", { status: 200 }));

  const req = new Request("https://example.com/todos");
  const url = new URL("https://example.com/todos");

  const res = await ctx.hn(req, url);
  expect(res.ok, "a successful navigate response should be returned").toBe(true);
  expect(res.status, "a successful navigate response should keep status 200").toBe(200);
});

test("sw handleNavigate: 404 from server is NOT passed through (settings)", async () => {
  const ctx = makeCtx();
  const bad404 = new Response("not found", { status: 404 });
  ctx.setFetch(async () => bad404);

  const req = new Request("https://example.com/settings");
  const url = new URL("https://example.com/settings");

  const result = await ctx.hn(req, url);
  expect(result, "settings route must not return the raw 404 response object").not.toBe(bad404);
  expect(result.status, "settings fallback must not have status 404").not.toBe(404);
});

test("sw handleNavigate: 404 from server is NOT passed through (patient route)", async () => {
  const ctx = makeCtx();
  const bad404 = new Response("nf", { status: 404 });
  ctx.setFetch(async () => bad404);

  const req = new Request("https://example.com/patient/309W");
  const url = new URL("https://example.com/patient/309W");

  const result = await ctx.hn(req, url);
  expect(result, "patient route must not return the raw 404 response object").not.toBe(bad404);
  expect(result.status, "patient fallback must not have status 404").not.toBe(404);
});
