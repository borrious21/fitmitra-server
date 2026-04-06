// mailer.config.js
import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY in environment variables");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

// The "from" address must be a verified domain in your Resend account.
// While testing you can use the Resend sandbox address: onboarding@resend.dev
export const MAIL_FROM =
  process.env.RESEND_FROM || "FitMitra <onboarding@resend.dev>";
