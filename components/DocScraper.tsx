'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
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
  ChevronUp,
  Code2,
  AlignLeft,
  Braces,
  History,
  Trash2,
  RotateCcw,
  Clock,
  Sparkles,
  MessageSquare,
  BookOpen,
  Eye,
  EyeOff,
  Send,
  StopCircle,
  ChevronRight,
  Code,
} from 'lucide-react';

interface ProgressEntry {
  url: string;
  title?: string;
  status: 'scraping' | 'done' | 'failed';
}

interface PageResult {
  title: string;
  content: string;
  url: string;
}

interface HistoryEntry {
  id: string;
  url: string;
  hostname: string;
  pageCount: number;
  scrapedAt: string;
  markdown: string;
  results: PageResult[];
}

const HISTORY_KEY = 'docscraper_history';
const MAX_HISTORY = 20;
const API_KEY_STORAGE = 'docscraper_or_key';

type AiMode = 'summarize' | 'qa';

const OPENROUTER_MODELS = [
  { id: 'google/gemini-2.0-flash-001',       label: 'Gemini 2.0 Flash' },
  { id: 'google/gemini-2.5-pro-preview-03-25', label: 'Gemini 2.5 Pro' },
  { id: 'anthropic/claude-3.5-sonnet',        label: 'Claude 3.5 Sonnet' },
  { id: 'openai/gpt-4o',                      label: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini',                 label: 'GPT-4o Mini' },
] as const;

type ExportFormat = 'md' | 'txt' | 'json' | 'html';

const EXPORT_FORMATS: { id: ExportFormat; label: string; ext: string; mime: string; icon: React.ElementType }[] = [
  { id: 'md',   label: 'Markdown', ext: 'md',   mime: 'text/markdown',   icon: FileText },
  { id: 'txt',  label: 'Plain Text', ext: 'txt', mime: 'text/plain',     icon: AlignLeft },
  { id: 'json', label: 'JSON',     ext: 'json', mime: 'application/json', icon: Braces },
  { id: 'html', label: 'HTML',     ext: 'html', mime: 'text/html',       icon: Code2 },
];

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
  const [rawResults, setRawResults] = useState<PageResult[]>([]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('md');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [aiApiKey, setAiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiModel, setAiModel] = useState<string>(OPENROUTER_MODELS[0].id);
  const [aiMode, setAiMode] = useState<AiMode>('summarize');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [previewMode, setPreviewMode] = useState<'raw' | 'rendered'>('raw');
  const aiAbortRef = useRef<AbortController | null>(null);
  const aiResponseRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
    try {
      const key = localStorage.getItem(API_KEY_STORAGE);
      if (key) setAiApiKey(key);
    } catch {}
  }, []);

  useEffect(() => {
    if (aiResponseRef.current) {
      aiResponseRef.current.scrollTop = aiResponseRef.current.scrollHeight;
    }
  }, [aiResponse]);

  const persistHistory = (entries: HistoryEntry[]) => {
    setHistory(entries);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries)); } catch {}
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
              setRawResults(event.results ?? []);
              const hostname = (() => { try { return new URL(url).hostname; } catch { return url; } })();
              const entry: HistoryEntry = {
                id: Date.now().toString(),
                url,
                hostname,
                pageCount: event.pageCount,
                scrapedAt: new Date().toISOString(),
                markdown: event.markdown,
                results: event.results ?? [],
              };
              setHistory((prev: HistoryEntry[]) => {
                const next = [entry, ...prev.filter((h: HistoryEntry) => h.url !== url)].slice(0, MAX_HISTORY);
                try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
                return next;
              });
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

  const restoreFromHistory = (entry: HistoryEntry) => {
    setUrl(entry.url);
    setResult(entry.markdown);
    setRawResults(entry.results);
    setPageCount(entry.pageCount);
    setFailedCount(0);
    setProgressLog([]);
    setShowHistory(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteHistoryEntry = (id: string) => {
    persistHistory(history.filter((h) => h.id !== id));
  };

  const clearHistory = () => {
    persistHistory([]);
    setClearConfirm(false);
    setShowHistory(false);
  };

  const saveApiKey = (key: string) => {
    setAiApiKey(key);
    try { localStorage.setItem(API_KEY_STORAGE, key); } catch {}
  };

  const handleAiSubmit = async () => {
    if (!aiApiKey.trim()) { setAiError('Please enter your OpenRouter API key.'); return; }
    if (aiMode === 'qa' && !aiQuestion.trim()) { setAiError('Please enter a question.'); return; }
    if (!result) { setAiError('No documentation loaded yet.'); return; }

    setAiLoading(true);
    setAiError(null);
    setAiResponse('');

    const controller = new AbortController();
    aiAbortRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: aiApiKey.trim(),
          model: aiModel,
          mode: aiMode,
          question: aiQuestion,
          markdown: result,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json();
        throw new Error(data.error || 'AI request failed');
      }

      const reader = res.body.getReader();
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
          const data = line.slice(5).trim();
          if (data === '[DONE]') break;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) setAiResponse((prev) => prev + delta);
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') setAiError(err.message);
    } finally {
      setAiLoading(false);
      aiAbortRef.current = null;
    }
  };

  const stopAi = () => {
    aiAbortRef.current?.abort();
    setAiLoading(false);
  };

  const buildExportContent = (format: ExportFormat): { content: string; mime: string; ext: string } => {
    const fmt = EXPORT_FORMATS.find((f) => f.id === format)!;
    if (format === 'md') {
      return { content: result ?? '', mime: fmt.mime, ext: fmt.ext };
    }
    if (format === 'txt') {
      const text = rawResults
        .map((r) => `=== ${r.title} ===\nSource: ${r.url}\n\n${r.content.replace(/[#*`_~>\[\]]/g, '')}\n\n`)
        .join('---\n\n');
      return { content: text, mime: fmt.mime, ext: fmt.ext };
    }
    if (format === 'json') {
      const json = JSON.stringify(
        { generated: new Date().toISOString(), pageCount: rawResults.length, pages: rawResults },
        null,
        2
      );
      return { content: json, mime: fmt.mime, ext: fmt.ext };
    }
    // html
    const hostname = (() => { try { return new URL(url).hostname; } catch { return 'docs'; } })();
    const htmlPages = rawResults
      .map(
        (r) =>
          `<section>\n  <h2><a href="${r.url}">${r.title}</a></h2>\n  <pre>${r.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>\n</section>`
      )
      .join('\n\n');
    const html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<title>${hostname} Documentation</title>\n</head>\n<body>\n<h1>${hostname} Documentation</h1>\n${htmlPages}\n</body>\n</html>`;
    return { content: html, mime: fmt.mime, ext: fmt.ext };
  };

  const handleExport = (format: ExportFormat) => {
    const { content, mime, ext } = buildExportContent(format);
    const hostname = (() => { try { return new URL(url).hostname; } catch { return 'documentation'; } })();
    const blob = new Blob([content], { type: mime });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `${hostname}-docs.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(href);
    setShowExportMenu(false);
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

                  {/* Export dropdown */}
                  <div className="relative" ref={exportMenuRef}>
                    <div className="flex rounded-xl overflow-hidden border border-emerald-500/60">
                      <button
                        onClick={() => handleExport(exportFormat)}
                        className="px-4 py-3 bg-emerald-500 text-zinc-950 font-bold text-sm hover:bg-emerald-400 transition-all flex items-center gap-2"
                      >
                        <Download size={15} />
                        Export .{exportFormat.toUpperCase()}
                      </button>
                      <button
                        onClick={() => setShowExportMenu((v) => !v)}
                        className="px-2.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 transition-all border-l border-emerald-400/30"
                        aria-label="Choose export format"
                      >
                        {showExportMenu ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>

                    <AnimatePresence>
                      {showExportMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-44 bg-[#0d1526] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
                        >
                          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-4 pt-3 pb-1">Format</p>
                          {EXPORT_FORMATS.map((fmt) => (
                            <button
                              key={fmt.id}
                              onClick={() => { setExportFormat(fmt.id); setShowExportMenu(false); }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                exportFormat === fmt.id
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <fmt.icon size={14} className={exportFormat === fmt.id ? 'text-emerald-400' : 'text-zinc-600'} />
                              {fmt.label}
                              <span className="ml-auto font-mono text-[10px] text-zinc-600">.{fmt.ext}</span>
                            </button>
                          ))}
                          <div className="p-2">
                            <button
                              onClick={() => handleExport(exportFormat)}
                              className="w-full py-2 bg-emerald-500 text-zinc-950 rounded-xl font-bold text-xs hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                            >
                              <Download size={12} />
                              Download .{exportFormat.toUpperCase()}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
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
                    <div className="flex items-center gap-4">
                      {/* Raw / Preview toggle */}
                      <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs font-semibold">
                        <button
                          onClick={() => setPreviewMode('raw')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 transition-all ${
                            previewMode === 'raw'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-white/5 text-zinc-600 hover:text-zinc-300'
                          }`}
                        >
                          <Code size={11} /> Raw
                        </button>
                        <button
                          onClick={() => setPreviewMode('rendered')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 transition-all border-l border-white/10 ${
                            previewMode === 'rendered'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-white/5 text-zinc-600 hover:text-zinc-300'
                          }`}
                        >
                          <Eye size={11} /> Preview
                        </button>
                      </div>
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                      </div>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {previewMode === 'raw' ? (
                      <motion.div
                        key="raw"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        ref={resultRef}
                        className="p-8 overflow-y-auto font-mono text-sm text-zinc-400 leading-relaxed selection:bg-emerald-500/30 auto-scrollbar flex-1"
                      >
                        {result}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="rendered"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="p-8 overflow-y-auto auto-scrollbar flex-1"
                      >
                        <div className="prose prose-invert prose-emerald prose-sm max-w-none prose-headings:text-zinc-100 prose-p:text-zinc-400 prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline prose-code:text-emerald-300 prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-blockquote:border-emerald-500/40 prose-blockquote:text-zinc-500 prose-strong:text-zinc-200 prose-hr:border-white/10">
                          <ReactMarkdown>{result ?? ''}</ReactMarkdown>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* AI Panel */}
              <div className="rounded-[2rem] border border-white/5 bg-[#0a0f1e]/80 backdrop-blur-xl shadow-2xl overflow-hidden">
                {/* Panel header / toggle */}
                <button
                  onClick={() => setShowAiPanel((v) => !v)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors group/ai"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                      <Sparkles size={13} className="text-violet-400" />
                    </div>
                    <span className="text-sm font-semibold text-zinc-300">AI Summarize &amp; Q&amp;A</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-semibold">OpenRouter</span>
                  </div>
                  <ChevronDown
                    size={15}
                    className={`text-zinc-600 transition-transform duration-200 ${showAiPanel ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {showAiPanel && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 space-y-5 border-t border-white/5">

                        {/* API Key */}
                        <div className="space-y-2 pt-5">
                          <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5">
                            OpenRouter API Key
                            <a
                              href="https://openrouter.ai/keys"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-violet-400 hover:text-violet-300 transition-colors inline-flex items-center gap-1"
                            >
                              Get key <ExternalLink size={10} />
                            </a>
                          </label>
                          <div className="relative">
                            <input
                              type={showApiKey ? 'text' : 'password'}
                              placeholder="sk-or-..."
                              value={aiApiKey}
                              onChange={(e) => saveApiKey(e.target.value)}
                              className="w-full pr-10 pl-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 transition-all font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
                            >
                              {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                          <p className="text-[11px] text-zinc-700">Stored locally in your browser. Never sent anywhere except OpenRouter.</p>
                        </div>

                        {/* Model + Mode row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-400">Model</label>
                            <select
                              value={aiModel}
                              onChange={(e) => setAiModel(e.target.value)}
                              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-200 outline-none focus:border-violet-500/50 transition-all appearance-none cursor-pointer"
                            >
                              {OPENROUTER_MODELS.map((m) => (
                                <option key={m.id} value={m.id} className="bg-zinc-900">{m.label}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-400">Mode</label>
                            <div className="flex rounded-xl overflow-hidden border border-white/10">
                              <button
                                onClick={() => setAiMode('summarize')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-all ${
                                  aiMode === 'summarize'
                                    ? 'bg-violet-500/20 text-violet-300 border-r border-violet-500/30'
                                    : 'bg-white/5 text-zinc-500 border-r border-white/10 hover:bg-white/10'
                                }`}
                              >
                                <BookOpen size={12} /> Summarize
                              </button>
                              <button
                                onClick={() => setAiMode('qa')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-all ${
                                  aiMode === 'qa'
                                    ? 'bg-violet-500/20 text-violet-300'
                                    : 'bg-white/5 text-zinc-500 hover:bg-white/10'
                                }`}
                              >
                                <MessageSquare size={12} /> Q&amp;A
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Question input (Q&A mode) */}
                        <AnimatePresence>
                          {aiMode === 'qa' && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden"
                            >
                              <div className="relative pt-1">
                                <input
                                  type="text"
                                  placeholder="e.g. How do I authenticate with this API?"
                                  value={aiQuestion}
                                  onChange={(e) => setAiQuestion(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter' && !aiLoading) handleAiSubmit(); }}
                                  className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 transition-all"
                                />
                                <button
                                  onClick={handleAiSubmit}
                                  disabled={aiLoading}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 mt-0.5 p-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/40 text-violet-400 disabled:opacity-40 transition-all"
                                >
                                  <ChevronRight size={14} />
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Action button */}
                        {aiMode === 'summarize' && (
                          <div className="flex gap-3">
                            <button
                              onClick={handleAiSubmit}
                              disabled={aiLoading}
                              className="flex-1 py-3 bg-violet-500/20 border border-violet-500/30 hover:bg-violet-500/30 text-violet-300 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {aiLoading ? (
                                <><Loader2 size={15} className="animate-spin" /> Generating...</>
                              ) : (
                                <><Sparkles size={15} /> Summarize Docs</>
                              )}
                            </button>
                            {aiLoading && (
                              <button
                                onClick={stopAi}
                                className="px-4 py-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                              >
                                <StopCircle size={15} /> Stop
                              </button>
                            )}
                          </div>
                        )}

                        {/* Error */}
                        <AnimatePresence>
                          {aiError && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
                            >
                              <AlertCircle size={15} className="shrink-0 mt-0.5" />
                              {aiError}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Response */}
                        <AnimatePresence>
                          {(aiResponse || aiLoading) && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="rounded-2xl border border-violet-500/10 bg-violet-500/[0.04] overflow-hidden"
                            >
                              <div className="flex items-center gap-2 px-4 py-3 border-b border-violet-500/10">
                                <Sparkles size={12} className="text-violet-400" />
                                <span className="text-[11px] font-semibold text-violet-400 uppercase tracking-widest">AI Response</span>
                                {aiLoading && (
                                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-zinc-600">
                                    <span className="inline-block w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="inline-block w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="inline-block w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                  </span>
                                )}
                                {!aiLoading && aiResponse && (
                                  <button
                                    onClick={() => { navigator.clipboard.writeText(aiResponse); }}
                                    className="ml-auto flex items-center gap-1.5 text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
                                  >
                                    <Copy size={11} /> Copy
                                  </button>
                                )}
                              </div>
                              <div
                                ref={aiResponseRef}
                                className="p-5 max-h-96 overflow-y-auto font-mono text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap selection:bg-violet-500/30"
                              >
                                {aiResponse}
                                {aiLoading && <span className="inline-block w-2 h-4 bg-violet-400/70 animate-pulse ml-0.5" />}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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

        {/* History Panel */}
        {history.length > 0 && !isScraping && (
          <div className="space-y-3">
            <button
              onClick={() => { setShowHistory((v) => !v); setClearConfirm(false); }}
              className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <History size={15} className="text-emerald-500/70" />
              Recent Scrapes
              <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/5 text-zinc-500 text-[10px] font-mono">{history.length}</span>
              <ChevronDown
                size={13}
                className={`ml-auto transition-transform duration-200 ${showHistory ? 'rotate-180' : ''}`}
              />
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-[1.5rem] border border-white/5 bg-[#0a0f1e]/60 backdrop-blur-xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-white/[0.02]">
                      <span className="text-xs text-zinc-500 font-medium">Click any entry to restore it</span>
                      {!clearConfirm ? (
                        <button
                          onClick={() => setClearConfirm(true)}
                          className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={12} />
                          Clear all
                        </button>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-500">Sure?</span>
                          <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors">Yes, clear</button>
                          <button onClick={() => setClearConfirm(false)} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Cancel</button>
                        </div>
                      )}
                    </div>

                    {/* Entries */}
                    <div className="divide-y divide-white/[0.04]">
                      {history.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group/entry"
                        >
                          <button
                            onClick={() => restoreFromHistory(entry)}
                            className="flex-1 flex items-center gap-4 min-w-0 text-left"
                          >
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                              <RotateCcw size={13} className="text-emerald-400 opacity-0 group-hover/entry:opacity-100 transition-opacity" />
                              <FileText size={13} className="text-emerald-400 opacity-100 group-hover/entry:opacity-0 transition-opacity absolute" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-zinc-200 truncate group-hover/entry:text-emerald-400 transition-colors">
                                {entry.hostname}
                              </p>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[11px] text-zinc-600 flex items-center gap-1">
                                  <Clock size={10} />
                                  {new Date(entry.scrapedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="text-[11px] text-zinc-700">·</span>
                                <span className="text-[11px] text-zinc-600">{entry.pageCount} pages</span>
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteHistoryEntry(entry.id); }}
                            className="p-1.5 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover/entry:opacity-100"
                            aria-label="Delete entry"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
          {/* <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a> */}
          <a href="https://github.com/musamusakannike/docscraper-ai" className="hover:text-white transition-colors flex items-center gap-2">
            <Github size={16} /> GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
