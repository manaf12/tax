/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxFiling } from './tax-filing.entity';
import { UsersService } from '../users/users.service';
import { PricingService } from '../pricing/pricing.service';

@Injectable()
export class TaxFilingService {
  constructor(
    @InjectRepository(TaxFiling)
    private taxFilingRepository: Repository<TaxFiling>,
    private usersService: UsersService,
    private pricingService: PricingService,
  ) {}

  /**
   * يبدأ عملية الإقرار الضريبي بعد قبول التسعيرة
   * @param userId معرف المستخدم
   * @returns كيان TaxFiling الجديد
   */
  async startFilingProcess(userId: string): Promise<TaxFiling> {
    const user = await this.usersService.findOneWithProfile(userId);
    if (!user || !user.profile) {
      throw new NotFoundException('Client profile not found.');
    }

    // 1. التحقق من حالة التسعيرة
    const pricing = await this.pricingService.getPricingByDeclarationId(
      user.profile.id,
    );
    if (!pricing || pricing.status !== 'ACCEPTED') {
      throw new BadRequestException(
        'Pricing must be accepted before starting the filing process.',
      );
    }

    // 2. التحقق مما إذا كانت العملية موجودة بالفعل
    let filing = await this.taxFilingRepository.findOne({
      where: { clientProfile: { id: user.profile.id } },
    });

    if (filing) {
      return filing; // إذا كانت موجودة، نرجعها
    }

    // 3. إنشاء عملية إقرار جديدة
    filing = this.taxFilingRepository.create({
      clientProfile: user.profile,
      pricing: pricing,
      status: 'PENDING_DOCUMENTS', // تبدأ في انتظار المستندات
    });

    return this.taxFilingRepository.save(filing);
  }

  /**
   * يجلب حالة الإقرار الضريبي للعميل
   * @param userId معرف المستخدم
   * @returns كيان TaxFiling
   */
  async getFilingStatus(userId: string): Promise<TaxFiling> {
    const user = await this.usersService.findOneWithProfile(userId);
    if (!user || !user.profile) {
      throw new NotFoundException('Client profile not found.');
    }

    const filing = await this.taxFilingRepository.findOne({
      where: { clientProfile: { id: user.profile.id } },
    });

    if (!filing) {
      throw new NotFoundException('Tax filing process not started.');
    }

    return filing;
  }

  // يمكن إضافة دوال أخرى لتغيير الحالة (مثل markAsReviewed, markAsCompleted)
}
