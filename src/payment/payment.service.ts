/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  Injectable,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './payment.entity';
import { OrdersService } from '../orders/order.service';
import { PricingService } from '../pricing/pricing.service';
import { DeclarationStatus } from '../orders/tax-declaration.entity';

// نفترض وجود خدمة StripeService أو ما يعادلها للتفاعل مع بوابة الدفع
// في هذا المثال، سنستخدم دالة وهمية
class StripeService {
  async createIntent(amount: number, currency: string, metadata: any) {
    // هذا يمثل الاتصال الفعلي بـ Stripe API
    return {
      clientSecret: 'cs_test_xyz123',
      transactionId: `txn_${Date.now()}`,
    };
  }
}

@Injectable()
export class PaymentService {
  private stripeService: StripeService; // خدمة وهمية لبوابة الدفع

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private ordersService: OrdersService,
    private pricingService: PricingService,
  ) {
    this.stripeService = new StripeService(); // تهيئة الخدمة الوهمية
  }

  /**
   * تبدأ عملية الدفع (Payment Intent) لطلب محدد.
   * @param userId معرف المستخدم (للأمان)
   * @param declarationId معرف الطلب
   * @returns كائن يحتوي على سر العميل (Client Secret) لبدء الدفع من الواجهة الأمامية
   */
  async createPaymentIntent(
    userId: string,
    declarationId: string,
  ): Promise<{ clientSecret: string; transactionId: string }> {
    // 1. جلب الطلب والتحقق من الأمان
    const declaration = await this.ordersService.findOne(declarationId);

    if (declaration.clientProfile.user.id !== userId) {
      throw new ForbiddenException('Access to this declaration is forbidden.');
    }

    // 2. التحقق من حالة الطلب والتسعير
    if (declaration.status !== DeclarationStatus.PENDING_PAYMENT) {
      throw new InternalServerErrorException(
        'Declaration is not in PENDING_PAYMENT status.',
      );
    }

    // 3. جلب السعر النهائي
    const pricing =
      await this.pricingService.getPricingByDeclarationId(declarationId);
    if (!pricing || pricing.status !== 'ACCEPTED') {
      throw new InternalServerErrorException(
        'Pricing not accepted for this declaration.',
      );
    }

    const amountInCents = Math.round(pricing.finalPrice * 100); // يجب أن يكون المبلغ بالسنت

    // 4. إنشاء نية الدفع (Payment Intent) عبر بوابة الدفع
    const intent = await this.stripeService.createIntent(
      amountInCents,
      'CHF', // العملة السويسرية
      { declarationId: declarationId, userId: userId },
    );

    // 5. تسجيل محاولة الدفع في قاعدة البيانات
    const paymentAttempt = this.paymentRepository.create({
      declaration: declaration,
      amount: pricing.finalPrice,
      transactionId: intent.transactionId,
      status: PaymentStatus.PENDING,
      providerData: { clientSecret: intent.clientSecret },
    });
    await this.paymentRepository.save(paymentAttempt);

    return {
      clientSecret: intent.clientSecret,
      transactionId: intent.transactionId,
    };
  }

  // ... (الجزء الثاني: دالة handleWebhook ستأتي لاحقًا)
  /**
   * يتعامل مع إشعارات الويب (Webhooks) من بوابة الدفع لتأكيد الدفع.
   * @param transactionId معرف العملية من بوابة الدفع
   * @param providerData بيانات الـ Webhook الكاملة
   * @returns Payment كيان الدفع المحدث
   */
  async handleWebhook(
    transactionId: string,
    providerData: Record<string, any>,
  ): Promise<Payment> {
    // 1. البحث عن محاولة الدفع المعلقة
    const payment = await this.paymentRepository.findOne({
      where: { transactionId: transactionId, status: PaymentStatus.PENDING },
      relations: ['declaration'], // نحتاج إلى الطلب لتحديث حالته
    });

    if (!payment) {
      // قد يكون تم معالجته مسبقًا أو غير موجود
      throw new NotFoundException(
        'Pending payment not found for this transaction.',
      );
    }

    // 2. تحديث حالة الدفع
    payment.status = PaymentStatus.SUCCESS;
    payment.providerData = providerData; // حفظ بيانات الـ Webhook الكاملة للتدقيق
    const savedPayment = await this.paymentRepository.save(payment);

    // 3. تحديث حالة الطلب (TaxDeclaration)
    await this.ordersService.markAsPaid(payment.declaration.id);

    return savedPayment;
  }
}
