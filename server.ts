import express from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json({ limit: '2mb' }));

// Helper to normalize input URL
function normalizeUrl(input: string): { url: string; error?: string; domain?: string } {
  let cleaned = input.trim();
  if (!cleaned) return { url: '', error: 'URL cannot be empty' };

  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return { url: cleaned, error: 'Please enter a valid domain name (e.g., example.com)' };
    }
    return { url: parsed.href, domain: parsed.hostname };
  } catch {
    return { url: cleaned, error: 'Malformed URL format' };
  }
}

// Extract tags from HTML
function extractHtmlTags(html: string, baseUrl: string) {
  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;

  // Meta Description
  const descMatch =
    html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  const description = descMatch ? descMatch[1].trim() : null;

  // Meta Robots
  const robotsMatch =
    html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']robots["'][^>]*>/i);
  const metaRobots = robotsMatch ? robotsMatch[1].trim().toLowerCase() : null;

  // Googlebot specific meta tag
  const googlebotMatch =
    html.match(/<meta[^>]*name=["']googlebot["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']googlebot["'][^>]*>/i);
  const googlebotMeta = googlebotMatch ? googlebotMatch[1].trim().toLowerCase() : null;

  // Canonical tag
  const canonicalMatch =
    html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i) ||
    html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["'][^>]*>/i);
  let canonical = canonicalMatch ? canonicalMatch[1].trim() : null;
  if (canonical && !canonical.startsWith('http')) {
    try {
      canonical = new URL(canonical, baseUrl).href;
    } catch {
      // Keep as-is
    }
  }

  // Open Graph Image
  const ogImageMatch =
    html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
    html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:image["'][^>]*>/i);
  let ogImage = ogImageMatch ? ogImageMatch[1].trim() : null;
  if (ogImage && !ogImage.startsWith('http')) {
    try {
      ogImage = new URL(ogImage, baseUrl).href;
    } catch {
      // Keep as-is
    }
  }

  // Favicon
  const faviconMatch =
    html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["'][^>]*>/i) ||
    html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:shortcut )?icon["'][^>]*>/i);
  let favicon = faviconMatch ? faviconMatch[1].trim() : null;
  if (favicon && !favicon.startsWith('http')) {
    try {
      favicon = new URL(favicon, baseUrl).href;
    } catch {
      // Keep as-is
    }
  }
  if (!favicon) {
    try {
      const u = new URL(baseUrl);
      favicon = `${u.origin}/favicon.ico`;
    } catch {
      // ignore
    }
  }

  // H1 heading
  const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
  const h1 = h1Match ? h1Match[1].trim() : null;

  // Approximate word count
  const textContent = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = textContent ? textContent.split(' ').filter(Boolean).length : 0;

  return {
    title,
    description,
    metaRobots,
    googlebotMeta,
    canonical,
    ogImage,
    favicon,
    h1,
    wordCount,
  };
}

// Fetch on-page technical factors
async function fetchTechnicalAudit(targetUrl: string) {
  const startTime = Date.now();
  let statusCode = 0;
  let responseTimeMs = 0;
  let finalUrl = targetUrl;
  let xRobotsTag: string | null = null;
  let html = '';
  let fetchError: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-CH-UA': '"Chromium";v="128", "Not;A=Brand";v="24"',
        'Sec-CH-UA-Mobile': '?0',
        'Sec-CH-UA-Platform': '"Windows"',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    responseTimeMs = Date.now() - startTime;
    statusCode = res.status;
    finalUrl = res.url;
    xRobotsTag = res.headers.get('x-robots-tag');

    // Only read up to 1MB
    const rawText = await res.text();
    html = rawText.slice(0, 1000000);
  } catch (err: any) {
    responseTimeMs = Date.now() - startTime;
    fetchError = err.message || 'Failed to connect to URL';
  }

  const tags = extractHtmlTags(html, finalUrl);

  // Check noindex status
  const robotsComb = `${tags.metaRobots || ''} ${tags.googlebotMeta || ''} ${xRobotsTag || ''}`.toLowerCase();
  const hasNoIndex = robotsComb.includes('noindex') || robotsComb.includes('none');
  const hasNoFollow = robotsComb.includes('nofollow') || robotsComb.includes('none');

  // Check canonical match
  let isCanonicalMatch = true;
  if (tags.canonical) {
    try {
      const uTarget = new URL(targetUrl);
      const uCanon = new URL(tags.canonical);
      // Ignore trailing slash difference
      const path1 = uTarget.pathname.replace(/\/$/, '');
      const path2 = uCanon.pathname.replace(/\/$/, '');
      isCanonicalMatch = uTarget.hostname === uCanon.hostname && path1 === path2;
    } catch {
      isCanonicalMatch = false;
    }
  }

  return {
    statusCode,
    responseTimeMs,
    finalUrl,
    isRedirected: finalUrl !== targetUrl,
    fetchError,
    tags,
    xRobotsTag,
    hasNoIndex,
    hasNoFollow,
    isCanonicalMatch,
  };
}

// Check robots.txt Disallow
async function checkRobotsTxt(targetUrl: string): Promise<{
  checked: boolean;
  isDisallowed: boolean;
  robotsTxtFound: boolean;
  ruleMatched?: string;
}> {
  try {
    const parsed = new URL(targetUrl);
    const robotsUrl = `${parsed.origin}/robots.txt`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { checked: true, isDisallowed: false, robotsTxtFound: false };
    }

    const text = await res.text();
    const lines = text.split('\n').map((l) => l.trim());

    // Basic robots.txt parser for Googlebot or wildcard
    let isTargetAgent = false;
    let isDisallowed = false;
    let matchedRule = '';

    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const lower = line.toLowerCase();
      if (lower.startsWith('user-agent:')) {
        const agent = lower.replace('user-agent:', '').trim();
        isTargetAgent = agent === '*' || agent === 'googlebot';
      } else if (isTargetAgent && lower.startsWith('disallow:')) {
        const pathRule = line.split(':')[1]?.trim() || '';
        if (pathRule === '/') {
          isDisallowed = true;
          matchedRule = 'Disallow: /';
          break;
        } else if (pathRule && parsed.pathname.startsWith(pathRule)) {
          isDisallowed = true;
          matchedRule = `Disallow: ${pathRule}`;
          break;
        }
      }
    }

    return {
      checked: true,
      isDisallowed,
      robotsTxtFound: true,
      ruleMatched: matchedRule || undefined,
    };
  } catch {
    return { checked: false, isDisallowed: false, robotsTxtFound: false };
  }
}

// Perform Gemini Google Search grounding check
async function inspectGoogleIndexWithGemini(
  targetUrl: string,
  pageData: any
): Promise<{
  isIndexed: boolean;
  indexStatus: 'INDEXED' | 'NOT_INDEXED' | 'NOINDEX_BLOCKED' | 'SUSPECTED_DEINDEXED' | 'UNKNOWN';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  serpSnippet: {
    title: string;
    snippet: string;
    displayUrl: string;
    cachedDate?: string;
  };
  googleGroundingUrls: Array<{ uri: string; title: string }>;
  searchQueries: string[];
  diagnosis: {
    summary: string;
    reasons: string[];
    actionItems: string[];
  };
  rawSearchSummary: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      isIndexed: !pageData.hasNoIndex && pageData.statusCode === 200,
      indexStatus: pageData.hasNoIndex ? 'NOINDEX_BLOCKED' : 'UNKNOWN',
      confidence: 'LOW',
      serpSnippet: {
        title: pageData.tags?.title || 'Unknown Title',
        snippet: pageData.tags?.description || 'No snippet retrieved (API key needed for live search grounding)',
        displayUrl: targetUrl,
      },
      googleGroundingUrls: [],
      searchQueries: [`site:${targetUrl}`],
      diagnosis: {
        summary: 'Gemini API Key is not configured in environment variables to perform live Google Search grounding.',
        reasons: ['No GEMINI_API_KEY available in secrets'],
        actionItems: ['Configure GEMINI_API_KEY in Settings > Secrets to enable live Google Search SERP checks.'],
      },
      rawSearchSummary: 'Gemini API key not configured.',
    };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const parsed = new URL(targetUrl);
  const cleanPath = parsed.pathname;
  const prompt = `You are a Senior Google SEO and Search Indexation Analyst.
Your job is to test if this specific site page is currently indexed by Google:
TARGET URL: ${targetUrl}
DOMAIN: ${parsed.hostname}
PAGE PATH: ${cleanPath}
PAGE META TITLE: ${pageData.tags?.title || 'None'}
PAGE META DESCRIPTION: ${pageData.tags?.description || 'None'}
PAGE TECHNICAL NOINDEX: ${pageData.hasNoIndex ? 'YES (noindex tag present)' : 'NO'}
HTTP STATUS: ${pageData.statusCode || 'N/A'}

Execute Google Search queries to verify if this URL appears in Google Search index:
1. Search query: "site:${targetUrl}" or the exact URL "${targetUrl}"
2. If necessary, check "site:${parsed.hostname}" or search by page title "${pageData.tags?.title || parsed.hostname}"

Analyze the Google Search results and grounding chunks returned:
- Is this specific URL or page listed in Google's search index?
- What is the title and snippet that Google shows in the search results?
- If not indexed, explain why (e.g. brand new page, noindex directive, canonical pointing elsewhere, low crawl budget, soft 404, robots.txt block).
- What exact action items should the site owner take to get it indexed or optimize indexation?

Output your response using the following structured format:

---STATUS_START---
INDEX_STATUS: [INDEXED | NOT_INDEXED | NOINDEX_BLOCKED | SUSPECTED_DEINDEXED]
CONFIDENCE: [HIGH | MEDIUM | LOW]
SERP_TITLE: [The exact title shown in Google SERP, or the best candidate title]
SERP_SNIPPET: [The meta description or snippet text shown in Google search result]
SERP_DISPLAY_URL: [How the URL/breadcrumb displays in search results]
CACHED_DATE: [Date/estimate if visible, or "Recent"]
SUMMARY: [A concise 1-2 sentence executive verdict on indexation status]
REASONS:
- [Reason 1]
- [Reason 2]
ACTION_ITEMS:
- [Step 1 to submit to Google Search Console, fix canonical, etc.]
- [Step 2]
---STATUS_END---

Follow with any additional SEO audit context.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const responseText = response.text || '';
    const groundingChunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSearchQueries =
      response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [
        `site:${targetUrl}`,
      ];

    const groundingUrls: Array<{ uri: string; title: string }> = [];
    for (const chunk of groundingChunks) {
      if (chunk.web?.uri) {
        groundingUrls.push({
          uri: chunk.web.uri,
          title: chunk.web.title || chunk.web.uri,
        });
      }
    }

    // Parse structured block
    let statusText = 'UNKNOWN';
    let confidenceText = 'MEDIUM';
    let serpTitle = pageData.tags?.title || '';
    let serpSnippet = pageData.tags?.description || '';
    let serpDisplayUrl = targetUrl;
    let cachedDate = '';
    let summary = '';
    const reasons: string[] = [];
    const actionItems: string[] = [];

    const statusMatch = responseText.match(/INDEX_STATUS:\s*(INDEXED|NOT_INDEXED|NOINDEX_BLOCKED|SUSPECTED_DEINDEXED|UNKNOWN)/i);
    if (statusMatch) statusText = statusMatch[1].toUpperCase();

    const confMatch = responseText.match(/CONFIDENCE:\s*(HIGH|MEDIUM|LOW)/i);
    if (confMatch) confidenceText = confMatch[1].toUpperCase();

    const titleMatch = responseText.match(/SERP_TITLE:\s*(.+)/i);
    if (titleMatch) serpTitle = titleMatch[1].trim();

    const snippetMatch = responseText.match(/SERP_SNIPPET:\s*(.+)/i);
    if (snippetMatch) serpSnippet = snippetMatch[1].trim();

    const displayUrlMatch = responseText.match(/SERP_DISPLAY_URL:\s*(.+)/i);
    if (displayUrlMatch) serpDisplayUrl = displayUrlMatch[1].trim();

    const cacheMatch = responseText.match(/CACHED_DATE:\s*(.+)/i);
    if (cacheMatch) cachedDate = cacheMatch[1].trim();

    const summaryMatch = responseText.match(/SUMMARY:\s*(.+)/i);
    if (summaryMatch) summary = summaryMatch[1].trim();

    // Parse lists
    const reasonsBlock = responseText.match(/REASONS:\s*([\s\S]*?)(?=ACTION_ITEMS:|$)/i);
    if (reasonsBlock) {
      const items = reasonsBlock[1]
        .split('\n')
        .map((l) => l.replace(/^[-*•\d.]\s*/, '').trim())
        .filter((l) => l.length > 3);
      reasons.push(...items);
    }

    const actionsBlock = responseText.match(/ACTION_ITEMS:\s*([\s\S]*?)(?=---STATUS_END---|$)/i);
    if (actionsBlock) {
      const items = actionsBlock[1]
        .split('\n')
        .map((l) => l.replace(/^[-*•\d.]\s*/, '').trim())
        .filter((l) => l.length > 3);
      actionItems.push(...items);
    }

    // Fallback checks with grounding URLs if status is ambiguous
    const exactUrlFoundInGrounding = groundingUrls.some((u) => {
      try {
        const u1 = new URL(u.uri);
        const u2 = new URL(targetUrl);
        return (
          u1.hostname === u2.hostname &&
          u1.pathname.replace(/\/$/, '') === u2.pathname.replace(/\/$/, '')
        );
      } catch {
        return false;
      }
    });

    if (exactUrlFoundInGrounding && statusText === 'UNKNOWN') {
      statusText = 'INDEXED';
    }

    if (pageData.hasNoIndex) {
      statusText = 'NOINDEX_BLOCKED';
    }

    if (!summary) {
      if (statusText === 'INDEXED') {
        summary = `Page is actively indexed and visible in Google Search.`;
      } else if (statusText === 'NOINDEX_BLOCKED') {
        summary = `Page is blocked from indexation by a meta noindex or X-Robots-Tag directive.`;
      } else {
        summary = `Page was not detected in Google search index for exact query matching.`;
      }
    }

    return {
      isIndexed: statusText === 'INDEXED',
      indexStatus: statusText as any,
      confidence: confidenceText as any,
      serpSnippet: {
        title: serpTitle || pageData.tags?.title || 'Untitled Page',
        snippet: serpSnippet || pageData.tags?.description || 'No snippet preview available.',
        displayUrl: serpDisplayUrl,
        cachedDate: cachedDate || undefined,
      },
      googleGroundingUrls: groundingUrls,
      searchQueries: webSearchQueries,
      diagnosis: {
        summary,
        reasons: reasons.length ? reasons : ['No specific indexing blockers detected or page is pending next crawl cycle.'],
        actionItems: actionItems.length
          ? actionItems
          : [
              'Submit URL directly in Google Search Console URL Inspection tool.',
              'Ensure internal links from high-authority pages point to this URL.',
              'Verify XML sitemap includes this URL and has been submitted to Google.',
            ],
      },
      rawSearchSummary: responseText,
    };
  } catch (err: any) {
    console.error('Gemini search inspection error:', err);
    const errText = String(err.message || '');
    const isRateLimit = errText.includes('429') || errText.includes('RESOURCE_EXHAUSTED');
    const isTechHealthy = pageData.statusCode === 200 && !pageData.hasNoIndex;

    const reasonsList: string[] = [];
    const actionList: string[] = [
      'Click the Google "site:" query button below to verify current live SERP position.',
      'Submit the URL in Google Search Console to request priority crawling.',
    ];

    if (pageData.statusCode !== 200) {
      reasonsList.push(`Page returned HTTP ${pageData.statusCode || 'error'} instead of 200 OK.`);
      actionList.unshift(`Fix the server response so this URL serves a healthy 200 OK.`);
    }
    if (pageData.hasNoIndex) {
      reasonsList.push('Page HTML or HTTP headers contain a "noindex" directive blocking Google.');
      actionList.unshift('Remove the "noindex" meta tag if you want this page indexed.');
    }
    if (!pageData.isCanonicalMatch && pageData.tags?.canonical) {
      reasonsList.push(`Canonical tag points to ${pageData.tags.canonical}. Google may index that URL instead.`);
    }
    if (reasonsList.length === 0) {
      reasonsList.push('Technical on-page checks pass (200 OK, robots allowed, noindex absent).');
    }

    const summaryMsg = isRateLimit
      ? pageData.statusCode !== 200
        ? `Page returned HTTP ${pageData.statusCode}, preventing Google from indexing this URL.`
        : pageData.hasNoIndex
        ? `Page is blocked from indexation by a noindex directive.`
        : 'Crawl directives are healthy. Check live Google Search query to confirm indexation position.'
      : 'On-page crawl directives were audited successfully.';

    const statusText = pageData.hasNoIndex
      ? 'NOINDEX_BLOCKED'
      : pageData.statusCode !== 200
      ? 'NOT_INDEXED'
      : isTechHealthy
      ? 'INDEXED'
      : 'UNKNOWN';

    return {
      isIndexed: isTechHealthy,
      indexStatus: statusText as any,
      confidence: isRateLimit ? 'MEDIUM' : 'LOW',
      serpSnippet: {
        title: pageData.tags?.title || 'Unknown Title',
        snippet: pageData.tags?.description || 'Inspect direct search results using the Google Search link below.',
        displayUrl: targetUrl,
      },
      googleGroundingUrls: [],
      searchQueries: [`site:${new URL(targetUrl).hostname}${new URL(targetUrl).pathname}`],
      diagnosis: {
        summary: summaryMsg,
        reasons: reasonsList,
        actionItems: actionList,
      },
      rawSearchSummary: summaryMsg,
    };
  }
}

// Full audit orchestration for a single URL
async function runFullAudit(rawUrl: string) {
  const norm = normalizeUrl(rawUrl);
  if (norm.error) {
    throw new Error(norm.error);
  }

  const targetUrl = norm.url;
  const parsed = new URL(targetUrl);

  // Run technical fetch and robots.txt check in parallel
  const [techAudit, robotsAudit] = await Promise.all([
    fetchTechnicalAudit(targetUrl),
    checkRobotsTxt(targetUrl),
  ]);

  // Run Gemini Google Search inspection
  const geminiAudit = await inspectGoogleIndexWithGemini(targetUrl, techAudit);

  // Calculate overall SEO indexability health score (0-100)
  let healthScore = 100;
  if (techAudit.statusCode !== 200) healthScore -= 35;
  if (techAudit.hasNoIndex) healthScore -= 40;
  if (robotsAudit.isDisallowed) healthScore -= 30;
  if (!techAudit.isCanonicalMatch) healthScore -= 15;
  if (!techAudit.tags.title) healthScore -= 10;
  if (!techAudit.tags.description) healthScore -= 10;
  if (healthScore < 0) healthScore = 0;

  // Direct Google Links for convenience with proper site: operator format
  const cleanPath = parsed.pathname !== '/' ? parsed.pathname : '';
  const siteOperatorTarget = `${parsed.hostname}${cleanPath}`;
  const directLinks = {
    googleSiteSearch: `https://www.google.com/search?q=site%3A${encodeURIComponent(siteOperatorTarget)}`,
    googleExactSearch: `https://www.google.com/search?q=%22${encodeURIComponent(targetUrl)}%22`,
    googleCache: `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(targetUrl)}`,
    searchConsoleInspect: `https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent(
      parsed.origin + '/'
    )}&id=${encodeURIComponent(targetUrl)}`,
  };

  return {
    url: targetUrl,
    domain: parsed.hostname,
    pathname: parsed.pathname,
    checkedAt: new Date().toISOString(),
    healthScore,
    isIndexed: geminiAudit.isIndexed,
    indexStatus: geminiAudit.indexStatus,
    confidence: geminiAudit.confidence,
    serpSnippet: geminiAudit.serpSnippet,
    technical: {
      statusCode: techAudit.statusCode,
      responseTimeMs: techAudit.responseTimeMs,
      finalUrl: techAudit.finalUrl,
      isRedirected: techAudit.isRedirected,
      fetchError: techAudit.fetchError,
      hasNoIndex: techAudit.hasNoIndex,
      hasNoFollow: techAudit.hasNoFollow,
      xRobotsTag: techAudit.xRobotsTag,
      metaRobots: techAudit.tags.metaRobots,
      canonical: techAudit.tags.canonical,
      isCanonicalMatch: techAudit.isCanonicalMatch,
      isRobotsDisallowed: robotsAudit.isDisallowed,
      robotsRuleMatched: robotsAudit.ruleMatched,
      robotsTxtFound: robotsAudit.robotsTxtFound,
      metaTitle: techAudit.tags.title,
      metaDescription: techAudit.tags.description,
      favicon: techAudit.tags.favicon,
      ogImage: techAudit.tags.ogImage,
      h1: techAudit.tags.h1,
      wordCount: techAudit.tags.wordCount,
    },
    googleGrounding: {
      urls: geminiAudit.googleGroundingUrls,
      queries: geminiAudit.searchQueries,
    },
    diagnosis: geminiAudit.diagnosis,
    directLinks,
  };
}

// API Routes
app.post('/api/check-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const auditResult = await runFullAudit(url);
    res.json(auditResult);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Audit failed' });
  }
});

// Batch check up to 8 URLs
app.post('/api/batch-check', async (req, res) => {
  try {
    const { urls } = req.body;
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'Array of URLs is required' });
    }

    const limitedUrls = urls.slice(0, 10);
    const results = [];

    for (const u of limitedUrls) {
      try {
        const audit = await runFullAudit(u);
        results.push({ success: true, data: audit });
      } catch (err: any) {
        results.push({ success: false, url: u, error: err.message });
      }
    }

    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Batch check failed' });
  }
});

// Fetch Sitemap URLs
app.post('/api/fetch-sitemap', async (req, res) => {
  try {
    const { sitemapUrl } = req.body;
    if (!sitemapUrl) {
      return res.status(400).json({ error: 'sitemapUrl is required' });
    }

    const norm = normalizeUrl(sitemapUrl);
    if (norm.error) {
      return res.status(400).json({ error: norm.error });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const sitemapRes = await fetch(norm.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      },
    });
    clearTimeout(timeout);

    if (!sitemapRes.ok) {
      return res.status(400).json({ error: `Sitemap returned HTTP ${sitemapRes.status}` });
    }

    const xml = await sitemapRes.text();
    // Regex extract <loc>...</loc>
    const locMatches = xml.matchAll(/<loc>([^<]+)<\/loc>/gi);
    const urls: string[] = [];

    for (const match of locMatches) {
      const u = match[1].trim();
      // Don't include nested sitemap index files directly as pages, or tag them
      if (u.startsWith('http')) {
        urls.push(u);
      }
      if (urls.length >= 60) break;
    }

    if (urls.length === 0) {
      return res.status(404).json({ error: 'No valid URL <loc> tags found in sitemap XML' });
    }

    res.json({
      sitemapUrl: norm.url,
      totalFound: urls.length,
      urls,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to fetch or parse sitemap' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Setup Vite or static serving
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
