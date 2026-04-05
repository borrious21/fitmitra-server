// src/config/mailer.config.js
import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY in environment variables");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const MAIL_FROM = "FitMitra <onboarding@resend.dev>";
export const MAIL_REPLY_TO = "fitmitra.ai.co@gmail.com";