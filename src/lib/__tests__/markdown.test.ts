import { describe, it, expect } from "vitest";
import { processMarkdown } from "../markdown";

describe("processMarkdown – raw HTML", { timeout: 30000 }, () => {
  it("renders inline HTML alongside markdown", async () => {
    const html = await processMarkdown(
      "# Judul\n\nTekan <span>Ctrl</span> lalu <kbd>C</kbd>."
    );

    expect(html).toContain("<h1>Judul</h1>");
    expect(html).toContain("<span>Ctrl</span>");
    expect(html).toContain("<kbd>C</kbd>");
  });

  it("does not wrap surrounding markdown in a code block", async () => {
    const html = await processMarkdown(
      "# Judul\n\nParagraf dengan <span>inline HTML</span>."
    );

    expect(html).not.toContain("```");
    expect(html).not.toContain("language-html");
  });

  it("strips scripts together with their content", async () => {
    const html = await processMarkdown(
      "Hello\n\n<script>alert('xss')</script>"
    );

    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert");
  });

  it("strips styles together with their content", async () => {
    const html = await processMarkdown(
      "Hello\n\n<style>body { display: none }</style>"
    );

    expect(html).not.toContain("<style");
    expect(html).not.toContain("display: none");
  });

  it("removes inline event handlers", async () => {
    const html = await processMarkdown(
      '<img src="https://example.com/a.png" onerror="alert(1)">'
    );

    expect(html).not.toContain("onerror");
    expect(html).not.toContain("alert");
    expect(html).toContain('src="https://example.com/a.png"');
  });

  it("removes javascript: URLs", async () => {
    const html = await processMarkdown(
      '<a href="javascript:alert(1)">click</a>'
    );

    expect(html).not.toContain("javascript:");
    expect(html).toContain("click");
  });

  it("keeps details and summary elements", async () => {
    const html = await processMarkdown(
      "<details><summary>More</summary>Hidden text.</details>"
    );

    expect(html).toContain("<details>");
    expect(html).toContain("<summary>More</summary>");
    expect(html).toContain("Hidden text.");
  });

  it("drops class attributes that are not in the allowlist", async () => {
    const html = await processMarkdown('<span class="key">Ctrl</span>');

    expect(html).not.toContain('class="key"');
    expect(html).toContain("Ctrl");
  });

  it("prefixes ids to avoid DOM clobbering", async () => {
    const html = await processMarkdown('<div id="foo">bar</div>');

    expect(html).toContain('id="user-content-foo"');
  });

  it("does not render HTML inside fenced code blocks", async () => {
    const html = await processMarkdown(
      "```html\n<script>alert('xss')</script>\n```"
    );

    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&#x3C;");
    expect(html).toContain("script");
  });
});

describe("processMarkdown – markdown features", { timeout: 30000 }, () => {
  it("renders headings, lists and GFM tables", async () => {
    const html = await processMarkdown(
      "# Title\n\n- one\n- two\n\n| A | B |\n| - | - |\n| 1 | 2 |"
    );

    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<li>one</li>");
    expect(html).toContain("<table>");
    expect(html).toContain("<td>1</td>");
  });

  it("highlights fenced code blocks with Shiki", async () => {
    const html = await processMarkdown("```js\nconst x = 1;\n```");

    expect(html).toContain("<pre");
    expect(html).toContain("shiki");
    expect(html).toContain("const");
  });

  it("renders markdown links and images", async () => {
    const html = await processMarkdown(
      "[link](https://example.com) ![alt](https://example.com/a.png)"
    );

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('src="https://example.com/a.png"');
  });
});

describe("processMarkdown – language loading", { timeout: 30000 }, () => {
  it("does not run Shiki for content without code fences", async () => {
    const html = await processMarkdown("# Tanpa kode\n\nHanya teks biasa.");

    expect(html).toContain("<h1>Tanpa kode</h1>");
    expect(html).not.toContain("shiki");
  });

  it("highlights a preloaded language", async () => {
    const html = await processMarkdown("```python\nprint('hi')\n```");

    expect(html).toContain("shiki");
    expect(html).toContain("print");
  });

  it("highlights a language that is loaded lazily", async () => {
    const html = await processMarkdown("```rust\nfn main() {}\n```");

    expect(html).toContain("shiki");
    expect(html).toContain("fn");
  });

  it("falls back gracefully for an unknown language", async () => {
    const html = await processMarkdown("```foobar\nhello world\n```");

    expect(html).toContain("<pre");
    expect(html).toContain("hello world");
  });

  it("highlights fenced code inside a blockquote", async () => {
    const html = await processMarkdown("> ```js\n> const x = 1;\n> ```");

    expect(html).toContain("shiki");
    expect(html).toContain("const");
  });
});

