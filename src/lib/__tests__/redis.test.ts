import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const hset = vi.fn();
  const expire = vi.fn();
  const exec = vi.fn();
  const pipeline = vi.fn(() => ({ hset, expire, exec }));

  return { hset, expire, exec, pipeline };
});

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: () => ({ pipeline: mocks.pipeline }),
  },
}));

import { createPaste } from "../redis";
import { DEFAULT_TTL_SECONDS } from "../constants";

describe("createPaste", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes the paste hash and expiry through a single pipeline", async () => {
    await createPaste("abc12345", "# Hello", 3600);

    expect(mocks.pipeline).toHaveBeenCalledTimes(1);
    expect(mocks.hset).toHaveBeenCalledWith(
      "paste:abc12345",
      expect.objectContaining({
        id: "abc12345",
        content: "# Hello",
      })
    );
    expect(mocks.expire).toHaveBeenCalledWith("paste:abc12345", 3600);
    expect(mocks.exec).toHaveBeenCalledTimes(1);
  });

  it("uses the default TTL when none is provided", async () => {
    await createPaste("abc12345", "# Hello");

    expect(mocks.expire).toHaveBeenCalledWith(
      "paste:abc12345",
      DEFAULT_TTL_SECONDS
    );
  });

  it("does not write a global index key", async () => {
    await createPaste("abc12345", "# Hello");

    const writtenKeys = mocks.hset.mock.calls.map((call) => call[0]);
    expect(writtenKeys).not.toContain("pastes:index");
  });
});
