import { describe, it, expect } from "vitest";
import { preflightResponse, withCors } from "../cors";

describe("CORS helpers", () => {
  it("returns a 204 preflight response with permissive CORS headers", () => {
    const response = preflightResponse();

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toContain(
      "POST"
    );
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "Content-Type"
    );
  });

  it("merges per-response headers without dropping CORS", () => {
    const headers = withCors({ "X-RateLimit-Limit": "10" });

    expect(headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(headers["X-RateLimit-Limit"]).toBe("10");
  });
});
