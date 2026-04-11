import DocScraper from '@/components/DocScraper';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'DocScraper',
  url: 'https://docscraper.codiac.online',
  description:
    'Transform any documentation site into a single structured Markdown file. Build high-fidelity context for AI coding agents.',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Documentation scraping',
    'Markdown export',
    'AI context generation',
    'Multi-format export (MD, TXT, JSON, HTML)',
    'AI Summarize & Q&A via OpenRouter',
  ],
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main>
        <DocScraper />
      </main>
    </>
  );
}
