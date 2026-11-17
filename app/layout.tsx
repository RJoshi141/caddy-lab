import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "./session";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Caddy Lab",
  description: "Prototype exploring live call coaching.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <Header />
          <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 py-6">{children}</main>
          <footer className="text-center text-xs text-ink-3 py-6">Prototype exploring live call coaching. Mock data.</footer>
        </SessionProvider>
      </body>
    </html>
  );
}
