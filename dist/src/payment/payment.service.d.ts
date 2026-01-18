import { Repository } from 'typeorm';
import { Payment } from './payment.entity';
import { OrdersService } from '../orders/order.service';
import { PricingService } from '../pricing/pricing.service';
export declare class PaymentService {
    private paymentRepository;
    private ordersService;
    private pricingService;
    private stripeService;
    constructor(paymentRepository: Repository<Payment>, ordersService: OrdersService, pricingService: PricingService);
    createPaymentIntent(userId: string, declarationId: string): Promise<{
        clientSecret: string;
        transactionId: string;
    }>;
    handleWebhook(transactionId: string, providerData: Record<string, any>): Promise<Payment>;
}
