import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ['@mlc-ai/web-llm'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },
}

export default nextConfig
