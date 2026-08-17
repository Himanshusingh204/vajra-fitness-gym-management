import nodemailer, { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

const getTransporter = (): Transporter | null => {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' } : undefined,
    });
  }
  return transporter;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const shell = (title: string, body: string) => `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e5;">
          <tr>
            <td style="background:#800020;padding:20px 24px;">
              <span style="color:#ffffff;font-size:18px;font-weight:bold;">Vajra Fitness</span>
            </td>
          </tr>
          <tr><td style="padding:28px 24px;color:#1c1c1c;font-size:15px;line-height:1.6;">
            <h2 style="margin:0 0 12px;font-size:19px;color:#111;">${title}</h2>
            ${body}
          </td></tr>
          <tr>
            <td style="padding:16px 24px;background:#fafafa;border-top:1px solid #e5e5e5;color:#888;font-size:12px;">
              This is an automated message from Vajra Fitness. Please do not reply to this email.
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>
`;

const sendMail = async (to: string, subject: string, html: string) => {
  // Never hit a real SMTP server from the test suite, even if .env has live
  // credentials configured for local dev — mirrors the isTest bypass already
  // used for rate limiting (see middlewares/rateLimit.middleware.ts).
  if (process.env.NODE_ENV === 'test') return;

  const transport = getTransporter();
  if (!transport) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[Email] SMTP not configured — NOT sent to ${to}: ${subject}`);
    } else {
      console.log(`[DEV Email] to=${to} subject="${subject}" (SMTP not configured — link logged in the originating handler)`);
    }
    return;
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM || 'Vajra Fitness <no-reply@vajrafitness.in>',
    to,
    subject,
    html,
  });
};

export const sendPasswordResetEmail = async (to: string, link: string) => {
  const safe = escapeHtml(link);
  await sendMail(
    to,
    'Reset your Vajra Fitness password',
    shell(
      'Password reset',
      `<p>We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
       <p><a href="${safe}" style="display:inline-block;background:#800020;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;">Reset password</a></p>
       <p style="color:#666;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>`,
    ),
  );
};

export const sendActivationEmail = async (to: string, username: string, link: string) => {
  const safeName = escapeHtml(username);
  const safe = escapeHtml(link);
  await sendMail(
    to,
    'Activate your Vajra Fitness account',
    shell(
      'Activate your account',
      `<p>Hi ${safeName}, your gym has created a Vajra Fitness account for you. Set your password to activate it. This link expires in 7 days.</p>
       <p><a href="${safe}" style="display:inline-block;background:#800020;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold;">Activate account</a></p>
       <p style="color:#666;font-size:13px;">If you weren't expecting this, please contact your gym.</p>`,
    ),
  );
};
