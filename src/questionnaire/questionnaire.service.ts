/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  forwardRef,
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionnaireResponse } from './questionnaire-response.entity';
import { OrdersService } from 'src/orders/order.service';
import { UsersService } from 'src/users/users.service';
import { Pricing } from 'src/pricing/pricing.entity';
import {
  DeclarationStatus,
  TaxDeclaration,
  OfferType,
} from 'src/orders/tax-declaration.entity';
import { PricingService } from 'src/pricing/pricing.service';
import { PricingStatus } from 'src/pricing/pricing-status.enum';
import { ClientProfile } from 'src/users/client-profile.entity';
import { randomUUID } from 'crypto';

@Injectable()
export class QuestionnaireService {
  constructor(
    @InjectRepository(QuestionnaireResponse)
    private responseRepository: Repository<QuestionnaireResponse>,
    @InjectRepository(Pricing)
    private pricingRepository: Repository<Pricing>,
    @InjectRepository(TaxDeclaration)
    private declarationsRepository: Repository<TaxDeclaration>,
    @Inject(forwardRef(() => OrdersService))
    private ordersService: OrdersService,
    private usersService: UsersService,
    @Inject(forwardRef(() => PricingService))
    private readonly pricingService: PricingService,
  ) {}

  /**
   * @param userId
   */
  async startQuestionnaire(
    userId: string,
    forceNew = false,
  ): Promise<QuestionnaireResponse> {
    const user = await this.usersService.findOneWithProfile(userId);
    if (!user || !user.profile) {
      throw new NotFoundException('User or client profile not found.');
    }

    if (!forceNew) {
      const existing = await this.responseRepository.findOne({
        where: {
          clientProfile: { id: user.profile.id },
          status: 'IN_PROGRESS',
        },
        relations: ['clientProfile'],
      });
      if (existing) return existing;
    }

    // (اختياري لكن مهم) اقفلي أي IN_PROGRESS قديم
    await this.responseRepository.update(
      { clientProfile: { id: user.profile.id }, status: 'IN_PROGRESS' },
      { status: 'ABANDONED' as any }, // أو أي status عندك بدل ABANDONED
    );

    let response = this.responseRepository.create({
      clientProfile: user.profile,
      status: 'IN_PROGRESS',
      data: {},
    });

    response = await this.responseRepository.save(response);
    return response;
  }

  async saveStep(
    questionnaireId: string,
    stepData: Record<string, any>,
    userId?: string,
  ): Promise<QuestionnaireResponse> {
    const response = await this.responseRepository.findOne({
      where: { id: questionnaireId },
      relations: ['clientProfile', 'clientProfile.user'],
    });
    if (!response) throw new NotFoundException('Questionnaire not found.');

    if (response.clientProfile && (response.clientProfile as any).user) {
      const ownerUserId = (response.clientProfile as any).user.id;
      if (ownerUserId !== userId) {
        throw new ForbiddenException(
          'Not authorized to edit this questionnaire.',
        );
      }
    }

    if (!stepData || Object.keys(stepData).length === 0) {
      return response;
    }

    response.data = { ...response.data, ...stepData };
    response.status = 'IN_PROGRESS';

    await this.responseRepository.save(response);

    const reloaded = await this.responseRepository.findOne({
      where: { id: response.id },
      relations: ['clientProfile', 'clientProfile.user'],
    });

    return reloaded!;
  }
  /**
   */
  async getResponseByDeclarationId(
    declarationId: string,
  ): Promise<QuestionnaireResponse | null> {
    const pricing = await this.pricingRepository.findOne({
      where: { declaration: { id: declarationId } },
      relations: ['questionnaireResponse'],
    });
    if (!pricing) return null;
    return pricing.questionnaireResponse ?? null;
  }

  async getResponseById(
    questionnaireId: string,
  ): Promise<QuestionnaireResponse | null> {
    return this.responseRepository.findOne({
      where: { id: questionnaireId },
      relations: ['clientProfile', 'clientProfile.user'],
    });
  }

  async finalizeQuestionnaire(
    questionnaireId: string,
    userId: string,
    offer: string,
    billing?: {
      firstName?: string;
      lastName?: string;
      street?: string;
      postalCode?: string;
      city?: string;
    },
  ): Promise<QuestionnaireResponse> {
    const response = await this.responseRepository.findOne({
      where: { id: questionnaireId },
      relations: ['clientProfile', 'clientProfile.user'],
    });
    if (!response) throw new NotFoundException('Questionnaire not found.');
    if (response.clientProfile && (response.clientProfile as any).user) {
      const ownerUserId = (response.clientProfile as any).user.id;
      if (ownerUserId !== userId) {
        throw new ForbiddenException(
          'Not authorized to finalize this questionnaire.',
        );
      }
    }

    const offerValue = Object.values(OfferType).find(
      (o) => o.toLowerCase() === offer.toLowerCase(),
    );
    if (!offerValue) throw new BadRequestException('Invalid offer selected.');

    response.data = {
      ...response.data,
      offer: offerValue,
      billingFirstName: billing?.firstName ?? response.data.billingFirstName,
      billingLastName: billing?.lastName ?? response.data.billingLastName,
      billingStreet: billing?.street ?? response.data.billingStreet,
      billingPostalCode: billing?.postalCode ?? response.data.billingPostalCode,
      billingCity: billing?.city ?? response.data.billingCity,
    };
    response.status = 'COMPLETED';
    const savedResponse = await this.responseRepository.save(response);

    try {
      const clientProfile = response.clientProfile as ClientProfile | undefined;

      let declaration = await this.declarationsRepository.findOne({
        where: { questionnaireResponseId: savedResponse.id },
      });

      if (!declaration) {
        declaration = this.declarationsRepository.create({
          clientProfile,
          offer: offerValue,
          status: DeclarationStatus.DRAFT,
          questionnaireSnapshot: savedResponse.data,
          questionnaireResponseId: savedResponse.id,
        });
      } else {
        declaration.clientProfile = clientProfile!;
        declaration.offer = offerValue;
        declaration.questionnaireSnapshot = savedResponse.data;
      }

      declaration = await this.declarationsRepository.save(declaration);
      const normalized = {
        isMarried: savedResponse.data.maritalStatus === 'married',
        numKids: Number(savedResponse.data.childrenCount ?? 0),
        numIncomeSources: Number(savedResponse.data.incomeSources ?? 0),
        numSecurities: Number(savedResponse.data.wealthStatements ?? 0),
        numRealEstate: Number(savedResponse.data.properties ?? 0),
        firstTimeDeclaredCount: Number(savedResponse.data.newProperties ?? 0),
        movedAddress: Boolean(savedResponse.data.movedAddress),
        numPropertiesEffectiveCost: Number(
          savedResponse.data.propertiesWithEffectiveCost ?? 0,
        ),
      };

      const priceDetails = this.pricingService.calculatePrice(
        normalized,
        offerValue,
      );

      let pricingRecord = await this.pricingRepository.findOne({
        where: { declaration: { id: declaration.id } },
      });

      if (!pricingRecord) {
        pricingRecord = this.pricingRepository.create({
          declaration,
          basePrice: priceDetails.basePrice,
          surcharges: priceDetails.surcharges as any,
          finalPrice: priceDetails.finalPrice,
          status: PricingStatus.CALCULATED,
          calculatedAt: new Date(),
        });
        await this.pricingRepository.save(pricingRecord);
      }

      declaration.pricing = pricingRecord;
      await this.declarationsRepository.save(declaration);

      await this.ordersService.initStepsIfEmpty(declaration.id);
    } catch (err) {
      console.error('Failed linking questionnaire to declaration: ', err);
    }

    return savedResponse;
  }

  async createTempDeclaration(answers: any): Promise<{
    declaration: TaxDeclaration;
    token: string;
  }> {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const response = this.responseRepository.create({
      data: answers,
      status: 'COMPLETED',
      isAnonymous: true,
      anonymousToken: token,
      anonymousExpiresAt: expiresAt,
    });
    const savedResponse = await this.responseRepository.save(response);

    const newDecl = this.declarationsRepository.create({
      status: DeclarationStatus.PENDING_PRICING,
      questionnaireSnapshot: savedResponse.data,
      questionnaireResponseId: savedResponse.id,
    } as Partial<TaxDeclaration>);
    const savedDecl = await this.declarationsRepository.save(newDecl);

    try {
      await this.ordersService.initStepsIfEmpty(savedDecl.id);
    } catch (err) {
      console.error('Failed to init steps for temp declaration', err);
    }

    return {
      declaration: savedDecl,
      token,
    };
  }
  async createStandaloneResponse(): Promise<QuestionnaireResponse> {
    const response = this.responseRepository.create({
      data: {},
      status: 'IN_PROGRESS',
    });
    return this.responseRepository.save(response);
  }
  async claimAnonymous(
    token: string,
    userId: string,
  ): Promise<{
    questionnaire: QuestionnaireResponse;
    declaration: TaxDeclaration | null;
  }> {
    const response = await this.responseRepository.findOne({
      where: { anonymousToken: token },
      relations: ['clientProfile'],
    });

    if (!response) throw new NotFoundException('Invalid or expired token');
    if (!response.isAnonymous)
      throw new BadRequestException('Questionnaire already claimed');
    if (
      response.anonymousExpiresAt &&
      response.anonymousExpiresAt < new Date()
    ) {
      throw new BadRequestException('Token expired');
    }

    const clientProfile =
      await this.usersService.getOrCreateClientProfile(userId);

    response.clientProfile = clientProfile;
    response.isAnonymous = false;
    response.anonymousToken = undefined;
    response.anonymousExpiresAt = undefined;

    const savedResponse = await this.responseRepository.save(response);

    // Find declaration by questionnaireResponseId (stable)
    const declaration = await this.declarationsRepository.findOne({
      where: { questionnaireResponseId: savedResponse.id },
    });

    // لو موجود: اربطيه بالمستخدم
    if (declaration) {
      declaration.clientProfile = clientProfile;
      await this.declarationsRepository.save(declaration);
    }

    return { questionnaire: savedResponse, declaration: declaration ?? null };
  }

  async createTempDeclarationFromResponse(questionnaireId: string): Promise<{
    declaration: TaxDeclaration;
    token: string;
  }> {
    const response = await this.responseRepository.findOne({
      where: { id: questionnaireId },
    });
    if (!response) throw new NotFoundException('Questionnaire not found.');

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    response.isAnonymous = true;
    response.anonymousToken = token;
    response.anonymousExpiresAt = expiresAt;
    response.status = 'COMPLETED';
    await this.responseRepository.save(response);

    // IMPORTANT: upsert declaration by questionnaireResponseId
    let decl = await this.declarationsRepository.findOne({
      where: { questionnaireResponseId: response.id },
    });

    if (!decl) {
      decl = this.declarationsRepository.create({
        status: DeclarationStatus.PENDING_PRICING,
        questionnaireSnapshot: response.data,
        questionnaireResponseId: response.id,
      } as Partial<TaxDeclaration>);
    } else {
      decl.questionnaireSnapshot = response.data;
      decl.status = DeclarationStatus.PENDING_PRICING;
    }

    const savedDecl = await this.declarationsRepository.save(decl);

    try {
      await this.ordersService.initStepsIfEmpty(savedDecl.id);
    } catch (err) {
      console.error('Failed to init steps for temp declaration', err);
    }

    return { declaration: savedDecl, token };
  }
  async claimStandalone(
    questionnaireId: string,
    userId: string,
  ): Promise<QuestionnaireResponse> {
    const response = await this.responseRepository.findOne({
      where: { id: questionnaireId },
      relations: ['clientProfile'],
    });

    if (!response) throw new NotFoundException('Questionnaire not found.');

    // Already claimed by someone else
    if (response.clientProfile) {
      const profile = response.clientProfile as ClientProfile & {
        user?: { id: string };
      };
      if (profile.user?.id && profile.user.id !== userId) {
        throw new ForbiddenException('Questionnaire belongs to another user.');
      }
      // Already claimed by same user — just return it
      return response;
    }

    const clientProfile =
      await this.usersService.getOrCreateClientProfile(userId);
    response.clientProfile = clientProfile;
    response.status = 'IN_PROGRESS';

    return this.responseRepository.save(response);
  }
}
