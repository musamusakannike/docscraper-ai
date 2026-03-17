'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Download, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Copy, 
  Cpu, 
  Layers, 
  Zap,
  Github
} from 'lucide-react';

export default function DocScraper() {
  const [url, setUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsScraping(true);
    setError(null);
    setResult(null);
    setPageCount(0);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scrape documentation');
      }

      setResult(data.markdown);
      setPageCount(data.pageCount);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsScraping(false);
    }
  };

  const downloadMarkdown = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'documentation.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <header className="w-full max-w-4xl py-12 md:py-20 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 blur-[100px] pointer-events-none rounded-full" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-8"
        >
          <Cpu size={14} className="animate-pulse" />
          Powered by Gemini AI
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6"
        >
          Doc<span className="text-emerald-500 relative">
            Scraper
            <div className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/50 to-transparent rounded-full" />
          </span> AI
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed"
        >
          Build high-fidelity context for your coding agents by transforming documentation sites into perfectly structured Markdown.
        </motion.p>
      </header>

      <main className="w-full max-w-4xl space-y-12">
        <section className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
          <div className="relative bg-[#0a0f1e]/80 backdrop-blur-xl rounded-[2rem] border border-white/5 p-6 md:p-10 shadow-2xl">
            <form onSubmit={handleScrape} className="space-y-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-emerald-500/50">
                  <Search size={22} />
                </div>
                <input
                  type="url"
                  placeholder="https://docs.example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-14 pr-4 py-5 bg-white/5 border border-white/10 rounded-2xl focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all text-lg md:text-xl outline-none text-zinc-100 placeholder:text-zinc-600 font-light"
                  required
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isScraping}
                className="w-full py-5 bg-white text-zinc-950 rounded-2xl font-bold text-lg hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 relative overflow-hidden group/btn"
              >
                <div className="absolute inset-0 bg-emerald-500/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                <span className="relative flex items-center gap-3">
                  {isScraping ? (
                    <>
                      <Loader2 className="animate-spin text-emerald-600" />
                      Processing Site...
                    </>
                  ) : (
                    <>
                      <Zap size={20} className="text-emerald-600" />
                      Optimize Context
                    </>
                  )}
                </span>
              </motion.button>
            </form>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-start gap-3"
                >
                  <AlertCircle className="shrink-0 mt-0.5" size={18} />
                  <p className="text-sm font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        <AnimatePresence>
          {result && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-zinc-900/50 border border-white/5 rounded-3xl backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-500/20 text-emerald-400 p-3 rounded-2xl border border-emerald-500/20">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Knowledge Extracted</h3>
                    <p className="text-zinc-400 text-sm">Successfully compiled {pageCount} pages</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={copyToClipboard}
                    className="flex-1 md:flex-none px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-zinc-300 font-semibold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                  >
                    {copied ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={downloadMarkdown}
                    className="flex-1 md:flex-none px-6 py-3 bg-emerald-500 text-zinc-950 rounded-xl font-bold text-sm hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={16} />
                    Export .MD
                  </button>
                </div>
              </div>

              <div className="relative group/preview overflow-hidden rounded-[2rem] border border-white/5 shadow-2xl">
                <div className="absolute inset-0 bg-emerald-500/5 blur-3xl -z-10" />
                <div className="bg-[#0a0f1e]/90 flex flex-col h-[600px]">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                       <FileText size={16} className="text-emerald-400" />
                       <span className="text-xs font-mono text-zinc-300 uppercase tracking-widest">context_data.md</span>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                    </div>
                  </div>
                  <div 
                    ref={resultRef}
                    className="p-8 overflow-y-auto font-mono text-sm text-zinc-400 leading-relaxed selection:bg-emerald-500/30 auto-scrollbar"
                  >
                    {result}
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {isScraping && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 space-y-6"
          >
            <div className="relative">
              <div className="w-24 h-24 border-2 border-emerald-500/10 rounded-full" />
              <div className="w-24 h-24 border-t-2 border-emerald-500 rounded-full animate-spin absolute top-0 left-0 shadow-[0_0_20px_rgba(16,185,129,0.2)]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Layers className="text-emerald-500 animate-pulse" size={24} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-xl mb-2">Analyzing Structure...</p>
              <p className="text-zinc-500 max-w-xs mx-auto">Gemini is crawling documentation pages and converting them to structured context.</p>
            </div>
          </motion.div>
        )}

        {!result && !isScraping && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            {[
              { icon: Zap, title: "Lightning Fast", desc: "Compile thousands of lines of documentation in seconds." },
              { icon: Layers, title: "Perfect Context", desc: "Optimized for LLMs like GPT-4o, Claude 3.5, and Gemini Pro." },
              { icon: CheckCircle2, title: "Cleaner Data", desc: "Removes headers, footers, and nav artifacts automatically." }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="p-6 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/[0.07] transition-colors"
              >
                <feature.icon className="text-emerald-500 mb-4" size={24} />
                <h4 className="text-white font-bold mb-2">{feature.title}</h4>
                <p className="text-zinc-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-20 w-full max-w-4xl py-12 border-t border-white/5 text-zinc-500 text-sm flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <p>© 2026 DocScraper AI</p>
          <span className="w-4 h-[1px] bg-zinc-800" />
          <p className="text-emerald-500/60 font-medium">Enterprise Grade Scraping</p>
        </div>
        <div className="flex items-center gap-8">
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
          <a href="https://github.com" className="hover:text-white transition-colors flex items-center gap-2">
            <Github size={16} /> GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
