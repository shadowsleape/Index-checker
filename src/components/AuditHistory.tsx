import React, { useState } from 'react';
import {
  History,
  Trash2,
  ExternalLink,
  ChevronRight,
  Download,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Search,
} from 'lucide-react';
import { AuditResult } from '../types';

interface AuditHistoryProps {
  history: AuditResult[];
  onSelectAudit: (audit: AuditResult) => void;
  onClearHistory: () => void;
  onDeleteAudit: (url: string) => void;
}

export const AuditHistory: React.FC<AuditHistoryProps> = ({
  history,
  onSelectAudit,
  onClearHistory,
  onDeleteAudit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'indexed' | 'not_indexed'>('all');

  const filtered = history.filter((item) => {
    const matchesSearch =
      item.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.serpSnippet.title || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'indexed') return item.isIndexed;
    if (statusFilter === 'not_indexed') return !item.isIndexed;
    return true;
  });

  const handleExportJson = () => {
    if (history.length === 0) return;
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `indexpulse-audit-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-semibold text-slate-900 tracking-tight">
            Audit History & Tracked URLs
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Past index verification reports stored locally in your browser
          </p>
        </div>

        {history.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          </div>
        )}
      </div>

      {history.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-xs">
          <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-medium text-slate-700">No Audits Performed Yet</p>
          <p className="text-slate-400 mt-1">
            Check any page URL in the Single URL or Batch Checker tab to track results here.
          </p>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by URL or title..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-slate-50/30"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs self-start">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({history.length})
              </button>
              <button
                onClick={() => setStatusFilter('indexed')}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  statusFilter === 'indexed'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Indexed ({history.filter((i) => i.isIndexed).length})
              </button>
              <button
                onClick={() => setStatusFilter('not_indexed')}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  statusFilter === 'not_indexed'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Not Indexed ({history.filter((i) => !i.isIndexed).length})
              </button>
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-lg overflow-hidden">
            {filtered.map((item, idx) => {
              const checkedDate = new Date(item.checkedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={idx}
                  className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer"
                  onClick={() => onSelectAudit(item)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {item.isIndexed ? (
                        <div className="flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Indexed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-500 font-semibold text-[11px]">
                          <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          <span>Not Indexed</span>
                        </div>
                      )}

                      <span className="text-slate-300">·</span>
                      <span className="text-[11px] text-slate-500">{checkedDate}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-[11px] font-mono text-slate-500">
                        Score {item.healthScore}/100
                      </span>
                    </div>

                    <div className="font-semibold text-slate-800 truncate text-xs sm:text-sm">
                      {item.serpSnippet.title || item.technical.metaTitle || item.url}
                    </div>

                    <div className="font-mono text-[11px] text-slate-500 truncate mt-0.5">
                      {item.url}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAudit(item.url);
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                      title="Remove from history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="text-blue-600 flex items-center gap-0.5 font-medium">
                      <span>View</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
