# MechaClips — clip submission site

Submission page for the [MechaClips](https://www.youtube.com/@mechaclipsreal) YouTube channel.
Viewers pick a game, drop an `.mp4` (up to 100 MB), and optionally leave a handle for the credit.

Runs on Cloudflare Workers (free tier); clips are stored in an R2 bucket.

## Run locally

```bash
npm install
npm run dev      # http://localhost:8787 (local R2 simulation, no account needed)
```

- Submissions page: `/`
- Review submissions (channel owner only): `/admin?key=ADMIN_KEY`
- Local dev admin key lives in `.dev.vars` (git-ignored)

## Deploy

```bash
npx wrangler login                                   # one-time Cloudflare auth
npx wrangler r2 bucket create mechaclips-clips        # one-time bucket setup
npx wrangler secret put ADMIN_KEY                     # set the production admin key
npm run deploy
```
