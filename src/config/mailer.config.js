// src/config/mailer.config.js
import nodemailer from "nodemailer";

if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  throw new Error("Missing SMTP_HOST, SMTP_USER, or SMTP_PASS in environment variables");
}

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: process.env.SMTP_SECURE !== "false", 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const MAIL_FROM =
  process.env.MAIL_FROM || `FitMitra <${process.env.SMTP_USER}>`;