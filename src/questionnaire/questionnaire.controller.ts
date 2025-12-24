import {
  Controller,
  Post,
  Body,
  UseGuards,
  // Get,
  NotFoundException,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QuestionnaireResponse } from './questionnaire-response.entity';
import { User } from 'src/auth/user.decorator';
import { Param } from '@nestjs/common';
import { FinalizeDto } from './dto/finalize.dto';
// import { OfferType } from 'src/orders/tax-declaration.entity';
// import { IsEnum } from 'class-validator';
// import { Transform } from 'class-transformer';

// class FinalizeDto {
//   @Transform(({ value }) =>
//     typeof value === 'string' ? value.toUpperCase() : value,
//   )
//   @IsEnum(OfferType, { message: 'Invalid offer selected' })
//   offer: string;
// }
// class SaveStepDto {
//   [key: string]: any; // لقبول أي حقل
// }

@UseGuards(JwtAuthGuard)
@Controller('questionnaire')
export class QuestionnaireController {
  constructor(private readonly questionnaireService: QuestionnaireService) {}

  @Post('start')
  async start(@User('sub') userId: string): Promise<QuestionnaireResponse> {
    const response = await this.questionnaireService.startQuestionnaire(userId);
    if (!response) {
      throw new NotFoundException('Could not start questionnaire.');
    }
    return response;
  }

  @Post(':questionnaireId/save-step')
  @UseGuards(JwtAuthGuard)
  async saveStep(
    @User('sub') userId: string,
    @Param('questionnaireId') declarationId: string,
    @Body() stepData: Record<string, any>, // <-- هنا
  ): Promise<QuestionnaireResponse> {
    const updated = await this.questionnaireService.saveStep(
      declarationId,
      userId,
      stepData,
    );
    if (!updated) {
      throw new NotFoundException(
        'Questionnaire not found or could not be updated.',
      );
    }
    return updated;
  }

  @Post('submit-anonymous')
  async submitAnonymous(@Body() answers: any) {
    const tempDeclaration =
      await this.questionnaireService.createTempDeclaration(answers);
    return { declarationId: tempDeclaration.id };
  }

  @Post(':declarationId/finalize')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async finalize(
    @User('sub') userId: string,
    @Param('declarationId') declarationId: string,
    @Body() body: FinalizeDto,
  ): Promise<QuestionnaireResponse> {
    const finalized = await this.questionnaireService.finalizeQuestionnaire(
      declarationId,
      userId,
      body.offer,
      body.billing,
    );
    if (!finalized) {
      throw new NotFoundException(
        'Questionnaire not found or could not be finalized.',
      );
    }
    return finalized;
  }
}
