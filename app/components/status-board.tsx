"use client";

import { useEffect, useMemo, useState } from "react";

type ApiInfo = {
  endpoints?: Record<string, string>;
};

type MockData = {
  users?: Array<{ id: string }>;
  posts?: Array<{ id: string }>;
};

type StatusState = {
  ready: boolean;
  healthText: string;
  healthTone: "good" | "warn" | "bad";
  usersText: string;
  postsText: string;
  usersTone: "good" | "warn" | "bad";
  postsTone: "good" | "warn" | "bad";
  checkedAt: string;
  deployment: string;
  apiRoot?: ApiInfo;
  error?: string;
};

function toneClass(tone: StatusState["healthTone"]) {
  return tone;
}

export function StatusBoard() {
  const [state, setState] = useState<StatusState>({
    ready: false,
    healthText: "Checking...",
    healthTone: "warn",
    usersText: "Checking...",
    postsText: "Checking...",
    usersTone: "warn",
    postsTone: "warn",
    checkedAt: "Loading...",
    deployment: "Loading..."
  });

  const appBase = useMemo(() => (typeof window !== "undefined" ? window.location.hostname || "Local preview" : "Loading..."), []);

  useEffect(() => {
    let active = true;

    async function fetchJson<T>(url: string): Promise<T> {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`${url} -> ${response.status}`);
      }
      return response.json() as Promise<T>;
    }

    async function refresh() {
      try {
        const [health, mockData, apiRoot] = await Promise.all([
          fetchJson<{ ok: boolean }>("/api/health"),
          fetchJson<MockData>("/api/mock-data"),
          fetchJson<ApiInfo>("/api")
        ]);

        if (!active) {
          return;
        }

        const userCount = mockData.users?.length ?? 0;
        const postCount = mockData.posts?.length ?? 0;

        setState({
          ready: true,
          healthText: health.ok ? "Healthy" : "Unhealthy",
          healthTone: health.ok ? "good" : "bad",
          usersText: `${userCount} users`,
          postsText: `${postCount} posts`,
          usersTone: "good",
          postsTone: "good",
          checkedAt: new Date().toLocaleString(),
          deployment: appBase,
          apiRoot
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          ready: false,
          healthText: "Unavailable",
          healthTone: "bad",
          usersText: "Unavailable",
          postsText: "Unavailable",
          usersTone: "bad",
          postsTone: "bad",
          checkedAt: new Date().toLocaleString(),
          deployment: appBase,
          error: error instanceof Error ? error.message : "Unable to load API data."
        });
      }
    }

    void refresh();
    const interval = window.setInterval(refresh, 15000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [appBase]);

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="panel card stack">
          <div className="pill-row">
            <span className="pill">
              <span className={`dot ${toneClass(state.healthTone)}`} />
              <span>{state.ready ? "Deployment healthy" : "Checking status..."}</span>
            </span>
            <a className="pill" href="/api">
              API root
            </a>
            <a className="pill" href="/api/mock-data">
              Mock data JSON
            </a>
            <a className="pill" href="/auth">
              Sign in
            </a>
          </div>
          <h1>Qwoted Slack Bot Demo</h1>
          <p className="muted">
            This dashboard confirms the deployment is alive and the API route behind the Slack demo is responding.
          </p>
          <div className="muted">
            Slack command endpoint: <code>/api/slack/commands</code>
            <br />
            Slack interactivity endpoint: <code>/api/slack/interactions</code>
          </div>
        </div>

        <div className="panel card stack">
          <div>
            <p className="eyebrow">Deployment</p>
            <h2>{state.deployment}</h2>
          </div>
          <div>
            <p className="eyebrow">Last check</p>
            <p>{state.checkedAt}</p>
          </div>
          {state.error ? <div className="notice bad">{state.error}</div> : null}
        </div>
      </section>

      <section className="grid three" style={{ marginTop: 18 }}>
        <article className="panel card">
          <p className="eyebrow">Health</p>
          <h2 className={state.healthTone}>{state.healthText}</h2>
        </article>
        <article className="panel card">
          <p className="eyebrow">Registered Users</p>
          <h2 className={state.usersTone}>{state.usersText}</h2>
        </article>
        <article className="panel card">
          <p className="eyebrow">Demo Posts</p>
          <h2 className={state.postsTone}>{state.postsText}</h2>
        </article>
      </section>

      <section className="panel card stack" style={{ marginTop: 18 }}>
        <h2>API routes</h2>
        <table>
          <thead>
            <tr>
              <th>Route</th>
              <th>Purpose</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>/api/health</code>
              </td>
              <td>Health check</td>
              <td>Returns <code>{"{ \"ok\": true }"}</code></td>
            </tr>
            <tr>
              <td>
                <code>/api/mock-data</code>
              </td>
              <td>Registered users and seeded posts</td>
              <td>Returns Mongo-backed users and 10 posts</td>
            </tr>
            <tr>
              <td>
                <code>/api/slack/commands</code>
              </td>
              <td>Slash command webhook</td>
              <td>Slack POST target for <code>/quoted</code></td>
            </tr>
            <tr>
              <td>
                <code>/api/slack/interactions</code>
              </td>
              <td>Button and modal webhook</td>
              <td>Slack POST target for interactivity</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
