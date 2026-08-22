import { notFound } from "next/navigation";
import { getPaste, getLatestPasteIds } from "@/lib/redis";
import { processMarkdown } from "@/lib/markdown";
import Link from "next/link";
import CodeBlockEnhancer from "@/components/CodeBlockEnhancer";

const PasteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateStaticParams() {
  try {
    const ids = await getLatestPasteIds(10);
    return ids.map((id) => ({ id }));
  } catch {
    return [];
  }
}

export default async function PastePage({ params }: PageProps) {
  const { id } = await params;
  const paste = await getPaste(id);

  if (!paste) {
    notFound();
  }

  const processedHtml = await processMarkdown(paste.content);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const rawApiUrl = `${appUrl}/api/paste/${id}`;

  const createdDate = new Date(paste.created_at);
  const timeAgo = getTimeAgo(createdDate);

  const expiryText = paste.expires_at
    ? getTimeRemaining(new Date(paste.expires_at))
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-dark-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-dark-text-primary hover:text-teal-400 transition-colors">
            <PasteIcon />
            <span className="font-semibold text-lg tracking-tight">markdownpaste</span>
          </Link>
          <div className="flex items-center gap-2">
            <a
              href={rawApiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium text-dark-text-secondary hover:text-dark-text-primary bg-dark-surface border border-dark-border rounded-lg hover:bg-dark-surface-hover transition-all"
            >
              Raw
            </a>
            <Link
              href="/"
              className="px-3 py-1.5 text-xs font-medium text-dark-bg bg-teal-400 rounded-lg hover:bg-teal-400/90 transition-colors"
            >
              New Paste
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-dark-text-muted mb-6 font-mono">
            <span>{id}</span>
            <span className="w-1 h-1 rounded-full bg-dark-border" />
            <span>{timeAgo}</span>
            {expiryText && (
              <>
                <span className="w-1 h-1 rounded-full bg-dark-border" />
                <span className="text-teal-400/70">{expiryText}</span>
              </>
            )}
          </div>

          {/* Article */}
          <article className="prose prose-lg lg:prose-xl max-w-none prose-invert" dangerouslySetInnerHTML={{ __html: processedHtml }} />
        </div>
      </main>

      <CodeBlockEnhancer />
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTimeRemaining(expiresAt: Date): string {
  const now = new Date();
  const seconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);

  if (seconds <= 0) return "expired";
  if (seconds < 60) return "expires in <1m";
  if (seconds < 3600) return `expires in ${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `expires in ${Math.floor(seconds / 3600)}h`;
  return `expires in ${Math.floor(seconds / 86400)}d`;
}
