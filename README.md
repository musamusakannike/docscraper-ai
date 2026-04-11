<div align="center">
<img width="1200" height="475" alt="DocScraper AI Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

<h1>DocScraper AI</h1>

<p>Transform any documentation site into perfectly structured Markdown — optimised context for your coding agents and LLMs.</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)

</div>

---

## Features

- **Recursive web crawler** — crawls a documentation site up to a configurable depth (1–5 hops) and page limit (up to 200 pages), staying within the same origin and base path.
- **Cloudflare / bot-protection bypass** — attempts a realistic `fetch` first; automatically falls back to a headless Chromium browser (via `puppeteer-core`) when a Cloudflare challenge is detected.
- **Smart HTML → Markdown conversion** — strips nav, footer, sidebar, ads, and scripts with `cheerio`, then converts the clean content to fenced-code, ATX-heading Markdown via `turndown`.
- **Real-time progress stream** — scraping progress is streamed to the UI over Server-Sent Events so you see every page as it is processed.
- **Compiled output** — results are assembled into a single Markdown document with a table of contents, page anchors, and source URLs.
- **Multiple export formats** — download the scraped content as `.md`, `.txt`, `.json`, or `.html`.
- **Copy to clipboard** — one-click copy of the full compiled Markdown.
- **Raw / Rendered preview** — toggle between raw Markdown and a rendered `react-markdown` preview inside the app.
- **Scrape history** — the last 20 scrape sessions are persisted to `localStorage` so you can restore previous results instantly.
- **AI Summarize & Q&A** — powered by [OpenRouter](https://openrouter.ai); choose from Gemini 2.0 Flash, Gemini 2.5 Pro, Claude 3.5 Sonnet, GPT-4o, or GPT-4o Mini to summarise the docs or ask questions about them. Responses are streamed in real time.
- **Advanced crawl settings** — configurable page limit (10 / 25 / 50 / 100) and crawl depth via an expandable panel.
- **Concurrent scraping** — up to 5 pages are fetched in parallel per batch for fast coverage.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| HTML parsing | [cheerio](https://cheerio.js.org) |
| Markdown conversion | [turndown](https://github.com/mixmark-io/turndown) |
| Headless browser | [puppeteer-core](https://pptr.dev) |
| AI gateway | [OpenRouter](https://openrouter.ai) |
| Animations | [Motion](https://motion.dev) |
| Icons | [Lucide React](https://lucide.dev) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Chromium-based browser installed locally (for Cloudflare fallback during development)
- An [OpenRouter](https://openrouter.ai) API key (optional — only needed for the AI features)

### Installation

```bash
git clone https://github.com/musamusakannike/docscraper-ai.git
cd docscraper-ai
npm install
```

### Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `BROWSER_WS_ENDPOINT` | Optional | WebSocket endpoint for a remote headless browser service (e.g. Browserless, BrowserBase). Falls back to local Chrome when not set. |

> **Note:** The OpenRouter API key is entered directly in the UI and stored in `localStorage`. It is never sent to any server other than OpenRouter.

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

---

## Usage

1. Paste the root URL of any documentation site (e.g. `https://docs.example.com`).
2. *(Optional)* Expand **Advanced Settings** to adjust the page limit and crawl depth.
3. Click **Optimize Context** and watch pages being scraped in real time.
4. Once complete, **copy**, **preview**, or **export** the compiled Markdown.
5. *(Optional)* Open the **AI Summarize & Q&A** panel, enter your OpenRouter API key, pick a model, and either summarise the docs or ask specific questions about them.

---

## Remote Browser Service (Production)

For production deployments, set `BROWSER_WS_ENDPOINT` to a Puppeteer-compatible WebSocket endpoint so the server can render JavaScript-heavy or Cloudflare-protected pages:

- [Browserless](https://www.browserless.io) — `wss://chrome.browserless.io?token=YOUR_TOKEN`
- [BrowserBase](https://www.browserbase.com)
- Any self-hosted `puppeteer-core`-compatible endpoint

When `BROWSER_WS_ENDPOINT` is not set, the scraper uses the local Chrome installation at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.

---

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feat/my-feature`)
5. Open a Pull Request

---

## License

Distributed under the [MIT License](./LICENSE).
