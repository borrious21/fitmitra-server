// Email.service.js
import { client, MAIL_FROM } from "../config/mailer.config.js";

const OTP_EXPIRY_MINUTES = 10;

function buildEmailHtml({ title, preheader, bodyHtml }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0A0C0F;font-family:'Helvetica Neue',Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0C0F;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#12151B;border-radius:16px;overflow:hidden;
                      border:1px solid rgba(255,255,255,0.07);
                      box-shadow:0 12px 48px rgba(0,0,0,0.65);">

          <!-- Orange top bar -->
          <tr>
            <td style="height:2px;background:linear-gradient(135deg,#FF5C1A 0%,#FF8A3D 100%);
                       font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding:32px 36px 24px;background:#12151B;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:20px;font-weight:900;letter-spacing:0.1em;
                                 text-transform:uppercase;color:#F0F2F5;
                                 font-family:'Arial Narrow',Arial,sans-serif;">
                      FitMitra
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:10px;font-weight:700;letter-spacing:0.15em;
                                 text-transform:uppercase;color:#FF5C1A;
                                 background:rgba(255,92,26,0.1);
                                 border:1px solid rgba(255,92,26,0.3);
                                 padding:4px 10px;border-radius:999px;">
                      Your AI Coach
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 36px;">
              <div style="height:1px;background:rgba(255,255,255,0.07);"></div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 28px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 36px;">
              <div style="height:1px;background:rgba(255,255,255,0.07);"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;background:#0F1217;border-radius:0 0 16px 16px;">
              <p style="margin:0;font-size:11px;color:#525D72;text-align:center;line-height:1.6;">
                This email was sent by FitMitra. If you didn't request this, you can safely ignore it.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function otpBlock(otp) {
  return `
    <div style="margin:28px 0;text-align:center;">
      <div style="display:inline-block;
                  background:rgba(255,92,26,0.07);
                  border:1px solid rgba(255,92,26,0.3);
                  border-radius:12px;padding:20px 44px;">
        <span style="font-size:38px;font-weight:900;letter-spacing:10px;
                     color:#FF7A40;font-family:'Courier New',monospace;
                     text-shadow:0 0 20px rgba(255,92,26,0.4);">${otp}</span>
      </div>
    </div>
    <p style="margin:0 0 6px;font-size:12px;color:#9AA3B4;text-align:center;">
      This code expires in <strong style="color:#F0F2F5;">${OTP_EXPIRY_MINUTES} minutes</strong>.
    </p>
    <p style="margin:0;font-size:12px;color:#525D72;text-align:center;">
      Do not share this code with anyone.
    </p>`;
}

async function sendMail({ to, subject, title, preheader, bodyHtml }) {
  await client.transactionalEmails.sendTransacEmail({
    sender: MAIL_FROM,
    to: [{ email: to }],
    subject,
    htmlContent: buildEmailHtml({ title, preheader, bodyHtml }),
  });
}

// 1. Email verification OTP
export async function sendVerificationOtp(to, otp) {
  const bodyHtml = `
    <h2 style="margin:0 0 10px;font-size:22px;font-weight:900;letter-spacing:0.04em;
               text-transform:uppercase;color:#F0F2F5;
               font-family:'Arial Narrow',Arial,sans-serif;">
      Verify Your Email
    </h2>
    <p style="margin:0 0 24px;font-size:14px;color:#9AA3B4;line-height:1.7;">
      Thanks for signing up! Use the code below to verify your email address
      and activate your FitMitra account.
    </p>
    ${otpBlock(otp)}`;

  try {
    await sendMail({
      to,
      subject: `${otp} is your FitMitra verification code`,
      title: "Verify your email – FitMitra",
      preheader: `Your verification code is ${otp}. Expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      bodyHtml,
    });
  } catch (err) {
    console.error("Verification email failed:", err.message);
  }
}

// 2. Password reset OTP
export async function sendPasswordResetOtp(to, otp) {
  const bodyHtml = `
    <h2 style="margin:0 0 10px;font-size:22px;font-weight:900;letter-spacing:0.04em;
               text-transform:uppercase;color:#F0F2F5;
               font-family:'Arial Narrow',Arial,sans-serif;">
      Reset Your Password
    </h2>
    <p style="margin:0 0 24px;font-size:14px;color:#9AA3B4;line-height:1.7;">
      We received a request to reset the password for your account.
      Enter the code below to proceed.
    </p>
    ${otpBlock(otp)}
    <p style="margin:20px 0 0;font-size:12px;color:#525D72;text-align:center;">
      If you did not request a password reset, no action is required.
    </p>`;

  try {
    await sendMail({
      to,
      subject: `${otp} is your FitMitra password reset code`,
      title: "Reset your password – FitMitra",
      preheader: `Your password reset code is ${otp}. Expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      bodyHtml,
    });
  } catch (err) {
    console.error("Reset email failed:", err.message);
  }
}