import React, { useState } from 'react';
import {
  FileCode,
  ArrowRight,
  Loader2,
  Check,
  Search,
  ExternalLink,
  ListFilter,
  CheckSquare,
  Square,
} from 'lucide-react';
import { AuditResult } from '../types';

interface SitemapToolProps {
  onCheckUrl: (url: string) => void;
  onSendToBatch: (urls: string[]) => void;
}

export const SitemapTool: React.FC<SitemapToolProps> = ({ onCheckUrl, onSendToBatch }) => {
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discoveredUrls, setDiscoveredUrls] = useState<string[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  const handleFetchSitemap = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sitemapUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    setDiscoveredUrls([]);
    setSelectedUrls([]);

    try {
      const res = await fetch('/api/fetch-sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sitemapUrl: sitemapUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse sitemap');
      }

      setDiscoveredUrls(data.urls || []);
      // Preselect first 5
      setSelectedUrls((data.urls || []).slice(0, 5));
    } catch (err: any) {
      setError(err.message || 'Error fetching sitemap XML');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSelect = (url: string) => {
    if (selectedUrls.includes(url)) {
      setSelectedUrls(selectedUrls.filter((u) => u !== url));
    } else {
      if (selectedUrls.length >= 10) {
        alert('You can select up to 10 URLs for a single batch run.');
        return;
      }
      setSelectedUrls([...selectedUrls, url]);
    }
  };

  const handleSelectFirstTen = () => {
    setSelectedUrls(filteredUrls.slice(0, 10));
  };

  const handleClearSelection = () => {
    setSelectedUrls([]);
  };

  const filteredUrls = discoveredUrls.filter((u) =>
    u.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-6">
      <div>
        <h3 className="text-base font-semibold text-slate-900 tracking-tight">
          XML Sitemap Discovery & Checker
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Enter your site's sitemap.xml to extract published URLs and test their Google index presence
        </p>
      </div>

      <form onSubmit={handleFetchSitemap} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <FileCode className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={sitemapUrl}
              onChange={(e) => setSitemapUrl(e.target.value)}
              placeholder="https://example.com/sitemap.xml"
              className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm font-mono border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !sitemapUrl.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs sm:text-sm font-medium rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Parsing...</span>
              </>
            ) : (
              <>
                <span>Extract URLs</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>Try popular sitemaps:</span>
          <button
            type="button"
            onClick={() => {
              setSitemapUrl('https://wordpress.org/news/sitemap.xml');
            }}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            wordpress.org/news
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => {
              setSitemapUrl('https://stripe.com/sitemap/sitemap.xml');
            }}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            stripe.com
          </button>
        </div>
      </form>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {discoveredUrls.length > 0 && (
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-800">
                Discovered {discoveredUrls.length} Page URLs
              </div>
              <p className="text-[11px] text-slate-500">
                Selected {selectedUrls.length} of 10 max for batch run
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectFirstTen}
                className="text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Select First 10
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1.5 transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={selectedUrls.length === 0}
                onClick={() => onSendToBatch(selectedUrls)}
                className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-3.5 py-1.5 rounded-lg font-medium shadow-xs transition-colors cursor-pointer"
              >
                <span>Run Batch ({selectedUrls.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Search Filter */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter by slug or keyword..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-slate-50/30"
            />
          </div>

          {/* URLs List */}
          <div className="max-h-80 overflow-y-auto border border-slate-200/80 rounded-lg divide-y divide-slate-100">
            {filteredUrls.map((url, idx) => {
              const isSelected = selectedUrls.includes(url);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 hover:bg-slate-50 text-xs transition-colors"
                >
                  <div
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    onClick={() => handleToggleSelect(url)}
                  >
                    <button
                      type="button"
                      className="text-slate-400 hover:text-blue-600 shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <span className="font-mono text-[11px] truncate text-slate-700">
                      {url}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <button
                      type="button"
                      onClick={() => onCheckUrl(url)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                    >
                      Check Single
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
