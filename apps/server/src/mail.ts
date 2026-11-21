/**
 * @file   apps/server/src/mail.ts
 * @brief  Outgoing mail: the port, SMTP through nodemailer, and a mailbox for tests.
 *
 * Responsibility: the forgotten-password mail is the only mail (DECISIONS D24). SMTP comes from
 *                 SC_SMTP_HOST and SC_SMTP_PORT (development: Mailpit of ops/compose.dev.yml);
 *                 without them there is no mailer and the reset route says so. Plain text only.
 * Depends on:     nodemailer
 */
import nodemailer from 'nodemailer';

export interface Mail {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

export interface SmtpConfig {
  readonly host: string;
  readonly port: number;
  readonly from: string;
}

export function smtpMailer(config: SmtpConfig): Mailer {
  // A plain connection on the local relay; a real server's relay settings come with the
  // installer (BACKLOG 11).
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: false,
  });
  return {
    async send(mail) {
      await transport.sendMail({ from: config.from, ...mail });
    },
  };
}

/** Keeps every mail in a list, for tests. */
export function mailbox(): Mailer & { readonly sent: Mail[] } {
  const sent: Mail[] = [];
  return {
    sent,
    send: (mail) => {
      sent.push(mail);
      return Promise.resolve();
    },
  };
}
