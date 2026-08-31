import nodemailer, { Transporter } from "nodemailer";

// ─── Lazy singleton ───────────────────────────────────────────────────────────
// The transporter is created once on first use so missing env vars during tests
// don't crash the server at startup.

let _transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (_transporter) return _transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error(
      "Email transport not configured. Set EMAIL_USER and EMAIL_PASS in .env"
    );
  }

  _transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  return _transporter;
};

// ─── Public send helper ───────────────────────────────────────────────────────

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email via the configured Gmail transport.
 * Throws on delivery failure — callers should catch and handle gracefully.
 */
export const sendMail = async (options: MailOptions): Promise<void> => {
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
};

/**
 * Reset the cached transporter — used in tests to avoid real sends.
 */
export const resetTransporter = (): void => {
  _transporter = null;
};
