import React from 'react';
import {
  Sparkles,
  ArrowRight,
  ExternalLink,
  Search,
  CheckCircle,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { AuditResult } from '../types';

interface DiagnosisCardProps {
  audit: AuditResult;
}

export const DiagnosisCard: React.FC<DiagnosisCardProps> = ({ audit }) => {
  const { diagnosis, directLinks, indexStatus } = audit;

  const isIndexed = indexStatus === 'INDEXED';

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Search Indexation Insights
            </h3>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Confidence: <span className="font-semibold text-slate-800">{audit.confidence}</span>
          </span>
        </div>

        {/* Executive summary */}
        <div className="my-4 p-4 rounded-lg bg-slate-50 border border-slate-200/70">
          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
            {diagnosis.summary}
          </p>
        </div>

        {/* Detected factors */}
        {diagnosis.reasons && diagnosis.reasons.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Detected Observations
            </h4>
            <ul className="space-y-1.5">
              {diagnosis.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="text-slate-400 mt-0.5">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action items */}
        {diagnosis.actionItems && diagnosis.actionItems.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Recommended Next Steps
            </h4>
            <ul className="space-y-2">
              {diagnosis.actionItems.map((action, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs bg-slate-50/70 p-2.5 rounded-md border border-slate-200/60 text-slate-700"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* External Direct Verification Links */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="text-xs font-semibold text-slate-700 mb-2.5">
          Direct Google Verification Tools
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <a
            href={directLinks.googleSiteSearch}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">Google 'site:' Query</span>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
          </a>

          <a
            href={directLinks.searchConsoleInspect}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Search Console Inspect</span>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
};
