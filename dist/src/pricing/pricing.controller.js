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
exports.PricingController = void 0;
const common_1 = require("@nestjs/common");
const pricing_service_1 = require("./pricing.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const user_decorator_1 = require("../auth/user.decorator");
const tax_declaration_entity_1 = require("../orders/tax-declaration.entity");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
class CalculateDto {
    questionnaireId;
    offer;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CalculateDto.prototype, "questionnaireId", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? capitalize(value) : value),
    (0, class_validator_1.IsEnum)(tax_declaration_entity_1.OfferType),
    __metadata("design:type", String)
], CalculateDto.prototype, "offer", void 0);
let PricingController = class PricingController {
    pricingService;
    constructor(pricingService) {
        this.pricingService = pricingService;
    }
    async accept(userId, pricingId) {
        const declaration = await this.pricingService.acceptPricing(userId, pricingId);
        if (!declaration) {
            throw new common_1.NotFoundException('Failed to accept pricing or create declaration.');
        }
        return declaration;
    }
    async calculateForQuestionnaire(body) {
        const { questionnaireId, offer } = body;
        const pricing = await this.pricingService.calculateForQuestionnaire(questionnaireId, offer);
        if (!pricing)
            throw new common_1.NotFoundException('Pricing could not be calculated.');
        return pricing;
    }
    async calculateAll(questionnaireId) {
        return this.pricingService.calculateAllPricesForQuestionnaire(questionnaireId);
    }
};
exports.PricingController = PricingController;
__decorate([
    (0, common_1.Post)(':pricingId/accept'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, user_decorator_1.User)('sub')),
    __param(1, (0, common_1.Param)('pricingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PricingController.prototype, "accept", null);
__decorate([
    (0, common_1.Post)('calculate'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CalculateDto]),
    __metadata("design:returntype", Promise)
], PricingController.prototype, "calculateForQuestionnaire", null);
__decorate([
    (0, common_1.Get)('calculate-all/:questionnaireId'),
    __param(0, (0, common_1.Param)('questionnaireId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PricingController.prototype, "calculateAll", null);
exports.PricingController = PricingController = __decorate([
    (0, common_1.UseInterceptors)(common_1.ClassSerializerInterceptor),
    (0, common_1.Controller)('pricing'),
    __metadata("design:paramtypes", [pricing_service_1.PricingService])
], PricingController);
//# sourceMappingURL=pricing.controller.js.map