"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type User = {
  id: string;
  email: string;
  name: string;
  slackTeamId: string | null;
  slackUserId: string | null;
};

export function ConnectClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const slackTeamId = searchParams.get("slack_team_id") ?? "";
  const slackUserId = searchParams.get("slack_user_id") ?? "";
  const error = searchParams.get("error");
  const success = searchParams.get("success");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const currentConnectUrl = useMemo(() => {
    const url = new URL(pathname, "https://demo.local");
    if (slackTeamId) {
      url.searchParams.set("slack_team_id", slackTeamId);
    }
    if (slackUserId) {
      url.searchParams.set("slack_user_id", slackUserId);
    }
    return `${url.pathname}${url.search}`;
  }, [pathname, slackTeamId, slackUserId]);

  const authLink = `/auth?next=${encodeURIComponent(currentConnectUrl)}`;

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const response = await fetch("/api/me", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { user?: User | null };
      if (active) {
        setCurrentUser(data.user ?? null);
      }
    }

    void loadUser();
    return () => {
      active = false;
    };
  }, []);

  const linked = Boolean(currentUser && currentUser.slackTeamId === slackTeamId && currentUser.slackUserId === slackUserId);

  return (
    <main className="app-shell stack">
      <section className="hero">
        <div className="panel card stack">
          <div className="pill-row">
            <a className="pill" href="/">
              Status
            </a>
            <a className="pill" href="/posts">
              Posts
            </a>
            <a className="pill" href="/debug">
              Debug
            </a>
          </div>
          <p className="eyebrow">Slack linking</p>
          <h1>Connect a Qwoted account to this Slack identity</h1>
          <p className="muted">
            The bot uses this link to validate the user before showing the request workflow.
          </p>

          <div className="grid two">
            <article className="notice">
              <strong>Slack team</strong>
              <div className="muted">{slackTeamId || "Missing from request"}</div>
            </article>
            <article className="notice">
              <strong>Slack user</strong>
              <div className="muted">{slackUserId || "Missing from request"}</div>
            </article>
          </div>

          {error ? <div className="notice bad">{error}</div> : null}
          {success ? <div className="notice good">{success}</div> : null}
        </div>

        <div className="panel card stack">
          <p className="eyebrow">Current session</p>
          {currentUser ? (
            <>
              <h2>{currentUser.name}</h2>
              <p className="muted">{currentUser.email}</p>
              <div className="notice good">{linked ? "This Slack identity is already linked." : "Ready to link this Slack identity."}</div>
            </>
          ) : (
            <>
              <h2>Sign in first</h2>
              <p className="muted">You need an active Qwoted session before linking Slack.</p>
              <a className="pill" href={authLink}>
                Go to sign in
              </a>
            </>
          )}
        </div>
      </section>

      <section className="panel card stack">
        <div className="grid two">
          <div>
            <p className="eyebrow">Link status</p>
            <h2>Identity binding</h2>
          </div>
          <div className="muted">This is the validation gate before `/quoted` opens the menu.</div>
        </div>

        {currentUser && !linked && slackTeamId && slackUserId ? (
          <form method="post" action="/api/link-slack">
            <input type="hidden" name="slackTeamId" value={slackTeamId} />
            <input type="hidden" name="slackUserId" value={slackUserId} />
            <input type="hidden" name="next" value={currentConnectUrl} />
            <button type="submit">Link Slack account</button>
          </form>
        ) : null}

        {!slackTeamId || !slackUserId ? (
          <div className="notice">
            Open this page from Slack by running <code>/quoted</code> so the bot can capture the Slack team and user IDs.
          </div>
        ) : null}

        {currentUser && linked ? (
          <div className="notice good">
            Linked Qwoted account: <strong>{currentUser.name}</strong>. Return to Slack and run <code>/quoted</code> again.
          </div>
        ) : null}

        {!currentUser ? <div className="notice">Sign in to complete the linking flow.</div> : null}
      </section>
    </main>
  );
}
