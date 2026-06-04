import { handleApiRoute } from "../../../src/slack";

export const dynamic = "force-dynamic";

async function proxy(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const body = request.method === "GET" ? undefined : await request.text();
  const headers = Object.fromEntries(request.headers.entries());
  return handleApiRoute(url.pathname, request.method, body, headers, url.searchParams);
}

export async function GET(request: Request): Promise<Response> {
  return proxy(request);
}

export async function POST(request: Request): Promise<Response> {
  return proxy(request);
}
