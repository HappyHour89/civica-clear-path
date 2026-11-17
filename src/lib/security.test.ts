import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory stand-in for the private Vercel Blob store.
const store = new Map<string, { body: Uint8Array; uploadedAt: Date }>();
const deleted: string[] = [];
vi.mock("@vercel/blob", () => ({
  put: vi.fn(async (path: string, body: string) => {
    store.set(path, { body: new TextEncoder().encode(body), uploadedAt: new Date() });
    return {};
  }),
  get: vi.fn(async (path: string) => {
    const entry = store.get(path);
    return entry ? { statusCode: 200, stream: new Response(new Blob([entry.body as BlobPart])).body, headers: new Headers(), blob: {} } : null;
  }),
  del: vi.fn(async (paths: string | string[]) => {
    for (const p of [paths].flat()) {
      deleted.push(p);
      store.delete(p);
    }
  }),
  list: vi.fn(async ({ prefix }: { prefix: string }) => ({
    blobs: [...store.entries()]
      .filter(([k]) => k.startsWith(prefix))
      .map(([pathname, v]) => ({ pathname, url: pathname, uploadedAt: v.uploadedAt })),
    hasMore: false,
  })),
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), cacheTag: vi.fn(), cacheLife: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

const { isCrossSite } = await import("../proxy");
const { readUpload, fileToContentBlock } = await import("./upload");
const security = await import("./security");
const { POST: login } = await import("../app/api/review/login/route");
const { POST: uploadRoute } = await import("../app/api/upload/route");
const { ExternalLink } = await import("../components/ui");
// Children are passed as createElement arguments below.
const Link = ExternalLink as (props: { href: string; children?: React.ReactNode }) => React.ReactNode;
const nextConfig = (await import("../../next.config")).default;

function apiRequest(method: string, path: string, headers: Record<string, string>) {
  const url = new URL(`https://civica-clear-path.com${path}`);
  return { method, nextUrl: url, headers: new Headers({ host: url.host, ...headers }) };
}

beforeEach(() => {
  store.clear();
  deleted.length = 0;
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";
  process.env.PUBLISH_SECRET = "test-secret";
  process.env.REVIEWER_CODES = "Maya:correct-horse-1";
});
afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.SECURITY_ALERT_WEBHOOK_URL;
});

describe("cross-site request protection", () => {
  it("refuses writes from another website's page", () => {
    expect(isCrossSite(apiRequest("POST", "/api/ask", { origin: "https://evil.example" }))).toBe(true);
    expect(isCrossSite(apiRequest("POST", "/api/review/action", { "sec-fetch-site": "cross-site" }))).toBe(true);
    expect(isCrossSite(apiRequest("POST", "/api/ask", { origin: "not a url" }))).toBe(true);
  });
  it("allows the site itself, reads, non-browser callers and Stripe's webhook", () => {
    expect(isCrossSite(apiRequest("POST", "/api/ask", { origin: "https://civica-clear-path.com" }))).toBe(false);
    expect(isCrossSite(apiRequest("GET", "/api/library", { origin: "https://evil.example" }))).toBe(false);
    expect(isCrossSite(apiRequest("POST", "/api/ask", {}))).toBe(false);
    expect(isCrossSite(apiRequest("POST", "/api/stripe/webhook", { origin: "https://stripe.com" }))).toBe(false);
  });
});

describe("large uploads", () => {
  it("reads an upload from storage once, then deletes it", async () => {
    store.set("uploads/abc123-XyZ.bin", { body: new TextEncoder().encode("%PDF-1.4 test"), uploadedAt: new Date() });
    const form = new FormData();
    form.set("fileRef", "uploads/abc123-XyZ.bin");
    form.set("fileName", "bill.pdf");
    const file = await readUpload(form, "file");
    expect(file?.name).toBe("bill.pdf");
    expect(await fileToContentBlock(file!)).toMatchObject({ type: "document", source: { media_type: "application/pdf" } });
    expect(deleted).toEqual(["uploads/abc123-XyZ.bin"]);
    expect(store.size).toBe(0);
  });

  it("never reads Civica's other private files", async () => {
    for (const ref of ["feedback/page/1-error-abc.json", "uploads/../waitlist/x.bin", "waitlist/abc.json", "uploads/a/b.bin"]) {
      const form = new FormData();
      form.set("fileRef", ref);
      await expect(readUpload(form, "file")).rejects.toMatchObject({ status: 400 });
    }
  });

  it("rejects files over 20 MB, even if storage holds more", async () => {
    store.set("uploads/big.bin", { body: new Uint8Array(20 * 1024 * 1024 + 1), uploadedAt: new Date() });
    const form = new FormData();
    form.set("fileRef", "uploads/big.bin");
    await expect(readUpload(form, "file")).rejects.toMatchObject({ status: 413 });
    expect(deleted).toContain("uploads/big.bin");
  });

  it("accepts a 20 MB PDF but limits images to 5 MB", async () => {
    const pdf = new Uint8Array(20 * 1024 * 1024);
    pdf.set(new TextEncoder().encode("%PDF-1.7"));
    await expect(fileToContentBlock(new File([pdf], "a.pdf"))).resolves.toMatchObject({ type: "document" });
    const png = new Uint8Array(6 * 1024 * 1024);
    png.set([0x89, 0x50, 0x4e, 0x47]);
    await expect(fileToContentBlock(new File([png], "a.png"))).rejects.toMatchObject({ status: 413 });
  });

  it("only issues upload permits for the token step", async () => {
    const request = new Request("https://civica-clear-path.com/api/upload", {
      method: "POST",
      body: JSON.stringify({ type: "blob.upload-completed", payload: {} }),
      headers: { "x-forwarded-for": "10.9.0.1" },
    });
    expect((await uploadRoute(request)).status).toBe(400);
  });
});

describe("review desk sign-in", () => {
  const signIn = (code: string, ip: string) =>
    login(
      new Request("https://civica-clear-path.com/api/review/login", {
        method: "POST",
        body: JSON.stringify({ code }),
        headers: { "x-forwarded-for": ip, "x-vercel-ip-country": "US" },
      }),
    );

  it("logs each wrong passcode without the passcode or the address, and alerts", async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = "https://hooks.example/alert";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
    const response = await signIn("wrong-guess-1", "203.0.113.7");
    expect(response.status).toBe(401);
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain("sign-in failed");
    expect(logged).not.toContain("wrong-guess-1");
    expect(logged).not.toContain("203.0.113.7");
    expect([...store.keys()].some((k) => k.startsWith("security/login-failures/"))).toBe(true);
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(String(fetchSpy.mock.calls[0][1]?.body)).toContain("wrong review-desk passcode");
  });

  it("sends ntfy alerts as plain text so the phone notification is readable", async () => {
    process.env.SECURITY_ALERT_WEBHOOK_URL = "https://ntfy.sh/civica-test-topic";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("ok"));
    await security.sendSecurityAlert("Civica: wrong review-desk passcode");
    const init = fetchSpy.mock.calls[0][1]!;
    expect(init.body).toBe("Civica: wrong review-desk passcode");
    expect((init.headers as Record<string, string>).Title).toBe("Civica security alert");
  });

  it("locks an address out after 10 wrong passcodes, across servers", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const tag = security.addressTag(new Request("https://x", { headers: { "x-forwarded-for": "198.51.100.4" } }));
    const bucket = Math.floor(Date.now() / security.LOGIN_WINDOW_MS);
    for (let i = 0; i < security.MAX_FAILURES_PER_ADDRESS; i++) {
      store.set(`security/login-failures/${bucket}/${Date.now() - i}-${tag}.json`, { body: new Uint8Array(), uploadedAt: new Date() });
    }
    // Even the right passcode is refused while locked out.
    expect((await signIn("correct-horse-1", "198.51.100.4")).status).toBe(429);
    // Another address is unaffected.
    expect((await signIn("correct-horse-1", "198.51.100.5")).status).toBe(200);
  });

  it("sets the session cookie HttpOnly, SameSite=Strict and Secure in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await signIn("correct-horse-1", "192.0.2.10");
    vi.unstubAllEnvs();
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Secure/);
  });

  it("cleans up old failure records and abandoned uploads", async () => {
    const old = new Date(Date.now() - 8 * 24 * 3_600_000);
    store.set("security/login-failures/1/old-x.json", { body: new Uint8Array(), uploadedAt: old });
    store.set("security/login-failures/2/new-x.json", { body: new Uint8Array(), uploadedAt: new Date() });
    store.set("uploads/stale.bin", { body: new Uint8Array(), uploadedAt: new Date(Date.now() - 2 * 3_600_000) });
    expect(await security.cleanUpSecurityFiles()).toEqual({ deleted: 2 });
    expect([...store.keys()]).toEqual(["security/login-failures/2/new-x.json"]);
  });
});

describe("links and headers", () => {
  it("renders only http(s) links from AI answers as links", () => {
    const bad = renderToStaticMarkup(createElement(Link, { href: "javascript:alert(1)" }, "Official page"));
    expect(bad).not.toContain("href");
    expect(bad).toContain("Official page");
    expect(renderToStaticMarkup(createElement(Link, { href: "https://congress.gov/x" }, "x"))).toContain(
      'href="https://congress.gov/x"',
    );
  });

  it("sends security headers on every page", async () => {
    const [rule] = await nextConfig.headers!();
    const headers = Object.fromEntries(rule.headers.map((h) => [h.key, h.value]));
    expect(rule.source).toBe("/:path*");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(headers["Strict-Transport-Security"]).toContain("max-age=63072000");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
