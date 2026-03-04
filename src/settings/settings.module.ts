import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { User } from '../users/user.entity';
import { ClientProfile } from '../users/client-profile.entity';
import { PasswordResetToken } from 'src/auth/password-reset-token.entity';
import { RefreshToken } from 'src/auth/refresh-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ClientProfile,
      RefreshToken,
      PasswordResetToken,
    ]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
