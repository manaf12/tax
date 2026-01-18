"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionnaireController = void 0;
const common_1 = require("@nestjs/common");
const questionnaire_service_1 = require("./questionnaire.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const user_decorator_1 = require("../auth/user.decorator");
const finalize_dto_1 = require("./dto/finalize.dto");
const claim_anonymous_dto_1 = require("./dto/claim-anonymous.dto");
let QuestionnaireController = class QuestionnaireController {
    questionnaireService;
    constructor(questionnaireService) {
        this.questionnaireService = questionnaireService;
    }
    async start(userId, forceNew) {
        return this.questionnaireService.startQuestionnaire(userId, forceNew === 'true');
    }
    async saveStep(userId, questionnaireId, stepData) {
        const updated = await this.questionnaireService.saveStep(questionnaireId, stepData, userId);
        if (!updated)
            throw new common_1.NotFoundException('Questionnaire not found.');
        return updated;
    }
    async saveStepPublic(questionnaireId, stepData) {
        return await this.questionnaireService.saveStep(questionnaireId, stepData, undefined);
    }
    async createStandalone() {
        return await this.questionnaireService.createStandaloneResponse();
    }
    async submitAnonymous(answers) {
        const result = await this.questionnaireService.createTempDeclaration(answers);
        return { declarationId: result.declaration.id, token: result.token };
    }
    async claimAnonymous(userId, body) {
        const result = await this.questionnaireService.claimAnonymous(body.token, userId);
        const questionnaireId = result.questionnaire.id;
        const declarationId = result.declaration
            ? result.declaration.id
            : undefined;
        return {
            questionnaireId,
            declarationId,
        };
    }
    async finalize(userId, declarationId, body) {
        return await this.questionnaireService.finalizeQuestionnaire(declarationId, userId, body.offer, body.billing);
    }
    async submitAnonymousForResponse(questionnaireId) {
        const result = await this.questionnaireService.createTempDeclarationFromResponse(questionnaireId);
        return {
            declarationId: result.declaration.id,
            token: result.token,
        };
    }
    async getQuestionnaire(questionnaireId) {
        const resp = await this.questionnaireService.getResponseById(questionnaireId);
        if (!resp)
            throw new common_1.NotFoundException('Questionnaire not found');
        return resp;
    }
};
exports.QuestionnaireController = QuestionnaireController;
__decorate([
    (0, common_1.Post)('start'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, user_decorator_1.User)('sub')),
    __param(1, (0, common_1.Query)('forceNew')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], QuestionnaireController.prototype, "start", null);
__decorate([
    (0, common_1.Post)(':questionnaireId/save-step'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, user_decorator_1.User)('sub')),
    __param(1, (0, common_1.Param)('questionnaireId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], QuestionnaireController.prototype, "saveStep", null);
__decorate([
    (0, common_1.Post)(':questionnaireId/save-step-public'),
    __param(0, (0, common_1.Param)('questionnaireId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], QuestionnaireController.prototype, "saveStepPublic", null);
__decorate([
    (0, common_1.Post)('create-standalone'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QuestionnaireController.prototype, "createStandalone", null);
__decorate([
    (0, common_1.Post)('submit-anonymous'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], QuestionnaireController.prototype, "submitAnonymous", null);
__decorate([
    (0, common_1.Post)('claim-anonymous'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, user_decorator_1.User)('sub')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, claim_anonymous_dto_1.ClaimAnonymousDto]),
    __metadata("design:returntype", Promise)
], QuestionnaireController.prototype, "claimAnonymous", null);
__decorate([
    (0, common_1.Post)(':declarationId/finalize'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, transform: true })),
    __param(0, (0, user_decorator_1.User)('sub')),
    __param(1, (0, common_1.Param)('declarationId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, finalize_dto_1.FinalizeDto]),
    __metadata("design:returntype", Promise)
], QuestionnaireController.prototype, "finalize", null);
__decorate([
    (0, common_1.Post)(':questionnaireId/submit-anonymous'),
    __param(0, (0, common_1.Param)('questionnaireId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QuestionnaireController.prototype, "submitAnonymousForResponse", null);
__decorate([
    (0, common_1.Get)(':questionnaireId'),
    __param(0, (0, common_1.Param)('questionnaireId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QuestionnaireController.prototype, "getQuestionnaire", null);
exports.QuestionnaireController = QuestionnaireController = __decorate([
    (0, common_1.Controller)('questionnaire'),
    __metadata("design:paramtypes", [questionnaire_service_1.QuestionnaireService])
], QuestionnaireController);
//# sourceMappingURL=questionnaire.controller.js.map