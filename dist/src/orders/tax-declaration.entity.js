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
exports.TaxDeclaration = exports.OfferType = exports.DeclarationStatus = void 0;
const typeorm_1 = require("typeorm");
const client_profile_entity_1 = require("../users/client-profile.entity");
const file_entity_1 = require("../files/file.entity");
const pricing_entity_1 = require("../pricing/pricing.entity");
const payment_entity_1 = require("../payment/payment.entity");
var DeclarationStatus;
(function (DeclarationStatus) {
    DeclarationStatus["DRAFT"] = "DRAFT";
    DeclarationStatus["PENDING_PRICING"] = "PENDING_PRICING";
    DeclarationStatus["PRICING_ACCEPTED"] = "PRICING_ACCEPTED";
    DeclarationStatus["PENDING_PAYMENT"] = "PENDING_PAYMENT";
    DeclarationStatus["IN_REVIEW"] = "IN_REVIEW";
    DeclarationStatus["COMPLETED"] = "COMPLETED";
    DeclarationStatus["CANCELED"] = "CANCELED";
})(DeclarationStatus || (exports.DeclarationStatus = DeclarationStatus = {}));
var OfferType;
(function (OfferType) {
    OfferType["STANDARD"] = "Standard";
    OfferType["PREMIUM"] = "Premium";
    OfferType["CONFORT"] = "Confort";
})(OfferType || (exports.OfferType = OfferType = {}));
let TaxDeclaration = class TaxDeclaration {
    id;
    clientProfile;
    offer;
    steps;
    currentStep;
    status;
    questionnaireSnapshot;
    questionnaireResponseId;
    pricing;
    payments;
    files;
    createdAt;
    updatedAt;
    assignedAdminId;
    assignedAt;
    assignedById;
    assignmentHistory;
};
exports.TaxDeclaration = TaxDeclaration;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TaxDeclaration.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => client_profile_entity_1.ClientProfile, (profile) => profile.declarations),
    __metadata("design:type", client_profile_entity_1.ClientProfile)
], TaxDeclaration.prototype, "clientProfile", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: OfferType, nullable: true }),
    __metadata("design:type", String)
], TaxDeclaration.prototype, "offer", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: () => "'{}'" }),
    __metadata("design:type", Array)
], TaxDeclaration.prototype, "steps", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], TaxDeclaration.prototype, "currentStep", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: DeclarationStatus,
        default: DeclarationStatus.DRAFT,
    }),
    __metadata("design:type", String)
], TaxDeclaration.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], TaxDeclaration.prototype, "questionnaireSnapshot", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], TaxDeclaration.prototype, "questionnaireResponseId", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => pricing_entity_1.Pricing, (pricing) => pricing.declaration, { nullable: true }),
    __metadata("design:type", pricing_entity_1.Pricing)
], TaxDeclaration.prototype, "pricing", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => payment_entity_1.Payment, (payment) => payment.declaration),
    __metadata("design:type", Array)
], TaxDeclaration.prototype, "payments", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => file_entity_1.File, (file) => file.declaration),
    __metadata("design:type", Array)
], TaxDeclaration.prototype, "files", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TaxDeclaration.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], TaxDeclaration.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], TaxDeclaration.prototype, "assignedAdminId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp with time zone', nullable: true }),
    __metadata("design:type", Date)
], TaxDeclaration.prototype, "assignedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], TaxDeclaration.prototype, "assignedById", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Array)
], TaxDeclaration.prototype, "assignmentHistory", void 0);
exports.TaxDeclaration = TaxDeclaration = __decorate([
    (0, typeorm_1.Index)('UQ_tax_declarations_questionnaireResponseId', ['questionnaireResponseId'], {
        unique: true,
        where: `"questionnaireResponseId" IS NOT NULL`,
    }),
    (0, typeorm_1.Entity)('tax_declarations')
], TaxDeclaration);
//# sourceMappingURL=tax-declaration.entity.js.map