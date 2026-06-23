import { Schibsted_Grotesk } from 'next/font/google'
import Script from 'next/script'
import type { Metadata } from 'next'
import { ClientAILoader } from '@/components/ai/ClientAILoader'
import { TopographicGrid } from '@/components/ui/TopographicGrid'
import { MotionProvider } from '@/components/ui/MotionProvider'
import { DeployReloadGuard } from '@/components/ui/DeployReloadGuard'
import { ThemeSync } from '@/components/ui/ThemeSync'
import './globals.css'

// Pre-paint theme application: runs synchronously before the body renders so the
// chosen theme is on <html data-theme> before first paint (no flash). Reads the
// device-local choice; absence falls through to the :root default (honning).
const THEME_INIT = `(function(){try{var t=localStorage.getItem('norskcoach-theme');if(t==='honning'||t==='leirskole'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`

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
      <body className="font-sans antialiased bg-[var(--nc-card-2)]">
        {/* Pre-hydration theme apply (no FOUC). beforeInteractive makes Next inject
            this as a real executing <script> in the streamed HTML — a plain
            <head><script> in App Router is hydrated via the DOM and never runs. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT}
        </Script>
        <MotionProvider>
          <TopographicGrid />
          {children}
          <DeployReloadGuard />
          <ThemeSync />
          <ClientAILoader />
        </MotionProvider>
      </body>
    </html>
  )
}
