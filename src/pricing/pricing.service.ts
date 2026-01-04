/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
    let variablePrice = 0;
    const surcharges: Record<string, number | string> = {};

    const BASE_FEE = 50;
    variablePrice += BASE_FEE;
    surcharges.baseFee = BASE_FEE;

    if (questionnaireData.isMarried) {
      const MARRIED_FEE = 30;
      variablePrice += MARRIED_FEE;
      surcharges.marriedFee = MARRIED_FEE;
    }

    const numKids = questionnaireData.numKids || 0;
    if (numKids > 0) {
      const KIDS_FEE_PER_UNIT = 10;
      const kidsFee = numKids * KIDS_FEE_PER_UNIT;
      variablePrice += kidsFee;
      surcharges.kidsFee = kidsFee;
    }

    const numIncomeSources = questionnaireData.numIncomeSources || 0;
    if (numIncomeSources > 0) {
      const INCOME_FEE_PER_UNIT = 10;
      const incomeFee = numIncomeSources * INCOME_FEE_PER_UNIT;
      variablePrice += incomeFee;
      surcharges.incomeFee = incomeFee;
    }

    const numSecurities = questionnaireData.numSecurities || 0;
    if (numSecurities > 0) {
      const SECURITIES_FEE_PER_UNIT = 10;
      const securitiesFee = numSecurities * SECURITIES_FEE_PER_UNIT;
      variablePrice += securitiesFee;
      surcharges.securitiesFee = securitiesFee;
    }

    const numRealEstate = questionnaireData.numRealEstate || 0;
    if (numRealEstate > 0) {
      const REAL_ESTATE_FEE_PER_UNIT = 80;
      const realEstateFee = numRealEstate * REAL_ESTATE_FEE_PER_UNIT;
      variablePrice += realEstateFee;
      surcharges.realEstateFee = realEstateFee;

      const numFirstTimeDeclared =
        questionnaireData.firstTimeDeclaredCount || 0;
      if (numFirstTimeDeclared > 0) {
        const FIRST_TIME_FEE_PER_UNIT = 60;
        const firstTimeFee = numFirstTimeDeclared * FIRST_TIME_FEE_PER_UNIT;
        variablePrice += firstTimeFee;
        surcharges.firstTimeFee = firstTimeFee;
      }
    }
    const standardPrice = variablePrice;
    const premiumPrice = standardPrice + 120;
    const confortPrice = premiumPrice * 2;

    let finalPrice = 0;
    switch (offer) {
      case OfferType.STANDARD:
        finalPrice = standardPrice;
        break;
      case OfferType.PREMIUM:
        finalPrice = premiumPrice;
        break;
      case OfferType.CONFORT:
        finalPrice = confortPrice;
        break;
    }

    surcharges.standardPrice = standardPrice;
    surcharges.premiumPrice = premiumPrice;
    surcharges.confortPrice = confortPrice;
    surcharges.variablePrice = variablePrice;
    surcharges.appliedPriceSource = 'Variable';
    surcharges.offerType = offer;

    return { basePrice: variablePrice, surcharges, finalPrice };
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
    // temporary manaffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
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
    // manafffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
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
    variablePrice += normalized.numSecurities * 10;
    variablePrice += normalized.numRealEstate * 80;
    variablePrice += normalized.firstTimeDeclaredCount * 60;
    const standardPrice = variablePrice;
    const premiumPrice = standardPrice + 120;
    const confortPrice = premiumPrice * 2;
    return {
      standard: standardPrice,
      premium: premiumPrice,
      confort: confortPrice,
    };
  }
}
