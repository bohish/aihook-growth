# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## TikTok integration setup (required before live OAuth)

The app analyses real TikTok accounts only — there is no demo/fallback dataset.
Until the credentials below exist, the connect screen shows an explicit
"التكامل غير مهيأ" state instead of any fabricated analysis.

### 1. Create a TikTok developer app
1. Go to https://developers.tiktok.com → Manage apps → create an app.
2. Add the **Login Kit** and **Display API** products.
3. Request these scopes (nothing more is used):
   - `user.info.basic`
   - `user.info.stats`
   - `video.list`
4. Register the redirect URI exactly:
   - Production: `https://<your-domain>/api/public/tiktok/callback`
   - Preview: `https://project--a5630791-0198-4227-8db7-69946144ad4d-dev.lovable.app/api/public/tiktok/callback`
5. Submit the app for TikTok review — unaudited apps only work for accounts
   added as testers in the developer portal.

### 2. Configure secrets
Add these in **Project Settings → Secrets** (never in code or `.env`):

| Secret | Purpose |
| --- | --- |
| `TIKTOK_CLIENT_KEY` | OAuth client key from the TikTok app |
| `TIKTOK_CLIENT_SECRET` | OAuth client secret (server-only) |
| `TIKTOK_TOKEN_ENC_KEY` | Already generated — encrypts stored tokens (AES-256-GCM) |

Backend Supabase variables (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`) are injected automatically.

### 3. How the flow works
- `startTikTokOAuth` (server fn, auth required) mints a signed `state`, sets it
  in an httpOnly cookie and returns the official TikTok authorize URL.
- `/api/public/tiktok/callback` verifies the signed state (CSRF), exchanges the
  code server-side, and stores the encrypted access/refresh tokens in
  `tiktok_connections` with the service role.
- `fetchTikTokAccountData` refreshes expired tokens automatically and returns
  only profile + own-video data. Tokens never reach the browser.

### API limitations (do not promise these features)
These scopes/endpoints do **not** expose: watch time, retention/completion
rate, traffic sources, follower demographics or identities, saves/favourites,
per-video reach breakdowns, or the raw video/audio (so on-camera detection,
editing style, and hook timing cannot be measured). Content features are
inferred only from caption text and duration, and unknown features are
excluded from the analysis rather than guessed.
