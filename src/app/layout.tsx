import "./globals.css";
import type { Metadata } from "next";
import { Inter, Fira_Code } from "next/font/google";
import Analytics from "@/components/Analytics";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira",
  display: "swap",
});

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
    <html
      lang="en"
      className={`dark ${inter.variable} ${firaCode.variable}`}
      suppressHydrationWarning
    >
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
