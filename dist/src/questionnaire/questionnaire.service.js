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
exports.QuestionnaireService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const questionnaire_response_entity_1 = require("./questionnaire-response.entity");
const order_service_1 = require("../orders/order.service");
const users_service_1 = require("../users/users.service");
const pricing_entity_1 = require("../pricing/pricing.entity");
const tax_declaration_entity_1 = require("../orders/tax-declaration.entity");
const pricing_service_1 = require("../pricing/pricing.service");
const pricing_status_enum_1 = require("../pricing/pricing-status.enum");
const crypto_1 = require("crypto");
let QuestionnaireService = class QuestionnaireService {
    responseRepository;
    pricingRepository;
    declarationsRepository;
    ordersService;
    usersService;
    pricingService;
    constructor(responseRepository, pricingRepository, declarationsRepository, ordersService, usersService, pricingService) {
        this.responseRepository = responseRepository;
        this.pricingRepository = pricingRepository;
        this.declarationsRepository = declarationsRepository;
        this.ordersService = ordersService;
        this.usersService = usersService;
        this.pricingService = pricingService;
    }
    async startQuestionnaire(userId, forceNew = false) {
        const user = await this.usersService.findOneWithProfile(userId);
        if (!user || !user.profile) {
            throw new common_1.NotFoundException('User or client profile not found.');
        }
        if (!forceNew) {
            const existing = await this.responseRepository.findOne({
                where: {
                    clientProfile: { id: user.profile.id },
                    status: 'IN_PROGRESS',
                },
                relations: ['clientProfile'],
            });
            if (existing)
                return existing;
        }
        await this.responseRepository.update({ clientProfile: { id: user.profile.id }, status: 'IN_PROGRESS' }, { status: 'ABANDONED' });
        let response = this.responseRepository.create({
            clientProfile: user.profile,
            status: 'IN_PROGRESS',
            data: {},
        });
        response = await this.responseRepository.save(response);
        return response;
    }
    async saveStep(questionnaireId, stepData, userId) {
        const response = await this.responseRepository.findOne({
            where: { id: questionnaireId },
            relations: ['clientProfile', 'clientProfile.user'],
        });
        if (!response)
            throw new common_1.NotFoundException('Questionnaire not found.');
        if (response.clientProfile && response.clientProfile.user) {
            const ownerUserId = response.clientProfile.user.id;
            if (ownerUserId !== userId) {
                throw new common_1.ForbiddenException('Not authorized to edit this questionnaire.');
            }
        }
        if (!stepData || Object.keys(stepData).length === 0) {
            return response;
        }
        response.data = { ...response.data, ...stepData };
        response.status = 'IN_PROGRESS';
        await this.responseRepository.save(response);
        const reloaded = await this.responseRepository.findOne({
            where: { id: response.id },
            relations: ['clientProfile', 'clientProfile.user'],
        });
        return reloaded;
    }
    async getResponseByDeclarationId(declarationId) {
        const pricing = await this.pricingRepository.findOne({
            where: { declaration: { id: declarationId } },
            relations: ['questionnaireResponse'],
        });
        if (!pricing)
            return null;
        return pricing.questionnaireResponse ?? null;
    }
    async getResponseById(questionnaireId) {
        return this.responseRepository.findOne({
            where: { id: questionnaireId },
            relations: ['clientProfile', 'clientProfile.user'],
        });
    }
    async finalizeQuestionnaire(questionnaireId, userId, offer, billing) {
        const response = await this.responseRepository.findOne({
            where: { id: questionnaireId },
            relations: ['clientProfile', 'clientProfile.user'],
        });
        if (!response)
            throw new common_1.NotFoundException('Questionnaire not found.');
        if (response.clientProfile && response.clientProfile.user) {
            const ownerUserId = response.clientProfile.user.id;
            if (ownerUserId !== userId) {
                throw new common_1.ForbiddenException('Not authorized to finalize this questionnaire.');
            }
        }
        const offerValue = Object.values(tax_declaration_entity_1.OfferType).find((o) => o.toLowerCase() === offer.toLowerCase());
        if (!offerValue)
            throw new common_1.BadRequestException('Invalid offer selected.');
        response.data = {
            ...response.data,
            offer: offerValue,
            billingFirstName: billing?.firstName ?? response.data.billingFirstName,
            billingLastName: billing?.lastName ?? response.data.billingLastName,
            billingStreet: billing?.street ?? response.data.billingStreet,
            billingPostalCode: billing?.postalCode ?? response.data.billingPostalCode,
            billingCity: billing?.city ?? response.data.billingCity,
        };
        response.status = 'COMPLETED';
        const savedResponse = await this.responseRepository.save(response);
        try {
            const clientProfile = response.clientProfile;
            let declaration = await this.declarationsRepository.findOne({
                where: { questionnaireResponseId: savedResponse.id },
            });
            if (!declaration) {
                declaration = this.declarationsRepository.create({
                    clientProfile,
                    offer: offerValue,
                    status: tax_declaration_entity_1.DeclarationStatus.DRAFT,
                    questionnaireSnapshot: savedResponse.data,
                    questionnaireResponseId: savedResponse.id,
                });
            }
            else {
                declaration.clientProfile = clientProfile;
                declaration.offer = offerValue;
                declaration.questionnaireSnapshot = savedResponse.data;
            }
            declaration = await this.declarationsRepository.save(declaration);
            const normalized = {
                isMarried: savedResponse.data.maritalStatus === 'married',
                numKids: Number(savedResponse.data.childrenCount ?? 0),
                numIncomeSources: Number(savedResponse.data.incomeSources ?? 0),
                numSecurities: Number(savedResponse.data.wealthStatements ?? 0),
                numRealEstate: Number(savedResponse.data.properties ?? 0),
                firstTimeDeclaredCount: Number(savedResponse.data.newProperties ?? 0),
                movedAddress: Boolean(savedResponse.data.movedAddress),
                numPropertiesEffectiveCost: Number(savedResponse.data.propertiesWithEffectiveCost ?? 0),
            };
            const priceDetails = this.pricingService.calculatePrice(normalized, offerValue);
            let pricingRecord = await this.pricingRepository.findOne({
                where: { declaration: { id: declaration.id } },
            });
            if (!pricingRecord) {
                pricingRecord = this.pricingRepository.create({
                    declaration,
                    basePrice: priceDetails.basePrice,
                    surcharges: priceDetails.surcharges,
                    finalPrice: priceDetails.finalPrice,
                    status: pricing_status_enum_1.PricingStatus.CALCULATED,
                    calculatedAt: new Date(),
                });
                await this.pricingRepository.save(pricingRecord);
            }
            declaration.pricing = pricingRecord;
            await this.declarationsRepository.save(declaration);
            await this.ordersService.initStepsIfEmpty(declaration.id);
        }
        catch (err) {
            console.error('Failed linking questionnaire to declaration: ', err);
        }
        return savedResponse;
    }
    async createTempDeclaration(answers) {
        const token = (0, crypto_1.randomUUID)();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
        const response = this.responseRepository.create({
            data: answers,
            status: 'COMPLETED',
            isAnonymous: true,
            anonymousToken: token,
            anonymousExpiresAt: expiresAt,
        });
        const savedResponse = await this.responseRepository.save(response);
        const newDecl = this.declarationsRepository.create({
            status: tax_declaration_entity_1.DeclarationStatus.PENDING_PRICING,
            questionnaireSnapshot: savedResponse.data,
            questionnaireResponseId: savedResponse.id,
        });
        const savedDecl = await this.declarationsRepository.save(newDecl);
        try {
            await this.ordersService.initStepsIfEmpty(savedDecl.id);
        }
        catch (err) {
            console.error('Failed to init steps for temp declaration', err);
        }
        return {
            declaration: savedDecl,
            token,
        };
    }
    async createStandaloneResponse() {
        const response = this.responseRepository.create({
            data: {},
            status: 'IN_PROGRESS',
        });
        return this.responseRepository.save(response);
    }
    async claimAnonymous(token, userId) {
        const response = await this.responseRepository.findOne({
            where: { anonymousToken: token },
            relations: ['clientProfile'],
        });
        if (!response)
            throw new common_1.NotFoundException('Invalid or expired token');
        if (!response.isAnonymous)
            throw new common_1.BadRequestException('Questionnaire already claimed');
        if (response.anonymousExpiresAt &&
            response.anonymousExpiresAt < new Date()) {
            throw new common_1.BadRequestException('Token expired');
        }
        const clientProfile = await this.usersService.getOrCreateClientProfile(userId);
        response.clientProfile = clientProfile;
        response.isAnonymous = false;
        response.anonymousToken = undefined;
        response.anonymousExpiresAt = undefined;
        const savedResponse = await this.responseRepository.save(response);
        const declaration = await this.declarationsRepository.findOne({
            where: { questionnaireResponseId: savedResponse.id },
        });
        if (declaration) {
            declaration.clientProfile = clientProfile;
            await this.declarationsRepository.save(declaration);
        }
        return { questionnaire: savedResponse, declaration: declaration ?? null };
    }
    async createTempDeclarationFromResponse(questionnaireId) {
        const response = await this.responseRepository.findOne({
            where: { id: questionnaireId },
        });
        if (!response)
            throw new common_1.NotFoundException('Questionnaire not found.');
        const token = (0, crypto_1.randomUUID)();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
        response.isAnonymous = true;
        response.anonymousToken = token;
        response.anonymousExpiresAt = expiresAt;
        response.status = 'COMPLETED';
        await this.responseRepository.save(response);
        let decl = await this.declarationsRepository.findOne({
            where: { questionnaireResponseId: response.id },
        });
        if (!decl) {
            decl = this.declarationsRepository.create({
                status: tax_declaration_entity_1.DeclarationStatus.PENDING_PRICING,
                questionnaireSnapshot: response.data,
                questionnaireResponseId: response.id,
            });
        }
        else {
            decl.questionnaireSnapshot = response.data;
            decl.status = tax_declaration_entity_1.DeclarationStatus.PENDING_PRICING;
        }
        const savedDecl = await this.declarationsRepository.save(decl);
        try {
            await this.ordersService.initStepsIfEmpty(savedDecl.id);
        }
        catch (err) {
            console.error('Failed to init steps for temp declaration', err);
        }
        return { declaration: savedDecl, token };
    }
};
exports.QuestionnaireService = QuestionnaireService;
exports.QuestionnaireService = QuestionnaireService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(questionnaire_response_entity_1.QuestionnaireResponse)),
    __param(1, (0, typeorm_1.InjectRepository)(pricing_entity_1.Pricing)),
    __param(2, (0, typeorm_1.InjectRepository)(tax_declaration_entity_1.TaxDeclaration)),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => order_service_1.OrdersService))),
    __param(5, (0, common_1.Inject)((0, common_1.forwardRef)(() => pricing_service_1.PricingService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        order_service_1.OrdersService,
        users_service_1.UsersService,
        pricing_service_1.PricingService])
], QuestionnaireService);
//# sourceMappingURL=questionnaire.service.js.map