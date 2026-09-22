import { describe, it, expect } from "vitest";
import { hasMarkdownStructure, isBase64Spam } from "../validation";

describe("hasMarkdownStructure", () => {
  it("detects heading", () => {
    expect(hasMarkdownStructure("# Hello World")).toBe(true);
  });

  it("detects heading level 3", () => {
    expect(hasMarkdownStructure("### Subtitle")).toBe(true);
  });

  it("detects unordered list with dash", () => {
    expect(hasMarkdownStructure("- Item 1\n- Item 2")).toBe(true);
  });

  it("detects unordered list with asterisk", () => {
    expect(hasMarkdownStructure("* Item 1")).toBe(true);
  });

  it("detects unordered list with plus", () => {
    expect(hasMarkdownStructure("+ Item 1")).toBe(true);
  });

  it("detects ordered list", () => {
    expect(hasMarkdownStructure("1. First\n2. Second")).toBe(true);
  });

  it("detects code block", () => {
    expect(hasMarkdownStructure("```js\nconsole.log('hi')\n```")).toBe(true);
  });

  it("detects paragraph break", () => {
    expect(hasMarkdownStructure("Paragraph one.\n\nParagraph two.")).toBe(true);
  });

  it("returns false for plain text without structure", () => {
    expect(hasMarkdownStructure("just some random text here")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(hasMarkdownStructure("")).toBe(false);
  });
});

describe("isBase64Spam", () => {
  it("returns false for normal markdown", () => {
    expect(isBase64Spam("# Hello World\n\nThis is a test.")).toBe(false);
  });

  it("returns false for short strings", () => {
    expect(isBase64Spam("YXNi")).toBe(false);
  });

  it("returns true for long base64 without structure", () => {
    expect(
      isBase64Spam(
        "TWljcm9zb2Z0IFdpbmRvd3MgMTAgUHJvZHVjdCBVcGRhdGUgU2VydmljZSBUZXJtcw=="
      )
    ).toBe(true);
  });

  it("returns true for another base64 string", () => {
    expect(
      isBase64Spam(
        "SGVsbG8gV29ybGQhIFRoaXMgaXMgYSB0ZXN0IG1lc3NhZ2UgZm9yIGJhc2U2NCBlbmNvZGluZy4="
      )
    ).toBe(true);
  });

  it("returns false for base64 with heading", () => {
    expect(
      isBase64Spam("# My Token\n\naGFza3VkaGFza2R1aGFza2R1")
    ).toBe(false);
  });

  it("returns false for base64 in a list", () => {
    expect(
      isBase64Spam("- Token: aGFza3VkaGFza2R1aGFza2R1\n- Expiry: 7 days")
    ).toBe(false);
  });

  it("returns false for base64 in code block", () => {
    expect(
      isBase64Spam("```base64\nSGVsbG8gV29ybGQ=\n```")
    ).toBe(false);
  });

  it("returns false for string with newline breaks", () => {
    expect(
      isBase64Spam("Some text here.\n\nMore text here.")
    ).toBe(false);
  });

  it("returns false for non-base64 characters", () => {
    expect(isBase64Spam("Hello! This has @#$%^&* characters.")).toBe(false);
  });
});
