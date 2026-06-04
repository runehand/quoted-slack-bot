import { sendVercelRoute } from "./_shared";

export default async function handler(request: Request): Promise<Response> {
  return sendVercelRoute(request, "/api/posts");
}
