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
exports.TaxFilingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tax_filing_entity_1 = require("./tax-filing.entity");
const users_service_1 = require("../users/users.service");
const pricing_service_1 = require("../pricing/pricing.service");
let TaxFilingService = class TaxFilingService {
    taxFilingRepository;
    usersService;
    pricingService;
    constructor(taxFilingRepository, usersService, pricingService) {
        this.taxFilingRepository = taxFilingRepository;
        this.usersService = usersService;
        this.pricingService = pricingService;
    }
    async startFilingProcess(userId) {
        const user = await this.usersService.findOneWithProfile(userId);
        if (!user || !user.profile) {
            throw new common_1.NotFoundException('Client profile not found.');
        }
        const pricing = await this.pricingService.getPricingByDeclarationId(user.profile.id);
        if (!pricing || pricing.status !== 'ACCEPTED') {
            throw new common_1.BadRequestException('Pricing must be accepted before starting the filing process.');
        }
        let filing = await this.taxFilingRepository.findOne({
            where: { clientProfile: { id: user.profile.id } },
        });
        if (filing) {
            return filing;
        }
        filing = this.taxFilingRepository.create({
            clientProfile: user.profile,
            pricing: pricing,
            status: 'PENDING_DOCUMENTS',
        });
        return this.taxFilingRepository.save(filing);
    }
    async getFilingStatus(userId) {
        const user = await this.usersService.findOneWithProfile(userId);
        if (!user || !user.profile) {
            throw new common_1.NotFoundException('Client profile not found.');
        }
        const filing = await this.taxFilingRepository.findOne({
            where: { clientProfile: { id: user.profile.id } },
        });
        if (!filing) {
            throw new common_1.NotFoundException('Tax filing process not started.');
        }
        return filing;
    }
};
exports.TaxFilingService = TaxFilingService;
exports.TaxFilingService = TaxFilingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(tax_filing_entity_1.TaxFiling)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        users_service_1.UsersService,
        pricing_service_1.PricingService])
], TaxFilingService);
//# sourceMappingURL=tax-filing.service.js.map