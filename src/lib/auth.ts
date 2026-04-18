import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { db } from "../db";
import * as schema from "../db/schema";
import { sendPasswordResetEmail } from "./email";

const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const authSecret =
  process.env.BETTER_AUTH_SECRET ??
  "family-cloud-dev-secret-change-in-production";

export const auth = betterAuth({
  appName: "Family Cloud",
  baseURL: baseUrl,
  secret: authSecret,
  trustedOrigins: [baseUrl],
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
