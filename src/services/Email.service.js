// src/services/Email.service.js
import transporter, { MAIL_FROM } from "../config/mailer.config.js";

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
<body style="margin:0;padding:0;background:#F0F0EC;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Preheader (hidden preview text) -->
  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background:#F0F0EC;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:560px;">

          <!-- ── LOGO BAR ── -->
          <tr>
            <td style="padding-bottom:20px;" align="center">
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding-right:8px;vertical-align:middle;">
                    <!-- Pulse icon SVG -->
                    <img src="https://res.cloudinary.com/dir5oumz5/image/upload/v1775306228/download_1_zzed97.jpg"
                         width="28" height="28"
                         alt=""
                         style="display:block;border-radius:6px;object-fit:cover;"
                         onerror="this.style.display='none'" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:22px;font-weight:700;
                                 font-family:Georgia,'Times New Roman',serif;
                                 letter-spacing:-0.01em;color:#2D6A4F;">
                      Fit<span style="color:#E86A30;">Mitra</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── MAIN CARD ── -->
          <tr>
            <td style="background:#FFFFFF;
                       border-radius:20px;
                       border:1px solid #E8E8E4;
                       box-shadow:0 8px 40px rgba(45,106,79,0.10),0 2px 8px rgba(0,0,0,0.04);
                       overflow:hidden;">

              <!-- Green accent bar top -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="height:4px;
                             background:linear-gradient(90deg,#2D6A4F 0%,#40916C 60%,#E86A30 100%);
                             font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Card body -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding:36px 40px 32px;">
                    ${bodyHtml}
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding:0 40px;">
                    <div style="height:1px;background:#E8E8E4;"></div>
                  </td>
                </tr>
              </table>

              <!-- Footer inside card -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding:20px 40px 28px;">
                    <p style="margin:0;font-size:11.5px;color:#888888;
                               text-align:center;line-height:1.7;">
                      This email was sent by
                      <span style="color:#2D6A4F;font-weight:600;">FitMitra</span>.
                      If you didn't request this, you can safely ignore it.<br/>
                      <span style="color:#B7E4C7;">·</span>&nbsp;
                      Built for Nepal &nbsp;<span style="color:#B7E4C7;">·</span>&nbsp;
                      Free forever &nbsp;<span style="color:#B7E4C7;">·</span>
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Bottom spacing -->
          <tr><td style="height:32px;"></td></tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function otpBlock(otp) {
  const digits = String(otp).split("");
  const digitCells = digits
    .map(
      (d) => `
      <td style="padding:0 5px;">
        <span style="
          display:inline-block;
          width:42px; height:52px; line-height:52px;
          text-align:center;
          font-size:26px; font-weight:800;
          font-family:'Courier New', 'Lucida Console', monospace;
          color:#2D6A4F;
          background:#F4FAF7;
          border:2px solid #B7E4C7;
          border-radius:10px;
          letter-spacing:0;">
            ${d}
        </span>
      </td>`
    )
    .join("");

  return `
    <!-- OTP label -->
    <p style="margin:0 0 14px;font-size:11px;font-weight:700;
               letter-spacing:0.12em;text-transform:uppercase;
               color:#2D6A4F;text-align:center;">
      Your one-time code
    </p>

    <!-- Digit boxes -->
    <table cellpadding="0" cellspacing="0" role="presentation"
           style="margin:0 auto 20px;">
      <tr>${digitCells}</tr>
    </table>

    <!-- Expiry pill -->
    <table cellpadding="0" cellspacing="0" role="presentation"
           style="margin:0 auto 8px;">
      <tr>
        <td style="background:#FFF6F1;
                   border:1px solid #F5C9AE;
                   border-radius:999px;
                   padding:6px 16px;">
          <span style="font-size:12px;font-weight:600;color:#E86A30;">
            ⏱ Expires in ${OTP_EXPIRY_MINUTES} minutes
          </span>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:11.5px;color:#888888;text-align:center;">
      Never share this code with anyone.
    </p>`;
}

function tipBox(text) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
           style="margin-top:24px;">
      <tr>
        <td style="background:#F4FAF7;
                   border:1px solid #B7E4C7;
                   border-left:4px solid #2D6A4F;
                   border-radius:10px;
                   padding:14px 16px;">
          <p style="margin:0;font-size:12.5px;color:#444444;line-height:1.65;">
            ${text}
          </p>
        </td>
      </tr>
    </table>`;
}

export async function sendVerificationOtp(to, otp) {
  const bodyHtml = `
    <!-- Icon circle -->
    <table cellpadding="0" cellspacing="0" role="presentation"
           style="margin:0 auto 24px;">
      <tr>
        <td style="width:60px;height:60px;
                   background:#F0FAF4;
                   border:1.5px solid #B7E4C7;
                   border-radius:50%;
                   text-align:center;line-height:60px;
                   font-size:26px;">
          ✉️
        </td>
      </tr>
    </table>

    <!-- Heading -->
    <h1 style="margin:0 0 10px;
               font-size:24px;font-weight:700;
               font-family:Georgia,'Times New Roman',serif;
               letter-spacing:-0.02em;
               color:#1A1A1A;text-align:center;">
      Verify Your Email
    </h1>

    <!-- Sub -->
    <p style="margin:0 0 28px;font-size:14.5px;color:#444444;
               line-height:1.75;text-align:center;max-width:400px;
               margin-left:auto;margin-right:auto;">
      Thanks for joining <strong style="color:#2D6A4F;">FitMitra</strong>!
      Use the code below to activate your account and start your
      personalised fitness journey.
    </p>

    ${otpBlock(otp)}

    ${tipBox(`
      <strong style="color:#1A1A1A;">Didn't sign up?</strong>
      You can safely ignore this email — your address won't be used
      without verification.
    `)}`;

  await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject: `${otp} – Verify your FitMitra account`,
    html: buildEmailHtml({
      title: "Verify your email – FitMitra",
      preheader: `Your verification code is ${otp}. Expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      bodyHtml,
    }),
  });
}

export async function sendPasswordResetOtp(to, otp) {
  const bodyHtml = `
    <!-- Icon circle -->
    <table cellpadding="0" cellspacing="0" role="presentation"
           style="margin:0 auto 24px;">
      <tr>
        <td style="width:60px;height:60px;
                   background:#F0FAF4;
                   border:1.5px solid #B7E4C7;
                   border-radius:50%;
                   text-align:center;line-height:60px;
                   font-size:26px;">
          🔒
        </td>
      </tr>
    </table>

    <!-- Heading -->
    <h1 style="margin:0 0 10px;
               font-size:24px;font-weight:700;
               font-family:Georgia,'Times New Roman',serif;
               letter-spacing:-0.02em;
               color:#1A1A1A;text-align:center;">
      Reset Your Password
    </h1>

    <!-- Sub -->
    <p style="margin:0 0 28px;font-size:14.5px;color:#444444;
               line-height:1.75;text-align:center;max-width:400px;
               margin-left:auto;margin-right:auto;">
      We received a request to reset the password on your
      <strong style="color:#2D6A4F;">FitMitra</strong> account.
      Enter the code below to continue.
    </p>

    ${otpBlock(otp)}

    ${tipBox(`
      <strong style="color:#1A1A1A;">Didn't request this?</strong>
      No action is needed — your password will remain unchanged and
      this code will expire automatically.
    `)}`;

  await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject: `${otp} – FitMitra password reset code`,
    html: buildEmailHtml({
      title: "Reset your password – FitMitra",
      preheader: `Your password reset code is ${otp}. Expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      bodyHtml,
    }),
  });
}