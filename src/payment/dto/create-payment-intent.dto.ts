/* eslint-disable @typescript-eslint/no-unused-vars */
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO لإنشاء نية الدفع.
 * في هذا السياق، يتم تمرير declarationId كمعامل مسار (path parameter)،
 * ولكن يمكن استخدام هذا DTO لتمرير بيانات إضافية في المستقبل.
 */
export class CreatePaymentIntentDto {
  // يمكن إضافة حقول أخرى هنا إذا لزم الأمر، مثل خيارات الدفع
}
