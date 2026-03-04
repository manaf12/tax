import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { User } from '../users/user.entity';
import { ClientProfile } from '../users/client-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, ClientProfile])],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
