import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { handleApiRoute } from "./slack";

function normalizeHeaders(
  headers: APIGatewayProxyEventV2["headers"] | undefined
): Record<string, string | undefined> {
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    normalized[key.toLowerCase()] = value;
  }

  return normalized;
}

function getRoute(event: APIGatewayProxyEventV2): string {
  return event.rawPath || "/";
}

function getMethod(event: APIGatewayProxyEventV2): string {
  return event.requestContext.http.method.toUpperCase();
}

function decodeBody(event: APIGatewayProxyEventV2): string | undefined {
  if (!event.body) {
    return undefined;
  }

  return event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const response = await handleApiRoute(getRoute(event), getMethod(event), decodeBody(event), normalizeHeaders(event.headers));

  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: response.body
  };
}
