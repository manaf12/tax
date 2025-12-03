/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/payment/payment.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { TaxDeclaration } from '../orders/tax-declaration.entity';

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TaxDeclaration, (declaration) => declaration.payments)
  declaration: TaxDeclaration; // ربط الدفع بطلب محدد

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number; // المبلغ المدفوع

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ nullable: true })
  transactionId: string; // معرف العملية من بوابة الدفع

  @Column({ type: 'jsonb', default: {} })
  providerData: Record<string, any>; // بيانات إضافية من بوابة الدفع

  @CreateDateColumn()
  createdAt: Date;
}
