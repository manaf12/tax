import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { TaxDeclaration } from 'src/orders/tax-declaration.entity';

@Entity('files')
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  originalName: string;

  @Column()
  storagePath: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  documentType: string;

  @Column()
  mimetype: string;
  @Column('bigint')
  size: number;

  @CreateDateColumn()
  uploadedAt: Date;
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
  @ManyToOne(() => TaxDeclaration, (declaration) => declaration.files)
  declaration: TaxDeclaration;
  @Column({ type: 'jsonb', default: () => "'{}'" })
  meta: Record<string, any>;
}
