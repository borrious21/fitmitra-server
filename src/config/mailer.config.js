// mailer.config.js
import nodemailer from "nodemailer";

if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  throw new Error(
    "Missing GMAIL_USER or GMAIL_APP_PASSWORD in environment variables"
  );
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const MAIL_FROM =
  process.env.GMAIL_FROM || `FitMitra <${process.env.GMAIL_USER}>`;

export default transporter;
