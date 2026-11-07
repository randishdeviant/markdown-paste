import { describe, it, expect } from "vitest";
import { processMarkdown } from "../markdown";

describe("processMarkdown – Obsidian callouts", { timeout: 30000 }, () => {
  it("renders a basic note callout with default title", async () => {
    const html = await processMarkdown("> [!note]\n> This is a note.");

    expect(html).toContain('class="callout"');
    expect(html).toContain('data-callout="note"');
    expect(html).toContain('data-collapsible="false"');
    expect(html).toContain(">Note</span>");
    expect(html).toContain('class="callout-content"');
    expect(html).toContain("<p>This is a note.</p>");
  });

  it("supports a custom inline title", async () => {
    const html = await processMarkdown("> [!tip] Pro tip\n> Body.");

    expect(html).toContain('data-callout="tip"');
    expect(html).toContain(">Pro tip</span>");
    expect(html).toContain("<p>Body.</p>");
  });

  it("escapes special characters in the title", async () => {
    const html = await processMarkdown("> [!note] A & B\n> Body.");

    expect(html).toContain(">A &#x26; B</span>");
  });

  it("keeps the typed name as the default title for known types and aliases", async () => {
    const types = [
      ["note", "note", "Note"],
      ["abstract", "abstract", "Abstract"],
      ["summary", "abstract", "Summary"],
      ["tldr", "abstract", "Tldr"],
      ["info", "info", "Info"],
      ["todo", "todo", "Todo"],
      ["tip", "tip", "Tip"],
      ["hint", "tip", "Hint"],
      ["important", "tip", "Important"],
      ["success", "success", "Success"],
      ["check", "success", "Check"],
      ["done", "success", "Done"],
      ["question", "question", "Question"],
      ["help", "question", "Help"],
      ["faq", "question", "Faq"],
      ["warning", "warning", "Warning"],
      ["caution", "warning", "Caution"],
      ["attention", "warning", "Attention"],
      ["failure", "failure", "Failure"],
      ["fail", "failure", "Fail"],
      ["missing", "failure", "Missing"],
      ["danger", "danger", "Danger"],
      ["error", "danger", "Error"],
      ["bug", "bug", "Bug"],
      ["example", "example", "Example"],
      ["quote", "quote", "Quote"],
      ["cite", "quote", "Cite"],
    ] as const;

    for (const [raw, canonical, title] of types) {
      const html = await processMarkdown(`> [!${raw}]\n> Body.`);
      expect(html, `type ${raw}`).toContain(`data-callout="${canonical}"`);
      expect(html, `title ${raw}`).toContain(`>${title}</span>`);
    }
  });

  it("renders `-` as a collapsed <details>", async () => {
    const html = await processMarkdown("> [!warning]- Hidden\n> Body.");

    expect(html).toContain("<details");
    expect(html).toContain('<summary class="callout-title">');
    expect(html).toContain('data-collapsible="true"');
    expect(html).not.toMatch(/<details[^>]*\bopen\b/);
    expect(html).toContain("callout-fold-icon");
  });

  it("renders `+` as an open <details>", async () => {
    const html = await processMarkdown("> [!warning]+ Shown\n> Body.");

    expect(html).toMatch(/<details[^>]*\bopen\b/);
    expect(html).toContain('data-collapsible="true"');
  });

  it("preserves block content such as lists and code", async () => {
    const listHtml = await processMarkdown("> [!example]\n> - one\n> - two");
    expect(listHtml).toContain("<ul>");
    expect(listHtml).toContain("<li>one</li>");
    expect(listHtml).toContain("<li>two</li>");

    const codeHtml = await processMarkdown(
      "> [!note]\n> ```js\n> const x = 1;\n> ```"
    );
    expect(codeHtml).toContain('data-callout="note"');
    expect(codeHtml).toContain("<pre");
  });

  it("supports nested callouts", async () => {
    const html = await processMarkdown(
      "> [!note]\n> Outer\n>\n> > [!warning]\n> > Inner"
    );

    expect(html).toContain('data-callout="note"');
    expect(html).toContain('data-callout="warning"');
    expect(html).toContain("Outer");
    expect(html).toContain("Inner");
  });

  it("still applies heading links and superscript inside a callout", async () => {
    const html = await processMarkdown(
      "# Heading\n\n> [!note]\n> See [[#Heading]] and x^2^."
    );

    expect(html).toContain('<a href="#heading">Heading</a>');
    expect(html).toContain("<sup>2</sup>");
  });

  it("leaves ordinary blockquotes untouched", async () => {
    const html = await processMarkdown("> Just a quote.");

    expect(html).toContain("<blockquote>");
    expect(html).not.toContain('class="callout"');
  });

  it("does not trigger when the marker is not at the start", async () => {
    const html = await processMarkdown("> just [!note] here");

    expect(html).not.toContain('class="callout"');
    expect(html).toContain("[!note]");
  });

  it("leaves unknown callout types as a normal blockquote", async () => {
    const html = await processMarkdown("> [!custom]\n> Body.");

    expect(html).toContain("<blockquote>");
    expect(html).not.toContain('class="callout"');
    expect(html).toContain("[!custom]");
  });

  it("does not transform markers inside fenced code blocks", async () => {
    const html = await processMarkdown("```\n> [!note]\n> hi\n```");

    expect(html).not.toContain('class="callout"');
    expect(html).toContain("[!note]");
  });
});
