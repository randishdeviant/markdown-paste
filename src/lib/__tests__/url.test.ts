import { describe, it, expect, afterEach, vi } from "vitest";
import { getAppUrl, normalizeAppUrl } from "../url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("normalizeAppUrl", () => {
  it("removes trailing slashes", () => {
    expect(normalizeAppUrl("https://example.com///")).toBe(
      "https://example.com"
    );
  });

  it("returns null for missing or empty values", () => {
    expect(normalizeAppUrl(undefined)).toBeNull();
    expect(normalizeAppUrl(null)).toBeNull();
    expect(normalizeAppUrl("   ")).toBeNull();
    expect(normalizeAppUrl("/")).toBeNull();
  });
});

describe("getAppUrl", () => {
  it("prefers the environment variable", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com/");

    expect(getAppUrl("http://localhost:3000")).toBe("https://example.com");
  });

  it("falls back to the provided origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    expect(getAppUrl("http://localhost:3000/")).toBe("http://localhost:3000");
  });

  it("returns an empty string when no source is available", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    expect(getAppUrl()).toBe("");
  });
});
