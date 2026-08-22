import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "RepoMind",
  description: "Code Intelligence Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark", "font-sans", inter.variable)}>
      <body className={cn("min-h-screen bg-background font-sans antialiased text-foreground flex flex-col", inter.variable, jetbrainsMono.variable)}>
        <nav className="flex items-center justify-between px-6 h-14 border-b border-white/5 bg-[#0c0c0c] shrink-0">
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-2 font-medium tracking-tight hover:text-white transition-colors">
              <div className="w-5 h-5 rounded bg-white text-black flex items-center justify-center font-bold text-xs">R</div>
              <span>RepoMind</span>
            </a>
            <div className="hidden md:flex items-center gap-4 text-sm text-zinc-400">
              <a href="/" className="hover:text-white transition-colors">Dashboard</a>
              <a href="#" className="hover:text-white transition-colors">Settings</a>
              <a href="#" className="hover:text-white transition-colors">Docs</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700"></div>
          </div>
        </nav>
        <main className="flex-1 relative flex flex-col overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
