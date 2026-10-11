import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { AuditResult, BatchItem } from '../types';

interface BatchInspectorProps {
  onSelectAudit: (audit: AuditResult) => void;
}

const SAMPLE_BATCH_URLS = [
  'https://en.wikipedia.org/wiki/Search_engine_optimization',
  'https://react.dev/learn',
  'https://github.com/trending',
  'https://developers.google.com/search/docs/crawling-indexing/overview',
  'https://news.ycombinator.com',
];

export const BatchInspector: React.FC<BatchInspectorProps> = ({ onSelectAudit }) => {
  const [inputUrls, setInputUrls] = useState('');
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState<'all' | 'indexed' | 'not_indexed' | 'issues'>('all');

  const handleLoadSample = () => {
    setInputUrls(SAMPLE_BATCH_URLS.join('\n'));
  };

  const handleStartBatch = async () => {
    const rawList = inputUrls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);

    if (rawList.length === 0) return;

    // Limit to 10 for responsive execution
    const limited = rawList.slice(0, 10);
    const initialItems: BatchItem[] = limited.map((url) => ({
      url,
      status: 'pending',
    }));

    setItems(initialItems);
    setIsProcessing(true);
    setCurrentIndex(0);

    // Process sequentially to give real-time updates and avoid rate limits
    for (let i = 0; i < limited.length; i++) {
      setCurrentIndex(i + 1);
      setItems((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: 'checking' } : item))
      );

      try {
        const res = await fetch('/api/check-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: limited[i] }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }

        const data: AuditResult = await res.json();
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'completed', data } : item
          )
        );
      } catch (err: any) {
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'failed', error: err.message } : item
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const handleExportCsv = () => {
    if (items.length === 0) return;

    const headers = [
      'URL',
      'Index Status',
      'Is Indexed',
      'HTTP Status',
      'Health Score',
      'Robots Allowed',
      'NoIndex Tag',
      'Canonical Status',
      'SERP Title',
    ];

    const rows = items.map((item) => {
      const d = item.data;
      if (!d) return [item.url, item.status, '', '', '', '', '', '', ''];
      return [
        `"${d.url}"`,
        `"${d.indexStatus}"`,
        d.isIndexed ? 'YES' : 'NO',
        d.technical.statusCode,
        d.healthScore,
        d.technical.isRobotsDisallowed ? 'NO' : 'YES',
        d.technical.hasNoIndex ? 'YES' : 'NO',
        d.technical.isCanonicalMatch ? 'MATCH' : 'MISMATCH',
        `"${(d.serpSnippet.title || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `google-index-batch-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats
  const completedItems = items.filter((i) => i.status === 'completed' && i.data);
  const totalCompleted = completedItems.length;
  const indexedCount = completedItems.filter((i) => i.data?.isIndexed).length;
  const notIndexedCount = completedItems.filter((i) => !i.data?.isIndexed).length;
  const issuesCount = completedItems.filter(
    (i) => i.data?.technical.hasNoIndex || i.data?.technical.statusCode !== 200
  ).length;

  const indexedPercent = totalCompleted > 0 ? Math.round((indexedCount / totalCompleted) * 100) : 0;

  // Filtered list
  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'indexed') return item.data?.isIndexed;
    if (filter === 'not_indexed') return item.data && !item.data.isIndexed;
    if (filter === 'issues')
      return (
        item.status === 'failed' ||
        item.data?.technical.hasNoIndex ||
        (item.data && item.data.technical.statusCode !== 200)
      );
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Batch Google Index Checker
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste up to 10 URLs to verify indexation and crawl directives in bulk
            </p>
          </div>

          <button
            onClick={handleLoadSample}
            disabled={isProcessing}
            className="text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto cursor-pointer"
          >
            Load Sample URLs
          </button>
        </div>

        <div className="mt-4">
          <textarea
            value={inputUrls}
            onChange={(e) => setInputUrls(e.target.value)}
            disabled={isProcessing}
            placeholder={`https://example.com/page-1\nhttps://example.com/page-2\nhttps://example.com/blog/article`}
            rows={5}
            className="w-full p-3 text-xs sm:text-sm font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
          />

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-slate-500">
              {inputUrls.split('\n').filter((u) => u.trim()).length} URLs queued (max 10 per run)
            </span>

            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  onClick={() => setItems([])}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}

              <button
                onClick={handleStartBatch}
                disabled={isProcessing || !inputUrls.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs sm:text-sm font-medium rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Checking {currentIndex}/{items.length}...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Run Batch Check</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {isProcessing && (
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
              <span>Checking URL {currentIndex} of {items.length}</span>
              <span className="font-mono">{Math.round((currentIndex / items.length) * 100)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                style={{ width: `${(currentIndex / items.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {items.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-6 border-b border-slate-100">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-xs text-slate-500 font-medium">Total Audited</div>
              <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                {totalCompleted} <span className="text-xs font-normal text-slate-400">/ {items.length}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-100">
              <div className="text-xs text-emerald-700 font-medium">Indexed Rate</div>
              <div className="text-xl font-bold text-emerald-800 mt-1 font-mono">
                {indexedPercent}% <span className="text-xs font-normal text-emerald-600">({indexedCount})</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
              <div className="text-xs text-slate-500 font-medium">Not Indexed</div>
              <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                {notIndexedCount}
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-100">
              <div className="text-xs text-amber-700 font-medium">Blocked / Issues</div>
              <div className="text-xl font-bold text-amber-800 mt-1 font-mono">
                {issuesCount}
              </div>
            </div>
          </div>

          {/* Table Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 pb-4">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs self-start">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  filter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({items.length})
              </button>
              <button
                onClick={() => setFilter('indexed')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  filter === 'indexed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Indexed ({indexedCount})
              </button>
              <button
                onClick={() => setFilter('not_indexed')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  filter === 'not_indexed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Not Indexed ({notIndexedCount})
              </button>
              <button
                onClick={() => setFilter('issues')}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  filter === 'issues' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Issues ({issuesCount})
              </button>
            </div>

            <button
              onClick={handleExportCsv}
              disabled={totalCompleted === 0}
              className="flex items-center gap-1.5 text-xs text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto border border-slate-200/80 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Target URL</th>
                  <th className="py-2.5 px-3">HTTP</th>
                  <th className="py-2.5 px-3">Robots</th>
                  <th className="py-2.5 px-3">Canonical</th>
                  <th className="py-2.5 px-3">SERP Title</th>
                  <th className="py-2.5 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item, idx) => {
                  const d = item.data;
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => d && onSelectAudit(d)}
                    >
                      <td className="py-3 px-3 whitespace-nowrap">
                        {item.status === 'checking' && (
                          <div className="flex items-center gap-1.5 text-blue-600">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Checking...</span>
                          </div>
                        )}
                        {item.status === 'pending' && (
                          <span className="text-slate-400">Queued</span>
                        )}
                        {item.status === 'failed' && (
                          <div className="flex items-center gap-1.5 text-rose-600">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Error</span>
                          </div>
                        )}
                        {item.status === 'completed' && d && (
                          <div className="flex items-center gap-1.5">
                            {d.isIndexed ? (
                              <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Indexed</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-slate-500 font-semibold">
                                <XCircle className="w-3.5 h-3.5 text-slate-400" />
                                <span>Not Indexed</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] max-w-xs truncate text-slate-700">
                        {item.url}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap font-mono text-[11px]">
                        {d ? (
                          <span
                            className={
                              d.technical.statusCode === 200
                                ? 'text-emerald-700'
                                : 'text-rose-700 font-semibold'
                            }
                          >
                            {d.technical.statusCode}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-[11px]">
                        {d ? (
                          d.technical.hasNoIndex ? (
                            <span className="text-rose-700 font-semibold">noindex</span>
                          ) : (
                            <span className="text-slate-600">index</span>
                          )
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap text-[11px]">
                        {d ? (
                          d.technical.isCanonicalMatch ? (
                            <span className="text-emerald-700">Self</span>
                          ) : (
                            <span className="text-amber-700">Mismatch</span>
                          )
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3 px-3 max-w-sm truncate text-slate-800">
                        {d?.serpSnippet.title || d?.technical.metaTitle || item.error || '—'}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {d && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAudit(d);
                            }}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                          >
                            <span>View</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
