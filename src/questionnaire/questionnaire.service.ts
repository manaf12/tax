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
    @Inject(forwardRef(() => PricingService)) // <--- التعديل المقترح
    private readonly pricingService: PricingService,
  ) {}

  /**
   * @param userId
   */
  async startQuestionnaire(userId: string): Promise<QuestionnaireResponse> {
    // 1) جلب المستخدم و profile
    const user = await this.usersService.findOneWithProfile(userId);
    if (!user || !user.profile) {
      throw new NotFoundException('User or client profile not found.');
    }

    // 2) جلب استجابة قيد التقدم خاصة بهذا الملف الشخصي (إن وجدت)
    let response = await this.responseRepository.findOne({
      where: { clientProfile: { id: user.profile.id }, status: 'IN_PROGRESS' },
      relations: ['clientProfile'],
    });

    // 3) إن لم توجد، ننشئ واحدة جديدة (مستقلة)
    if (!response) {
      response = this.responseRepository.create({
        clientProfile: user.profile,
        status: 'IN_PROGRESS',
        data: {},
      });
      response = await this.responseRepository.save(response);
    }

    return response;
  }

  /**
   * حفظ خطوة واحدة في الاستبيان
   */
  async saveStep(
    questionnaireId: string,
    userId: string,
    stepData: Record<string, any>,
  ): Promise<QuestionnaireResponse> {
    const response = await this.responseRepository.findOne({
      where: { id: questionnaireId },
      relations: ['clientProfile', 'clientProfile.user'],
    });
    if (!response) throw new NotFoundException('Questionnaire not found.');

    // تحقق الملكية إن خزنت clientProfile.user
    if (response.clientProfile && (response.clientProfile as any).user) {
      const ownerUserId = (response.clientProfile as any).user.id;
      if (ownerUserId !== userId) {
        throw new ForbiddenException(
          'Not authorized to edit this questionnaire.',
        );
      }
    }

    // اگر stepData undefined لا نفعل شيئاً
    if (!stepData || Object.keys(stepData).length === 0) {
      // يمكنك تغيير السلوك هنا إذا أردت رفض الطلب بدل التجاهل
      return response;
    }

    response.data = { ...response.data, ...stepData };
    response.status = 'IN_PROGRESS';

    // احفظ ثم أعد تحميل مع العلاقات حتى تُعرض كاملة في الرد
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

  /**
   * إرجاع استجابة حسب questionnaireId
   */
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
        where: { questionnaireSnapshot: { id: questionnaireId } },
      });

      if (!declaration) {
        declaration = this.declarationsRepository.create({
          clientProfile,
          offer: offerValue,
          status: DeclarationStatus.DRAFT,
          questionnaireSnapshot: savedResponse.data,
        });
        await this.declarationsRepository.save(declaration);
      }

      const normalized = {
        isMarried: savedResponse.data.maritalStatus === 'married',
        numKids: Number(savedResponse.data.childrenCount ?? 0),
        numIncomeSources: Number(savedResponse.data.incomeSources ?? 0),
        numSecurities: Number(savedResponse.data.wealthStatements ?? 0),
        numRealEstate: Number(savedResponse.data.properties ?? 0),
        firstTimeDeclaredCount: Number(savedResponse.data.newProperties ?? 0),
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
      // لا تلقي الخطأ للأعلى بحيث لا يكسر API، لكن ممكن ترمي استثناء حسب سياستك
    }

    return savedResponse;
  }

  async createTempDeclaration(answers: any): Promise<TaxDeclaration> {
    const response = this.responseRepository.create({
      data: answers,
      status: 'COMPLETED',
    });
    await this.responseRepository.save(response);

    const newDecl = this.declarationsRepository.create({
      status: DeclarationStatus.PENDING_PRICING,
      questionnaireSnapshot: answers,
    } as Partial<TaxDeclaration>);
    const savedDecl = await this.declarationsRepository.save(newDecl);

    try {
      await this.ordersService.initStepsIfEmpty(savedDecl.id);
    } catch (err) {
      console.error('Failed to init steps for temp declaration', err);
    }

    return savedDecl;
  }

  async createStandaloneResponse(): Promise<QuestionnaireResponse> {
    const response = this.responseRepository.create({
      data: {},
      status: 'IN_PROGRESS',
    });
    return this.responseRepository.save(response);
  }
}
