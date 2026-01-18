"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_entity_1 = require("./payment.entity");
const order_service_1 = require("../orders/order.service");
const pricing_service_1 = require("../pricing/pricing.service");
const tax_declaration_entity_1 = require("../orders/tax-declaration.entity");
class StripeService {
    async createIntent(amount, currency, metadata) {
        return {
            clientSecret: 'cs_test_xyz123',
            transactionId: `txn_${Date.now()}`,
        };
    }
}
let PaymentService = class PaymentService {
    paymentRepository;
    ordersService;
    pricingService;
    stripeService;
    constructor(paymentRepository, ordersService, pricingService) {
        this.paymentRepository = paymentRepository;
        this.ordersService = ordersService;
        this.pricingService = pricingService;
        this.stripeService = new StripeService();
    }
    async createPaymentIntent(userId, declarationId) {
        const declaration = await this.ordersService.findOne(declarationId);
        if (declaration.clientProfile.user.id !== userId) {
            throw new common_1.ForbiddenException('Access to this declaration is forbidden.');
        }
        if (declaration.status !== tax_declaration_entity_1.DeclarationStatus.PENDING_PAYMENT) {
            throw new common_1.InternalServerErrorException('Declaration is not in PENDING_PAYMENT status.');
        }
        const pricing = await this.pricingService.getPricingByDeclarationId(declarationId);
        if (!pricing || pricing.status !== 'ACCEPTED') {
            throw new common_1.InternalServerErrorException('Pricing not accepted for this declaration.');
        }
        const amountInCents = Math.round(pricing.finalPrice * 100);
        const intent = await this.stripeService.createIntent(amountInCents, 'CHF', { declarationId: declarationId, userId: userId });
        const paymentAttempt = this.paymentRepository.create({
            declaration: declaration,
            amount: pricing.finalPrice,
            transactionId: intent.transactionId,
            status: payment_entity_1.PaymentStatus.PENDING,
            providerData: { clientSecret: intent.clientSecret },
        });
        await this.paymentRepository.save(paymentAttempt);
        return {
            clientSecret: intent.clientSecret,
            transactionId: intent.transactionId,
        };
    }
    async handleWebhook(transactionId, providerData) {
        const payment = await this.paymentRepository.findOne({
            where: { transactionId: transactionId, status: payment_entity_1.PaymentStatus.PENDING },
            relations: ['declaration'],
        });
        if (!payment) {
            throw new common_1.NotFoundException('Pending payment not found for this transaction.');
        }
        payment.status = payment_entity_1.PaymentStatus.SUCCESS;
        payment.providerData = providerData;
        const savedPayment = await this.paymentRepository.save(payment);
        await this.ordersService.markAsPaid(payment.declaration.id);
        return savedPayment;
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        order_service_1.OrdersService,
        pricing_service_1.PricingService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map