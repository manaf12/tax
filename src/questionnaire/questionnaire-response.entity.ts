import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
} from 'typeorm';
import { Pricing } from 'src/pricing/pricing.entity';
import { ClientProfile } from '../users/client-profile.entity';
@Entity('questionnaire_responses')
export class QuestionnaireResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
  @Column({ nullable: true })
  anonymousToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  anonymousExpiresAt?: Date;

  @Column({ default: false })
  isAnonymous?: boolean;
}
