import { cookies } from "next/headers";
import { BACKEND_API_URL, TOKEN_COOKIE, TOKEN_MAX_AGE_SECONDS, tokenCookieOptions } from "@/lib/config";

// First-run only: creates the initial super admin. The backend rejects this once any admin exists.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  let response: Response;
  try {
    response = await fetch(`${BACKEND_API_URL}/admin/bootstrap`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: body.name, email: body.email, password: body.password, setupKey: body.setupKey }),
      cache: "no-store",
    });
  } catch {
    return Response.json({ success: false, message: "Cannot reach the Swiftgigs backend." }, { status: 502 });
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.token) {
    return Response.json({ success: false, message: payload.message || "Setup failed." }, { status: response.status || 500 });
  }

  (await cookies()).set(TOKEN_COOKIE, payload.token, tokenCookieOptions(TOKEN_MAX_AGE_SECONDS));
  return Response.json({ success: true, admin: payload.admin });
}
