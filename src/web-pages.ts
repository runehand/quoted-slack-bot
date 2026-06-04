import { LinkedUser, RegisteredUser } from "./types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pageShell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0b1020;
        --panel: rgba(16, 24, 40, 0.88);
        --panel-border: rgba(148, 163, 184, 0.18);
        --text: #e5eefc;
        --muted: #94a3b8;
        --accent: #7dd3fc;
        --good: #34d399;
        --bad: #f87171;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--text);
        background: linear-gradient(180deg, #0b1020 0%, #090d18 100%);
      }
      .shell { max-width: 960px; margin: 0 auto; padding: 36px 20px 56px; }
      .panel {
        background: var(--panel);
        border: 1px solid var(--panel-border);
        border-radius: 20px;
        padding: 24px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
      }
      h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 3rem); line-height: 1; }
      p { color: var(--muted); line-height: 1.6; }
      form { display: grid; gap: 12px; margin-top: 18px; }
      label { display: grid; gap: 6px; font-size: 0.95rem; color: var(--text); }
      input {
        width: 100%;
        padding: 12px 14px;
        border-radius: 12px;
        border: 1px solid var(--panel-border);
        background: rgba(255, 255, 255, 0.04);
        color: var(--text);
      }
      button {
        width: fit-content;
        padding: 12px 16px;
        border: 0;
        border-radius: 12px;
        background: var(--accent);
        color: #08111f;
        font-weight: 700;
        cursor: pointer;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }
      .muted { color: var(--muted); }
      .good { color: var(--good); }
      .bad { color: var(--bad); }
      .notice {
        padding: 12px 14px;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--panel-border);
        margin-top: 12px;
      }
      .stack { display: grid; gap: 18px; }
      a { color: var(--accent); }
      @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main class="shell">
      ${body}
    </main>
  </body>
</html>`;
}

export function renderAuthPage(options: { next: string; currentUser?: RegisteredUser | null; error?: string; success?: string }): string {
  const currentUserBlock = options.currentUser
    ? `<div class="notice good">Signed in as <strong>${escapeHtml(options.currentUser.name)}</strong> (${escapeHtml(options.currentUser.email)}). <a href="${escapeHtml(options.next)}">Continue to connect</a>.</div>`
    : "";
  const errorBlock = options.error ? `<div class="notice bad">${escapeHtml(options.error)}</div>` : "";
  const successBlock = options.success ? `<div class="notice good">${escapeHtml(options.success)}</div>` : "";

  return pageShell(
    "Qwoted Auth",
    `<div class="panel stack">
      <div>
        <h1>Qwoted account access</h1>
        <p>Sign up or sign in, then connect your Slack account from the connect page.</p>
        ${currentUserBlock}
        ${errorBlock}
        ${successBlock}
      </div>
      <div class="grid">
        <form method="post" action="/api/auth/register">
          <h2>Sign up</h2>
          <label>Name<input name="name" required /></label>
          <label>Email<input name="email" type="email" required /></label>
          <label>Password<input name="password" type="password" required /></label>
          <input type="hidden" name="next" value="${escapeHtml(options.next)}" />
          <button type="submit">Create account</button>
        </form>
        <form method="post" action="/api/auth/login">
          <h2>Sign in</h2>
          <label>Email<input name="email" type="email" required /></label>
          <label>Password<input name="password" type="password" required /></label>
          <input type="hidden" name="next" value="${escapeHtml(options.next)}" />
          <button type="submit">Sign in</button>
        </form>
      </div>
    </div>`
  );
}

export function renderConnectPage(options: {
  next: string;
  slackTeamId: string;
  slackUserId: string;
  currentUser?: RegisteredUser | null;
  linkedUser?: Pick<LinkedUser, "name" | "email"> | null;
  error?: string;
  success?: string;
}): string {
  const loginLink = `/auth?next=${encodeURIComponent(options.next)}`;
  const linkForm =
    options.currentUser && !options.linkedUser && options.slackTeamId && options.slackUserId
      ? `<form method="post" action="/api/link-slack">
          <input type="hidden" name="slackTeamId" value="${escapeHtml(options.slackTeamId)}" />
          <input type="hidden" name="slackUserId" value="${escapeHtml(options.slackUserId)}" />
          <input type="hidden" name="next" value="${escapeHtml(options.next)}" />
          <button type="submit">Link Slack account</button>
        </form>`
      : "";
  const missingSlackIdentity =
    options.currentUser && !options.linkedUser && (!options.slackTeamId || !options.slackUserId)
      ? `<div class="notice">Open this page from Slack by running <code>/quoted</code> so we can capture the Slack team and user IDs.</div>`
      : "";
  const currentStatus = options.currentUser
    ? `<div class="notice good">Signed in as <strong>${options.currentUser.name}</strong> (${options.currentUser.email}).</div>`
    : `<div class="notice">You are not signed in. <a href="${loginLink}">Go to sign in</a>.</div>`;
  const linkedStatus = options.linkedUser
    ? `<div class="notice good">This Slack identity is already linked to <strong>${options.linkedUser.name}</strong> (${options.linkedUser.email}).</div>`
    : "";
  const errorBlock = options.error ? `<div class="notice bad">${escapeHtml(options.error)}</div>` : "";
  const successBlock = options.success ? `<div class="notice good">${escapeHtml(options.success)}</div>` : "";

  return pageShell(
    "Connect Qwoted",
    `<div class="panel stack">
      <div>
        <h1>Connect your Qwoted account</h1>
        <p>Link Slack user <code>${options.slackTeamId}</code> / <code>${options.slackUserId}</code> to the signed-in Qwoted account.</p>
        ${currentStatus}
        ${linkedStatus}
        ${missingSlackIdentity}
        ${errorBlock}
        ${successBlock}
      </div>
      <div class="stack">
        ${linkForm}
        <p class="muted">If you already linked this account, return to Slack and run <code>/quoted</code> again.</p>
      </div>
    </div>`
  );
}
