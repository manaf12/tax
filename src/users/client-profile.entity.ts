import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { TaxDeclaration } from '../orders/tax-declaration.entity'; // **الكيان المركزي**

@Entity('client_profiles')
export class ClientProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  canton: string; // الكانتون السويسري
  @Column({ nullable: true })
  streetAddress: string; // عنوان الشارع

  @Column({ nullable: true })
  postalCode: string; // الرمز البريدي

  @Column({ nullable: true })
  city: string; // المدينة
  @Column({ nullable: true, default: 'en' })
  languagePreference: string; // EN, FR, DE

  @OneToOne(() => User, (user) => user.profile)
  @JoinColumn() // هذا يضع المفتاح الخارجي (userId) في جدول client_profiles
  user: User;

  @OneToMany(() => TaxDeclaration, (declaration) => declaration.clientProfile)
  declarations: TaxDeclaration[];
}
