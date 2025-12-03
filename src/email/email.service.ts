import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter;
  private logger = new Logger(EmailService.name);

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendMail(to: string, subject: string, html: string) {
    const from = process.env.EMAIL_FROM;
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Email sent to ${to} subject=${subject}`);
    } catch (err) {
      this.logger.error('Failed sending email', err);
      throw err;
    }
  }

  async sendPasswordReset(email: string, tokenComposite: string) {
    const url = `${process.env.APP_URL}/auth/reset-password?token=${encodeURIComponent(tokenComposite)}`;
    const html = `<p>Click the link to reset password (expires in 1 hour):</p><p><a href="${url}">${url}</a></p>`;
    await this.sendMail(email, 'Reset your password', html);
  }

  async sendEmailVerification(email: string, tokenComposite: string) {
    const url = `${process.env.APP_URL}/auth/verify-email?token=${encodeURIComponent(tokenComposite)}`;
    const html = `<p>Click to verify your email:</p><p><a href="${url}">${url}</a></p>`;
    await this.sendMail(email, 'Verify your email', html);
  }
}
