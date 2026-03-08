/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pricing } from './pricing.entity';
import { QuestionnaireService } from '../questionnaire/questionnaire.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersService } from '../orders/order.service';
import { NotificationType } from '../notifications/notification-type';
import {
  DeclarationStatus,
  TaxDeclaration,
  OfferType,
} from 'src/orders/tax-declaration.entity';
import { UserRole } from 'src/users/user.entity';
import { PricingStatus } from './pricing-status.enum';

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(Pricing)
    private pricingRepository: Repository<Pricing>,
    @Inject(forwardRef(() => OrdersService))
    private orderService: OrdersService,
    private questionnaireService: QuestionnaireService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * @param questionnaireData
   * @param offer
   * @returns
   */
  calculatePrice(
    questionnaireData: Record<string, any>,
    offer: OfferType,
  ): {
    basePrice: number;
    surcharges: Record<string, number | string>;
    finalPrice: number;
  } {
    // Map normalized questionnaireData back into a "snapshot" shape
    // that computePricesFromSnapshot expects.
    const snapshot = {
      maritalStatus: questionnaireData.isMarried ? 'married' : 'single',
      childrenCount: questionnaireData.numKids ?? 0,
      incomeSources: questionnaireData.numIncomeSources ?? 0,
      wealthStatements: questionnaireData.numSecurities ?? 0,
      properties: questionnaireData.numRealEstate ?? 0,
      newProperties: questionnaireData.numFirstTimeDeclared ?? 0,
    };

    // Use the new unified pricing logic
    const { standard, premium, confort } =
      this.computePricesFromSnapshot(snapshot);

    // Pick the correct price for the selected offer
    let offerPrice = standard;
    switch (offer) {
      case OfferType.PREMIUM:
        offerPrice = premium;
        break;
      case OfferType.CONFORT:
        offerPrice = confort;
        break;
      case OfferType.STANDARD:
      default:
        offerPrice = standard;
        break;
    }

    // Minimal debug / audit info.
    const surcharges: Record<string, number | string> = {
      standardPrice: standard,
      premiumPrice: premium,
      confortPrice: confort,
      appliedPriceSource: 'SnapshotPricing',
      offerType: offer,
    };

    // We now treat basePrice = final price for that offer
    return {
      basePrice: offerPrice,
      surcharges,
      finalPrice: offerPrice,
    };
  }
  private computePricesFromSnapshot(snapshot: any): {
    standard: number;
    premium: number;
    confort: number;
  } {
    const normalized = {
      isMarried: snapshot.maritalStatus === 'married',
      numKids: Number(snapshot.childrenCount ?? 0),
      numIncomeSources: Number(snapshot.incomeSources ?? 0),
      numSecurities: Number(snapshot.wealthStatements ?? 0),
      numRealEstate: Number(snapshot.properties ?? 0),
      firstTimeDeclaredCount: Number(snapshot.newProperties ?? 0),
    };

    let variablePrice = 50;
    if (normalized.isMarried) variablePrice += 30;
    variablePrice += normalized.numKids * 10;
    variablePrice += normalized.numIncomeSources * 10;
    variablePrice += normalized.numSecurities * 5;
    variablePrice += normalized.numRealEstate * 80;
    variablePrice += normalized.firstTimeDeclaredCount * 60;

    const standardPrice = Math.min(variablePrice - 1, 800);
    const premiumPrice = standardPrice + 120 - 1;
    const confortPrice = premiumPrice * 2 - 1;

    return {
      standard: standardPrice,
      premium: premiumPrice,
      confort: confortPrice,
    };
  }
  /**
   * @param userId
   * @param declarationId
   * @returns
   */
  async calculatePricing(
    userId: string,
    declarationId: string,
  ): Promise<Pricing> {
    const declaration = await this.orderService.findOne(declarationId);
    if (declaration.clientProfile.user.id !== userId) {
      throw new ForbiddenException('Access to this declaration is forbidden.');
    }
    if (!declaration.offer) {
      throw new BadRequestException(
        'Offer must be selected before calculating price.',
      );
    }
    const response =
      await this.questionnaireService.getResponseByDeclarationId(declarationId);
    if (!response || response.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Questionnaire must be completed before calculating price.',
      );
    }
    const pricingData = this.calculatePrice(response.data, declaration.offer);
    let pricing = await this.pricingRepository.findOne({
      where: { declaration: { id: declarationId } },
    });

    if (!pricing) {
      pricing = this.pricingRepository.create({ declaration });
    }
    const numericSurcharges: Record<string, number> = {};
    for (const key in pricingData.surcharges) {
      const value = pricingData.surcharges[key];
      if (typeof value === 'number') {
        numericSurcharges[key] = value;
      } else {
        // يمكنك اختيار كيفية التعامل مع القيم غير الرقمية، هنا سنقوم بتجاهلها
        // أو يمكنك إضافة حقل آخر في كيان Pricing لتخزين البيانات الوصفية
      }
    }

    pricing.basePrice = pricingData.basePrice;
    pricing.surcharges = numericSurcharges; // استخدام القيم الرقمية فقط
    pricing.finalPrice = pricingData.finalPrice;
    pricing.status = PricingStatus.CALCULATED;

    const savedPricing = await this.pricingRepository.save(pricing);
    declaration.status = DeclarationStatus.PRICING_ACCEPTED;
    await this.orderService.setPricing(
      declaration.id,
      { id: 'system', roles: [UserRole.ADMIN] } as any,
      {
        basePrice: savedPricing.basePrice,
        surcharges: savedPricing.surcharges,
        finalPrice: savedPricing.finalPrice,
      },
    );
    try {
      await this.notificationsService.sendDeclarationNotification(
        declaration,
        NotificationType.PRICING_READY,
        { finalPrice: savedPricing.finalPrice },
      );
    } catch (err) {
      // لا تفشل العملية بسبب فشل الإشعار
      // log the error (logger not shown here)
    }

    return savedPricing;
  }

  /**
   * @param userId
   * @param declarationId
   * @returns
   */
  async acceptPricing(
    userId: string,
    pricingId: string,
  ): Promise<TaxDeclaration> {
    const pricing = await this.pricingRepository.findOne({
      where: { id: pricingId },
      relations: ['questionnaireResponse', 'declaration'],
    });

    if (!pricing) {
      throw new NotFoundException('Pricing not found.');
    }
    if (pricing.status === PricingStatus.ACCEPTED && pricing.declaration) {
      return pricing.declaration;
    }

    if (pricing.status !== PricingStatus.CALCULATED) {
      throw new BadRequestException('Invalid pricing status');
    }
    const declaration = pricing.declaration!;
    if (!declaration) {
      throw new BadRequestException(
        'No declaration associated with this pricing.',
      );
    }

    // Update pricing status
    pricing.status = PricingStatus.ACCEPTED;
    await this.pricingRepository.save(pricing);

    // 🔔 Send notification
    await this.notificationsService.sendDeclarationNotification(
      declaration,
      NotificationType.PRICING_ACCEPTED,
      { finalPrice: pricing.finalPrice },
    );

    return declaration;
  }
  /**
   * @param declarationId معرف الطلب
   * @returns كيان التسعيرة
   */
  async getPricingByDeclarationId(
    declarationId: string,
  ): Promise<Pricing | null> {
    return this.pricingRepository.findOne({
      where: { declaration: { id: declarationId } },
    });
  }
  async createOrUpdatePricing(
    declaration: TaxDeclaration,
    pricingData: {
      basePrice: number;
      surcharges: Record<string, number>;
      finalPrice: number;
    },
  ): Promise<Pricing> {
    let pricing: Pricing | null = declaration.pricing ?? null;

    if (!pricing) {
      pricing = await this.pricingRepository.findOne({
        where: { declaration: { id: declaration.id } },
      });
    }

    if (!pricing) {
      pricing = this.pricingRepository.create({
        declaration,
        basePrice: pricingData.basePrice,
        surcharges: pricingData.surcharges,
        finalPrice: pricingData.finalPrice,
        status: PricingStatus.CALCULATED,
      });
      return this.pricingRepository.save(pricing);
    }

    pricing.basePrice = pricingData.basePrice;
    pricing.surcharges = pricingData.surcharges;
    pricing.finalPrice = pricingData.finalPrice;
    return this.pricingRepository.save(pricing);
  }
  async calculateForQuestionnaire(
    questionnaireId: string,
    offer: OfferType,
  ): Promise<Pricing> {
    const response =
      await this.questionnaireService.getResponseById(questionnaireId);
    if (!response || response.status !== 'COMPLETED') {
      throw new BadRequestException('Questionnaire must be completed.');
    }
    const pricingData = this.calculatePrice(response.data, offer);
    let pricing = await this.pricingRepository.findOne({
      where: { questionnaireResponse: { id: questionnaireId } },
    });

    if (!pricing) {
      pricing = this.pricingRepository.create({
        questionnaireResponse: response,
      });
    }

    pricing.basePrice = pricingData.basePrice;
    const numericSurcharges: Record<string, number> = {};
    for (const k in pricingData.surcharges) {
      const v = pricingData.surcharges[k];
      if (typeof v === 'number') numericSurcharges[k] = v;
    }
    pricing.surcharges = numericSurcharges;
    pricing.finalPrice = pricingData.finalPrice;
    pricing.status = PricingStatus.CALCULATED;

    const saved = await this.pricingRepository.save(pricing);

    return saved;
  }
  async calculateAllPricesForQuestionnaire(
    questionnaireId: string,
  ): Promise<{ standard: number; premium: number; confort: number }> {
    const response =
      await this.questionnaireService.getResponseById(questionnaireId);
    if (!response) throw new NotFoundException('Questionnaire not found.');

    const snapshot = response.data || {};
    return this.computePricesFromSnapshot(snapshot);
  }
}
