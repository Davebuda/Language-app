import { Outfit, DM_Sans } from 'next/font/google'
import type { Metadata } from 'next'
import { ClientAILoader } from '@/components/ai/ClientAILoader'
import { TopographicGrid } from '@/components/ui/TopographicGrid'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NorskCoach',
  description:
    'A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes them with targeted practice.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  ),
  openGraph: {
    title: 'NorskCoach',
    description:
      'A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes them with targeted practice.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmSans.variable}`}>
      <body className="font-sans antialiased bg-[var(--nc-bg)]">
        <TopographicGrid />
        {children}
        <ClientAILoader />
      </body>
    </html>
  )
}
