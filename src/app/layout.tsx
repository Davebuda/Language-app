import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'NorskCoach',
  description:
    'A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes them with targeted practice.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
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
    <html lang="en" className={`dark ${outfit.variable}`}>
      <body className="font-display antialiased" style={{ backgroundColor: '#0c0d14' }}>
        {children}
      </body>
    </html>
  )
}
