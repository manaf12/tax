/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
import { Repository, DataSource, Brackets } from 'typeorm';
import { TaxDeclaration, DeclarationStatus } from './tax-declaration.entity';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity'; // يجب استيراد كيان المستخدم
import { UserRole } from '../users/user.entity'; // استخدام UserRole من كيان المستخدم
import { PricingService } from 'src/pricing/pricing.service';
import { Pricing } from 'src/pricing/pricing.entity';
import { PricingStatus } from 'src/pricing/pricing-status.enum';
import { Step } from '../types/steps'; // عدّل المسار بحسب مشروعك
import { StepStatus } from '../types/steps';
import { EmailService } from 'src/email/email.service';

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
    private readonly emailService: EmailService,
  ) {}
  private isStaff(roles: UserRole[] = []): boolean {
    return (
      roles.includes(UserRole.ADMIN) || roles.includes(UserRole.SUPER_ADMIN)
    );
  }
  public getDefaultSteps(): Step[] {
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
    if (!this.isStaff(adminUser.roles)) {
      throw new ForbiddenException('Only staff can set pricing.');
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
    if (!this.isStaff(adminUser.roles)) {
      throw new ForbiddenException('Only staff can complete a declaration.');
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
    return this.declarationsRepository.find({
      where: {
        clientProfile: {
          user: { id: userId },
        },
      },
      relations: ['clientProfile', 'clientProfile.user', 'pricing', 'files'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
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
      const draft = await declRepo.findOne({
        where: {
          clientProfile: { id: user.profile.id },
          status: DeclarationStatus.DRAFT,
        },
      });
      const snapshot = pricing.questionnaireResponse?.data ?? null;
      const offerFromSnapshot = snapshot?.offer ?? null;
      if (draft) {
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

    const steps: Step[] = Array.isArray(decl.steps)
      ? decl.steps
      : this.getDefaultSteps();
    const idx = steps.findIndex((s) => s.id === stepId);
    if (idx === -1) {
      throw new BadRequestException('Invalid step id');
    }

    // Prevent reverting Step 1 to anything other than DONE
    if (
      stepId === 'documentsPreparation' &&
      steps[idx].status === StepStatus.DONE
    ) {
      // Do not change status if it is already DONE
      return decl; // Return the declaration as is if it's already DONE
    }

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
      decl.status = DeclarationStatus.IN_REVIEW;
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
    const decl = await this.findDeclarationById(declarationId, [
      'clientProfile',
      'clientProfile.user',
      'files',
    ]);

    if (decl.clientProfile.user.id !== userId) {
      throw new ForbiddenException('You do not own this declaration.');
    }

    if (fileId) {
      const file = decl.files?.find((f) => f.id === fileId);
      if (!file)
        throw new BadRequestException('File not found in this declaration.');
    } else {
      const hasStepFile = decl.files?.some(
        (f) => f.meta?.deliveredForStep === stepId,
      );
      if (!hasStepFile)
        throw new BadRequestException('No file found for this step.');
    }

    await this.updateStep(declarationId, stepId, StepStatus.DONE, userId, {
      confirmedAt: new Date().toISOString(),
      fileId: fileId ?? null,
    });

    if (stepId === 'reviewAndValidation') {
      await this.declarationsRepository.update(
        { id: declarationId },
        { currentStep: 5 },
      );
    }
    const firstName = decl.clientProfile?.firstName;
    const lastName = decl.clientProfile?.lastName;
    const taxablePerson = [firstName, lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    const taxYear =
      (decl.questionnaireSnapshot as any)?.taxYear ??
      (decl.questionnaireSnapshot as any)?.step1Answers?.taxYear;

    // ✅ send email (do not crash request if it fails)
    const clientEmail = decl.clientProfile?.user?.email;
    if (clientEmail) {
      void this.emailService
        .sendDownloadConfirmed({
          email: clientEmail,
          declarationId,
          firstName,
          taxYear,
          taxablePerson,
        })
        .catch((e) => console.log(e));
    }

    return this.findDeclarationById(declarationId);
  }
  async saveDeclaration(
    declarationId: string,
    partial: Partial<TaxDeclaration>,
  ) {
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
    const newMeta = { ...existingMeta, draftFileId: fileId };
    steps[stepIndex] = { ...steps[stepIndex], meta: newMeta };
    await this.declarationsRepository.update(
      { id: declarationId },
      { steps: steps },
    );
  }
  async getCountsByCurrentStep(): Promise<Record<string, number>> {
    const rows = await this.declarationsRepository
      .createQueryBuilder('d')
      .select('d.currentStep', 'currentStep')
      .addSelect('COUNT(*)', 'count')
      .groupBy('d.currentStep')
      .getRawMany();
    return rows.reduce(
      (acc, r) => {
        const key = r.currentstep ?? r.currentStep ?? 'unknown';
        acc[key] = Number(r.count);
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  async listDeclarations(query: {
    page?: number;
    perPage?: number;
    status?: DeclarationStatus;
    currentStep?: number;
    assignedAdminId?: string;
    search?: string;
  }) {
    const page = query.page ?? 1;
    const perPage = Math.min(query.perPage ?? 1000, 5000);

    const qb = this.declarationsRepository.createQueryBuilder('d');

    qb.leftJoinAndSelect('d.clientProfile', 'cp')
      .leftJoinAndSelect('d.pricing', 'p')
      .leftJoinAndSelect('d.files', 'f')
      .leftJoinAndSelect('d.assignedAdmin', 'aa')
      .leftJoin('users', 'u', 'u.id = cp."userId"') // ← join مباشر على الـ table
      .addSelect(['u.id', 'u.email', 'u.fullName']);

    if (query.status)
      qb.andWhere('d.status = :status', { status: query.status });

    if (query.currentStep)
      qb.andWhere('d.currentStep = :cs', { cs: query.currentStep });

    if (query.assignedAdminId)
      qb.andWhere('d.assignedAdminId = :aid', { aid: query.assignedAdminId });

    if (query.search) {
      const q = `%${query.search}%`;
      qb.andWhere(
        new Brackets((sqb) => {
          sqb
            .where('u.email ILIKE :q', { q })
            .orWhere('u.fullName ILIKE :q', { q })
            .orWhere('CAST(d.id AS TEXT) ILIKE :q', { q });
        }),
      );
    }

    qb.orderBy('d.createdAt', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, perPage };
  }
  async assignDeclarationsToAdmin(
    declarationIds: string[],
    adminId: string,
    assignedById: string,
    note?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const declRepo = manager.getRepository(TaxDeclaration);
      const now = new Date().toISOString();

      const updated: TaxDeclaration[] = [];
      for (const id of declarationIds) {
        const d = await declRepo.findOne({ where: { id } });
        if (!d) continue;
        d.assignedAdminId = adminId;
        d.assignedAt = now as any;
        d.assignedById = assignedById;
        d.assignmentHistory = [
          ...(d.assignmentHistory ?? []),
          { adminId, assignedById, assignedAt: now, note },
        ];
        await declRepo.save(d);
        updated.push(d);
      }
      return updated;
    });
  }
  async confirmStep1(declarationId: string, userId: string) {
    const decl = await this.findDeclarationById(declarationId, [
      'clientProfile',
      'clientProfile.user',
      'files',
    ]);

    if (decl.clientProfile.user.id !== userId) {
      throw new ForbiddenException('You do not own this declaration.');
    }

    const steps: Step[] = Array.isArray(decl.steps)
      ? decl.steps
      : this.getDefaultSteps();
    const step = steps.find((s) => s.id === 'documentsPreparation');
    if (!step)
      throw new BadRequestException('documentsPreparation step not found.');

    const uploadedDocTypes = new Set(
      (decl.files ?? []).map((f: any) => f.documentType),
    );
    const missingMeta = step.meta?.missingDocs ?? [];
    const missingDocTypes = new Set(
      (missingMeta as any[]).map((m) => m.documentType),
    );

    const REQUIRED_DOCUMENT_TYPES = [
      'previous_tax_return',
      'salary_certificate',
      'bank_statement',
      'pillar_3_certificate',
      'medical_expense_receipt',
      'taxero_invoice_payment_proof',
    ];
    const requiredQuestions: string[] =
      (decl?.questionnaireSnapshot?.step1RequiredQuestions as string[]) ?? [];

    const step1Answers =
      (decl?.questionnaireSnapshot?.step1Answers as Record<string, any>) ?? {};

    const missingDocs = REQUIRED_DOCUMENT_TYPES.filter(
      (docType) =>
        !uploadedDocTypes.has(docType) && !missingDocTypes.has(docType),
    );

    const missingQuestions = requiredQuestions.filter((q) => {
      const v = step1Answers[q];
      return v === undefined || v === null || String(v).trim().length === 0;
    });

    if (missingDocs.length || missingQuestions.length) {
      throw new BadRequestException({
        message: 'Step 1 is not ready to be confirmed.',
        missingDocs,
        missingQuestions,
      });
    }

    await this.updateStep(
      declarationId,
      'documentsPreparation',
      StepStatus.DONE,
      userId,
      {
        confirmedAt: new Date().toISOString(),
        confirmedBy: userId,
      },
    );
    const firstName = decl.clientProfile?.firstName;
    const email = decl.clientProfile?.user?.email;
    const taxYear =
      (decl.questionnaireSnapshot as any)?.taxYear ??
      (decl.questionnaireSnapshot as any)?.step1Answers?.taxYear;
    const lastName = decl.clientProfile.lastName;
    const taxablePerson = [firstName, lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (email) {
      void this.emailService.sendStep1Confirmed({
        email,
        declarationId,
        firstName,
        taxYear,
        taxablePerson,
      });
      // .catch((e) => this.logger.error(`Step1 email failed for ${email}`, e));
    }

    return { ok: true };
  }
  async deleteDeclarationAsAdmin(declarationId: string, adminUser: User) {
    const declaration = await this.declarationsRepository.findOne({
      where: { id: declarationId },
    });

    if (!declaration) {
      throw new NotFoundException('Declaration not found');
    }

    const roles = adminUser.roles ?? [];
    const isSuperAdmin = roles.includes(UserRole.SUPER_ADMIN);
    const isAdmin = roles.includes(UserRole.ADMIN);
    const isAssignedToAdmin = declaration.assignedAdminId === adminUser.id;

    if (!isSuperAdmin && !isAdmin) {
      throw new ForbiddenException('User is not an admin or super admin.');
    }

    if (!isSuperAdmin && !isAssignedToAdmin) {
      throw new ForbiddenException(
        'You are not allowed to delete this declaration.',
      );
    }

    await this.declarationsRepository.remove(declaration);
    return { id: declarationId };
  }
}
