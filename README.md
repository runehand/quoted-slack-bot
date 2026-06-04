# Qwoted Slack Bot Demo

This repo now runs as a Next.js app on Vercel.

What it includes:

- `/quoted` Slack command
- MongoDB-backed signup, sign-in, and Slack linking
- product-style website pages for status, auth, connect, and posts
- MongoDB-backed action logs and a debug dashboard
- one Vercel API route for all backend endpoints
- live post matching against MongoDB data

## Architecture

The app uses a single serverless function at `app/api/[[...slug]]/route.ts`.

That one route handles:

- `/api/health`
- `/api/me`
- `/api/auth/register`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/link-slack`
- `/api/slack/commands`
- `/api/slack/interactions`
- `/api/demo-notification`
- `/api/users`
- `/api/posts`
- `/api/catalog`
- `/api/mock-data`
- `/api/logs`
- `/api`

The pages at `/`, `/status`, `/auth`, `/connect`, `/posts`, and `/debug` are normal Next.js pages.

## Flow

1. User runs `/quoted`
2. Bot checks whether the Slack identity is linked in MongoDB
3. If linked, the bot shows `Call for Experts` and `Call for Products`
4. If not linked, the bot shows `Connect Qwoted Account`
5. The connect page sends the user to `/auth`
6. Sign up or sign in creates a MongoDB user session
7. The connect page links the Slack team/user IDs to that account
8. The posts page lets a signed-in user create live posts in MongoDB
9. The Slack bot opens the modal and matches against the live post catalog

## Environment Variables

Set these in Vercel:

- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `MONGODB_URI`
- `APP_BASE_URL`

Optional:

- `SESSION_COOKIE_NAME`
- `DEMO_REQUEST_BASE_URL`

## Local Development

```bash
npm install
npm run dev
```

Open:

- `http://localhost:3000/` for the status page
- `http://localhost:3000/auth`
- `http://localhost:3000/connect`
- `http://localhost:3000/posts`
- `http://localhost:3000/debug`

## Slack App Setup

Use these request URLs:

- Slash command: `https://YOUR_PROJECT.vercel.app/api/slack/commands`
- Interactivity: `https://YOUR_PROJECT.vercel.app/api/slack/interactions`

Bot scopes:

- `commands`
- `chat:write`
- `im:write`

## MongoDB

Users are stored in MongoDB with:

- email
- password hash
- Slack team ID
- Slack user ID
- Qwoted user ID

Sessions are also stored in MongoDB and expire automatically.

Action logs are stored in MongoDB and can be viewed at `/debug` or fetched from `/api/logs`.

## Demo Data

Posts are stored in MongoDB and created from the `/posts` page.

The bot returns deterministic confirmation text, but the matched candidate comes from live MongoDB post data.

## Deployment Notes

This project is designed for Vercel Hobby:

- one API route instead of many serverless functions
- static pages for the public UI
- MongoDB Atlas for persistence

If you want, I can next trim the code further into a smaller production-ready surface, but the current version is already the right deployment shape for Vercel Hobby.
