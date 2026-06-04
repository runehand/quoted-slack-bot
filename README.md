# Qwoted Slack Bot Demo

This project is a minimal Slack bot for the Qwoted newsroom workflow. It focuses on the first launch path from the interviews:

- `/quoted` slash command
- linked-user auth check
- `Call for Experts` and `Call for Products` modals
- demo confirmation and notification messages
- simple website signup/sign-in flow
- Slack account linking
- MongoDB-backed user storage
- Vercel-ready API routes

## What The Demo Does

1. User runs `/quoted`
2. Bot checks whether the Slack user is linked to a Qwoted account
3. If linked, bot shows:
   - `Call for Experts`
   - `Call for Products`
4. If not linked, bot shows `Connect Qwoted Account`
5. The connect page sends the user to a simple Qwoted signup/sign-in page
6. After sign-in, the user links their Slack identity to the Qwoted account
7. The bot then opens the modal, returns confirmation text, and posts a demo notification

## Tech Stack

- Node.js
- TypeScript
- Vercel API routes
- Slack Web API
- MongoDB Atlas

## Project Files

- `src/slack.ts` contains Slack command, interaction, and webhook logic
- `src/auth-store.ts` contains MongoDB user/session/link storage
- `src/web-pages.ts` renders the signup, sign-in, and connect pages
- `src/demo-data.ts` serves seeded demo posts and demo copy
- `src/config.ts` loads environment variables
- `src/data/mock-data.json` contains the 10 seeded demo posts
- `api/` contains the Vercel route handlers

## Environment Variables

Copy `.env.example` into your Vercel environment settings or a local `.env` file.

Required values:

- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `MONGODB_URI`
- `APP_BASE_URL`

Optional values:

- `SESSION_COOKIE_NAME`
- `DEMO_REQUEST_BASE_URL`

## Local Build

```bash
npm install
npm run build
```

## Slack App Setup

Create a Slack app and add these features:

### Slash Command

- Command: `/quoted`
- Request URL: `https://YOUR_PROJECT.vercel.app/api/slack/commands`

### Interactivity

- Enable interactivity
- Request URL: `https://YOUR_PROJECT.vercel.app/api/slack/interactions`

### OAuth Scopes

Add these bot scopes:

- `commands`
- `chat:write`
- `im:write`

Install the app, then copy:

- Bot User OAuth Token into `SLACK_BOT_TOKEN`
- Signing Secret into `SLACK_SIGNING_SECRET`

## Website Auth Flow

The demo includes a simple website flow:

- `GET /auth` shows sign-up and sign-in forms
- `POST /api/auth/register` creates a user in MongoDB and sets a session cookie
- `POST /api/auth/login` authenticates a user and sets a session cookie
- `GET /connect` shows the Slack link page
- `POST /api/link-slack` stores the Slack team/user IDs on the MongoDB user record

When a Slack user is not linked, `/quoted` shows the connect button. The connect page points the user to `/auth` and then back to `/connect`.

## Vercel Deployment

Deploy the repo as a Vercel project.

Set these environment variables in Vercel:

- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `MONGODB_URI`
- `APP_BASE_URL`
- `SESSION_COOKIE_NAME` if you want a custom cookie name
- `DEMO_REQUEST_BASE_URL` if you want a different request-link prefix

Use these URLs in Slack:

- Slash command request URL: `https://YOUR_PROJECT.vercel.app/api/slack/commands`
- Interactivity request URL: `https://YOUR_PROJECT.vercel.app/api/slack/interactions`

## Routes

Public pages:

- `GET /`
- `GET /status`
- `GET /auth`
- `GET /connect`

API routes:

- `GET /api/health`
- `GET /api`
- `GET /api/users`
- `GET /api/posts`
- `GET /api/mock-data`
- `GET /api/me`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/link-slack`
- `POST /api/slack/commands`
- `POST /api/slack/interactions`
- `POST /api/demo-notification`

## Demo Data

The demo posts are seeded in `src/data/mock-data.json`. User records now live in MongoDB.

## Not Included

This demo does not include:

- full Qwoted API integration
- AI chatbot behavior
- in-Slack pitch replies
- story ideas

It is intentionally focused on the authenticated slash-command workflow and the two launch actions discussed in the interviews.
