import { getDemoPosts } from "../src/demo-data";

export function GET(): Response {
  return Response.json({ posts: getDemoPosts() });
}
