/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TaxDeclaration,
  DeclarationStatus,
} from '../orders/tax-declaration.entity';
import { OrdersService } from '../orders/order.service';
import { Step, StepStatus } from 'src/types/steps';
import { UsersService } from 'src/users/users.service';
import { UserRole } from 'src/users/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(TaxDeclaration)
    private taxDeclarationRepository: Repository<TaxDeclaration>,
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * @returns قائمة بالإقرارات الضريبية
   */
  async getPaidDeclarations(): Promise<TaxDeclaration[]> {
    return this.taxDeclarationRepository.find({
      where: { status: DeclarationStatus.IN_REVIEW },
      relations: ['clientProfile', 'files', 'pricing'], // جلب العلاقات الضرورية للمراجعة
    });
  }

  /**
   * @param declarationId معرف الإقرار
   * @param adminId معرف المسؤول الذي يقوم بالإكمال
   * @returns الإقرار المحدث
   */

  async completeDeclaration(
    declarationId: string,
    adminId: string,
  ): Promise<TaxDeclaration> {
    return this.ordersService.markAsCompleted(declarationId, adminId);
  }

  /**
   * @param declarationId معرف الإقرار
   * @returns الإقرار مع جميع التفاصيل المطلوبة للمسؤول
   */
  async getDeclarationDetailsForAdmin(
    declarationId: string,
  ): Promise<TaxDeclaration> {
    const declaration = await this.taxDeclarationRepository.findOne({
      where: { id: declarationId },
      relations: ['clientProfile', 'clientProfile.user', 'files', 'pricing'],
    });

    if (!declaration) {
      throw new NotFoundException(
        `Declaration with ID ${declarationId} not found.`,
      );
    }

    return declaration;
  }
  async reviewDeclaration(
    declarationId: string,
    adminId: string,
    status: Step,
    note?: string,
  ): Promise<TaxDeclaration> {
    const decl = await this.getDeclarationDetailsForAdmin(declarationId);
    const updatedDecl = await this.ordersService.updateStep(
      declarationId,
      'documentsReview',
      status.status,
      adminId,
      { note, filesReviewed: decl.files?.map((f) => f.id) ?? [] },
    );

    return updatedDecl;
  }
  /**
   * @param declarationId The ID of the declaration.
   * @param adminId The ID of the admin performing the action.
   * @param stepId The ID of the step to update (e.g., 'documentsReview', 'taxPreparation').
   * @param newStatus The new status for the step (e.g., StepStatus.DONE).
   * @param meta Any additional metadata to add.
   */
  async updateDeclarationStep(
    declarationId: string,
    adminId: string,
    stepId: string,
    newStatus: StepStatus,
    meta?: Record<string, any>,
  ): Promise<TaxDeclaration> {
    const validStepIds = ['documentsReview', 'taxPreparation', 'submission'];
    if (!validStepIds.includes(stepId)) {
      throw new BadRequestException(
        `Invalid or unauthorized step to update: ${stepId}`,
      );
    }

    const updatedDecl = await this.ordersService.updateStep(
      declarationId,
      stepId,
      newStatus,
      adminId,
      meta,
    );

    return updatedDecl;
  }

  async assignDeclarations(
    declarationIds: string[],
    adminId: string,
    assignedById: string,
    note?: string,
  ) {
    const adminUser = await this.usersService.findOneById(adminId);
    if (!adminUser) throw new NotFoundException('Target admin user not found.');
    if (!adminUser.roles?.includes(UserRole.ADMIN)) {
      throw new ForbiddenException('Target user is not an admin.');
    }
    const updated = await this.ordersService.assignDeclarationsToAdmin(
      declarationIds,
      adminId,
      assignedById,
      note,
    );

    return updated;
  }
  async getStepCounters() {
    return this.ordersService.getCountsByCurrentStep();
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
    const perPage = Math.min(query.perPage ?? 20, 100);

    const qb = this.taxDeclarationRepository.createQueryBuilder('d');
    qb.leftJoinAndSelect('d.clientProfile', 'cp')
      .leftJoinAndSelect('cp.user', 'u')
      .leftJoinAndSelect('d.pricing', 'p')
      .leftJoinAndSelect('d.files', 'f');

    if (query.status)
      qb.andWhere('d.status = :status', { status: query.status });
    if (query.currentStep)
      qb.andWhere('d.currentStep = :cs', { cs: query.currentStep });
    if (query.assignedAdminId)
      qb.andWhere('d.assignedAdminId = :aid', { aid: query.assignedAdminId });
    if (query.search) {
      qb.andWhere(
        '(u.email ILIKE :q OR u.fullName ILIKE :q OR d.id ILIKE :q)',
        { q: `%${query.search}%` },
      );
    }

    qb.orderBy('d.createdAt', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, perPage };
  }
}
