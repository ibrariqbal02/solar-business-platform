/**
 * HTML email templates for transactional emails.
 * All templates are self-contained with inline styles for email client compatibility.
 */

export const passwordResetTemplate = (params: {
  adminName: string;
  resetUrl: string;
  expiryMinutes: number;
  businessName?: string;
}): { subject: string; html: string; text: string } => {
  const { adminName, resetUrl, expiryMinutes, businessName = "Solar Business Platform" } = params;

  const subject = `Reset Your Password — ${businessName}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
          style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#f59e0b;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                ☀️ ${businessName}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">Password Reset Request</h2>
              <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6;">
                Hi <strong>${adminName}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
                We received a request to reset the password for your admin account.
                Click the button below to set a new password.
                This link is valid for <strong>${expiryMinutes} minutes</strong>.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="border-radius:6px;background-color:#f59e0b;">
                    <a href="${resetUrl}"
                      style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;
                             font-weight:600;text-decoration:none;border-radius:6px;">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback URL -->
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 32px;word-break:break-all;">
                <a href="${resetUrl}" style="color:#f59e0b;font-size:13px;">${resetUrl}</a>
              </p>

              <!-- Security notice -->
              <div style="background-color:#fef3c7;border-left:4px solid #f59e0b;
                          padding:16px;border-radius:0 4px 4px 0;margin-bottom:32px;">
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
                  <strong>Didn't request this?</strong><br />
                  If you didn't request a password reset, please ignore this email.
                  Your password will not be changed.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                This email was sent by ${businessName} Admin System.<br />
                Do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
Password Reset Request — ${businessName}

Hi ${adminName},

We received a request to reset your admin account password.
Click the link below to set a new password (valid for ${expiryMinutes} minutes):

${resetUrl}

If you didn't request this, please ignore this email. Your password will not be changed.

— ${businessName}
`.trim();

  return { subject, html, text };
};
