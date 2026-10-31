import { cookies } from "next/headers";
import { BACKEND_API_URL, TOKEN_COOKIE, TOKEN_MAX_AGE_SECONDS, tokenCookieOptions } from "@/lib/config";

async function forwardCredentials(path: string, body: unknown) {
  try {
    const response = await fetch(`${BACKEND_API_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    return { response, payload };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await forwardCredentials("/admin/login", { email: body.email, password: body.password });
  if (!result) return Response.json({ success: false, message: "Cannot reach the Swiftgigs backend." }, { status: 502 });

  const { response, payload } = result;
  if (!response.ok || !payload.token) {
    return Response.json(
      { success: false, message: payload.message || "Login failed." },
      { status: response.status === 401 ? 401 : response.status || 500 },
    );
  }

  (await cookies()).set(TOKEN_COOKIE, payload.token, tokenCookieOptions(TOKEN_MAX_AGE_SECONDS));
  return Response.json({ success: true, admin: payload.admin });
}
