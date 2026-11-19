import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "./session";
import { Header } from "@/components/Header";
import { Splash } from "@/components/Splash";
import { PersistentCall } from "@/components/PersistentCall";
import { Tour } from "@/components/Tour";

export const metadata: Metadata = {
  title: "Caddy Lab",
  description: "Prototype exploring live call coaching.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Loaded at runtime, not build time, so builds never depend on the font CDN. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">
        <Splash />
        <SessionProvider>
          <Header />
          <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 py-6">
            <PersistentCall />
            {children}
          </main>
          <Tour />
          <footer className="text-center text-xs text-ink-3 py-6">Prototype exploring live call coaching. Mock data.</footer>
        </SessionProvider>
      </body>
    </html>
  );
}
