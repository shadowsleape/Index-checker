export interface TechnicalData {
  statusCode: number;
  responseTimeMs: number;
  finalUrl: string;
  isRedirected: boolean;
  fetchError: string | null;
  hasNoIndex: boolean;
  hasNoFollow: boolean;
  xRobotsTag: string | null;
  metaRobots: string | null;
  canonical: string | null;
  isCanonicalMatch: boolean;
  isRobotsDisallowed: boolean;
  robotsRuleMatched?: string;
  robotsTxtFound: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  favicon: string | null;
  ogImage: string | null;
  h1: string | null;
  wordCount: number;
}

export interface SerpSnippet {
  title: string;
  snippet: string;
  displayUrl: string;
  cachedDate?: string;
}

export interface GoogleGrounding {
  urls: Array<{ uri: string; title: string }>;
  queries: string[];
}

export interface Diagnosis {
  summary: string;
  reasons: string[];
  actionItems: string[];
}

export interface DirectLinks {
  googleSiteSearch: string;
  googleExactSearch: string;
  googleCache: string;
  searchConsoleInspect: string;
}

export type IndexStatusType =
  | 'INDEXED'
  | 'NOT_INDEXED'
  | 'NOINDEX_BLOCKED'
  | 'SUSPECTED_DEINDEXED'
  | 'UNKNOWN';

export interface AuditResult {
  url: string;
  domain: string;
  pathname: string;
  checkedAt: string;
  healthScore: number;
  isIndexed: boolean;
  indexStatus: IndexStatusType;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  serpSnippet: SerpSnippet;
  technical: TechnicalData;
  googleGrounding: GoogleGrounding;
  diagnosis: Diagnosis;
  directLinks: DirectLinks;
}

export interface BatchItem {
  url: string;
  status: 'pending' | 'checking' | 'completed' | 'failed';
  data?: AuditResult;
  error?: string;
}
