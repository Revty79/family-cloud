import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { db } from "../db";
import * as schema from "../db/schema";
import { sendPasswordResetEmail } from "./email";

const configuredBaseUrl = process.env.BETTER_AUTH_URL?.trim() || undefined;
const baseUrl =
  configuredBaseUrl ||
  (process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000");
const authSecret =
  process.env.BETTER_AUTH_SECRET ??
  "family-cloud-dev-secret-change-in-production";

function parseTrustedOrigins(value: string | undefined) {
  if (!value) {
    return [];
  }

  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

const trustedOrigins = Array.from(
  new Set([
    ...(baseUrl ? [baseUrl] : []),
    ...parseTrustedOrigins(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
    ...parseTrustedOrigins(process.env.NEXT_PUBLIC_BETTER_AUTH_URL),
    ...parseTrustedOrigins(process.env.NEXT_PUBLIC_AUTH_URL),
  ]),
);

export const auth = betterAuth({
  appName: "Family Cloud",
  ...(baseUrl ? { baseURL: baseUrl } : {}),
  secret: authSecret,
  ...(trustedOrigins.length > 0 ? { trustedOrigins } : {}),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        url,
        name: user.name,
      });
    },
    onPasswordReset: async ({ user }) => {
      console.info(
        `[Family Cloud Auth] Password reset completed for ${user.email}.`,
      );
    },
  },
  plugins: [nextCookies()],
});
