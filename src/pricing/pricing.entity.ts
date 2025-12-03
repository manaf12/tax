import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { TaxDeclaration } from '../orders/tax-declaration.entity';
import { DecimalTransformer } from 'src/common/transformers/decimal.transformer';
import { QuestionnaireResponse } from '../questionnaire/questionnaire-response.entity';
import { PricingStatus } from './pricing-status.enum';
import { Exclude } from 'class-transformer';

@Entity('pricing')
export class Pricing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => QuestionnaireResponse, (q) => q.pricing, { nullable: true })
  @JoinColumn({ name: 'questionnaire_response_id' })
  questionnaireResponse?: QuestionnaireResponse;

  @OneToOne(() => TaxDeclaration, (declaration) => declaration.pricing, {
    nullable: true,
  })
  @JoinColumn({ name: 'declaration_id' })
  @Exclude()
  declaration?: TaxDeclaration;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: DecimalTransformer,
    nullable: true,
  })
  basePrice: number;

  @Column({ type: 'jsonb', default: {} })
  surcharges: Record<string, number>;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: DecimalTransformer,
    nullable: true,
  })
  finalPrice: number;

  @Column({ type: 'enum', enum: PricingStatus, default: PricingStatus.PENDING })
  status: PricingStatus;

  @CreateDateColumn()
  calculatedAt: Date;
}
