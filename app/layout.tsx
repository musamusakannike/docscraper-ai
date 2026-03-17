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

export const metadata = {
  title: 'DocScraper AI | Context Builder for Coding Agents',
  description: 'Transform documentation sites into structured Markdown for better AI context.',
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
