import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { RefreshToken } from '../auth/refresh-token.entity';
import { PasswordResetToken } from '../auth/password-reset-token.entity';
import { ClientProfile } from './client-profile.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  // store bcrypt (or argon2) hash
  @Column()
  passwordHash: string;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column('simple-array', { default: [UserRole.USER] }) // تعديل القيمة الافتراضية
  roles: UserRole[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => PasswordResetToken, (prt) => prt.user)
  passwordResetTokens: PasswordResetToken[];

  @OneToOne(() => ClientProfile, (profile) => profile.user)
  profile: ClientProfile;
}
