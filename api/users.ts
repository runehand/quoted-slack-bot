import { getDemoUsers } from "../src/demo-data";

export function GET(): Response {
  return Response.json({ users: getDemoUsers() });
}
