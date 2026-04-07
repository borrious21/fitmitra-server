// src/config/mailer.config.js

import * as Brevo from "@getbrevo/brevo";

if (!process.env.BREVO_API_KEY) {
  throw new Error("Missing BREVO_API_KEY in environment variables");
}

const client = new Brevo.TransactionalEmailsApi();
client.authentications["apiKey"].apiKey = process.env.BREVO_API_KEY;

export { client };

export const MAIL_FROM = {
  email: process.env.MAIL_FROM_EMAIL || "no-reply@yourdomain.com",
  name: process.env.MAIL_FROM_NAME || "FitMitra",
};