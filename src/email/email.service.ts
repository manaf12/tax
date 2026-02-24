/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private logger = new Logger(EmailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false, // 587 uses STARTTLS
      auth: {
        user: process.env.SMTP_USER, // must be "apikey"
        pass: process.env.SMTP_PASS, // your SendGrid API key
      },
    });
  }

  async sendMail(to: string, subject: string, html: string) {
    const from = process.env.EMAIL_FROM;
    if (!from) throw new Error('EMAIL_FROM is missing');

    try {
      await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Email sent to ${to} subject=${subject}`);
    } catch (err) {
      this.logger.error('Failed sending email', err);
      throw err;
    }
  }
  async sendWelcomeEmail(params: { email: string; firstName?: string }) {
    const { email, firstName } = params;

    const subject = 'Bienvenue sur Taxero.ch';

    const html = `
    <p>Bonjour${firstName ? ` ${this.escapeHtml(firstName)}` : ''},</p>

    <p><b>Bienvenue sur Taxero.ch !</b></p>

    <p>
      Votre compte a été créé avec succès.
      Vous pouvez désormais commencer votre déclaration d’impôt suisse en toute simplicité.
    </p>

    <p>
      Connectez-vous à votre espace client à tout moment pour démarrer ou poursuivre votre démarche.
    </p>

    <p>
      Cordialement,<br/>
      L’équipe Taxero.ch
    </p>
  `;

    await this.sendMail(email, subject, html);
  }
  async sendStep1Confirmed(params: {
    email: string;
    firstName?: string;
    taxYear?: number | string;
    taxablePerson?: string;
    declarationId: string;
  }) {
    const { email, firstName, taxYear, taxablePerson, declarationId } = params;

    const dashboardUrl = `${process.env.APP_URL}/dashboard/declarations/${encodeURIComponent(declarationId)}`;

    const subject = 'Documents reçus — vérification en cours';

    const html = `
    <p>Bonjour ${this.escapeHtml(firstName ?? '')}${firstName ? ',' : ','}</p>

    <p>
      Nous avons bien reçu tous vos documents pour la déclaration fiscale
      <b>${this.escapeHtml(String(taxYear ?? ''))}</b>
      ${taxablePerson ? `, <b>${this.escapeHtml(taxablePerson)}</b>` : ''}.
    </p>

    <p>Nous procédons maintenant à leur vérification.</p>

    <p>
      Suivre l’avancement :<br/>
      <a href="${dashboardUrl}">${dashboardUrl}</a>
    </p>

    <p>
      Cordialement,<br/>
      L’équipe Taxero.ch
    </p>
  `;

    await this.sendMail(email, subject, html);
  }
  async sendStep2Reviewed(params: {
    email: string;
    declarationId: string;
    firstName?: string;
    taxYear?: number | string;
    taxablePerson?: string;
    note?: string;
  }) {
    const { email, declarationId, firstName, taxYear, taxablePerson, note } =
      params;

    const dashboardUrl = `${process.env.APP_URL}/dashboard/declarations/${encodeURIComponent(declarationId)}`;

    const safeNote =
      note && note.trim().length
        ? `<p><b>Note :</b><br/>${this.escapeHtml(note)}</p>`
        : '';

    const subject = 'Documents validés — préparation de votre déclaration';

    const html = `
    <p>Bonjour${firstName ? ` ${this.escapeHtml(firstName)}` : ''},</p>

    <p>
      Tous vos documents ont été validés pour la déclaration
      <b>${this.escapeHtml(String(taxYear ?? ''))}</b>
      ${taxablePerson ? `, <b>${this.escapeHtml(taxablePerson)}</b>` : ''}.
    </p>

    <p>Nous préparons maintenant votre déclaration.</p>

    <p>
      Tableau de bord :<br/>
      <a href="${dashboardUrl}">${dashboardUrl}</a>
    </p>

    ${safeNote}

    <p>
      Cordialement,<br/>
      L’équipe Taxero.ch
    </p>
  `;

    await this.sendMail(email, subject, html);
  }
  // small helper to avoid HTML injection if you include note

  async sendTaxPreparationDone(params: {
    email: string;
    declarationId: string;
    firstName?: string;
    taxYear?: number | string;
    taxablePerson?: string;
    meetingAgendaUrl: string;
  }) {
    const {
      email,
      declarationId,
      firstName,
      taxYear,
      taxablePerson,
      meetingAgendaUrl,
    } = params;

    const dashboardUrl = `${process.env.APP_URL}/dashboard/declarations/${encodeURIComponent(declarationId)}`;

    const subject = 'Votre déclaration est prête';

    const html = `
    <p>Bonjour${firstName ? ` ${this.escapeHtml(firstName)}` : ''},</p>

    <p>
      Votre déclaration <b>${this.escapeHtml(String(taxYear ?? ''))}</b>
      ${taxablePerson ? `, <b>${this.escapeHtml(taxablePerson)}</b>` : ''}
      est prête.
    </p>

    <p>
      Vérifier et valider :
      <a href="${dashboardUrl}">${dashboardUrl}</a>
    </p>

    <p>
      Afin de revoir votre déclaration d'impôt avec l'un de nos experts, prenez rendez-vous via le lien suivant:<br/>
      <a href="${this.escapeHtml(meetingAgendaUrl)}">${this.escapeHtml(meetingAgendaUrl)}</a>
    </p>

    <p>
      Ce rendez-vous est inclus dans les offres <b>premium</b> et <b>confort</b>.<br/>
      Si vous avez optez pour l'offre <b>standard</b>, le rendez-vous est facturé <b>CHF 120.-</b>.
    </p>

    <p>
      Cordialement,<br/>
      L’équipe Taxero.ch
    </p>
  `;

    await this.sendMail(email, subject, html);
  }

  async sendSubmissionDone(params: {
    email: string;
    declarationId: string;
    firstName?: string;
    taxYear?: number | string;
    taxablePerson?: string;
  }) {
    const { email, declarationId, firstName, taxYear, taxablePerson } = params;

    const dashboardUrl = `${process.env.APP_URL}/dashboard/declarations/${encodeURIComponent(declarationId)}`;

    const subject = 'Déclaration soumise avec succès';

    const html = `
    <p>Bonjour${firstName ? ` ${this.escapeHtml(firstName)}` : ''},</p>

    <p>
      Votre déclaration fiscale
      <b>${this.escapeHtml(String(taxYear ?? ''))}</b>
      ${taxablePerson ? `, <b>${this.escapeHtml(taxablePerson)}</b>` : ''}
      a été soumise avec succès.
    </p>

    <p>
      La quittance d’envoi ainsi que la déclaration d’impôt soumise sont disponibles sur Taxero.ch :<br/>
      <a href="${dashboardUrl}">${dashboardUrl}</a>
    </p>

    <p>
      Dès réception de votre avis de taxation, vous pourrez le téléverser dans l’étape 5 de votre déclaration d’impôt :<br/>
      <a href="${dashboardUrl}">${dashboardUrl}</a>
    </p>

    <p><b>Avez-vous apprécié notre service ?</b><br/>
      N’hésitez pas à nous recommander auprès de votre entourage et à bénéficier de notre programme de parrainage :
    </p>

    <ul>
      <li>3 recommandations validées → bon de CHF 100 (restaurant partenaire ou crédit pour votre prochaine déclaration)</li>
      <li>5 recommandations validées → bon de CHF 200 (restaurant partenaire ou crédit pour votre prochaine déclaration)</li>
      <li>10 recommandations validées → bon de CHF 200 + CHF 500 en espèces</li>
    </ul>

    <p>
      Pour en bénéficier, la personne parrainée doit simplement mentionner votre nom complet dans le champ
      « Référencement » lors de sa demande.
    </p>

    <p>Merci pour votre confiance et votre soutien.</p>

    <p>
      Cordialement,<br/>
      L’équipe Taxero.ch
    </p>
  `;

    await this.sendMail(email, subject, html);
  }
  async sendDownloadConfirmed(params: {
    email: string;
    declarationId: string;
    firstName?: string;
    taxYear?: number | string;
    taxablePerson?: string;
  }) {
    const { email, declarationId, firstName, taxYear, taxablePerson } = params;

    const dashboardUrl = `${process.env.APP_URL}/dashboard/declarations/${encodeURIComponent(declarationId)}`;

    const subject = 'Projet validé — soumission en cours';

    const html = `
    <p>Bonjour${firstName ? ` ${this.escapeHtml(firstName)}` : ''},</p>

    <p>
      Merci d’avoir validé le projet de votre déclaration
      <b>${this.escapeHtml(String(taxYear ?? ''))}</b>
      ${taxablePerson ? `, <b>${this.escapeHtml(taxablePerson)}</b>` : ''}.
    </p>

    <p>Nous procédons maintenant à la soumission.</p>

    <p>
      Tableau de bord :<br/>
      <a href="${dashboardUrl}">${dashboardUrl}</a>
    </p>

    <p>
      Cordialement,<br/>
      L’équipe Taxero.ch
    </p>
  `;

    await this.sendMail(email, subject, html);
  }
  async sendPasswordResetEmail(params: {
    email: string;
    firstName?: string;
    tokenComposite: string;
  }) {
    const { email, firstName, tokenComposite } = params;

    // const resetUrl = `${process.env.APP_URL}/auth/reset-password?token=${encodeURIComponent(
    //   tokenComposite,
    // )}`;
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(
      tokenComposite,
    )}`;
    const subject = 'Réinitialisation de votre mot de passe';

    const html = `
    <p>Bonjour${firstName ? ` ${this.escapeHtml(firstName)}` : ''},</p>

    <p>
      Vous avez demandé la réinitialisation de votre mot de passe Taxero.ch.
      Pour choisir un nouveau mot de passe, veuillez cliquer sur le lien ci-dessous :
    </p>

    <p>
      Réinitialiser mon mot de passe :<br/>
      <a href="${resetUrl}">${resetUrl}</a>
    </p>

    <p>
      Ce lien est valable pendant 1 heure. Passé ce délai, il faudra refaire une demande de réinitialisation.
    </p>

    <p>
      Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer ce message.
    </p>

    <p>
      Cordialement,<br/>
      L’équipe Taxero.ch
    </p>
  `;

    await this.sendMail(email, subject, html);
  }
  private escapeHtml(input: string) {
    return input
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
