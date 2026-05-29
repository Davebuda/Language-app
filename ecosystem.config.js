/**
 * PM2 process config for NorskCoach (Next.js 15, `next start`).
 *
 * Deploy/runbook: deploy/README.md. The app listens on 127.0.0.1:3000 only —
 * Nginx (deploy/nginx/pandoai.no.conf) terminates TLS and reverse-proxies to it.
 * Node is NEVER exposed on 80/443 directly.
 *
 * Secrets are NOT stored here. Set them in /etc/environment (system-wide) or a
 * PM2 env file on the server (e.g. `pm2 start ecosystem.config.js --env production`
 * after exporting them). Never commit real keys.
 *
 *   pm2 start ecosystem.config.js
 *   pm2 reload norskcoach        # zero-downtime reload after a deploy
 *   pm2 logs norskcoach
 *   pm2 save                     # persist across reboots (with `pm2 startup`)
 */
module.exports = {
  apps: [
    {
      name: 'norskcoach',
      cwd: '/var/www/norskcoach',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 127.0.0.1',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      // Bind to loopback only; Nginx is the public edge.
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOST: '127.0.0.1',
        // App secrets (SUPABASE/AZURE/ANTHROPIC/etc.) come from /etc/environment
        // or the shell that launches pm2 — intentionally not listed here.
      },
      out_file: '/var/log/norskcoach/out.log',
      error_file: '/var/log/norskcoach/error.log',
      merge_logs: true,
      time: true,
    },
  ],
}
