/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
    const defaultRelations = ['clientProfile', 'clientProfile.user'];
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
    // 1) جلب pricing مع العلاقة questionnaireResponse
    const pricing = await this.pricingRepository.findOne({
      where: { id: pricingId },
      relations: ['questionnaireResponse'],
    });
    if (!pricing) throw new NotFoundException('Pricing not found.');

    // 2) جلب المستخدم و profile
    const user = await this.usersService.findOneWithProfile(userId);
    if (!user || !user.profile) {
      throw new NotFoundException('User/profile not found');
    }

    // 3) داخل transaction
    return await this.dataSource.transaction(async (manager) => {
      const declRepo = manager.getRepository(TaxDeclaration);
      const pricingRepo = manager.getRepository(Pricing);

      // الطريقة الآمنة لإنشاء الكيان لتفادي مشكلة overload
      const declaration = declRepo.create(); // إنشاء فارغ ثم تعبئته
      Object.assign(declaration, {
        clientProfile: user.profile,
        questionnaireResponse: pricing.questionnaireResponse ?? null,
        pricing: pricing,
        status: DeclarationStatus.PENDING_PAYMENT,
        questionnaireSnapshot: pricing.questionnaireResponse?.data ?? null,
      } as Partial<TaxDeclaration>); // cast لتجنب أخطاء DeepPartial

      // حفظ والـ cast للتأكد أننا نحصل على كيان واحد (وليس مصفوفة)
      const savedDecl = await declRepo.save(declaration);

      // ربط الـ pricing -> declaration
      pricing.declaration = savedDecl;

      // إذا لديك enum مستورد استخدمه، وإلا قم بالتحويل المؤقّت:
      if (typeof PricingStatus !== 'undefined') {
        pricing.status = PricingStatus.ACCEPTED;
      } else {
        // fallback مؤقت إن لم تكن قد عرّفت enum
        (pricing as any).status = 'ACCEPTED';
      }

      await pricingRepo.save(pricing);

      return savedDecl;
    });
  }
  async updateStep(
    declarationId: string,
    step: string,
    status: string,
    actorId: string, // من قام بالتعديل (userId أو adminId)
    extra?: Record<string, any>,
  ) {
    const decl = await this.declarationsRepository.findOne({
      where: { id: declarationId },
    });
    if (!decl) throw new NotFoundException('Declaration not found');

    const steps = decl.steps ?? {};
    steps[step] = {
      ...(steps[step] ?? {}),
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: actorId,
      ...extra,
    };

    decl.steps = steps;
    return this.declarationsRepository.save(decl);
  }
}
