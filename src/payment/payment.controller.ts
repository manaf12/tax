/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';
import type { UserPayload } from '../types/request.d'; // تم حل مشكلة الاستيراد
import { PaymentService } from './payment.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { WebhookDto } from './dto/webhook.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * [محمي] ينشئ نية دفع لطلب معين.
   */
  @UseGuards(JwtAuthGuard)
  @Post(':declarationId/intent')
  async createPaymentIntent(
    @Param('declarationId') declarationId: string,
    @User() user: UserPayload,
    @Body() createPaymentIntentDto: CreatePaymentIntentDto,
  ) {
    return this.paymentService.createPaymentIntent(user.sub, declarationId);
  }

  /**
   * [عام] نقطة نهاية الـ Webhook لتلقي إشعارات الدفع من بوابة الدفع.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() webhookDto: WebhookDto) {
    await this.paymentService.handleWebhook(
      webhookDto.transactionId,
      webhookDto.providerData,
    );
    return { received: true };
  }
}
