export declare class EmailService {
    private transporter;
    private logger;
    constructor();
    sendMail(to: string, subject: string, html: string): Promise<void>;
    sendPasswordReset(email: string, tokenComposite: string): Promise<void>;
    sendEmailVerification(email: string, tokenComposite: string): Promise<void>;
}
