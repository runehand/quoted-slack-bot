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

  const linked = currentUser && currentUser.slackTeamId === slackTeamId && currentUser.slackUserId === slackUserId;

  return (
    <main className="app-shell">
      <section className="panel card stack">
        <div>
          <h1>Connect your Qwoted account</h1>
          <p className="muted">
            Link Slack user <code>{slackTeamId || "unknown"}</code> / <code>{slackUserId || "unknown"}</code> to a Qwoted account.
          </p>
        </div>

        {currentUser ? (
          <div className="notice good">
            Signed in as <strong>{currentUser.name}</strong> ({currentUser.email}).
          </div>
        ) : (
          <div className="notice">
            You are not signed in. <a href={authLink}>Go to sign in</a>.
          </div>
        )}
        {linked ? <div className="notice good">This Slack identity is already linked.</div> : null}
        {error ? <div className="notice bad">{error}</div> : null}
        {success ? <div className="notice good">{success}</div> : null}

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

        <div className="muted">
          After linking, return to Slack and run <code>/quoted</code> again.
        </div>
      </section>
    </main>
  );
}
