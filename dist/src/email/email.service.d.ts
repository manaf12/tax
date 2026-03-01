export declare class EmailService {
    private transporter;
    private logger;
    constructor();
    sendMail(to: string, subject: string, html: string): Promise<void>;
    sendWelcomeEmail(params: {
        email: string;
        firstName?: string;
    }): Promise<void>;
    sendStep1Confirmed(params: {
        email: string;
        firstName?: string;
        taxYear?: number | string;
        taxablePerson?: string;
        declarationId: string;
    }): Promise<void>;
    sendStep2Reviewed(params: {
        email: string;
        declarationId: string;
        firstName?: string;
        taxYear?: number | string;
        taxablePerson?: string;
        note?: string;
    }): Promise<void>;
    sendTaxPreparationDone(params: {
        email: string;
        declarationId: string;
        firstName?: string;
        taxYear?: number | string;
        taxablePerson?: string;
        meetingAgendaUrl: string;
    }): Promise<void>;
    sendSubmissionDone(params: {
        email: string;
        declarationId: string;
        firstName?: string;
        taxYear?: number | string;
        taxablePerson?: string;
    }): Promise<void>;
    sendDownloadConfirmed(params: {
        email: string;
        declarationId: string;
        firstName?: string;
        taxYear?: number | string;
        taxablePerson?: string;
    }): Promise<void>;
    sendPasswordResetEmail(params: {
        email: string;
        firstName?: string;
        tokenComposite: string;
    }): Promise<void>;
    sendNewCommentNotificationToAdmin(params: {
        adminEmail: string;
        clientFirstName?: string;
        declarationId: string;
        stepId: string;
        commentText: string;
    }): Promise<void>;
    sendNewCommentNotificationToClient(params: {
        clientEmail: string;
        clientFirstName?: string;
        declarationId: string;
        stepId: string;
        commentText: string;
    }): Promise<void>;
    private escapeHtml;
}
