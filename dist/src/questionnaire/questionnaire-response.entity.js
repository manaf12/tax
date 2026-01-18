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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionnaireResponse = void 0;
const typeorm_1 = require("typeorm");
const pricing_entity_1 = require("../pricing/pricing.entity");
const client_profile_entity_1 = require("../users/client-profile.entity");
let QuestionnaireResponse = class QuestionnaireResponse {
    id;
    pricing;
    data;
    status;
    clientProfile;
    createdAt;
    updatedAt;
    anonymousToken;
    anonymousExpiresAt;
    isAnonymous;
};
exports.QuestionnaireResponse = QuestionnaireResponse;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], QuestionnaireResponse.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => pricing_entity_1.Pricing, (pricing) => pricing.questionnaireResponse),
    __metadata("design:type", pricing_entity_1.Pricing)
], QuestionnaireResponse.prototype, "pricing", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], QuestionnaireResponse.prototype, "data", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'IN_PROGRESS' }),
    __metadata("design:type", String)
], QuestionnaireResponse.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_profile_entity_1.ClientProfile, { nullable: true }),
    __metadata("design:type", client_profile_entity_1.ClientProfile)
], QuestionnaireResponse.prototype, "clientProfile", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], QuestionnaireResponse.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], QuestionnaireResponse.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], QuestionnaireResponse.prototype, "anonymousToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], QuestionnaireResponse.prototype, "anonymousExpiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], QuestionnaireResponse.prototype, "isAnonymous", void 0);
exports.QuestionnaireResponse = QuestionnaireResponse = __decorate([
    (0, typeorm_1.Entity)('questionnaire_responses')
], QuestionnaireResponse);
//# sourceMappingURL=questionnaire-response.entity.js.map