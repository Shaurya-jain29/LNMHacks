import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ScrollShell } from "@/components/canvas/scroll-shell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Haoqi Clone",
  description: "Phase 1 - Shared RAF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body className={inter.className}>
        <ScrollShell>
          {children}
        </ScrollShell>
      </body>
    </html>
  );
}
