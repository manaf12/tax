import { IsString, IsNotEmpty, IsObject } from 'class-validator';

/**
 * DTO لبيانات الـ Webhook الواردة من بوابة الدفع.
 * بما أننا نستخدم تطبيقًا وهميًا (Mock StripeService)، سنقوم بتبسيط الحقول.
 */
export class WebhookDto {
  @IsString()
  @IsNotEmpty()
  transactionId: string; // معرف العملية الذي تم إنشاؤه في createPaymentIntent

  @IsObject()
  @IsNotEmpty()
  providerData: Record<string, any>; // بيانات الـ Webhook الكاملة من مزود الخدمة
}
