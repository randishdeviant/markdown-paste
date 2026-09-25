import { readFile } from "fs/promises";
import { join } from "path";
import Link from "next/link";
import { processMarkdown } from "@/lib/markdown";
import CodeBlockEnhancer from "@/components/CodeBlockEnhancer";
import ImageZoomEnhancer from "@/components/ImageZoomEnhancer";

const PasteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

export default async function DocsPage() {
  const readmePath = join(process.cwd(), "README.md");
  const raw = await readFile(readmePath, "utf-8");
  const html = await processMarkdown(raw);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-dark-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-dark-text-primary hover:text-teal-400 transition-colors">
            <PasteIcon />
            <span className="font-semibold text-lg tracking-tight">markdownpaste</span>
          </Link>
          <Link
            href="/"
            className="px-3 py-1.5 text-xs font-medium text-dark-bg bg-teal-400 rounded-lg hover:bg-teal-400/90 transition-colors"
          >
            New Paste
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <article className="prose prose-lg lg:prose-xl max-w-none prose-invert" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </main>

      <CodeBlockEnhancer />
      <ImageZoomEnhancer />
    </div>
  );
}
