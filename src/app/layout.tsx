import type { Metadata } from 'next'
import { ClientAILoader } from '@/components/ai/ClientAILoader'
import './globals.css'

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
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <ClientAILoader />
      </body>
    </html>
  )
}
