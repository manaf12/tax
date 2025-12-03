import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller'; // إضافة المتحكم
import { Payment } from './payment.entity';
import { OrdersModule } from '../orders/orders.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), OrdersModule, PricingModule],
  providers: [PaymentService],
  controllers: [PaymentController], // تسجيل المتحكم
  exports: [PaymentService],
})
export class PaymentModule {}
