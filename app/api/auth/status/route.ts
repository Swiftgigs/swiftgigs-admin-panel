import { BACKEND_API_URL } from "@/lib/config";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_API_URL}/admin/setup-status`, { cache: "no-store" });
    const payload = await response.json();
    return Response.json({ reachable: true, hasAdmins: Boolean(payload.hasAdmins) });
  } catch {
    return Response.json({ reachable: false, hasAdmins: true });
  }
}
