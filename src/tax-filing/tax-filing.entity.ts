import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ClientProfile } from '../users/client-profile.entity';
import { Pricing } from '../pricing/pricing.entity';

// يمثل هذا الكيان حالة عملية الإقرار الضريبي للعميل
@Entity('tax_filings')
export class TaxFiling {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // علاقة واحد لواحد: كل ملف عميل لديه عملية إقرار ضريبي واحدة نشطة
  // @OneToOne(() => ClientProfile, (profile) => profile.taxFiling)
  @JoinColumn() // هذا يضع المفتاح الخارجي (clientProfileId) في جدول tax_filings
  clientProfile: ClientProfile;

  // علاقة واحد لواحد مع التسعيرة (للتأكد من أن التسعيرة تم قبولها)
  @OneToOne(() => Pricing)
  @JoinColumn()
  pricing: Pricing;

  // حالة الإقرار الضريبي:
  // PENDING_ACCEPTANCE (في انتظار قبول التسعيرة)
  // PENDING_DOCUMENTS (في انتظار رفع المستندات)
  // IN_REVIEW (قيد مراجعة الموظف)
  // COMPLETED (تم الانتهاء منه)
  @Column({ default: 'PENDING_ACCEPTANCE' })
  status: string;

  @Column({ nullable: true })
  assignedTo: string; // معرف الموظف المسؤول عن المراجعة

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
