/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdatePersonalInfoDto } from './update-personal-info.dto';
import { ChangePasswordDto } from './change-password.dto';
import { UpdateLanguageDto } from './update-language.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /settings/profile
   * Returns current user's personal info + language preference
   */
  @Get('profile')
  getProfile(@Request() req: any) {
    return this.settingsService.getProfile(req.user.sub);
  }

  /**
   * PATCH /settings/personal-info
   * Update firstName, lastName, phoneNumber
   */
  @Patch('personal-info')
  updatePersonalInfo(@Request() req: any, @Body() dto: UpdatePersonalInfoDto) {
    return this.settingsService.updatePersonalInfo(req.user.sub, dto);
  }

  /**
   * PATCH /settings/password
   * Change password (requires current password verification)
   */
  @Patch('password')
  @HttpCode(HttpStatus.OK)
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.settingsService.changePassword(req.user.sub, dto);
  }

  /**
   * PATCH /settings/language
   * Update display language preference
   */
  @Patch('language')
  updateLanguage(@Request() req: any, @Body() dto: UpdateLanguageDto) {
    return this.settingsService.updateLanguage(req.user.sub, dto);
  }

  /**
   * DELETE /settings/account
   * Deactivate / delete the account
   */
  @Delete('account')
  @HttpCode(HttpStatus.OK)
  deleteAccount(@Request() req: any) {
    return this.settingsService.deleteAccount(req.user.sub);
  }
}
