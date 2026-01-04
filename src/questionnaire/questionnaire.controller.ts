import {
  Controller,
  Post,
  Body,
  UseGuards,
  NotFoundException,
  ValidationPipe,
  UsePipes,
  Param,
  Get,
} from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QuestionnaireResponse } from './questionnaire-response.entity';
import { User } from 'src/auth/user.decorator';
import { FinalizeDto } from './dto/finalize.dto';
import { ClaimAnonymousDto } from './dto/claim-anonymous.dto';

@Controller('questionnaire')
export class QuestionnaireController {
  constructor(private readonly questionnaireService: QuestionnaireService) {}

  @Post('start')
  @UseGuards(JwtAuthGuard)
  async start(@User('sub') userId: string): Promise<QuestionnaireResponse> {
    const response = await this.questionnaireService.startQuestionnaire(userId);
    if (!response)
      throw new NotFoundException('Could not start questionnaire.');
    return response;
  }

  @Post(':questionnaireId/save-step')
  @UseGuards(JwtAuthGuard)
  async saveStep(
    @User('sub') userId: string,
    @Param('questionnaireId') questionnaireId: string,
    @Body() stepData: Record<string, any>,
  ): Promise<QuestionnaireResponse> {
    const updated = await this.questionnaireService.saveStep(
      questionnaireId,
      stepData,
      userId,
    );
    if (!updated) throw new NotFoundException('Questionnaire not found.');
    return updated;
  }

  @Post(':questionnaireId/save-step-public')
  async saveStepPublic(
    @Param('questionnaireId') questionnaireId: string,
    @Body() stepData: Record<string, any>,
  ): Promise<QuestionnaireResponse> {
    return await this.questionnaireService.saveStep(
      questionnaireId,
      stepData,
      undefined,
    );
  }

  @Post('create-standalone')
  async createStandalone(): Promise<QuestionnaireResponse> {
    return await this.questionnaireService.createStandaloneResponse();
  }

  @Post('submit-anonymous')
  async submitAnonymous(@Body() answers: any) {
    const result =
      await this.questionnaireService.createTempDeclaration(answers);
    return { declarationId: result.declaration.id, token: result.token };
  }

  @Post('claim-anonymous')
  @UseGuards(JwtAuthGuard)
  async claimAnonymous(
    @User('sub') userId: string,
    @Body() body: ClaimAnonymousDto,
  ) {
    const result = await this.questionnaireService.claimAnonymous(
      body.token,
      userId,
    );

    const questionnaireId = result.questionnaire.id;
    const declarationId = result.declaration
      ? result.declaration.id
      : undefined;

    return {
      questionnaireId,
      declarationId,
    };
  }

  @Post(':declarationId/finalize')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async finalize(
    @User('sub') userId: string,
    @Param('declarationId') declarationId: string,
    @Body() body: FinalizeDto,
  ): Promise<QuestionnaireResponse> {
    return await this.questionnaireService.finalizeQuestionnaire(
      declarationId,
      userId,
      body.offer,
      body.billing,
    );
  }
  @Post(':questionnaireId/submit-anonymous')
  async submitAnonymousForResponse(
    @Param('questionnaireId') questionnaireId: string,
  ) {
    const result =
      await this.questionnaireService.createTempDeclarationFromResponse(
        questionnaireId,
      );
    return {
      declarationId: result.declaration.id,
      token: result.token,
    };
  }

  @Get(':questionnaireId')
  async getQuestionnaire(@Param('questionnaireId') questionnaireId: string) {
    const resp =
      await this.questionnaireService.getResponseById(questionnaireId);
    if (!resp) throw new NotFoundException('Questionnaire not found');
    return resp;
  }
}
