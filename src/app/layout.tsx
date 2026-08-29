import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Markdown Pastebin",
  description: "Free and anonymous Markdown pastebin.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
      <script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "12cbb4f705b2427ba00503cbf45da482"}'></script>
    </html>
  );
}
