import type { Metadata } from 'next'
import { Outfit, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

const BASE_URL = 'https://docscraper.codiac.online'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'DocScraper — Context Builder for Coding Agents',
    template: '%s | DocScraper',
  },
  description:
    'Transform any documentation site into a single structured Markdown file. Build high-fidelity context for AI coding agents with DocScraper.',
  keywords: [
    'documentation scraper',
    'AI context builder',
    'LLM context',
    'markdown generator',
    'coding agent context',
    'docs to markdown',
    'RAG context',
    'AI developer tools',
  ],
  authors: [{ name: 'DocScraper' }],
  creator: 'DocScraper',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'DocScraper',
    title: 'DocScraper — Context Builder for Coding Agents',
    description:
      'Transform any documentation site into a single structured Markdown file. Build high-fidelity context for AI coding agents.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'DocScraper — Context Builder for Coding Agents',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DocScraper — Context Builder for Coding Agents',
    description:
      'Transform any documentation site into a single structured Markdown file for AI coding agents.',
    images: ['/og-image.png'],
    creator: '@docscraper',
  },
  other: {
    'theme-color': '#10b981',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased bg-[#020617] text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-300" suppressHydrationWarning>
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))]" />
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_500px_at_50%_200px,rgba(5,150,105,0.05),transparent)]" />
        {children}
      </body>
    </html>
  )
}
