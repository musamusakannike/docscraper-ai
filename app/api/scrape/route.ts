import { NextRequest } from 'next/server';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import puppeteer from 'puppeteer-core';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

// Realistic browser headers to avoid basic bot detection
const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

// Detect Cloudflare challenge / bot protection pages
function isCloudflareChallenge(html: string, status: number): boolean {
  if (status === 403 || status === 503) {
    const lower = html.toLowerCase();
    return (
      lower.includes('cf-browser-verification') ||
      lower.includes('cf_chl_opt') ||
      lower.includes('cloudflare') ||
      lower.includes('just a moment') ||
      lower.includes('checking your browser') ||
      lower.includes('ray id') ||
      lower.includes('challenge-platform')
    );
  }
  return false;
}

// Get Chromium executable path for local development
function getLocalChromePath(): string | null {
  const paths = [
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  // In Node.js serverless we can't check fs synchronously easily,
  // so we just return the first macOS path as default for local dev.
  // The BROWSER_WS_ENDPOINT env var is preferred for production.
  return paths[0];
}

// Fetch a page using puppeteer-core (headless browser)
async function fetchWithBrowser(url: string): Promise<string> {
  const wsEndpoint = process.env.BROWSER_WS_ENDPOINT;

  let browser;
  try {
    if (wsEndpoint) {
      // Production: connect to remote browser service (Browserless, BrowserBase, etc.)
      browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint });
    } else {
      // Local dev: launch local Chrome
      const executablePath = getLocalChromePath();
      if (!executablePath) {
        throw new Error('No local Chrome found. Set BROWSER_WS_ENDPOINT for production.');
      }
      browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
    }

    const page = await browser.newPage();
    await page.setUserAgent(BROWSER_HEADERS['User-Agent']);
    await page.setExtraHTTPHeaders({
      'Accept-Language': BROWSER_HEADERS['Accept-Language'],
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait a bit for any remaining JS to execute
    await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 }).catch(() => {});

    const html = await page.content();
    return html;
  } finally {
    if (browser) {
      if (process.env.BROWSER_WS_ENDPOINT) {
        browser.disconnect();
      } else {
        await browser.close();
      }
    }
  }
}

// Fetch HTML with realistic headers, falling back to headless browser if Cloudflare is detected
async function fetchPage(url: string): Promise<{ html: string; ok: boolean }> {
  try {
    // First attempt: regular fetch with realistic headers
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: 'follow',
    });

    const html = await response.text();

    // Check for Cloudflare challenge
    if (isCloudflareChallenge(html, response.status)) {
      console.log(`Cloudflare detected for ${url}, retrying with headless browser...`);
      const browserHtml = await fetchWithBrowser(url);
      return { html: browserHtml, ok: true };
    }

    if (!response.ok) {
      return { html: '', ok: false };
    }

    return { html, ok: true };
  } catch (fetchErr) {
    // If fetch itself fails, try browser as last resort
    console.log(`Fetch failed for ${url}, trying headless browser...`);
    try {
      const browserHtml = await fetchWithBrowser(url);
      return { html: browserHtml, ok: true };
    } catch (browserErr) {
      console.error(`Browser fallback also failed for ${url}:`, browserErr);
      return { html: '', ok: false };
    }
  }
}

// Remove unnecessary elements from the HTML before converting to Markdown
function cleanHtml(html: string) {
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header, aside, .sidebar, .nav, .footer, .header, .ad, .advertisement, svg, button, noscript').remove();
  
  // Try to find the most relevant content
  const contentSelector = 'main, article, .content, #content, .markdown, .documentation-content, .prose';
  const mainContent = $(contentSelector).first();
  
  if (mainContent.length > 0) {
    return mainContent.html() || '';
  }
  
  return $('body').html() || '';
}

function sseEvent(type: string, payload: object): string {
  return `data: ${JSON.stringify({ type, ...payload })}\n\n`;
}

export async function POST(req: NextRequest) {
  const { url, maxPages: rawMaxPages, crawlDepth: rawCrawlDepth } = await req.json();

  if (!url) {
    return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400 });
  }

  const MAX_PAGES = Math.min(Math.max(Number(rawMaxPages) || 50, 1), 200);
  const CRAWL_DEPTH = Math.min(Math.max(Number(rawCrawlDepth) || 3, 1), 10);

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  const send = (type: string, payload: object) => {
    writer.write(encoder.encode(sseEvent(type, payload)));
  };

  (async () => {
    try {
      let normalizedUrl = url;
      if (!url.startsWith('http')) {
        normalizedUrl = `https://${url}`;
      }

      const baseUrl = new URL(normalizedUrl);
      const visited = new Set<string>();
      const queue: { url: string; depth: number }[] = [{ url: normalizedUrl, depth: 0 }];
      const results: { title: string; content: string; url: string }[] = [];

      const CONCURRENCY = 5;

      while (queue.length > 0 && visited.size < MAX_PAGES) {
        const batch = queue.splice(0, Math.min(CONCURRENCY, MAX_PAGES - visited.size));

        const batchPromises = batch.map(async ({ url: currentUrl, depth: currentDepth }) => {
          if (visited.has(currentUrl)) return null;
          visited.add(currentUrl);

          send('progress', {
            currentUrl,
            scraped: visited.size,
            queued: queue.length,
          });

          try {
            const { html, ok } = await fetchPage(currentUrl);

            if (!ok) {
              send('page_failed', { currentUrl });
              return null;
            }

            const $ = cheerio.load(html);

            const title = $('h1').first().text() || $('title').text() || currentUrl;
            const cleanedHtml = cleanHtml(html);
            const markdown = turndownService.turndown(cleanedHtml);

            // Find more links (only if within depth limit)
            if (currentDepth < CRAWL_DEPTH) {
              $('a[href]').each((_, el) => {
                const href = $(el).attr('href');
                if (!href) return;

                try {
                  const absoluteUrl = new URL(href, currentUrl).href.split('#')[0];
                  const parsedAbsolute = new URL(absoluteUrl);

                  const alreadyQueued = queue.some((q) => q.url === absoluteUrl);
                  const inBatch = batch.some((b) => b.url === absoluteUrl);

                  if (
                    parsedAbsolute.origin === baseUrl.origin &&
                    parsedAbsolute.pathname.startsWith(baseUrl.pathname) &&
                    !visited.has(absoluteUrl) &&
                    !alreadyQueued &&
                    !inBatch
                  ) {
                    if (!absoluteUrl.match(/\.(png|jpg|jpeg|gif|pdf|zip|svg|mp4|webm|webp|css|js)$/i)) {
                      queue.push({ url: absoluteUrl, depth: currentDepth + 1 });
                    }
                  }
                } catch (e) {}
              });
            }

            send('page_done', { title, currentUrl });
            return { title, content: markdown, url: currentUrl };
          } catch (err) {
            console.error(`Error scraping ${currentUrl}:`, err);
            send('page_failed', { currentUrl });
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach((res) => {
          if (res) results.push(res);
        });
      }

      // Compile results
      let compiledMarkdown = `# Documentation Index: ${baseUrl.hostname}\n\n`;
      compiledMarkdown += `Generated by DocScraper AI on ${new Date().toLocaleDateString()}\n`;
      compiledMarkdown += `Base URL: ${url}\n\n`;

      compiledMarkdown += `## Table of Contents\n\n`;
      results.forEach((res, i) => {
        const anchor = res.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        compiledMarkdown += `${i + 1}. [${res.title}](#${anchor})\n`;
      });

      compiledMarkdown += `\n---\n\n`;

      results.forEach((res) => {
        const anchor = res.title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        compiledMarkdown += `### ${res.title} <a name="${anchor}"></a>\n`;
        compiledMarkdown += `Source: ${res.url}\n\n`;
        compiledMarkdown += `${res.content}\n\n`;
        compiledMarkdown += `---\n\n`;
      });

      send('complete', { markdown: compiledMarkdown, pageCount: results.length, results });
    } catch (error: any) {
      console.error('Scraping error:', error);
      send('error', { message: error.message || 'Failed to scrape documentation' });
    } finally {
      writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
