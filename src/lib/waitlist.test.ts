import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const put = vi.fn();
vi.mock("@vercel/blob", () => ({ put: (...args: unknown[]) => put(...args) }));

const { POST } = await import("../app/api/waitlist/route");

function request(body: unknown, ip: string) {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
  });
}

describe("POST /api/waitlist", () => {
  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = "test-token";
    put.mockReset().mockResolvedValue({});
  });
  afterEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  it("stores one private entry per address", async () => {
    const first = await POST(request({ email: " Reader@Example.com ", language: "ko" }, "10.1.0.1"));
    const second = await POST(request({ email: "reader@example.com", language: "en" }, "10.1.0.1"));
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const [path, body, options] = put.mock.calls[0];
    expect(path).toMatch(/^waitlist\/[0-9a-f]{32}\.json$/);
    expect(path).not.toContain("reader");
    expect(put.mock.calls[1][0]).toBe(path);
    expect(JSON.parse(body)).toMatchObject({ email: "reader@example.com", language: "ko" });
    expect(options).toMatchObject({ access: "private", allowOverwrite: true });
  });

  it("rejects an invalid address without storing anything", async () => {
    const response = await POST(request({ email: "not-an-email", language: "en" }, "10.1.0.2"));
    expect(response.status).toBe(400);
    expect(put).not.toHaveBeenCalled();
  });

  it("says the waitlist isn't open when storage isn't configured", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const response = await POST(request({ email: "a@b.co", language: "en" }, "10.1.0.3"));
    expect(response.status).toBe(503);
    expect(put).not.toHaveBeenCalled();
  });
});
