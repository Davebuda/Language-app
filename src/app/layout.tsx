import { Schibsted_Grotesk } from 'next/font/google'
import type { Metadata } from 'next'
import { ClientAILoader } from '@/components/ai/ClientAILoader'
import { TopographicGrid } from '@/components/ui/TopographicGrid'
import { MotionProvider } from '@/components/ui/MotionProvider'
import './globals.css'

const schibstedDisplay = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-display',
  display: 'swap',
})

const schibstedBody = Schibsted_Grotesk({
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
    <html lang="en" className={`${schibstedDisplay.variable} ${schibstedBody.variable} dark`}>
      <body className="font-sans antialiased bg-[var(--nc-bg)]">
        <MotionProvider>
          <TopographicGrid />
          {children}
          <ClientAILoader />
        </MotionProvider>
      </body>
    </html>
  )
}
