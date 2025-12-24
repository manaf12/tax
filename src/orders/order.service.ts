/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TaxDeclaration, DeclarationStatus } from './tax-declaration.entity';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity'; // يجب استيراد كيان المستخدم
import { UserRole } from '../users/user.entity'; // استخدام UserRole من كيان المستخدم
import { PricingService } from 'src/pricing/pricing.service';
import { Pricing } from 'src/pricing/pricing.entity';
import { PricingStatus } from 'src/pricing/pricing-status.enum';
import { Step } from '../types/steps'; // عدّل المسار بحسب مشروعك
import { StepStatus } from '../types/steps';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(TaxDeclaration)
    public declarationsRepository: Repository<TaxDeclaration>,
    private usersService: UsersService,
    @Inject(forwardRef(() => PricingService))
    private pricingService: PricingService,
    @InjectRepository(Pricing)
    private pricingRepository: Repository<Pricing>,
    private dataSource: DataSource,
  ) {}

  private getDefaultSteps(): Step[] {
    return [
      {
        id: 'documentsPreparation',
        order: 1,
        nameKey: 'steps.documentsPreparation',
        status: StepStatus.PENDING,
      },
      {
        id: 'documentsReview',
        order: 2,
        nameKey: 'steps.documentsReview',
        status: StepStatus.PENDING,
      },
      {
        id: 'taxPreparation',
        order: 3,
        nameKey: 'steps.taxPreparation',
        status: StepStatus.PENDING,
      },
      {
        id: 'reviewAndValidation',
        order: 4,
        nameKey: 'steps.reviewAndValidation',
        status: StepStatus.PENDING,
      },
      {
        id: 'submission',
        order: 5,
        nameKey: 'steps.submission',
        status: StepStatus.PENDING,
      },
    ];
  }

  /**
   * @param declarationId معرف الإقرار
   * @param relations العلاقات المراد تحميلها
   * @returns TaxDeclaration
   */
  async findDeclarationById(
    declarationId: string,
    relations: string[] = [],
  ): Promise<TaxDeclaration> {
    // إضافة العلاقات الأساسية للتحقق من الملكية إذا لم تكن موجودة
    const defaultRelations = ['clientProfile', 'clientProfile.user', 'files'];
    const finalRelations = [...new Set([...defaultRelations, ...relations])];

    const declaration = await this.declarationsRepository.findOne({
      where: { id: declarationId },
      relations: finalRelations,
    });

    if (!declaration) {
      throw new NotFoundException('Tax Declaration not found.');
    }
    return declaration;
  }

  async findOne(declarationId: string): Promise<TaxDeclaration> {
    return this.findDeclarationById(declarationId, [
      'clientProfile',
      'clientProfile.user',
    ]);
  }

  /**
   * @param userId معرف المستخدم
   * @returns TaxDeclaration
   */
  async findOrCreateDraft(userId: string): Promise<TaxDeclaration> {
    const user = await this.usersService.findOneWithProfile(userId);
    if (!user || !user.profile) {
      throw new NotFoundException('Client profile not found.');
    }

    let draftDeclaration = await this.declarationsRepository.findOne({
      where: {
        clientProfile: { id: user.profile.id },
        status: DeclarationStatus.DRAFT,
      },
      relations: ['clientProfile', 'clientProfile.user'],
    });

    if (!draftDeclaration) {
      draftDeclaration = this.declarationsRepository.create({
        clientProfile: user.profile,
        status: DeclarationStatus.DRAFT,
      });
      await this.declarationsRepository.save(draftDeclaration);
    }

    return draftDeclaration;
  }

  /**
   * @param declarationId معرف الإقرار
   * @param user المستخدم الذي يقوم بالإرسال
   */
  async submitDraft(
    declarationId: string,
    user: User,
  ): Promise<TaxDeclaration> {
    const declaration = await this.findDeclarationById(declarationId, [
      'clientProfile',
      'clientProfile.user',
    ]);

    if (declaration.clientProfile.user.id !== user.id) {
      throw new ForbiddenException('You do not own this declaration.');
    }

    if (declaration.status !== DeclarationStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot submit draft in status: ${declaration.status}. Expected status: ${DeclarationStatus.DRAFT}`,
      );
    }

    declaration.status = DeclarationStatus.PENDING_PRICING;
    return this.declarationsRepository.save(declaration);
  }

  /**
   * @param declarationId معرف الإقرار
   * @param user المستخدم المسؤول الذي يحدد السعر
   */
  async setPricing(
    declarationId: string,
    adminUser: User,
    pricingData: {
      basePrice: number;
      surcharges: Record<string, number>;
      finalPrice: number;
    },
  ): Promise<TaxDeclaration> {
    if (!adminUser.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('Only administrators can set pricing.');
    }

    const declaration = await this.findDeclarationById(declarationId, [
      'pricing',
    ]);
    if (declaration.status !== DeclarationStatus.PENDING_PRICING) {
      throw new BadRequestException(
        `Cannot set pricing in status: ${declaration.status}.`,
      );
    }

    await this.pricingService.createOrUpdatePricing(declaration, pricingData);

    // set declaration state to PRICING_ACCEPTED
    declaration.status = DeclarationStatus.PRICING_ACCEPTED;
    return this.declarationsRepository.save(declaration);
  }

  /**
   * @param declarationId معرف الإقرار
   * @param userId معرف المستخدم الذي يقبل السعر
   */
  async acceptPricing(
    declarationId: string,
    userId: string,
  ): Promise<TaxDeclaration> {
    const declaration = await this.findDeclarationById(declarationId, [
      'clientProfile',
      'clientProfile.user',
    ]);

    if (declaration.clientProfile.user.id !== userId) {
      throw new ForbiddenException('You do not own this declaration.');
    }

    if (declaration.status !== DeclarationStatus.PRICING_ACCEPTED) {
      throw new BadRequestException(
        `Cannot accept pricing in status: ${declaration.status}. Expected status: ${DeclarationStatus.PRICING_ACCEPTED}`,
      );
    }

    declaration.status = DeclarationStatus.PENDING_PAYMENT;
    return this.declarationsRepository.save(declaration);
  }

  /**
   * @param declarationId معرف الإقرار
   */
  async markAsPaid(declarationId: string): Promise<TaxDeclaration> {
    // تحميل العلاقات للإشعار
    const declaration = await this.findDeclarationById(declarationId, [
      'clientProfile',
      'clientProfile.user',
    ]);

    if (declaration.status !== DeclarationStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        `Cannot mark as paid in status: ${declaration.status}. Expected status: ${DeclarationStatus.PENDING_PAYMENT}`,
      );
    }

    declaration.status = DeclarationStatus.IN_REVIEW;
    return this.declarationsRepository.save(declaration);
  }

  /**
   * @param declarationId معرف الإقرار
   * @param adminId معرف المسؤول الذي يكمل الإقرار
   */
  async markAsCompleted(
    declarationId: string,
    adminId: string,
  ): Promise<TaxDeclaration> {
    const adminUser = await this.usersService.findOneById(adminId);

    if (!adminUser) {
      throw new NotFoundException('Admin user not found.');
    }

    // التحقق من الدور: يجب أن يكون ADMIN
    if (!adminUser.roles.includes(UserRole.ADMIN)) {
      throw new ForbiddenException(
        'Only administrators can complete a declaration.',
      );
    }

    const declaration = await this.findDeclarationById(declarationId, [
      'clientProfile',
      'clientProfile.user',
    ]);

    if (declaration.status !== DeclarationStatus.IN_REVIEW) {
      throw new BadRequestException(
        `Cannot complete declaration in status: ${declaration.status}. Expected status: ${DeclarationStatus.IN_REVIEW}`,
      );
    }

    // 3. تطبيق الانتقال
    declaration.status = DeclarationStatus.COMPLETED;
    return this.declarationsRepository.save(declaration);
  }

  /**
   * @param userId معرف المستخدم
   * @param tempDeclarationId معرف الإقرار المؤقت
   */
  async linkDeclarationToUser(userId: string, tempDeclarationId: string) {
    const user = await this.usersService.findOneWithProfile(userId);
    if (!user || !user.profile) {
      throw new NotFoundException('User or client profile not found.');
    }
    const tempDeclaration = await this.declarationsRepository.findOneBy({
      id: tempDeclarationId,
    });

    if (!tempDeclaration) {
      throw new NotFoundException('Temporary declaration not found.');
    }

    if (tempDeclaration.clientProfile) {
      throw new ForbiddenException('Declaration is already linked to a user.');
    }

    tempDeclaration.clientProfile = user.profile;
    await this.declarationsRepository.save(tempDeclaration);
  }

  /**
   * @param userId معرف المستخدم
   * @returns TaxDeclaration[]
   */
  async findAllByUserId(userId: string): Promise<TaxDeclaration[]> {
    // يجب تحميل العلاقة clientProfile.user للتحقق من الملكية
    return this.declarationsRepository.find({
      where: {
        clientProfile: {
          user: { id: userId },
        },
      },
      relations: ['clientProfile', 'clientProfile.user', 'pricing', 'files'],
      order: {
        createdAt: 'DESC', // ترتيب حسب الأحدث
      },
    });
  }

  /**
   * ينشئ TaxDeclaration من Pricing (عند قبول المستخدم للسعر)
   * @param pricingId معرف التسعيرة
   * @param userId معرف المستخدم الذي يقبل السعر
   */
  async createDeclarationFromPricing(
    pricingId: string,
    userId: string,
  ): Promise<TaxDeclaration> {
    const pricing = await this.pricingRepository.findOne({
      where: { id: pricingId },
      relations: ['questionnaireResponse'],
    });
    if (!pricing) throw new NotFoundException('Pricing not found.');

    const user = await this.usersService.findOneWithProfile(userId);
    if (!user || !user.profile) {
      throw new NotFoundException('User/profile not found');
    }

    return await this.dataSource.transaction(async (manager) => {
      const declRepo = manager.getRepository(TaxDeclaration);
      const pricingRepo = manager.getRepository(Pricing);

      // 1) حاول إيجاد مسوَّدة موجودة للمستخدم
      const draft = await declRepo.findOne({
        where: {
          clientProfile: { id: user.profile.id },
          status: DeclarationStatus.DRAFT,
        },
      });

      const snapshot = pricing.questionnaireResponse?.data ?? null;
      const offerFromSnapshot = snapshot?.offer ?? null;

      if (draft) {
        // 2) وجدنا مسودة -> حدّثها بدل إنشاء واحدة جديدة
        draft.pricing = pricing;
        draft.status = DeclarationStatus.PENDING_PAYMENT;
        draft.questionnaireSnapshot = snapshot ?? undefined;
        draft.offer = offerFromSnapshot;
        draft.currentStep = draft.currentStep ?? 1;
        draft.steps =
          Array.isArray(draft.steps) && draft.steps.length
            ? draft.steps
            : this.getDefaultSteps();

        const saved = await declRepo.save(draft);

        // حدّث حالة التسعيرة واربطها
        pricing.declaration = saved;
        pricing.status =
          typeof PricingStatus !== 'undefined'
            ? PricingStatus.ACCEPTED
            : ('ACCEPTED' as any);
        await pricingRepo.save(pricing);

        return saved;
      }

      // 3) لم نجد مسودة -> أنشئ إقرارًا جديدًا (كالقبل)
      const declaration = declRepo.create();
      Object.assign(declaration, {
        clientProfile: user.profile,
        pricing: pricing,
        status: DeclarationStatus.PENDING_PAYMENT,
        questionnaireSnapshot: snapshot,
        offer: offerFromSnapshot,
        steps: this.getDefaultSteps(),
        currentStep: 1,
      } as Partial<TaxDeclaration>);

      const savedDecl = await declRepo.save(declaration);

      pricing.declaration = savedDecl;
      pricing.status =
        typeof PricingStatus !== 'undefined'
          ? PricingStatus.ACCEPTED
          : ('ACCEPTED' as any);
      await pricingRepo.save(pricing);

      return savedDecl;
    });
  }
  async updateStep(
    declarationId: string,
    stepId: string,
    status: StepStatus,
    actorId: string,
    extra?: Record<string, any>,
  ) {
    const decl = await this.declarationsRepository.findOne({
      where: { id: declarationId },
    });
    if (!decl) throw new NotFoundException('Declaration not found');

    // تهيئة المصفوفة إذا كانت فارغة أو موجودة بالشكل القديم
    const steps: Step[] = Array.isArray(decl.steps)
      ? decl.steps
      : this.getDefaultSteps();

    // تأكد وجود خطوة بالـ id المطلوب
    const idx = steps.findIndex((s) => s.id === stepId);
    if (idx === -1) {
      throw new BadRequestException('Invalid step id');
    }

    // حدّث الخطوة
    steps[idx] = {
      ...steps[idx],
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: actorId,
      meta: {
        ...(steps[idx].meta ?? {}),
        ...(extra ?? {}),
      },
    };

    // حساب currentStep: أول خطوة IN_PROGRESS أو أول خطوة ليست DONE
    const inProgress = steps.find((s) => s.status === StepStatus.IN_PROGRESS);
    const firstNotDone = steps.find((s) => s.status !== StepStatus.DONE);
    decl.currentStep = inProgress
      ? inProgress.order
      : firstNotDone
        ? firstNotDone.order
        : steps.length;

    decl.steps = steps;

    if (steps.every((s) => s.status === StepStatus.DONE)) {
      decl.status = DeclarationStatus.COMPLETED;
    } else if (steps.some((s) => s.status === StepStatus.IN_PROGRESS)) {
      decl.status = DeclarationStatus.IN_REVIEW; // أو ما يناسب منطقك
    }

    return this.declarationsRepository.save(decl);
  }

  public async initStepsIfEmpty(declarationId: string) {
    const decl = await this.declarationsRepository.findOne({
      where: { id: declarationId },
    });
    if (!decl) throw new NotFoundException('Declaration not found.');

    if (!Array.isArray(decl.steps) || decl.steps.length === 0) {
      decl.steps = this.getDefaultSteps();
      decl.currentStep = 1;
      await this.declarationsRepository.save(decl);
    }

    return decl;
  }

  async confirmDownloadByUser(
    declarationId: string,
    stepId: string,
    userId: string,
    fileId?: string,
  ): Promise<TaxDeclaration> {
    // الخطوة 1: التحقق من أن الطلب موجود وأن المستخدم الحالي هو المالك
    const decl = await this.findDeclarationById(declarationId, [
      'clientProfile',
      'clientProfile.user',
      'files',
    ]);
    if (decl.clientProfile.user.id !== userId) {
      throw new ForbiddenException('You do not own this declaration.');
    }

    // الخطوة 2: التحقق من وجود ملف مرتبط بهذه الخطوة (هذا الجزء اختياري ولكنه جيد)
    if (fileId) {
      const file = decl.files?.find((f) => f.id === fileId);
      if (!file) {
        throw new BadRequestException('File not found in this declaration.');
      }
      // يمكنك إضافة تحقق إضافي هنا إذا أردت
      // if (file.meta?.deliveredForStep !== stepId) { ... }
    } else {
      // إذا لم يتم توفير fileId، ابحث عن أي ملف تم تسليمه لهذه الخطوة
      const hasStepFile = decl.files?.some(
        (f) => f.meta?.deliveredForStep === stepId,
      );
      if (!hasStepFile) {
        throw new BadRequestException('No file found for this step.');
      }
    }

    await this.updateStep(declarationId, stepId, StepStatus.DONE, userId, {
      confirmedAt: new Date().toISOString(),
      fileId: fileId ?? null,
    });

    if (stepId === 'reviewAndValidation') {
      await this.declarationsRepository.update(
        { id: declarationId },
        { currentStep: 5 }, // استخدم 'currentStep' كما هو في كيان TaxDeclaration
      );
      // هذا السجل سيساعدك في تصحيح الأخطاء مستقبلاً
      console.log(
        `Declaration ${declarationId} has been moved to step 5 after user confirmation.`,
      );
    }
    return this.findDeclarationById(declarationId);
  }
  async saveDeclaration(
    declarationId: string,
    partial: Partial<TaxDeclaration>,
  ) {
    // افترض أن لديك injected repository باسم this.declarationRepository
    await this.declarationsRepository.update(declarationId, partial);
    return this.declarationsRepository.findOne({
      where: { id: declarationId },
    });
  }

  async addAdminFileToStep(
    declarationId: string,
    stepId: string,
    fileId: string,
  ): Promise<void> {
    const decl = await this.findDeclarationById(declarationId);
    const steps = decl.steps ?? [];
    const stepIndex = steps.findIndex((s) => s.id === stepId);

    if (stepIndex === -1) {
      console.warn(
        `Step with id ${stepId} not found for declaration ${declarationId}. Cannot add admin file.`,
      );
      return;
    }

    const existingMeta = steps[stepIndex].meta ?? {};
    // استخدم اسمًا واضحًا للمفتاح، مثل 'draftFileId'
    const newMeta = { ...existingMeta, draftFileId: fileId };

    steps[stepIndex] = { ...steps[stepIndex], meta: newMeta };

    // تحديث حقل steps فقط، دون لمس currentStep
    await this.declarationsRepository.update(
      { id: declarationId },
      { steps: steps },
    );
  }
}
