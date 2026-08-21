"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importRepo } from "@/lib/api";
import { GitBranch, Loader2, Code2, Network, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
      router.push(`/repo/${repo.id}`);
    } catch (err) {
      setError("Failed to import repository. Make sure the URL is accessible.");
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 300, damping: 24 }
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 selection:bg-indigo-500/30">
      
      {/* Premium Background Mesh / Gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-purple-500 to-emerald-500 rounded-full blur-[120px] animate-pulse-slow" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <motion.div 
        className="w-full max-w-3xl px-6 flex flex-col items-center text-center space-y-12 z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-300 mb-4 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            v1.0 is live
          </div>
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.1]">
            Code Intelligence, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">
              Redefined.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-light">
            Instantly map architectures, trace temporal origins, and interact with your entire software system in a spatial workspace.
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="w-full max-w-lg">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
            <form onSubmit={handleSubmit} className="relative bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl flex items-center gap-2">
              <div className="pl-4 text-zinc-500 shrink-0">
                <GitBranch className="h-5 w-5" />
              </div>
              <Input 
                id="url"
                type="text"
                placeholder="https://github.com/your/repo"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-100 placeholder:text-zinc-600 text-base h-12 shadow-none"
              />
              <Button 
                type="submit" 
                disabled={loading || !url.trim()}
                className="h-12 px-8 bg-white text-zinc-950 hover:bg-zinc-200 transition-colors font-medium rounded-xl"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Loader2 className="h-5 w-5" />
                  </motion.div>
                ) : (
                  "Analyze"
                )}
              </Button>
            </form>
          </div>
          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="text-red-400 text-sm mt-4 font-medium"
            >
              {error}
            </motion.p>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-white/5 w-full text-left">
          <div className="space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
              <Network className="h-5 w-5 text-indigo-400" />
            </div>
            <h3 className="font-semibold text-zinc-100">Spatial Architecture</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Navigate code visually. Watch symbols, calls, and dependencies render into an interactive graph.
            </p>
          </div>
          
          <div className="space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
            <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
              <Activity className="h-5 w-5 text-purple-400" />
            </div>
            <h3 className="font-semibold text-zinc-100">Impact Analysis</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Know exactly what breaks before touching legacy code. AI-driven risk assessment.
            </p>
          </div>

          <div className="space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <Code2 className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-zinc-100">Temporal Origin</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Ask "Why does this exist?" and instantly trace back to the commit and author that built it.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
}
