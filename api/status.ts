import { getStatusHtml } from "../src/status-page";

export function GET(): Response {
  return new Response(getStatusHtml(), {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
