"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importRepo } from "@/lib/api";
import { ArrowRight, Loader2, Code2, Database, GitBranch, GitMerge, Command, Box, Maximize, Check } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");

    try {
      const repo = await importRepo(url);
      router.push(`/dashboard`);
    } catch (err) {
      setError("Import failed. Verify URL access.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-zinc-800 font-sans">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/50 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2 font-medium tracking-tight">
          <Box className="w-5 h-5 text-white" />
          <span>RepoMind</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">Log In</button>
          <button className="text-sm font-medium bg-white text-black px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors">
            Deploy Now
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,120,120,0.1),rgba(0,0,0,0))]" />
        
        <div className="z-10 max-w-4xl space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse" />
            RepoMind v1.0 is now available
          </div>
          
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tighter leading-[1.1]">
            Understand your <br /> codebase instantly.
          </h1>
          
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-light tracking-tight">
            The spatial intelligence platform for modern engineering teams. Stop grepping through legacy code and start seeing it visually.
          </p>

          <div className="pt-8 max-w-lg mx-auto w-full">
            <form onSubmit={handleSubmit} className="relative flex items-center group">
              <div className="absolute left-4 text-zinc-500">
                <GitBranch className="w-5 h-5" />
              </div>
              <Input 
                id="url"
                type="text"
                placeholder="Paste a GitHub repository URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className="w-full bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 rounded-2xl h-14 pl-12 pr-14 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-zinc-600 focus-visible:border-zinc-600 transition-all text-base shadow-2xl"
                autoComplete="off"
                spellCheck="false"
              />
              <button 
                type="submit" 
                disabled={loading || !url.trim()}
                className="absolute right-2 h-10 px-4 flex items-center justify-center bg-white text-black hover:bg-zinc-200 rounded-xl disabled:opacity-50 transition-colors font-medium text-sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
              </button>
            </form>
            <div className="h-6 mt-2 flex items-center justify-center">
              {error && <p className="text-zinc-500 text-xs tracking-tight">{error}</p>}
            </div>
          </div>
        </div>

        {/* Product Preview Window */}
        <div className="mt-20 w-full max-w-5xl rounded-xl border border-zinc-800 bg-black shadow-2xl overflow-hidden relative z-10 ring-1 ring-white/5">
          <div className="h-12 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 justify-between">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-zinc-800" />
              <div className="w-3 h-3 rounded-full bg-zinc-800" />
              <div className="w-3 h-3 rounded-full bg-zinc-800" />
            </div>
            <div className="text-xs text-zinc-500 font-mono flex items-center gap-2">
              <Code2 className="w-4 h-4" /> repomind-workspace
            </div>
            <div className="w-12" /> {/* Spacer */}
          </div>
          <div className="aspect-[16/9] bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] flex items-center justify-center">
            {/* Mock Graph Elements */}
            <div className="relative w-full h-full p-8 flex flex-col justify-center items-center">
               <div className="w-48 p-4 border border-zinc-800 bg-zinc-950 rounded-lg shadow-lg text-xs font-mono text-zinc-300 absolute top-1/4 left-1/4">
                 function parse_ast()
               </div>
               <svg className="absolute inset-0 w-full h-full pointer-events-none">
                 <path d="M 250 200 C 350 200, 450 300, 550 300" fill="none" stroke="#27272a" strokeWidth="2" />
               </svg>
               <div className="w-48 p-4 border border-white/20 bg-black rounded-lg shadow-2xl text-xs font-mono text-white absolute top-1/3 left-1/2 -translate-x-1/2 ring-1 ring-white/10">
                 class ASTParser
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Trusted By */}
      <section className="py-20 border-y border-zinc-900 bg-zinc-950/20">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-sm font-medium text-zinc-500 tracking-widest uppercase mb-8">Trusted by forward-thinking teams</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-40 grayscale">
            {/* Minimalist logos replaced with icons for mockup */}
            <Command className="w-8 h-8 text-white" />
            <Maximize className="w-8 h-8 text-white" />
            <Database className="w-8 h-8 text-white" />
            <GitMerge className="w-8 h-8 text-white" />
            <Box className="w-8 h-8 text-white" />
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section id="features" className="py-32 px-6 max-w-6xl mx-auto space-y-24">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tighter">Everything you need to navigate complexity.</h2>
          <p className="text-zinc-400 text-lg font-light tracking-tight">RepoMind extracts deep semantic understanding from your codebase, enabling workflows that text search simply cannot provide.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="md:col-span-2 p-10 rounded-3xl border border-zinc-800 bg-zinc-950/50 flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 max-w-md">
              <h3 className="text-2xl font-medium tracking-tight mb-2">Spatial Architecture Mapping</h3>
              <p className="text-zinc-400 font-light leading-relaxed">Turn millions of lines of code into an interactive 3D map. Identify bottlenecks and architectural anti-patterns at a glance.</p>
            </div>
            <div className="relative z-10 mt-12 w-full aspect-[2/1] border border-zinc-800 rounded-xl bg-black overflow-hidden flex items-center justify-center p-6">
              <div className="flex gap-4 items-center">
                <div className="w-32 h-16 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-500">Frontend</div>
                <ArrowRight className="w-4 h-4 text-zinc-600" />
                <div className="w-32 h-16 bg-white rounded-lg border border-white flex items-center justify-center text-xs font-mono text-black font-medium">Gateway</div>
                <ArrowRight className="w-4 h-4 text-zinc-600" />
                <div className="w-32 h-16 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-center text-xs font-mono text-zinc-500">Database</div>
              </div>
            </div>
          </div>

          <div className="p-10 rounded-3xl border border-zinc-800 bg-zinc-950/50 flex flex-col justify-between relative group">
            <div className="relative z-10">
              <h3 className="text-2xl font-medium tracking-tight mb-2">Impact Analysis</h3>
              <p className="text-zinc-400 font-light leading-relaxed">Know exactly what breaks before you touch legacy code. AI-driven risk assessment maps blast radius instantly.</p>
            </div>
            <div className="mt-8 space-y-3 relative z-10">
              <div className="p-4 border border-zinc-800 rounded-lg bg-black text-sm flex items-center gap-3">
                <Check className="w-4 h-4 text-white" /> Safe to modify
              </div>
              <div className="p-4 border border-zinc-700 bg-zinc-900 rounded-lg text-sm flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Evaluating impacts...
              </div>
            </div>
          </div>

          <div className="p-10 rounded-3xl border border-zinc-800 bg-zinc-950/50 flex flex-col justify-between relative group">
            <div className="relative z-10">
              <h3 className="text-2xl font-medium tracking-tight mb-2">Deep Temporal Tracing</h3>
              <p className="text-zinc-400 font-light leading-relaxed">Instantly trace any component back to its exact creation point and read the author's original intent.</p>
            </div>
            <div className="mt-8 p-4 border border-zinc-800 bg-black rounded-lg text-xs font-mono text-zinc-400 relative z-10">
              <div className="text-zinc-600 mb-2">commit 8a4b2c1</div>
              <div className="text-white">feat: implement abstract factory</div>
              <div className="mt-2 text-zinc-500">Author: rishabhh0001</div>
            </div>
          </div>

          <div className="md:col-span-2 p-10 rounded-3xl border border-zinc-800 bg-zinc-950/50 flex flex-col md:flex-row gap-8 items-center justify-between relative group">
            <div className="relative z-10 max-w-sm">
              <h3 className="text-2xl font-medium tracking-tight mb-2">Command-Line Speed</h3>
              <p className="text-zinc-400 font-light leading-relaxed">Execute spatial queries instantly using the built-in command palette. Zero learning curve for terminal power users.</p>
            </div>
            <div className="relative z-10 w-full md:w-1/2 p-6 border border-zinc-800 bg-black rounded-xl">
              <div className="flex items-center gap-3 border-b border-zinc-900 pb-4 mb-4 text-zinc-500 font-mono text-sm">
                <span>&gt;</span>
                <span className="text-white">find dependents of AuthService</span>
                <span className="w-2 h-4 bg-white animate-pulse" />
              </div>
              <div className="text-xs font-mono text-zinc-600 space-y-2">
                <div>Found 4 dependent services.</div>
                <div>Mapping visual graph...</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-32 px-6 border-t border-zinc-900 text-center flex flex-col items-center">
        <h2 className="text-4xl md:text-6xl font-semibold tracking-tighter mb-6">Ready to redefine your workflow?</h2>
        <p className="text-zinc-400 text-lg font-light mb-10 max-w-xl mx-auto">Join thousands of engineers who are mapping their codebases and eliminating technical debt faster than ever.</p>
        <button className="h-14 px-8 bg-white text-black hover:bg-zinc-200 rounded-full font-medium transition-colors flex items-center gap-2 text-base">
          Start Mapping For Free <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* Global Footer */}
      <footer className="border-t border-zinc-900 bg-black py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
            <h4 className="font-medium text-white">Product</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-medium text-white">Resources</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-medium text-white">Company</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Partners</a></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-medium text-white">Legal</h4>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between pt-8 border-t border-zinc-900 text-xs text-zinc-600">
          <div>&copy; 2026 RepoMind Inc. All rights reserved.</div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition-colors"><GitBranch className="w-4 h-4" /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
