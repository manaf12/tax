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
exports.PricingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const pricing_entity_1 = require("./pricing.entity");
const questionnaire_service_1 = require("../questionnaire/questionnaire.service");
const notifications_service_1 = require("../notifications/notifications.service");
const order_service_1 = require("../orders/order.service");
const notification_type_1 = require("../notifications/notification-type");
const tax_declaration_entity_1 = require("../orders/tax-declaration.entity");
const user_entity_1 = require("../users/user.entity");
const pricing_status_enum_1 = require("./pricing-status.enum");
let PricingService = class PricingService {
    pricingRepository;
    orderService;
    questionnaireService;
    notificationsService;
    constructor(pricingRepository, orderService, questionnaireService, notificationsService) {
        this.pricingRepository = pricingRepository;
        this.orderService = orderService;
        this.questionnaireService = questionnaireService;
        this.notificationsService = notificationsService;
    }
    calculatePrice(questionnaireData, offer) {
        const snapshot = {
            maritalStatus: questionnaireData.isMarried ? 'married' : 'single',
            childrenCount: questionnaireData.numKids ?? 0,
            incomeSources: questionnaireData.numIncomeSources ?? 0,
            wealthStatements: questionnaireData.numSecurities ?? 0,
            properties: questionnaireData.numRealEstate ?? 0,
            newProperties: questionnaireData.numFirstTimeDeclared ?? 0,
        };
        const { standard, premium, confort } = this.computePricesFromSnapshot(snapshot);
        let offerPrice = standard;
        switch (offer) {
            case tax_declaration_entity_1.OfferType.PREMIUM:
                offerPrice = premium;
                break;
            case tax_declaration_entity_1.OfferType.CONFORT:
                offerPrice = confort;
                break;
            case tax_declaration_entity_1.OfferType.STANDARD:
            default:
                offerPrice = standard;
                break;
        }
        const surcharges = {
            standardPrice: standard,
            premiumPrice: premium,
            confortPrice: confort,
            appliedPriceSource: 'SnapshotPricing',
            offerType: offer,
        };
        return {
            basePrice: offerPrice,
            surcharges,
            finalPrice: offerPrice,
        };
    }
    computePricesFromSnapshot(snapshot) {
        const normalized = {
            isMarried: snapshot.maritalStatus === 'married',
            numKids: Number(snapshot.childrenCount ?? 0),
            numIncomeSources: Number(snapshot.incomeSources ?? 0),
            numSecurities: Number(snapshot.wealthStatements ?? 0),
            numRealEstate: Number(snapshot.properties ?? 0),
            firstTimeDeclaredCount: Number(snapshot.newProperties ?? 0),
        };
        let variablePrice = 50;
        if (normalized.isMarried)
            variablePrice += 30;
        variablePrice += normalized.numKids * 10;
        variablePrice += normalized.numIncomeSources * 10;
        variablePrice += normalized.numSecurities * 10;
        variablePrice += normalized.numRealEstate * 80;
        variablePrice += normalized.firstTimeDeclaredCount * 60;
        const standardPrice = variablePrice - 1;
        const premiumPrice = standardPrice + 120 - 1;
        const confortPrice = premiumPrice * 2 - 1;
        return {
            standard: standardPrice,
            premium: premiumPrice,
            confort: confortPrice,
        };
    }
    async calculatePricing(userId, declarationId) {
        const declaration = await this.orderService.findOne(declarationId);
        if (declaration.clientProfile.user.id !== userId) {
            throw new common_1.ForbiddenException('Access to this declaration is forbidden.');
        }
        if (!declaration.offer) {
            throw new common_1.BadRequestException('Offer must be selected before calculating price.');
        }
        const response = await this.questionnaireService.getResponseByDeclarationId(declarationId);
        if (!response || response.status !== 'COMPLETED') {
            throw new common_1.BadRequestException('Questionnaire must be completed before calculating price.');
        }
        const pricingData = this.calculatePrice(response.data, declaration.offer);
        let pricing = await this.pricingRepository.findOne({
            where: { declaration: { id: declarationId } },
        });
        if (!pricing) {
            pricing = this.pricingRepository.create({ declaration });
        }
        const numericSurcharges = {};
        for (const key in pricingData.surcharges) {
            const value = pricingData.surcharges[key];
            if (typeof value === 'number') {
                numericSurcharges[key] = value;
            }
            else {
            }
        }
        pricing.basePrice = pricingData.basePrice;
        pricing.surcharges = numericSurcharges;
        pricing.finalPrice = pricingData.finalPrice;
        pricing.status = pricing_status_enum_1.PricingStatus.CALCULATED;
        const savedPricing = await this.pricingRepository.save(pricing);
        declaration.status = tax_declaration_entity_1.DeclarationStatus.PRICING_ACCEPTED;
        await this.orderService.setPricing(declaration.id, { id: 'system', roles: [user_entity_1.UserRole.ADMIN] }, {
            basePrice: savedPricing.basePrice,
            surcharges: savedPricing.surcharges,
            finalPrice: savedPricing.finalPrice,
        });
        try {
            await this.notificationsService.sendDeclarationNotification(declaration, notification_type_1.NotificationType.PRICING_READY, { finalPrice: savedPricing.finalPrice });
        }
        catch (err) {
        }
        return savedPricing;
    }
    async acceptPricing(userId, pricingId) {
        const pricing = await this.pricingRepository.findOne({
            where: { id: pricingId },
            relations: ['questionnaireResponse', 'declaration'],
        });
        if (!pricing) {
            throw new common_1.NotFoundException('Pricing not found.');
        }
        if (pricing.status === pricing_status_enum_1.PricingStatus.ACCEPTED && pricing.declaration) {
            return pricing.declaration;
        }
        if (pricing.status !== pricing_status_enum_1.PricingStatus.CALCULATED) {
            throw new common_1.BadRequestException('Invalid pricing status');
        }
        const declaration = pricing.declaration;
        if (!declaration) {
            throw new common_1.BadRequestException('No declaration associated with this pricing.');
        }
        pricing.status = pricing_status_enum_1.PricingStatus.ACCEPTED;
        await this.pricingRepository.save(pricing);
        await this.notificationsService.sendDeclarationNotification(declaration, notification_type_1.NotificationType.PRICING_ACCEPTED, { finalPrice: pricing.finalPrice });
        return declaration;
    }
    async getPricingByDeclarationId(declarationId) {
        return this.pricingRepository.findOne({
            where: { declaration: { id: declarationId } },
        });
    }
    async createOrUpdatePricing(declaration, pricingData) {
        let pricing = declaration.pricing ?? null;
        if (!pricing) {
            pricing = await this.pricingRepository.findOne({
                where: { declaration: { id: declaration.id } },
            });
        }
        if (!pricing) {
            pricing = this.pricingRepository.create({
                declaration,
                basePrice: pricingData.basePrice,
                surcharges: pricingData.surcharges,
                finalPrice: pricingData.finalPrice,
                status: pricing_status_enum_1.PricingStatus.CALCULATED,
            });
            return this.pricingRepository.save(pricing);
        }
        pricing.basePrice = pricingData.basePrice;
        pricing.surcharges = pricingData.surcharges;
        pricing.finalPrice = pricingData.finalPrice;
        return this.pricingRepository.save(pricing);
    }
    async calculateForQuestionnaire(questionnaireId, offer) {
        const response = await this.questionnaireService.getResponseById(questionnaireId);
        if (!response || response.status !== 'COMPLETED') {
            throw new common_1.BadRequestException('Questionnaire must be completed.');
        }
        const pricingData = this.calculatePrice(response.data, offer);
        let pricing = await this.pricingRepository.findOne({
            where: { questionnaireResponse: { id: questionnaireId } },
        });
        if (!pricing) {
            pricing = this.pricingRepository.create({
                questionnaireResponse: response,
            });
        }
        pricing.basePrice = pricingData.basePrice;
        const numericSurcharges = {};
        for (const k in pricingData.surcharges) {
            const v = pricingData.surcharges[k];
            if (typeof v === 'number')
                numericSurcharges[k] = v;
        }
        pricing.surcharges = numericSurcharges;
        pricing.finalPrice = pricingData.finalPrice;
        pricing.status = pricing_status_enum_1.PricingStatus.CALCULATED;
        const saved = await this.pricingRepository.save(pricing);
        return saved;
    }
    async calculateAllPricesForQuestionnaire(questionnaireId) {
        const response = await this.questionnaireService.getResponseById(questionnaireId);
        if (!response)
            throw new common_1.NotFoundException('Questionnaire not found.');
        const snapshot = response.data || {};
        return this.computePricesFromSnapshot(snapshot);
    }
};
exports.PricingService = PricingService;
exports.PricingService = PricingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(pricing_entity_1.Pricing)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => order_service_1.OrdersService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        order_service_1.OrdersService,
        questionnaire_service_1.QuestionnaireService,
        notifications_service_1.NotificationsService])
], PricingService);
//# sourceMappingURL=pricing.service.js.map