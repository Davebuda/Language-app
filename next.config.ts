import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  deploymentId: process.env.DEPLOYMENT_ID,
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ['@mlc-ai/web-llm'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },
}

export default nextConfig
