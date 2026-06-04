export function parseCookies(headerValue: string | undefined): Record<string, string> {
  if (!headerValue) {
    return {};
  }

  return Object.fromEntries(
    headerValue.split(";").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, decodeURIComponent(rest.join("=") ?? "")];
    })
  );
}

export function buildCookie(name: string, value: string, options: { httpOnly?: boolean; maxAgeSeconds?: number; secure?: boolean }): string {
  const segments = [`${name}=${encodeURIComponent(value)}`, "Path=/", "SameSite=Lax"];

  if (options.httpOnly) {
    segments.push("HttpOnly");
  }

  if (options.secure) {
    segments.push("Secure");
  }

  if (typeof options.maxAgeSeconds === "number") {
    segments.push(`Max-Age=${options.maxAgeSeconds}`);
  }

  return segments.join("; ");
}

export function clearCookie(name: string): string {
  return `${name}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`;
}

export function redirectResponse(location: string, headers: HeadersInit = {}): Response {
  return new Response(null, {
    status: 303,
    headers: {
      Location: location,
      ...headers
    }
  });
}
