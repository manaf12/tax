/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';
import { TaxDeclaration } from '../orders/tax-declaration.entity';
import { NotificationType } from './notification-type';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly emailService: EmailService) {}

  /**
   * ترسل إشعارًا بناءً على حالة الإقرار.
   * @param declaration الإقرار الضريبي (يجب أن تكون العلاقات محملة: clientProfile.user)
   * @param type نوع الإشعار (من NotificationType)
   * @param data بيانات إضافية للقالب (مثل finalPrice)
   */
  async sendDeclarationNotification(
    declaration: TaxDeclaration,
    type: NotificationType, // تم تصحيح موضع ونوع الوسيط
    data: Record<string, any> = {}, // يتم استخدامها في getTemplate
  ): Promise<void> {
    // **التحقق من تحميل العلاقات (للتأكد)**
    if (
      !declaration.clientProfile ||
      !declaration.clientProfile.user ||
      !declaration.clientProfile.user.email
    ) {
      this.logger.error(
        `Cannot send notification: User or ClientProfile not loaded for declaration ${declaration.id}`,
      );
      return;
    }

    const userEmail = declaration.clientProfile.user.email;
    const subject = this.getSubject(type);
    const body = this.getTemplate(type, declaration, data);

    try {
      await this.emailService.sendMail(userEmail, subject, body);

      this.logger.log(`Notification ${type} sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send email notification: ${error.message}`);
    }
  }

  // دوال مساعدة لجلب الموضوع والقالب (يجب تنفيذها)
  private getSubject(type: NotificationType): string {
    switch (type) {
      case NotificationType.PRICING_READY:
        return 'SwissTaxOnline: تسعير إقرارك الضريبي جاهز للمراجعة';
      case NotificationType.PRICING_ACCEPTED:
        return 'SwissTaxOnline: تم قبول التسعير بنجاح';
      case NotificationType.FILING_IN_REVIEW:
        return 'SwissTaxOnline: إقرارك الضريبي قيد المراجعة';
      case NotificationType.FILING_COMPLETED:
        return 'SwissTaxOnline: تم إكمال إقرارك الضريبي بنجاح';
      default:
        return 'SwissTaxOnline: تحديث جديد لحالة إقرارك';
    }
  }

  private getTemplate(
    type: NotificationType,
    declaration: TaxDeclaration,
    data: Record<string, any>,
  ): string {
    // هذا مجرد مثال، يجب استخدام قوالب HTML حقيقية
    let html = `<h1>مرحباً ${declaration.clientProfile.user.email || 'عميلنا'}،</h1>`;

    switch (type) {
      case NotificationType.PRICING_READY:
        html += `<p>لقد تم حساب تسعير إقرارك الضريبي رقم ${declaration.id}.</p>`;
        html += `<p>السعر النهائي هو: **${data.finalPrice} CHF**.</p>`;
        html += `<p>يرجى تسجيل الدخول للموافقة على التسعير والمتابعة إلى الدفع.</p>`;
        break;
      case NotificationType.PRICING_ACCEPTED:
        html += `<p>شكراً لك! لقد قمت بقبول التسعير بنجاح.</p>`;
        html += `<p>يمكنك الآن المتابعة إلى صفحة الدفع لإكمال طلبك.</p>`;
        break;
      case NotificationType.FILING_IN_REVIEW:
        html += `<p>تم استلام دفعتك بنجاح. إقرارك الضريبي رقم ${declaration.id} قيد المراجعة الآن من قبل فريقنا.</p>`;
        break;
      case NotificationType.FILING_COMPLETED:
        html += `<p>تهانينا! لقد تم إكمال إقرارك الضريبي رقم ${declaration.id} بنجاح.</p>`;
        html += `<p>يمكنك تنزيل المستندات النهائية من لوحة التحكم الخاصة بك.</p>`;
        break;
      default:
        html += `<p>هناك تحديث جديد لحالة إقرارك الضريبي رقم ${declaration.id}. الحالة الجديدة: ${declaration.status}</p>`;
        break;
    }

    html += `<p>مع تحيات فريق SwissTaxOnline.</p>`;
    return html;
  }
}
