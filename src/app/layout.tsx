import { Schibsted_Grotesk } from 'next/font/google'
import type { Metadata } from 'next'
import { ClientAILoader } from '@/components/ai/ClientAILoader'
import { TopographicGrid } from '@/components/ui/TopographicGrid'
import { MotionProvider } from '@/components/ui/MotionProvider'
import { DeployReloadGuard } from '@/components/ui/DeployReloadGuard'
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
  robots: { index: false, follow: false },
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
    <html lang="nb" className={`${schibstedDisplay.variable} ${schibstedBody.variable} dark`}>
      <body className="font-sans antialiased bg-[#2C2E30]">
        <MotionProvider>
          <TopographicGrid />
          {children}
          <DeployReloadGuard />
          <ClientAILoader />
        </MotionProvider>
      </body>
    </html>
  )
}
