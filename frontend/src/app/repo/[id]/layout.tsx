import { ReactNode } from "react";

export default function RepoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <header className="h-14 border-b border-border flex items-center px-4 shrink-0 bg-card/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <div className="font-bold text-lg bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
            RepoMind
          </div>
        </div>
      </header>
      <main className="flex-1 relative overflow-hidden">
        {children}
      </main>
    </div>
  );
}
