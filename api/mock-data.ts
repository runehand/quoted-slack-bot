import { buildMockApiResponse } from "../src/demo-data";

export function GET(): Response {
  return Response.json(buildMockApiResponse());
}
