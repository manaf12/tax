import { EmailService } from '../email/email.service';
import { TaxDeclaration } from '../orders/tax-declaration.entity';
import { NotificationType } from './notification-type';
export declare class NotificationsService {
    private readonly emailService;
    private readonly logger;
    constructor(emailService: EmailService);
    sendDeclarationNotification(declaration: TaxDeclaration, type: NotificationType, data?: Record<string, any>): Promise<void>;
    private getSubject;
    private getTemplate;
}
