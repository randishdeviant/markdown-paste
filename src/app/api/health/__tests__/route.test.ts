import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { redis } from "@/lib/redis";

vi.mock("@/lib/redis", () => ({
  redis: { ping: vi.fn() },
}));

const pingMock = vi.mocked(redis.ping);

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok when Redis responds", async () => {
    pingMock.mockResolvedValue("PONG");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("returns 503 when Redis is unreachable", async () => {
    pingMock.mockRejectedValue(new Error("redis down"));

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "degraded" });
  });
});
