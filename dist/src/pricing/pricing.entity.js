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
exports.Pricing = void 0;
const typeorm_1 = require("typeorm");
const tax_declaration_entity_1 = require("../orders/tax-declaration.entity");
const decimal_transformer_1 = require("../common/transformers/decimal.transformer");
const questionnaire_response_entity_1 = require("../questionnaire/questionnaire-response.entity");
const pricing_status_enum_1 = require("./pricing-status.enum");
const class_transformer_1 = require("class-transformer");
let Pricing = class Pricing {
    id;
    questionnaireResponse;
    declaration;
    basePrice;
    surcharges;
    finalPrice;
    status;
    calculatedAt;
};
exports.Pricing = Pricing;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Pricing.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => questionnaire_response_entity_1.QuestionnaireResponse, (q) => q.pricing, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'questionnaire_response_id' }),
    __metadata("design:type", questionnaire_response_entity_1.QuestionnaireResponse)
], Pricing.prototype, "questionnaireResponse", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => tax_declaration_entity_1.TaxDeclaration, (declaration) => declaration.pricing, {
        nullable: true,
    }),
    (0, typeorm_1.JoinColumn)({ name: 'declaration_id' }),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", tax_declaration_entity_1.TaxDeclaration)
], Pricing.prototype, "declaration", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'decimal',
        precision: 10,
        scale: 2,
        transformer: decimal_transformer_1.DecimalTransformer,
        nullable: true,
    }),
    __metadata("design:type", Number)
], Pricing.prototype, "basePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: {} }),
    __metadata("design:type", Object)
], Pricing.prototype, "surcharges", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'decimal',
        precision: 10,
        scale: 2,
        transformer: decimal_transformer_1.DecimalTransformer,
        nullable: true,
    }),
    __metadata("design:type", Number)
], Pricing.prototype, "finalPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: pricing_status_enum_1.PricingStatus, default: pricing_status_enum_1.PricingStatus.PENDING }),
    __metadata("design:type", String)
], Pricing.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Pricing.prototype, "calculatedAt", void 0);
exports.Pricing = Pricing = __decorate([
    (0, typeorm_1.Entity)('pricing')
], Pricing);
//# sourceMappingURL=pricing.entity.js.map