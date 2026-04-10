'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Github,
  XCircle,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';

interface ProgressEntry {
  url: string;
  title?: string;
  status: 'scraping' | 'done' | 'failed';
}

const PAGE_LIMIT_OPTIONS = [10, 25, 50, 100] as const;
const DEPTH_OPTIONS = [1, 2, 3, 4, 5] as const;

export default function DocScraper() {
  const [url, setUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [progressLog, setProgressLog] = useState<ProgressEntry[]>([]);
  const [scrapedCount, setScrapedCount] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);
  const [maxPages, setMaxPages] = useState<number>(50);
  const [crawlDepth, setCrawlDepth] = useState<number>(3);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [progressLog]);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsScraping(true);
    setError(null);
    setResult(null);
    setPageCount(0);
    setFailedCount(0);
    setProgressLog([]);
    setScrapedCount(0);
    setQueuedCount(0);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, maxPages, crawlDepth }),
      });

      if (!response.ok || !response.body) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to scrape documentation');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;

          try {
            const event = JSON.parse(line.slice(5).trim());

            if (event.type === 'progress') {
              setScrapedCount(event.scraped);
              setQueuedCount(event.queued);
              setProgressLog((prev: ProgressEntry[]) => {
                if (prev.some((p: ProgressEntry) => p.url === event.currentUrl)) return prev;
                return [...prev, { url: event.currentUrl, status: 'scraping' }];
              });
            } else if (event.type === 'page_done') {
              setProgressLog((prev: ProgressEntry[]) =>
                prev.map((p: ProgressEntry) =>
                  p.url === event.currentUrl
                    ? { ...p, title: event.title, status: 'done' }
                    : p
                )
              );
            } else if (event.type === 'page_failed') {
              setFailedCount((n: number) => n + 1);
              setProgressLog((prev: ProgressEntry[]) =>
                prev.map((p: ProgressEntry) =>
                  p.url === event.currentUrl ? { ...p, status: 'failed' } : p
                )
              );
            } else if (event.type === 'complete') {
              setResult(event.markdown);
              setPageCount(event.pageCount);
            } else if (event.type === 'error') {
              throw new Error(event.message);
            }
          } catch (parseErr: any) {
            if (parseErr.message && !parseErr.message.includes('JSON')) {
              throw parseErr;
            }
          }
        }
      }
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

              {/* Advanced Settings Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors group/adv"
                >
                  <SlidersHorizontal size={13} className="text-emerald-500/70" />
                  Advanced Settings
                  <ChevronDown
                    size={13}
                    className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-5 bg-white/[0.03] border border-white/5 rounded-2xl">

                        {/* Page Limit */}
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-zinc-300">Page Limit</p>
                            <p className="text-[11px] text-zinc-600 mt-0.5">Max pages to crawl per run</p>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {PAGE_LIMIT_OPTIONS.map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setMaxPages(n)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                  maxPages === n
                                    ? 'bg-emerald-500 border-emerald-500 text-zinc-950'
                                    : 'bg-white/5 border-white/10 text-zinc-400 hover:border-emerald-500/40 hover:text-zinc-200'
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Crawl Depth */}
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-zinc-300">
                              Crawl Depth
                              <span className="ml-2 text-emerald-400 font-mono">{crawlDepth}</span>
                            </p>
                            <p className="text-[11px] text-zinc-600 mt-0.5">How many link-hops from the start URL</p>
                          </div>
                          <div className="space-y-1.5">
                            <input
                              type="range"
                              min={1}
                              max={5}
                              step={1}
                              value={crawlDepth}
                              onChange={(e) => setCrawlDepth(Number(e.target.value))}
                              className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-emerald-500 cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-zinc-700 font-mono px-0.5">
                              {DEPTH_OPTIONS.map((d) => (
                                <span
                                  key={d}
                                  className={crawlDepth === d ? 'text-emerald-400' : ''}
                                >
                                  {d}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                    <p className="text-zinc-400 text-sm">
                      Successfully compiled {pageCount} pages
                      {failedCount > 0 && (
                        <span className="ml-2 text-amber-400">· {failedCount} failed</span>
                      )}
                    </p>
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2rem] border border-white/5 bg-[#0a0f1e]/80 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-3">
                <Layers className="text-emerald-500 animate-pulse" size={16} />
                <span className="text-sm font-semibold text-zinc-300">Crawling in progress</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-zinc-500 font-mono">
                <span><span className="text-emerald-400 font-bold">{scrapedCount}</span> scraped</span>
                <span><span className="text-zinc-300 font-bold">{queuedCount}</span> queued</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 bg-white/5">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                animate={{ width: scrapedCount === 0 ? '4%' : `${Math.min((scrapedCount / maxPages) * 100, 100)}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            {/* Scrolling log */}
            <div
              ref={logRef}
              className="h-72 overflow-y-auto p-4 space-y-1 font-mono text-xs"
            >
              {progressLog.map((entry, i) => (
                <div key={i} className="flex items-start gap-2.5 py-0.5">
                  {entry.status === 'scraping' && (
                    <Loader2 size={12} className="text-emerald-400 animate-spin mt-0.5 shrink-0" />
                  )}
                  {entry.status === 'done' && (
                    <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                  )}
                  {entry.status === 'failed' && (
                    <XCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    {entry.title && entry.status === 'done' ? (
                      <span className="text-zinc-300">{entry.title}</span>
                    ) : (
                      <span className="text-zinc-500 truncate block">{entry.url}</span>
                    )}
                    {entry.status !== 'scraping' && (
                      <span className="text-zinc-700 text-[10px] truncate block">{entry.url}</span>
                    )}
                  </div>
                </div>
              ))}
              {progressLog.length === 0 && (
                <p className="text-zinc-600 text-center pt-8">Starting crawl...</p>
              )}
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
