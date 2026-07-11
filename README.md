# MechaClips — clip submission site

Submission page for the [MechaClips](https://www.youtube.com/@mechaclipsreal) YouTube channel.
Viewers pick a game, drop an `.mp4` (up to 200 MB), and optionally leave a handle for the credit.

## Run locally

```bash
npm install
npm start        # http://localhost:4321
```

- Submissions page: `/`
- Review submissions (for the channel owner): `/admin`
- Uploaded clips land in `uploads/`, metadata in `submissions.json` (both git-ignored)

## Deploy

This app needs a Node server with disk storage, so GitHub Pages won't work.
The included `render.yaml` deploys it on [Render](https://render.com) — connect this
repo in the Render dashboard and it picks up the config automatically.
