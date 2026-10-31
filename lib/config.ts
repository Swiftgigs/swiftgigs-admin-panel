export const TOKEN_COOKIE = "sg_admin_token";

// Base URL of swiftgigs-backend including the API version prefix.
export const BACKEND_API_URL = (process.env.BACKEND_API_URL || "http://localhost:3000/api/v1").replace(/\/+$/, "");

export const tokenCookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: maxAgeSeconds,
});

// The backend issues 24h tokens by default (ADMIN_JWT_EXPIRES_IN_SECONDS).
export const TOKEN_MAX_AGE_SECONDS = Number(process.env.ADMIN_SESSION_SECONDS) || 60 * 60 * 24;
