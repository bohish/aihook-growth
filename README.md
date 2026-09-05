# AiHook

AiHook is a TikTok account analysis app deployed from GitHub to Railway with a
self-owned Supabase backend.

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
   - Local: `http://127.0.0.1:8080/api/public/tiktok/callback`
5. Submit the app for TikTok review — unaudited apps only work for accounts
   added as testers in the developer portal.

### 2. Configure secrets
Add these in the Railway service variables (never in code or `.env`):

| Secret | Purpose |
| --- | --- |
| `TIKTOK_CLIENT_KEY` | OAuth client key from the TikTok app |
| `TIKTOK_CLIENT_SECRET` | OAuth client secret (server-only) |
| `TIKTOK_TOKEN_ENC_KEY` | Already generated — encrypts stored tokens (AES-256-GCM) |

Set the self-owned Supabase variables in Railway: `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and their
`VITE_` equivalents used by the browser.

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
