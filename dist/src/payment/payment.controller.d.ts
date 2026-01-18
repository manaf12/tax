import type { UserPayload } from '../types/request.d';
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { WebhookDto } from './dto/webhook.dto';
export declare class PaymentController {
    private readonly paymentService;
    constructor(paymentService: PaymentService);
    createPaymentIntent(declarationId: string, user: UserPayload, createPaymentIntentDto: CreatePaymentIntentDto): Promise<{
        clientSecret: string;
        transactionId: string;
    }>;
    handleWebhook(webhookDto: WebhookDto): Promise<{
        received: boolean;
    }>;
}
