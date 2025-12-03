import { Controller, Post, UseGuards, Get } from '@nestjs/common';
import { TaxFilingService } from './tax-filing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../auth/user.decorator';
import { TaxFiling } from './tax-filing.entity';

@UseGuards(JwtAuthGuard)
@Controller('tax-filing')
export class TaxFilingController {
  constructor(private readonly taxFilingService: TaxFilingService) {}

  @Post('start')
  async startFiling(@User('sub') userId: string): Promise<TaxFiling> {
    return this.taxFilingService.startFilingProcess(userId);
  }

  @Get('status')
  async getStatus(@User('sub') userId: string): Promise<TaxFiling> {
    return this.taxFilingService.getFilingStatus(userId);
  }
}
