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
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black selection:bg-zinc-800">
      
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      <motion.div 
        className="w-full max-w-3xl px-6 flex flex-col items-center text-center space-y-12 z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 mb-4 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            v1.0
          </div>
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.1]">
            Code Intelligence, <br />
            <span className="text-zinc-500">
              Redefined.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto font-light">
            Instantly map architectures, trace temporal origins, and interact with your entire software system in a spatial workspace.
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="w-full max-w-lg">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-zinc-800 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
            <form onSubmit={handleSubmit} className="relative bg-zinc-950 backdrop-blur-xl border border-zinc-800 rounded-2xl p-2 shadow-2xl flex items-center gap-2">
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
                className="h-12 px-8 bg-white text-black hover:bg-zinc-200 transition-colors font-medium rounded-xl"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Loader2 className="h-5 w-5 text-black" />
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
              className="text-zinc-400 text-sm mt-4 font-medium"
            >
              {error}
            </motion.p>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-zinc-900 w-full text-left">
          <div className="space-y-3 p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
              <Network className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-zinc-100">Spatial Architecture</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Navigate code visually. Watch symbols, calls, and dependencies render into an interactive graph.
            </p>
          </div>
          
          <div className="space-y-3 p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-zinc-100">Impact Analysis</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Know exactly what breaks before touching legacy code with robust risk assessment.
            </p>
          </div>

          <div className="space-y-3 p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
              <Code2 className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-semibold text-zinc-100">Temporal Origin</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Instantly trace components back to their creation point and author metadata.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
}
