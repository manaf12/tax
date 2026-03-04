import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { ClientProfile } from '../users/client-profile.entity';
import { UpdatePersonalInfoDto } from './update-personal-info.dto';
import { ChangePasswordDto } from './change-password.dto';
import { UpdateLanguageDto } from './update-language.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(ClientProfile)
    private clientProfileRepository: Repository<ClientProfile>,
  ) {}

  async getProfile(userId: string): Promise<{
    firstName: string;
    lastName: string;
    email: string;
    languagePreference: string;
  }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });
    if (!user) throw new NotFoundException('User not found');

    return {
      firstName: user.profile?.firstName ?? '',
      lastName: user.profile?.lastName ?? '',
      email: user.email,
      languagePreference: user.profile?.languagePreference ?? 'en',
    };
  }

  async updatePersonalInfo(
    userId: string,
    dto: UpdatePersonalInfoDto,
  ): Promise<{ message: string }> {
    const profile = await this.clientProfileRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    if (dto.firstName !== undefined) profile.firstName = dto.firstName;
    if (dto.lastName !== undefined) profile.lastName = dto.lastName;

    await this.clientProfileRepository.save(profile);
    return { message: 'Personal information updated successfully' };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    const saltRounds = 12;
    user.passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);
    await this.usersRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  async updateLanguage(
    userId: string,
    dto: UpdateLanguageDto,
  ): Promise<{ message: string }> {
    const profile = await this.clientProfileRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    profile.languagePreference = dto.languagePreference;
    await this.clientProfileRepository.save(profile);

    return { message: 'Language preference updated successfully' };
  }

  async deleteAccount(userId: string): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });
    if (!user) throw new NotFoundException('User not found');

    // Hard delete: removes profile first (due to FK), then the user
    if (user.profile) {
      await this.clientProfileRepository.remove(user.profile);
    }
    await this.usersRepository.remove(user);

    return { message: 'Account permanently deleted.' };
  }
}
