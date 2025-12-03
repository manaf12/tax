import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pricing } from './pricing.entity';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { QuestionnaireModule } from '../questionnaire/questionnaire.module'; // نحتاج QuestionnaireService
import { OrdersModule } from 'src/orders/orders.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pricing]),
    forwardRef(() => OrdersModule), // if circular dependency exists
    forwardRef(() => QuestionnaireModule),
    NotificationsModule,
  ],
  providers: [PricingService],
  controllers: [PricingController],
  exports: [PricingService],
})
export class PricingModule {}
