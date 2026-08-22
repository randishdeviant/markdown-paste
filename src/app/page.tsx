"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { EXPIRY_OPTIONS, type ExpiryValue } from "@/lib/redis";

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const PasteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

type PasteResult = { url: string; id: string; expires_at: string | null } | null;

export default function HomePage() {
  const [content, setContent] = useState("");
  const [expiresIn, setExpiresIn] = useState<ExpiryValue>(7 * 24 * 60 * 60);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PasteResult>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyButtonText, setCopyButtonText] = useState("Copy");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);
    setCopyButtonText("Copy");

    try {
      const res = await fetch("/api/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          expires_in: expiresIn,
        }),
      });
      if (!res.ok) {
        throw new Error((await res.json()).error || "Failed to create paste.");
      }
      setResult(await res.json());
      setContent("");
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyButtonText("Copied!");
      setTimeout(() => {
        setResult(null);
        setCopyButtonText("Copy");
      }, 3500);
    } catch {
      setCopyButtonText("Failed!");
      setTimeout(() => setCopyButtonText("Copy"), 2000);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 100 * 1024;
    if (file.size > maxSize) {
      setError(`File is too large. Max size is ${maxSize / 1024} KB.`);
      e.target.value = "";
      return;
    }

    const isMarkdown =
      file.type === "text/markdown" ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".markdown");

    if (!isMarkdown) {
      setError("Invalid file type. Please upload a .md or .markdown file.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (readEvent) => {
      setContent(readEvent.target?.result as string);
      setError(null);
    };
    reader.onerror = () => setError("Failed to read the file.");
    reader.readAsText(file);
    e.target.value = "";
  };

  const getExpiryLabel = (value: ExpiryValue) => {
    return EXPIRY_OPTIONS.find((o) => o.value === value)?.label || "7 Days";
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-dark-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-dark-text-primary hover:text-teal-400 transition-colors">
            <PasteIcon />
            <span className="font-semibold text-lg tracking-tight">markdownpaste</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-dark-text-muted font-mono hidden sm:block">v0.1.0</span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-start justify-center px-4 sm:px-6 py-8 sm:py-16">
        <div className="w-full max-w-3xl">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Paste your <span className="text-teal-400">Markdown</span>
            </h1>
            <p className="text-dark-text-secondary text-sm sm:text-base">
              Create and share beautifully rendered Markdown snippets. No account needed.
            </p>
            <p className="text-yellow-400/80 text-xs mt-2">
              ⚠ Wrap code in triple backticks (<code className="text-yellow-400">```</code>) for syntax highlighting.
            </p>
          </div>

          {/* Editor */}
          <form onSubmit={handleSubmit}>
            <div className="relative">
              {/* Editor chrome - top bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-dark-surface border border-dark-border border-b-0 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-dark-border" />
                    <div className="w-2.5 h-2.5 rounded-full bg-dark-border" />
                    <div className="w-2.5 h-2.5 rounded-full bg-dark-border" />
                  </div>
                  <span className="text-[11px] text-dark-text-muted font-mono ml-2">editor.md</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Expiry selector */}
                  <select
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(Number(e.target.value) as ExpiryValue)}
                    disabled={isLoading}
                    className="px-2 py-1 text-[11px] font-mono text-dark-text-secondary bg-dark-bg border border-dark-border rounded-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-500/50 disabled:opacity-50"
                  >
                    {EXPIRY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-dark-text-secondary hover:text-dark-text-primary hover:bg-dark-surface-hover rounded-md transition-colors disabled:opacity-50"
                  >
                    <UploadIcon />
                    <span className="hidden sm:inline">Upload</span>
                  </button>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".md,.markdown,text/markdown"
              />

              {/* Textarea */}
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="# Hello World&#10;&#10;Write your **Markdown** here...&#10;&#10;```javascript&#10;console.log('Hello!');&#10;```"
                className="w-full h-72 sm:h-96 p-4 bg-dark-surface border border-dark-border rounded-b-xl font-mono text-sm text-dark-text-primary placeholder:text-dark-text-muted focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all resize-none"
                required
                disabled={isLoading}
              />
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center justify-between gap-4">
              <span className="text-[11px] text-dark-text-muted font-mono">
                Expires: {getExpiryLabel(expiresIn)}
              </span>
              <button
                type="submit"
                disabled={isLoading || !content.trim()}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-dark-bg bg-teal-400 rounded-lg hover:bg-teal-400/90 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:ring-offset-2 focus:ring-offset-dark-bg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  "Create Paste"
                )}
              </button>
            </div>
          </form>

          {/* Success */}
          {result && (
            <div className="mt-6 p-4 bg-teal-500/10 rounded-xl border border-teal-500/20">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1 bg-teal-500/20 rounded-lg">
                  <CheckIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-teal-400">Paste created</h3>
                  <p className="text-xs text-dark-text-secondary mt-0.5">Share this URL:</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={result.url}
                      className="flex-1 min-w-0 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 font-mono text-xs text-dark-text-primary outline-none"
                    />
                    <button
                      onClick={() => copyToClipboard(result.url)}
                      className="shrink-0 px-4 py-2 text-xs font-medium text-dark-bg bg-teal-400 rounded-lg hover:bg-teal-400/90 transition-colors"
                    >
                      {copyButtonText}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-border py-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <p className="text-xs text-dark-text-muted">
            Max 100 KB per paste
          </p>
          <Link
            href="/p/g-fZb6bp"
            className="text-xs text-dark-text-muted hover:text-teal-400 transition-colors"
          >
            API Docs
          </Link>
        </div>
      </footer>
    </div>
  );
}
