import { handleApiRoute } from "../src/slack";

export async function sendVercelRoute(request: Request, route: string): Promise<Response> {
  const headers = Object.fromEntries(request.headers.entries());
  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.text();
  const result = await handleApiRoute(route, method, body, headers);

  return new Response(result.body, {
    status: result.statusCode,
    headers: result.headers
  });
}
