import nodemailer, { Transporter } from "nodemailer";

// ─── Lazy singleton ───────────────────────────────────────────────────────────
// The transporter is created once on first use so missing env vars during tests
// don't crash the server at startup.

let _transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (_transporter) return _transporter;

  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT ?? "587", 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "Email transport not configured. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in .env"
    );
  }

  // Port 465 → implicit TLS (secure: true)
  // Port 587 / others → STARTTLS (secure: false, requireTLS handled by nodemailer)
  const secure = port === 465;

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    // For port 587: nodemailer upgrades to TLS automatically via STARTTLS
    ...(!secure && { requireTLS: true }),
  });

  return _transporter;
};

// ─── Public send helper ───────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email via the configured SMTP transport.
 *
 * Never throws — failures are logged server-side and swallowed so that a
 * broken email config never crashes a request handler.
 *
 * Returns true on success, false on failure.
 */
export const sendEmail = async (options: SendEmailOptions): Promise<boolean> => {
  try {
    const from =
      process.env.EMAIL_FROM ??
      `"Solar Business Platform" <${process.env.EMAIL_USER}>`;

    await getTransporter().sendMail({
      from,
      to:      options.to,
      subject: options.subject,
      html:    options.html,
      text:    options.text,
    });

    return true;
  } catch (err: any) {
    console.error("[Email] Failed to send email to", options.to, "—", err?.message ?? err);
    return false;
  }
};

/**
 * Reset the cached transporter.
 * Used in tests to ensure the mock is picked up cleanly.
 */
export const resetTransporter = (): void => {
  _transporter = null;
};
