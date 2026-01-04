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
import { Step } from '../types/steps';

export enum DeclarationStatus {
  DRAFT = 'DRAFT',
  PENDING_PRICING = 'PENDING_PRICING',
  PRICING_ACCEPTED = 'PRICING_ACCEPTED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  IN_REVIEW = 'IN_REVIEW',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
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
  steps: Step[];

  @Column({ type: 'int', nullable: true })
  currentStep?: number;

  @Column({
    type: 'enum',
    enum: DeclarationStatus,
    default: DeclarationStatus.DRAFT,
  })
  status: DeclarationStatus;

  @Column({ type: 'jsonb', nullable: true })
  questionnaireSnapshot?: Record<string, any>;

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

  @Column({ type: 'uuid', nullable: true })
  assignedAdminId?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  assignedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  assignedById?: string;

  @Column({ type: 'jsonb', nullable: true })
  assignmentHistory?: Array<{
    adminId: string;
    assignedById?: string;
    assignedAt: string;
    note?: string;
  }>;
}
