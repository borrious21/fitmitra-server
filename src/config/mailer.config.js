import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { BrevoClient } = require("@getbrevo/brevo");

if (!process.env.BREVO_API_KEY) {
  throw new Error("Missing BREVO_API_KEY in environment variables");
}

export const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

export const MAIL_FROM = {
  email: process.env.MAIL_FROM_EMAIL || "fitmitra.ai.co@gmail.com",
  name: process.env.MAIL_FROM_NAME || "FitMitra",
};