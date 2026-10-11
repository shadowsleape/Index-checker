import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  FileCode,
  ShieldAlert,
  Link2,
  Server,
  Layers,
  Heading,
  FileText,
} from 'lucide-react';
import { TechnicalData } from '../types';

interface TechnicalChecklistProps {
  tech: TechnicalData;
  targetUrl: string;
}

export const TechnicalChecklist: React.FC<TechnicalChecklistProps> = ({ tech, targetUrl }) => {
  const isHttpOk = tech.statusCode >= 200 && tech.statusCode < 300;
  const isNoIndex = tech.hasNoIndex;
  const isRobotsAllowed = !tech.isRobotsDisallowed;
  const isCanonicalOk = tech.isCanonicalMatch;

  const titleLen = tech.metaTitle ? tech.metaTitle.length : 0;
  const isTitleGoodLength = titleLen >= 30 && titleLen <= 65;

  const descLen = tech.metaDescription ? tech.metaDescription.length : 0;
  const isDescGoodLength = descLen >= 70 && descLen <= 165;

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-semibold text-slate-900 tracking-tight">
            Technical Indexability Audit
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Crawlability, directives, and HTTP headers inspected live
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{tech.responseTimeMs}ms TTFB</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* 1. HTTP Status */}
        <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {isHttpOk ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">HTTP Status Code</span>
              <span
                className={`text-[11px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                  isHttpOk
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {tech.statusCode || 'Err'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isHttpOk
                ? 'Server responds with 200 OK. Accessible to Googlebot crawler.'
                : tech.isRedirected
                ? `Redirected to: ${tech.finalUrl}`
                : tech.fetchError || 'Server did not return a 200 OK status.'}
            </p>
          </div>
        </div>

        {/* 2. Robots.txt */}
        <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {isRobotsAllowed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">Robots.txt Crawl Access</span>
              <span
                className={`text-[11px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                  isRobotsAllowed
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {isRobotsAllowed ? 'Allowed' : 'Disallowed'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isRobotsAllowed
                ? 'No blocking Disallow rule for Googlebot in robots.txt.'
                : `Blocked by rule: ${tech.robotsRuleMatched || 'Disallow'}. Googlebot cannot crawl.`}
            </p>
          </div>
        </div>

        {/* 3. Meta Robots Directive */}
        <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {!isNoIndex ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">Meta Robots / Index Tag</span>
              <span
                className={`text-[11px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                  !isNoIndex
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {!isNoIndex ? 'index, follow' : 'noindex'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {!isNoIndex
                ? 'No "noindex" tag detected. Google is allowed to store and rank this page.'
                : 'Contains "noindex" directive. Google explicitly instructed NOT to index.'}
            </p>
            {tech.xRobotsTag && (
              <div className="mt-1 text-[10px] text-slate-500 font-mono">
                X-Robots-Tag: {tech.xRobotsTag}
              </div>
            )}
          </div>
        </div>

        {/* 4. Canonical Tag */}
        <div className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/50 flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {isCanonicalOk ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">Canonical Tag</span>
              <span
                className={`text-[11px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                  isCanonicalOk
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {tech.canonical ? (isCanonicalOk ? 'Self-Canonical' : 'Different URL') : 'Missing'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 break-words">
              {tech.canonical
                ? isCanonicalOk
                  ? 'Canonical URL points to itself cleanly.'
                  : `Points to: ${tech.canonical}`
                : 'No <link rel="canonical"> tag found in HTML head.'}
            </p>
          </div>
        </div>
      </div>

      {/* On-Page Content Quality Breakdown */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
          On-Page Content & Metadata Details
        </h4>

        <div className="space-y-2.5 text-xs">
          {/* Title tag length */}
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-700">&lt;title&gt; Tag Length</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono">{titleLen} chars</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded font-medium ${
                  isTitleGoodLength
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-amber-700 bg-amber-50'
                }`}
              >
                {isTitleGoodLength ? 'Optimal (30-65)' : titleLen === 0 ? 'Missing' : 'Suboptimal'}
              </span>
            </div>
          </div>

          {/* Description tag length */}
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-700">&lt;meta description&gt; Length</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-mono">{descLen} chars</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded font-medium ${
                  isDescGoodLength
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-amber-700 bg-amber-50'
                }`}
              >
                {isDescGoodLength ? 'Optimal (70-165)' : descLen === 0 ? 'Missing' : 'Check Length'}
              </span>
            </div>
          </div>

          {/* H1 Heading */}
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2">
              <Heading className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-700">Main Heading &lt;h1&gt;</span>
            </div>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded font-medium ${
                tech.h1 ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
              }`}
            >
              {tech.h1 ? 'Found' : 'Not Detected'}
            </span>
          </div>

          {/* Word Count */}
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-700">Estimated Text Word Count</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-600 font-mono">{tech.wordCount.toLocaleString()} words</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded font-medium ${
                  tech.wordCount > 300 ? 'text-emerald-700 bg-emerald-50' : 'text-slate-600 bg-slate-100'
                }`}
              >
                {tech.wordCount > 300 ? 'Substantive' : 'Thin / Low text'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
