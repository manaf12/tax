import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { ClientProfile } from './client-profile.entity';
import { UsersService } from './users.service';
import { ClientProfileLanguageResolver } from './client-profile-language.resolver'; // استيراد الـ Resolver

@Module({
  imports: [TypeOrmModule.forFeature([User, ClientProfile])],
  providers: [UsersService, ClientProfileLanguageResolver],
  exports: [UsersService, TypeOrmModule, ClientProfileLanguageResolver],
})
export class UsersModule {}
