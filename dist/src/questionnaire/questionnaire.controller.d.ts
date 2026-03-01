import { QuestionnaireService } from './questionnaire.service';
import { QuestionnaireResponse } from './questionnaire-response.entity';
import { FinalizeDto } from './dto/finalize.dto';
import { ClaimAnonymousDto } from './dto/claim-anonymous.dto';
export declare class QuestionnaireController {
    private readonly questionnaireService;
    constructor(questionnaireService: QuestionnaireService);
    start(userId: string, forceNew?: string): Promise<QuestionnaireResponse>;
    saveStep(userId: string, questionnaireId: string, stepData: Record<string, any>): Promise<QuestionnaireResponse>;
    saveStepPublic(questionnaireId: string, stepData: Record<string, any>): Promise<QuestionnaireResponse>;
    createStandalone(): Promise<QuestionnaireResponse>;
    submitAnonymous(answers: any): Promise<{
        declarationId: string;
        token: string;
    }>;
    claimAnonymous(userId: string, body: ClaimAnonymousDto): Promise<{
        questionnaireId: string;
        declarationId: string | undefined;
    }>;
    finalize(userId: string, declarationId: string, body: FinalizeDto): Promise<QuestionnaireResponse>;
    submitAnonymousForResponse(questionnaireId: string): Promise<{
        declarationId: string;
        token: string;
    }>;
    getQuestionnaire(questionnaireId: string): Promise<QuestionnaireResponse>;
    claimStandalone(questionnaireId: string, userId: string): Promise<QuestionnaireResponse>;
}
