"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxFilingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const tax_filing_entity_1 = require("./tax-filing.entity");
const tax_filing_service_1 = require("./tax-filing.service");
const tax_filing_controller_1 = require("./tax-filing.controller");
const user_module_1 = require("../users/user.module");
const pricing_module_1 = require("../pricing/pricing.module");
let TaxFilingModule = class TaxFilingModule {
};
exports.TaxFilingModule = TaxFilingModule;
exports.TaxFilingModule = TaxFilingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([tax_filing_entity_1.TaxFiling]),
            user_module_1.UsersModule,
            pricing_module_1.PricingModule,
        ],
        providers: [tax_filing_service_1.TaxFilingService],
        controllers: [tax_filing_controller_1.TaxFilingController],
        exports: [tax_filing_service_1.TaxFilingService],
    })
], TaxFilingModule);
//# sourceMappingURL=tax-filing.module.js.map