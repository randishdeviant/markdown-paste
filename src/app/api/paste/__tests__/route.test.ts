import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../route";
import * as idRoute from "@/app/api/paste/[id]/route";
import { createPaste } from "@/lib/redis";
import { createPasteLimiter, getClientIp } from "@/lib/ratelimit";
import { EXPIRY_OPTIONS } from "@/lib/constants";

vi.mock("@/lib/redis", async () => {
  const { EXPIRY_OPTIONS } = await import("@/lib/constants");
  return {
    EXPIRY_OPTIONS,
    createPaste: vi.fn(),
    getPaste: vi.fn(),
  };
});

vi.mock("@/lib/ratelimit", () => ({
  createPasteLimiter: { limit: vi.fn() },
  getClientIp: vi.fn(() => "203.0.113.1"),
}));

const limitMock = vi.mocked(createPasteLimiter.limit);
const createPasteMock = vi.mocked(createPaste);
const getClientIpMock = vi.mocked(getClientIp);

function makeRequest(body: unknown, ip = "203.0.113.1") {
  return new Request("http://localhost/api/paste", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

function allowRequest() {
  limitMock.mockResolvedValue({
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 60_000,
    pending: Promise.resolve(),
  });
}

function denyRequest() {
  limitMock.mockResolvedValue({
    success: false,
    limit: 10,
    remaining: 0,
    reset: Date.now() + 30_000,
    pending: Promise.resolve(),
  });
}

const createdPaste = {
  id: "testid123",
  content: "# Hello",
  created_at: "2026-01-01T00:00:00.000Z",
  expires_at: "2026-01-08T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  getClientIpMock.mockReturnValue("203.0.113.1");
  allowRequest();
  createPasteMock.mockImplementation(async (id, content) => ({
    ...createdPaste,
    id,
    content,
  }));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("EXPIRY_OPTIONS", () => {
  it("has no Never option and includes 6 months and 1 year", () => {
    expect(EXPIRY_OPTIONS.some((option) => option.value === 0)).toBe(false);
    expect(EXPIRY_OPTIONS.map((option) => option.label)).toEqual([
      "1 Day",
      "7 Days",
      "30 Days",
      "6 Months",
      "1 Year",
    ]);
  });
});

describe("POST /api/paste", () => {
  it("rejects requests without content", async () => {
    const res = await POST(makeRequest({}));

    expect(res.status).toBe(400);
    expect(createPasteMock).not.toHaveBeenCalled();
  });

  it("rejects the removed Never expiry (0)", async () => {
    const res = await POST(makeRequest({ content: "# Hello", expires_in: 0 }));

    expect(res.status).toBe(400);
    expect(createPasteMock).not.toHaveBeenCalled();
  });

  it.each([
    ["6 Months", 180 * 24 * 60 * 60],
    ["1 Year", 365 * 24 * 60 * 60],
  ])("accepts the %s expiry", async (_label, expiresIn) => {
    const res = await POST(
      makeRequest({ content: "# Hello", expires_in: expiresIn })
    );

    expect(res.status).toBe(200);
    expect(createPasteMock).toHaveBeenCalledWith(
      expect.any(String),
      "# Hello",
      expiresIn
    );
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/paste", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not valid json",
      })
    );

    expect(res.status).toBe(400);
    expect(createPasteMock).not.toHaveBeenCalled();
  });

  it("rejects content larger than 100 KB in UTF-8 bytes", async () => {
    // 51_500 characters but 103_000 bytes in UTF-8, so only a byte-aware
    // check catches it.
    const res = await POST(makeRequest({ content: "é".repeat(51_500) }));

    expect(res.status).toBe(400);
    expect(createPasteMock).not.toHaveBeenCalled();
  });

  it("returns 413 when Content-Length exceeds the limit", async () => {
    const res = await POST(
      new Request("http://localhost/api/paste", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(200 * 1024),
        },
        body: "{}",
      })
    );

    expect(res.status).toBe(413);
    expect(createPasteMock).not.toHaveBeenCalled();
  });

  it("returns 500 when storage fails", async () => {
    createPasteMock.mockRejectedValue(new Error("redis down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const res = await POST(makeRequest({ content: "# Hello" }));

      expect(res.status).toBe(500);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("exposes rate limit headers", async () => {
    const res = await POST(makeRequest({ content: "# Hello" }));

    expect(res.headers.get("x-ratelimit-limit")).toBe("10");
    expect(res.headers.get("x-ratelimit-remaining")).toBe("9");
    expect(res.headers.get("x-ratelimit-reset")).toMatch(/^\d+$/);
  });

  it("skips the rate limiter when the client IP is unknown", async () => {
    getClientIpMock.mockReturnValue(null);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const res = await POST(makeRequest({ content: "# Hello" }));

      expect(res.status).toBe(200);
      expect(limitMock).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    denyRequest();

    const res = await POST(makeRequest({ content: "# Hello" }));

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(res.headers.get("x-ratelimit-remaining")).toBe("0");
    expect(createPasteMock).not.toHaveBeenCalled();
  });

  it("fails open when the rate limiter errors", async () => {
    limitMock.mockRejectedValue(new Error("redis down"));

    const res = await POST(makeRequest({ content: "# Hello" }));

    expect(res.status).toBe(200);
    expect(createPasteMock).toHaveBeenCalled();
  });

  it("builds the paste URL from NEXT_PUBLIC_APP_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com/");

    const res = await POST(makeRequest({ content: "# Hello" }));
    const body = await res.json();

    expect(body.url).toMatch(/^https:\/\/example\.com\/p\/[A-Za-z0-9_-]{8}$/);
  });

  it("falls back to the request origin when APP_URL is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    const res = await POST(makeRequest({ content: "# Hello" }));
    const body = await res.json();

    expect(body.url).toMatch(/^http:\/\/localhost\/p\/[A-Za-z0-9_-]{8}$/);
  });
});

describe("DELETE /api/paste/[id]", () => {
  it("is no longer exposed", () => {
    expect("DELETE" in idRoute).toBe(false);
  });
});
