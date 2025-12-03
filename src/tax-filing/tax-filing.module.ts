import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaxFiling } from './tax-filing.entity';
import { TaxFilingService } from './tax-filing.service';
import { TaxFilingController } from './tax-filing.controller';
import { UsersModule } from '../users/user.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaxFiling]),
    UsersModule, // لجلب ClientProfile
    PricingModule, // للتحقق من حالة التسعيرة
  ],
  providers: [TaxFilingService],
  controllers: [TaxFilingController],
  exports: [TaxFilingService],
})
export class TaxFilingModule {}
