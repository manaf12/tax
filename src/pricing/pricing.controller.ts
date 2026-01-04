/* eslint-disable @typescript-eslint/no-unsafe-return */
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
import { IsEnum, IsUUID } from 'class-validator';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

class CalculateDto {
  @IsUUID()
  questionnaireId: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? capitalize(value) : value,
  )
  @IsEnum(OfferType)
  offer: OfferType;
}

@UseInterceptors(ClassSerializerInterceptor)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  // محمي — قبول السعر يحتاج توثيق
  @Post(':pricingId/accept')
  @UseGuards(JwtAuthGuard)
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

  // عام — يحسب تسعيرة واحدة من استبيان جاهز (قد يتطلب الاستبيان أن يكون مُكتمل)
  @Post('calculate')
  async calculateForQuestionnaire(
    @Body() body: CalculateDto,
  ): Promise<Pricing> {
    const { questionnaireId, offer } = body;
    const pricing = await this.pricingService.calculateForQuestionnaire(
      questionnaireId,
      offer,
    );

    if (!pricing)
      throw new NotFoundException('Pricing could not be calculated.');
    return pricing;
  }

  // عام — يحسب كل الأسعار (Standard, Premium, Confort) من questionnaireId
  @Get('calculate-all/:questionnaireId')
  async calculateAll(@Param('questionnaireId') questionnaireId: string) {
    return this.pricingService.calculateAllPricesForQuestionnaire(
      questionnaireId,
    );
  }
}
