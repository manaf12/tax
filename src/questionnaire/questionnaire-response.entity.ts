import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
} from 'typeorm';
// import { ClientProfile } from '../users/client-profile.entity'; // **تم حذف هذا الاستيراد**
// import { TaxDeclaration } from '../orders/tax-declaration.entity'; // **استيراد كيان الطلب**
import { Pricing } from 'src/pricing/pricing.entity';
import { ClientProfile } from '../users/client-profile.entity';

// يمثل هذا الكيان استجابة العميل الكاملة للاستبيان
@Entity('questionnaire_responses')
export class QuestionnaireResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // @OneToOne(
  //   () => TaxDeclaration,
  //   (declaration) => declaration.questionnaireResponse,
  //   { nullable: true },
  // )
  // declaration?: TaxDeclaration;

  @OneToOne(() => Pricing, (pricing) => pricing.questionnaireResponse)
  pricing?: Pricing;

  @Column({ type: 'jsonb', default: {} })
  data: Record<string, any>;

  @Column({ default: 'IN_PROGRESS' })
  status: string;

  @ManyToOne(() => ClientProfile, { nullable: true })
  clientProfile?: ClientProfile;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
