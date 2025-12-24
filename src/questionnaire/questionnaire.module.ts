/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionnaireResponse } from './questionnaire-response.entity';
import { TaxDeclaration } from 'src/orders/tax-declaration.entity';
import { QuestionnaireService } from './questionnaire.service';
import { QuestionnaireController } from './questionnaire.controller';
import { OrdersModule } from 'src/orders/orders.module';
import { Pricing } from 'src/pricing/pricing.entity';
import { UsersModule } from 'src/users/user.module';
import { PricingModule } from 'src/pricing/pricing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([QuestionnaireResponse, TaxDeclaration, Pricing]),
    forwardRef(() => OrdersModule),
    forwardRef(() => UsersModule),
    forwardRef(() => PricingModule),
  ],
  providers: [QuestionnaireService],
  controllers: [QuestionnaireController],
  exports: [QuestionnaireService],
})
export class QuestionnaireModule {}
