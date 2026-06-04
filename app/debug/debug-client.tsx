"use client";

import { useEffect, useMemo, useState } from "react";

type LogItem = {
  id: string;
  action: string;
  source: string;
  actorUserId: string | null;
  actorEmail: string | null;
  slackTeamId: string | null;
  slackUserId: string | null;
  status: "ok" | "error";
  summary: string;
  details: Record<string, unknown>;
  createdAt: string;
};

type ApiResponse = {
  logs: LogItem[];
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(date);
}

export function DebugClient() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);

  const filteredLogs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return logs;
    }

    return logs.filter((log) => {
      return [log.action, log.source, log.summary, log.actorEmail ?? "", log.slackTeamId ?? "", log.slackUserId ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [logs, query]);

  useEffect(() => {
    let active = true;

    async function loadLogs() {
      try {
        setLoading(true);
        const response = await fetch("/api/logs?limit=100", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load logs (${response.status})`);
        }

        const data = (await response.json()) as ApiResponse;
        if (active) {
          setLogs(data.logs ?? []);
          setError(null);
        }
      } catch (error) {
        if (active) {
          setError(error instanceof Error ? error.message : "Unable to load logs.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadLogs();
    return () => {
      active = false;
    };
  }, [refreshIndex]);

  const totals = useMemo(() => {
    const ok = logs.filter((log) => log.status === "ok").length;
    const errorCount = logs.filter((log) => log.status === "error").length;
    const slackCount = logs.filter((log) => log.source === "slack").length;
    const webCount = logs.filter((log) => log.source === "web").length;
    return { ok, errorCount, slackCount, webCount };
  }, [logs]);

  return (
    <main className="app-shell stack">
      <section className="hero">
        <div className="panel card stack">
          <div className="pill-row">
            <button type="button" onClick={() => setRefreshIndex((value) => value + 1)}>
              Refresh
            </button>
            <a className="pill" href="/">
              Status page
            </a>
            <a className="pill" href="/auth">
              Auth
            </a>
            <a className="pill" href="/connect">
              Connect
            </a>
          </div>
          <h1>Debug dashboard</h1>
          <p className="muted">
            This page shows Mongo-backed action logs for Slack interactions, auth events, and Slack linking.
          </p>
          <label>
            Filter logs
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search action, email, team, summary..." />
          </label>
        </div>

        <div className="grid two">
          <article className="panel card">
            <p className="eyebrow">Total logs</p>
            <h2>{logs.length}</h2>
          </article>
          <article className="panel card">
            <p className="eyebrow">Visible logs</p>
            <h2>{filteredLogs.length}</h2>
          </article>
          <article className="panel card">
            <p className="eyebrow">OK</p>
            <h2 className="good">{totals.ok}</h2>
          </article>
          <article className="panel card">
            <p className="eyebrow">Errors</p>
            <h2 className="bad">{totals.errorCount}</h2>
          </article>
        </div>
      </section>

      <section className="panel card stack">
        <div className="grid two">
          <article className="notice">
            <strong>Slack actions</strong>
            <div className="muted">{totals.slackCount} logs</div>
          </article>
          <article className="notice">
            <strong>Web actions</strong>
            <div className="muted">{totals.webCount} logs</div>
          </article>
        </div>

        {loading ? <div className="notice">Loading logs...</div> : null}
        {error ? <div className="notice bad">{error}</div> : null}

        <div className="stack">
          {filteredLogs.map((log) => (
            <article key={log.id} className="notice" style={{ borderColor: log.status === "error" ? "rgba(248, 113, 113, 0.45)" : undefined }}>
              <div className="pill-row" style={{ marginTop: 0 }}>
                <span className={`pill ${log.status === "error" ? "bad" : "good"}`}>{log.status.toUpperCase()}</span>
                <span className="pill">{log.source}</span>
                <span className="pill">{log.action}</span>
              </div>
              <h2 style={{ marginTop: 12 }}>{log.summary}</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                {formatDateTime(log.createdAt)}
              </p>
              <div className="grid two">
                <div className="muted">
                  <strong>Actor</strong>
                  <div>{log.actorEmail ?? log.actorUserId ?? "—"}</div>
                </div>
                <div className="muted">
                  <strong>Slack identity</strong>
                  <div>
                    {log.slackTeamId ?? "—"} / {log.slackUserId ?? "—"}
                  </div>
                </div>
              </div>
              <details style={{ marginTop: 12 }}>
                <summary>Details</summary>
                <pre style={{ whiteSpace: "pre-wrap", margin: "12px 0 0" }}>{JSON.stringify(log.details, null, 2)}</pre>
              </details>
            </article>
          ))}
          {!loading && filteredLogs.length === 0 ? <div className="notice">No matching logs.</div> : null}
        </div>
      </section>
    </main>
  );
}
