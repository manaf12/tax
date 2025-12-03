import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TaxDeclaration,
  DeclarationStatus,
} from '../orders/tax-declaration.entity';
import { OrdersService } from '../orders/order.service';

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
    // نجلب الطلبات التي حالتها IN_REVIEW (التي تم تعيينها بعد الدفع الناجح)
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
    // هذا هو التصميم المعماري الصحيح:
    // نعتمد على OrdersService.markAsCompleted الذي يتولى:
    // 1. التحقق من صلاحيات المسؤول (Admin Role)
    // 2. التحقق من حالة الإقرار (IN_REVIEW)
    // 3. تغيير الحالة إلى COMPLETED
    // 4. إرسال الإشعار (عبر updateStatusAndNotify)
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
    status: 'DONE' | 'IN_PROGRESS' | 'REJECTED',
    note?: string,
  ): Promise<TaxDeclaration> {
    // أولا: جلب تفاصيل الإقرار ليعرضها أو يتحقق منها إن لزم
    const decl = await this.getDeclarationDetailsForAdmin(declarationId);

    // تحديث خطوة المراجعة عبر OrdersService.updateStep
    const updatedDecl = await this.ordersService.updateStep(
      declarationId,
      'documentsReviewed',
      status,
      adminId,
      { note, filesReviewed: decl.files?.map((f) => f.id) ?? [] },
    );

    return updatedDecl;
  }
}
