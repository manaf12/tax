/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Controller,
  Post,
  Param,
  UseGuards,
  NotFoundException,
  Body,
  UseInterceptors,
  ClassSerializerInterceptor,
  Get,
} from '@nestjs/common';
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';
import { Pricing } from './pricing.entity';
import { OfferType, TaxDeclaration } from 'src/orders/tax-declaration.entity';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, IsUUID } from 'class-validator'; // <-- استيراد

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

class CalculateDto {
  @IsUUID()
  questionnaireId: string;

  // --- هذا هو التعديل الوحيد الذي تحتاجه ---
  @Transform(({ value }) =>
    typeof value === 'string' ? capitalize(value) : value,
  )
  @IsEnum(OfferType)
  offer: OfferType;
}
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post(':declarationId/calculate')
  async calculate(
    @User('sub') userId: string,
    @Param('declarationId') declarationId: string,
  ): Promise<Pricing> {
    const pricing = await this.pricingService.calculatePricing(
      userId,
      declarationId,
    );
    if (!pricing) {
      throw new NotFoundException('Pricing could not be calculated.');
    }
    return pricing;
  }

  // ملاحظة: الآن دالة accept تُعيد TaxDeclaration لأن قبول السعر ينشئ الطلب
  @Post(':pricingId/accept')
  async accept(
    @User('sub') userId: string,
    @Param('pricingId') pricingId: string,
  ): Promise<TaxDeclaration> {
    const declaration = await this.pricingService.acceptPricing(
      userId,
      pricingId,
    );
    if (!declaration) {
      throw new NotFoundException(
        'Failed to accept pricing or create declaration.',
      );
    }
    return declaration;
  }
  @Post('calculate') // <-- المسار الصحيح هو 'calculate' وليس 'calculateForQuestionnaire'
  async calculateForQuestionnaire(
    // لا نحتاج userId هنا بناءً على الكود في الخدمة
    @Body() body: CalculateDto, // <-- استخدم الـ DTO الجديد
  ): Promise<Pricing> {
    const { questionnaireId, offer } = body;

    // الآن، 'offer' ستكون مضمونة بأنها قيمة صحيحة من الـ enum (e.g., 'PREMIUM')
    const pricing = await this.pricingService.calculateForQuestionnaire(
      questionnaireId,
      offer, // مرر القيمة المحوّلة
    );

    if (!pricing)
      throw new NotFoundException('Pricing could not be calculated.');
    return pricing;
  }

  @Get('calculate-all/:questionnaireId')
  async calculateAll(@Param('questionnaireId') questionnaireId: string) {
    return this.pricingService.calculateAllPricesForQuestionnaire(
      questionnaireId,
    );
  }
}
