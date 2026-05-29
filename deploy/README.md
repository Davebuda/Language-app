# Deploy runbook — NorskCoach → pandoai.no (Hetzner VPS)

Architecture: **Nginx (TLS edge) → PM2 → `next start` on 127.0.0.1:3000.** Node is never
exposed publicly. Corpus text ships in the build; audio is synced separately.

## ⚠️ Before the FIRST production deploy — USER-GATED steps

These cannot be automated safely and must be done by a human:

1. **Rotate the Supabase keys.** Old keys are in git history. In the Supabase dashboard:
   roll the `anon` + `service_role` keys, then update them in the server env (step 3 below)
   and `.env.local` locally. Do this BEFORE the app is publicly reachable.
2. **Provision the VPS** (Ubuntu): `node 20`, `npm i -g pm2`, `nginx`, `certbot` +
   `python3-certbot-nginx`. Create `/var/www/norskcoach`, `/var/log/norskcoach`,
   `/var/www/certbot`.
3. **Set server env** in `/etc/environment` (system-wide) — never commit these:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `AZURE_*`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_APP_URL=https://pandoai.no`.
4. **DNS**: point `pandoai.no` (+ `www`) A/AAAA records at the VPS IP.

## First-time setup (on the VPS)

```bash
git clone https://github.com/Davebuda/Language-app /var/www/norskcoach
cd /var/www/norskcoach && npm ci && npm run build
pm2 start ecosystem.config.js && pm2 save && pm2 startup   # follow printed instructions
sudo cp deploy/nginx/pandoai.no.conf /etc/nginx/sites-available/pandoai.no
sudo ln -s /etc/nginx/sites-available/pandoai.no /etc/nginx/sites-enabled/
sudo certbot --nginx -d pandoai.no -d www.pandoai.no
sudo nginx -t && sudo systemctl reload nginx
```

## Audio (gitignored — ships outside git)

`public/audio/sentences/*.mp3` is in `.gitignore`. Sync it from your local checkout
(generated via `node scripts/generate-audio.mjs`) after each content release:

```bash
rsync -avz --ignore-existing public/audio/sentences/ \
  root@<vps-ip>:/var/www/norskcoach/public/audio/sentences/
```

(Or front audio with Cloudflare R2 / a CDN at scale — see the scout cost brief.)

## Routine deploys

- **Manual:** `ssh root@<vps-ip> 'cd /var/www/norskcoach && ./deploy/deploy.sh'`
- **CI/CD:** push to `main` → `.github/workflows/deploy.yml` runs build-check then SSH-deploys,
  **once** the `VPS_HOST` / `VPS_USER` / `VPS_SSH_KEY` repo secrets are set (it self-skips until then).

## Pre-deploy checklist (every release)

- [ ] `npm run build` green locally
- [ ] `npm run audit:corpus` → 0 ERRORS
- [ ] `npx tsc --noEmit` clean
- [ ] New audio synced (or it will 404 for new sentences)
