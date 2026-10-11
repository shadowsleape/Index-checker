import React, { useState, useEffect } from 'react';
import {
  Search,
  Globe,
  Layers,
  FileCode,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Loader2,
  Sparkles,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { AuditResult } from './types';
import { SerpPreview } from './components/SerpPreview';
import { TechnicalChecklist } from './components/TechnicalChecklist';
import { DiagnosisCard } from './components/DiagnosisCard';
import { BatchInspector } from './components/BatchInspector';
import { SitemapTool } from './components/SitemapTool';
import { AuditHistory } from './components/AuditHistory';

const QUICK_DEMO_URLS = [
  {
    name: 'Wikipedia: SEO',
    url: 'https://en.wikipedia.org/wiki/Search_engine_optimization',
    type: 'High Authority Page',
  },
  {
    name: 'Google Search Docs',
    url: 'https://developers.google.com/search/docs/crawling-indexing/overview',
    type: 'Official Documentation',
  },
  {
    name: 'React.dev Learn',
    url: 'https://react.dev/learn',
    type: 'Modern Web SPA',
  },
];

const AUDIT_STEPS = [
  'Connecting to server & measuring TTFB latency...',
  'Inspecting HTTP response headers & X-Robots-Tag...',
  'Parsing HTML tags, <title>, and <meta name="robots">...',
  'Testing robots.txt Disallow directives for Googlebot...',
  'Executing Google Search grounding query (site:url)...',
  'Synthesizing SERP preview & indexation diagnostics...',
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'sitemap' | 'history'>('single');
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentAudit, setCurrentAudit] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AuditResult[]>([]);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('indexpulse_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (audit: AuditResult) => {
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.url !== audit.url);
      const updated = [audit, ...filtered].slice(0, 50);
      try {
        localStorage.setItem('indexpulse_history', JSON.stringify(updated));
      } catch {
        // quota ignore
      }
      return updated;
    });
  };

  const runAudit = async (targetUrl: string) => {
    if (!targetUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    setCurrentStepIndex(0);

    // Step animation interval
    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < AUDIT_STEPS.length - 1 ? prev + 1 : prev));
    }, 700);

    try {
      const response = await fetch('/api/check-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl.trim() }),
      });

      clearInterval(stepInterval);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned error (${response.status})`);
      }

      const result: AuditResult = await response.json();
      setCurrentAudit(result);
      saveToHistory(result);
      setActiveTab('single');
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err.message || 'Failed to inspect URL. Please verify the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runAudit(urlInput);
  };

  const handleQuickDemoClick = (url: string) => {
    setUrlInput(url);
    runAudit(url);
  };

  const handleCopySummary = () => {
    if (!currentAudit) return;
    const summaryText = `Google Indexation Audit for: ${currentAudit.url}\nStatus: ${currentAudit.indexStatus} (Indexed: ${
      currentAudit.isIndexed ? 'Yes' : 'No'
    })\nHealth Score: ${currentAudit.healthScore}/100\nHTTP Status: ${
      currentAudit.technical.statusCode
    }\nRobots: ${currentAudit.technical.isRobotsDisallowed ? 'Disallowed' : 'Allowed'}\nNoIndex: ${
      currentAudit.technical.hasNoIndex ? 'Yes' : 'No'
    }\nSummary: ${currentAudit.diagnosis.summary}`;
    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('indexpulse_history');
    } catch {
      // ignore
    }
  };

  const deleteHistoryItem = (url: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.url !== url);
      try {
        localStorage.setItem('indexpulse_history', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                  IndexPulse
                </span>
                <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-200/60 px-1.5 py-0.2 rounded">
                  Google SERP
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Real-Time Google Index & On-Page Technical Checker
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
            <button
              onClick={() => setActiveTab('single')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === 'single'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Single URL
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === 'batch'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Batch Checker
            </button>
            <button
              onClick={() => setActiveTab('sitemap')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === 'sitemap'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sitemap
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
              {history.length > 0 && (
                <span className="text-[10px] font-mono text-slate-400">({history.length})</span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Body Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Tab 1: Single URL Audit */}
        {activeTab === 'single' && (
          <div className="space-y-6">
            {/* Search Input Box */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
              <div className="max-w-3xl">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Google Page Indexation Checker
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Enter any webpage URL to check if Google has indexed it, view the exact SERP snippet, and diagnose on-page crawl directives.
                </p>
              </div>

              <form onSubmit={handleSearchSubmit} className="mt-5 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com/blog/how-to-optimize-seo"
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/40"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !urlInput.trim()}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs sm:text-sm font-medium rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Auditing...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Check Index Status</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Demos */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1">
                  <span className="font-medium text-slate-700">Quick Test Samples:</span>
                  {QUICK_DEMO_URLS.map((demo, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickDemoClick(demo.url)}
                      disabled={isLoading}
                      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                    >
                      {demo.name}
                    </button>
                  ))}
                </div>
              </form>

              {/* Progressive loading step indicator */}
              {isLoading && (
                <div className="mt-5 p-4 rounded-lg bg-blue-50/60 border border-blue-100 flex items-start gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-blue-900">
                      Inspecting Google Indexation & Technical Factors
                    </div>
                    <div className="text-xs text-blue-700 mt-1 font-mono">
                      {AUDIT_STEPS[currentStepIndex]}
                    </div>
                    <div className="w-full h-1 bg-blue-200 rounded-full mt-2.5 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{
                          width: `${((currentStepIndex + 1) / AUDIT_STEPS.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Error banner */}
              {error && (
                <div className="mt-5 p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-rose-900">Audit Request Failed</div>
                    <div className="mt-0.5">{error}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Audit Results Dashboard */}
            {currentAudit && (
              <div className="space-y-6">
                {/* 1. Header Verdict Banner */}
                <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                    <div className="flex items-start gap-3.5">
                      <div className="mt-1">
                        {currentAudit.isIndexed ? (
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                        ) : currentAudit.indexStatus === 'NOINDEX_BLOCKED' ? (
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                            <AlertTriangle className="w-6 h-6" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
                            <XCircle className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-lg sm:text-xl font-bold tracking-tight ${
                              currentAudit.isIndexed
                                ? 'text-emerald-700'
                                : currentAudit.indexStatus === 'NOINDEX_BLOCKED'
                                ? 'text-amber-700'
                                : 'text-slate-900'
                            }`}
                          >
                            {currentAudit.isIndexed
                              ? 'Indexed in Google Search'
                              : currentAudit.indexStatus === 'NOINDEX_BLOCKED'
                              ? 'Blocked from Indexing (noindex)'
                              : 'Not Indexed in Google'}
                          </span>
                          <span className="text-xs text-slate-500 font-mono">
                            Confidence: {currentAudit.confidence}
                          </span>
                        </div>

                        {/* URL and metadata line */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1 font-mono break-all">
                          <span className="font-semibold text-slate-700">{currentAudit.url}</span>
                          <span aria-hidden="true">·</span>
                          <span>Checked {new Date(currentAudit.checkedAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions and Score */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Health score badge */}
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <div className="text-xs">
                          <span className="text-slate-500 font-medium">Index Health: </span>
                          <span className="font-bold text-slate-900 font-mono">
                            {currentAudit.healthScore}/100
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleCopySummary}
                        className="flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                        title="Copy audit summary to clipboard"
                      >
                        {copiedSummary ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedSummary ? 'Copied' : 'Copy Report'}</span>
                      </button>

                      <button
                        onClick={() => runAudit(currentAudit.url)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Re-Check</span>
                      </button>
                    </div>
                  </div>

                  {/* Clean unboxed metadata strip */}
                  <div className="pt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-500">HTTP Status:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {currentAudit.technical.statusCode}
                      </span>
                    </div>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-500">Latency:</span>
                      <span className="font-mono text-slate-800">
                        {currentAudit.technical.responseTimeMs}ms
                      </span>
                    </div>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-500">Robots.txt:</span>
                      <span
                        className={
                          currentAudit.technical.isRobotsDisallowed
                            ? 'text-rose-600 font-semibold'
                            : 'text-emerald-700'
                        }
                      >
                        {currentAudit.technical.isRobotsDisallowed ? 'Blocked' : 'Allowed'}
                      </span>
                    </div>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-500">Meta Robots:</span>
                      <span
                        className={
                          currentAudit.technical.hasNoIndex
                            ? 'text-rose-600 font-semibold'
                            : 'text-slate-800'
                        }
                      >
                        {currentAudit.technical.metaRobots || 'None (Default index)'}
                      </span>
                    </div>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-500">Canonical:</span>
                      <span
                        className={
                          currentAudit.technical.isCanonicalMatch
                            ? 'text-emerald-700'
                            : 'text-amber-700 font-semibold'
                        }
                      >
                        {currentAudit.technical.isCanonicalMatch ? 'Matching' : 'Canonical Divergence'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Left Column: SERP Preview + Diagnosis */}
                  <div className="space-y-6">
                    <SerpPreview audit={currentAudit} />
                    <DiagnosisCard audit={currentAudit} />
                  </div>

                  {/* Right Column: Technical Crawl Matrix */}
                  <div className="space-y-6">
                    <TechnicalChecklist
                      tech={currentAudit.technical}
                      targetUrl={currentAudit.url}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Empty state when no audit has been run yet */}
            {!currentAudit && !isLoading && (
              <div className="bg-white border border-slate-200/80 rounded-xl p-10 text-center shadow-xs">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  Ready to audit page indexation
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Enter a URL above or choose a sample to inspect Google SERP snippets, robots.txt rules, canonical tags, and real-time grounding status.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Batch Checker */}
        {activeTab === 'batch' && (
          <BatchInspector
            onSelectAudit={(audit) => {
              setCurrentAudit(audit);
              setUrlInput(audit.url);
              setActiveTab('single');
            }}
          />
        )}

        {/* Tab 3: Sitemap Importer */}
        {activeTab === 'sitemap' && (
          <SitemapTool
            onCheckUrl={(url) => {
              setUrlInput(url);
              runAudit(url);
            }}
            onSendToBatch={(urls) => {
              setActiveTab('batch');
            }}
          />
        )}

        {/* Tab 4: Audit History */}
        {activeTab === 'history' && (
          <AuditHistory
            history={history}
            onSelectAudit={(audit) => {
              setCurrentAudit(audit);
              setUrlInput(audit.url);
              setActiveTab('single');
            }}
            onClearHistory={clearHistory}
            onDeleteAudit={deleteHistoryItem}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <span className="font-semibold text-slate-700">IndexPulse</span> · Real-Time Google Search Index & SERP Inspector
          </div>
          <div className="flex items-center gap-4">
            <span>Powered by Google Search Grounding & Technical SEO Diagnostics</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
