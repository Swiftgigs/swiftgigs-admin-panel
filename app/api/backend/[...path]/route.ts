import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { BACKEND_API_URL, TOKEN_COOKIE } from "@/lib/config";

// Same-origin gateway to swiftgigs-backend. The JWT lives in an httpOnly cookie, so browser code never
// sees it; it is attached here. Only the route families the panel actually uses are forwardable.
const ALLOWED_PREFIXES = ["admin", "services", "customer-care"];
const BLOCKED_PATHS = new Set(["admin/login", "admin/bootstrap"]);
const PASSTHROUGH_HEADERS = ["content-type", "content-disposition", "cache-control"];

async function forward(request: NextRequest, ctx: RouteContext<"/api/backend/[...path]">) {
  const { path } = await ctx.params;
  const joined = path.join("/");
  if (!ALLOWED_PREFIXES.includes(path[0] ?? "") || BLOCKED_PATHS.has(joined) || path.some((segment) => segment === ".." || segment === ".")) {
    return Response.json({ success: false, message: "Not found." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  if (!token) return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  const contentType = request.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_API_URL}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
    });
  } catch {
    return Response.json({ success: false, message: "Cannot reach the Swiftgigs backend." }, { status: 502 });
  }

  // An expired/revoked token must also drop the cookie, otherwise proxy.ts keeps bouncing /login back to /.
  if (upstream.status === 401) cookieStore.delete(TOKEN_COOKIE);

  const responseHeaders = new Headers();
  for (const name of PASSTHROUGH_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  responseHeaders.set("cache-control", "no-store");
  return new Response(upstream.status === 204 ? null : upstream.body, { status: upstream.status, headers: responseHeaders });
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
