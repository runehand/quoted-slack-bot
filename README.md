# Qwoted Slack Bot Demo

This project is a minimal Slack bot for the Qwoted newsroom workflow. It is intentionally small:

- `/quoted` slash command
- Linked-user auth check
- `Call for Experts` and `Call for Products` modals
- Demo confirmation messages
- Demo request links
- Demo notification messages
- Mock API data
- Vercel-ready API routes

## What This Demo Does

The bot follows the simplified flow from the interviews:

1. User runs `/quoted`
2. Bot checks whether the Slack user is linked to a Qwoted account
3. If linked, bot shows two buttons:
   - `Call for Experts`
   - `Call for Products`
4. Bot opens a modal with a structured form
5. On submit, bot sends a confirmation message and a demo request link
6. Bot sends a demo notification message in Slack

If the user is not linked, the bot shows a `Connect Qwoted Account` button instead.

## Tech Stack

- Node.js 20+
- TypeScript
- AWS Lambda HTTP API handler
- Slack Web API
- Seeded mock data for users and posts

## Project Files

- `src/index.ts` exports the Lambda handler
- `src/slack.ts` contains Slack routing and modal logic
- `src/demo-data.ts` serves seeded users and posts plus demo copy
- `src/config.ts` loads environment variables and mock linked users
- `src/data/mock-users.json` contains the default auth demo mapping
- `src/data/mock-data.json` contains 5 demo users and 10 demo posts
- `api/` contains the Vercel route handlers

## Setup

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` into your Lambda environment variables or a local `.env` file.

Required values:

- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`

Optional values:

- `DEMO_REQUEST_BASE_URL`
- `DEMO_CONNECT_URL`
- `MOCK_LINKED_USERS_JSON`

### 3. Build

```bash
npm run build
```

This creates the Lambda bundle in `dist/`.

## Slack App Setup

Create a Slack app and add these features:

### Slash Command

- Command: `/quoted`
- Request URL: `https://YOUR_API_DOMAIN/slack/commands`

### Interactivity

- Enable interactivity
- Request URL: `https://YOUR_API_DOMAIN/slack/interactions`

### OAuth Scopes

Add these bot scopes:

- `commands`
- `chat:write`
- `im:write`

### Install App

Install the app to your workspace and copy the bot token and signing secret into Lambda.

## Vercel Deployment

Deploy the repo as a Vercel project. Vercel will use the files in `api/` as serverless routes.

The root URL now serves a status page from `index.html`, so `https://YOUR_PROJECT.vercel.app/` should show a live dashboard instead of a 404.
The same dashboard is also available at `https://YOUR_PROJECT.vercel.app/status`.

### Route URLs

Use these endpoints in Slack and for testing:

- `GET /api/health`
- `GET /api/users`
- `GET /api/posts`
- `GET /api/mock-data`
- `POST /api/slack/commands`
- `POST /api/slack/interactions`
- `POST /api/demo-notification`

### Deploy steps

1. Push the repo to GitHub.
2. Import the repo into Vercel.
3. Set the environment variables:
   - `SLACK_BOT_TOKEN`
   - `SLACK_SIGNING_SECRET`
   - `DEMO_REQUEST_BASE_URL`
   - `DEMO_CONNECT_URL`
   - `MOCK_LINKED_USERS_JSON` if you want to override the default mapping
4. Deploy.
5. Copy the Vercel URLs into your Slack app:
   - Slash command request URL: `https://YOUR_PROJECT.vercel.app/api/slack/commands`
   - Interactivity request URL: `https://YOUR_PROJECT.vercel.app/api/slack/interactions`

## Demo Auth Mapping

The bot checks whether a Slack user is linked before showing the main menu.

Default demo mapping:

```json
{
  "slack_team_id": "T123",
  "slack_user_id": "U456",
  "qwoted_user_id": "demo-user-001",
  "email": "reporter@example.com"
}
```

You can replace it with `MOCK_LINKED_USERS_JSON` if you want another test user.

## Mock Data

The bot uses seeded mock data and deterministic copy for the confirmation and notification messages.

## Demo API

The app exposes simple JSON endpoints for testing the mock data without Slack.

### Request

```bash
curl https://YOUR_PROJECT.vercel.app/api/mock-data
```

### Response

```json
{
  "users": [],
  "posts": []
}
```

## Local Verification

Run a build to verify the TypeScript compiles:

```bash
npm run build
```

If you want to test locally on Vercel, run:

```bash
vercel dev
```

## Scope Notes

This demo does not include:

- full account creation
- real Qwoted API integration
- full in-Slack pitch replies
- story ideas

It is intentionally focused on the authenticated slash-command workflow and the two launch actions discussed in the interviews.
