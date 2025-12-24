import {
  BadRequestException,
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

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(TaxDeclaration)
    private taxDeclarationRepository: Repository<TaxDeclaration>,
    private readonly ordersService: OrdersService,
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
   * Updates a specific step in a declaration.
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
}
