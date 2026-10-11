import React, { useState } from 'react';
import { ExternalLink, Copy, Check, Smartphone, Monitor, Search, Globe } from 'lucide-react';
import { AuditResult } from '../types';

interface SerpPreviewProps {
  audit: AuditResult;
}

export const SerpPreview: React.FC<SerpPreviewProps> = ({ audit }) => {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const domain = audit.domain;
  const pathParts = audit.pathname.split('/').filter(Boolean);
  const breadcrumb = pathParts.length > 0 ? `${domain} › ${pathParts.join(' › ')}` : domain;

  const serpTitle = audit.serpSnippet.title || audit.technical.metaTitle || 'No Title Available';
  const serpSnippet = audit.serpSnippet.snippet || audit.technical.metaDescription || 'No description preview available.';

  const onPageTitle = audit.technical.metaTitle || 'No title tag in HTML';
  const onPageDesc = audit.technical.metaDescription || 'No description tag in HTML';

  const isTitleDifferent = onPageTitle !== serpTitle && onPageTitle !== 'No title tag in HTML';
  const isDescDifferent = onPageDesc !== serpSnippet && onPageDesc !== 'No description tag in HTML';

  const handleCopySerp = () => {
    const text = `Title: ${serpTitle}\nURL: ${audit.url}\nSnippet: ${serpSnippet}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div>
          <h3 className="text-base font-semibold text-slate-900 tracking-tight">
            Google SERP Result Preview
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            How your page is presented to searchers on Google.com
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Device selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setDevice('desktop')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                device === 'desktop' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Desktop SERP Preview"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setDevice('mobile')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${
                device === 'mobile' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Mobile SERP Preview"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>

          <button
            onClick={handleCopySerp}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
            title="Copy snippet details"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Simulated Google Search Box & Card */}
      <div className="my-5">
        <div
          className={`mx-auto transition-all ${
            device === 'mobile' ? 'max-w-md border border-slate-200 rounded-2xl p-4 bg-slate-50/50' : 'w-full'
          }`}
        >
          {device === 'mobile' && (
            <div className="text-[11px] text-slate-400 font-medium mb-3 flex items-center justify-between pb-2 border-b border-slate-200/60">
              <span>Google Mobile View</span>
              <span>390 × 844</span>
            </div>
          )}

          {/* Actual Google SERP Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
            {/* Top row: Favicon + Domain + Breadcrumb */}
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center overflow-hidden shrink-0">
                {audit.technical.favicon ? (
                  <img
                    src={audit.technical.favicon}
                    alt=""
                    className="w-4 h-4 object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-normal text-slate-800 leading-tight truncate">
                  {domain}
                </span>
                <span className="text-[11px] text-slate-500 leading-tight truncate">
                  https://{breadcrumb}
                </span>
              </div>
            </div>

            {/* Blue SERP Title */}
            <h4 className="mt-1 text-[19px] sm:text-[20px] font-normal leading-snug">
              <a
                href={audit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1a0dab] hover:underline cursor-pointer break-words"
              >
                {serpTitle}
              </a>
            </h4>

            {/* Meta Snippet Description */}
            <p className="mt-1.5 text-[14px] text-[#4d5156] leading-relaxed break-words font-normal">
              {audit.serpSnippet.cachedDate && (
                <span className="text-slate-500 font-medium mr-1.5">
                  {audit.serpSnippet.cachedDate} —
                </span>
              )}
              {serpSnippet}
            </p>
          </div>
        </div>
      </div>

      {/* Difference / On-Page Comparison Toggle */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-slate-700">
            SERP Snippet vs. On-Page HTML Tag Comparison
          </div>
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
          >
            {showDiff ? 'Hide Comparison' : 'Show Tag Details'}
          </button>
        </div>

        {showDiff && (
          <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-lg border border-slate-200/60 text-xs">
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="font-medium text-slate-700">Page &lt;title&gt; in HTML</span>
                <span>{onPageTitle.length} chars</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200 text-slate-800 font-mono text-[11px] break-words">
                {onPageTitle}
              </div>
              {isTitleDifferent && (
                <p className="text-[11px] text-amber-700 mt-1">
                  Google may have adjusted this title in SERP for query intent or brand brevity.
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="font-medium text-slate-700">Page &lt;meta name="description"&gt;</span>
                <span>{onPageDesc.length} chars</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200 text-slate-800 font-mono text-[11px] break-words">
                {onPageDesc}
              </div>
              {isDescDifferent && (
                <p className="text-[11px] text-amber-700 mt-1">
                  Google generated a contextual snippet based on on-page content instead of the raw meta tag.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Search Queries and Grounding Sources */}
      {audit.googleGrounding && (
        <div className="mt-4 pt-4 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 font-medium mb-2">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span>Google Search Verification Queries</span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {audit.googleGrounding.queries.map((q, idx) => (
              <span
                key={idx}
                className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-mono border border-slate-200"
              >
                {q}
              </span>
            ))}
          </div>

          {audit.googleGrounding.urls.length > 0 && (
            <div>
              <div className="text-[11px] text-slate-500 mb-1.5 font-medium">
                Verified Search Grounding References:
              </div>
              <ul className="space-y-1">
                {audit.googleGrounding.urls.slice(0, 3).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <ExternalLink className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                    <a
                      href={item.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate text-[11px]"
                    >
                      {item.title || item.uri}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
