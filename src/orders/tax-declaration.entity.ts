import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClientProfile } from '../users/client-profile.entity';
import { File } from '../files/file.entity';
import { Pricing } from '../pricing/pricing.entity';
import { Payment } from 'src/payment/payment.entity';

export enum DeclarationStatus {
  DRAFT = 'DRAFT', // مسودة (الحالة الأولية)
  PENDING_PRICING = 'PENDING_PRICING', // بانتظار التسعير
  PRICING_ACCEPTED = 'PRICING_ACCEPTED', // تم قبول التسعير
  PENDING_PAYMENT = 'PENDING_PAYMENT', // بانتظار الدفع
  IN_REVIEW = 'IN_REVIEW', // قيد المراجعة (بعد الدفع الناجح)
  COMPLETED = 'COMPLETED', // مكتملة (بعد مراجعة المسؤول)
  CANCELED = 'CANCELED', // ملغاة
}
export enum OfferType {
  STANDARD = 'Standard',
  PREMIUM = 'Premium',
  CONFORT = 'Confort',
}

@Entity('tax_declarations')
export class TaxDeclaration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ClientProfile, (profile) => profile.declarations)
  clientProfile: ClientProfile;
  @Column({ type: 'enum', enum: OfferType, nullable: true })
  offer: OfferType;
  @Column({ type: 'jsonb', default: () => "'{}'" })
  steps: {
    documentsUploaded?: { status: 'PENDING' | 'DONE'; files?: string[] };
    documentsReviewed?: {
      status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
      reviewerId?: string;
      note?: string;
    };
    taxPreparation?: { status: 'PENDING' | 'IN_PROGRESS' | 'DONE' };
    adminUploads?: { status: 'PENDING' | 'DONE'; files?: string[] };
    invoice?: {
      status: 'PENDING' | 'GENERATED' | 'READY';
      invoiceFileId?: string;
    };
  };
  @Column({
    type: 'enum',
    enum: DeclarationStatus,
    default: DeclarationStatus.DRAFT,
  })
  status: DeclarationStatus;

  @Column({ type: 'jsonb', nullable: true })
  questionnaireSnapshot?: Record<string, any>; // تخزين ملخص/نسخة من الإجابات عند إنشاء الطلب

  @OneToOne(() => Pricing, (pricing) => pricing.declaration, { nullable: true })
  pricing?: Pricing;

  @OneToMany(() => Payment, (payment) => payment.declaration)
  payments: Payment[];

  @OneToMany(() => File, (file) => file.declaration)
  files: File[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
